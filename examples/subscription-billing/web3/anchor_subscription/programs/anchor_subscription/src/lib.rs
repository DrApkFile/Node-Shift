use anchor_lang::prelude::*;

declare_id!("AihnoAeD3MH23amQhmMgRWq9UF3rSV7YMnN6THArV8e7");

#[program]
pub mod anchor_subscription {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // In Web2, subscriptions are managed by a billing platform (Stripe)
    // that auto-charges user payment credentials on a schedule.
    // On Solana, the program CANNOT pull funds without user consent.
    // Instead, the user pre-authorizes and the program enforces expiry.
    //
    // All instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - DB row (user subscriptions table) → SubscriptionAccount PDA
    //   - Session/JWT expiry check          → `require!(clock < expiry)` in program
    //   - Stripe webhook "subscription.deleted" → cancel_subscription (closes PDA)
    //   - Auto-renew                        → NOT possible without user signature;
    //                                         requires a Keeper bot pattern.
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates or renews a subscription by writing an expiry timestamp to the user's PDA.
    /// Web2 equivalent: Stripe `subscription.create` — sets the billing period end date.
    /// Note: `init_if_needed` allows idempotent re-subscription without separate instructions.
    pub fn buy_subscription(ctx: Context<BuySubscription>, duration: i64) -> Result<()> {
        let sub = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;
        
        sub.owner = ctx.accounts.user.key();
        sub.expiry_timestamp = clock.unix_timestamp + duration;
        
        msg!("Subscription purchased! Active until: {}", sub.expiry_timestamp);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// A "gated" instruction that only active subscribers can call.
    /// Web2 equivalent: An Express.js middleware checking `req.user.subscription_active`.
    /// The `require!` macro is the on-chain equivalent of `if (!isActive) throw 403`.
    pub fn access_protected_resource(ctx: Context<AccessResource>) -> Result<()> {
        let sub = &ctx.accounts.subscription;
        let clock = Clock::get()?;

        // WEB2 NOTE: Equivalent to `if (now > expiry) throw Error()`
        require!(
            clock.unix_timestamp <= sub.expiry_timestamp,
            SubscriptionError::SubscriptionExpired
        );

        msg!("Access granted. Subscription is active.");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Closes the subscription PDA, returning the rent deposit to the user.
    /// Web2 equivalent: User clicks "Cancel Subscription" — the record is soft-deleted.
    /// Note: The `close = user` attribute in the Accounts struct handles all value
    /// transfer and account closure automatically — no code needed in the function body.
    pub fn cancel_subscription(_ctx: Context<CancelSubscription>) -> Result<()> {
        msg!("Subscription cancelled. Rent recovered.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct BuySubscription<'info> {
    // Seeded by user's public key so each user has exactly one subscription account
    #[account(
        init_if_needed, 
        payer = user, 
        space = 8 + 32 + 8,
        seeds = [b"subscription", user.key().as_ref()],
        bump
    )]
    pub subscription: Account<'info, SubscriptionAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AccessResource<'info> {
    #[account(
        seeds = [b"subscription", user.key().as_ref()],
        bump,
        constraint = subscription.owner == user.key() @ SubscriptionError::UnauthorizedAccess
    )]
    pub subscription: Account<'info, SubscriptionAccount>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"subscription", user.key().as_ref()],
        bump,
        constraint = subscription.owner == user.key() @ SubscriptionError::UnauthorizedAccess
    )]
    pub subscription: Account<'info, SubscriptionAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct SubscriptionAccount {
    pub owner: Pubkey,
    pub expiry_timestamp: i64,
}

#[error_code]
pub enum SubscriptionError {
    #[msg("Your subscription has expired. Please renew to access this resource.")]
    SubscriptionExpired,
    #[msg("You are not the owner of this subscription.")]
    UnauthorizedAccess,
}
