from pymongo import MongoClient

# Connect to your local MongoDB instance
client = MongoClient("mongodb://127.0.0.1:27017/")

# Create or use a database
db = client["AgriAdvisorDB"]

# Create a collection (for contact messages)
contacts = db["contacts"]

# Example initial insert (optional)
sample_data = {
    "name": "John Doe",
    "mobile": "9876543210",
    "message": "This is a test message."
}
contacts.insert_one(sample_data)

print("✅ MongoDB setup complete and sample data inserted.")
