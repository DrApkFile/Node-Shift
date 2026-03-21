# 🎮 Pattern Interaction Guide

Welcome to the **NodeShift Playground**. This guide explains how to interact with each on-chain pattern via our interactive web interface.

## 🛠️ Global Setup

Before interacting with any pattern, ensure you have completed these steps:

1. **Connect Wallet**: Click the **"Judge Access Portal"** button and connect your Solana wallet (ensure it is set to **Devnet**).
2. **Step 1: Get Gas (SOL)**: Click **"Request 1 SOL"** to fund your Devnet wallet if you don't have a balance.
3. **Step 2: Init Protocol**: Click the initialization button for the specific pattern (e.g., "Initialize Limiter", "Create Identity", etc.). This sets up the necessary Program Derived Addresses (PDAs) on-chain.

---

## 🧩 Interaction Instructions

### 1. Escrow Engine
*   **Maker Role**: Enter a token amount and a unique Escrow ID. Click **"Launch Vault"** to lock tokens in escrow.
*   **Taker Role**: Switch to the "Taker" tab. Click **"Finalize Atomic Swap"** to complete the trade.
*   **Cancel**: Makers can recover their funds by clicking **"Cancel"** before a taker swaps.

### 2. Rate Limiter
*   **Initialize**: Create your personal on-chain limiter state.
*   **Access Resource**: Click **"Access Resource (Spam Me)"**.
*   **The Test**: Try clicking quickly. After 2 requests, the on-chain logic will block further access for ~2 minutes.
*   **Reset**: Use the **"Reset"** button to clear your limiter state for testing.

### 3. RBAC (Role-Based Access Control)
*   **Initialize**: Select a role (**Viewer**, **Editor**, or **Admin**) and click **"Initialize Profile"**.
*   **Permission Gates**:
    *   **Editor Gate**: Only works for Editor and Admin roles.
    *   **Admin Gate**: Only works for the Admin role.
*   **Testing**: Try executing an "Admin Instruction" while having a "Viewer" role to see the on-chain rejection.

### 4. API Key Management
*   **Generate**: Create a new API key. The system hashes it and stores only the hash on-chain.
*   **Secret Key**: Copy the secret key shown in the green box (it's only shown once!).
*   **Revoke**: Click **"Revoke Key"** to invalidate the key on-chain without deleting the registry PDA.

### 5. Idempotency Key
*   **Action**: Click the **"Like"** button.
*   **Verification**: Check the **"On-Chain Activity"** terminal. Subsequent clicks with the same idempotency key (simulated) will be recognized as duplicates and won't trigger new state changes.

### 6. Subscription Billing
*   **Tier Selection**: Choose the **"Devnet Pro"** tier (60s access).
*   **Verify**: Once subscribed, the **"Protected Vault"** unlocks. Click **"On-Chain Verification"** to prove your subscription is active.
*   **Expiry**: Watch the countdown. Once it hits zero, the vault locks again.

### 7. On-Chain Job Queue
*   **Producer**: Enter a SOL bounty and a delay (e.g., 30s). Click **"Schedule Job"**.
*   **Crank Hub**: Click **"Activate Keeper Bot"**.
*   **Automation**: Your browser will now act as a decentralized "Keeper," scanning for expired jobs and "cranking" them to earn the bounty automatically.

### 8. Leaderboard Ranking
*   **Broadcast**: Enter a score and click **"Broadcast Score"**.
*   **Ranking**: The top 10 players are sorted and stored on-chain. Your entry will be highlighted if you make the list!

### 9. Order Matching Engine
*   **Terminal**: Use the Buy/Sell toggle. Enter a price and quantity.
*   **Matching**: If your price crosses the spread, the order matches instantly (Atomic Match). Otherwise, it sits in the **Limit Order Book** visible on the left.

### 10. Auction Engine
*   **List**: As a seller, initialize an auction with a starting price.
*   **Bid**: Enter a bid higher than the current top bid. The highest bidder and price are updated atomically on-chain.

### 11. Circuit Breaker
*   **Toggle**: Use the **"Toggle Pause"** button to open/close the circuit.
*   **Execute**: Try clicking **"Protected Action"**. It will fail if the circuit is "OPEN" (Paused), simulating an emergency stop.

### 12. Leader Election
*   **Epochs**: Watch the **"Epoch End"** timer.
*   **Resolve**: Once the epoch ends, anyone can click **"Resolve Election"** to trigger the on-chain logic that reassigns authority based on candidate state.
