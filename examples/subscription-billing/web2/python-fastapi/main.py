from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Dict

app = FastAPI(title="Subscription Billing (FastAPI)")

class Subscription(BaseModel):
    user_id: str
    plan_weeks: int

# Mock DB: user_id -> {expiry, status}
subs_db: Dict[str, dict] = {}

@app.post("/api/subscribe")
def subscribe(sub_req: Subscription):
    expiry = datetime.now() + timedelta(weeks=sub_req.plan_weeks)
    subs_db[sub_req.user_id] = {
        "expiry": expiry,
        "status": "ACTIVE"
    }
    return {"message": "Subscription started", "expiry": expiry}

@app.get("/api/status/{user_id}")
def get_status(user_id: str):
    sub = subs_db.get(user_id)
    if not sub:
        return {"status": "INACTIVE"}
    
    if datetime.now() > sub["expiry"]:
        sub["status"] = "EXPIRED"
        return {"status": "EXPIRED", "expiry": sub["expiry"]}
    
    return {"status": "ACTIVE", "expiry": sub["expiry"]}
