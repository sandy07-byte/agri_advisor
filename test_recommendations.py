#!/usr/bin/env python3
"""Test recommendation flow"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

print("=" * 60)
print("RECOMMENDATION FLOW TEST")
print("=" * 60)

# 1. Register a test user
print("\n[1] Registering test user...")
register_data = {
    "email": "testfarm@example.com",
    "password": "test123",
    "name": "Test Farmer",
    "phone": "9876543210",
    "location": "Hyderabad"
}
resp = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
print(f"  Status: {resp.status_code}")
print(f"  Response: {resp.json()}")

# 2. Login
print("\n[2] Logging in...")
login_data = {"email": "testfarm@example.com", "password": "test123"}
resp = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
print(f"  Status: {resp.status_code}")
result = resp.json()
print(f"  Response: {result}")
token = result.get("access_token")
if not token:
    print("❌ No token received!")
    exit(1)
print(f"  ✅ Token: {token[:20]}...")

# 3. Get profile
print("\n[3] Fetching profile...")
headers = {"Authorization": f"Bearer {token}"}
resp = requests.get(f"{BASE_URL}/api/me", headers=headers)
print(f"  Status: {resp.status_code}")
print(f"  Response: {resp.json()}")

# 4. Submit recommendation
print("\n[4] Submitting recommendation...")
rec_data = {
    "N": 60,
    "P": 40,
    "K": 30,
    "pH": 7.0,
    "moisture": 45,
    "temperature": 28.5,
    "crop_type": "Rice",
    "soil_type": "Loamy"
}
resp = requests.post(f"{BASE_URL}/api/recommend/", json=rec_data, headers=headers)
print(f"  Status: {resp.status_code}")
print(f"  Response: {resp.json()}")
if resp.status_code != 200:
    print(f"  ❌ Recommendation failed!")
    print(f"  Error: {resp.text}")
else:
    print(f"  ✅ Recommendation submitted successfully!")

# 5. Fetch history
print("\n[5] Fetching recommendation history...")
time.sleep(1)  # Give DB time to save
resp = requests.get(f"{BASE_URL}/api/history", headers=headers)
print(f"  Status: {resp.status_code}")
history = resp.json()
print(f"  History count: {len(history)}")
if history:
    print(f"  ✅ Latest recommendation:")
    print(f"     Fertilizer: {history[0].get('output', {}).get('name')}")
    print(f"     Saved at: {history[0].get('ts')}")
    print(f"     User email: {history[0].get('user_email')}")
else:
    print(f"  ❌ No history found!")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
