use anchor_lang::prelude::*;

declare_id!("7AgxB5wUW2tYksiWXW9pvmdiGCKRYSgL5sNcuXSm7Z5T");

#[program]
pub mod anchor_job_queue {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Web2 queues (BullMQ, Celery) use a message broker + managed workers.
    // On Solana, the "queue" is the set of pending JobAccount PDAs.
    // The "worker" is an external Keeper bot that calls `process_job`.
    //
    // All 2 instructions below are [CORE PATTERN LOGIC].
    // The Keeper bot is off-chain infrastructure, not part of the program.
    //
    // Key Web2 Concepts Mapped:
    //   - `queue.add(job, delay)` (BullMQ) → `post_job` (creates PDA)
    //   - Worker `job.process()`           → `process_job` (Keeper calls this)
    //   - Retry logic                      → Not on L1; must be implemented in Keeper
    //   - Queue dashboard (Bull Board)     → Fetch all JobAccount PDAs via RPC
    //   - Job completion flag              → `close = keeper` (PDA is deleted on success)
    //   - Bounty / worker reward           → SOL transferred to `keeper` via `close` attribute
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates a new job on-chain with a future trigger time and a SOL bounty.
    /// The bounty is locked in the JobAccount itself. The Keeper earns it on execution.
    /// Web2 equivalent: `queue.add("sendEmail", data, { delay: 60000 })` in BullMQ.
    pub fn post_job(ctx: Context<PostJob>, bounty: u64, delay: i64) -> Result<()> {
        let job = &mut ctx.accounts.job_account;
        let clock = Clock::get()?;
        
        job.creator = ctx.accounts.creator.key();
        job.bounty = bounty;
        job.trigger_time = clock.unix_timestamp + delay;
        job.status = JobStatus::Pending;

        // WEB2 NOTE: Transferring bounty to the job account vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: job.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, bounty)?;

        msg!("Job posted. Ready at: {}. Bounty: {}", job.trigger_time, bounty);
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Called by an external Keeper bot when the trigger_time has passed.
    /// Verifies the time condition, then closes the account via `close = keeper`
    /// which atomically sends the bounty + rent to the Keeper as a reward.
    ///
    /// Web2 equivalent: The background worker `process(job)` function.
    /// Key difference: The Keeper must be incentivized (via the bounty) to run —
    /// there is no automatic scheduling on L1.
    pub fn process_job(ctx: Context<ProcessJob>) -> Result<()> {
        let job = &ctx.accounts.job_account;
        let clock = Clock::get()?;

        // Ensure the trigger condition is met
        require!(
            clock.unix_timestamp >= job.trigger_time,
            JobError::JobNotReady
        );

        // Success: The #[account(close = keeper)] handles the payout of bounty + rent
        msg!("Crank successful! Keeper rewarded.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct PostJob<'info> {
    #[account(init, payer = creator, space = 8 + 32 + 8 + 8 + 1)]
    pub job_account: Account<'info, JobAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(
        mut,
        close = creator,
        has_one = creator,
        constraint = job_account.status == JobStatus::Pending @ JobError::InvalidJobState
    )]
    pub job_account: Account<'info, JobAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProcessJob<'info> {
    #[account(
        mut,
        close = keeper,
        constraint = job_account.status == JobStatus::Pending @ JobError::InvalidJobState
    )]
    pub job_account: Account<'info, JobAccount>,
    #[account(mut)]
    pub keeper: Signer<'info>,
}

#[account]
pub struct JobAccount {
    pub creator: Pubkey,
    pub bounty: u64,
    pub trigger_time: i64,
    pub status: JobStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum JobStatus {
    Pending,
    Claimed,
    Completed,
}

#[error_code]
pub enum JobError {
    #[msg("This job is already claimed or completed.")]
    JobNotAvailable,
    #[msg("The job must be in Claimed status to be completed.")]
    InvalidJobState,
    #[msg("The job trigger condition has not been met yet.")]
    JobNotReady,
}
