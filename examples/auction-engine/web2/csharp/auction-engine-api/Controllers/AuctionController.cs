using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace auction_engine_api.Controllers;

[ApiController]
[Route("api/auctions")]
public class AuctionController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, Auction> _auctions = new();

    public class Auction
    {
        public string ItemId { get; set; } = string.Empty;
        public string Seller { get; set; } = string.Empty;
        public double HighestBid { get; set; }
        public string? HighestBidder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CreateAuctionRequest { public string ItemId { get; set; } = string.Empty; public string Seller { get; set; } = string.Empty; public double StartPrice { get; set; } }
    public class BidRequest { public string Bidder { get; set; } = string.Empty; public double Amount { get; set; } }

    [PostMapping]
    public IActionResult CreateAuction([FromBody] CreateAuctionRequest request)
    {
        var auction = new Auction { ItemId = request.ItemId, Seller = request.Seller, HighestBid = request.StartPrice };
        _auctions[request.ItemId] = auction;
        return Created("", auction);
    }

    [HttpPost("{itemId}/bid")]
    public IActionResult PlaceBid(string itemId, [FromBody] BidRequest request)
    {
        if (!_auctions.TryGetValue(itemId, out var auction) || !auction.IsActive)
            return NotFound("Auction not found");

        if (request.Amount <= auction.HighestBid)
            return BadRequest($"Bid must be higher than {auction.HighestBid}");

        auction.HighestBid = request.Amount;
        auction.HighestBidder = request.Bidder;

        return Ok(new { message = "Bid accepted", highestBid = auction.HighestBid });
    }
}
