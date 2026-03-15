use anchor_lang::prelude::*;

declare_id!("GDXdtax9eoW2DSDQUkweFdEwyMq8foKRq3oo56hZUQM");

#[program]
pub mod anchor_leaderboard {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Web2 leaderboards use Redis Sorted Sets (`ZADD`, `ZREVRANGE`)
    // or a DB table with an indexed score column.
    // On Solana, the leaderboard is a single PDA account holding a Vec.
    // Space is preallocated at creation, so max entries are fixed at compile time.
    //
    // All 2 instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - Redis `ZADD leaderboard score player`  → `submit_score` (push + sort + truncate)
    //   - Redis `ZREVRANGE leaderboard 0 9`      → Fetch the Leaderboard PDA and read `.entries`
    //   - Database INSERT with upsert on score   → push + sort (no upsert — multiple entries allowed)
    //   - Capped top-10 list                     → `entries.truncate(10)` after each sort
    //   - Admin-only setup                       → `initialize` requires an `admin: Signer`
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates the on-chain leaderboard account with a pre-allocated fixed capacity.
    /// Web2 equivalent: Creating a `leaderboard` table in your DB, or a Redis sorted set.
    /// Important: Space is fixed at `8 + 4 + (10 * 40)` bytes; increasing capacity requires
    /// closing and re-creating the account (on-chain accounts cannot be resized).
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        leaderboard.entries = Vec::new();
        msg!("On-chain leaderboard initialized.");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Submits a score, keeps the list sorted descending, and caps to top 10.
    /// Web2 equivalent: `ZADD leaderboard score player` + `ZREMRANGEBYRANK leaderboard 0 -11`.
    /// Note: The player's wallet pubkey is their identity — no username, no auth token.
    pub fn submit_score(ctx: Context<SubmitScore>, score: u64) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        let player = ctx.accounts.player.key();

        // WEB2 NOTE: Functional approach to sorting and limiting the list
        leaderboard.entries.push(ScoreEntry { player, score });
        leaderboard.entries.sort_by(|a, b| b.score.cmp(&a.score));
        
        if leaderboard.entries.len() > 10 {
            leaderboard.entries.truncate(10);
        }

        msg!("Score {} submitted for player: {}", score, player);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 4 + (10 * (32 + 8)))]
    pub leaderboard: Account<'info, Leaderboard>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitScore<'info> {
    #[account(mut)]
    pub leaderboard: Account<'info, Leaderboard>,
    pub player: Signer<'info>,
}

#[account]
pub struct Leaderboard {
    pub entries: Vec<ScoreEntry>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ScoreEntry {
    pub player: Pubkey,
    pub score: u64,
}
