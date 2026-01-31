import requests
import json
import sys

# Ensure UTF-8 printing
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"
TOKEN = None

# Login as admin to get token
def login():
    global TOKEN
    try:
        res = requests.post(f"{BASE_URL}/login", json={"username": "admin", "password": "Admin@123"})
        if res.status_code == 200:
            TOKEN = res.json()["access_token"]
            print("Login Successful.")
        else:
            print(f"Login Failed: {res.text}")
    except Exception as e:
        print(f"Connection Error: {e}")

def search(term, lang):
    if not TOKEN:
        print("Skipping search, no token.")
        return

    headers = {"Authorization": f"Bearer {TOKEN}"}
    try:
        print(f"\nSearching for '{term}' in '{lang}'...")
        res = requests.get(f"{BASE_URL}/search", params={"q": term, "language": lang}, headers=headers)
        if res.status_code == 200:
            data = res.json()
            print("Response Term:", data.get("term"))
            print("Response Source:", data.get("source"))
            print("Response Def:", data.get("definition")[:200])
            
            # Check characters (basic heuristic)
            text = data.get("definition", "")
            if lang == "Telugu":
                telugu_chars = any(0x0C00 <= ord(c) <= 0x0C7F for c in text)
                print(f"Contains Telugu Chars: {telugu_chars}")
            
        else:
            print(f"Search Failed: {res.status_code} {res.text}")
    except Exception as e:
        print(f"Search Error: {e}")

if __name__ == "__main__":
    login()
    search("Photosynthesis", "Telugu")
