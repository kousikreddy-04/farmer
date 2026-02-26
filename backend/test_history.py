import requests

URL = "http://localhost:5000"

# 1. Register a user to get a token
res = requests.post(f"{URL}/register", json={
    "name": "Test User",
    "phone": "1234567800",
    "password": "password",
    "location": "Mumbai"
})
print("Register:", res.json())

# 2. Login to get token (if already registered)
if res.status_code == 400:
    res = requests.post(f"{URL}/login", json={
        "phone": "1234567800",
        "password": "password"
    })
    print("Login:", res.json())

token = res.json().get("token")
print("Token:", token)

# 3. Post to recommend_hybrid
headers = {"Authorization": f"Bearer {token}"}
payload = {
    "lat": 19.076,
    "lon": 72.877,
    "soil_type": "Loamy",
    "temperature": 30.0,
    "N": 50, "P": 50, "K": 50, "ph": 6.5
}
print("Calling recommend_hybrid...")
res = requests.post(f"{URL}/recommend_hybrid", json=payload, headers=headers)
print("Recommend status:", res.status_code)
# print("Recommend res:", res.json())

# 4. Check history
print("Calling history...")
res = requests.get(f"{URL}/history", headers=headers)
print("History status:", res.status_code)
print("History res:", res.json())
