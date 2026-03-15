using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace escrow_engine_api.Controllers;

[ApiController]
[Route("api/escrow")]
public class EscrowController : ControllerBase
{
    private enum EscrowStatus { Pending, Released, Refunded }

    private class Escrow {
        public string Buyer { get; set; } = "";
        public string Seller { get; set; } = "";
        public double Amount { get; set; }
        public EscrowStatus Status { get; set; } = EscrowStatus.Pending;
    }

    private static readonly ConcurrentDictionary<string, Escrow> _escrows = new();

    [HttpPost("init")]
    public IActionResult Init([FromBody] dynamic req) {
        string id = req.id;
        _escrows[id] = new Escrow { 
            Buyer = req.buyer, 
            Seller = req.seller, 
            Amount = req.amount 
        };
        return Created("", new { message = "Escrow created" });
    }

    [HttpPost("{id}/release")]
    public IActionResult Release(string id, [FromBody] dynamic req) {
        if (!_escrows.TryGetValue(id, out var escrow) || escrow.Status != EscrowStatus.Pending)
            return BadRequest("Invalid escrow");

        string actor = req.actor;
        if (actor != escrow.Buyer) return Forbid();

        escrow.Status = EscrowStatus.Released;
        return Ok(new { status = "Released", msg = $"Transferring {escrow.Amount} to {escrow.Seller}" });
    }
}
