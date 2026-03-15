use anchor_lang::prelude::*;

declare_id!("J3cTELeaZPRUd1qGHrDW6mxi9Hyz3egMs9unqVQsxny6");

#[program]
pub mod anchor_rate_limiter {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Redis rate limiting uses a TTL-expiring counter per user.
    // On Solana, there is no TTL. Instead, we track a slot window
    // in a per-user PDA and check the delta on each call.
    //
    // All 3 instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - Redis `INCR rate:{ip}` with TTL   → request_count in PDA + slot window check
    //   - Redis `EXPIRE`                    → checking `current_slot - last_slot > window`
    //   - HTTP 429 Too Many Requests        → `return err!(RateLimitError::RateLimitExceeded)`
    //   - Rate limit window reset           → overwriting `last_request_slot` when window passes
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates the per-user rate limiter PDA with a zeroed counter.
    /// Web2 equivalent: A user session starting fresh — no prior count.
    /// Note: `initialize` is separate from `access_resource` because
    /// account `init` cannot be combined with `mut` in the same instruction.
    pub fn initialize_limiter(ctx: Context<InitializeLimiter>) -> Result<()> {
        let limiter = &mut ctx.accounts.rate_limiter;
        limiter.last_request_slot = Clock::get()?.slot;
        limiter.request_count = 0;
        msg!("Rate limiter initialized for user.");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// The gated resource call. Checks the slot window and rejects if limit exceeded.
    /// Web2 equivalent: Express `rateLimit()` middleware that reads from Redis and throws 429.
    /// Slot window: 300 slots ≈ 2 minutes. Max: 2 requests per window.
    pub fn access_resource(ctx: Context<AccessResource>) -> Result<()> {
        let limiter = &mut ctx.accounts.rate_limiter;
        let clock = Clock::get()?;
        let current_slot = clock.slot;

        // WEB2 NOTE: 300 slots is roughly 2 minutes.
        let window_slots = 300;
        let max_requests = 2;

        if current_slot - limiter.last_request_slot > window_slots {
            // New Window
            limiter.last_request_slot = current_slot;
            limiter.request_count = 1;
            msg!("New rate limit window started.");
        } else {
            // Existing Window
            if limiter.request_count >= max_requests {
                return err!(RateLimitError::RateLimitExceeded);
            }
            limiter.request_count += 1;
            msg!("Request {}/{} accepted.", limiter.request_count, max_requests);
        }

        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Closes the rate limiter PDA and returns rent lamports to the user.
    /// Web2 equivalent: Clearing a user's session data from Redis on logout.
    pub fn close_limiter(_ctx: Context<CloseLimiter>) -> Result<()> {
        msg!("Rate limiter account closed. SOL returned to user.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeLimiter<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 64,
        seeds = [b"rate-limiter", user.key().as_ref()],
        bump
    )]
    pub rate_limiter: Account<'info, RateLimiterAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AccessResource<'info> {
    #[account(
        mut,
        seeds = [b"rate-limiter", user.key().as_ref()],
        bump
    )]
    pub rate_limiter: Account<'info, RateLimiterAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseLimiter<'info> {
    #[account(
        mut,
        seeds = [b"rate-limiter", user.key().as_ref()],
        bump,
        close = user
    )]
    pub rate_limiter: Account<'info, RateLimiterAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct RateLimiterAccount {
    pub last_request_slot: u64,
    pub request_count: u16,
}

#[error_code]
pub enum RateLimitError {
    #[msg("Too Many Requests. Rate limit exceeded on-chain.")]
    RateLimitExceeded,
}
