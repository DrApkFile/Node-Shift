use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
};
use borsh::{BorshDeserialize, BorshSerialize};

/// WEB2 DEVELOPER NOTE:
/// In Web2, a background worker polls a DB or Message Queue for state `PENDING`.
/// In Web3, each "Job" is a persistent Account on-chain.
/// Workers "Sign" a transaction to claim an account and mark it `CLAIMED`.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum JobStatus {
    Pending,
    Claimed,
    Completed,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct JobAccount {
    pub creator: Pubkey,
    pub worker: Pubkey,
    pub bounty: u64,
    pub status: JobStatus,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let job_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    let mut job = JobAccount::try_from_slice(&job_account.data.borrow())?;

    match instruction_data[0] {
        0 => { // Post Job (Initialize)
            msg!("Instruction: Post Job");
            job.creator = *user_account.key;
            job.status = JobStatus::Pending;
            job.bounty = 1000000; // Mock bounty in lamports
        }
        1 => { // Claim Job
            msg!("Instruction: Claim Job");
            if !matches!(job.status, JobStatus::Pending) {
                return Err(ProgramError::AccessDenied);
            }
            job.status = JobStatus::Claimed;
            job.worker = *user_account.key;
        }
        2 => { // Complete Job
            msg!("Instruction: Complete Job");
            if job.worker != *user_account.key || !matches!(job.status, JobStatus::Claimed) {
                return Err(ProgramError::AccessDenied);
            }
            job.status = JobStatus::Completed;
            // WEB2 NOTE: Here is where the "Payout" trigger happens.
            // On-chain, this might trigger a vault transfer to the worker.
            msg!("Job completed. Worker {} paid.", job.worker);
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    job.serialize(&mut &mut job_account.data.borrow_mut()[..])?;

    Ok(())
}
