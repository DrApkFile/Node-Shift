# Circuit Breaker — Web3 Implementation

> **Pattern:** Circuit Breaker | **Chain:** Solana Devnet | **Framework:** Anchor
> **Note:** This pattern is not yet deployed to Devnet. Program ID is a placeholder.

---

## How This Works in Web2

In Web2 microservices, a circuit breaker (popularized by Netflix Hystrix) prevents cascading failures. It monitors calls to a downstream service and "trips" the circuit (OPEN state) if enough calls fail, stopping outbound calls until the service recovers.

```
Calls → [Circuit Breaker] → Downstream Service
State: CLOSED (normal) → OPEN (failures too high) → HALF_OPEN (testing recovery)
```

**Key Web2 components:**
- An in-memory state machine (CLOSED/OPEN/HALF_OPEN) per service dependency.
- Automatic recovery and retry logic based on a timeout.
- Protects *callers from failed services* in a microservice architecture.

---

## How This Works on Solana

On Solana, the Circuit Breaker metaphor shifts from a *failure detection* pattern to a **governance-controlled killswitch**. A `GlobalConfig` PDA stores a single `is_paused: bool`. An admin (or DAO) can flip this flag. Every sensitive instruction in the program checks this flag before executing — if `is_paused == true`, all operations revert immediately.

```
Admin ──pause()──▶ Program ──sets──▶ GlobalConfig { is_paused: true }

User ──sensitive_operation──▶ Program:
  require!(!config.is_paused) → if paused: REVERT with ProgramPaused error
                               → if not paused: execute logic
```

This is the on-chain equivalent of an **emergency shutoff valve** — critical for DeFi protocol security during exploits or economic attacks.

---

## Key On-Chain Mechanics

- **`pause`** `[ADMIN]`: Admin calls this to set `config.is_paused = true`. Protected by `has_one = admin` constraint.
- **`resume`** `[ADMIN]`: Admin calls this to set `config.is_paused = false`. Same admin protection.
- **`sensitive_operation`** `[CORE]`: A gated instruction. Uses `require!(!ctx.accounts.config.is_paused, ErrorCode::ProgramPaused)`. Represents any business-critical instruction in the protocol.
- **`GlobalConfig` PDA**: Seeded with `[b"config"]`. Stores `admin: Pubkey` and `is_paused: bool`. Initialized once during program setup.

---

## Architecture Diagram

```
(Normal operation)
User ──any_instruction──▶ Program ──read config──▶ is_paused: false → Execute ✅

(Emergency detected)
Admin ──pause()──▶ Program ──update──▶ GlobalConfig { is_paused: true }

(While paused)
User ──any_instruction──▶ Program ──read config──▶ is_paused: true → REVERT ❌

(After fix is deployed)
Admin ──resume()──▶ Program ──update──▶ GlobalConfig { is_paused: false }
User ──any_instruction──▶ Program ──read config──▶ is_paused: false → Execute ✅
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Trigger** | Automated (failure count / timeout) | Manual (admin or DAO transaction) |
| **Reaction Time** | Milliseconds (in-process state machine) | Seconds (transaction finalization, ~4-12s) |
| **Transparency** | Internal; users have no visibility | Public transaction; anyone can see when it was paused and by whom |
| **Scope** | Per-service or per-dependency circuit | Program-wide paused state affecting all users and instructions |

**Key Constraints:**
- **Admin Centralization Risk**: The `admin` key is a single point of failure. Use a Squads multi-sig or a DAO governance program as the admin for production deployments.
- **Instruction Coverage**: Every sensitive instruction must *explicitly* pass and check the `GlobalConfig` account. Forgetting to gate one instruction creates an exploit vector — there's no automatic coverage.
- **Timelock Consideration**: For high-value protocols, a `resume` instruction with a time-lock (e.g., must wait 24 hours after `pause` before resuming) allows the community to react before funds flow again.

---

## On-Chain Verification

> This pattern is not yet deployed. Deployment is in progress.

- **Program ID:** `Stop11111111111111111111111111111111111111` *(placeholder)*
