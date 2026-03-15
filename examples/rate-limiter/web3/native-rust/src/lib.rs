use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    sysvar::{clock::Clock, Sysvar},
};
use borsh::{BorshDeserialize, BorshSerialize};

/// WEB2 DEVELOPER NOTE:
/// In Web2, we use a shared cache (Redis/RAM) keyed by IP or API Key.
/// In Solana, we can use a per-user "Rate Limit Account" or "User State Account".
/// This implementation tracks the count of requests within a slot window.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RateLimitAccount {
    pub last_request_slot: u64,
    pub request_count: u16,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let limit_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    let mut state = RateLimitAccount::try_from_slice(&limit_account.data.borrow())?;
    let clock = Clock::get()?;
    let current_slot = clock.slot;

    // WEB2 NOTE: A Solana "Slot" is roughly 400ms. 
    // Here we define a "Window" of 100 slots (~40 seconds).
    let window_slots = 100;
    let max_requests = 10;

    if current_slot - state.last_request_slot > window_slots {
        // Window expired, reset
        state.request_count = 1;
        state.last_request_slot = current_slot;
        msg!("Rate limit window reset for user: {}", user_account.key);
    } else {
        // Within window, check limit
        if state.request_count >= max_requests {
            msg!("Error: Rate limit exceeded on-chain!");
            return Err(ProgramError::InvalidArgument); // Or custom error
        }
        state.request_count += 1;
        msg!("Request {}/{} within window", state.request_count, max_requests);
    }

    state.serialize(&mut &mut limit_account.data.borrow_mut()[..])?;

    Ok(())
}
