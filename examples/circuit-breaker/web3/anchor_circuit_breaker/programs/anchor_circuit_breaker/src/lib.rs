use anchor_lang::prelude::*;

declare_id!("3KnPCDHyU6fB6tBFndfs7UoM6Mwg4sgmhBS941BefhSS");

#[program]
pub mod anchor_circuit_breaker {
    use super::*;

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

    pub fn execute_action(ctx: Context<ExecuteAction>) -> Result<()> {
        let breaker_account = &ctx.accounts.breaker_account;
        if breaker_account.is_paused {
            return Err(BreakerError::CircuitOpen.into());
        }
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
