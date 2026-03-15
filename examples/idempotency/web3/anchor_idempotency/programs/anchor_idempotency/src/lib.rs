use anchor_lang::prelude::*;

declare_id!("DzBV9RhbE5WCNscwPBSwYrCEWFxDRMSkM5oWYKktMonr");

#[program]
pub mod anchor_idempotency {
    use super::*;

    /// WEB2 DEVELOPER NOTE:
    /// In Anchor, we use a "Signer" and a "Unique Account" (PDA) 
    /// to guarantee that a transaction only happens once.
    /// If the account already exists, Anchor's `init` will fail!

    pub fn process_unique_action(ctx: Context<ProcessAction>, unique_id: u64) -> Result<()> {
        let tracker = &mut ctx.accounts.idempotency_tracker;
        tracker.unique_id = unique_id;
        tracker.processed_at = Clock::get()?.slot;
        
        msg!("Unique action '{}' processed and tracker initialized.", tracker.unique_id);
        Ok(())
    }

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
