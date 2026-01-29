import requests
import json

BASE_URL = "http://localhost:8000"

def test_signup():
    print("Testing Signup...")
    url = f"{BASE_URL}/signup"
    data = {
        "email": "testuser_debug@example.com",
        "username": "testuser_debug",
        "password": "Password123!",
        "role": "student"
    }
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200 or "Email already exists" in response.text
    except Exception as e:
        print(f"Signup Request Failed: {e}")
        return False

def test_login():
    print("\nTesting Login...")
    url = f"{BASE_URL}/login"
    data = {
        "email": "testuser_debug@example.com",
        "password": "Password123!"
    }
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            token = response.json().get("access_token")
            print("Login Successful! Token received.")
            return True
        else:
            print("Login Failed.")
            return False
    except Exception as e:
        print(f"Login Request Failed: {e}")
        return False

if __name__ == "__main__":
    if test_signup():
        test_login()
