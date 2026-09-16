"""Script to add a user to Supabase Auth and Profiles table."""
import sys
import os
import socket
from dotenv import load_dotenv

# DNS patch: Bypasses local ISP (ACT Fibernet) DNS hijacking for Supabase domains
_orig_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if host and "supabase.co" in host:
        return _orig_getaddrinfo("104.18.38.10", port, family, type, proto, flags)
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _patched_getaddrinfo

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env")
    sys.exit(1)

admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def add_user(email: str, password: str, full_name: str = "", is_admin: bool = False):
    print(f"Creating or updating user {email} in Supabase Auth...")
    try:
        # Check if user already exists
        users = admin_client.auth.admin.list_users()
        existing = next((u for u in users if u.email.lower() == email.lower()), None)
        
        if existing:
            user_id = str(existing.id)
            print(f"User already exists with ID: {user_id}. Updating password and profile...")
            admin_client.auth.admin.update_user_by_id(user_id, {
                "password": password,
                "email_confirm": True
            })
        else:
            res = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name}
            })
            user_id = str(res.user.id)
            print(f"User created successfully! ID: {user_id}")

        # Insert or update in public.profiles table
        profile_data = {
            "user_id": user_id,
            "full_name": full_name or email.split("@")[0].title()
        }
        admin_client.table("profiles").upsert(profile_data).execute()
        print(f"Profile saved in public.profiles for {email}")

        if is_admin:
            admin_client.table("admins").upsert({"user_id": user_id, "role": "editor"}).execute()
            print(f"User {email} granted admin access in public.admins")

        print("\nSUCCESS! You can now log in with:")
        print(f"Email: {email}")
        print(f"Password: {password}")
        return user_id
    except Exception as e:
        print(f"Failed to create user: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <email> <password> [full_name] [--admin]")
        print("Example: python create_user.py testuser@example.com Password123! 'Test User'")
    else:
        email = sys.argv[1]
        password = sys.argv[2]
        full_name = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else ""
        is_admin = "--admin" in sys.argv
        add_user(email, password, full_name, is_admin)

