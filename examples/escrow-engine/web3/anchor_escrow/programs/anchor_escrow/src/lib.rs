use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("9anrPY2Ei1Lkvqmqcdyuie42aYhxvnB9qScUTZZimwTB");

#[program]
pub mod anchor_escrow {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // In Web2, an escrow means trusting a bank or platform (PayPal,
    // Stripe) to hold and release funds. Here, the PROGRAM is the
    // escrow agent. No human can move funds — only program logic.
    //
    // All 3 instructions below are [CORE PATTERN LOGIC]. Escrow has
    // no UI-helper or simulation instructions in this implementation.
    //
    // Key Web2 Concepts Mapped:
    //   - Database record → EscrowAccount PDA
    //   - Bank vault      → Vault Token Account PDA (owned by program)
    //   - Fund transfer   → CPI (Cross-Program Invocation) to SPL Token Program
    //   - Deal completion → exchange() instruction
    //   - Refund          → cancel() instruction
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates the escrow agreement. The maker deposits tokens into a Vault PDA
    /// (program-controlled — no private key exists for it).
    /// Web2 equivalent: "Open an escrow and wire funds to the holding account."
    pub fn initialize(ctx: Context<InitializeEscrow>, seed: u64, amount: u64, expected_amount: u64) -> Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.maker_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;

        ctx.accounts.escrow_state.maker = ctx.accounts.maker.key();
        ctx.accounts.escrow_state.seed = seed;
        ctx.accounts.escrow_state.amount = amount;
        ctx.accounts.escrow_state.expected_amount = expected_amount;
        
        msg!("Escrow {} created with {} tokens.", seed, amount);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Maker cancels the deal and reclaims their deposited tokens from the Vault PDA.
    /// Web2 equivalent: "Buyer cancels order; payment is refunded."
    /// Note: `close = maker` in the accounts macro burns the EscrowAccount PDA and
    /// returns rent lamports back to the maker — equivalent to freeing a DB row.
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let seeds = &[
            b"escrow",
            ctx.accounts.maker.to_account_info().key.as_ref(),
            &ctx.accounts.escrow_state.seed.to_le_bytes(),
            &[ctx.bumps.escrow_state],
        ];
        let signer = &[&seeds[..]];

        // 1. Transfer tokens back to maker
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.maker_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, ctx.accounts.escrow_state.amount)?;

        // 2. Close the vault account to recover rent
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_accounts,
            signer,
        );
        token::close_account(close_ctx)?;

        msg!("Escrow canceled, vault closed, and tokens returned.");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Atomically completes the trade: taker sends expected tokens to maker,
    /// maker's vault tokens move to taker, and all accounts are closed.
    /// Web2 equivalent: "Delivery confirmed; escrow releases payment to seller."
    /// This is the core value proposition of on-chain escrow: the swap is
    /// atomic — both sides settle simultaneously or neither does.
    pub fn exchange(ctx: Context<Exchange>) -> Result<()> {
        let seeds = &[
            b"escrow",
            ctx.accounts.maker.to_account_info().key.as_ref(),
            &ctx.accounts.escrow_state.seed.to_le_bytes(),
            &[ctx.bumps.escrow_state],
        ];
        let signer = &[&seeds[..]];

        // 1. Transfer taker tokens to maker
        let cpi_accounts_taker = Transfer {
            from: ctx.accounts.taker_token_account.to_account_info(),
            to: ctx.accounts.maker_token_account.to_account_info(),
            authority: ctx.accounts.taker.to_account_info(),
        };
        let cpi_ctx_taker = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_taker
        );
        token::transfer(cpi_ctx_taker, ctx.accounts.escrow_state.expected_amount)?;

        // 2. Transfer vault tokens to taker
        let cpi_accounts_vault = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.taker_receive_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        let cpi_ctx_vault = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_vault,
            signer,
        );
        token::transfer(cpi_ctx_vault, ctx.accounts.escrow_state.amount)?;

        // 3. Close vault
        let close_accounts = token::CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_accounts,
            signer,
        );
        token::close_account(close_ctx)?;

        msg!("Exchange complete! Vault closed.");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(mut)]
    pub maker_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = maker,
        space = 8 + 32 + 8 + 8 + 8,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_state: Account<'info, EscrowAccount>,
    #[account(
        init,
        payer = maker,
        seeds = [b"vault", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump,
        token::mint = maker_token_account_mint,
        token::authority = escrow_state,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub maker_token_account_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(mut)]
    pub maker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow", maker.key().as_ref(), escrow_state.seed.to_le_bytes().as_ref()],
        bump,
        close = maker
    )]
    pub escrow_state: Account<'info, EscrowAccount>,
    #[account(
        mut,
        seeds = [b"vault", maker.key().as_ref(), escrow_state.seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Exchange<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(mut)]
    pub taker_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub taker_receive_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub maker: SystemAccount<'info>,
    #[account(mut)]
    pub maker_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"escrow", maker.key().as_ref(), escrow_state.seed.to_le_bytes().as_ref()],
        bump,
        close = maker
    )]
    pub escrow_state: Account<'info, EscrowAccount>,
    #[account(
        mut,
        seeds = [b"vault", maker.key().as_ref(), escrow_state.seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EscrowAccount {
    pub maker: Pubkey,
    pub seed: u64,
    pub amount: u64,
    pub expected_amount: u64,
}
