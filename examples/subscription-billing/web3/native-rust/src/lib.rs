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
/// In Web2, we use `DateTime.UtcNow` and a DB field.
/// In Solana, "Time" is either the `Slot` or `UnixTimestamp` in the `Clock` sysvar.
/// This implementation uses `Clock::get()?.unix_timestamp` to track expiry.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct SubscriptionAccount {
    pub owner: Pubkey,
    pub expiry_timestamp: i64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let sub_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    let mut state = SubscriptionAccount::try_from_slice(&sub_account.data.borrow())?;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    match instruction_data[0] {
        0 => { // Buy Subscription
            msg!("Instruction: Buy Subscription");
            // bytes 1-9 = duration in seconds (mock u64)
            let duration = i64::from_le_bytes(instruction_data[1..9].try_into().unwrap());
            
            state.owner = *user_account.key;
            state.expiry_timestamp = now + duration;
            msg!("Subscription activated for {} until timestamp {}", user_account.key, state.expiry_timestamp);
        }
        1 => { // Check Status
            msg!("Instruction: Access Resource");
            if now > state.expiry_timestamp {
                msg!("Error: Subscription expired.");
                return Err(ProgramError::AccessDenied);
            }
            msg!("Access granted. Subscription valid.");
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    state.serialize(&mut &mut sub_account.data.borrow_mut()[..])?;

    Ok(())
}
