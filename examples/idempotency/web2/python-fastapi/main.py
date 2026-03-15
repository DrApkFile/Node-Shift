from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Idempotency Pattern (FastAPI)")

# Mock Redis / Cache
idempotency_cache = {}

class OrderRequest(BaseModel):
    item_id: str
    amount: float

@app.post("/api/orders")
async def create_order(order: OrderRequest, idempotency_key: Optional[str] = Header(None)):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key missing")

    # 1. Lookup key
    if idempotency_key in idempotency_cache:
        print(f"Returning cached response for {idempotency_key}")
        return idempotency_cache[idempotency_key]

    # 2. Execute business logic
    print(f"Executing order for item {order.item_id}")
    result = {
        "order_id": 12345,
        "status": "processed",
        "processed_at": "now"
    }

    # 3. Cache result
    idempotency_cache[idempotency_key] = result
    
    return result
