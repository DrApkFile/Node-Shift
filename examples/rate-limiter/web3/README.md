# Rate Limiter — Web3 Implementation

> **Pattern:** Rate Limiter | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

In Web2, rate limiting is typically a server-side concern. A Redis counter is incremented per user per time window. If the counter exceeds a threshold, the request is rejected with a `429 Too Many Requests` response.

```javascript
// Web2 Redis rate limiting
const count = await redis.incr(`rate:${ip}`);
if (count === 1) await redis.expire(`rate:${ip}`, 60); // 60s TTL
if (count > 5) return res.status(429).send("Too many requests");
```

**Key Web2 components:**
- A transient Redis counter with a TTL handles expiry automatically.
- The server enforces limits; the user cannot bypass the check.
- Counting happens in a fast in-memory store, adding sub-millisecond latency.

---

## How This Works on Solana

On Solana, there's no in-memory store and no TTL concept. Instead, the **timestamp of the last call** is stored in a per-wallet PDA. On each new call, the program checks whether enough time has elapsed. If the cooldown hasn't passed, the transaction reverts.

```
User Wallet ──call──▶ Rate Limiter Program ──derives──▶ ThrottleState PDA
                                                               │
                              Check: now - last_called_at >= 60s?
                                  ├── YES → Update PDA timestamp, execute logic
                                  └── NO  → Revert (TooFast error)
```

**Redis `EXPIRE` → Solana `Clock` sysvar**: Instead of automatic expiry, the Solana program reads `Clock::get()?.unix_timestamp` to determine if the window has passed. The PDA persists, but the embedded timestamp acts as the window marker.

---

## Key On-Chain Mechanics

- **`limited_call`**: The only instruction. It reads the `ThrottleState` PDA for the calling wallet. If `now - last_called_at < 60`, it reverts with `ErrorCode::TooFast`. Otherwise, it updates `last_called_at` and continues with the business logic.
- **PDA Seeds**: `[b"throttle", user.key()]` — Every wallet gets its own independent throttle account, isolated from all others.
- **`init_if_needed`**: The PDA is created on first call and reused on subsequent calls, avoiding a separate "register" step.

---

## Architecture Diagram

```
First Call:
User ──call──▶ Program ──init PDA──▶ ThrottleState { last_called_at: 0 }
                         ──pass──▶ Execute logic, set last_called_at = now

Within 60s:
User ──call──▶ Program ──read PDA──▶ now - last_called_at < 60 → REVERT

After 60s:
User ──call──▶ Program ──read PDA──▶ cooldown elapsed → Execute, update timestamp
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Expiry Mechanism** | Automatic TTL in Redis — zero maintenance | Manual timestamp check in program — deterministic but no auto-cleanup |
| **Granularity** | Request-count based (e.g., 5 req/min) | Time-based (cooldown since last call) — simpler but less flexible |
| **Cost** | Minimal (Redis is cheap) | One PDA (rent ~0.001 SOL) per user + tx fees per call |
| **Bypassability** | Can be bypassed with many IPs (Sybil) | Each unique wallet has its own PDA; Sybil requires new wallets with SOL |

**Key Constraints:**
- **Cooldown Model Only**: The on-chain model enforces a *minimum interval between calls*, not a *max count per window*. A "5 req/min" model would require a more complex counter + timestamp struct.
- **Clock Precision**: `unix_timestamp` in Solana has ~1-second precision. For sub-second rate limiting, this pattern is insufficient.
- **PDA Lifetime**: `ThrottleState` PDAs live forever unless explicitly closed. For global apps with millions of users, this creates long-term state bloat.

---

## On-Chain Verification

- **Program ID:** `J3cTELeaZPRUd1qGHrDW6mxi9Hyz3egMs9unqVQsxny6`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/J3cTELeaZPRUd1qGHrDW6mxi9Hyz3egMs9unqVQsxny6?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/rate_limiter_test.ts
```
