use anchor_lang::prelude::*;

declare_id!("GDXdtax9eoW2DSDQUkweFdEwyMq8foKRq3oo56hZUQM");

#[program]
pub mod anchor_leaderboard {
    use super::*;

    /// WEB2 DEVELOPER NOTE:
    /// In Anchor, we manage the leaderboard as a single account 
    /// containing a vector of scores. 
    /// This is like a single row in a database that stores a JSON array of top scores.

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        leaderboard.entries = Vec::new();
        msg!("On-chain leaderboard initialized.");
        Ok(())
    }

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
