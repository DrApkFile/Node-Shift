# Subscription Billing — Web3 Implementation

> **Pattern:** Subscription Billing | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

Subscription billing in Web2 centralizes recurring payment logic in a server-side process. A billing platform (Stripe, PayPal) stores payment credentials and charges the customer on a schedule. The user trusts the service not to overcharge.

```
User → Saves Card → [Stripe/PayPal] → Auto-charges monthly → Merchant
           ↑ central custody of payment credentials
```

**Key Web2 components:**
- Payment credentials stored server-side (tokenized, but still a trust relationship).
- A background process (cron job) triggers recurring charges.
- Merchants can charge any amount, at any time, until the user cancels.

---

## How This Works on Solana

On Solana, there's no way to *pull* funds from a user's wallet without their signature for each transaction. The "subscription" model shifts to a **permission-based pull model** using PDAs:

1. A `SubscriptionState` PDA records the subscription start time, duration, and price.
2. The subscriber calls `subscribe`, transferring SOL to a program vault.
3. The merchant calls `claim_payment` (or a keeper bot does) if conditions are met.
4. The subscriber calls `cancel` to stop renewal.

```
User ──subscribe──▶ Subscription Program ──creates──▶ SubscriptionState PDA
                           └─────transfers─────▶ Vault PDA (pre-funded)
Merchant ──claim──▶ Program ──checks expiry──▶ pulls from Vault
```

---

## Key On-Chain Mechanics

- **`subscribe`**: Initializes a PDA with `subscriber`, `merchant`, `start_time`, `duration`, and `amount`. SOL is deposited into a vault.
- **`claim_payment`**: Verifies `now >= start_time + duration`. The merchant or a keeper can call this after the billing cycle ends. Funds move from the vault to the merchant.
- **`cancel`**: Closes the subscription PDA and returns remaining vault funds to the subscriber.

The critical security constraint enforced by the program: **the merchant can never claim more than the agreed amount, and can never claim early.**

---

## Architecture Diagram

```
Subscriber ──subscribe──▶ Program ──init──▶ SubState PDA
                                   └─────▶ Vault PDA (holds SOL)

(after billing period)
Merchant / Keeper ──claim──▶ Program ──checks clock──▶ releases Vault SOL to Merchant

Subscriber ──cancel──▶ Program ──verifies active──▶ refunds Vault, closes PDA
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Pull vs Push** | Platform pulls funds automatically on schedule | User must initially push funds; keeper bots handle recurring pulls |
| **Overpayment Risk** | Possible if provider is malicious or has a bug | Impossible — program enforces exact authorized amount |
| **Privacy** | Credit card details stored by third party | Only public keys on-chain; no sensitive credential exposure |
| **Liveness** | Renewal is guaranteed if card is valid | Requires a "keeper" or crank bot to trigger `claim_payment` |

**Key Constraints:**
- **No Auto-Charge**: Solana transactions require a signer. Recurring billing needs a keeper bot incentivized to call `claim_payment`.
- **Vault Rent**: Each subscription account has a small rent (~0.002 SOL) that is returned on cancellation.
- **Clock Drift**: Minor variations in Solana's `Clock` sysvar vs wall-clock time are normal and should be designed around (e.g., generously rounded billing windows).

---

## On-Chain Verification

- **Program ID:** `Gss9uBbM1NdYCNfhLwqFMfJe7jJKkLx3JF6b8Xt5EBX`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/Gss9uBbM1NdYCNfhLwqFMfJe7jJKkLx3JF6b8Xt5EBX?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/subscription_test.ts
```
