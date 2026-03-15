from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Onchain Job Queue (FastAPI)")

class Job(BaseModel):
    id: int
    task: str
    bounty: float
    status: str = "PENDING"
    worker: Optional[str] = None

jobs_db = []
counter = 0

@app.post("/api/jobs")
def create_job(task: str, bounty: float):
    global counter
    counter += 1
    job = Job(id=counter, task=task, bounty=bounty)
    jobs_db.append(job)
    return {"id": job.id}

@app.post("/api/jobs/{job_id}/claim")
def claim_job(job_id: int, worker: str):
    job = next((j for j in jobs_db if j.id == job_id), None)
    if not job or job.status != "PENDING":
        raise HTTPException(status_code=400, detail="Job unavailable")
    job.status = "CLAIMED"
    job.worker = worker
    return job

@app.post("/api/jobs/{job_id}/complete")
def complete_job(job_id: int):
    job = next((j for j in jobs_db if j.id == job_id), None)
    if not job or job.status != "CLAIMED":
        raise HTTPException(status_code=400, detail="Invalid job state")
    job.status = "COMPLETED"
    return {"status": "SUCCESS", "paid": job.bounty}
