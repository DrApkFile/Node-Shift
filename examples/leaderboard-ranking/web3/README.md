# Leaderboard Ranking — Web3 Implementation

> **Pattern:** Leaderboard | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

Web2 leaderboards leverage Redis sorted sets (`ZADD`, `ZREVRANGE`) for O(log N) score updates and retrieval. Redis can handle millions of players with near-instant rank calculations.

```javascript
// Web2 Redis leaderboard
await redis.zadd("leaderboard", score, userId);
const top10 = await redis.zrevrange("leaderboard", 0, 9, "WITHSCORES");
```

**Key Web2 components:**
- Redis sorted sets maintain automatic ranking order.
- Private, server-controlled state — scores can be manipulated by the operator.
- Scales horizontally to millions of entries with minimal cost.

---

## How This Works on Solana

On Solana, a single `GlobalLeaderboard` PDA stores a **fixed-size array** of the top N scores. Each score submission reads the current state, applies an insertion-sort algorithm on-chain, and writes back the updated rankings. The entire leaderboard lives on the immutable public ledger.

```
Player ──submit_score──▶ Program ──reads──▶ GlobalLeaderboard PDA [10 entries]
                                  ──sorts──▶ inserts new score, truncates to top 10
                                  ──writes──▶ GlobalLeaderboard PDA [updated]
```

**Redis ZADD → Manual Sort**: There's no on-chain sorted data structure. Every update requires fetching the array, sorting it in the program's compute space, and writing it back. This is expensive and limits practical leaderboard size.

---

## Key On-Chain Mechanics

- **`submit_score`**: Takes a `score: u64` parameter. Reads the `GlobalLeaderboard` PDA's `entries` array (10 fixed slots), pushes the new `ScoreEntry { player: user.key(), value: score }`, sorts by descending score, and truncates to 10 entries before writing back.
- **`GlobalLeaderboard` PDA**: Seeded with `[b"leaderboard"]`. Fixed-size struct: `entries: [ScoreEntry; 10]`. Array size is determined at deploy time — resizing requires a program upgrade.
- **`ScoreEntry`**: A Borsh-serializable struct with `player: Pubkey` (32 bytes) and `value: u64` (8 bytes) = 40 bytes each, 400 bytes total for 10 entries.

---

## Architecture Diagram

```
Player 1 ──score 500──▶ Program ──sort──▶ Leaderboard PDA [500, ...]
Player 2 ──score 800──▶ Program ──sort──▶ Leaderboard PDA [800, 500, ...]
Player 3 ──score 200──▶ Program ──sort──▶ Leaderboard PDA [800, 500, 200]
Player 4 ──score 650──▶ Program ──sort──▶ Leaderboard PDA [800, 650, 500, 200]

Frontend ──reads──▶ Leaderboard PDA ──displays──▶ Top 10 rankings in UI
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Integrity** | Scores can be manipulated by the server | Every submission is a signed transaction; logic is immutable |
| **Performance** | O(log N) in Redis; millions of players | Fixed-size array with on-chain sort; practical limit ~100 entries |
| **Cost Per Update** | Negligible (Redis write) | ~5,000 CU per `submit_score` + compute for sort + tx fee |
| **Data Access** | Private API required | Anyone can read the public leaderboard PDA directly |

**Key Constraints:**
- **Fixed-Size Array Limit**: The account is allocated for exactly N entries at initialization. Changing N requires data migration or a program upgrade. Choose your limit carefully.
- **Compute Budget for Sorting**: Sorting a 10-element array is cheap, but a 100-entry sort may approach the default 200,000 CU limit. Use `SetComputeUnitLimit` for larger boards.
- **Concurrency Bottleneck**: All players write to the *same single PDA*. This creates a serialization bottleneck — only one transaction can modify it per block. Use sharded daily/weekly sub-leaderboards to distribute write pressure.

---

## On-Chain Verification

- **Program ID:** `GDXdtax9eoW2DSDQUkweFdEwyMq8foKRq3oo56hZUQM`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/GDXdtax9eoW2DSDQUkweFdEwyMq8foKRq3oo56hZUQM?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/leaderboard_test.ts
```
