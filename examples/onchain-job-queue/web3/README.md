# On-Chain Job Queue — Web3 Implementation

> **Pattern:** Job Queue | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

Web2 job queues (BullMQ, Celery, RQ) decouple producers (APIs) from background workers. A producer adds a job to a Redis/RabbitMQ queue, and a pool of workers picks up and processes jobs asynchronously.

```
API Server ──add_job──▶ [Redis Queue] ──pop──▶ Worker Process ──execute
                             ↑ message broker / scheduler
```

**Key Web2 components:**
- A message broker (Redis, RabbitMQ) stores pending work.
- Managed worker processes automatically pull and execute jobs.
- Retry logic, priority queues, and dead-letter queues handle failure scenarios.

---

## How This Works on Solana

Solana has no built-in scheduler. The blockchain stores job *state*, but executing the job requires an external actor — called a **Keeper** or **Crank** — to call the processing instruction when conditions are met.

```
"Producer" ──submit_job──▶ Program ──create──▶ JobState PDA
                                               (process_at timestamp, not completed)

(after due time)
Keeper Bot ──process_job──▶ Program ──verify due──▶ Execute logic, mark completed
```

The "queue" is the set of all `JobState` PDAs on-chain. The "worker" is a Keeper bot running off-chain that watches for due jobs and submits transactions to process them.

---

## Key On-Chain Mechanics

- **`submit_job`**: Creates a `JobState` PDA seeded with `[b"job", owner, process_at_bytes]`. Stores `owner`, `process_at` (scheduled Unix timestamp), and `is_completed = false`.
- **`process_job`**: The Keeper calls this. The program verifies `clock.unix_timestamp >= job.process_at` and `!job.is_completed`. Sets `is_completed = true` before executing business logic to prevent double-execution (idempotency).
- **Keeper Signature**: A `keeper: Signer` account is passed in. The keeper pays the transaction fee; a reward from the job account can reimburse them.

---

## Architecture Diagram

```
User / DApp ──submit_job──▶ Program ──init──▶ JobState PDA
                                              { process_at: future_ts, completed: false }

Off-Chain Keeper Bot:
  loop:
    fetch all JobState PDAs where !completed
    for each due job (process_at <= now):
      call process_job(job_pda)

Program ──verify──▶ { clock >= process_at AND !completed }
                ├── YES → Execute logic, set completed = true
                └── NO  → Revert (NotReady / AlreadyProcessed)
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Reliability** | Guaranteed by managed worker pool; automatic retries | Depends on Keeper availability; no built-in retry on L1 |
| **Complexity** | Queue + worker infra is externally managed (SaaS) | Requires building and incentivizing Keeper bots |
| **Auditability** | Worker logs; tampered by the operator | Every job submission and execution is on the immutable ledger |
| **Task Types** | Any computation — heavy ML, external APIs | Limited to on-chain verifiable state transitions (CU budget) |

**Key Constraints:**
- **Keeper Incentivization**: If there's no reward for processing a job, Keepers won't run. Include a small SOL tip in the `JobState` account transferred to the `keeper` on success.
- **Atomic Idempotency**: Setting `is_completed = true` *before* the business logic and storing it on-chain is critical. This is the Web3 equivalent of "acknowledge before processing."
- **No Complex Tasks**: A job cannot call external APIs or run heavy ML. It can only modify on-chain state or trigger CPI calls to other programs within the CU limit.

---

## On-Chain Verification

- **Program ID:** `7AgxB5wUW2tYksiWXW9pvmdiGCKRYSgL5sNcuXSm7Z5T`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/7AgxB5wUW2tYksiWXW9pvmdiGCKRYSgL5sNcuXSm7Z5T?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/job_queue_test.ts
```
