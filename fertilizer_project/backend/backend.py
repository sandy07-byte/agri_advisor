import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import requests
from dotenv import load_dotenv
import numpy as np
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# Load environment variables from .env file (search parent directories too)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv()  # Also try current directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YIELD_MODEL_PATH = os.path.join(BASE_DIR, "../ml_model/yield_model.pkl")
try:
    yield_bundle = joblib.load(YIELD_MODEL_PATH)
    yield_model = yield_bundle["model"]
    yield_columns = yield_bundle["columns"]
except Exception as e:
    yield_model = None
    yield_columns = None
    print(f"❌ Failed to load yield model: {e}")


# --- FastAPI setup ---
app = FastAPI(
    title="AgriAdvisor API",
    description="Fertilizer Recommendation Platform",
    version="1.0",
    swagger_ui_parameters={"persistAuthorization": True},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://65.2.62.142:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- MongoDB yield_predictions collection ---
try:
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError, DuplicateKeyError
    _mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    db_name = os.getenv("MONGO_DB", "agriadvisor")
    col_yield_predictions = _mongo[db_name]["yield_predictions"]
except Exception:
    MongoClient = None
    col_yield_predictions = None


# --- Pydantic schema for yield prediction ---
class YieldRequest(BaseModel):
    Area: float
    Annual_Rainfall: float
    Fertilizer: float
    Pesticide: float
    Crop: str
    Season: str
    State: str


# --- Helper function to prepare input ---
def prepare_yield_input(data: dict) -> pd.DataFrame:
    df = pd.DataFrame([data])
    cat_df = pd.get_dummies(df[["Crop", "Season", "State"]], drop_first=True)
    num_df = df[["Area", "Annual_Rainfall", "Fertilizer", "Pesticide"]]
    X = pd.concat([num_df, cat_df], axis=1)
    # Add missing columns with 0
    if yield_columns:
        for col in yield_columns:
            if col not in X.columns:
                X[col] = 0
        # Align order
        X = X[yield_columns]
    return X


# --- Yield Prediction Endpoint ---
@app.post("/api/yield/predict")
def predict_yield(req: YieldRequest):
    if yield_model is None or yield_columns is None:
        raise HTTPException(status_code=500, detail="Yield model not loaded.")
    try:
        X = prepare_yield_input(req.dict())
        pred = yield_model.predict(X)[0]
        response = {"predicted_yield": float(pred), "unit": "tons/hectare"}
        # Optional: log prediction
        try:
            if col_yield_predictions is not None:
                log = req.dict()
                log["predicted_yield"] = float(pred)
                log["created_at"] = datetime.utcnow()
                col_yield_predictions.insert_one(log)
        except Exception as e:
            print(f"⚠️ Failed to log yield prediction: {e}")
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {e}")
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import requests
from dotenv import load_dotenv

# Load environment variables from .env file (search parent directories too)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv()  # Also try current directory

# Optional: dynamic CORS middleware to echo allowed origins when
# running behind hosts that may strip CORS headers (helps dev & deploy)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


import joblib
import pandas as pd
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.security import OAuth2PasswordBearer



from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Form
from pydantic import BaseModel, Field, EmailStr

# --- Optional external deps with fallbacks ---
try:
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError
    try:
        from pymongo.errors import DuplicateKeyError
    except Exception:
        DuplicateKeyError = None
except Exception:
    MongoClient = None
    class PyMongoError(Exception):
        ...
    DuplicateKeyError = None

import traceback

try:
    import jwt
except Exception:
    class _DummyJWT:
        def encode(self, payload, secret, algorithm):
            sub = payload.get("sub", "")
            return f"devtoken:{sub}:{int(datetime.utcnow().timestamp())}"
        def decode(self, token, secret, algorithms):
            parts = token.split(":", 2)
            if len(parts) >= 3 and parts[0] == "devtoken":
                return {"sub": parts[1]}
            raise ValueError("Invalid token")
    jwt = _DummyJWT()

try:
    from bson import ObjectId
except Exception:
    # Minimal fallback for ObjectId parsing in dev
    class ObjectId:
        def __init__(self, x):
            self.x = x
        def __str__(self):
            return str(self.x)

# Use bcrypt for password hashing
import bcrypt as _bcrypt
class _PwdHashing:
    def hash(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
    
    def verify(self, password: str, hashed: str) -> bool:
        """Verify a password against its bcrypt hash"""
        try:
            return _bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

pwd_ctx = _PwdHashing()

# --- Weather API Configuration ---
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "")
WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather"

def get_weather(city: str) -> Optional[Dict[str, Any]]:
    """
    Fetch weather data from OpenWeather API.
    
    Returns:
        Dict with temperature, humidity, description, wind_speed, or None if API fails
    """
    if not WEATHER_API_KEY:
        print("⚠️ WEATHER_API_KEY not set, skipping weather data")
        return None
    
    try:
        params = {
            "q": city,
            "appid": WEATHER_API_KEY,
            "units": "metric"  # Use metric units (Celsius)
        }
        response = requests.get(WEATHER_API_URL, params=params, timeout=5)
        
        # Handle 401 Unauthorized specifically
        if response.status_code == 401:
            print(f"⚠️ Weather API key invalid or expired. Please get a valid key from https://openweathermap.org/api")
            return None
        
        response.raise_for_status()
        data = response.json()
        
        return {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "wind_speed": data["wind"]["speed"],
            "city": data["name"],
            "country": data["sys"]["country"]
        }
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Weather API error for {city}: {e}")
        return None
    except Exception as e:
        print(f"⚠️ Error processing weather data: {e}")
        return None

# --- Mandi Market API Configuration ---
MANDI_API_KEY = os.getenv("MANDI_API_KEY", "")
MANDI_RESOURCE_ID = os.getenv("MANDI_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
MANDI_API_URL = f"https://api.data.gov.in/resource/{MANDI_RESOURCE_ID}"

def fetch_mandi_prices(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Fetch market prices from data.gov.in API.
    
    Args:
        commodity: Optional commodity filter (e.g., "Wheat", "Rice")
        state: Optional state filter (e.g., "Maharashtra")
        district: Optional district filter
        limit: Maximum number of records to fetch
    
    Returns:
        Dict with records, average_price, commodity, state, fallback_used
    """
    if not MANDI_API_KEY:
        print("⚠️ MANDI_API_KEY not set")
        return {"error": "API key not configured", "records": [], "fallback_used": False}
    
    try:
        params = {
            "api-key": MANDI_API_KEY,
            "format": "json",
            "limit": limit
        }
        
        # Add optional filters
        if commodity:
            params["filters[commodity]"] = commodity
        if state:
            params["filters[state]"] = state
        if district:
            params["filters[district]"] = district
        
        response = requests.get(MANDI_API_URL, params=params, timeout=10)
        
        if response.status_code == 401:
            print("⚠️ Mandi API key invalid or expired")
            return {"error": "Invalid API key", "records": [], "fallback_used": False}
        
        response.raise_for_status()
        data = response.json()
        
        records = data.get("records", [])
        
        # Calculate average modal price
        avg_price = 0.0
        if records:
            prices = [float(r.get("modal_price", 0)) for r in records if r.get("modal_price")]
            if prices:
                avg_price = round(sum(prices) / len(prices), 2)
        
        return {
            "commodity": commodity or "All",
            "state": state or "All",
            "district": district or "All",
            "average_price": avg_price,
            "records_found": len(records),
            "total_records": len(records),
            "records": records,
            "fallback_used": False
        }
    except requests.exceptions.Timeout:
        print("⚠️ Mandi API request timed out")
        return {"error": "Request timed out", "records": [], "fallback_used": False}
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Mandi API error: {e}")
        return {"error": str(e), "records": [], "fallback_used": False}
    except Exception as e:
        print(f"⚠️ Error processing Mandi data: {e}")
        return {"error": str(e), "records": [], "fallback_used": False}

def fetch_mandi_prices_with_fallback(
    commodity: str,
    state: str,
    district: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Fetch market prices with fallback logic.
    
    1. First tries with commodity + state + district
    2. If no records found and district was provided, retry with only state
    3. Returns structured response with fallback_used flag
    
    Args:
        commodity: Commodity to search for
        state: State filter (required)
        district: District filter (optional)
        limit: Maximum records to fetch
    
    Returns:
        Dict with records, fallback_used flag, and metadata
    """
    # First attempt: with district if provided
    result = fetch_mandi_prices(
        commodity=commodity,
        state=state,
        district=district,
        limit=limit
    )
    
    # If error, return immediately
    if result.get("error"):
        return result
    
    # If records found, return result
    if result.get("records") and len(result["records"]) > 0:
        return result
    
    # Fallback: retry without district if district was provided
    if district:
        print(f"📍 [Mandi] No records for {commodity} in {district}, {state}. Trying state-only fallback...")
        fallback_result = fetch_mandi_prices(
            commodity=commodity,
            state=state,
            district=None,  # Remove district filter
            limit=limit
        )
        
        if fallback_result.get("error"):
            return fallback_result
        
        # Mark that fallback was used
        fallback_result["fallback_used"] = True
        fallback_result["original_district"] = district
        fallback_result["message"] = f"No data for {district}. Showing state-wide prices for {state}."
        
        return fallback_result
    
    # No records and no district fallback possible
    return {
        "commodity": commodity,
        "state": state,
        "district": district or "All",
        "average_price": 0,
        "records_found": 0,
        "records": [],
        "fallback_used": False,
        "message": f"No market data available for {commodity} in {state}"
    }

def get_best_price_market(commodity: str) -> Dict[str, Any]:
    """
    Find the market with the highest modal price for a given commodity.
    
    Args:
        commodity: The commodity to search for
    
    Returns:
        Dict with best market information
    """
    result = fetch_mandi_prices(commodity=commodity, limit=500)
    
    if result.get("error") or not result.get("records"):
        return {
            "commodity": commodity,
            "error": result.get("error", "No records found"),
            "best_market": None
        }
    
    records = result["records"]
    best_record = max(records, key=lambda x: float(x.get("modal_price", 0) or 0))
    
    return {
        "commodity": commodity,
        "best_market": {
            "market": best_record.get("market", "Unknown"),
            "state": best_record.get("state", "Unknown"),
            "district": best_record.get("district", "Unknown"),
            "modal_price": float(best_record.get("modal_price", 0)),
            "min_price": float(best_record.get("min_price", 0)),
            "max_price": float(best_record.get("max_price", 0)),
            "arrival_date": best_record.get("arrival_date", "Unknown"),
            "variety": best_record.get("variety", "Unknown")
        },
        "total_markets_checked": len(records)
    }

def calculate_revenue(predicted_yield_tons: float, modal_price_per_quintal: float) -> Dict[str, Any]:
    """
    Calculate estimated revenue based on yield prediction and market price.
    
    Args:
        predicted_yield_tons: Predicted yield in tons
        modal_price_per_quintal: Current market price per quintal (100 kg)
    
    Returns:
        Dict with revenue calculation details
    """
    # Convert tons to quintals (1 ton = 10 quintals)
    yield_quintals = predicted_yield_tons * 10
    
    # Calculate estimated revenue
    estimated_revenue = round(yield_quintals * modal_price_per_quintal, 2)
    
    return {
        "predicted_yield_tons": predicted_yield_tons,
        "yield_quintals": yield_quintals,
        "modal_price_per_quintal": modal_price_per_quintal,
        "estimated_revenue": estimated_revenue,
        "currency": "INR"
    }

def log_market_fetch(
    commodity: str, 
    state: str, 
    average_price: float,
    district: Optional[str] = None,
    user_email: Optional[str] = None,
    records_count: int = 0
) -> bool:
    """
    Log market data fetch to MongoDB.
    
    Args:
        commodity: The commodity fetched
        state: The state filter used
        average_price: The calculated average price
        district: The district filter used (optional)
        user_email: The email of the user who made the request
        records_count: Number of records returned
    
    Returns:
        True if logged successfully, False otherwise
    """
    if col_market_logs is None:
        return False
    
    try:
        col_market_logs.insert_one({
            "user_email": user_email,
            "commodity": commodity,
            "state": state,
            "district": district,
            "average_price": average_price,
            "records_count": records_count,
            "fetched_at": datetime.utcnow()
        })
        return True
    except Exception as e:
        print(f"⚠️ Failed to log market fetch: {e}")
        return False

# --- Model load ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "../ml_model/fertilizer_model.pkl")
try:
    bundle = joblib.load(MODEL_PATH)
    if isinstance(bundle, dict) and "model" in bundle:
        ml_model = bundle["model"]
        label_encoder = bundle.get("label_encoder")
    else:
        ml_model = bundle
        label_encoder = None
except Exception:
    ml_model = None
    label_encoder = None

# --- FastAPI setup ---
# app = FastAPI()
# app = FastAPI(
#     title="AgriAdvisor API",
#     description="Fertilizer Recommendation Platform",
#     version="1.0",
#     swagger_ui_parameters={"persistAuthorization": True},
    
#     openapi_tags=[{"name": "Auth", "description": "User Authentication"}],
# )

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Moved FastAPI app initialization to top of file
# ...existing code...



# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:5173",
#         "http://localhost:5176",

#         # Vercel frontend (preview + production)
#         "https://agri-advisor-git-main-sandeeps-projects-d25a4473.vercel.app",
#         "https://agri-advisor-aqinf1dq3-sandeeps-projects-d25a4473.vercel.app",
#         "https://agriadvisor.vercel.app",

#         # Render backend URL must be allowed
#         "https://agri-advisor-7d7c.onrender.com",

#         "*",   # keep fallback
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


from fastapi.middleware.cors import CORSMiddleware

# Build allowed origins list (can be extended via EXTRA_ALLOWED_ORIGINS env var)
default_allowed_origins = [
    # Local development
    "http://localhost:5173",
    "http://localhost:3000",
    
    # Production
    "http://65.2.62.142:3000",
]

# Allow adding extra origins via environment variable (comma separated)
extra = os.environ.get("EXTRA_ALLOWED_ORIGINS", "")
extra_list = [x.strip() for x in extra.split(",") if x.strip()]

allowed_origins = list(dict.fromkeys(default_allowed_origins + extra_list))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Origin",
        "Accept",
        "X-Requested-With",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=3600,
)


# Dynamic echo middleware: if the request Origin is one of the allowed
# origins, ensure the response contains Access-Control-Allow-Origin.
class DynamicCORSEchoMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed):
        super().__init__(app)
        self.allowed = set(allowed or [])

    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin")
        response = await call_next(request)
        if origin and origin in self.allowed:
            # Ensure the header is present (helps when upstream/proxy drops it)
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = ", ".join([
                h for h in (response.headers.get("Vary", ""), "Origin") if h
            ])
        return response

# Register dynamic echo middleware after CORSMiddleware
app.add_middleware(DynamicCORSEchoMiddleware, allowed=allowed_origins)

# --- MongoDB setup ---
# MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017")
# MONGO_DB = os.environ.get("MONGO_DB", "fertilizer_project")
# Use local MongoDB for development
MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb://localhost:27017"
)
MONGO_DB = os.environ.get("MONGO_DB", "fertilizer_project")



if MongoClient is not None:
    try:
        print("[CONN] Attempting MongoDB connection...")
        _mongo = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
            retryWrites=True,
            retryReads=True,
            w='majority'
        )
        
        # Test connection
        print("[TEST] Testing MongoDB connection...")
        _mongo.admin.command('ping')
        
        # Initialize database and collections
        print("[INIT] Initializing database and collections...")
        db = _mongo[MONGO_DB]
        col_users = db["users"]
        col_recs = db["recommendations"]
        col_articles = db["articles"]
        col_techniques = db["techniques"]
        col_prices = db["prices"]
        col_contacts = db["contacts"]
        col_soil_analysis = db["soil_analysis"]
        col_market_logs = db["market_logs"]
        col_crop_recommendations = db["crop_recommendations"]
        
        # Create indexes for better performance (ignore if already exists)
        print("[INDEX] Creating database indexes...")
        try:
            col_users.create_index([("email", 1)], unique=True)
        except Exception:
            pass  # Index already exists
        try:
            col_articles.create_index([("publishedAt", -1)])
        except Exception:
            pass
        try:
            col_techniques.create_index([("category", 1)])
        except Exception:
            pass
        try:
            col_soil_analysis.create_index([("user_email", 1), ("created_at", -1)])
        except Exception:
            pass
        try:
            col_market_logs.create_index([("commodity", 1), ("fetched_at", -1)])
        except Exception:
            pass
        
        print("[SUCCESS] MongoDB connected and initialized successfully!")
    except Exception as e:
        print(f"[ERROR] MongoDB connection failed: {str(e)}")
        print("[WARN] MongoDB connection details:")
        print(f"  - Database: {MONGO_DB}")
        print(f"  - Error type: {type(e).__name__}")
        _mongo = None
        db = None
        col_users = col_recs = col_articles = col_techniques = col_prices = col_contacts = col_soil_analysis = col_market_logs = col_crop_recommendations = None
else:
    print("⚠️ PyMongo not available.")
    _mongo = None
    db = None
    col_users = col_recs = col_articles = col_techniques = col_prices = col_contacts = col_soil_analysis = col_market_logs = col_crop_recommendations = None

# --- Auth helpers ---
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
ACCESS_TTL_MIN = 60 * 24  # 1 day

def create_access_token(sub: str) -> str:
    now = datetime.utcnow()
    payload = {"sub": sub, "iat": now, "exp": now + timedelta(minutes=ACCESS_TTL_MIN)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

# def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    #  Header(None, alias="Authorization"))
# def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
#     if not authorization or not authorization.lower().startswith("bearer "):
#         raise HTTPException(status_code=401, detail="Missing token")
#     token = authorization.split(" ", 1)[1]
#     try:
#         payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
#         email = payload.get("sub")
#         if not email:
#             raise HTTPException(status_code=401, detail="Invalid token")
#         user = USERS.get(email)
#         if not user and col_users is not None:
#             doc = col_users.find_one({"email": email})
#             if doc:
#                 user = {
#                     "name": doc.get("name"),
#                     "email": doc.get("email"),
#                     "password_hash": doc.get("password_hash"),
#                     "phone": doc.get("phone"),
#                     "location": doc.get("location"),
#                 }
#                 USERS[email] = user
#         if not user:
#             raise HTTPException(status_code=401, detail="User not found")
#         return user
#     except Exception:
#         raise HTTPException(status_code=401, detail="Invalid token")


# def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = USERS.get(email)
        if not user and col_users is not None:
            doc = col_users.find_one({"email": email})
            if doc:
                # Handle backward compatibility for old location format
                location = doc.get("location")
                if isinstance(location, str):
                    # Old format: convert string to object
                    location = {"state": location, "district": ""}
                elif not isinstance(location, dict):
                    location = {"state": "", "district": ""}
                
                user = {
                    "name": doc.get("name"),
                    "email": doc.get("email"),
                    "phone": doc.get("phone"),
                    "location": location,
                    "role": doc.get("role", "farmer"),  # Default to farmer for backward compatibility
                }
                USERS[email] = user
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: Dict[str, Any] = Depends(get_current_user)):
    """Dependency to require admin role for protected routes."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user




# --- In-memory fallback stores ---
USERS: Dict[str, Dict[str, Any]] = {}
RECS_BY_USER: Dict[str, List[Dict[str, Any]]] = {}

# --- Schemas ---
class LocationModel(BaseModel):
    state: str = Field(..., description="State name (e.g., 'Telangana')")
    district: str = Field(..., description="District name (e.g., 'Hyderabad')")

class RegisterReq(BaseModel):
    name: str = Field(..., min_length=2, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    phone: Optional[str] = Field(None, description="Optional phone number")
    state: str = Field(..., description="State name")
    district: str = Field(..., description="District name")
    role: str = Field(default="farmer", description="User role: 'farmer' or 'admin'")

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

class RecommendReq(BaseModel):
    N: float
    P: float
    K: float
    pH: float
    moisture: float
    temperature: float
    crop_type: str
    soil_type: str

class RecommendResp(BaseModel):
    fertilizer: str
    details: Dict[str, Any]

class SoilAnalysisReq(BaseModel):
    N: float
    P: float
    K: float
    pH: float
    crop_type: str
    soil_type: str

class SoilAnalysisResp(BaseModel):
    score: int
    status: Dict[str, str]
    suggestions: List[str]

class ContactReq(BaseModel):
    name: str
    mobile: str
    message: str

# Optional: article input schema for create route
class ArticleIn(BaseModel):
    title: str
    image: Optional[str] = None
    image_url: Optional[str] = None
    excerpt: Optional[str] = None
    description: Optional[str] = None
    content: str
    author: Optional[str] = None
    publishedAt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list] = None
    
    class Config:
        extra = "allow"  # Allow extra fields

# Enums for encoding categorical inputs (must match training)
SOIL_TYPES = ["Sandy", "Loamy", "Clay", "Silty", "Peaty"]
CROP_TYPES = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane"]

# --- Routes ---
# @app.get("/api/diag")
@app.get("/api/secure-test", tags=["Auth"])
def secure_test(token: str = Depends(oauth2_scheme)):
    return {"message": "You are authorized!", "token": token}

def diag():
    info = {"mongo": bool(_mongo), "db": MONGO_DB}
    try:
        if db is not None:
            info["collections"] = db.list_collection_names()
    except Exception as e:
        print("❌ list_collection_names failed:", e)
        info["collections"] = []
    return info

@app.get("/")
async def home():
    status = {
        "message": "Fertilizer Recommendation API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "mongo": {
            "connected": bool(_mongo),
            "database": MONGO_DB if _mongo else None
        },
        "collections": {
            "users": (col_users is not None),
            "articles": (col_articles is not None),
            "techniques": (col_techniques is not None),
            "recommendations": (col_recs is not None),
            "contacts": (col_contacts is not None)
        }
    }
    
    # Test MongoDB connection if connected
    if _mongo:
        try:
            _mongo.admin.command('ping')
            status["mongo"]["ping"] = "success"
        except Exception as e:
            status["mongo"]["ping"] = f"failed: {str(e)}"
    
    return status


@app.head("/")
async def head_home():
    # Provide an explicit HEAD handler to avoid 405 responses from some clients
    # Return only headers (no body) with 200 OK
    return Response(status_code=200)

@app.post("/api/auth/register", response_model=TokenResp)
async def register(req: RegisterReq):
    try:
        print(f"👉 Registration attempt for: {req.email}")
        
        # Validate email format
        email = req.email.lower()
        
        # Check if email already exists (memory check is instant)
        if email in USERS:
            print(f"❌ Email already exists in memory: {email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Validate password length
        pw_bytes = req.password.encode("utf-8") if isinstance(req.password, str) else bytes(req.password)
        if len(pw_bytes) > 72:
            print(f"❌ Password too long ({len(pw_bytes)} bytes) for user: {email}")
            raise HTTPException(status_code=400, detail="Password is too long. Please use a password shorter than 72 bytes")

        # Hash password quickly
        try:
            hashed_pw = pwd_ctx.hash(req.password)
        except Exception as e:
            print(f"❌ Password hashing failed: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail="Server error while processing password")

        # Create user document
        user_doc = {
            "name": req.name,
            "email": email,
            "password_hash": hashed_pw,
            "phone": req.phone,
            "location": {
                "state": req.state,
                "district": req.district
            },
            "role": req.role if req.role in ["farmer", "admin"] else "farmer",
            "created_at": datetime.utcnow(),
        }
        
        # Store in memory IMMEDIATELY (fast response)
        USERS[email] = user_doc
        print(f"✅ User stored in memory: {email}")
        
        # Create access token IMMEDIATELY
        token = create_access_token(email)
        print(f"✅ Registration successful for: {email}")
        
        # Background: Try to store in MongoDB (non-blocking)
        if col_users is not None:
            try:
                # Non-blocking MongoDB insert in background
                res = col_users.insert_one(user_doc)
                if getattr(res, "acknowledged", False):
                    print(f"✅ User also stored in database with ID: {res.inserted_id}")
            except Exception as db_e:
                print(f"⚠️ Background DB insert failed (but user registered): {db_e}")
                # Continue - user is already in memory
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user_doc["role"],
            "user": {
                "name": user_doc["name"],
                "email": user_doc["email"],
                "location": user_doc["location"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error during registration: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

# @app.post("/api/auth/login", response_model=TokenResp)
# # def login(req: LoginReq):
# @app.post("/api/auth/login", response_model=TokenResp)
# def login(req: LoginReq):
#     """
#     OAuth2-compatible login route.
#     """


#     email = req.email.lower()
#     user = USERS.get(email)
#     if not user and col_users is not None:
#         doc = col_users.find_one({"email": email})
#         if doc:
#             user = {
#                 "name": doc.get("name"),
#                 "email": doc.get("email"),
#                 "password_hash": doc.get("password_hash"),
#                 "phone": doc.get("phone"),
#                 "location": doc.get("location"),
#             }
#             USERS[email] = user
#     if not user or not pwd_ctx.verify(req.password, user["password_hash"]):
#         raise HTTPException(status_code=401, detail="Invalid credentials")
#     return {"access_token": create_access_token(email), "token_type": "bearer"}

# from fastapi.security import OAuth2PasswordRequestForm

# @app.post("/api/auth/login", response_model=TokenResp)
# def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     """
#     OAuth2-compatible login route (works with Swagger Authorize form)
#     """
#     email = form_data.username.lower()
#     password = form_data.password

#     user = USERS.get(email)
#     if not user and col_users is not None:
#         doc = col_users.find_one({"email": email})
#         if doc:
#             user = {
#                 "name": doc.get("name"),
#                 "email": doc.get("email"),
#                 "password_hash": doc.get("password_hash"),
#                 "phone": doc.get("phone"),
#                 "location": doc.get("location"),
#             }
#             USERS[email] = user

#     if not user or not pwd_ctx.verify(password, user["password_hash"]):
#         raise HTTPException(status_code=401, detail="Invalid credentials")

#     return {"access_token": create_access_token(email), "token_type": "bearer"}

from fastapi import Form

# @app.post("/api/auth/login", response_model=TokenResp)
# def login(username: str = Form(...), password: str = Form(...)):
@app.post("/api/auth/login", response_model=TokenResp)
def login(req: LoginReq):
    """Fast login using in-memory user store (instant response)"""
    email = req.email.lower()
    
    # Check memory first (instant)
    user = USERS.get(email)
    
    # If not in memory, load from MongoDB (fallback only)
    if not user and col_users is not None:
        try:
            doc = col_users.find_one({"email": email})
            if doc:
                # Handle location backward compatibility
                location = doc.get("location")
                if isinstance(location, str):
                    location = {"state": location, "district": ""}
                elif not isinstance(location, dict):
                    location = {"state": "", "district": ""}
                
                user = {
                    "name": doc.get("name"),
                    "email": doc.get("email"),
                    "password_hash": doc.get("password_hash"),
                    "phone": doc.get("phone"),
                    "location": location,
                    "role": doc.get("role", "farmer"),  # Default to farmer for backward compatibility
                }
                USERS[email] = user  # Cache in memory for next time
        except Exception as db_e:
            print(f"⚠️ DB lookup failed, continuing: {db_e}")
    
    # If still not found, reject
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not pwd_ctx.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate and return token with role and user info
    token = create_access_token(email)
    role = user.get("role", "farmer")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "user": {
            "name": user.get("name"),
            "email": user.get("email"),
            "location": user.get("location")
        }
    }

from fastapi import Depends
@app.get("/api/me")
def me(user=Depends(get_current_user)):
    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "location": user.get("location"),
        "role": user.get("role", "farmer"),
    }

@app.put("/api/me/update")
def update_profile(req: dict, user=Depends(get_current_user)):
    """Update user profile (name, phone, state, district)"""
    email = user.get("email")
    
    # Build location object from state/district fields
    state = req.get("state", "")
    district = req.get("district", "")
    location = {"state": state, "district": district}
    
    # Update in memory cache
    if email in USERS:
        USERS[email].update({
            "name": req.get("name", USERS[email].get("name")),
            "phone": req.get("phone", USERS[email].get("phone")),
            "location": location,
        })
    
    # Update in MongoDB (best effort, non-blocking)
    if col_users is not None:
        try:
            col_users.update_one(
                {"email": email},
                {"$set": {
                    "name": req.get("name"),
                    "phone": req.get("phone"),
                    "location": location,
                }},
                upsert=False
            )
        except Exception as db_e:
            print(f"⚠️ DB update failed, proceeding: {db_e}")
    
    return {
        "name": USERS[email].get("name") if email in USERS else req.get("name"),
        "email": email,
        "phone": USERS[email].get("phone") if email in USERS else req.get("phone"),
        "location": location,
    }

@app.post("/api/contact")
async def contact(request: Request):
    # Accept both JSON and form-encoded
    data = None
    try:
        data = await request.json()
    except Exception:
        try:
            form = await request.form()
            data = dict(form)
        except Exception:
            data = None
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail="Invalid body")

    name = (data.get("name") or "").strip()
    message = (data.get("message") or "").strip()
    email = (data.get("email") or None)
    mobile = (data.get("mobile") or None)
    if not name or not message:
        raise HTTPException(status_code=422, detail="'name' and 'message' are required")

    doc = {"name": name, "message": message, "ts": datetime.utcnow()}
    if email: doc["email"] = email
    if mobile: doc["mobile"] = mobile

    try:
        if col_contacts is not None:
            print("👉 Attempting DB insert into 'contacts' collection...")
            res = col_contacts.insert_one(doc)
            print("✅ Insert result:", res.acknowledged, res.inserted_id)
            if getattr(res, "acknowledged", False):
                return {"status": "ok", "stored": "db", "id": str(res.inserted_id)}
    except Exception as e:
        print("❌ DB insert failed:", e)
    return {"status": "ok", "stored": "memory"}

# --- Weather endpoint ---
@app.get("/api/weather/{city}")
def get_weather_endpoint(city: str):
    """
    Get current weather data for a city.
    Returns weather data or 400 if not available.
    """
    if not city or len(city.strip()) == 0:
        raise HTTPException(status_code=400, detail="City name is required")
    
    weather = get_weather(city.strip())
    if not weather:
        raise HTTPException(status_code=400, detail=f"Weather data not available for {city}")
    
    return weather

# --- Mandi Market Price Endpoints ---
@app.get("/api/market/prices")
def get_market_prices(
    commodity: Optional[str] = None,
    limit: int = 50,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get live mandi market prices for commodities based on user's location.
    
    Requires authentication. State and district are extracted from the logged-in user's profile.
    
    Query params:
        - commodity: Filter by commodity name (e.g., "Wheat", "Rice")
        - limit: Max records to return (default 50)
    
    Returns:
        JSON with commodity, state, district, records_found, records, and fallback_used flag
    """
    # Extract location from user profile
    location = user.get("location", {})
    
    # Handle backward compatibility for old string-based location
    if isinstance(location, str):
        state = location
        district = None
    elif isinstance(location, dict):
        state = location.get("state", "")
        district = location.get("district", "")
    else:
        state = ""
        district = None
    
    if not state:
        raise HTTPException(
            status_code=400, 
            detail="Location not set. Please update your profile with state and district."
        )
    
    # Use fallback-enabled fetch
    result = fetch_mandi_prices_with_fallback(
        commodity=commodity or "Rice",  # Default to Rice if not specified
        state=state,
        district=district if district else None,
        limit=limit
    )
    
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    
    # Log to MongoDB with user info
    log_market_fetch(
        commodity=commodity or "Rice",
        state=state,
        average_price=result.get("average_price", 0),
        district=district,
        user_email=user.get("email"),
        records_count=result.get("records_found", 0)
    )
    
    return result

@app.get("/api/market/prices/public")
def get_market_prices_public(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = 50
):
    """
    Get live mandi market prices for commodities (public endpoint, no auth required).
    
    Query params:
        - commodity: Filter by commodity name (e.g., "Wheat", "Rice")
        - state: Filter by state (e.g., "Maharashtra")
        - district: Filter by district
        - limit: Max records to return (default 50)
    
    Returns:
        JSON with commodity, state, average_price, and records
    """
    if state:
        result = fetch_mandi_prices_with_fallback(
            commodity=commodity or "Rice",
            state=state,
            district=district,
            limit=limit
        )
    else:
        result = fetch_mandi_prices(
            commodity=commodity,
            state=state,
            district=district,
            limit=limit
        )
    
    if result.get("error"):
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

@app.get("/api/market-prices/{state}")
def get_market_prices_by_state(
    state: str,
    commodity: Optional[str] = None,
    limit: int = 50
):
    """
    Get mandi crop prices filtered by state from data.gov.in API.
    
    Path params:
        - state: State name (e.g., "Maharashtra", "Karnataka", "Punjab")
    
    Query params:
        - commodity: Optional commodity filter (e.g., "Wheat", "Rice")
        - limit: Max records to return (default 50)
    
    Returns:
        JSON with state, prices array (commodity, district, market, modal_price), 
        average_price, and metadata
    """
    if not state or len(state.strip()) == 0:
        raise HTTPException(status_code=400, detail="State name is required")
    
    state = state.strip()
    
    # Try fetching from live API first
    result = fetch_mandi_prices(
        commodity=commodity,
        state=state,
        district=None,
        limit=limit
    )
    
    # If API error or no records, use static fallback
    if result.get("error") or not result.get("records") or len(result.get("records", [])) == 0:
        print(f"📊 [Market] Using static fallback for {state}")
        
        # Use static fallback data
        fallback_result = get_fallback_prices(
            commodity=commodity or "Rice",
            state=state
        )
        
        # Transform records to simplified format
        prices = []
        for record in fallback_result.get("records", []):
            prices.append({
                "commodity": record.get("commodity", "Unknown"),
                "district": record.get("district", "N/A"),
                "market": record.get("market", "N/A"),
                "modal_price": float(record.get("modal_price", 0)),
                "min_price": float(record.get("min_price", 0)),
                "max_price": float(record.get("max_price", 0)),
                "arrival_date": record.get("arrival_date", "N/A")
            })
        
        return {
            "state": state,
            "commodity": commodity or "All",
            "prices": prices,
            "average_price": fallback_result.get("average_price", 0),
            "records_found": len(prices),
            "data_source": "static_fallback",
            "is_static_data": True,
            "message": fallback_result.get("message", f"Showing estimated prices for {state}")
        }
    
    # Transform live API records to simplified format
    prices = []
    for record in result.get("records", []):
        prices.append({
            "commodity": record.get("commodity", "Unknown"),
            "district": record.get("district", "N/A"),
            "market": record.get("market", "N/A"),
            "modal_price": float(record.get("modal_price", 0) or 0),
            "min_price": float(record.get("min_price", 0) or 0),
            "max_price": float(record.get("max_price", 0) or 0),
            "arrival_date": record.get("arrival_date", "N/A")
        })
    
    return {
        "state": state,
        "commodity": commodity or "All",
        "prices": prices,
        "average_price": result.get("average_price", 0),
        "records_found": result.get("records_found", len(prices)),
        "data_source": "data.gov.in",
        "is_static_data": False,
        "message": f"Live market prices for {state}"
    }

@app.get("/api/market/best-price/{commodity}")
def get_best_price(commodity: str):
    """
    Get the market with the highest modal price for a specific commodity.
    
    Args:
        commodity: The commodity to search for (e.g., "Wheat", "Rice", "Cotton")
    
    Returns:
        JSON with best market details including name, state, and price
    """
    if not commodity or len(commodity.strip()) == 0:
        raise HTTPException(status_code=400, detail="Commodity name is required")
    
    result = get_best_price_market(commodity.strip())
    
    if result.get("error") and not result.get("best_market"):
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result

@app.post("/api/market/revenue")
def calculate_revenue_endpoint(
    predicted_yield: float,
    commodity: Optional[str] = None,
    modal_price: Optional[float] = None
):
    """
    Calculate estimated revenue based on yield prediction and market price.
    
    Query params:
        - predicted_yield: Predicted yield in tons
        - commodity: Commodity to get current price for (optional if modal_price provided)
        - modal_price: Manual price per quintal (optional, fetches from API if not provided)
    
    Returns:
        JSON with revenue calculation details
    """
    if predicted_yield <= 0:
        raise HTTPException(status_code=400, detail="Predicted yield must be positive")
    
    price = modal_price
    
    # If no manual price, try to fetch from market
    if price is None and commodity:
        best = get_best_price_market(commodity)
        if best.get("best_market"):
            price = best["best_market"].get("modal_price", 0)
    
    if price is None or price <= 0:
        raise HTTPException(
            status_code=400, 
            detail="Modal price is required. Either provide it or specify a valid commodity."
        )
    
    return calculate_revenue(predicted_yield, price)

@app.get("/api/market/logs")
def get_market_logs(limit: int = 20):
    """
    Get recent market fetch logs from MongoDB.
    
    Query params:
        - limit: Maximum number of logs to return (default 20)
    
    Returns:
        List of recent market fetch logs
    """
    if col_market_logs is None:
        return []
    
    try:
        logs = list(col_market_logs.find({}).sort("fetched_at", -1).limit(limit))
        # Convert ObjectId to string
        for log in logs:
            log["id"] = str(log.pop("_id", ""))
            if log.get("fetched_at"):
                log["fetched_at"] = log["fetched_at"].isoformat()
        return logs
    except Exception as e:
        print(f"⚠️ Failed to fetch market logs: {e}")
        return []

@app.post("/api/recommend/", response_model=RecommendResp)
def recommend(req: RecommendReq = None, user=Depends(get_current_user)):

    # Encode categorical inputs to integers expected by the model
    def encode(value: str, choices: list[str]) -> int:
        try:
            return choices.index(value)
        except ValueError:
            return 0

    soil_idx = encode(req.soil_type, SOIL_TYPES) if isinstance(req.soil_type, str) else int(req.soil_type)
    crop_idx = encode(req.crop_type, CROP_TYPES) if isinstance(req.crop_type, str) else int(req.crop_type)

    # Try to align features with the model's expected columns
    features_full = {
        "temperature": req.temperature,
        "humidity": 0.0,  # not provided by form; default to 0
        "moisture": req.moisture,
        "soil_type": soil_idx,
        "crop_type": crop_idx,
        "N": req.N,
        "P": req.P,
        "K": req.K,
        "pH": req.pH,
    }

    X = None
    if ml_model is not None:
        try:
            cols = None
            # scikit models often expose feature_names_in_ (numpy array)
            if hasattr(ml_model, "feature_names_in_"):
                cols = [c if isinstance(c, str) else str(c) for c in getattr(ml_model, "feature_names_in_")]
            # Build DataFrame with best-effort column alignment
            if cols:
                row = {c: features_full.get(c, 0) for c in cols}
                X = pd.DataFrame([row])
            else:
                # Fallback to a sensible order used in training
                order = ["temperature", "humidity", "moisture", "soil_type", "crop_type", "N", "P", "K", "pH"]
                row = {k: features_full.get(k, 0) for k in order}
                X = pd.DataFrame([row])
        except Exception:
            X = pd.DataFrame([{k: features_full[k] for k in ["N", "P", "K", "pH", "moisture"]}])

    fertilizer = "Urea"
    if ml_model is not None and X is not None:
        try:
            pred = ml_model.predict(X)[0]
            fertilizer = pred
            # If model outputs class indices, map back with label encoder if present
            if label_encoder is not None:
                try:
                    fertilizer = label_encoder.inverse_transform([int(pred)])[0]
                except Exception:
                    pass
            # If prediction is a numpy scalar, coerce to string
            fertilizer = str(fertilizer)
        except Exception:
            fertilizer = "Urea"

    # Minimal details payload; extend if you have a fertilizer catalog
    details = {"name": fertilizer}
    
    # Fetch weather data (using a default city like Hyderabad if not provided)
    weather_data = get_weather("Hyderabad")
    if weather_data:
        details["weather"] = weather_data
        
        # Generate weather alerts based on conditions
        alerts = []
        if weather_data.get("humidity", 0) > 80:
            alerts.append("High humidity risk - monitor for fungal diseases")
        if weather_data.get("temperature", 0) > 35:
            alerts.append("High temperature warning - increase irrigation")
        
        if alerts:
            details["weather_alert"] = " | ".join(alerts)

    # Persist recommendation (best effort)
    rec = {
        "ts": datetime.utcnow(),
        "user_email": user.get("email"),
        "input": req.dict(),
        "output": details
    }

    try:
        if col_recs is not None:
            col_recs.insert_one(rec)
    except Exception:
        pass

    return {"fertilizer": fertilizer, "details": details}

# --- Soil Analysis Helper Functions ---
def analyze_soil_health(N: float, P: float, K: float, pH: float) -> tuple:
    """
    Analyze soil health and return (score, status_dict, suggestions_list)
    
    Ideal Ranges:
    - Nitrogen (N): 40 – 80
    - Phosphorus (P): 30 – 60
    - Potassium (K): 20 – 50
    - pH: 6.0 – 7.5
    """
    # Ideal ranges
    ranges = {
        "N": (40, 80),
        "P": (30, 60),
        "K": (20, 50),
        "pH": (6.0, 7.5)
    }
    
    values = {"N": N, "P": P, "K": K, "pH": pH}
    status = {}
    suggestions = []
    score = 100
    
    # Analyze each nutrient
    for nutrient, (min_val, max_val) in ranges.items():
        actual = values[nutrient]
        
        if actual < min_val:
            status[nutrient] = "Deficient"
            score -= 20
        elif actual > max_val:
            status[nutrient] = "Excess"
            score -= 10
        else:
            status[nutrient] = "Optimal"
    
    # Generate suggestions based on status
    if status.get("N") == "Deficient":
        suggestions.append("🌾 Nitrogen is low. Increase using Urea, Ammonium Nitrate, or compost.")
    elif status.get("N") == "Excess":
        suggestions.append("⚠️ Nitrogen is high. Reduce nitrogen fertilizers. Use low-N crops.")
    
    if status.get("P") == "Deficient":
        suggestions.append("🌾 Phosphorus is low. Add bone meal, rock phosphate, or DAP fertilizer.")
    elif status.get("P") == "Excess":
        suggestions.append("⚠️ Phosphorus is high. Avoid phosphorus-heavy fertilizers.")
    
    if status.get("K") == "Deficient":
        suggestions.append("🌾 Potassium is low. Use potassium nitrate, wood ash, or sulfate of potash.")
    elif status.get("K") == "Excess":
        suggestions.append("⚠️ Potassium is high. Reduce K fertilizers. Increase nitrogen ratio.")
    
    if status.get("pH") == "Deficient":
        suggestions.append("🌾 pH is too low (acidic). Apply agricultural lime to increase pH.")
    elif status.get("pH") == "Excess":
        suggestions.append("⚠️ pH is too high (alkaline). Use soil acidifiers, sulfur, or organic matter.")
    
    # Overall soil health suggestion
    if score >= 80:
        suggestions.append("✅ Overall soil health is excellent! Maintain current practices.")
    elif score >= 60:
        suggestions.append("👍 Soil health is good. Make minor adjustments above.")
    elif score >= 40:
        suggestions.append("⚠️ Soil health needs attention. Follow recommendations above.")
    else:
        suggestions.append("❌ Soil health is poor. Take corrective measures urgently.")
    
    # Ensure score is between 0 and 100
    score = max(0, min(100, score))
    
    return score, status, suggestions

# --- Soil Analysis Endpoint ---
@app.post("/api/soil/analyze", response_model=SoilAnalysisResp)
def analyze_soil(req: SoilAnalysisReq = None, user=Depends(get_current_user)):
    """
    Analyze soil health based on nutrient levels and pH.
    Saves analysis to database and returns score, status, and suggestions.
    """
    email = user.get("email")
    
    # Perform analysis
    score, status, suggestions = analyze_soil_health(req.N, req.P, req.K, req.pH)
    
    # Prepare document for MongoDB
    doc = {
        "user_email": email,
        "N": req.N,
        "P": req.P,
        "K": req.K,
        "pH": req.pH,
        "crop_type": req.crop_type,
        "soil_type": req.soil_type,
        "score": score,
        "status": status,
        "suggestions": suggestions,
        "created_at": datetime.utcnow()
    }
    
    # Save to MongoDB (best effort)
    try:
        if col_soil_analysis is not None:
            col_soil_analysis.insert_one(doc)
            print(f"✅ Soil analysis saved for {email}")
    except Exception as e:
        print(f"⚠️ Failed to save soil analysis: {e}")
    
    # Return response
    return {
        "score": score,
        "status": status,
        "suggestions": suggestions
    }

# --- Soil Analysis History Endpoint ---
@app.get("/api/soil/history")
def get_soil_history(user=Depends(get_current_user)):
    """Get user's soil analysis history (sorted by newest first)"""
    email = user.get("email")
    if col_soil_analysis is None:
        return []
    
    try:
        # Find soil analyses for this user
        query = {"user_email": email} if email else {}
        history = list(col_soil_analysis.find(query).sort("created_at", -1).limit(20))
        
        # Convert to JSON-serializable format
        for doc in history:
            doc["_id"] = str(doc.get("_id", ""))
            if doc.get("created_at"):
                doc["created_at"] = doc["created_at"].isoformat()
        
        return history
    except Exception as e:
        print(f"❌ Soil history fetch failed: {e}")
        return []

# --- Recommendation History endpoint ---
@app.get("/api/history")
def get_history(user=Depends(get_current_user)):
    """Get user's recommendation history (sorted by newest first)"""
    email = user.get("email")
    if col_recs is None:
        return []
    
    try:
        # Find recommendations for this user
        query = {"user_email": email} if email else {}
        history = list(col_recs.find(query).sort("ts", -1).limit(50))
        
        # Convert to JSON-serializable format
        for rec in history:
            rec["_id"] = str(rec.get("_id", ""))
            rec["ts"] = rec.get("ts").isoformat() if rec.get("ts") else None
        
        return history
    except Exception as e:
        print(f"❌ History fetch failed: {e}")
        return []

# --- Market Prices endpoint ---
@app.get("/api/prices")
def get_prices():
    """Get current market prices for crops"""
    # Sample market prices - replace with actual data if available
    prices = [
        {"commodity": "Rice", "price": 1800, "unit": "per 50kg", "currency": "INR"},
        {"commodity": "Wheat", "price": 2200, "unit": "per 50kg", "currency": "INR"},
        {"commodity": "Maize", "price": 1400, "unit": "per 50kg", "currency": "INR"},
        {"commodity": "Cotton", "price": 5500, "unit": "per quintal", "currency": "INR"},
        {"commodity": "Sugarcane", "price": 3200, "unit": "per quintal", "currency": "INR"},
    ]
    return prices

# --- Articles endpoints ---
@app.get("/api/articles")
def list_articles():
    if col_articles is None:
        return []
    out: list[dict[str, Any]] = []
    try:
        cursor = col_articles.find({}).sort("_id", -1)
        for d in cursor:
            d = dict(d)
            d["id"] = str(d.pop("_id", ""))
            out.append(d)
    except Exception as e:
        print("❌ list_articles failed:", e)
        return []
    return out

# @app.get("/api/articles/{id}")
# def get_article(id: str):
#     if col_articles is None:
#         raise HTTPException(status_code=404, detail="Not found")
#     try:
#         oid = ObjectId(id)
#     except Exception:
#         # Allow non-ObjectId ids if you store custom ids
#         doc = col_articles.find_one({"id": id})
#     else:
#         doc = col_articles.find_one({"_id": oid})
#     if not doc:
#         raise HTTPException(status_code=404, detail="Not found")
#     d = dict(doc)
#     d["id"] = str(d.pop("_id", ""))
#     return d
@app.get("/api/articles/{id}")
def get_article(id: str):
    if col_articles is None:
        raise HTTPException(status_code=404, detail="Not found")

    # Try both ObjectId and string-based _id
    doc = None
    try:
        # Try ObjectId first
        oid = ObjectId(id)
        doc = col_articles.find_one({"_id": oid})
    except Exception:
        # Then try string-based _id or id fields
        doc = col_articles.find_one({"_id": id}) or col_articles.find_one({"id": id})

    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d

# Optional: create an article (useful for testing via POST)
@app.post("/api/articles")
def create_article(a: ArticleIn):
    if col_articles is None:
        raise HTTPException(status_code=500, detail="DB not configured")
    doc = a.dict()
    # Normalize: keep both image and image_url if provided; frontend supports either
    if doc.get("image_url") and not doc.get("image"):
        doc["image"] = doc["image_url"]
    if doc.get("description") is None and doc.get("excerpt"):
        doc["description"] = doc["excerpt"]
    try:
        res = col_articles.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc.pop("_id", None)  # Remove ObjectId which isn't JSON serializable
        return doc
    except Exception as e:
        print("❌ create_article failed:", e)
        raise HTTPException(status_code=500, detail="Insert failed")

# --- Techniques endpoints ---
@app.get("/api/techniques")
def list_techniques(category: Optional[str] = None, tag: Optional[str] = None, limit: int = 0):
    if 'col_techniques' not in globals() or col_techniques is None:
        return []
    out: list[dict[str, Any]] = []
    try:
        q: dict[str, Any] = {}
        if category:
            q["category"] = category
        if tag:
            q["tags"] = {"$in": [tag]}
        cursor = col_techniques.find(q).sort("_id", -1)
        if isinstance(limit, int) and limit > 0:
            cursor = cursor.limit(limit)
        for d in cursor:
            d = dict(d)
            d["id"] = str(d.pop("_id", ""))
            out.append(d)
    except Exception as e:
        print("❌ list_techniques failed:", e)
        return []
    return out

@app.get("/api/techniques/{id}")
def get_technique(id: str):
    if 'col_techniques' not in globals() or col_techniques is None:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        oid = ObjectId(id)
    except Exception:
        doc = col_techniques.find_one({"id": id})
    else:
        doc = col_techniques.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    d = dict(doc)
    d["id"] = str(d.pop("_id", ""))
    return d

@app.post("/api/techniques")
def create_technique(a: ArticleIn):
    if 'col_techniques' not in globals() or col_techniques is None:
        raise HTTPException(status_code=500, detail="DB not configured")
    doc = a.dict()
    if doc.get("image_url") and not doc.get("image"):
        doc["image"] = doc["image_url"]
    if doc.get("description") is None and doc.get("excerpt"):
        doc["description"] = doc["excerpt"]
    try:
        res = col_techniques.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc.pop("_id", None)  # Remove ObjectId which isn't JSON serializable
        return doc
    except Exception as e:
        print("❌ create_technique failed:", e)
        raise HTTPException(status_code=500, detail="Insert failed")


# --- Smart Crop Recommendation System (Profit-Based) ---

# Pydantic model for crop recommendation request
class CropRecommendationRequest(BaseModel):
    state: str
    area: float
    rainfall: float
    fertilizer: float
    pesticide: float
    season: str

# Predefined list of crops to test for recommendations
RECOMMENDATION_CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Mango", "Banana", "Apple", "Orange", "Grapes"]

# Static fallback prices for when API is unavailable (per quintal in INR)
FALLBACK_PRICES = {
    "Rice": 2450,
    "Wheat": 2275,
    "Maize": 1950,
    "Cotton": 6800,
    "Sugarcane": 350,
    "Mango": 4500,
    "Banana": 1800,
    "Apple": 8500,
    "Orange": 4200,
    "Grapes": 6500,
    "Coconut": 2800,
    "Papaya": 1500,
    "Watermelon": 1200,
    "Muskmelon": 1400,
    "Pomegranate": 8500,
    "Lentil": 5800,
    "Chickpea": 5200,
    "Coffee": 22000,
    "Jute": 5500,
}


def predict_crop_yield(area: float, rainfall: float, fertilizer: float, pesticide: float, crop: str, season: str, state: str) -> Optional[float]:
    """
    Predict yield for a specific crop using the trained model.
    
    Returns yield in tons/hectare or None if prediction fails.
    """
    if yield_model is None or yield_columns is None:
        return None
    
    try:
        data = {
            "Area": area,
            "Annual_Rainfall": rainfall,
            "Fertilizer": fertilizer,
            "Pesticide": pesticide,
            "Crop": crop,
            "Season": season,
            "State": state
        }
        X = prepare_yield_input(data)
        pred = yield_model.predict(X)[0]
        return float(pred) if pred > 0 else None
    except Exception as e:
        print(f"⚠️ Failed to predict yield for {crop}: {e}")
        return None


def get_crop_market_price(crop: str, state: str) -> Optional[float]:
    """
    Get market price for a crop from mandi API or fallback.
    
    Returns modal price per quintal or None if unavailable.
    """
    try:
        # Try fetching from live API
        result = fetch_mandi_prices(commodity=crop, state=state, limit=20)
        
        if not result.get("error") and result.get("average_price", 0) > 0:
            return result["average_price"]
        
        # Use fallback price if API fails
        if crop in FALLBACK_PRICES:
            return FALLBACK_PRICES[crop]
        
        return None
    except Exception as e:
        print(f"⚠️ Failed to get market price for {crop}: {e}")
        # Return fallback price
        return FALLBACK_PRICES.get(crop)


@app.post("/api/crop/recommend")
def recommend_crop(
    req: CropRecommendationRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recommend the most profitable crop based on predicted yield and market prices.
    
    For each crop in the predefined list:
    1. Predict yield using the trained model
    2. Fetch current market price
    3. Calculate estimated profit: yield * price * area
    
    Returns crops sorted by estimated profit (descending).
    """
    if yield_model is None:
        raise HTTPException(status_code=500, detail="Yield prediction model not loaded")
    
    results = []
    
    for crop in RECOMMENDATION_CROPS:
        # Predict yield for this crop
        predicted_yield = predict_crop_yield(
            area=req.area,
            rainfall=req.rainfall,
            fertilizer=req.fertilizer,
            pesticide=req.pesticide,
            crop=crop,
            season=req.season,
            state=req.state
        )
        
        if predicted_yield is None or predicted_yield <= 0:
            continue
        
        # Get market price for this crop
        market_price = get_crop_market_price(crop, req.state)
        
        if market_price is None or market_price <= 0:
            continue
        
        # Calculate estimated profit
        # yield is in tons/hectare, price is per quintal
        # 1 ton = 10 quintals
        yield_quintals = predicted_yield * 10 * req.area
        estimated_profit = round(yield_quintals * market_price, 2)
        
        results.append({
            "crop": crop,
            "yield": round(predicted_yield, 2),
            "price": round(market_price, 2),
            "profit": estimated_profit,
            "yield_unit": "tons/hectare",
            "price_unit": "₹/quintal"
        })
    
    if not results:
        raise HTTPException(
            status_code=404, 
            detail="Could not generate recommendations. Please check your inputs and try again."
        )
    
    # Sort by profit descending
    results.sort(key=lambda x: x["profit"], reverse=True)
    
    # Get top recommendation
    top_crop = results[0]
    
    # Prepare response
    response = {
        "recommended_crop": top_crop["crop"],
        "predicted_yield": top_crop["yield"],
        "market_price": top_crop["price"],
        "estimated_profit": top_crop["profit"],
        "area": req.area,
        "state": req.state,
        "season": req.season,
        "top_crops": results[:5],  # Return top 5 crops
        "all_crops_analyzed": len(results)
    }
    
    # Save recommendation to MongoDB
    try:
        if col_crop_recommendations is not None:
            log = {
                "farmer_id": user.get("email"),
                "state": req.state,
                "input_features": {
                    "area": req.area,
                    "rainfall": req.rainfall,
                    "fertilizer": req.fertilizer,
                    "pesticide": req.pesticide,
                    "season": req.season
                },
                "recommended_crop": top_crop["crop"],
                "predicted_yield": top_crop["yield"],
                "market_price": top_crop["price"],
                "estimated_profit": top_crop["profit"],
                "all_recommendations": results[:5],
                "timestamp": datetime.utcnow()
            }
            col_crop_recommendations.insert_one(log)
            print(f"✅ [CropRecommend] Saved recommendation for {user.get('email')}: {top_crop['crop']}")
    except Exception as e:
        print(f"⚠️ Failed to log crop recommendation: {e}")
    
    return response


@app.get("/api/crop/recommendations/history")
def get_crop_recommendation_history(
    limit: int = 10,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get crop recommendation history for the logged-in user.
    """
    if col_crop_recommendations is None:
        return []
    
    try:
        cursor = col_crop_recommendations.find(
            {"farmer_id": user.get("email")}
        ).sort("timestamp", -1).limit(limit)
        
        history = []
        for doc in cursor:
            doc = dict(doc)
            doc["id"] = str(doc.pop("_id", ""))
            if doc.get("timestamp"):
                doc["timestamp"] = doc["timestamp"].isoformat()
            history.append(doc)
        
        return history
    except Exception as e:
        print(f"⚠️ Failed to fetch crop recommendation history: {e}")
        return []


# =====================================================
# ADMIN DASHBOARD ENDPOINTS
# =====================================================

@app.get("/api/admin/stats")
def get_admin_stats(admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get aggregated statistics for the admin dashboard.
    Returns counts for farmers, recommendations, soil analyses, yield predictions, articles, and contacts.
    """
    stats = {
        "total_farmers": 0,
        "total_recommendations": 0,
        "total_soil_analyses": 0,
        "total_yield_predictions": 0,
        "total_articles": 0,
        "total_contacts": 0
    }
    
    try:
        if col_users is not None:
            stats["total_farmers"] = col_users.count_documents({})
        if col_recs is not None:
            stats["total_recommendations"] = col_recs.count_documents({})
        if col_soil_analysis is not None:
            stats["total_soil_analyses"] = col_soil_analysis.count_documents({})
        if col_yield_predictions is not None:
            stats["total_yield_predictions"] = col_yield_predictions.count_documents({})
        if col_articles is not None:
            stats["total_articles"] = col_articles.count_documents({})
        if col_contacts is not None:
            stats["total_contacts"] = col_contacts.count_documents({})
    except Exception as e:
        print(f"⚠️ Error fetching admin stats: {e}")
    
    return stats


@app.get("/api/admin/farmers")
def get_admin_farmers(skip: int = 0, limit: int = 50, search: Optional[str] = None, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get list of all registered farmers for admin dashboard.
    """
    farmers = []
    
    if col_users is None:
        return {"farmers": [], "total": 0}
    
    try:
        query = {}
        if search:
            query = {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}}
                ]
            }
        
        total = col_users.count_documents(query)
        cursor = col_users.find(query).skip(skip).limit(limit).sort("created_at", -1)
        
        for doc in cursor:
            location = doc.get("location", {})
            if isinstance(location, str):
                location = {"state": location, "district": ""}
            
            farmers.append({
                "id": str(doc.get("_id", "")),
                "name": doc.get("name", ""),
                "email": doc.get("email", ""),
                "phone": doc.get("phone", ""),
                "location": location,
                "joined_date": doc.get("created_at", "").isoformat() if doc.get("created_at") else ""
            })
        
        return {"farmers": farmers, "total": total}
    except Exception as e:
        print(f"⚠️ Error fetching farmers: {e}")
        return {"farmers": [], "total": 0}


@app.delete("/api/admin/farmers/{farmer_id}")
def delete_farmer(farmer_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Delete a farmer by ID.
    """
    if col_users is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    try:
        result = col_users.delete_one({"_id": ObjectId(farmer_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Farmer not found")
        return {"status": "deleted", "id": farmer_id}
    except Exception as e:
        print(f"⚠️ Error deleting farmer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/recommendations")
def get_admin_recommendations(skip: int = 0, limit: int = 50, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get all fertilizer recommendations for admin dashboard.
    """
    recommendations = []
    
    if col_recs is None:
        return {"recommendations": [], "total": 0}
    
    try:
        total = col_recs.count_documents({})
        cursor = col_recs.find({}).skip(skip).limit(limit).sort("created_at", -1)
        
        for doc in cursor:
            recommendations.append({
                "id": str(doc.get("_id", "")),
                "farmer_email": doc.get("user_email", doc.get("farmer_email", "")),
                "crop": doc.get("crop_type", doc.get("crop", "")),
                "soil_type": doc.get("soil_type", ""),
                "fertilizer": doc.get("fertilizer", doc.get("recommended_fertilizer", "")),
                "date": doc.get("created_at", doc.get("timestamp", ""))
            })
            # Convert datetime to string
            if recommendations[-1]["date"] and hasattr(recommendations[-1]["date"], "isoformat"):
                recommendations[-1]["date"] = recommendations[-1]["date"].isoformat()
        
        return {"recommendations": recommendations, "total": total}
    except Exception as e:
        print(f"⚠️ Error fetching recommendations: {e}")
        return {"recommendations": [], "total": 0}


@app.get("/api/admin/soil-health")
def get_admin_soil_health(skip: int = 0, limit: int = 50, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get all soil health reports for admin dashboard.
    """
    reports = []
    
    if col_soil_analysis is None:
        return {"reports": [], "total": 0}
    
    try:
        total = col_soil_analysis.count_documents({})
        cursor = col_soil_analysis.find({}).skip(skip).limit(limit).sort("created_at", -1)
        
        for doc in cursor:
            reports.append({
                "id": str(doc.get("_id", "")),
                "farmer_email": doc.get("user_email", ""),
                "score": doc.get("score", 0),
                "nitrogen": doc.get("N", 0),
                "phosphorus": doc.get("P", 0),
                "potassium": doc.get("K", 0),
                "ph": doc.get("pH", 0),
                "status": doc.get("status", {}),
                "date": doc.get("created_at", "")
            })
            if reports[-1]["date"] and hasattr(reports[-1]["date"], "isoformat"):
                reports[-1]["date"] = reports[-1]["date"].isoformat()
        
        return {"reports": reports, "total": total}
    except Exception as e:
        print(f"⚠️ Error fetching soil health reports: {e}")
        return {"reports": [], "total": 0}


@app.get("/api/admin/yield-predictions")
def get_admin_yield_predictions(skip: int = 0, limit: int = 50, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get all crop yield predictions for admin dashboard.
    """
    predictions = []
    
    if col_yield_predictions is None:
        return {"predictions": [], "total": 0}
    
    try:
        total = col_yield_predictions.count_documents({})
        cursor = col_yield_predictions.find({}).skip(skip).limit(limit).sort("created_at", -1)
        
        for doc in cursor:
            predictions.append({
                "id": str(doc.get("_id", "")),
                "farmer_email": doc.get("user_email", doc.get("farmer_email", "")),
                "crop": doc.get("Crop", doc.get("crop", "")),
                "predicted_yield": doc.get("predicted_yield", 0),
                "state": doc.get("State", doc.get("state", "")),
                "season": doc.get("Season", doc.get("season", "")),
                "area": doc.get("Area", doc.get("area", 0)),
                "date": doc.get("created_at", "")
            })
            if predictions[-1]["date"] and hasattr(predictions[-1]["date"], "isoformat"):
                predictions[-1]["date"] = predictions[-1]["date"].isoformat()
        
        return {"predictions": predictions, "total": total}
    except Exception as e:
        print(f"⚠️ Error fetching yield predictions: {e}")
        return {"predictions": [], "total": 0}


@app.get("/api/admin/market-prices")
def get_admin_market_prices(
    state: Optional[str] = None,
    commodity: Optional[str] = None,
    limit: int = 50,
    admin: Dict[str, Any] = Depends(require_admin)
):
    """
    Get market price data for admin dashboard.
    """
    # Use the existing market API function
    result = fetch_mandi_prices(
        commodity=commodity,
        state=state,
        limit=limit
    )
    
    if result.get("error"):
        return {"prices": [], "total": 0, "error": result["error"]}
    
    prices = []
    for record in result.get("records", []):
        prices.append({
            "commodity": record.get("commodity", ""),
            "state": record.get("state", ""),
            "market": record.get("market", ""),
            "district": record.get("district", ""),
            "min_price": float(record.get("min_price", 0) or 0),
            "max_price": float(record.get("max_price", 0) or 0),
            "modal_price": float(record.get("modal_price", 0) or 0),
            "arrival_date": record.get("arrival_date", "")
        })
    
    return {"prices": prices, "total": len(prices), "average_price": result.get("average_price", 0)}


@app.get("/api/admin/contacts")
def get_admin_contacts(skip: int = 0, limit: int = 50, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get all contact messages for admin dashboard.
    """
    contacts = []
    
    if col_contacts is None:
        return {"contacts": [], "total": 0}
    
    try:
        total = col_contacts.count_documents({})
        cursor = col_contacts.find({}).skip(skip).limit(limit).sort("ts", -1)
        
        for doc in cursor:
            contacts.append({
                "id": str(doc.get("_id", "")),
                "name": doc.get("name", ""),
                "mobile": doc.get("mobile", ""),
                "email": doc.get("email", ""),
                "message": doc.get("message", ""),
                "date": doc.get("ts", "")
            })
            if contacts[-1]["date"] and hasattr(contacts[-1]["date"], "isoformat"):
                contacts[-1]["date"] = contacts[-1]["date"].isoformat()
        
        return {"contacts": contacts, "total": total}
    except Exception as e:
        print(f"⚠️ Error fetching contacts: {e}")
        return {"contacts": [], "total": 0}


@app.get("/api/admin/charts/fertilizer-distribution")
def get_fertilizer_distribution(admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get fertilizer recommendation distribution for pie chart.
    """
    distribution = {}
    
    if col_recs is None:
        return {"labels": [], "data": []}
    
    try:
        pipeline = [
            {"$group": {"_id": "$fertilizer", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        results = list(col_recs.aggregate(pipeline))
        
        for item in results:
            if item["_id"]:
                distribution[item["_id"]] = item["count"]
        
        return {
            "labels": list(distribution.keys()),
            "data": list(distribution.values())
        }
    except Exception as e:
        print(f"⚠️ Error fetching fertilizer distribution: {e}")
        return {"labels": [], "data": []}


@app.get("/api/admin/charts/yield-trend")
def get_yield_trend(admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get yield prediction trend over time for line chart.
    """
    if col_yield_predictions is None:
        return {"labels": [], "data": []}
    
    try:
        # Get last 30 days of predictions
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": thirty_days_ago}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "avg_yield": {"$avg": "$predicted_yield"}
            }},
            {"$sort": {"_id": 1}}
        ]
        results = list(col_yield_predictions.aggregate(pipeline))
        
        labels = [r["_id"] for r in results]
        data = [round(r["avg_yield"], 2) for r in results]
        
        return {"labels": labels, "data": data}
    except Exception as e:
        print(f"⚠️ Error fetching yield trend: {e}")
        return {"labels": [], "data": []}


@app.get("/api/admin/charts/crop-popularity")
def get_crop_popularity(admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get most popular crops selected by farmers for bar chart.
    """
    if col_yield_predictions is None and col_recs is None:
        return {"labels": [], "data": []}
    
    try:
        popularity = {}
        
        # From yield predictions
        if col_yield_predictions is not None:
            pipeline = [
                {"$group": {"_id": "$Crop", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            for item in col_yield_predictions.aggregate(pipeline):
                if item["_id"]:
                    popularity[item["_id"]] = popularity.get(item["_id"], 0) + item["count"]
        
        # From recommendations
        if col_recs is not None:
            pipeline = [
                {"$group": {"_id": "$crop_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            for item in col_recs.aggregate(pipeline):
                if item["_id"]:
                    popularity[item["_id"]] = popularity.get(item["_id"], 0) + item["count"]
        
        # Sort by popularity
        sorted_items = sorted(popularity.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "labels": [item[0] for item in sorted_items],
            "data": [item[1] for item in sorted_items]
        }
    except Exception as e:
        print(f"⚠️ Error fetching crop popularity: {e}")
        return {"labels": [], "data": []}


@app.get("/api/admin/articles")
def get_admin_articles(skip: int = 0, limit: int = 50, admin: Dict[str, Any] = Depends(require_admin)):
    """
    Get all articles for admin dashboard.
    """
    articles = []
    
    if col_articles is None:
        return {"articles": [], "total": 0}
    
    try:
        total = col_articles.count_documents({})
        cursor = col_articles.find({}).skip(skip).limit(limit).sort("publishedAt", -1)
        
        for doc in cursor:
            articles.append({
                "id": str(doc.get("_id", "")),
                "title": doc.get("title", ""),
                "author": doc.get("author", "Admin"),
                "publishedAt": doc.get("publishedAt", ""),
                "excerpt": (doc.get("excerpt") or doc.get("description") or "")[:100]
            })
            if articles[-1]["publishedAt"] and hasattr(articles[-1]["publishedAt"], "isoformat"):
                articles[-1]["publishedAt"] = articles[-1]["publishedAt"].isoformat()
        
        return {"articles": articles, "total": total}
    except Exception as e:
        print(f"⚠️ Error fetching articles: {e}")
        return {"articles": [], "total": 0}
