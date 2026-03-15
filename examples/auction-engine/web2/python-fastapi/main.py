from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Auction Engine (FastAPI)")

class Auction(BaseModel):
    item_id: str
    seller: str
    highest_bid: float
    highest_bidder: Optional[str] = None
    is_active: bool = True

class Bid(BaseModel):
    bidder: str
    amount: float

# In-memory DB
auctions_db = {}

@app.post("/api/auctions")
def create_auction(auction: Auction):
    if auction.item_id in auctions_db:
        raise HTTPException(status_code=400, detail="Auction for this item already exists")
    auctions_db[auction.item_id] = auction
    return {"message": "Auction created", "auction": auction}

@app.post("/api/auctions/{item_id}/bid")
def place_bid(item_id: str, bid: Bid):
    if item_id not in auctions_db:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    auction = auctions_db[item_id]
    if not auction.is_active:
        raise HTTPException(status_code=400, detail="Auction is closed")
        
    if bid.amount <= auction.highest_bid:
        raise HTTPException(status_code=400, detail=f"Bid must be higher than {auction.highest_bid}")
    
    auction.highest_bid = bid.amount
    auction.highest_bidder = bid.bidder
    return {"message": "Bid accepted", "highest_bid": auction.highest_bid}

@app.get("/api/auctions/{item_id}")
def get_auction(item_id: str):
    if item_id not in auctions_db:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auctions_db[item_id]
