use anchor_lang::prelude::*;

declare_id!("AuCtioN111111111111111111111111111111111111");

#[program]
pub mod anchor_auction {
    use super::*;

    /// WEB2 DEVELOPER NOTE:
    /// In Anchor, we use "Context" to access our accounts easily.
    /// This is much like how a Controller in Spring/ASP.NET receives a "State" object.

    pub fn initialize_auction(ctx: Context<InitializeAuction>, start_price: u64) -> Result<()> {
        let auction = &mut ctx.accounts.auction_account;
        auction.seller = ctx.accounts.seller.key();
        auction.highest_bid = start_price;
        auction.is_active = true;
        
        msg!("Auction Initialized for item with price: {}", start_price);
        Ok(())
    }

    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
        let auction = &mut ctx.accounts.auction_account;
        
        // WEB2 NOTE: The logic check (is bid > higher)
        if amount <= auction.highest_bid {
            return err!(AuctionError::BidTooLow);
        }

        auction.highest_bid = amount;
        auction.highest_bidder = ctx.accounts.bidder.key();
        
        msg!("New highest bid: {} by {}", amount, auction.highest_bidder);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeAuction<'info> {
    #[account(init, payer = seller, space = 8 + 32 + 32 + 8 + 1)]
    pub auction_account: Account<'info, AuctionAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub auction_account: Account<'info, AuctionAccount>,
    pub bidder: Signer<'info>,
}

#[account]
pub struct AuctionAccount {
    pub seller: Pubkey,
    pub highest_bidder: Pubkey,
    pub highest_bid: u64,
    pub is_active: bool,
}

#[error_code]
pub enum AuctionError {
    #[msg("The bid amount is too low.")]
    BidTooLow,
}
