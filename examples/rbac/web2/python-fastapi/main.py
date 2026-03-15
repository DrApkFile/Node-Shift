from fastapi import FastAPI, Header, HTTPException, Depends
from typing import Optional

app = FastAPI(title="RBAC Pattern (FastAPI)")

# Mock roles
USER_ROLES = {
    "alice": "admin",
    "bob": "editor",
    "charlie": "viewer"
}

def get_current_role(x_username: str = Header(...)):
    if x_username not in USER_ROLES:
        raise HTTPException(status_code=401, detail="User not found")
    return USER_ROLES[x_username]

def require_role(allowed_roles: list):
    def role_checker(role: str = Depends(get_current_role)):
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return role
    return role_checker

@app.get("/api/admin", dependencies=[Depends(require_role(["admin"]))])
def admin_only():
    return {"msg": "Hello Admin"}

@app.get("/api/read", dependencies=[Depends(require_role(["admin", "editor", "viewer"]))])
def read_all():
    return {"msg": "Data for everyone"}
