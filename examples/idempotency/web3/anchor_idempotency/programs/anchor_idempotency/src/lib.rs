use anchor_lang::prelude::*;

declare_id!("DzBV9RhbE5WCNscwPBSwYrCEWFxDRMSkM5oWYKktMonr");

#[program]
pub mod anchor_idempotency {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Web2 idempotency uses a unique key (UUID or hash) stored in a DB/Redis.
    // If the key was already seen, the server returns the cached response.
    // On Solana, PDA creation IS the idempotency check.
    // `init` fails with an error if the account already exists — no extra code needed.
    //
    // All 2 instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - `Idempotency-Key` HTTP header           → `unique_id: u64` (seed for PDA)
    //   - Redis `SET key value NX` (set if absent) → `init` on the PDA (fails if already exists)
    //   - Duplicate request detection              → Anchor runtime rejects account re-creation
    //   - Request receipt / log entry              → `IdempotencyTracker` PDA holding `unique_id` + `processed_at`
    //   - Cleanup / expiry                         → `close_tracker` (manual; Solana has no TTL)
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates the idempotency guard PDA. The `init` constraint is the guard:
    /// if this (user, unique_id) combination was already processed, `init` will fail,
    /// and the transaction will be rejected — exactly like an `Idempotency-Key` check.
    /// Web2 equivalent: `SET idempotency:{userId}:{id} 1 NX EX 86400` in Redis.
    pub fn process_unique_action(ctx: Context<ProcessAction>, unique_id: u64) -> Result<()> {
        let tracker = &mut ctx.accounts.idempotency_tracker;
        tracker.unique_id = unique_id;
        tracker.processed_at = Clock::get()?.slot;
        
        msg!("Unique action '{}' processed and tracker initialized.", tracker.unique_id);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Closes the idempotency guard PDA and returns rent to the user.
    /// This simulates "unlike" or "undo" — removing the processed record.
    /// Web2 equivalent: `DEL idempotency:{userId}:{id}` in Redis (manual TTL management).
    /// Note: On Solana there is no automatic expiry. The client must call this explicitly.
    pub fn close_tracker(_ctx: Context<CloseTracker>, _unique_id: u64) -> Result<()> {
        msg!("Idempotency tracker closed (Simulated Unlike). PDA destroyed and rent returned.");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(unique_id: u64)]
pub struct ProcessAction<'info> {
    // WEB2 NOTE: The `seeds` and `init` here act as our Idempotency-Key check.
    // If a transaction with the same user + unique_id tries to `init` again, it fails.
    #[account(
        init, 
        payer = user, 
        space = 8 + 8 + 8, // Discriminator + u64 + u64
        seeds = [b"idempotency", user.key().as_ref(), &unique_id.to_le_bytes()],
        bump
    )]
    pub idempotency_tracker: Account<'info, IdempotencyTracker>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(unique_id: u64)]
pub struct CloseTracker<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"idempotency", user.key().as_ref(), &unique_id.to_le_bytes()],
        bump
    )]
    pub idempotency_tracker: Account<'info, IdempotencyTracker>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct IdempotencyTracker {
    pub unique_id: u64,
    pub processed_at: u64,
}
