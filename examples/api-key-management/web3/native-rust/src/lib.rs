use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
    sysvar::{rent::Rent, Sysvar},
};
use borsh::{BorshDeserialize, BorshSerialize};

/// WEB2 DEVELOPER NOTE:
/// In Web2, your "State" is in a database like PostgreSQL or Redis.
/// In Solana (Native Rust), your "State" is stored in "Accounts".
/// Think of an Account as a file on a global shared drive.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ApiKeyRegistry {
    pub owner: Pubkey,
    pub key_hash: [u8; 32], // We store the hash, never the raw key (Public visibility!)
    pub is_active: bool,
}

// Every Solana program has one entrance point
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    // 1. Get the account that will store our API Key info
    // WEB2 NOTE: This is like selecting a specific row in a table.
    let registry_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    // 2. Determine what action to take (Instruction)
    // For simplicity, we assume the first byte of instruction_data is the command
    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    match instruction_data[0] {
        0 => { // Create Key
            msg!("Instruction: Initialize API Key Registry");
            
            // WEB2 NOTE: We must check if the user "signed" this transaction.
            // This is like checking an Auth Header or Session Cookie.
            if !user_account.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }

            // Slice the hash from instruction data (bytes 1..33)
            let mut hash = [0u8; 32];
            hash.copy_from_slice(&instruction_data[1..33]);

            let mut registry_data = ApiKeyRegistry::try_from_slice(&registry_account.data.borrow())?;
            registry_data.owner = *user_account.key;
            registry_data.key_hash = hash;
            registry_data.is_active = true;

            // Serialize back to the account disk
            registry_data.serialize(&mut &mut registry_account.data.borrow_mut()[..])?;
        }
        1 => { // Revoke Key
            msg!("Instruction: Revoke API Key");
            let mut registry_data = ApiKeyRegistry::try_from_slice(&registry_account.data.borrow())?;
            
            // Only the owner can revoke their key
            if registry_data.owner != *user_account.key || !user_account.is_signer {
                return Err(ProgramError::AccessDenied);
            }

            registry_data.is_active = false;
            registry_data.serialize(&mut &mut registry_account.data.borrow_mut()[..])?;
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
