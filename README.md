# NodeShift: Bridging the Gap from Web2 to Web3

Welcome to **NodeShift**, an educational resource and developer playground designed to onboard Web2 developers into the Web3 ecosystem by mapping familiar system design patterns to their blockchain equivalents.

Check out our live playground at: [**node-shift.vercel.app**](https://node-shift.vercel.app)

---

## 🚀 What is NodeShift?

Transitioning from Web2 to Web3 (specifically Solana/Anchor) can be daunting. You're moving from centralized servers, databases, and standard APIs to distributed ledgers, Program Derived Addresses (PDAs), and Cross-Program Invocations (CPIs).

**NodeShift** simplifies this journey by:
- **Speaking your language:** We take common Web2 patterns (RBAC, Rate Limiting, Idempotency, etc.) and explain them in terms you already understand.
- **Side-by-Side Comparisons:** Every example features **6 Web2 implementations** (C#, Go, Node.js, Python FastAPI/Flask, and SpringBoot) alongside its Web3 counterparts in **both Native Rust and Anchor**.
- **Interactive Demos:** Our web interface lets you visualize how these patterns operate on-chain vs. off-chain.

> [!NOTE]  
> **Repository vs. Site:** The [NodeShift website](https://node-shift.vercel.app) provides quick code snippets and dependency lists for fast reference. This **GitHub Repository** contains the full environment, complete with build configurations, tests, and extensive documentation for every pattern.

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

---

## 🛠️ Repository Structure

The `examples/` directory is organized into pattern-specific folders:

- **`/web2`**: Contains implementations in 6 popular languages:
  - `csharp`, `go`, `js` (Node.js), `python-fastapi`, `python-flask`, `springboot`.
- **`/web3`**: Contains two implementations for Solana:
  - `anchor_<pattern>`: High-level Anchor framework implementation.
  - `native-rust`: Low-level Solana implementation using the native Rust SDK.

---

## ⚙️ Setup & Requirements

To explore the Web3 examples in this repository, you'll need the following tools:

### Prerequisites
- [**Rust**](https://www.rust-lang.org/tools/install) (latest stable)
- [**Solana CLI**](https://docs.solanalabs.com/cli/install) (for native Rust development)
- [**Anchor CLI**](https://www.anchor-lang.com/docs/installation) (for high-level framework development)

### Getting Started
1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/web2vweb3.git
   cd web2vweb3
   ```

2. **Explore a Pattern (e.g., Escrow):**
   ```bash
   cd examples/escrow-engine/web3/anchor_escrow
   anchor build
   anchor test
   ```

3. **Check Native Rust:**
   ```bash
   cd examples/escrow-engine/web3/native-rust
   cargo build-bpf # Build the native program
   ```

---

## 🌟 Get Involved

1. **Dive Deep:** Use the repository to explore full environments and detailed comments.
2. **Visualize:** Visit the [Playground](https://node-shift.vercel.app) to see the code snippets and dependencies in action.
3. **Contribute:** Join our mission to bridge the dev gap. Open a PR to add a new pattern or language implementation!

NodeShift is here to turn your "Web2 brain" into a "Web3 powerhouse." Happy building! 🦀⛓️
