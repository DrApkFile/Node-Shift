from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Leaderboard Ranking (FastAPI)")

# Mock DB: username -> score
scores_db = {}

class ScoreEntry(BaseModel):
    username: str
    score: int

@app.post("/api/scores")
def update_score(entry: ScoreEntry):
    current = scores_db.get(entry.username, 0)
    if entry.score > current:
        scores_db[entry.username] = entry.score
    return {"message": "Score updated", "new_high": scores_db[entry.username]}

@app.get("/api/leaderboard", response_model=List[ScoreEntry])
def get_leaderboard():
    # Sort and slice
    sorted_scores = sorted(scores_db.items(), key=lambda x: x[1], reverse=True)[:10]
    return [{"username": u, "score": s} for u, s in sorted_scores]
