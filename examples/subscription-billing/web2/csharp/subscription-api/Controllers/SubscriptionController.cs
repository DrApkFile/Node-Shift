using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace subscription_api.Controllers;

[ApiController]
[Route("api/subscriptions")]
public class SubscriptionController : ControllerBase
{
    private class Subscription { public DateTime Expiry { get; set; } public string Status { get; set; } = "Active"; }
    private static readonly ConcurrentDictionary<string, Subscription> _db = new();

    [HttpPost("purchase")]
    public IActionResult Subscribe([FromBody] dynamic req)
    {
        string userId = req.userId;
        int weeks = req.weeks;
        
        var expiry = DateTime.UtcNow.AddDays(weeks * 7);
        _db[userId] = new Subscription { Expiry = expiry };
        
        return Ok(new { message = "Subscribed", expiry = expiry });
    }

    [HttpGet("status/{userId}")]
    public IActionResult GetStatus(string userId)
    {
        if (!_db.TryGetValue(userId, out var sub))
            return Ok(new { status = "None" });

        if (DateTime.UtcNow > sub.Expiry)
        {
            sub.Status = "Expired";
            return Ok(new { status = "Expired", expiry = sub.Expiry });
        }

        return Ok(new { status = "Active", expiry = sub.Expiry });
    }
}
