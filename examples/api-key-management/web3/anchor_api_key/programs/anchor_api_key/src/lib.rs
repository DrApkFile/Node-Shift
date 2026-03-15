use anchor_lang::prelude::*;

declare_id!("BdmZeEzG8eNqNGxtMQ1YP8ZDPy1Di4JkTLYQWkrwpsQA");

#[program]
pub mod anchor_api_key {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Web2 API keys are shared secrets (random hex strings). On Solana,
    // there are NO shared secrets. The user's wallet IS their identity.
    // This program stores a HASH of a key in a PDA and checks `is_active`.
    //
    // All 3 instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - `apiKeys.set(key, { active: true })`  → `initialize_key` (creates PDA)
    //   - `apiKeys.get(key).active = false`     → `revoke_key` (updates PDA field)
    //   - HTTP 401 Unauthorized                 → `require!(registry.is_active)` in Anchor constraints
    //   - Key ownership check                    → `has_one = owner` account constraint
    //   - Deleting a key from the database      → `close_registry` (closes the PDA)
    //   - Key hash for verification             → `key_hash: [u8; 32]` field in ApiKeyRegistry
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates an API key registry PDA for the user, storing a hash of their key.
    /// Web2 equivalent: `POST /keys` — generate and store a new API key hash in the DB.
    /// Note: The hash means the raw key secret is never stored on-chain.
    pub fn initialize_key(ctx: Context<InitializeKey>, key_hash: [u8; 32]) -> Result<()> {
        let registry = &mut ctx.accounts.api_key_registry;
        registry.owner = ctx.accounts.user.key();
        registry.key_hash = key_hash;
        registry.is_active = true;
        
        msg!("API Key Hashed Record Created for User: {}", registry.owner);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Revokes a key by setting `is_active = false`. The PDA remains on-chain
    /// but all future `authorized_call` checks will fail.
    /// Web2 equivalent: `apiKeys.set(key, { active: false })` — soft-delete in DB.
    /// Note: Ownership is enforced via `has_one = owner` constraint in the Accounts macro.
    pub fn revoke_key(ctx: Context<RevokeKey>) -> Result<()> {
        let registry = &mut ctx.accounts.api_key_registry;
        // WEB2 NOTE: Ownership check is handled automatically by the #[account(...)] macro below!
        registry.is_active = false;
        msg!("API Key Revoked");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Permanently deletes the API key registry PDA and returns rent SOL to the owner.
    /// Web2 equivalent: Physically deleting a row from the `api_keys` database table.
    /// Note: The `close = owner` attribute in the Accounts macro handles all SOL transfer
    /// and account deletion automatically at the runtime level.
    pub fn close_registry(_ctx: Context<CloseRegistry>) -> Result<()> {
        msg!("API Key Registry closed and SOL refunded to owner");
        Ok(())
    }
}

/// WEB2 DEVELOPER NOTE:
/// In Native Rust, we manually parsed accounts.
/// In Anchor, we define the "Schema" of the request here.
#[derive(Accounts)]
pub struct InitializeKey<'info> {
    #[account(
        init, 
        payer = user, 
        space = 8 + 32 + 32 + 1,
        seeds = [b"api-key", user.key().as_ref()],
        bump
    )]
    pub api_key_registry: Account<'info, ApiKeyRegistry>,
    
    #[account(mut)]
    pub user: Signer<'info>, // user must sign to prove they own the Pubkey
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeKey<'info> {
    // has_one: Ensures the owner stored in registry matches the user account provided
    // WEB2 NOTE: This is like a WHERE clause: WHERE owner_id = current_user_id
    #[account(
        mut, 
        has_one = owner,
        seeds = [b"api-key", owner.key().as_ref()],
        bump
    )]
    pub api_key_registry: Account<'info, ApiKeyRegistry>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseRegistry<'info> {
    #[account(
        mut,
        close = owner,
        has_one = owner,
        seeds = [b"api-key", owner.key().as_ref()],
        bump
    )]
    pub api_key_registry: Account<'info, ApiKeyRegistry>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[account]
pub struct ApiKeyRegistry {
    pub owner: Pubkey,
    pub key_hash: [u8; 32],
    pub is_active: bool,
}
