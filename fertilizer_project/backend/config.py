"""
Environment configuration module.
Loads environment variables from .env file on startup.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file once on module import
load_dotenv()

# MongoDB Configuration
MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/agriadvisor")

# External API Keys
OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")

# Security
JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-key-change-in-production")


def get_settings() -> dict:
    """Return all configuration settings as a dictionary."""
    return {
        "MONGO_URI": MONGO_URI,
        "OPENWEATHER_API_KEY": OPENWEATHER_API_KEY,
        "JWT_SECRET": JWT_SECRET,
    }
