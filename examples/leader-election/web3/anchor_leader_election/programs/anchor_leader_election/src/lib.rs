use anchor_lang::prelude::*;

declare_id!("EC6dqnTdQFabKC4qzf5jzLhEDDLRZ2XyhzFYhTNF2cHQ");

#[program]
pub mod anchor_leader_election {
    use super::*;

    /// [CORE PATTERN LOGIC]
    /// Initializes the election state and the candidate pool.
    pub fn initialize(ctx: Context<Initialize>, epoch_duration: i64) -> Result<()> {
        let state = &mut ctx.accounts.election_state;
        let clock = Clock::get()?;
        state.active_leader = Pubkey::default();
        state.epoch_end = clock.unix_timestamp + epoch_duration;
        state.epoch_duration = epoch_duration;
        
        ctx.accounts.electoral_pool.candidates = Vec::new();
        
        msg!("Election Engine Initialized. First Epoch Ends: {}", state.epoch_end);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Allows a user to register themselves as a candidate for the leader role.
    pub fn register_candidate(ctx: Context<RegisterCandidate>) -> Result<()> {
        let pool = &mut ctx.accounts.electoral_pool;
        let candidate_key = ctx.accounts.candidate.key();

        if pool.candidates.iter().any(|c| c.pubkey == candidate_key) {
            return err!(ErrorCode::AlreadyCandidate);
        }

        pool.candidates.push(Candidate {
            pubkey: candidate_key,
            votes: 0,
        });

        msg!("New Candidate Registered: {:?}", candidate_key);
        Ok(())
    }

    /// [POV SIMULATION HELPER]
    /// Programmatically seeds the pool with mock candidates for demonstration purposes.
    /// This is used to simulate a multi-node network without requiring manual registration.
    pub fn seed_candidates(ctx: Context<SeedCandidates>, candidates: Vec<Pubkey>) -> Result<()> {
        let pool = &mut ctx.accounts.electoral_pool;
        for key in candidates {
            if !pool.candidates.iter().any(|c| c.pubkey == key) {
                pool.candidates.push(Candidate {
                    pubkey: key,
                    votes: 0,
                });
            }
        }
        msg!("Seeded {} Mock Candidates", pool.candidates.len());
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Participants use their governance power (weight) to vote for candidates.
    pub fn vote(ctx: Context<Vote>, candidate_index: u8, weight: u64) -> Result<()> {
        let pool = &mut ctx.accounts.electoral_pool;
        let idx = candidate_index as usize;

        if idx >= pool.candidates.len() {
            return err!(ErrorCode::InvalidCandidate);
        }

        // In a real app, 'weight' would be derived from Token Balance or Reputation PDA
        // Here we accept it as an input to simulate the "Reputation Scoring" logic
        pool.candidates[idx].votes += weight;

        msg!("Voted for Candidate {:?} with weight {}", pool.candidates[idx].pubkey, weight);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Selects a new leader based on the highest vote count in the current pool.
    /// Resets vote counts and sets the next epoch deadline.
    pub fn resolve_election(ctx: Context<ResolveElection>) -> Result<()> {
        let state = &mut ctx.accounts.election_state;
        let pool = &mut ctx.accounts.electoral_pool;
        let clock = Clock::get()?;

        if clock.unix_timestamp < state.epoch_end {
            return err!(ErrorCode::EpochNotEnded);
        }

        // Select winner (candidate with most votes)
        let mut winner = Pubkey::default();
        let mut max_votes = 0;

        for candidate in pool.candidates.iter() {
            if candidate.votes > max_votes {
                max_votes = candidate.votes;
                winner = candidate.pubkey;
            }
        }

        if winner != Pubkey::default() {
            state.active_leader = winner;
            emit!(ElectionResolved {
                leader: winner,
                votes: max_votes,
                timestamp: clock.unix_timestamp,
            });
            msg!("Election Resolved! New Leader: {:?}", winner);
        } else {
            msg!("No votes cast. Leader remains vacant.");
        }

        // Reset for next epoch
        state.epoch_end = clock.unix_timestamp + state.epoch_duration;
        for candidate in pool.candidates.iter_mut() {
            candidate.votes = 0;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 32 + 8 + 8)]
    pub election_state: Account<'info, ElectionState>,
    #[account(init, payer = admin, space = 8 + 4 + (10 * 40))] // space for 10 candidates
    pub electoral_pool: Account<'info, ElectoralPool>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterCandidate<'info> {
    #[account(mut)]
    pub electoral_pool: Account<'info, ElectoralPool>,
    pub candidate: Signer<'info>,
}

#[derive(Accounts)]
pub struct SeedCandidates<'info> {
    #[account(mut)]
    pub electoral_pool: Account<'info, ElectoralPool>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub electoral_pool: Account<'info, ElectoralPool>,
    pub voter: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveElection<'info> {
    #[account(mut)]
    pub election_state: Account<'info, ElectionState>,
    #[account(mut)]
    pub electoral_pool: Account<'info, ElectoralPool>,
}

#[account]
pub struct ElectionState {
    pub active_leader: Pubkey,
    pub epoch_end: i64,
    pub epoch_duration: i64,
}

#[account]
pub struct ElectoralPool {
    pub candidates: Vec<Candidate>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Candidate {
    pub pubkey: Pubkey,
    pub votes: u64,
}

#[event]
pub struct ElectionResolved {
    pub leader: Pubkey,
    pub votes: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Candidate is already registered.")]
    AlreadyCandidate,
    #[msg("Invalid candidate index.")]
    InvalidCandidate,
    #[msg("Current epoch has not ended yet.")]
    EpochNotEnded,
}
