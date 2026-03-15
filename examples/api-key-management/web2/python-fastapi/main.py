from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import secrets
import hashlib
from datetime import datetime

app = FastAPI(title="Web2 API Key Management (FastAPI)")
security = HTTPBearer()

# In-memory database
# Key: SHA256 Hash of API Key -> Value: Dict of metadata
api_keys_db = {}

class CreateKeyRequest(BaseModel):
    user_id: str
    plan: str = "basic"

def generate_key():
    return f"sk_test_{secrets.token_hex(24)}"

def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

@app.post("/api/keys", status_code=status.HTTP_201_CREATED)
def create_api_key(req: CreateKeyRequest):
    new_key = generate_key()
    key_hash = hash_key(new_key)
    
    api_keys_db[key_hash] = {
        "user_id": req.user_id,
        "plan": req.plan,
        "created_at": datetime.now().isoformat(),
        "is_active": True,
        "usage_count": 0
    }
    
    return {
        "message": "Store this key safely. It won't be displayed again.",
        "api_key": new_key
    }

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Dependency for authenticating routes"""
    provided_key = credentials.credentials
    key_hash = hash_key(provided_key)
    
    key_data = api_keys_db.get(key_hash)
    if not key_data or not key_data["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
        
    key_data["usage_count"] += 1
    return key_data

@app.get("/api/protected-data")
def get_protected_data(key_data: dict = Depends(verify_api_key)):
    return {
        "message": "Authentication successful",
        "user_info": {
            "user_id": key_data["user_id"],
            "plan": key_data["plan"]
        },
        "data": "Here is the sensitive payload."
    }

@app.post("/api/keys/revoke")
def revoke_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    provided_key = credentials.credentials
    key_hash = hash_key(provided_key)
    
    if key_hash in api_keys_db:
        api_keys_db[key_hash]["is_active"] = False
        return {"status": "Success", "message": "Key revoked."}
        
    raise HTTPException(status_code=404, detail="Key not found.")
