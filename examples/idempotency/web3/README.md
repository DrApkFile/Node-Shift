# Idempotency Key — Web3 Implementation

> **Pattern:** Idempotency | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

In Web2, idempotency is handled using a unique `Idempotency-Key` HTTP header. The server stores this key in Redis with a TTL after processing the request. Retries with the same key return the cached result without re-executing the logic.

```javascript
// Web2: Check Redis cache
const existing = await redis.get(idempotencyKey);
if (existing) return res.json(JSON.parse(existing)); // Return cached result

// Process and cache
const result = await processOrder();
await redis.set(idempotencyKey, JSON.stringify(result), "EX", 3600);
```

**Key Web2 components:**
- A transient Redis key stores the result for 1 hour.
- The server middleware checks the key before executing the business logic.
- If Redis is down, the idempotency guarantee is lost (double-processing risk).

---

## How This Works on Solana

On Solana, idempotency is enforced at the **account level**. A client-generated 32-byte key is used as a seed for a PDA. The program's `init` constraint attempts to *create* this PDA when the instruction is called. Since an account can only be initialized once, any duplicate call with the same key will automatically fail before the instruction body executes.

```
First Call:
Client ──generate key [0xABC...]──▶ Program ──init PDA [nonce, user, key]──▶ SUCCESS
                                              Execute business logic

Retry/Duplicate Call (same key):
Client ──same key [0xABC...]──▶ Program ──init PDA [nonce, user, key]──▶ FAIL
                                           Account already exists → Transaction Reverted
```

The ledger *is* the cache. No external Redis dependency. The idempotency guarantee is cryptographically enforced by the entire Solana network.

---

## Key On-Chain Mechanics

- **`process_order`**: Takes `idempotency_key: [u8; 32]`. Uses Anchor's `init` with `seeds = [b"nonce", user.key(), &idempotency_key]`. On first call, the PDA is created and `nonce.used = true` is set. On any subsequent call with the same key and user, the `init` fails with `AccountAlreadyInitialized`.
- **`NonceState`**: A minimal struct storing `used: bool` (1 byte + 8 byte discriminator = 9 bytes). The entire account serves as a "seen flag".
- **Key Generation**: The client must generate a unique 32-byte key for each *intended operation*. Typically produced via `crypto.randomBytes(32)` or by hashing request parameters.

---

## Architecture Diagram

```
Client generates unique 32-byte key per operation:
  key = crypto.randomBytes(32)

First call:
  Client ──process_order(key)──▶ Program:
    PDA seeds: [b"nonce", user.key(), key]
    ├── PDA does not exist → init PDA → execute order logic ✅
    └── (on success, PDA now exists permanently)

Any retry:
  Client ──process_order(key)──▶ Program:
    PDA seeds: [b"nonce", user.key(), key]
    └── PDA already exists → init fails → transaction reverts ❌
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Reliability** | Redis can fail, breaking the idempotency guarantee | Protocol-level guarantee — the ledger itself is the source of truth |
| **Storage Lifespan** | Auto-expired by TTL (usually 1-24h) | Persists forever; requires a `close` instruction to reclaim rent |
| **Overhead** | Single Redis `GET` check (sub-ms) | PDA initialization (~5,000 CU) + ~0.001 SOL rent per operation |
| **Auditability** | Server logs (mutable) | Immutable on-chain record of every processed operation |

**Key Constraints:**
- **Nonce PDAs Never Expire**: Unlike Redis keys with TTL, these PDAs live forever unless closed. Build a `close_nonce` instruction to let users reclaim rent after a safe period (e.g., 30 days). This prevents state bloat.
- **32-Byte Key Responsibility**: The client *must* generate a cryptographically unique key. Using a weak or sequential key (like `1`, `2`, `3`) creates a collision risk or makes it easy to block future operations by griefing.
- **User + Key Binding**: The PDA is seeded with both `user.key()` and `idempotency_key`. This means the same key can be used by *different users* without collision, which is the correct behavior.

---

## On-Chain Verification

- **Program ID:** `DzBV9RhbE5WCNscwPBSwYrCEWFxDRMSkM5oWYKktMonr`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/DzBV9RhbE5WCNscwPBSwYrCEWFxDRMSkM5oWYKktMonr?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/idempotency_test.ts
```
