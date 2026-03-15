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
/// In Web2, a Circuit Breaker is an object in your app's RAM.
/// In Solana, a "Circuit Breaker" or "Pause Switch" is a state inside an Account.
/// This allows an Admin to pause a program's functionality if a bug is found.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CircuitBreaker {
    pub authority: Pubkey,
    pub is_paused: bool,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let state_account = next_account_info(accounts_iter)?;
    let authority_account = next_account_info(accounts_iter)?;

    let mut state = CircuitBreaker::try_from_slice(&state_account.data.borrow())?;

    match instruction_data[0] {
        0 => { // Toggle Phase (Pause/Unpause)
            if state.authority != *authority_account.key || !authority_account.is_signer {
                return Err(ProgramError::AccessDenied);
            }
            state.is_paused = !state.is_paused;
            state.serialize(&mut &mut state_account.data.borrow_mut()[..])?;
            msg!("Circuit Breaker toggled. Paused: {}", state.is_paused);
        },
        1 => { // Business Logic Action (e.g., Transfer)
            // WEB2 NOTE: This is your 'if (breaker.state == OPEN) return 503' logic.
            if state.is_paused {
                msg!("Error: Circuit is OPEN (Program is Paused)");
                return Err(ProgramError::ProgramFailedToComplete);
            }
            msg!("Executing business logic safely...");
        },
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
