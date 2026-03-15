from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from enum import Enum

app = FastAPI(title="Escrow Engine (FastAPI)")

class EscrowStatus(str, Enum):
    PENDING = "PENDING"
    RELEASED = "RELEASED"
    REFUNDED = "REFUNDED"

class Escrow(BaseModel):
    buyer: str
    seller: str
    amount: float
    status: EscrowStatus = EscrowStatus.PENDING

# Mock DB
escrows_db = {}

class InitEscrowRequest(BaseModel):
    transaction_id: str
    buyer: str
    seller: str
    amount: float

@app.post("/api/escrow/init", status_code=201)
def init_escrow(req: InitEscrowRequest):
    if req.transaction_id in escrows_db:
        raise HTTPException(status_code=400, detail="Transaction already exists")
    
    escrow = Escrow(buyer=req.buyer, seller=req.seller, amount=req.amount)
    escrows_db[req.transaction_id] = escrow
    return {"message": "Escrow initiated", "id": req.transaction_id}

@app.post("/api/escrow/{id}/release")
def release_funds(id: str, actor: str):
    if id not in escrows_db:
        raise HTTPException(status_code=404, detail="Escrow not found")
        
    escrow = escrows_db[id]
    if escrow.status != EscrowStatus.PENDING:
        raise HTTPException(status_code=400, detail="Escrow already finalized")
    
    if actor != escrow.buyer:
        raise HTTPException(status_code=403, detail="Only buyer can release")
        
    escrow.status = EscrowStatus.RELEASED
    return {"status": "RELEASED", "message": f"Transferring {escrow.amount} to {escrow.seller}"}

@app.get("/api/escrow/{id}")
def get_escrow(id: str):
    if id not in escrows_db:
        raise HTTPException(status_code=404, detail="Escrow not found")
    return escrows_db[id]
