# Auction Engine — Web3 Implementation

> **Pattern:** Auction Engine | **Chain:** Solana Devnet | **Framework:** Anchor
> **Note:** This pattern is not yet deployed to Devnet. Program ID is a placeholder.

---

## How This Works in Web2

Web2 auctions (eBay, Sotheby's online) rely on a centralized platform to record bids and enforce the time limit. A trusted server makes the final determination of the winner. Users must trust the platform not to manipulate bids or the timer.

```
Bidder A → $100 → [Platform Database] ← Bidder B → $150
                         ↑ central trust; platform can see all bids
Platform determines winner after deadline passes
```

**Key Web2 components:**
- A database storing current highest bid, bidder, and auction end time.
- Server-side timer and validation logic for bid acceptance.
- Platform controls fund custody and final settlement.

---

## How This Works on Solana

On Solana, an `AuctionState` PDA holds the current `highest_bid`, `highest_bidder`, `seller`, and `end_at` timestamp. Every bid is a verified on-chain transaction. The program atomically checks the bid amount and auction expiry against the network's consensus clock — not a server clock. Funds are held in a program-controlled vault.

```
Seller ──initialize_auction──▶ Program ──creates──▶ AuctionState PDA
                                                      { highest_bid: 0, end_at: ts }

Bidder A ──place_bid($100)──▶ Program:
  verify: clock < end_at   → still active
  verify: $100 > $0        → valid bid
  update: highest_bid = $100, highest_bidder = BidderA
  escrow: transfer $100 to Vault PDA, refund previous leader

(After end_at)
Finalize ──close_auction──▶ Program ──release Vault──▶ Seller
```

---

## Key On-Chain Mechanics

- **`initialize_auction`**: Seller creates an `AuctionState` PDA seeded with `[b"auction", item_id]`. Sets `seller`, `end_at`, and `highest_bid = 0`.
- **`place_bid`**: Verifies `clock.unix_timestamp < end_at` and `amount > highest_bid`. Updates state. In a production implementation, this also involves a CPI to the SPL Token Program to lock bidder funds in a Vault PDA and return outbid funds to the previous highest bidder.
- **`finalize_auction`**: Called after `end_at`. Transfers funds from vault to seller, closes the auction state PDA.

---

## Architecture Diagram

```
Seller ──initialize──▶ AuctionState PDA { end_at, highest_bid: 0 }

Bidder A ──place_bid($100)──▶ verify active + higher → AuctionState { highest_bid: $100 }
                               └── escrow $100 in Vault PDA

Bidder B ──place_bid($150)──▶ verify active + higher → AuctionState { highest_bid: $150 }
                               └── escrow $150, refund $100 to Bidder A

(clock > end_at)
Finalize ──▶ Release $150 from Vault to Seller
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Fairness** | Platform can see bids and manipulate timer | Code is the law; all rules enforced by the entire validator network |
| **Fund Safety** | Platform holds funds until payment clears | Funds held in program-controlled PDA; no humans have access |
| **Capital Efficiency** | "Bid now, pay later" — no upfront commitment | Committed bidding — funds locked the moment bid is placed |
| **Privacy** | Platform can see bidder identities privately | All bids and bidder wallets are public on the ledger |

**Key Constraints:**
- **No Hidden Bids**: All bids are public transactions. For sealed-bid auctions, use a commit-reveal scheme (hash the bid amount first, reveal after deadline).
- **Clock Sysvar Precision**: Solana's `unix_timestamp` can have minor variations (~1s). Build a small grace window around `end_at` to avoid edge-case disputes.
- **Refund Logic**: The outbid refund (returning previous highest bid) must be handled atomically in `place_bid`. If the refund CPI fails, the entire transaction reverts, protecting funds.

---

## On-Chain Verification

> This pattern is not yet deployed. Deployment is in progress.

- **Program ID:** `Auct11111111111111111111111111111111111111` *(placeholder)*
