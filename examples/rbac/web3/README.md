# Role-Based Access Control (RBAC) — Web3 Implementation

> **Pattern:** RBAC | **Chain:** Solana Devnet | **Framework:** Anchor

---

## How This Works in Web2

In Web2, RBAC is typically implemented with a database table mapping users to roles (Admin, Editor, Viewer), and server-side middleware that checks the role before executing any protected logic.

```javascript
// Typical Web2 middleware pattern
function checkRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
app.post("/admin-action", checkRole("ADMIN"), adminController);
```

**Key Web2 components:**
- A `users` table in a database with a `role` column.
- Middleware or decorator patterns that gate routes.
- A session or JWT that carries the user's claimed role (requires server trust).

---

## How This Works on Solana

On Solana, there's no session or JWT. Instead, authorization is embedded directly in the **account constraints** of each instruction. A `UserProfile` PDA holds the user's assigned role on-chain. When a gated instruction is called, Anchor's `#[account(constraint = ...)]` macro verifies the role *before the instruction body even runs*.

```
User Wallet ──sign──▶ Admin-Only Instruction ──derives──▶ UserProfile PDA
                                                                │
                               constraint: user_profile.role == UserRole::Admin
                                                                │
                              ✅ Match: Execute | ❌ No Match: Revert
```

**This is the key conceptual shift**: role checks are not if-statements in your function body; they are declarative constraints on the accounts passed into the transaction.

---

## Key On-Chain Mechanics

- **`initialize_user_role`**: Creates a `UserProfile` PDA (seeded by the user's wallet) storing their `role` (Viewer=0, Editor=1, Admin=2). This is the on-chain "assignment" of a role.
- **`admin_only_instruction`**: Requires a `UserProfile` account with `constraint = user_profile.role == UserRole::Admin`. Invalid role = transaction fails before execution.
- **`editor_instruction`**: Uses `constraint = (user_profile.role == UserRole::Admin || user_profile.role == UserRole::Editor)`, demonstrating hierarchical role checking.
- **`close_profile`**: Closes and reclaims rent from the `UserProfile` PDA — equivalent to "deleting" a user account.

---

## Architecture Diagram

```
Admin Wallet ──initialize──▶ RBAC Program ──creates──▶ UserProfile PDA (role: Admin)
User Wallet  ──initialize──▶ RBAC Program ──creates──▶ UserProfile PDA (role: Viewer)

User ──calls admin_only──▶ Program ──derives UserProfile PDA──▶
                                constraint check: role == Admin?
                                  ├── YES → Execute instruction
                                  └── NO  → Transaction reverts (Unauthorized)
```

---

## Tradeoffs & Constraints

| Aspect | Web2 | Solana |
|--------|------|--------|
| **Role Storage** | Database row, editable by any DB admin | PDA on-chain, editable only by the program's authorized admin |
| **Enforcement** | Middleware that can be bypassed if misconfigured | Enforced at the VM level by account constraints — not bypassable |
| **Role Assignment** | Admin panel or DB script | An on-chain transaction signed by the designated admin wallet |
| **Auditability** | Role changes in server logs (can be altered) | Every role change is an immutable transaction on the ledger |

**Key Constraints:**
- **Self-Assignment Risk**: Without an admin check on `initialize_user_role`, any user could assign themselves an Admin role. A real-world deployment must add a `has_one = authority` constraint to enforce that only an admin can set roles.
- **PDA Size**: The `UserProfile` account currently stores one byte for the role. Dynamic role changes require careful planning to avoid account resizing costs.
- **Revocation**: To revoke a role, the program must either update the role field or close and re-initialize the PDA. The `close_profile` instruction demonstrates account closure.

---

## On-Chain Verification

- **Program ID:** `txyHnTyAi8MiVFy3ZLQeqJiCHKt3FuJx2gg2pvab8T9`
- **Explorer:** [View on Solana Devnet](https://explorer.solana.com/address/txyHnTyAi8MiVFy3ZLQeqJiCHKt3FuJx2gg2pvab8T9?cluster=devnet)

---

## Running Locally

```bash
anchor build
anchor deploy --provider.cluster devnet
ts-node client/rbac_test.ts
```
