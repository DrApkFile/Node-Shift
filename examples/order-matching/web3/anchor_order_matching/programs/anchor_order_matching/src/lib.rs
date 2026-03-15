use anchor_lang::prelude::*;

declare_id!("3qWdfedEMajVfoF7CgHvoCPy7Ddd7r1pWiHYGmbxQ3fj");

#[program]
pub mod anchor_order_matching {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let book = &mut ctx.accounts.order_book;
        book.bids = Vec::new();
        book.asks = Vec::new();
        msg!("Order Book Initialized");
        Ok(())
    }

    pub fn place_limit_order(ctx: Context<PlaceOrder>, side: u8, price: u64, quantity: u64) -> Result<()> {
        let book = &mut ctx.accounts.order_book;
        let mut remaining = quantity;

        if side == 0 { // BUY (Match with ASKS)
            let mut i = 0;
            while i < book.asks.len() && remaining > 0 {
                if price >= book.asks[i].price {
                    let match_qty = std::cmp::min(remaining, book.asks[i].quantity);
                    emit!(TradeEvent {
                        maker: book.asks[i].trader,
                        taker: ctx.accounts.trader.key(),
                        price: book.asks[i].price,
                        quantity: match_qty,
                        side: 0,
                    });
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
                book.bids.push(Order { trader: ctx.accounts.trader.key(), price, quantity: remaining });
                book.bids.sort_by(|a, b| b.price.cmp(&a.price));
            }
        } else { // SELL (Match with BIDS)
            let mut i = 0;
            while i < book.bids.len() && remaining > 0 {
                if price <= book.bids[i].price {
                    let match_qty = std::cmp::min(remaining, book.bids[i].quantity);
                    emit!(TradeEvent {
                        maker: book.bids[i].trader,
                        taker: ctx.accounts.trader.key(),
                        price: book.bids[i].price,
                        quantity: match_qty,
                        side: 1,
                    });
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
                book.asks.push(Order { trader: ctx.accounts.trader.key(), price, quantity: remaining });
                book.asks.sort_by(|a, b| a.price.cmp(&b.price));
            }
        }

        msg!("Order processed. Remaining: {}", remaining);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 4 + (20 * 48) + 4 + (20 * 48))] // Approx space for 20 orders each side
    pub order_book: Account<'info, OrderBookAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub order_book: Account<'info, OrderBookAccount>,
    pub trader: Signer<'info>,
}

#[account]
pub struct OrderBookAccount {
    pub bids: Vec<Order>,
    pub asks: Vec<Order>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Order {
    pub trader: Pubkey,
    pub price: u64,
    pub quantity: u64,
}

#[event]
pub struct TradeEvent {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub price: u64,
    pub quantity: u64,
    pub side: u8, // 0 buy, 1 sell
}
