# Escrow Engine — Web3 Implementation

> **Pattern:** Escrow Engine | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

In a typical Web2 escrow, a trusted intermediary (a bank, PayPal, or a third-party escrow service) holds funds until predefined conditions are met. Both parties must trust the middleman, who has the technical ability to release, refund, or even steal the assets at any time.

```
Buyer → [Bank/PayPal Escrow Account] → Seller
               ↑ central trust point
```

**Key Web2 components:**
- A central database records the agreement terms.
- A server-side process enforces release/refund conditions.
- A human or institution acts as the final arbiter in disputes.

---

## How This Works on Solana

On Solana, the escrow program *is* the middleman. Smart contract logic is deployed on-chain, publicly verifiable, and cannot be altered after deployment. Funds are held in a **Program Derived Address (PDA)** — an account whose private key is mathematically impossible to produce, ensuring only the program can move the funds.

```
Buyer → [Escrow PDA Vault] → Seller (on condition met)
           ↑ program-owned, no private key
```

**Key on-chain flow:**
1. **`initialize_escrow`**: Buyer creates an `EscrowState` PDA storing terms (amount, seller pubkey, deadline). SOL/tokens are transferred to a Vault PDA.
2. **`complete_escrow`** *(seller calls)*: Seller confirms delivery, releasing vault funds to themselves.
3. **`cancel_escrow`** *(buyer calls)*: Buyer cancels before completion, returning funds.

**The Vault PDA** is the critical insight. `seeds = [b"vault", escrow.key()]` with Anchor's `has_one` constraint means only the program—never a human—controls the release logic.

---

## Architecture Diagram

```
Buyer Wallet ──initialize──▶ Escrow Program ──creates──▶ EscrowState PDA
                                                               │
                                                         Vault PDA (holds SOL)
                                                               │
Seller Wallet ──complete──▶ Escrow Program ──verifies──▶ releases to Seller
Buyer Wallet  ──cancel───▶ Escrow Program ──verifies──▶ refunds to Buyer
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Counterparty Risk** | Trust in the intermediary platform | Zero — code enforces the rules |
| **Dispute Resolution** | Human arbitration, can take days | Automatic via on-chain conditions or a DAO vote |
| **Cost Model** | Platform fees (2-5%) | Rent for PDA creation (~0.002 SOL) + tx fees |
| **Programmability** | Server logic can change after the fact | Immutable after deployment — a feature and a limitation |

**Key Constraints:**
- **Rent for PDAs**: Each escrow and vault account requires a small SOL deposit (`rent-exempt` minimum). This is returned when the accounts are closed.
- **Compute Budget**: Complex conditional logic (e.g., oracles) must stay within the 200,000 CU default limit per transaction.
- **No Async**: All escrow conditions must be checkable inside a single, atomic transaction. External data requires an **Oracle** (e.g., Switchboard, Pyth).

---

## On-Chain Verification

- **Program ID:** `DE1YarAxPKStUwYAbgxd5XCVF2frxJYDsNuMtXAg6ZsH`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/DE1YarAxPKStUwYAbgxd5XCVF2frxJYDsNuMtXAg6ZsH?cluster=devnet)

---

## Running Locally

```bash
# From the anchor project root
anchor build
anchor deploy --provider.cluster devnet

# Run the TypeScript client test
ts-node client/escrow_test.ts
```
