export interface Step {
    title: string;
    web2Title: string;
    web2Desc: string;
    web2Code?: string;
    web3Title: string;
    web3Desc: string;
    web3Code?: string;
    notes: string;
}

export interface PatternDoc {
    slug: string;
    title: string;
    steps: {
        express: Step[];
        flask: Step[];
        go: Step[];
    };
}

export const docsContent: PatternDoc[] = [
    {
        slug: "escrow-engine",
        title: "Escrow Engine",
        steps: {
            express: [
                {
                    title: "1. The Trust Model",
                    web2Title: "Centralized Intermediary",
                    web2Desc: "You create a record in MongoDB/PostgreSQL and use a 'Trusted Third Party' (like Stripe or PayPal) to hold funds.",
                    web2Code: "// Express + Stripe approach\nconst payment = await stripe.paymentIntents.create({\n  amount: 2000,\n  currency: 'usd',\n  capture_method: 'manual', // Hold funds\n});",
                    web3Title: "Program-Owned Vault (PDA)",
                    web3Desc: "The 'Trust' is shifted to immutable code. You create a PDA that acts as a vault which only the program can sign for.",
                    web3Code: "// Anchor PDA Vault\n#[account(\n  init, \n  payer = user, \n  seeds = [b\"vault\", user.key().as_ref()], \n  bump\n)]\npub vault: Account<'info, TokenAccount>,",
                    notes: "Web2 relies on 'Counterparty Risk' (trusting the bank); Web3 uses 'Code as Law'."
                },
                {
                    title: "2. Atomic Execution",
                    web2Title: "Two-Phase Commit",
                    web2Desc: "You manually check if payment succeeded via a webhook, then update your database state. If the webhook fails, the db is out of sync.",
                    web2Code: "// Webhook Handler\napp.post('/webhook', (req, res) => {\n  if (req.body.type === 'payment_intent.succeeded') {\n    await db.orders.update({ id: orderId }, { status: 'paid' });\n  }\n});",
                    web3Title: "Single Instruction Atomicity",
                    web3Desc: "Solana handles the 'check-and-transfer' in one atomic transaction. If the taker doesn't pay, the vault never releases. Period.",
                    web3Code: "// Atomic Swap Instruction\npub fn exchange(ctx: Context<Exchange>) -> Result<()> {\n    token::transfer(ctx.accounts.into_transfer_to_taker_context(), amount)?;\n    token::transfer(ctx.accounts.into_transfer_to_initializer_context(), amount)?;\n    Ok(())\n}",
                    notes: "No more 'Cleanup Cron Jobs' for partial failures."
                },
                {
                    title: "3. Account Cleanup",
                    web2Title: "Garbage Collection",
                    web2Desc: "Database rows stay forever unless you set up a TTL or delete them manually.",
                    web2Code: "// Manual Cleanup\nawait db.escrows.deleteMany({\n  status: 'completed',\n  updatedAt: { $lt: oneMonthAgo }\n});",
                    web3Title: "Rent Recovery",
                    web3Desc: "Once the swap is done, you 'close' the account to reclaim the SOL deposit used for rent-exemption.",
                    web3Code: "// Closing Account\n#[account(\n  mut,\n  close = user, // Refunds rent to user\n  seeds = [b\"state\", user.key().as_ref()],\n  bump\n)]\npub escrow_state: Account<'info, EscrowState>,",
                    notes: "On Solana, storage has a tangible cost, but it's refundable."
                }
            ],
            flask: [
                {
                    title: "1. State Management",
                    web2Title: "SQLAlchemy Models",
                    web2Desc: "You define a Class and save it to a database service. Roles are just strings in a column.",
                    web2Code: "# SQLAlchemy Model\nclass Escrow(db.Model):\n    id = db.Column(db.Integer, primary_key=True)\n    amount = db.Column(db.Float)\n    status = db.Column(db.String(20))",
                    web3Title: "Borsh-Serialized Accounts",
                    web3Desc: "You define a Struct on-chain. The 'database' is the ledger. You must pre-allocate space for every field.",
                    web3Code: "// Anchor State Account\n#[account]\npub struct EscrowState {\n    pub initializer: Pubkey,\n    pub amount: u64,\n    pub is_active: bool,\n}",
                    notes: "Moving from dynamic JSON to fixed-length binary storage."
                },
                {
                    title: "2. Authentication",
                    web2Title: "JWT / Session Cookies",
                    web2Desc: "Flask-Login handles user state via cookies. The server validates the session on every request.",
                    web2Code: "@app.route('/swap')\n@login_required\ndef swap():\n    user_id = current_user.id\n    # Business logic...",
                    web3Title: "ED25519 Signatures",
                    web3Desc: "Every transaction is cryptographically signed by the user's private key. The program verifies this signature natively.",
                    web3Code: "// Signer constraint\n#[derive(Accounts)]\npub struct Initialize<'info> {\n    #[account(mut)]\n    pub user: Signer<'info>, // Verifies signature\n}",
                    notes: "The user is the sole authority; no middleware needed to 'lookup' the user."
                },
                {
                    title: "3. The Vault Logic",
                    web2Title: "Business Logic in Services",
                    web2Desc: "A Python service takes the request, calls the DB, and executes a transfer via an external API.",
                    web2Code: "# Service layer\ndef execute_swap(id):\n    escrow = Escrow.query.get(id)\n    stripe.Transfer.create(amount=escrow.amount...)",
                    web3Title: "Constraints in Structs",
                    web3Desc: "In Anchor, you use `#[account(init, payer = signer, seeds = [...])]` to enforce logic before the code even runs.",
                    web3Code: "// Logic as Constraints\n#[account(\n    init, \n    payer = initiator, \n    seeds = [b\"escrow\", initiator.key().as_ref()],\n    bump\n)]",
                    notes: "Constraints act as the 'Form Validation' of the blockchain."
                }
            ],
            go: [
                {
                    title: "1. Data Structures",
                    web2Title: "Go Structs & Interfaces",
                    web2Desc: "You define a struct and use an interface for persistence. Data lives in an external Redis or SQL cluster.",
                    web2Code: "// Go Model\ntype Escrow struct {\n    ID     string  `json:\"id\"`\n    Amount float64 `json:\"amount\"`\n}",
                    web3Title: "On-Chain PDAs",
                    web3Desc: "Data lives directy on the Solana ledger. You derive the 'Address' of your data from unique seeds.",
                    web3Code: "// Seed derivation\nlet (pda, _bump) = Pubkey::find_program_address(\n    &[b\"escrow\", user.key().as_ref()],\n    program_id\n);",
                    notes: "PDA derivation is like a 'Deterministic Hash' for your database keys."
                },
                {
                    title: "2. Error Handling",
                    web2Title: "if err != nil { return err }",
                    web2Desc: "You manually check every DB call and external API result. Failures require careful cleanup.",
                    web2Code: "err := db.Save(&escrow)\nif err != nil {\n    log.Printf(\"Failed to save: %v\", err)\n    return err\n}",
                    web3Title: "Transactional Reversion",
                    web3Desc: "If any check in your program fails, the entire transaction reverts. The blockchain state never touches a 'partial failure'.",
                    web3Code: "// Guard check\nif amount < min_amount {\n    return err!(ErrorCode::AmountTooLow);\n} // Atomically reverts on error",
                    notes: "Atomicity is a native feature of the runtime, not a library feature."
                },
                {
                    title: "3. Distributed Workers",
                    web2Title: "Goroutines & Channels",
                    web2Desc: "You use a background worker to poll for payment status or handle expiration logic.",
                    web2Code: "go func() {\n    ticker := time.NewTicker(time.Hour)\n    for range ticker.C {\n        cleanupExpiredEscrows()\n    }\n}()",
                    web3Title: "Incentivized Cranks",
                    web3Desc: "Without background tasks, you pay a 'Bounty' to any user who triggers the state cleanup.",
                    web3Code: "// Reward the triggerer\npub fn close_escrow(ctx: Context<Close>) -> Result<()> {\n    // Pay bounty to crank from vault\n    Ok(())\n}",
                    notes: "Solana is 'Passive' — it only moves when someone pays a fee to trigger it."
                }
            ]
        }
    },
    {
        slug: "rate-limiter",
        title: "Rate Limiter",
        steps: {
            express: [
                {
                    title: "1. Identification",
                    web2Title: "IP or JWT Middleware",
                    web2Desc: "Express-rate-limit identifies users by their IP address or a shared API key found in request headers.",
                    web2Code: "// Express Rate Limit\nconst limiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  keyGenerator: (req) => req.ip\n});",
                    web3Title: "PublicKey Signer",
                    web3Desc: "Identity is built-in. Every transaction is signed by a PublicKey, which serves as the unique ID for the limiter.",
                    web3Code: "// Anchor Signer as ID\npub struct HitLimiter<'info> {\n    pub user: Signer<'info>,\n    // user.key() is the unique ID\n}",
                    notes: "Identity is verifiable and non-spoofable on-chain."
                },
                {
                    title: "2. Tracking State",
                    web2Title: "Redis Increments",
                    web2Desc: "You increment a counter in Redis with an expiration (TTL). If the counter exceeds X, you block the request.",
                    web2Code: "// Redis Increment\nconst count = await redis.incr(`limit:${user_id}`);\nif (count === 1) await redis.expire(key, 60);",
                    web3Title: "Limiter PDAs",
                    web3Desc: "You store the `last_request_time` and `count` in a PDA derived from the user's PublicKey.",
                    web3Code: "// On-chain State\n#[account]\npub struct LimiterStats {\n    pub last_timestamp: i64,\n    pub count: u64,\n}",
                    notes: "The PDA is the user's permanent, verifiable 'Limit Card' on-chain."
                },
                {
                    title: "3. The Block",
                    web2Title: "HTTP 429 Status",
                    web2Desc: "Middleware returns a 429 status code. The server's work stops before hitting the business logic.",
                    web2Code: "// 429 Response\nif (isOverLimit) {\n  return res.status(429).json({ error: 'Too many requests' });\n}",
                    web3Title: "Transaction Rejection",
                    web3Desc: "Anchor rejects the transaction if the time constraint isn't met. The user pays a small fee for the failed check.",
                    web3Code: "// Simple logic gate\nrequire!( \n    now - stats.last_timestamp > 60,\n    RateLimitError::TooSoon\n);",
                    notes: "On-chain limiting ensures that even bots cannot 'spam' the underlying program logic cheaply."
                }
            ],
            flask: [
                {
                    title: "1. Storage",
                    web2Title: "Memory / Redis Store",
                    web2Desc: "Flask-Limiter usually stores buckets in memory or a separate cache layer.",
                    web2Code: "# Flask configuration\nlimiter = Limiter(\n    get_remote_address,\n    app=app,\n    storage_uri=\"redis://localhost:6379\"\n)",
                    web3Title: "On-Chain Ledger",
                    web3Desc: "Limiter state is a persistent account on the ledger. It exists as long as there is enough SOL for rent.",
                    web3Code: "// Rent-exempt account\n#[account(init, space = 8 + 8 + 8)]\npub stats: Account<'info, LimiterStats>,",
                    notes: "State is persistent across server restarts and decentralized."
                },
                {
                    title: "2. Logic Enforcement",
                    web2Title: "BeforeRequest Decorators",
                    web2Desc: "Python decorators intercept the route and check the cache before executing the function.",
                    web2Code: "@app.route(\"/api\")\n@limiter.limit(\"5 per minute\")\ndef my_api():\n    return \"success\"",
                    web3Title: "Anchor Account Constraints",
                    web3Desc: "The `#[account(constraint = ...)]` macro validates the timestamp before the instruction logic runs.",
                    web3Code: "// Zero-logic gate\n#[account(constraint = clock.unix_timestamp > stats.last + 60)]\npub stats: Account<'info, LimiterStats>,",
                    notes: "Constraints act as pre-flight security checks for the blockchain."
                },
                {
                    title: "3. Time Consensus",
                    web2Title: "Server System Clock",
                    web2Desc: "Uses the server's OS clock. If multiple servers have slightly drifted clocks, consistency can break.",
                    web2Code: "# Local OS time\nimport time\nnow = time.time()",
                    web3Title: "Clock Sysvar",
                    web3Desc: "Uses the Solana 'Clock' sysvar, which provides a globally agreed-upon timestamp across the whole network.",
                    web3Code: "// Global Network Time\nlet clock = Clock::get()?;\nlet now = clock.unix_timestamp;",
                    notes: "Determinism is guaranteed; no server-drift issues."
                }
            ],
            go: [
                {
                    title: "1. Throttling",
                    web2Title: "Channels & Token Buckets",
                    web2Desc: "Usage of `golang.org/x/time/rate` to manage concurrency and request flow locally.",
                    web2Code: "// Go Token Bucket\nlimiter := rate.NewLimiter(1, 5)\nif !limiter.Allow() {\n    return errors.New(\"rate limit exceeded\")\n}",
                    web3Title: "Synchronous Serial",
                    web3Desc: "Solana instructions are serial for the same accounts. The blockchain natively manages 'Who is first' atomically.",
                    web3Code: "// Serialized Execution\n// No mutexes needed; Solana locks the \n// stats account during the transaction.",
                    notes: "Race conditions in state updates are impossible on Solana due to its transaction scheduler."
                },
                {
                    title: "2. Global State",
                    web2Title: "Distributed Cache Keys",
                    web2Desc: "Mapping `user_id` to a key in a cluster to ensure consistency across multiple Go instances.",
                    web2Code: "// Key derivation\nkey := fmt.Sprintf(\"limit:%s\", user.ID)",
                    web3Title: "Deterministic Seeds",
                    web3Desc: "Using [b'limiter', user.key().as_ref()] as seeds to ensure there is only one account per user globally.",
                    web3Code: "// Unique Account Address\nseeds = [b\"limiter\", user.key().as_ref()]",
                    notes: "Universal state consistency is a native property of the ledger."
                },
                {
                    title: "3. Cost of Abuse",
                    web2Title: "Bandwidth Cost",
                    web2Desc: "Abuse costs the server bandwidth and CPU cycles. The attacker pays nothing but time.",
                    web2Code: "// Free to spam headers\n// Server still processes the request\n// until the middleware rejects it.",
                    web3Title: "Economic Friction",
                    web3Desc: "Every rejected transaction still costs the attacker a 'Transaction Fee'. Spamming an on-chain limiter is expensive.",
                    web3Code: "// Even failures cost SOL\n// Attackers bleed funds while \n// program logic is protected.",
                    notes: "Web3 turns rate limiting into an economic deterrent."
                }
            ]
        }
    },
    {
        slug: "rbac",
        title: "RBAC",
        steps: {
            express: [
                {
                    title: "1. Roles",
                    web2Title: "DB Enums / Permission Sets",
                    web2Desc: "Roles are stored as strings or IDs in a 'Users' table. Middleware checks these roles on every API call.",
                    web2Code: "// Express Role Check\nconst roles = {\n  ADMIN: 'admin',\n  EDITOR: 'editor',\n  USER: 'user'\n};",
                    web3Title: "Account Data Enums",
                    web3Desc: "Roles are defined as Rust `Enums` inside a Profile PDA. The program reads this byte to determine permissions.",
                    web3Code: "// Anchor Role Enum\n#[derive(AnchorSerialize, AnchorDeserialize)]\npub enum Role {\n    Admin, Editor, User\n}",
                    notes: "Roles are cryptographically tied to the user's wallet identity."
                },
                {
                    title: "2. Validation",
                    web2Title: "JWT Scopes",
                    web2Desc: "You encode roles into a JWT. The server trusts the role in the token if the signature is valid.",
                    web2Code: "// JWT Payload\nconst token = jwt.sign({\n  sub: user.id,\n  role: 'ADMIN'\n}, secret);",
                    web3Title: "Anchor Constraints",
                    web3Desc: "The program checks `constraint = profile.role == Role::Admin` directly on the on-chain account.",
                    web3Code: "// On-chain Validation\n#[account(constraint = profile.role == Role::Admin)]\npub profile: Account<'info, UserProfile>,",
                    notes: "No need for 'Stateless Tokens' when the state is always accessible and verifiable."
                },
                {
                    title: "3. Permission Gates",
                    web2Title: "Route Middleware",
                    web2Desc: "app.post('/admin', checkRole('ADMIN'), (req, res) => ...)",
                    web2Code: "// Middleware Guard\nfunction checkRole(role) {\n  return (req, res, next) => {\n    if (req.user.role !== role) return res.sendStatus(403);\n    next();\n  };\n}",
                    web3Title: "Instruction Access",
                    web3Desc: "Each instruction (e.g., `admin_action`) has its own `#[derive(Accounts)]` struct that enforces the role.",
                    web3Code: "// Instruction-level RBAC\npub fn delete_data(ctx: Context<AdminOnly>) -> Result<()> {\n    // Only reachable if Admin check passes\n    Ok(())\n}",
                    notes: "Permissions are granular and enforced at the instruction entry point."
                }
            ],
            flask: [
                {
                    title: "1. User Profiling",
                    web2Title: "User Models",
                    web2Desc: "You use Flask-Security or similar to manage roles and group memberships in a SQL database.",
                    web2Code: "# Flask role check\n@roles_accepted('admin', 'editor')\ndef edit_post():\n    pass",
                    web3Title: "Profile PDAs",
                    web3Desc: "You initialize a unique on-chain account for every user that stores their specific role state.",
                    web3Code: "// Profile PDA Struct\n#[account]\npub struct UserProfile {\n    pub authority: Pubkey,\n    pub role: Role,\n}",
                    notes: "Storage is decentralized - the user 'owns' their profile account."
                },
                {
                    title: "2. Access Control",
                    web2Title: "Decorators",
                    web2Desc: "@roles_required('admin') - Python decorators check the current_user identity.",
                    web2Code: "# Python Decorator\ndef admin_required(f):\n    @wraps(f)\n    def decorated(*args, **kwargs):\n        if not current_user.is_admin: abort(403)\n        return f(*args, **kwargs)\n    return decorated",
                    web3Title: "Account Ownership",
                    web3Desc: "The program verifies that the `Signer` has authority over the profile PDA being accessed.",
                    web3Code: "// Ownership validation\n#[account(\n    seeds = [b\"profile\", user.key().as_ref()],\n    bump,\n    has_one = user // Check authority\n)]\npub profile: Account<'info, UserProfile>,",
                    notes: "Security is verified through cryptographic signatures, not just server-side lookup."
                },
                {
                    title: "3. Admin Actions",
                    web2Title: "Server Override",
                    web2Desc: "The server has an 'Auth Bypass' or 'Superuser' mode stored in config files.",
                    web2Code: "# Hardcoded Admin\nADMIN_EMAILS = ['admin@node-shift.io']",
                    web3Title: "Immutable Guardrails",
                    web3Desc: "Program logic cannot be bypassed. Even the 'Creator' cannot execute admin actions without the correct role account.",
                    web3Code: "// Logic is Law\nif ctx.accounts.profile.role != Role::Admin {\n    return err!(ErrorCode::Unauthorized);\n}",
                    notes: "True trustlessness means nobody is above the code."
                }
            ],
            go: [
                {
                    title: "1. Authority",
                    web2Title: "Service Credentials",
                    web2Desc: "You use a service token or environmental variable to authenticate internal admin requests.",
                    web2Code: "// Go Env Check\nif os.Getenv(\"ADMIN_KEY\") != token {\n    return errors.New(\"unauthorized\")\n}",
                    web3Title: "Deterministic PDAs",
                    web3Desc: "Identity is derived. The program calculates the 'Admin Account' address to verify the caller.",
                    web3Code: "// Static Admin Config\npub const ADMIN_PUBKEY: Pubkey = pubkey!(\"...\");\n\n// Inline check\nrequire_keys_eq!(user.key(), ADMIN_PUBKEY);",
                    notes: "Identity is calculated, not configured."
                },
                {
                    title: "2. State Transitions",
                    web2Title: "CRUD Operations",
                    web2Desc: "Standard SQL UPDATE statements to change user roles or permissions.",
                    web2Code: "// SQL Update\ndb.Model(&user).Update(\"role\", \"admin\")",
                    web3Title: "Signed Transitions",
                    web3Desc: "Role changes are instructions that must be signed by an existing authority (e.g., the original admin).",
                    web3Code: "// Update Role Instruction\npub fn update_role(ctx: Context<UpdateRole>, new_role: Role) -> Result<()> {\n    ctx.accounts.profile.role = new_role;\n    Ok(())\n}",
                    notes: "Every permission change is an audited event on the public ledger."
                },
                {
                    title: "3. Granularity",
                    web2Title: "Policy Engines",
                    web2Desc: "Using OPA or Casbin to manage complex permission graphs and hierarchies.",
                    web2Code: "// Casbin Enforcer\ne, _ := casbin.NewEnforcer(\"model.conf\", \"policy.csv\")\nif ok, _ := e.Enforce(sub, obj, act); !ok { ... }",
                    web3Title: "Programmatic Logic",
                    web3Desc: "Custom Rust logic inside the instruction checks for nested roles or combined permission states.",
                    web3Code: "// Bitmask Permissions\nif profile.permissions & CAN_DELETE != 0 {\n    // Allow action\n}",
                    notes: "Programmable permissions allow for arbitrarily complex governance models."
                }
            ]
        }
    },
    {
        slug: "api-key-management",
        title: "API Key Management",
        steps: {
            express: [
                {
                    title: "1. Key Generation",
                    web2Title: "Random String Generation",
                    web2Desc: "You generate a crypto-secure UUID or random string and store it in a SQL database row.",
                    web2Code: "// UUID Generation\nconst apiKey = crypto.randomUUID();\nawait db.keys.create({ key: apiKey, userId });",
                    web3Title: "Hashed Identity Store",
                    web3Desc: "You generate a key, but only store its HASH on-chain in a PDA. The actual key stays with the user.",
                    web3Code: "// Hashed Key PDA\n#[account]\npub struct ApiKeyAccount {\n    pub key_hash: [u8; 32], // Sha256\n    pub authority: Pubkey,\n}",
                    notes: "Web3 allows for 'Zero-Knowledge' style validation where the server never sees the raw key."
                },
                {
                    title: "2. Authentication",
                    web2Title: "Header Verification",
                    web2Desc: "You check the 'x-api-key' header against your database using an indexed query.",
                    web2Code: "// DB Lookup\nconst key = await db.keys.findOne({ \n  where: { key: req.headers['x-api-key'] } \n});",
                    web3Title: "Signature Verification",
                    web3Desc: "The user signs their request with the key. The program verifies the signature against the stored hash PDA.",
                    web3Code: "// On-chain verification\nlet hash = hash::hash(user_key.as_slice());\nrequire!(hash == account.key_hash, Error::InvalidKey);",
                    notes: "Verification happens at the protocol level, not the app level."
                },
                {
                    title: "3. Revocation",
                    web2Title: "Soft Delete / Status Flag",
                    web2Desc: "You update a boolean column `is_active=false` in your database.",
                    web2Code: "// Deactivate key\nawait db.keys.update({ active: false }, { id });",
                    web3Title: "PDA Closure",
                    web3Desc: "You close the key account on-chain. The key simply ceases to exist on the ledger.",
                    web3Code: "// Permanent Deletion\n#[account(mut, close = user)]\npub api_key: Account<'info, ApiKeyAccount>,",
                    notes: "Closing accounts reclaims SOL and permanently invalidates access."
                }
            ],
            flask: [
                {
                    title: "1. Storage",
                    web2Title: "SQL Database",
                    web2Desc: "Keys live in a table. Metadata like 'created_at' is managed by the ORM.",
                    web2Code: "# SQLAlchemy Model\nclass APIKey(db.Model):\n    key = db.Column(db.String(64), unique=True)\n    user_id = db.Column(db.Integer)",
                    web3Title: "On-Chain Registry",
                    web3Desc: "Keys live in individual accounts. Metadata is part of the account struct space.",
                    web3Code: "// Account Metadata\n#[account]\npub struct ApiKey {\n    pub created_at: i64,\n    pub use_count: u64,\n}",
                    notes: "The 'Registry' is a set of decentralized accounts, not a single table."
                },
                {
                    title: "2. Access Control",
                    web2Title: "Decorators",
                    web2Desc: "@api_key_required - Flask checks the database on every incoming request.",
                    web2Code: "# Python Logic\ndef validate_key(provided_key):\n    key = APIKey.query.filter_by(key=provided_key).first()\n    return key is not None",
                    web3Title: "Anchor Constraints",
                    web3Desc: "Anchor checks that the provided Key PDA exists and is owned by the program.",
                    web3Code: "// PDA Validation\n#[account(\n    seeds = [b\"api-key\", user.key().as_ref()],\n    bump\n)]\npub api_key_acc: Account<'info, ApiKey>,",
                    notes: "Existence is proof of validity in the Web3 world."
                },
                {
                    title: "3. Limits",
                    web2Title: "Counter in Cache",
                    web2Desc: "Increment a counter in Redis for every successful key usage.",
                    web2Code: "# Usage Increment\nredis.incr(f\"usage:{key_id}\")",
                    web3Title: "On-Chain Usage State",
                    web3Desc: "The program updates the usage count directly inside the Key PDA account.",
                    web3Code: "// In-transaction counter\napi_key.usage_count += 1;",
                    notes: "Usage metrics are as immutable as the key itself."
                }
            ],
            go: [
                {
                    title: "1. Registry",
                    web2Title: "In-Memory or DB Map",
                    web2Desc: "Mapping API keys to user profiles in a high-performance database.",
                    web2Code: "// Go Memory Map\nvar registry = make(map[string]*Profile)",
                    web3Title: "Seed-Derived PDAs",
                    web3Desc: "Deriving the Key PDA address from the key's public identifier.",
                    web3Code: "// Key as Seed\nseeds = [b\"key\", raw_key_bytes]",
                    notes: "Predictable addressing eliminates the need for expensive 'Lookup' indices."
                },
                {
                    title: "2. Performance",
                    web2Title: "DB Query Latency",
                    web2Desc: "Even with indices, there is a round-trip to the database for every check.",
                    web2Code: "// Remote DB Call\nkey, err := db.FindKey(providedKey)",
                    web3Title: "Local Account Load",
                    web3Desc: "Solana loads the required accounts into memory *before* the program runs.",
                    web3Code: "// Pre-loaded accounts\n// No I/O wait inside the logic.",
                    notes: "Latency is minimized because data and logic are co-located in the same transaction."
                },
                {
                    title: "3. Security",
                    web2Title: "Token Rotation",
                    web2Desc: "Periodically issuing new keys and deleting old ones from the database.",
                    web2Code: "// Rotation Logic\nfunc rotateKey(oldKey string) {\n    newKey := generateKey()\n    updateDB(oldKey, newKey)\n}",
                    web3Title: "Programmatic Rotation",
                    web3Desc: "On-chain logic can enforce rotation or expiry automatically based on slot height.",
                    web3Code: "// Slot-based expiry\nif clock.slot > stats.expiry_slot {\n    return err!(ErrorCode::KeyExpired);\n}",
                    notes: "Security policies are enforced by the protocol, not by human operations."
                }
            ]
        }
    },
    {
        slug: "idempotency-key",
        title: "Idempotency Key",
        steps: {
            express: [
                {
                    title: "1. The Request",
                    web2Title: "Idempotency-Key Header",
                    web2Desc: "The client sends a UUID in the header. You check if you've seen this UUID before in Redis.",
                    web2Code: "// Header Check\nconst key = req.headers['idempotency-key'];\nif (await redis.get(key)) return cachedResponse;",
                    web3Title: "PDA-as-a-Nonce",
                    web3Desc: "You use the ID as a SEED for a PDA. If the PDA already exists, the transaction fails on 'init'.",
                    web3Code: "// PDA as Nonce\n#[account(\n    init, \n    seeds = [b\"idempotency\", id.as_ref()], \n    bump\n)]\npub nonce: Account<'info, Nonce>,",
                    notes: "Web3 uses the 'Existence of State' as a duplicate-check mechanism."
                },
                {
                    title: "2. Processing",
                    web2Title: "Handle Request",
                    web2Desc: "If it's new, you process the request and store the result in your cache for next time.",
                    web2Code: "// Atomic Process\nconst result = await processTransaction();\nawait redis.set(key, result, 'EX', 86400);",
                    web3Title: "Instruction Logic",
                    web3Desc: "The logic runs only if the account creation succeeds. Re-runs will fail at the Anchor level.",
                    web3Code: "// Guarded Execution\npub fn process(ctx: Context<Process>) -> Result<()> {\n    // Only runs if 'init' passed\n    Ok(())\n}",
                    notes: "Atomicity ensures you never process without recording the idempotency proof."
                },
                {
                    title: "3. Expiration",
                    web2Title: "Redis TTL",
                    web2Desc: "Keys expire after 24 hours to save memory.",
                    web2Code: "// Auto-expiry\nawait redis.expire(key, 86400);",
                    web3Title: "Manual Closure",
                    web3Desc: "You must proactively close the account to reclaim the rent or keep it for a permanent record.",
                    web3Code: "// Manual Cleanup\n#[account(mut, close = user)]\npub nonce: Account<'info, Nonce>,",
                    notes: "Web3 records can be permanent if desired, or cleaned up for SOL."
                }
            ],
            flask: [
                {
                    title: "1. Check",
                    web2Title: "Flask Cache Check",
                    web2Desc: "A decorator checks the cache for the request hash before hitting the route.",
                    web2Code: "# Flask Cache Check\n@cache.cached(key_prefix='idempotency')\ndef handle_request():\n    pass",
                    web3Title: "Account Validation",
                    web3Desc: "Anchor's `init` macro checks if the account address is already used on the ledger.",
                    web3Code: "// Zero-trust check\n// If the account exists, the \n// transaction reverts on 'init'.",
                    notes: "The ledger is the source of truth for 'past events'."
                },
                {
                    title: "2. Outcome",
                    web2Title: "Return Cached Response",
                    web2Desc: "If found, return the 200 OK with the previous result without re-executing logic.",
                    web2Code: "# Short-circuit\nif cache.has(request_id):\n    return cache.get(request_id)",
                    web3Title: "Transaction Failure",
                    web3Desc: "If found, the transaction reverts with an 'Already Initialized' error.",
                    web3Code: "// Failed Retry\n// Rejection is a feature! The \n// state is protected from duplicate hits.",
                    notes: "Web3 failure is 'Safe' — no state changes occur."
                },
                {
                    title: "3. Cleanup",
                    web2Title: "Celery Task",
                    web2Desc: "A background task runs periodically to purge old idempotency keys from SQL/Redis.",
                    web2Code: "# Background Cleanup\n@celery.task\ndef purge_stale_keys():\n    db.keys.delete_stale()",
                    web3Title: "Refundable Closure",
                    web3Desc: "The user or dev can close the account to get the rent back once the record is stale.",
                    web3Code: "// Profit from cleanup\n// Closing accounts = SOL back.",
                    notes: "Cleanup is an economic opportunity, not a maintenance chore."
                }
            ],
            go: [
                {
                    title: "1. Uniqueness",
                    web2Title: "Request Hash",
                    web2Desc: "Hashing the request body and params to detect duplicates in a high-concurrency environment.",
                    web2Code: "// Request Hashing\nh := sha256.Sum256(requestBody)\nkey := hex.EncodeToString(h[:])",
                    web3Title: "Deterministic PDA",
                    web3Desc: "The PDA address is mathematically tied to the request ID. Collision is impossible.",
                    web3Code: "// PDA Seed\nseeds = [b\"idempotency\", request_id]",
                    notes: "Precision is guaranteed by the protocol's address derivation."
                },
                {
                    title: "2. Concurrency",
                    web2Title: "Mutex Locks",
                    web2Desc: "Using Mutexes to prevent two identical requests from processing at the same millisecond.",
                    web2Code: "// Go Mutex\nmu.Lock()\ndefer mu.Unlock()\nif exists(key) { return }",
                    web3Title: "Solana Scheduler",
                    web3Desc: "The validator locks the accounts during processing. Simultaneous requests for the same PDA are serialized.",
                    web3Code: "// Runtime Locking\n// Solana ensures serial access \n// to the idempotency account.",
                    notes: "The runtime handles the locking logic for you."
                },
                {
                    title: "3. Persistence",
                    web2Title: "Log Auditing",
                    web2Desc: "Writing processed keys to a log file or separate audit table.",
                    web2Code: "// Log Persistence\nlog.Printf(\"Processed key: %s\", key)",
                    web3Title: "Immutable Proof",
                    web3Desc: "The existence of the account on-chain is permanent, public proof that the action occurred once.",
                    web3Code: "// On-chain proof\n// The account data is the \n// final word on the request status.",
                    notes: "Action history is built directly into the data model."
                }
            ]
        }
    },
    {
        slug: "subscription-billing",
        title: "Subscription Billing",
        steps: {
            express: [
                {
                    title: "1. Model Shift",
                    web2Title: "Merchant Pull",
                    web2Desc: "Stripe pulls money from the user's card. You only update your DB after the webhook confirms success.",
                    web2Code: "// Stripe Hook\napp.post('/webhook', (req, res) => {\n  if (req.body.type === 'invoice.paid') {\n    updateSubscription(req.body.customer);\n  }\n});",
                    web3Title: "User Push",
                    web3Desc: "The user proactively sends payment to extend their subscription PDA's expiry timestamp.",
                    web3Code: "// User-led update\npub fn renew(ctx: Context<Renew>) -> Result<()> {\n    ctx.accounts.sub.expiry += 30 * 24 * 60 * 60;\n    transfer(ctx.accounts.user, ctx.accounts.vault, PRICE)?;\n    Ok(())\n}",
                    notes: "From 'Auto-Charge' to 'Auto-Renew' with pre-authorization."
                },
                {
                    title: "2. Access Gating",
                    web2Title: "Service Middleware",
                    web2Desc: "Middleware checks `user.subscription_end > now()`. Requires a DB trip on every protected route.",
                    web2Code: "// Middleware\nconst isSubscribed = (req, res, next) => {\n  if (user.expiry < Date.now()) return res.sendStatus(402);\n  next();\n};",
                    web3Title: "On-Chain Clock",
                    web3Desc: "The program compares `subscription.expiry` to the Solana `Clock` sysvar in every instruction call.",
                    web3Code: "// On-chain validation\nlet clock = Clock::get()?;\nrequire!(sub.expiry > clock.unix_timestamp, Error::Expired);",
                    notes: "Access is gated by the protocol's consensus on time."
                },
                {
                    title: "3. Renewal",
                    web2Title: "Stripe Auto-Renew",
                    web2Desc: "Managed entirely by a third party. You just listen for events.",
                    web2Code: "// Passive Listening\n// Your backend just waits \n// for Stripe to say 'I got paid'.",
                    web3Title: "Crank Workers",
                    web3Desc: "You can use a 'Crank' to trigger the renewal if the user has pre-deposited funds into a vault PDA.",
                    web3Code: "// Automation Trigger\n// A bot (crank) calls this instruction \n// if the user has a balance in their vault.",
                    notes: "Decentralized automation requires external triggers."
                }
            ],
            flask: [
                {
                    title: "1. The Tier",
                    web2Title: "Plan ID in Database",
                    web2Desc: "User row has a `plan_id`. Logic checks this flag to unlock features.",
                    web2Code: "# SQLAlchemy check\nif user.plan_id == 'GOLD':\n    enable_premium_features()",
                    web3Title: "Tier Enumeration",
                    web3Desc: "The Subscription PDA stores a `Tier` enum. Logic is hardcoded to respond to these levels.",
                    web3Code: "// Anchor Enum check\nif sub.tier == Tier::Gold {\n    // Unlock logic\n}",
                    notes: "Plan levels are public and verifiable by anyone."
                },
                {
                    title: "2. Payment",
                    web2Title: "Checkout Session",
                    web2Desc: "Redirecting the user to a Hosted Checkout page, then waiting for a POST to your backend.",
                    web2Code: "# Stripe Checkout\nsession = stripe.checkout.Session.create(\n  success_url=\"https://example.com/success\",\n  ...\n)",
                    web3Title: "Atomic Extension",
                    web3Desc: "User sends tokens and updates their expiry in a single transaction. Success is instant.",
                    web3Code: "// Single IX payment\nlet cpi_context = CpiContext::new(\n    ctx.accounts.token_program.to_account_info(),\n    Transfer { ... }\n);\ntoken::transfer(cpi_context, amount)?;",
                    notes: "No 'Pending' state; you are either subscribed or you aren't."
                },
                {
                    title: "3. Expiration",
                    web2Title: "Cron purges",
                    web2Desc: "A nightly script flips the `is_active` bit to false for expired plans.",
                    web2Code: "# Cron Script\ndef purge_expired():\n    db.update().where(expiry < now).values(active=False)",
                    web3Title: "Passive Expiry",
                    web3Desc: "The program treats the account as 'Inactive' the second the block time exceeds the expiry.",
                    web3Code: "// Logical expiry\n// No 'active' bit needed. \n// Expiry date comparison is absolute.",
                    notes: "Logic is inherently 'Self-Clearing' without requiring background processing."
                }
            ],
            go: [
                {
                    title: "1. Identity",
                    web2Title: "User Accounts",
                    web2Desc: "Lookup by email or ID. Linking the subscription record to the user entity via foreign key.",
                    web2Code: "// DB Foreign Key\nvar sub Subscription\ndb.Where(\"user_id = ?\", userID).First(&sub)",
                    web3Title: "Derivation",
                    web3Desc: "Deriving the unique subscription PDA from the user's public key.",
                    web3Code: "// PDA Derivation\nseeds = [b\"sub\", user_pubkey]",
                    notes: "The relationship is cryptographic, not relational."
                },
                {
                    title: "2. Multi-tenant Access",
                    web2Title: "ACL Tables",
                    web2Desc: "Custom logic in Go to manage which sub-orgs or team members have inherited access.",
                    web2Code: "// Recursive ACL check\nif !hasAccess(userID, orgID) { return err }",
                    web3Title: "Nested PDAs",
                    web3Desc: "Sub-accounts can be derived from the main subscription PDA to manage team permissions.",
                    web3Code: "// Hierarchical Seeds\nseeds = [b\"member\", sub_pda, member_key]",
                    notes: "Hierarchies are mapped through the address derivation tree."
                },
                {
                    title: "3. Economic Logic",
                    web2Title: "Gross Margin",
                    web2Desc: "Subtract payment processor fees from your revenue in a monthly report.",
                    web2Code: "// Margin Calc\nnetRevenue := grossRevenue - (grossRevenue * 0.029) - 0.30",
                    web3Title: "Net Revenue",
                    web3Desc: "Fees are paid directly by the user. The protocol receives 100% of the tokens sent to the vault.",
                    web3Code: "// 100% Efficient\n// No intermediary cut logic needed.",
                    notes: "Web3 eliminates the overhead of payment intermediaries."
                }
            ]
        }
    },
    {
        slug: "on-chain-job-queue",
        title: "Job Queue",
        steps: {
            express: [
                {
                    title: "1. Scheduling",
                    web2Title: "Bull / RabbitMQ",
                    web2Desc: "You push a JSON body into a queue and set a delay. A worker picks it up later.",
                    web2Code: "// Bull Queue\nawait myQueue.add(\n  { data: 'payload' },\n  { delay: 1000 }\n);",
                    web3Title: "PDA-Backed Jobs",
                    web3Desc: "You create a 'Job' PDA on-chain. It stores the handler data and the 'Run After' timestamp.",
                    web3Code: "// Job PDA\n#[account]\npub struct Job {\n    pub handler: Pubkey,\n    pub run_after: i64,\n}",
                    notes: "The queue is a set of public accounts, not a private buffer."
                },
                {
                    title: "2. The Worker",
                    web2Title: "Long-Running Service",
                    web2Desc: "A background Node process polls the queue and executes the code.",
                    web2Code: "// Bull Process\nmyQueue.process(async (job) => {\n  await doWork(job.data);\n});",
                    web3Title: "Decentralized Keepers",
                    web3Desc: "Any user (a 'Keeper') can see your expired job on-chain and trigger its execution to earn a bounty.",
                    web3Code: "// Restricted Crank\nrequire!(clock.unix_timestamp > job.run_after);\n// Keeper executes the logic",
                    notes: "Automation is crowd-sourced and decentralized."
                },
                {
                    title: "3. Completion",
                    web2Title: "Mark as Done",
                    web2Desc: "The worker updates the status in Redis/SQL and sends a log.",
                    web2Code: "// Redis Update\nawait redis.set(`job:${id}:status`, 'done');",
                    web3Title: "PDA Reward Flow",
                    web3Desc: "The program pays the reward to the Keeper and closes the Job PDA in one transaction.",
                    web3Code: "// Atomic reward\n#[account(mut, close = keeper_payout)]\npub job: Account<'info, Job>,",
                    notes: "Execution and payment are atomically linked."
                }
            ],
            flask: [
                {
                    title: "1. Task Definition",
                    web2Title: "Celery @task",
                    web2Desc: "Write a Python function, decorate it, and schedule it via a broker like Redis.",
                    web2Code: "# Celery Task\n@celery.task\ndef process_data(id):\n    # logic here",
                    web3Title: "Program Instruction",
                    web3Desc: "Define an instruction that can only be 'cranked' after a specific timestamp check.",
                    web3Code: "// Anchor IX\npub fn process(ctx: Context<...>) -> Result<()> {\n    require!(now > job.expiry);\n    Ok(())\n}",
                    notes: "The 'Function' is a public on-chain instruction."
                },
                {
                    title: "2. Execution",
                    web2Title: "Celery Worker",
                    web2Desc: "A dedicated server runs `celery worker`. Scalability depends on your DevOps.",
                    web2Code: "# Shell command\ncelery -A tasks worker --loglevel=info",
                    web3Title: "Unrestricted Crankers",
                    web3Desc: "Global 'Keeper Networks' automatically scan for your jobs. Scalability is limited only by the chain's TPS.",
                    web3Code: "// Open access\n// Anyone can call this IX \n// if the constraints pass.",
                    notes: "DevOps is replaced by decentralization."
                },
                {
                    title: "3. Retries",
                    web2Title: "Max Retries / Dead Letter",
                    web2Desc: "If the task fails, Celery re-queues it for later processing.",
                    web2Code: "# Retry logic\n@celery.task(bind=True, max_retries=3)",
                    web3Title: "Transaction Reversion",
                    web3Desc: "If the 'Crank' fails, the job remains on-chain as 'Pending'. It doesn't disappear until it succeeds.",
                    web3Code: "// State Persistence\n// If logic fails, PDA is NOT closed. \n// It persists for a retry.",
                    notes: "On-chain state is persistent until completion conditions are met."
                }
            ],
            go: [
                {
                    title: "1. Job Flow",
                    web2Title: "Producer/Consumer",
                    web2Desc: "Go routines producing tasks to a channel; workers consuming them concurrently.",
                    web2Code: "// Go Channel\njobs := make(chan Job, 100)\ngo worker(jobs)",
                    web3Title: "Permissionless Trigger",
                    web3Desc: "Anyone can 'consume' the job by submitting the correct transaction to the blockchain.",
                    web3Code: "// Global Queue\n// Public ledger = shared channel.",
                    notes: "Concurrency is managed by the network validators."
                },
                {
                    title: "2. Visibility",
                    web2Title: "Internal Monitoring",
                    web2Desc: "Using dashboards like Flower or custom Go metrics to monitor queue health.",
                    web2Code: "// Metrics\nprometheus.MustRegister(jobCounter)",
                    web3Title: "On-Chain Transparency",
                    web3Desc: "Anyone can use a block explorer to see the current 'Backlog' of pending on-chain jobs.",
                    web3Code: "// Explorer link\n// https://solana.fm/address/...",
                    notes: "System health is public and verifiable."
                },
                {
                    title: "3. Compensation",
                    web2Title: "Infrastructure Cost",
                    web2Desc: "You pay for the servers that run the workers regardless of job volume.",
                    web2Code: "// AWS Bill\n// Fixed cost: $50/mo",
                    web3Title: "Pay-Per-Execution",
                    web3Desc: "You only pay the SOL 'Bounty' when a job is actually processed.",
                    web3Code: "// Variable cost\n// Only pay the 'Keeper' on success.",
                    notes: "Switch from fixed infrastructure costs to variable performance costs."
                }
            ]
        }
    },
    {
        slug: "leaderboard-ranking",
        title: "Leaderboard Ranking",
        steps: {
            express: [
                {
                    title: "1. Data Entry",
                    web2Title: "Express Route + SQL Insert",
                    web2Desc: "POST /score updates the user's row. Sorting happens later in the query.",
                    web2Code: "// Express Score Post\napp.post('/score', async (req, res) => {\n  await db.scores.update(user.id, req.body.score);\n});",
                    web3Title: "Atomic Ranking Update",
                    web3Desc: "The program updates the global 'Leaderboard PDA' and sorts the Top 10 instantly.",
                    web3Code: "// On-chain update\npub fn update_score(ctx: Context<Update>, score: u64) -> Result<()> {\n    let leaderboard = &mut ctx.accounts.leaderboard;\n    leaderboard.add_score(score)?;\n    Ok(())\n}",
                    notes: "Ranking is always-live and verifiable."
                },
                {
                    title: "2. The Sort",
                    web2Title: "ORDER BY score DESC",
                    web2Desc: "Database engine sorts millions of rows to find the Top 10 for the UI.",
                    web2Code: "// SQL Query\nconst top10 = await db.query(\n  'SELECT * FROM scores ORDER BY score DESC LIMIT 10'\n);",
                    web3Title: "Insertion Sort on-chain",
                    web3Desc: "The program manually executes a small sort logic within the transaction to update the Top 10 array.",
                    web3Code: "// Logic-driven sort\nfor i in 0..TOP_10_SIZE {\n    if score > leaderboard.scores[i] {\n        leaderboard.insert_at(i, score);\n        break;\n    }\n}",
                    notes: "Moving from 'Massive Querying' to 'Strategic Small Updates'."
                },
                {
                    title: "3. Cheating Prevention",
                    web2Title: "Server Validation",
                    web2Desc: "Backend logic checks if the user's request looks realistic. Hard to verify the admin didn't cheat.",
                    web2Code: "// Validation Check\nif (score > MAX_POSSIBLE_SCORE) return res.sendStatus(400);",
                    web3Title: "Immutable Proof",
                    web3Desc: "Only the user's signed transaction can update their score. Admin cannot 'inject' fake rankings.",
                    web3Code: "// Native Auth\n// Program checks the signer matches \n// the score owner PDA.",
                    notes: "Rankings are trustless and audit-proof."
                }
            ],
            flask: [
                {
                    title: "1. Scoring",
                    web2Title: "POST Request",
                    web2Desc: "Flask takes the score from JSON and updates the PostgreSQL database.",
                    web2Code: "# Python Logic\n@app.route('/score', methods=['POST'])\ndef post_score():\n    update_db(current_user, request.json['score'])",
                    web3Title: "Signed Broadcast",
                    web3Desc: "User signs a transaction with their score. Program checks it against the game's difficulty logic.",
                    web3Code: "// On-chain validation\nrequire!(score < max_allowed_score);\n// Update state",
                    notes: "Identity and score are cryptographically linked."
                },
                {
                    title: "2. Presentation",
                    web2Title: "GET /leaderboard",
                    web2Desc: "Fetching from database and rendering a JSON response.",
                    web2Code: "# JSON Response\n@app.route('/leaderboard')\ndef get_leaderboard():\n    return jsonify(query_top_10())",
                    web3Title: "Public Account Fetch",
                    web3Desc: "Frontend fetches the 'Leaderboard PDA' directly from the ledger. No API server needed.",
                    web3Code: "// Direct Fetch\nconst data = await program.account.leaderboard.fetch(pda);",
                    notes: "Web3 eliminates the need for 'Read' APIs."
                },
                {
                    title: "3. Distribution",
                    web2Title: "Centralized Cache",
                    web2Desc: "Using Redis to cache the leaderboard results to reduce database load.",
                    web2Code: "# Redis Cache\ncache.set('top_10', data, timeout=60)",
                    web3Title: "Global RPC Cache",
                    web3Desc: "Solana RPC nodes automatically cache account data for fast retrieval globally.",
                    web3Code: "// Built-in scaling\n// The network is the cache.",
                    notes: "Scaling is handled by the network infrastructure."
                }
            ],
            go: [
                {
                    title: "1. Concurrency",
                    web2Title: "Atomic DB Increments",
                    web2Desc: "Using `UPDATE ... SET score = score + ?` to handle concurrent score updates correctly.",
                    web2Code: "// Atomic Update\ndb.Exec(\"UPDATE users SET score = score + ? WHERE id = ?\", delta, id)",
                    web3Title: "Serial Transaction Processing",
                    web3Desc: "Solana ensures that only one person updates the Leaderboard PDA at a time, preventing race conditions.",
                    web3Code: "// Serial update\n// Locked at the runtime level.",
                    notes: "Sequence is guaranteed by the protocol's consensus."
                },
                {
                    title: "2. Space Efficiency",
                    web2Title: "Database Indexing",
                    web2Desc: "Adding indices on the score column, which consumes disk space on the DB server.",
                    web2Code: "// Index creation\nCREATE INDEX idx_scores ON users(score DESC);",
                    web3Title: "Fixed Buffer Space",
                    web3Desc: "The Leaderboard PDA pre-allocates space for exactly 10 entries (Fixed Size Array).",
                    web3Code: "// Memory layout\npub struct Leaderboard {\n    pub players: [Player; 10],\n}",
                    notes: "Fixed space ensures predictable costs and high performance."
                },
                {
                    title: "3. Governance",
                    web2Title: "Admin Panel",
                    web2Desc: "An admin manually deletes 'Cheating' rows from the database.",
                    web2Code: "// Manual Cleanup\ndb.Delete(&Player{}, \"id = ?\", cheatingID)",
                    web3Title: "Decentralized Moderation",
                    web3Desc: "Only an authorized 'Judge' PDA or a community DAO can vote to remove a rank.",
                    web3Code: "// DAO Auth\nrequire_keys_eq!(ctx.accounts.moderator.key(), GOVERNANCE_KEY);",
                    notes: "Moderation becomes a transparent on-chain process."
                }
            ]
        }
    },
    {
        slug: "order-matching-engine",
        title: "Order Matching",
        steps: {
            express: [
                {
                    title: "1. Placing Orders",
                    web2Title: "POST /buy or /sell",
                    web2Desc: "Order is pushed into a queue (Redis/Rabbit). Matching happens in the background.",
                    web2Code: "// Express Order\napp.post('/order', (req, res) => {\n  queue.push(req.body);\n  res.status(202).send();\n});",
                    web3Title: "Atomic Limit Orders",
                    web3Desc: "The order is placed on the 'Limit Order Book' PDA. If it crosses the spread, it matches *instantly*.",
                    web3Code: "// On-chain Order\npub fn place_order(ctx: Context<Place>, side: Side, price: u64) -> Result<()> {\n    ctx.accounts.book.match_or_insert(side, price)?;\n    Ok(())\n}",
                    notes: "Web3 allows for 'Synchronous Matching' during the transaction."
                },
                {
                    title: "2. Settlement",
                    web2Title: "Post-Match Settlement",
                    web2Desc: "After matching, the server initiates bank/token transfers which can take minutes or fail.",
                    web2Code: "// Post-Match\nconst match = findMatch(order);\nawait transferFunds(match.buyer, match.seller);",
                    web3Title: "Direct Atomic Swap",
                    web3Desc: "The match *is* the transfer. Both sides swap assets in one atomic transaction or the match reverts.",
                    web3Code: "// Atomic Swap\nswap_tokens(buyer_vault, seller_vault)?;\nclose_order_pda()?;\nOk(())",
                    notes: "Settlement Risk is eliminated."
                },
                {
                    title: "3. Transparency",
                    web2Title: "Black-Box Exchange",
                    web2Desc: "The exchange matching logic is private. Orders can be 'Front-run' by the operator.",
                    web2Code: "// Private Logic\n// Logic resides on backend \n// server with limited auditability.",
                    web3Title: "Verifiable Book",
                    web3Desc: "Every order on the book is a public PDA. The matching logic is open-source and immutable.",
                    web3Code: "// Public Logic\n// Anyone can read the book \n// and verify the code.",
                    notes: "Trustless fair-market execution."
                }
            ],
            flask: [
                {
                    title: "1. Submission",
                    web2Title: "Flask Route",
                    web2Desc: "Validating user funds in the DB before accepting the order into the pool.",
                    web2Code: "# Python Check\nif user.balance < order.price:\n    abort(400, 'Insufficient funds')",
                    web3Title: "Anchor Validation",
                    web3Desc: "Account constraints check the user's token balance before the engine even sees the order.",
                    web3Code: "// Anchor Check\n#[account(constraint = user_token.amount >= price)]\npub user_token: Account<'info, TokenAccount>,",
                    notes: "Validation is enforced at the gate."
                },
                {
                    title: "2. The Spread",
                    web2Title: "Engine Loop",
                    web2Desc: "A Python process loops through active orders to find overlap in prices.",
                    web2Code: "# Match Loop\nfor bid in bids:\n    for ask in asks:\n        if bid.price >= ask.price:\n            match(bid, ask)",
                    web3Title: "Binary Tree Search",
                    web3Desc: "On-chain programs use optimized data structures to find price matches within the transaction's compute budget.",
                    web3Code: "// On-chain Logic\n// Binary search tree for \n// O(log n) matching.",
                    notes: "Efficiency is critical for on-chain execution."
                },
                {
                    title: "3. Fees",
                    web2Title: "Exchange Spread & Commission",
                    web2Desc: "The platform takes a portion of the trade as a fee, handled by internal accounting.",
                    web2Code: "# Fee deduction\nfee = trade_amount * 0.001\nplatform_wallet += fee",
                    web3Title: "Programmatic Token Flow",
                    web3Desc: "Fees are automatically redirected to a treasury PDA during the asset swap.",
                    web3Code: "// Auto-treasury\nlet fee = amount / 1000;\ntransfer(user, treasury, fee)?;",
                    notes: "Revenue is managed by code, not humans."
                }
            ],
            go: [
                {
                    title: "1. Throughput",
                    web2Title: "LMAX-style Disruptors",
                    web2Desc: "Using high-concurrency Go patterns to handle millions of orders per second off-chain.",
                    web2Code: "// Go Concurrency\n// Disruptor pattern for \n// ultra-low latency.",
                    web3Title: "Serial Order Pipeline",
                    web3Desc: "Leveraging Solana's high TPS and deterministic ordering to handle atomic matching cycles.",
                    web3Code: "// High-speed Chain\n// 65k TPS allows for \n// many matches per block.",
                    notes: "Scaling is limited by block time, but settlement is instant."
                },
                {
                    title: "2. Persistence",
                    web2Title: "Journaling / WAL",
                    web2Desc: "Writing every order to a 'Write Ahead Log' to prevent data loss on server crash.",
                    web2Code: "// Journaling\nfile.Write(order.Binary())",
                    web3Title: "Ledger Persistence",
                    web3Desc: "The blockchain *is* the log. Once a transaction is confirmed, it can never be lost.",
                    web3Code: "// Blockchain Log\n// Immutable history by default.",
                    notes: "Blockchain provides native disaster recovery."
                },
                {
                    title: "3. Fairness",
                    web2Title: "Low-Latency Direct Access",
                    web2Desc: "Proprietary traders pay for server colocation to get an advantage.",
                    web2Code: "// Private Infra\n// Colo servers win on speed.",
                    web3Title: "Universal Consensus",
                    web3Desc: "Everyone interacts with the same public RPC. High-frequency 'Gossip' is handled by the protocol.",
                    web3Code: "// Public Access\n// No colo advantage on-chain.",
                    notes: "The playing field is leveled by the transparency of the network."
                }
            ]
        }
    },
    {
        slug: "auction-engine",
        title: "Auction Engine",
        steps: {
            express: [
                {
                    title: "1. Listing",
                    web2Title: "Upload & Schedule",
                    web2Desc: "Creator uploads an item and sets an end date in a database.",
                    web2Code: "// DB Insert\nawait db.auctions.create({\n  itemId: 123,\n  endTime: '2024-01-01'\n});",
                    web3Title: "Auction Initialization",
                    web3Desc: "Creator creates an 'Auction PDA' and locks the item (token) into a program vault.",
                    web3Code: "// PDA Init\nctx.accounts.auction.end_time = end_time;\n// Lock NFT in vault\ntransfer(token_account, vault_account)?;",
                    notes: "The item is trustlessly secured from the start."
                },
                {
                    title: "2. Bidding",
                    web2Title: "POST /bid",
                    web2Desc: "Server checks if bid is higher than DB max and updates the record.",
                    web2Code: "// Bid Proc\nif (bid > currentMax) {\n  await db.auctions.update(id, { max: bid });\n}",
                    web3Title: "Atomic Increment",
                    web3Desc: "Program verifies the new bid > current bid and refunds the previous bidder instantly.",
                    web3Code: "// Refund & Update\nrequire!(bid > auction.highest_bid);\nrefund(previous_bidder, previous_bid)?;\nauction.highest_bid = bid;",
                    notes: "Funds are never 'held' by a third party; they flow between users and vaults."
                },
                {
                    title: "3. Settlement",
                    web2Title: "Manual Completion",
                    web2Desc: "After the timer ends, the seller manually ships or the system executes a final logic.",
                    web2Code: "// Manual settlement\n// Admins or sellers trigger \n// the end of the auction.",
                    web3Title: "Permisionless Finalization",
                    web3Desc: "Anyone can call 'Complete' after the block time > end time to trigger the final payout.",
                    web3Code: "// Final IX\nrequire!(now > auction.end_time);\ntransfer(vault, winner)?;\nclose_auction_pda()?;",
                    notes: "The auction resolves itself based on the consensus clock."
                }
            ],
            flask: [
                {
                    title: "1. Validations",
                    web2Title: "Form Validation",
                    web2Desc: "Flask-WTF checks if the bid is a number and within range.",
                    web2Code: "# WTForms\nclass BidForm(FlaskForm):\n    amount = IntegerField('Bid', [validators.Required()])",
                    web3Title: "Instruction Verification",
                    web3Desc: "Anchor checks the signature, the bid amount, and the auction status PDA.",
                    web3Code: "// Anchor Constraints\n#[account(mut, has_one = creator)]\npub auction: Account<'info, Auction>,",
                    notes: "Security is baked into the account structure."
                },
                {
                    title: "2. Time Gating",
                    web2Title: "Task Queues",
                    web2Desc: "Scaling worker processes to check for expired auctions every few seconds.",
                    web2Code: "# Polling logic\ndef check_expired():\n    auctions = Auction.query.filter(end < now).all()",
                    web3Title: "Passive Consensus",
                    web3Desc: "Uses the `Clock` sysvar. No background task needed - logic fails if time is up.",
                    web3Code: "// Clock Access\nlet clock = Clock::get()?;\nrequire!(clock.unix_timestamp < auction.end, Error::Ended);",
                    notes: "System is responsive but doesn't require polling."
                },
                {
                    title: "3. Bounced Payments",
                    web2Title: "Payment Gateway",
                    web2Desc: "Retry logic if the winner's credit card fails after the win.",
                    web2Code: "# Payment Retry\ntry:\n    stripe.Charge.create(...)\nexcept stripe.error.CardError:",
                    web3Title: "Pre-Paid Bids",
                    web3Desc: "Winner's funds are already locked in the vault from the moment they bid.",
                    web3Code: "// Locked Funds\n// Bid amount was transferred \n// to vault during the bid IX.",
                    notes: "A win is a guaranteed payment."
                }
            ],
            go: [
                {
                    title: "1. State Sync",
                    web2Title: "WebSockets",
                    web2Desc: "Broadcasting bid updates to clients in real-time via a Go WebSocket server.",
                    web2Code: "// WebSocket Hub\nhub.broadcast <- []byte(\"new bid: $500\")",
                    web3Title: "Account Change Listeners",
                    web3Desc: "Clients listen for 'Account Change' events directy from the Solana RPC.",
                    web3Code: "// RPC Subscription\nconnection.onAccountChange(auctionPDA, (info) => { ... });",
                    notes: "Web3 eliminates the need for a custom notification backend."
                },
                {
                    title: "2. Fairness",
                    web2Title: "Server NTP Sync",
                    web2Desc: "Ensuring all servers agree on the exact millisecond an auction ends.",
                    web2Code: "// Time Sync\ntime.Now().UTC()",
                    web3Title: "Consensus Clock",
                    web3Desc: "Global network agreement on the current block height and timestamp.",
                    web3Code: "// Network Time\n// Unified through PoH.",
                    notes: "Deterministic finality prevents 'last-second' disputes."
                },
                {
                    title: "3. Refunds",
                    web2Title: "Manual Refund Process",
                    web2Desc: "Initiating a reverse transaction via Stripe, which could take days.",
                    web2Code: "// Stripe Refund\nstripe.Refund.create(charge_id)",
                    web3Title: "Instant Reversion",
                    web3Desc: "The program sends the previous leader's SOL back to their wallet in the same transaction as the new bid.",
                    web3Code: "// CPI Refund\ntransfer(vault, prev_bidder, prev_amount)?;",
                    notes: "Losing a bid results in an instant refund."
                }
            ]
        }
    },
    {
        slug: "circuit-breaker",
        title: "Circuit Breaker",
        steps: {
            express: [
                {
                    title: "1. Monitoring",
                    web2Title: "Error Counting Middleware",
                    web2Desc: "Middleware tracks 5xx status codes. If count > threshold, flip the internal 'is_paused' flag.",
                    web2Code: "// Error Tracking\nif (res.statusCode >= 500) {\n  errorCount++;\n  if (errorCount > 10) paused = true;\n}",
                    web3Title: "Authority Toggle PDA",
                    web3Desc: "An admin or DAO signs a transaction to flip the 'is_paused' byte in the Program's Config PDA.",
                    web3Code: "// Admin Toggle IX\npub fn toggle_pause(ctx: Context<Update>) -> Result<()> {\n    ctx.accounts.config.paused = !ctx.accounts.config.paused;\n    Ok(())\n}",
                    notes: "Control is explicit and verifiable."
                },
                {
                    title: "2. Request Flow",
                    web2Title: "Early Return",
                    web2Desc: "Middleware checks the flag and returns 503 Service Unavailable instantly.",
                    web2Code: "// Middleware Check\nif (paused) return res.sendStatus(503);",
                    web3Title: "Instruction Rejection",
                    web3Desc: "The `admin_protected` instruction checks the config PDA. If 'paused', the transaction fails.",
                    web3Code: "// Guard Check\nrequire!(!config.paused, Error::Paused);",
                    notes: "Operations are gated by the global on-chain switch."
                },
                {
                    title: "3. Recovery",
                    web2Title: "Timeout & Retry",
                    web2Desc: "After X minutes, the middleware 'Half-Opens' to test if the backend is recovered.",
                    web2Code: "// Auto-recovery\nsetTimeout(() => { paused = false }, 60000);",
                    web3Title: "Signed Reset",
                    web3Desc: "An authority manually flips the flag back after confirming system health.",
                    web3Code: "// Manual Reset\n// Authority must sign a \n// 'Resume' transaction.",
                    notes: "Recovery is an audited, intentional on-chain event."
                }
            ],
            flask: [
                {
                    title: "1. The Switch",
                    web2Title: "Global Config Flags",
                    web2Desc: "Changing a value in an environment variable or a configuration database.",
                    web2Code: "# Flask Config\napp.config['CIRCUIT_OPEN'] = True",
                    web3Title: "The Program Config PDA",
                    web3Desc: "A singleton account owned by the program that stores global state like 'PauseStatus'.",
                    web3Code: "// PDA State\n#[account]\npub struct Config {\n    pub paused: bool,\n}",
                    notes: "Global config is decentralized and transparent."
                },
                {
                    title: "2. Enforcement",
                    web2Title: "Blueprints / Decorators",
                    web2Desc: "@circuit_breaker - A decorator checks the global flag before executing the view.",
                    web2Code: "# Decorator\n@circuit_breaker\ndef my_view():\n    pass",
                    web3Title: "Anchor Constraints",
                    web3Desc: "The `#[account(constraint = !config.paused)]` macro blocks the instruction logic.",
                    web3Code: "// Anchor Macro\n#[account(constraint = !config.paused @ Error::Paused)]\npub config: Account<'info, Config>,",
                    notes: "Constraint checks are the first line of defense."
                },
                {
                    title: "3. Auditing",
                    web2Title: "Log Files",
                    web2Desc: "Check server logs to see when and why the circuit broke.",
                    web2Code: "# Log analysis\nlogger.warning(\"Circuit broken at %s\", now)",
                    web3Title: "On-Chain History",
                    web3Desc: "Every toggle of the breaker is an immutable transaction on the ledger history.",
                    web3Code: "// Explorer Log\n// View 'TogglePause' txs \n// in block history.",
                    notes: "State changes are permanently recorded in history."
                }
            ],
            go: [
                {
                    title: "1. Fault Tolerance",
                    web2Title: "Standard Library / Hystrix",
                    web2Desc: "Using libraries like `sony/gobreaker` to wrap HTTP clients and manage state.",
                    web2Code: "// Go Breaker\ncb := gobreaker.NewCircuitBreaker(st)",
                    web3Title: "Native Constraint logic",
                    web3Desc: "Implementing simple boolean logic inside the on-chain instruction to guard critical paths.",
                    web3Code: "// Manual Check\nif config.paused { return err }",
                    notes: "Reliability is a core feature of the program architecture."
                },
                {
                    title: "2. Propagation",
                    web2Title: "Service Mesh (Envoy)",
                    web2Desc: "Using a mesh to propagate the 'Paused' state through multiple microservices.",
                    web2Code: "// Mesh Logic\n// Envoy returns 503 \n// across all nodes.",
                    web3Title: "CPI Propagation",
                    web3Desc: "If the main program is paused, all programs calling it via CPI will also receive the failure.",
                    web3Code: "// Internal Failure\n// CPI call errors if \n// target is paused.",
                    notes: "The 'Pause' propagates naturally through the call graph."
                },
                {
                    title: "3. Responsiveness",
                    web2Title: "Config Rolling Hot-Reload",
                    web2Desc: "Ensuring all instances see the config change simultaneously without a restart.",
                    web2Code: "// Hot reload\nv.WatchConfig()",
                    web3Title: "Block-by-Block Finality",
                    web3Desc: "Once the 'Pause' transaction is confirmed, every validator on the network follows the new rule instantly.",
                    web3Code: "// Instant Consensus\n// Finality in ~400ms.",
                    notes: "Global consensus ensures absolute consistency."
                }
            ]
        }
    },
    {
        slug: "leader-election",
        title: "Leader Election",
        steps: {
            express: [
                {
                    title: "1. Candidate Pool",
                    web2Title: "Cluster Nodes",
                    web2Desc: "Nodes in a PM2 or Kubernetes cluster announce their presence to a master.",
                    web2Code: "// PM2 Info\npm2.list((err, list) => {\n  const nodes = list.map(n => n.name);\n});",
                    web3Title: "Candidate PDAs",
                    web3Desc: "Any user or node can register as a candidate by creating an on-chain PDA account.",
                    web3Code: "// PDA Register\npub fn register(ctx: Context<Register>) -> Result<()> {\n    ctx.accounts.candidate.status = Status::Active;\n    Ok(())\n}",
                    notes: "Candidacy is public and permissionless."
                },
                {
                    title: "2. The Vote",
                    web2Title: "Health Checks",
                    web2Desc: "The master node pings workers to see who is active. Best health usually wins.",
                    web2Code: "// Health Check\nconst isHealthy = await ping(nodeId);\nif (isHealthy) voteCount++;",
                    web3Title: "On-Chain Voting Logic",
                    web3Desc: "Users or validators cast 'Votes' stored in a global Election PDA. Logic is transparent.",
                    web3Code: "// Voting IX\npub fn vote(ctx: Context<Vote>, candidate: Pubkey) -> Result<()> {\n    ctx.accounts.election.record_vote(candidate);\n    Ok(())\n}",
                    notes: "Election is based on verifiable data, not opaque health checks."
                },
                {
                    title: "3. Resolution",
                    web2Title: "Master Assignment",
                    web2Desc: "The master node marks a specific ID as 'LEADER' in the central registry.",
                    web2Code: "// Master Elect\nawait redis.set('cluster:leader', nodeId);",
                    web3Title: "Epoch Resolution",
                    web3Desc: "At the end of the timer, the program compares candidates and assigns the 'Leader' role PDA.",
                    web3Code: "// Result IX\nlet winner = select_winner(candidates);\nelection.current_leader = winner;",
                    notes: "The winner is determined by consensus, not a central orchestrator."
                }
            ],
            flask: [
                {
                    title: "1. Interaction",
                    web2Title: "WebSocket / Heartbeat",
                    web2Desc: "Nodes semi-continuously update their status in a Redis cluster.",
                    web2Code: "# Flask Heartbeat\nredis.setex(f\"node:{id}:alive\", 30, \"1\")",
                    web3Title: "Slot-based Expiry",
                    web3Desc: "Candidates must update their 'Last Active' slot. If they miss X slots, they are disqualified.",
                    web3Code: "// Deadline check\nrequire!(clock.slot < candidate.last_active + 100);",
                    notes: "Activity is tracked via the ledger's slot progression."
                },
                {
                    title: "2. The Turn",
                    web2Title: "Round Robin",
                    web2Desc: "Server logic simply cycles through a list of available worker IDs.",
                    web2Code: "# Round Robin\nnext_leader = nodes[current_index % len(nodes)]",
                    web3Title: "Sorted Ranking",
                    web3Desc: "The program sorts candidates by their score/votes to select the current authority.",
                    web3Code: "// Sorted Elect\nelection.candidates.sort_by(|a, b| b.votes.cmp(&a.votes));",
                    notes: "Governance is programmable and immutable."
                },
                {
                    title: "3. Fallback",
                    web2Title: "Re-Election Event",
                    web2Desc: "If the master fails, a new election is triggered by the cluster orchestrator.",
                    web2Code: "# Re-elect\nif not leader_alive():\n    trigger_election()",
                    web3Title: "Automated Epoches",
                    web3Desc: "Elections repeat automatically every X slots. Failure is impossible because the logic is in the runtime.",
                    web3Code: "// Epoch Flow\nif clock.slot > election.epoch_end {\n    resolve_election()?;\n}",
                    notes: "The protocol itself is the orchestrator."
                }
            ],
            go: [
                {
                    title: "1. Consensus",
                    web2Title: "Raft / Paxos",
                    web2Desc: "Implementing complex consensus algorithms to ensure all nodes agree on the leader.",
                    web2Code: "// Raft Consensus\nnode.Start(raftConfig)",
                    web3Title: "Native L1 Consensus",
                    web3Desc: "L1 (Solana) handles the core consensus. The program just uses that state to drive elections.",
                    web3Code: "// L1 Trust\n// No internal consensus \n// logic needed.",
                    notes: "Leverage the blockchain for distributed agreement."
                },
                {
                    title: "2. Authority Shift",
                    web2Title: "Role Update",
                    web2Desc: "Updating internal Go variables or notifying services of the new master IP.",
                    web2Code: "// Variable Update\nleaderIP = \"10.0.0.5\"",
                    web3Title: "State Update",
                    web3Desc: "Updating the 'Current Leader' field in the config PDA. All instructions now check for this new key.",
                    web3Code: "// PDA Update\nconfig.leader = new_leader_pubkey;",
                    notes: "Authority is a single byte change on the ledger."
                },
                {
                    title: "3. Distribution",
                    web2Title: "Load Balancer Sync",
                    web2Desc: "Updating Nginx or a cloud LB to point to the new leader's healthy endpoint.",
                    web2Code: "// Nginx Reload\nexec.Command(\"nginx\", \"-s\", \"reload\").Run()",
                    web3Title: "Global RPC Lookup",
                    web3Desc: "Any client fetching the Config PDA instantly sees the new leader without any routing changes.",
                    web3Code: "// Front-end Fetch\nconst leader = (await program.account.config.fetch(pda)).leader;",
                    notes: "The state is the router."
                }
            ]
        }
    }
];
