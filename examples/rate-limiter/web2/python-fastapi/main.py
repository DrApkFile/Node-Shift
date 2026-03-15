from fastapi import FastAPI, HTTPException, Request
import time

app = FastAPI(title="Rate Limiter Pattern (FastAPI)")

# Mock Redis: Key -> [expiry_timestamp, count]
rate_limit_db = {}

LIMIT = 5
WINDOW = 60  # seconds

@app.get("/api/resource")
async def get_resource(request: Request):
    client_ip = request.client.host
    now = time.time()

    if client_ip not in rate_limit_db:
        rate_limit_db[client_ip] = {"start": now, "count": 1}
        return {"message": "Success"}

    limit_info = rate_limit_db[client_ip]

    # Reset if window passed
    if now - limit_info["start"] > WINDOW:
        limit_info["start"] = now
        limit_info["count"] = 1
        return {"message": "Success"}

    # Increment
    limit_info["count"] += 1
    if limit_info["count"] > LIMIT:
        wait_time = int(WINDOW - (now - limit_info["start"]))
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Wait {wait_time} seconds."
        )

    return {"message": "Success"}
