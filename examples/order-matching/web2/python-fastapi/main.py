from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Order Matching Engine (FastAPI)")

class Order(BaseModel):
    trader: str
    side: str  # "BUY" or "SELL"
    price: float
    quantity: int

order_book = {"bids": [], "asks": []}

@app.post("/api/orders")
def place_order(order: Order):
    global order_book
    remaining = order.quantity
    
    if order.side == "BUY":
        # Match with asks (lowest price first)
        while order_book["asks"] and remaining > 0:
            best_ask = order_book["asks"][0]
            if order.price >= best_ask["price"]:
                match_qty = min(remaining, best_ask["quantity"])
                remaining -= match_qty
                best_ask["quantity"] -= match_qty
                if best_ask["quantity"] == 0:
                    order_book["asks"].pop(0)
            else:
                break
        
        if remaining > 0:
            order_book["bids"].append({"trader": order.trader, "price": order.price, "quantity": remaining})
            order_book["bids"].sort(key=lambda x: x["price"], reverse=True)
            
    else: # SELL
        while order_book["bids"] and remaining > 0:
            best_bid = order_book["bids"][0]
            if order.price <= best_bid["price"]:
                match_qty = min(remaining, best_bid["quantity"])
                remaining -= match_qty
                best_bid["quantity"] -= match_qty
                if best_bid["quantity"] == 0:
                    order_book["bids"].pop(0)
            else:
                break
        
        if remaining > 0:
            order_book["asks"].append({"trader": order.trader, "price": order.price, "quantity": remaining})
            order_book["asks"].sort(key=lambda x: x["price"])

    return {"status": "processed", "order_book": order_book}
