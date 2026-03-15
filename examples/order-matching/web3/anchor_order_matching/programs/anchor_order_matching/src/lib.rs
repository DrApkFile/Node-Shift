use anchor_lang::prelude::*;

declare_id!("3qWdfedEMajVfoF7CgHvoCPy7Ddd7r1pWiHYGmbxQ3fj");

#[program]
pub mod anchor_order_matching {
    use super::*;

    // ============================================================
    // WEB2 DEVELOPER OVERVIEW
    // ============================================================
    // Web2 order matching engines (e.g., exchange backends) run in-memory
    // with a central matching thread. On Solana, the order book is a single
    // PDA account holding two sorted Vecs (bids and asks).
    //
    // All 2 instructions below are [CORE PATTERN LOGIC].
    //
    // Key Web2 Concepts Mapped:
    //   - In-memory order book (bids/asks arrays)   → `OrderBookAccount` PDA with `Vec<Order>`
    //   - `exchange.placeOrder(side, price, qty)`   → `place_limit_order` instruction
    //   - Price-time priority matching loop         → while loop over asks/bids with price check
    //   - Trade fill event / WebSocket broadcast    → `emit!(TradeEvent { ... })` (Solana program log)
    //   - Resting order (unfilled remainder)        → pushed to bids/asks Vec after partial fill
    //   - Order book sorted by price                → `sort_by` after each insertion
    // ============================================================

    /// [CORE PATTERN LOGIC]
    /// Creates the OrderBook PDA with empty bid and ask lists.
    /// Web2 equivalent: Allocating an in-memory order book when the exchange boots.
    /// Note: Space is fixed at creation. Max ~20 orders per side due to account size limit.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let book = &mut ctx.accounts.order_book;
        book.bids = Vec::new();
        book.asks = Vec::new();
        msg!("Order Book Initialized");
        Ok(())
    }

    /// [CORE PATTERN LOGIC]
    /// Places a limit order. First attempts to match against the opposite side,
    /// emitting a `TradeEvent` for each fill. Any unfilled remainder is inserted
    /// into the resting book and re-sorted by price.
    ///
    /// Web2 equivalent: `exchange.placeOrder({ side, price, quantity })` with
    /// matching engine running against the live order book.
    ///
    /// Note: Settlement is simulated (no real token transfers here).
    /// In production, SPL Token transfers would be invoked via CPI for each trade fill.
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
