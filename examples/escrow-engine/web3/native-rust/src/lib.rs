use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program::{invoke, invoke_signed},
    sysvar::{rent::Rent, Sysvar},
    program_pack::Pack,
    program_error::ProgramError,
};
use spl_token::state::Account as TokenAccount;

// WEB2 DEVELOPER NOTE:
// In Web2, an escrow is a DB record + a payment gateway holding funds.
// In Solana, we use a Program Derived Address (PDA) as a vault.
// The program "owns" the PDA, and the PDA "owns" the token account.

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    match instruction_data[0] {
        0 => { // Initialize Escrow
            msg!("Instruction: Initialize Escrow");
            let maker = next_account_info(accounts_iter)?;
            let vault = next_account_info(accounts_iter)?;
            let escrow_state = next_account_info(accounts_iter)?;
            let token_program = next_account_info(accounts_iter)?;

            // Validation: Ensure maker signed
            if !maker.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }

            // In Native Rust, we manually handle CPI (Cross-Program Invocation)
            // Transfer tokens from maker to vault
            let transfer_ix = spl_token::instruction::transfer(
                token_program.key,
                next_account_info(accounts_iter)?.key, // maker_token_account
                vault.key,
                maker.key,
                &[],
                100, // Hardcoded amount for demo
            )?;

            invoke(
                &transfer_ix,
                &[maker.clone(), vault.clone(), token_program.clone()],
            )?;

            msg!("Escrow initialized. Tokens locked in vault.");
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
