from fastapi import FastAPI, HTTPException
import time
import random
from pydantic import BaseModel

app = FastAPI(title="Circuit Breaker (FastAPI)")

class BreakerStatus(BaseModel):
    state: str
    failure_count: int
    last_failure_time: float = 0

# Configuration
THRESHOLD = 3
TIMEOUT = 10.0

# Global State
breaker = BreakerStatus(state="CLOSED", failure_count=0)

def simulate_remote_call():
    if random.random() > 0.5:
        return "Service Result"
    raise Exception("Downstream Failure")

@app.get("/api/call")
def call_service():
    global breaker
    now = time.time()

    # State transition: OPEN -> HALF_OPEN
    if breaker.state == "OPEN" and (now - breaker.last_failure_time > TIMEOUT):
        breaker.state = "HALF_OPEN"

    # Block if OPEN
    if breaker.state == "OPEN":
        raise HTTPException(
            status_code=503, 
            detail="Circuit is OPEN. Preventing further load."
        )

    try:
        result = simulate_remote_call()
        # Reset on success
        breaker.state = "CLOSED"
        breaker.failure_count = 0
        return {"status": "success", "result": result}
    except Exception as e:
        breaker.failure_count += 1
        breaker.last_failure_time = now
        
        if breaker.state == "HALF_OPEN" or breaker.failure_count >= THRESHOLD:
            breaker.state = "OPEN"
            
        return {
            "status": "fail", 
            "error": str(e), 
            "circuit_state": breaker.state
        }

@app.get("/api/status")
def get_status():
    return breaker
