# Leader Election — Web3 Implementation

> **Pattern:** Leader Election | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

In distributed systems, leader election algorithms (Raft, Paxos, ZooKeeper) ensure exactly one node acts as the authoritative coordinator at any time. If the leader fails, a new one is elected from the healthy nodes through gossip and consensus protocols.

```
Nodes gossip → Quorum votes → Leader elected for term
If leader fails → Timeout → New election begins
```

**Key Web2 components:**
- Low-latency gossip protocols between trusted server nodes.
- Automatic failover within milliseconds based on health checks.
- Internal cluster event — external users cannot observe or audit the election.

---

## How This Works on Solana

On Solana, "leader election" is a transparent, verifiable on-chain process. Participants **register as candidates**, then others **vote** using their governance power. After the epoch ends, anyone can call **resolve_election** to determine the winner — the candidate with the most accumulated votes — and the new leader's wallet address is recorded on-chain.

```
Nodes register as candidates in Electoral Pool PDA
Voters cast weighted votes during the epoch
After epoch_end: resolve_election() → selects top vote-getter → updates ElectionState PDA
```

This model is better suited for **role assignment** (oracles, DAO moderators, game referees) than for low-level infrastructure leader election.

---

## Key On-Chain Mechanics

### Core Logic (Pattern Implementation)

- **`initialize`** `[CORE]`: Creates the `ElectionState` PDA storing `active_leader`, `epoch_end`, and `epoch_duration`. Creates the `ElectoralPool` PDA with an empty candidate array.
- **`register_candidate`** `[CORE]`: Appends the signer's pubkey to `ElectoralPool.candidates`. Enforces no-duplicate check.
- **`vote`** `[CORE]`: Increments `candidates[index].votes` by the given `weight`. In a production system, `weight` would be derived from a staked token balance PDA — here it's an input for simulation purposes.
- **`resolve_election`** `[CORE]`: Checks `clock.unix_timestamp >= state.epoch_end`. Selects the `Candidate` with the highest `votes`. Updates `state.active_leader`. Resets all vote counts and sets the next epoch deadline.

### Simulation Helper (UI Support Only)

- **`seed_candidates`** `[UI HELPER]`: Takes a `Vec<Pubkey>` and bulk-inserts mock candidates into the pool. This instruction exists **only for the NodeShift demo UI**, simulating a multi-node network without requiring each node to self-register. **This would not be present in a real-world production deployment.**

---

## Architecture Diagram

```
Admin ──initialize──▶ Program ──creates──▶ ElectionState PDA + ElectoralPool PDA

(Registration Phase)
Node 1 ──register_candidate──▶ Program ──append──▶ ElectoralPool.candidates[]
Node 2 ──register_candidate──▶ Program ──append──▶ ElectoralPool.candidates[]

(OR: Demo UI uses seed_candidates to mock multiple nodes at once)

(Voting Phase)
Voter A ──vote(index=0, weight=100)──▶ Program ──update──▶ candidates[0].votes += 100
Voter B ──vote(index=1, weight=75)──▶  Program ──update──▶ candidates[1].votes += 75

(After epoch_end)
Anyone ──resolve_election──▶ Program:
  1. Verify clock >= epoch_end
  2. Find candidate with max votes
  3. Update ElectionState.active_leader = winner.pubkey
  4. Emit ElectionResolved event
  5. Reset all votes, set next epoch_end
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Transparency** | Internal cluster event; not auditable | Every vote and result is a public, signed transaction on the ledger |
| **Coordination Speed** | Millisecond failover via gossip protocols | Epoch-bound rotations; not suitable for sub-second infrastructure decisions |
| **Sybil Resistance** | Consensus protocols require trusted nodes | One vote per wallet; Sybil attacks require unique wallets funded with SOL |
| **Manipulation** | Leader can be chosen by cluster admin | Rules are immutable code; outcome determined purely by vote tallies |

**Key Constraints:**
- **`seed_candidates` is for Demo Only**: In production, remove this instruction. Every real node should call `register_candidate` with their own signed transaction.
- **Vote Weight Trust**: The current `vote` instruction accepts `weight` as user input. A real implementation must derive weight from a stake or reputation PDA — never trust client-provided weight.
- **Fixed Epoch Duration**: The `epoch_duration` is set at initialization. Changing it requires a governance vote to upgrade the program.
- **Electoral Pool Size**: The PDA is allocated for 10 candidates at initialization. Supporting more candidates requires account reallocation (Anchor's `realloc` feature).

---

## On-Chain Verification

- **Program ID:** `EC6dqnTdQFabKC4qzf5jzLhEDDLRZ2XyhzFYhTNF2cHQ`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/EC6dqnTdQFabKC4qzf5jzLhEDDLRZ2XyhzFYhTNF2cHQ?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/leader_election_test.ts
```
