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
/// In Web2, the "Auction" object lives in a database.
/// In Web3, the "Auction" object is an "Account".
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionAccount {
    pub seller: Pubkey,
    pub highest_bidder: Pubkey,
    pub highest_bid: u64,
    pub is_active: bool,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let auction_account = next_account_info(accounts_iter)?;
    let user_account = next_account_info(accounts_iter)?;

    if instruction_data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }

    match instruction_data[0] {
        0 => { // Create Auction
            msg!("Instruction: Create Auction");
            let mut data = AuctionAccount::try_from_slice(&auction_account.data.borrow())?;
            data.seller = *user_account.key;
            data.is_active = true;
            data.highest_bid = 0; // Or from instruction data
            data.serialize(&mut &mut auction_account.data.borrow_mut()[..])?;
        }
        1 => { // Place Bid
            msg!("Instruction: Place Bid");
            let mut data = AuctionAccount::try_from_slice(&auction_account.data.borrow())?;
            
            // WEB2 NOTE: This is your validation logic (if amount > max)
            // The "amount" would be sent via instruction_data
            let amount = u64::from_le_bytes(instruction_data[1..9].try_into().unwrap());
            
            if amount <= data.highest_bid {
                msg!("Bid too low!");
                return Err(ProgramError::InsufficientFunds); // Custom errors better but for example
            }

            data.highest_bid = amount;
            data.highest_bidder = *user_account.key;
            data.serialize(&mut &mut auction_account.data.borrow_mut()[..])?;
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
