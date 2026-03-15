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
/// In Web2, your middleware checks a Session/JWT claim for "Role".
/// In Solana, roles are stored in an "Identity Account" or "Profile Account".
/// The program checks the account data and ensures the `Signer` matches the `owner`.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum UserRole {
    Viewer,
    Editor,
    Admin,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserProfile {
    pub owner: Pubkey,
    pub role: UserRole,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let profile_account = next_account_info(accounts_iter)?;
    let user_signer = next_account_info(accounts_iter)?;

    let profile = UserProfile::try_from_slice(&profile_account.data.borrow())?;

    // Must be signed by owner
    if !user_signer.is_signer || profile.owner != *user_signer.key {
        return Err(ProgramError::AccessDenied);
    }

    match instruction_data[0] {
        0 => { // Admin Operation
            msg!("Instruction: Admin Operation");
            if !matches!(profile.role, UserRole::Admin) {
                msg!("Error: Insufficient permissions (Non-Admin)");
                return Err(ProgramError::AccessDenied);
            }
            msg!("Success: Admin operation executed.");
        }
        1 => { // Editor Operation
            msg!("Instruction: Editor Operation");
            if matches!(profile.role, UserRole::Viewer) {
                msg!("Error: Viewer cannot edit.");
                return Err(ProgramError::AccessDenied);
            }
            msg!("Success: Editor operation executed.");
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
