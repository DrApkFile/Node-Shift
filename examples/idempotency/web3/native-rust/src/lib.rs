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
/// In Web2, we use a string header "Idempotency-Key" and a Cache.
/// In Solana, we use a "Nonce" or "Transaction History Account".
/// Once a transaction ID (expressed as an account here) is used, we mark it.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TransactionTracker {
    pub is_used: bool,
    pub processed_at_slot: u64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    
    // The "Tracker" account acts as the Idempotency Key storage
    let tracker_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    let mut tracker = TransactionTracker::try_from_slice(&tracker_account.data.borrow())?;

    // 1. Check if the key (Account) has already been used
    // WEB2 NOTE: This is equivalent to `if (cache.has(key)) return cached_resp;`
    if tracker.is_used {
        msg!("Error: Duplicate Transaction. Idempotency Key already used.");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // 2. Perform business logic
    msg!("Processing unique transaction for user: {}", user_account.key);

    // 3. Mark as used
    tracker.is_used = true;
    tracker.processed_at_slot = 100; // Mock current slot
    tracker.serialize(&mut &mut tracker_account.data.borrow_mut()[..])?;

    Ok(())
}
