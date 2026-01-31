import requests
import sys

BASE_URL = "http://localhost:8000"

def test_signup(username, email, password):
    print(f"Testing Signup for {username}...")
    try:
        payload = {
            "username": username,
            "email": email,
            "password": password,
            "role": "student"
        }
        response = requests.post(f"{BASE_URL}/signup", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200 or "already exists" in response.text
    except Exception as e:
        print(f"Signup failed with error: {e}")
        return False

def test_login(identifier, password, is_email=False):
    print(f"Testing Login for {identifier}...")
    try:
        payload = {"password": password}
        if is_email:
            payload["email"] = identifier
        else:
            payload["username"] = identifier
            
        response = requests.post(f"{BASE_URL}/login", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        if response.status_code == 200 and "access_token" in response.json():
            print("Login SUCCESS!")
            return True
        else:
            print("Login FAILED!")
            return False
    except Exception as e:
        print(f"Login failed with error: {e}")
        return False

if __name__ == "__main__":
    # Test valid user
    u = "test_user_99"
    e = "test_user_99@example.com"
    p = "Test@1234" # Meets all criteria
    
    test_signup(u, e, p)
    test_login(u, p, is_email=False)
    test_login(e, p, is_email=True)
