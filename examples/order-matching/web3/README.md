# Order Matching Engine — Web3 Implementation

> **Pattern:** Order Matching | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

A Web2 order matching engine (like a traditional exchange) maintains an in-memory or database-backed order book. A central matching algorithm pairs buy and sell orders atomically. The exchange controls the matching logic and custody of assets — users must trust the platform.

```
Buyer submits $100 BID → [Exchange Order Book] → matches with Seller's $100 ASK
                              ↑ centralized, trusted intermediary
```

**Key Web2 components:**
- In-memory sorted structures (e.g., Red-Black Trees) for fast O(log n) order insertion.
- A matching engine running in a high-performance server loop.
- Centralized custody of funds (exchange holds your assets until withdrawal).

---

## How This Works on Solana

On Solana, every order is a PDA created by the user, holding the trade terms and (optionally) locked collateral. The order book is the set of on-chain accounts. Matching is triggered by any participant calling the `match_order` instruction, verified by the program's logic.

```
Buyer ──place_bid──▶ Program ──creates──▶ BidOrder PDA (price, amount, buyer)
Seller ──place_ask──▶ Program ──creates──▶ AskOrder PDA (price, amount, seller)

Matcher ──match_order──▶ Program:
  1. Verify bid.price >= ask.price
  2. Atomically transfer assets (CPI to Token Program)
  3. Close both order PDAs
```

The user never loses custody — funds stay in their wallet or a personal vault PDA until a matching trade executes and settles atomically.

---

## Key On-Chain Mechanics

- **`place_order`**: Creates an `OrderState` PDA seeded by `[b"order", user.key(), order_id]`. Stores side (Buy/Sell), price, and amount.
- **`cancel_order`**: Closes the `OrderState` PDA, returning rent to the user. Equivalent to cancelling a limit order.
- **`match_order`**: The core instruction. Takes a bid PDA and an ask PDA as accounts. Verifies the price criteria, executes the asset swap via CPI, and closes both accounts.

---

## Architecture Diagram

```
Buyer  ──place_bid──▶ Program ──init──▶ BidOrder PDA
Seller ──place_ask──▶ Program ──init──▶ AskOrder PDA

(On-Chain Order Book = all active Order PDAs)

Any Caller ──match_order──▶ Program:
                │
                ├── verify bid.price >= ask.price
                ├── CPI: transfer tokens Buyer → Seller
                ├── CPI: transfer tokens Seller → Buyer
                └── Close BidOrder + AskOrder PDAs
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Custody** | Exchange holds assets ("Not your keys, not your coins") | Self-custody — funds never leave the user's control until settlement |
| **Matching Speed** | Microsecond matching in-memory | Millisecond block finalization; not suitable for HFT |
| **Order Book Depth** | Millions of orders in RAM | Each order is an on-chain account; gas costs rise with order volume |
| **Composability** | Siloed — can't atomically interact with other protocols | Open — any program can call `match_order` or read the order book |

**Key Constraints:**
- **CPI for Settlement**: Actual SPL token transfers require Cross-Program Invocations (CPIs) to the SPL Token Program. The code demonstrates the logic structure; production use requires token accounts.
- **Account Lookup Overhead**: Finding the best matching order requires off-chain indexing (e.g., Helius, Shyft) since there's no on-chain `ORDER BY` query.
- **Front-Running Risk**: Since orders are in the mempool before confirmation, validators could theoretically re-order transactions. MEV-resistant designs use commit-reveal schemes.

---

## On-Chain Verification

- **Program ID:** `8FLk4G1tDt8hWVAzVHu3NLQ3EQrx8PzWAk5V2eY9k213`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/8FLk4G1tDt8hWVAzVHu3NLQ3EQrx8PzWAk5V2eY9k213?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/order_matching_test.ts
```
