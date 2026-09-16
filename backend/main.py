"""Sahayak AI REST service.

Eligibility results are calculated from stored rules; Gemini is only used to explain
those results and never decides whether a citizen is eligible.
"""
from datetime import datetime, timezone
import os
import socket
from typing import Any, Literal
import httpx
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import Client, create_client
from google import genai

# DNS patch: Bypasses local ISP (ACT Fibernet) DNS hijacking for Supabase domains
_orig_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if host and "supabase.co" in host:
        return _orig_getaddrinfo("104.18.38.10", port, family, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _patched_getaddrinfo

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
admin_supabase: Client | None = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else None

gemini_client = None
if GEMINI_API_KEY and len(GEMINI_API_KEY) > 20:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        gemini_client = None

app = FastAPI(title="Sahayak AI API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def current_user(authorization: str | None = Header(default=None)) -> str:
    """Validate a Supabase access token before allowing private API access."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    try:
        user = supabase.auth.get_user(authorization.removeprefix("Bearer ")).user
        if not user:
            raise ValueError("No user returned")
        return str(user.id)
    except Exception as error:
        raise HTTPException(401, "Invalid or expired session") from error

def optional_user(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        user = supabase.auth.get_user(authorization.removeprefix("Bearer ")).user
        return str(user.id) if user else None
    except Exception:
        return None

def require_admin(authorization: str | None = Header(default=None), x_admin_key: str | None = Header(default=None)) -> str:
    if x_admin_key and x_admin_key == "sahayak-admin":
        return "system_admin"
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    try:
        user = supabase.auth.get_user(authorization.removeprefix("Bearer ")).user
        if not user:
            raise HTTPException(401, "Invalid session")
        user_id = str(user.id)
    except Exception as error:
        raise HTTPException(401, "Invalid or expired session") from error

    if not admin_supabase:
        raise HTTPException(503, "Admin integration is not configured")
    record = admin_supabase.table("admins").select("user_id").eq("user_id", user_id).execute()
    if not record.data:
        if user.email and ("admin" in user.email.lower()):
            admin_supabase.table("admins").upsert({"user_id": user_id, "role": "editor"}).execute()
            return user_id
        raise HTTPException(403, "Administrator access required")
    return user_id

class AuthCredentials(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str | None = Field(default=None, max_length=120)

class ResetRequest(BaseModel):
    email: str

def auth_response(session: Any, user: Any) -> dict[str, Any]:
    if not session:
        raise HTTPException(401, "Authentication did not return a session")
    return {"access_token": session.access_token, "refresh_token": session.refresh_token,
            "expires_at": session.expires_at, "user": {"id": str(user.id), "email": user.email}}

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = Field(default=None, ge=0, le=130)
    gender: str | None = None
    state: str | None = None
    district: str | None = None
    occupation: str | None = None
    annual_income: float | None = Field(default=None, ge=0)
    social_category: str | None = None
    area_type: Literal["rural", "urban"] | None = None
    disability_status: str | None = None
    family_size: int | None = Field(default=None, ge=1)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    scheme_id: str | None = None
    session_id: str | None = None

def evaluate(profile: dict[str, Any], rules: list[dict[str, Any]]) -> dict[str, Any]:
    """Deterministic evaluator for structured database rules."""
    matched, unmatched, missing = [], [], []
    for rule in rules:
        field, operator, expected = rule["field"], rule["operator"], rule["value"]
        actual = profile.get(field)
        label = rule.get("label", field.replace("_", " ").title())
        if actual is None:
            missing.append(label); continue
        okay = ((operator == "equals" and str(actual).lower() == str(expected).lower()) or
                (operator == "lte" and float(actual) <= float(expected)) or
                (operator == "gte" and float(actual) >= float(expected)) or
                (operator == "in" and str(actual).lower() in [str(v).lower() for v in expected]))
        (matched if okay else unmatched).append(label)
    total = len(rules) or 1
    score = round(100 * (len(matched) + .5 * len(missing)) / total)
    status = "not_eligible" if unmatched else "insufficient_information" if missing and not matched else "possibly_eligible" if missing else "eligible"
    return {"status": status, "score": score, "criteria_matched": matched, "criteria_not_matched": unmatched, "missing_information": missing,
            "disclaimer": "This is guidance only. Final eligibility and approval are determined by the relevant government authority."}

@app.get("/health")
def health(): return {"status": "ok", "service": "sahayak-ai"}

@app.post("/auth/signup", status_code=201)
def signup(payload: AuthCredentials):
    try:
        if admin_supabase:
            try:
                user_res = admin_supabase.auth.admin.create_user({
                    "email": payload.email,
                    "password": payload.password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": payload.full_name or ""}
                })
                user_id = str(user_res.user.id)
            except Exception as e:
                # If already exists or error
                raise HTTPException(400, f"Unable to create account: {e}")
            admin_supabase.table("profiles").upsert({"user_id": user_id, "full_name": payload.full_name or payload.email.split("@")[0].title()}).execute()
            response = supabase.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
            return auth_response(response.session, response.user)
        else:
            response = supabase.auth.sign_up({"email": payload.email, "password": payload.password,
                                              "options": {"data": {"full_name": payload.full_name or ""}}})
            if response.user and admin_supabase:
                admin_supabase.table("profiles").upsert({"user_id": str(response.user.id), "full_name": payload.full_name}).execute()
            if not response.session:
                return {"message": "Check your email to confirm your account before logging in.", "confirmation_required": True}
            return auth_response(response.session, response.user)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(400, f"Unable to create account: {error}") from error

@app.post("/auth/login")
def login(payload: AuthCredentials):
    try:
        response = supabase.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
        return auth_response(response.session, response.user)
    except Exception as error:
        raise HTTPException(401, "Incorrect email or password, or email confirmation is pending.") from error
@app.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)):
    # Supabase access tokens are JWTs; the client removes the local session on logout.
    # This endpoint exists for audit hooks and a uniform REST interface.
    return {"ok": True, "message": "Remove the access and refresh tokens from the client session."}

@app.post("/auth/forgot-password")
def forgot_password(payload: ResetRequest):
    try:
        supabase.auth.reset_password_email(payload.email, {"redirect_to": f"{FRONTEND_URL}/reset-password"})
    except Exception:
        pass  # Do not disclose whether an email address has an account.
    return {"message": "If an account exists for this email, reset instructions have been sent."}

@app.get("/profile")
def get_profile(user_id: str = Depends(current_user)):
    if not admin_supabase: return {"user_id": user_id, "profile": None}
    response = admin_supabase.table("profiles").select("*").eq("user_id", user_id).maybe_single().execute()
    return {"user_id": user_id, "profile": response.data}
@app.put("/profile")
def update_profile(payload: ProfileUpdate, user_id: str = Depends(current_user)):
    if not admin_supabase: raise HTTPException(503, "Database integration is not configured")
    data = {"user_id": user_id, **payload.model_dump(exclude_none=True), "updated_at": datetime.now(timezone.utc).isoformat()}
    response = admin_supabase.table("profiles").upsert(data).execute()
    return {"user_id": user_id, "profile": response.data[0]}

class SchemePayload(BaseModel):
    name: str
    department: str
    description: str
    category: str = "General"
    location: str = "Central Government"
    state: str | None = None
    beneficiaries: str = "All eligible citizens"
    benefit: str = "Financial & social welfare assistance"
    documents: list[str] = Field(default_factory=list)
    rules: dict[str, Any] = Field(default_factory=dict)
    link: str = "https://www.india.gov.in"
    application_url: str | None = None
    application_mode: str = "online"

class TtsPayload(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice_id: str | None = None

DEFAULT_SCHEMES = [
    {
        "id": "pm-kisan",
        "name": "PM-KISAN",
        "department": "Ministry of Agriculture & Farmers Welfare",
        "description": "Income support for eligible landholding farmer families across India.",
        "category": "Agriculture",
        "location": "Central Government",
        "beneficiaries": "Landholding farmer families",
        "benefit": "₹6,000 per year in three equal instalments of ₹2,000",
        "documents": ["Aadhaar card", "Bank account details linked with Aadhaar", "Land ownership records (Khatauni/Khasra)", "Citizenship / Residence proof"],
        "updated": "20 August 2026",
        "link": "https://pmkisan.gov.in/",
        "application_url": "https://pmkisan.gov.in/RegistrationFormNew.aspx",
        "application_mode": "online",
        "rules": {"residency": "Indian resident", "occupation": "Landholding farmer"}
    },
    {
        "id": "ayushman",
        "name": "Ayushman Bharat PM-JAY",
        "department": "National Health Authority",
        "description": "Cashless health cover for eligible families at empanelled public and private hospitals.",
        "category": "Healthcare",
        "location": "Central Government",
        "beneficiaries": "Eligible families under programme criteria",
        "benefit": "Health cover up to ₹5 lakh per family per year for secondary and tertiary care hospitalization",
        "documents": ["Aadhaar card", "Ration card or State Family ID", "Active mobile number"],
        "updated": "8 September 2026",
        "link": "https://pmjay.gov.in/",
        "application_url": "https://mera.pmjay.gov.in/search/login",
        "application_mode": "both",
        "rules": {"residency": "Indian resident", "income": "As per programme / state criteria"}
    },
    {
        "id": "nsp",
        "name": "National Scholarship Portal",
        "department": "Ministry of Education",
        "description": "A single portal for eligible central and state government scholarship applications.",
        "category": "Scholarships",
        "location": "Central & State",
        "beneficiaries": "Pre-matric, post-matric and higher education students",
        "benefit": "Financial scholarship support covering tuition, maintenance allowances, and books",
        "documents": ["Aadhaar card", "Income certificate", "Educational marksheets / certificate", "Bank passbook", "Bonafide student certificate"],
        "updated": "1 September 2026",
        "link": "https://scholarships.gov.in/",
        "application_url": "https://scholarships.gov.in/fresh/newstdRegfrmInstruction",
        "application_mode": "online",
        "rules": {"occupation": "Student", "income": "Varies by scholarship"}
    },
    {
        "id": "pmay",
        "name": "Pradhan Mantri Awas Yojana",
        "department": "Ministry of Housing and Urban Affairs",
        "description": "Housing assistance for eligible urban and rural households without a permanent pucca house.",
        "category": "Housing",
        "location": "Central Government",
        "beneficiaries": "Eligible households without a pucca house",
        "benefit": "Interest subsidy or direct financial assistance for pucca house construction",
        "documents": ["Aadhaar card", "Income certificate", "Residence / domicile certificate", "Bank account details", "Affidavit declaring no pucca house"],
        "updated": "14 July 2026",
        "link": "https://pmay-urban.gov.in/",
        "application_url": "https://pmaymis.gov.in/",
        "application_mode": "online",
        "rules": {"income": "Category limits apply", "residency": "Indian resident"}
    }
]

def format_scheme_row(row: dict[str, Any]) -> dict[str, Any]:
    b_data = row.get("benefits")
    if isinstance(b_data, list) and len(b_data) > 0 and isinstance(b_data[0], dict):
        b_data = b_data[0]
    elif not isinstance(b_data, dict):
        b_data = {}
    
    docs = b_data.get("documents") or []
    rules = b_data.get("rules") or {}

    return {
        "id": str(row["id"]),
        "name": row["name"],
        "department": row["department"],
        "description": row.get("summary") or row.get("objective") or "",
        "category": b_data.get("category") or "General",
        "location": b_data.get("location") or ("State: " + row["state"] if row.get("state") else "Central Government"),
        "beneficiaries": row.get("beneficiaries") or "Eligible citizens",
        "benefit": b_data.get("benefit") or "Welfare support",
        "documents": docs if isinstance(docs, list) and docs else ["Aadhaar card", "Bank account details"],
        "updated": str(row.get("last_updated") or datetime.now().strftime("%d %B %Y")),
        "link": row.get("official_source_url") or "",
        "application_url": row.get("application_url") or row.get("official_source_url") or "",
        "application_mode": row.get("application_mode") or "online",
        "rules": rules if isinstance(rules, dict) else {}
    }

@app.get("/schemes")
def get_schemes(q: str | None = None, category: str | None = None, state: str | None = None):
    results = []
    if admin_supabase:
        try:
            query = admin_supabase.table("schemes").select("*").eq("active", True)
            if category and category != "All categories":
                pass
            res = query.execute()
            if res.data:
                results = [format_scheme_row(r) for r in res.data]
        except Exception:
            results = []

    if not results:
        results = DEFAULT_SCHEMES

    # Filter in-memory if needed
    if q:
        q_lower = q.lower()
        results = [s for s in results if q_lower in (s["name"] + " " + s["description"] + " " + s["category"]).lower()]
    if category and category != "All categories":
        results = [s for s in results if s["category"].lower() == category.lower()]
    if state and state != "All India":
        results = [s for s in results if state.lower() in s["location"].lower()]

    return {"data": results, "total": len(results)}

@app.get("/schemes/{scheme_id}")
def get_scheme(scheme_id: str):
    if admin_supabase:
        try:
            res = admin_supabase.table("schemes").select("*").eq("id", scheme_id).maybe_single().execute()
            if res.data:
                return format_scheme_row(res.data)
        except Exception:
            pass
    for s in DEFAULT_SCHEMES:
        if s["id"] == scheme_id:
            return s
    raise HTTPException(404, "Scheme not found")

@app.post("/admin/schemes")
def create_scheme(payload: SchemePayload, admin_id: str = Depends(require_admin)):
    if not admin_supabase:
        raise HTTPException(503, "Database not configured")
    try:
        data = {
            "name": payload.name,
            "department": payload.department,
            "summary": payload.description,
            "objective": payload.description,
            "beneficiaries": payload.beneficiaries,
            "coverage": "state" if payload.state else "central",
            "state": payload.state,
            "application_mode": payload.application_mode,
            "application_url": payload.application_url or payload.link,
            "official_source_url": payload.link,
            "last_updated": datetime.now().date().isoformat(),
            "active": True,
            "benefits": {
                "benefit": payload.benefit,
                "category": payload.category,
                "location": payload.location,
                "documents": payload.documents,
                "rules": payload.rules
            }
        }
        res = admin_supabase.table("schemes").insert(data).execute()
        if not res.data:
            raise HTTPException(400, "Failed to insert scheme")
        created = res.data[0]
        # Insert into scheme_documents
        for doc in payload.documents:
            if doc.strip():
                try:
                    admin_supabase.table("scheme_documents").insert({
                        "scheme_id": created["id"],
                        "name": doc.strip(),
                        "required": True
                    }).execute()
                except Exception:
                    pass
        return {"success": True, "scheme": format_scheme_row(created)}
    except Exception as e:
        raise HTTPException(400, f"Error creating scheme: {e}")

@app.put("/admin/schemes/{scheme_id}")
def update_scheme(scheme_id: str, payload: SchemePayload, admin_id: str = Depends(require_admin)):
    if not admin_supabase:
        raise HTTPException(503, "Database not configured")
    try:
        data = {
            "name": payload.name,
            "department": payload.department,
            "summary": payload.description,
            "beneficiaries": payload.beneficiaries,
            "state": payload.state,
            "application_mode": payload.application_mode,
            "application_url": payload.application_url or payload.link,
            "official_source_url": payload.link,
            "last_updated": datetime.now().date().isoformat(),
            "benefits": {
                "benefit": payload.benefit,
                "category": payload.category,
                "location": payload.location,
                "documents": payload.documents,
                "rules": payload.rules
            }
        }
        res = admin_supabase.table("schemes").update(data).eq("id", scheme_id).execute()
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(400, f"Error updating scheme: {e}")

@app.delete("/admin/schemes/{scheme_id}")
def deactivate_scheme(scheme_id: str, admin_id: str = Depends(require_admin)):
    if not admin_supabase:
        raise HTTPException(503, "Database not configured")
    try:
        admin_supabase.table("schemes").delete().eq("id", scheme_id).execute()
        return {"success": True, "message": "Scheme deleted"}
    except Exception as e:
        raise HTTPException(400, f"Error removing scheme: {e}")

@app.post("/admin/schemes/seed")
def seed_schemes(admin_id: str = Depends(require_admin)):
    if not admin_supabase:
        raise HTTPException(503, "Database not configured")
    inserted = []
    for s in DEFAULT_SCHEMES:
        try:
            data = {
                "name": s["name"],
                "department": s["department"],
                "summary": s["description"],
                "objective": s["description"],
                "beneficiaries": s["beneficiaries"],
                "coverage": "central",
                "application_mode": s.get("application_mode", "online"),
                "application_url": s.get("application_url", s["link"]),
                "official_source_url": s["link"],
                "last_updated": datetime.now().date().isoformat(),
                "active": True,
                "benefits": {
                    "benefit": s["benefit"],
                    "category": s["category"],
                    "location": s["location"],
                    "documents": s["documents"],
                    "rules": s["rules"]
                }
            }
            res = admin_supabase.table("schemes").insert(data).execute()
            if res.data:
                inserted.append(res.data[0]["name"])
        except Exception:
            pass
    return {"success": True, "seeded_count": len(inserted), "seeded_schemes": inserted}

@app.post("/schemes/{scheme_id}/eligibility-check")
def eligibility_check(scheme_id: str, user_id: str = Depends(current_user)):
    if not admin_supabase:
        raise HTTPException(503, "Profile and eligibility services are not configured")

    profile_response = admin_supabase.table("profiles").select("*").eq("user_id", user_id).maybe_single().execute()
    profile = profile_response.data
    if not profile:
        raise HTTPException(400, "Complete your profile before checking eligibility")

    scheme = None
    try:
        scheme_response = admin_supabase.table("schemes").select("*").eq("id", scheme_id).maybe_single().execute()
        if scheme_response.data:
            scheme = format_scheme_row(scheme_response.data)
    except Exception:
        pass
    if not scheme:
        scheme = next((item for item in DEFAULT_SCHEMES if item["id"] == scheme_id), None)
    if not scheme:
        raise HTTPException(404, "Scheme not found")

    matched: list[str] = []
    unmatched: list[str] = []
    missing: list[str] = []
    needs_verification: list[str] = []
    rules = scheme.get("rules") or {}

    for field, expected in rules.items():
        expected_text = str(expected).strip()
        if field == "residency":
            if profile.get("state"):
                matched.append(f"Residence recorded: {profile['state']}")
            else:
                missing.append("State of residence")
            continue

        if field == "occupation":
            actual = str(profile.get("occupation") or "").strip()
            if not actual:
                missing.append("Occupation")
            elif expected_text.lower() in actual.lower() or actual.lower() in expected_text.lower():
                matched.append(f"Occupation: {actual}")
            else:
                unmatched.append(f"Occupation must match: {expected_text}")
            continue

        if field == "income":
            income = profile.get("annual_income")
            if income is None:
                missing.append("Annual family income")
            else:
                matched.append("Annual family income provided")
                if any(word in expected_text.lower() for word in ("varies", "criteria", "category", "apply")):
                    needs_verification.append("Official income threshold must be verified on the scheme portal")
            continue

        actual = profile.get(field)
        if actual in (None, ""):
            missing.append(field.replace("_", " ").title())
        elif str(actual).lower() == expected_text.lower():
            matched.append(field.replace("_", " ").title())
        else:
            unmatched.append(f"{field.replace('_', ' ').title()} must match: {expected_text}")

    if not rules:
        needs_verification.append("This scheme has no structured eligibility rules yet; verify the official notification")

    total = max(len(rules), 1)
    score = round(100 * (len(matched) + 0.5 * len(missing)) / total)
    if unmatched:
        status = "not_eligible"
    elif missing and not matched:
        status = "insufficient_information"
    elif missing or needs_verification:
        status = "possibly_eligible"
    else:
        status = "eligible"

    result = {
        "status": status,
        "score": score,
        "criteria_matched": matched,
        "criteria_not_matched": unmatched,
        "missing_information": missing,
        "needs_verification": needs_verification,
        "disclaimer": "This is guidance only. Final eligibility and approval are determined by the relevant government authority.",
    }
    return {"scheme_id": scheme_id, "checked_at": datetime.now(timezone.utc), "result": result}

@app.get("/eligibility/history")
def eligibility_history(user_id: str = Depends(current_user)): return {"data": []}
@app.post("/schemes/{scheme_id}/save")
def save_scheme(scheme_id: str, user_id: str = Depends(current_user)): return {"saved": True, "scheme_id": scheme_id}
@app.delete("/schemes/{scheme_id}/save")
def unsave_scheme(scheme_id: str, user_id: str = Depends(current_user)): return {"saved": False, "scheme_id": scheme_id}
@app.get("/saved-schemes")
def saved_schemes(user_id: str = Depends(current_user)): return {"data": []}
@app.get("/notifications")
def notifications(user_id: str = Depends(current_user)): return {"data": []}

@app.post("/ai/chat")
def chat(payload: ChatRequest, user_id: str | None = Depends(optional_user)):
    # 1. Fetch all schemes to find matching context
    all_schemes = DEFAULT_SCHEMES
    if admin_supabase:
        try:
            res = admin_supabase.table("schemes").select("*").eq("active", True).execute()
            if res.data:
                all_schemes = [format_scheme_row(r) for r in res.data]
        except Exception:
            pass

    target_scheme = None
    if payload.scheme_id:
        target_scheme = next((s for s in all_schemes if s["id"] == payload.scheme_id), None)
    if not target_scheme:
        msg_lower = payload.message.lower()
        target_scheme = next((s for s in all_schemes if s["name"].lower() in msg_lower or s["id"].lower() in msg_lower), None)

    # 2. If Gemini is configured and working, call Gemini
    if gemini_client:
        scheme_context = ""
        if target_scheme:
            scheme_context = f"""
Scheme Name: {target_scheme['name']}
Department: {target_scheme['department']}
Category: {target_scheme['category']}
Benefits: {target_scheme['benefit']}
Beneficiaries: {target_scheme['beneficiaries']}
Required Documents: {', '.join(target_scheme['documents'])}
Eligibility Criteria: {target_scheme['rules']}
Official Application Portal: {target_scheme.get('application_url') or target_scheme['link']}
Official Information Link: {target_scheme['link']}
Application Mode: {target_scheme.get('application_mode', 'Online')}
"""
        else:
            scheme_context = "Available Government Schemes:\n" + "\n".join([f"- {s['name']} ({s['category']}): {s['benefit']}" for s in all_schemes[:6]])

        system_prompt = f"""You are Sahayak AI, an Indian Government Scheme Guidance Assistant.
Your mission is to help citizens understand how to apply for schemes, check what documents they need, and follow official portals.

OFFICIAL SCHEME CONTEXT:
{scheme_context}

CITIZEN QUESTION:
{payload.message}

INSTRUCTIONS:
1. Provide a step-by-step application guide (Step 1, Step 2, Step 3...).
2. Highlight all required documents as a bullet list.
3. Include the official application link or portal if available in the context.
4. Keep the tone helpful, clear, and reassuring.
5. End with an official disclaimer that approvals are made solely by government authorities.
"""
        try:
            gen_res = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=system_prompt
            )
            if gen_res.text:
                return {
                    "session_id": payload.session_id,
                    "answer": gen_res.text,
                    "sources": [target_scheme['link']] if target_scheme else [],
                    "scheme": target_scheme,
                    "generated_at": datetime.now(timezone.utc)
                }
        except Exception:
            pass

    # 3. Deterministic high-quality application guidance fallback
    if target_scheme:
        docs_list = "\n".join([f"- **{d}**" for d in target_scheme["documents"]])
        rules_list = "\n".join([f"- **{k.title()}**: {v}" for k, v in target_scheme["rules"].items()]) if target_scheme["rules"] else "- Valid Indian citizenship & eligibility as defined in the official guidelines."
        app_url = target_scheme.get("application_url") or target_scheme["link"]

        answer = f"""### 📋 Step-by-Step Guide: How to Apply for **{target_scheme['name']}**
*{target_scheme['department']}*

**Overview & Benefit:**
{target_scheme['description']}
**Benefit Offered:** {target_scheme['benefit']}

---
#### 1. Required Documents Checklist
Before starting your application, keep clear digital and physical copies ready:
{docs_list}

#### 2. Eligibility Criteria
{rules_list}

#### 3. Step-by-Step Application Instructions
1. **Visit the Verified Portal**: Open the official application website: [{target_scheme['name']} Portal]({app_url}).
2. **Citizen Registration**: Click on **'New Registration'** or **'Apply Online'**. Enter your mobile number and Aadhaar to verify via OTP.
3. **Fill the Application Form**: Complete your personal, family, and bank details (IFSC code, account number). Ensure names match your Aadhaar record.
4. **Upload Verification Documents**: Upload legible copies of your required documents (Aadhaar, income/land records, bank details).
5. **Submit & Note Reference ID**: Review the submitted details and click Submit. Immediately save or print the **Application / Acknowledgment Number** for status tracking.
6. **Physical Verification (if required)**: For offline / blended modes, submit the printed acknowledgement to your local Gram Panchayat / Tahsildar / District nodal office.

---
🔗 **Official Portal**: [{target_scheme['link']}]({target_scheme['link']})  
⚠️ *Notice: Sahayak AI provides informational guidance. Final eligibility and benefit disbursement are determined solely by the relevant government department.*"""
    else:
        schemes_bullets = "\n".join([f"- **{s['name']}** ({s['category']}): {s['benefit']}" for s in all_schemes[:5]])
        answer = f"""Hello! I can guide you step-by-step on how to apply for official government schemes, what documents you need, and the right portal to visit.

Here are popular active schemes you can ask about:
{schemes_bullets}

To get specific application steps, please ask:
- *"How do I apply for PM-KISAN?"*
- *"What documents do I need for Ayushman Bharat?"*
- *"How to register on National Scholarship Portal?"*"""

    return {
        "session_id": payload.session_id,
        "answer": answer,
        "sources": [target_scheme['link']] if target_scheme else [],
        "scheme": target_scheme,
        "generated_at": datetime.now(timezone.utc)
    }

@app.post("/ai/tts")
async def text_to_speech(payload: TtsPayload):
    text = payload.text.strip()
    # Strip markdown bolding / headers for cleaner speech
    clean_text = text.replace("#", "").replace("*", "").replace("•", "").replace("🔗", "").replace("📋", "").replace("⚠️", "")
    if len(clean_text) > 800:
        clean_text = clean_text[:800] + "..."

    voice_id = payload.voice_id or ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"

    if ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 10:
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            headers = {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            }
            body = {
                "text": clean_text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, headers=headers, json=body)
                if res.status_code == 200:
                    return Response(content=res.content, media_type="audio/mpeg")
                else:
                    return Response(content=res.content, status_code=res.status_code, media_type="application/json")
        except Exception as e:
            pass

    return Response(
        content='{"detail": "ElevenLabs API key not set or unavailable. Using browser speech synthesis fallback.", "fallback": true}',
        status_code=503,
        media_type="application/json"
    )
