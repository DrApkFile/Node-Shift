use anchor_lang::prelude::*;

declare_id!("CiRcuiT1111111111111111111111111111111111");

#[program]
pub mod anchor_circuit_breaker {
    use super::*;

    /// WEB2 DEVELOPER NOTE:
    /// In Anchor, we can use "Access Control" or "Constraints" to check our 
    /// Circuit Breaker state before any business logic runs!
    /// This is equivalent to your Express/FastAPI middleware.

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let breaker = &mut ctx.accounts.breaker_account;
        breaker.authority = ctx.accounts.authority.key();
        breaker.is_paused = false;
        msg!("Circuit Breaker initialized and CLOSED.");
        Ok(())
    }

    pub fn toggle_pause(ctx: Context<TogglePause>) -> Result<()> {
        let breaker = &mut ctx.accounts.breaker_account;
        breaker.is_paused = !breaker.is_paused;
        msg!("Circuit Breaker toggled. Is Paused: {}", breaker.is_paused);
        Ok(())
    }

    // A protected business action
    pub fn execute_action(ctx: Context<ExecuteAction>) -> Result<()> {
        // WEB2 NOTE: The constraint `[account(..., constraint = !breaker.is_paused)]`
        // below handles the circuit-check automatically!
        msg!("Executing business logic securely while circuit is CLOSED.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 1)]
    pub breaker_account: Account<'info, CircuitBreakerAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(mut, has_one = authority)]
    pub breaker_account: Account<'info, CircuitBreakerAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteAction<'info> {
    /// WEB2 DEVELOPER NOTE:
    /// This constraint is like your 'if (breaker.state == OPEN) return' logic.
    /// Anchor throws an error automatically if is_paused is true.
    #[account(constraint = !breaker_account.is_paused @ BreakerError::CircuitOpen)]
    pub breaker_account: Account<'info, CircuitBreakerAccount>,
}

#[account]
pub struct CircuitBreakerAccount {
    pub authority: Pubkey,
    pub is_paused: bool,
}

#[error_code]
pub enum BreakerError {
    #[msg("The circuit is currently OPEN. Operations are paused.")]
    CircuitOpen,
}
