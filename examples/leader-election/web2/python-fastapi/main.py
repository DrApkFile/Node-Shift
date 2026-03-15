from fastapi import FastAPI, HTTPException
import time
from pydantic import BaseModel

app = FastAPI(title="Leader Election Pattern (FastAPI)")

# Mock DB
leader_info = {
    "leader_id": None,
    "expires_at": 0
}

LEASE_TIME = 10.0

class ClaimRequest(BaseModel):
    candidate_id: str

@app.post("/api/leader/claim")
def claim_leadership(req: ClaimRequest):
    global leader_info
    now = time.time()

    # Is it free or expired?
    if not leader_info["leader_id"] or now > leader_info["expires_at"]:
        leader_info = {
            "leader_id": req.candidate_id,
            "expires_at": now + LEASE_TIME
        }
        return {"status": "ELECTED", "leader": leader_info}

    # Is it the same leader renewing?
    if leader_info["leader_id"] == req.candidate_id:
        leader_info["expires_at"] = now + LEASE_TIME
        return {"status": "RENEWED", "leader": leader_info}

    return {"status": "DENIED", "current_leader": leader_info["leader_id"]}

@app.get("/api/leader")
def get_leader():
    return leader_info
