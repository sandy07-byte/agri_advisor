import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any


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
except Exception:
    MongoClient = None
    class PyMongoError(Exception):
        ...

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

try:
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    import hashlib
    class _PwdFallback:
        def hash(self, password: str) -> str:
            return hashlib.sha256(password.encode("utf-8")).hexdigest()
        def verify(self, password: str, hashed: str) -> bool:
            return self.hash(password) == hashed
    pwd_ctx = _PwdFallback()

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
app = FastAPI(
    title="AgriAdvisor API",
    description="Fertilizer Recommendation Platform",
    version="1.0",
    swagger_ui_parameters={"persistAuthorization": True},
)


# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- MongoDB setup ---
# MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017")
# MONGO_DB = os.environ.get("MONGO_DB", "fertilizer_project")
MONGO_URI = os.environ.get(
    "MONGO_URI",
    # "mongodb+srv://agriadviser:sandy%400711@cluster1.19u4pk4.mongodb.net/?appName=Cluster1"
    "mongodb+srv://agriadviser:7989sandy@cluster1.19u4pk4.mongodb.net/fertilizer_project?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"

)
MONGO_DB = os.environ.get("MONGO_DB", "fertilizer_project")



if MongoClient is not None:
    try:
        print("🔌 Connecting to MongoDB:", MONGO_URI)
        _mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        _mongo.server_info()  # force connection test
        db = _mongo[MONGO_DB]
        col_users = db["users"]
        col_recs = db["recommendations"]
        col_articles = db["articles"]
        col_techniques = db["techniques"]
        col_prices = db["prices"]
        col_contacts = db["contacts"]
        print("✅ MongoDB connected successfully!")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)
        _mongo = None
        db = None
        col_users = col_recs = col_articles = col_techniques = col_prices = col_contacts = None
else:
    print("⚠️ PyMongo not available.")
    _mongo = None
    db = None
    col_users = col_recs = col_articles = col_techniques = col_prices = col_contacts = None

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
                user = {
                    "name": doc.get("name"),
                    "email": doc.get("email"),
                    "phone": doc.get("phone"),
                    "location": doc.get("location"),
                }
                USERS[email] = user
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")




# --- In-memory fallback stores ---
USERS: Dict[str, Dict[str, Any]] = {}
RECS_BY_USER: Dict[str, List[Dict[str, Any]]] = {}

# --- Schemas ---
class RegisterReq(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    location: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"

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
def home():
    return {"message": "Fertilizer Recommendation API is running", "mongo": bool(_mongo)}

@app.post("/api/auth/register", response_model=TokenResp)
def register(req: RegisterReq):
    email = req.email.lower()
    if email in USERS or (col_users is not None and col_users.find_one({"email": email})):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": req.name,
        "email": email,
        "password_hash": pwd_ctx.hash(req.password),
        "phone": req.phone,
        "location": req.location,
        "created_at": datetime.utcnow(),
    }

    USERS[email] = user_doc
    stored = "memory"
    ins_id = None

    try:
        if col_users is not None:
            print("👉 Attempting DB insert into 'users' collection...")
            res = col_users.insert_one(user_doc)
            print("✅ Insert result:", res.acknowledged, res.inserted_id)
            if getattr(res, "acknowledged", False):
                stored = "db"
                ins_id = str(res.inserted_id)
    except Exception as e:
        print("❌ DB insert failed:", e)

    token = create_access_token(email)
    return {"access_token": token, "token_type": "bearer", "_stored": stored, "_id": ins_id}

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
    email = req.email.lower()
    user = USERS.get(email)

    # Try to fetch from MongoDB if not in memory
    if not user and col_users is not None:
        doc = col_users.find_one({"email": email})
        if doc:
            user = {
                "name": doc.get("name"),
                "email": doc.get("email"),
                "password_hash": doc.get("password_hash"),
                "phone": doc.get("phone"),
                "location": doc.get("location"),
            }
            USERS[email] = user

    # If user still not found, raise error
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Verify password (SHA256 hash in your case)
    hashed_input = hashlib.sha256(req.password.encode()).hexdigest()
    if hashed_input != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Return token
    return {"access_token": create_access_token(email), "token_type": "bearer"}

from fastapi import Depends
@app.get("/api/me")
def me(user=Depends(get_current_user)):
    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "location": user.get("location"),
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

# @app.post("/api/recommend/", response_model=RecommendResp)
# def recommend(req: RecommendReq, user=Depends(get_current_user)):
@app.post("/api/recommend/", response_model=RecommendResp)
def recommend(req: RecommendReq = None):

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

    # Persist recommendation (best effort)
    # rec = {"ts": datetime.utcnow(), "user_email": user["email"], "input": req.dict(), "output": details}
    rec = {
    "ts": datetime.utcnow(),
    "user_email": "sandeep.damera05@gmail.com",  # 👈 replace with your actual email
    "input": req.dict(),
    "output": details
}

    try:
        if col_recs is not None:
            col_recs.insert_one(rec)
    except Exception:
        pass

    return {"fertilizer": fertilizer, "details": details}

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
        return doc
    except Exception as e:
        print("❌ create_technique failed:", e)
        raise HTTPException(status_code=500, detail="Insert failed")
