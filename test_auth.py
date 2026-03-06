import requests
import json

API = "http://127.0.0.1:8000"

# Test 1: Register a new user
print("=" * 60)
print("TEST 1: REGISTERING NEW USER")
print("=" * 60)
register_data = {
    "name": "Test Farmer",
    "email": "testfarmer@example.com",
    "password": "TestPass123",
    "phone": "9876543210",
    "location": "Hyderabad"
}
r_reg = requests.post(f"{API}/api/auth/register", json=register_data)
print(f"Status: {r_reg.status_code}")
print(json.dumps(r_reg.json(), indent=2))
reg_token = r_reg.json().get("access_token") if r_reg.ok else None

print("\n" + "=" * 60)
print("TEST 2: LOGIN WITH REGISTERED CREDENTIALS")
print("=" * 60)
login_data = {
    "email": "testfarmer@example.com",
    "password": "TestPass123"
}
r_login = requests.post(f"{API}/api/auth/login", json=login_data)
print(f"Status: {r_login.status_code}")
print(json.dumps(r_login.json(), indent=2))
login_token = r_login.json().get("access_token") if r_login.ok else None

print("\n" + "=" * 60)
print("TEST 3: VERIFY USER WITH /api/me")
print("=" * 60)
if login_token:
    r_me = requests.get(f"{API}/api/me", headers={"Authorization": f"Bearer {login_token}"})
    print(f"Status: {r_me.status_code}")
    print(json.dumps(r_me.json(), indent=2))
else:
    print("❌ No token to verify")

print("\n" + "=" * 60)
print("TEST 4: LOGIN WITH WRONG PASSWORD")
print("=" * 60)
login_wrong = {
    "email": "testfarmer@example.com",
    "password": "WrongPassword"
}
r_wrong = requests.post(f"{API}/api/auth/login", json=login_wrong)
print(f"Status: {r_wrong.status_code}")
print(json.dumps(r_wrong.json(), indent=2))
