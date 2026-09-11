import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_full_flow():
    print("--- 1. Testing GET /schemes ---")
    r = requests.get(f"{BASE_URL}/schemes")
    assert r.status_code == 200, f"Failed GET /schemes: {r.text}"
    schemes = r.json().get("data", [])
    print(f"Retrieved {len(schemes)} schemes from Supabase.")

    print("\n--- 2. Testing POST /admin/schemes (Admin Adding Scheme Manually) ---")
    test_scheme = {
        "name": "PM Vishwakarma Scheme (Test)",
        "department": "Ministry of Micro, Small and Medium Enterprises",
        "category": "Employment",
        "location": "Central Government",
        "beneficiaries": "Artisans and craftspeople across 18 traditional trades",
        "benefit": "Collateral-free credit support up to Rs 3 Lakhs at 5% concessional interest rate and toolkit incentive of Rs 15,000",
        "application_mode": "online",
        "link": "https://pmvishwakarma.gov.in/",
        "application_url": "https://pmvishwakarma.gov.in/Home/HowToApply",
        "description": "A central sector scheme to support and empower traditional artisans and craftspeople.",
        "documents": ["Aadhaar card", "Bank passbook", "Mobile number", "Skill / trade proof"],
        "rules": {
            "residency": "Indian resident",
            "occupation": "Traditional artisan or craftsperson",
            "age": "Minimum 18 years"
        }
    }
    r_create = requests.post(
        f"{BASE_URL}/admin/schemes",
        headers={"Content-Type": "application/json", "x-admin-key": "sahayak-admin"},
        json=test_scheme
    )
    print(f"Status: {r_create.status_code}")
    assert r_create.status_code in (200, 201), f"Create scheme failed: {r_create.text}"
    created_id = r_create.json()["scheme"]["id"]
    print(f"Created scheme ID: {created_id}")

    print("\n--- 3. Testing GET /schemes/{id} with newly added scheme ---")
    r_verify = requests.get(f"{BASE_URL}/schemes/{created_id}")
    assert r_verify.status_code == 200, f"Failed to get new scheme: {r_verify.text}"
    created_scheme = r_verify.json()
    print(f"Fetched created scheme: {created_scheme['name']} | Documents: {created_scheme['documents']}")

    print("\n--- 4. Testing POST /ai/chat (AI How to Apply & Guidance) ---")
    chat_payload = {
        "message": "How do I apply for this scheme step by step?",
        "scheme_id": created_id
    }
    r_chat = requests.post(f"{BASE_URL}/ai/chat", json=chat_payload)
    assert r_chat.status_code == 200, f"Chat failed: {r_chat.text}"
    chat_data = r_chat.json()
    print("Chatbot Answer Preview:")
    print(chat_data.get("answer")[:350].encode('ascii', errors='replace').decode('ascii') + "...\n")
    print(f"Sources returned: {chat_data.get('sources')}")

    print("\n--- 5. Testing POST /ai/tts (Voice Talking endpoint) ---")
    tts_payload = {"text": "Welcome to Sahayak AI. Here is how you can apply for government schemes."}
    r_tts = requests.post(f"{BASE_URL}/ai/tts", json=tts_payload)
    print(f"TTS status code: {r_tts.status_code}, Content-Type: {r_tts.headers.get('content-type')}")

    print("\n--- 6. Cleaning up test scheme from Supabase ---")
    r_del = requests.delete(
        f"{BASE_URL}/admin/schemes/{created_id}",
        headers={"x-admin-key": "sahayak-admin"}
    )
    print(f"Delete status: {r_del.status_code}")
    assert r_del.status_code == 200

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_flow()

