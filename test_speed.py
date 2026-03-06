import requests
import json
import time

API = "http://127.0.0.1:8000"

# Test 1: Register timing
print("\n" + "=" * 60)
print("🧪 SPEED TEST - REGISTRATION")
print("=" * 60)
start = time.time()
register_data = {
    "name": "Speed Test User",
    "email": "speedtest@example.com",
    "password": "SpeedTest123",
    "phone": "9876543210",
    "location": "Hyderabad"
}
r_reg = requests.post(f"{API}/api/auth/register", json=register_data)
reg_time = time.time() - start
print(f"⏱️  Registration time: {reg_time:.3f}s ({int(reg_time*1000)}ms)")
print(f"Status: {r_reg.status_code}")
print(json.dumps(r_reg.json(), indent=2) if r_reg.ok else r_reg.text)

# Test 2: Login timing
print("\n" + "=" * 60)
print("🧪 SPEED TEST - LOGIN")
print("=" * 60)
start = time.time()
login_data = {
    "email": "speedtest@example.com",
    "password": "SpeedTest123"
}
r_login = requests.post(f"{API}/api/auth/login", json=login_data)
login_time = time.time() - start
print(f"⏱️  Login time: {login_time:.3f}s ({int(login_time*1000)}ms)")
print(f"Status: {r_login.status_code}")
print(json.dumps(r_login.json(), indent=2) if r_login.ok else r_login.text)

# Test 3: Multiple rapid logins (stress test)
print("\n" + "=" * 60)
print("🧪 SPEED TEST - RAPID LOGIN (5x)")
print("=" * 60)
times = []
for i in range(5):
    start = time.time()
    r = requests.post(f"{API}/api/auth/login", json=login_data)
    elapsed = time.time() - start
    times.append(elapsed)
    print(f"  Login {i+1}: {elapsed:.3f}s ({int(elapsed*1000)}ms) - Status: {r.status_code}")

avg_time = sum(times) / len(times)
print(f"\n📊 Average login time: {avg_time:.3f}s ({int(avg_time*1000)}ms)")
print(f"⚡ This should be <100ms for instant response")
