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
/// In Web2, an Order Book is a complex data structure in RAM.
/// In Solana, the entire Order Book must be stored in an Account.
/// Because of account size limits, we implement a "Lite" order book with fixed entries.
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct LimitOrder {
    pub trader: Pubkey,
    pub price: u64,
    pub quantity: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct OrderBook {
    pub bids: Vec<LimitOrder>, // Sorted Price DESC
    pub asks: Vec<LimitOrder>, // Sorted Price ASC
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let book_account = next_account_info(accounts_iter)?;
    let trader_account = next_account_info(accounts_iter)?;

    let mut book = OrderBook::try_from_slice(&book_account.data.borrow())?;

    // instruction_data[0] = Side (0: BUY, 1: SELL)
    // bytes 1-9 = Price
    // bytes 9-17 = Qty
    let side = instruction_data[0];
    let price = u64::from_le_bytes(instruction_data[1..9].try_into().unwrap());
    let qty = u64::from_le_bytes(instruction_data[9..17].try_into().unwrap());

    msg!("New Order: Side {}, Price {}, Qty {}", side, price, qty);

    let mut remaining = qty;

    if side == 0 { // BUY
        let mut i = 0;
        while i < book.asks.len() && remaining > 0 {
            if price >= book.asks[i].price {
                let match_qty = std::cmp::min(remaining, book.asks[i].quantity);
                remaining -= match_qty;
                book.asks[i].quantity -= match_qty;
                if book.asks[i].quantity == 0 {
                    book.asks.remove(i);
                } else {
                    i += 1;
                }
            } else {
                break;
            }
        }
        if remaining > 0 {
            book.bids.push(LimitOrder { trader: *trader_account.key, price, quantity: remaining });
            book.bids.sort_by(|a, b| b.price.cmp(&a.price));
        }
    } else { // SELL
        let mut i = 0;
        while i < book.bids.len() && remaining > 0 {
            if price <= book.bids[i].price {
                let match_qty = std::cmp::min(remaining, book.bids[i].quantity);
                remaining -= match_qty;
                book.bids[i].quantity -= match_qty;
                if book.bids[i].quantity == 0 {
                    book.bids.remove(i);
                } else {
                    i += 1;
                }
            } else {
                break;
            }
        }
        if remaining > 0 {
            book.asks.push(LimitOrder { trader: *trader_account.key, price, quantity: remaining });
            book.asks.sort_by(|a, b| a.price.cmp(&b.price));
        }
    }

    book.serialize(&mut &mut book_account.data.borrow_mut()[..])?;
    msg!("Order Book updated on-chain.");

    Ok(())
}
