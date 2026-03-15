# NodeShift: Bridging the Gap from Web2 to Web3

Welcome to **NodeShift**, an educational resource and developer playground designed to onboard Web2 developers into the Web3 ecosystem by mapping familiar system design patterns to their blockchain equivalents.

Check out our live playground at: [**node-shift.vercel.app**](https://node-shift.vercel.app)

---

## 🚀 What is NodeShift?

Transitioning from Web2 to Web3 (specifically Solana/Anchor) can be daunting. You're moving from centralized servers, databases, and standard APIs to distributed ledgers, Program Derived Addresses (PDAs), and Cross-Program Invocations (CPIs).

**NodeShift** simplifies this journey by:
- **Speaking your language:** We take common Web2 patterns (RBAC, Rate Limiting, Idempotency, etc.) and explain them in terms you already understand.
- **Side-by-Side Comparisons:** Every example in this repository features a Web2 implementation (Node.js/Express/Python) alongside its Web3 counterpart (Anchor/Rust).
- **Interactive Demos:** Our web interface lets you visualize how these patterns operate on-chain vs. off-chain.

---

## 🧩 Patterns in Action

Here are 3 examples of how NodeShift maps familiar concepts to the blockchain:

### 1. Idempotency (Preventing Duplicates)
In Web2, you use a unique header key and a cache (like Redis) to ensure an operation isn't performed twice. In Web3, we use the property of **Account Creation** (PDAs) to achieve the same result.

| **Web2 (Node.js/Redis)** | **Web3 (Solana/Anchor)** |
| :--- | :--- |
| ```javascript
// Check cache for key
if (idempotencyStore.has(key)) {
  return res.status(200).json(cached);
}
// Process and store
idempotencyStore.set(key, result);
``` | ```rust
// 'init' constraint fails if 
// the PDA already exists.
#[derive(Accounts)]
pub struct ProcessAction<'info> {
    #[account(init, seeds = [id], ...)]
    pub tracker: Account<'info, Tracker>,
}
``` |

### 2. RBAC (Role-Based Access Control)
Web2 uses middleware to check roles in a database. In Web3, roles are stored in account data, and "middleware" is implemented as constraints on the transaction itself.

| **Web2 (Express Middleware)** | **Web3 (Anchor Constraints)** |
| :--- | :--- |
| ```javascript
const checkRole = (role) => (req, res, next) => {
  if (user.role !== role) {
    return res.status(403).send();
  }
  next();
};
app.post('/admin', checkRole('ADMIN'));
``` | ```rust
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
      constraint = user.role == Role::Admin
    )]
    pub user: Account<'info, UserProfile>,
}
``` |

### 3. Escrow (Trusted Intermediary)
In Web2, you trust a third party (Stripe, PayPal) to hold funds. In Web3, the **Program** (Smart Contract) acts as the trustless intermediary.

| **Web2 (Platform API)** | **Web3 (On-chain Vault)** |
| :--- | :--- |
| ```javascript
// Trusting a centralized DB
const escrow = { 
  buyer, seller, amount, status: 'PENDING' 
};
db.save(escrow);
``` | ```rust
// Transferring tokens to a 
// program-owned PDA vault
token::transfer(
  CpiContext::new(token_program, Transfer {
    from: buyer_account,
    to: vault_pda,
    authority: buyer,
  }),
  amount
)?;
``` |

---

## 🛠️ Repository Structure

The `examples/` directory contains folders for each pattern, each containing:
- `/web2`: Implementations in C#, Go, JS, Python, and SpringBoot.
- `/web3`: The Anchor/Solana implementation and a native Rust version.
- `README.md`: A detailed breakdown of the technical mapping between the two.

---

## 🌟 Get Started

1. **Explore the Code:** Dive into the `examples/` directory to see how your favorite language implements these patterns.
2. **Visit the Playground:** Head over to [node-shift.vercel.app](https://node-shift.vercel.app) to see these patterns in a live, interactive environment.
3. **Contribute:** Have a pattern you want to see? Open a PR or an issue!

NodeShift is here to turn your "Web2 brain" into a "Web3 powerhouse." Happy building! 🦀⛓️
