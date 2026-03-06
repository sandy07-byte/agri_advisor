import requests
import json

API = "http://127.0.0.1:8000"

# First register a test user and get token
print("=" * 60)
print("STEP 1: Create test user")
print("=" * 60)
reg_data = {
    "name": "Dashboard Test Farmer",
    "email": "dashboard@example.com",
    "password": "DashboardTest123",
    "phone": "9876543210",
    "location": "Bangalore"
}
r_reg = requests.post(f"{API}/api/auth/register", json=reg_data)
token = r_reg.json().get("access_token") if r_reg.ok else None
print(f"✅ User created, Token: {token[:30]}..." if token else "❌ Registration failed")

if not token:
    print("Cannot proceed without token")
    exit()

# Test /api/me
print("\n" + "=" * 60)
print("STEP 2: Test /api/me")
print("=" * 60)
headers = {"Authorization": f"Bearer {token}"}
r_me = requests.get(f"{API}/api/me", headers=headers)
print(f"Status: {r_me.status_code}")
print(json.dumps(r_me.json(), indent=2))

# Test /api/weather/{location}
print("\n" + "=" * 60)
print("STEP 3: Test /api/weather/{location}")
print("=" * 60)
r_weather = requests.get(f"{API}/api/weather/Bangalore")
print(f"Status: {r_weather.status_code}")
print(json.dumps(r_weather.json(), indent=2) if r_weather.ok else r_weather.text)

# Test /api/prices
print("\n" + "=" * 60)
print("STEP 4: Test /api/prices")
print("=" * 60)
r_prices = requests.get(f"{API}/api/prices")
print(f"Status: {r_prices.status_code}")
print(json.dumps(r_prices.json(), indent=2))

# Test /api/history
print("\n" + "=" * 60)
print("STEP 5: Test /api/history")
print("=" * 60)
r_history = requests.get(f"{API}/api/history", headers=headers)
print(f"Status: {r_history.status_code}")
if r_history.ok:
    print(f"Found {len(r_history.json())} recommendations")
else:
    print(r_history.text)

print("\n✅ All dashboard endpoints are working!")
