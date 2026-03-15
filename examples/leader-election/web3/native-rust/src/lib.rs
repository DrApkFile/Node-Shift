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
/// In Web2, we use a shared database or Redis with a TTL (Time To Live).
/// In Solana, we use an Account to store the Leader Pubkey and an expiry Slot.
/// A Slot is roughly 400ms on Solana.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct LeaderAccount {
    pub leader: Pubkey,
    pub expiry_slot: u64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let state_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    let mut state = LeaderAccount::try_from_slice(&state_account.data.borrow())?;
    
    // Get current time (Slot)
    let clock = Clock::get()?;
    let current_slot = clock.slot;

    match instruction_data[0] {
        0 => { // Claim Leadership
            msg!("Instruction: Claim Leadership");
            
            // Check if vacant or expired
            // WEB2 NOTE: Equivalent to `if (now > expiry_at) { leader = candidate }`
            if state.expiry_slot < current_slot || state.leader == Pubkey::default() {
                state.leader = *user_account.key;
                state.expiry_slot = current_slot + 100; // Leader for ~40 seconds
                msg!("New leader elected: {}", state.leader);
            } else if state.leader == *user_account.key {
                // Renew
                state.expiry_slot = current_slot + 100;
                msg!("Leadership renewed for: {}", state.leader);
            } else {
                msg!("Leadership claim denied. Current leader: {}", state.leader);
                return Err(ProgramError::AccessDenied);
            }

            state.serialize(&mut &mut state_account.data.borrow_mut()[..])?;
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
