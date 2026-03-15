using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace rate_limiter_api.Controllers;

[ApiController]
[Route("api")]
public class RateLimiterController : ControllerBase
{
    private class RateRecord { public int Count; public DateTime WindowStart; }
    private static readonly ConcurrentDictionary<string, RateRecord> _store = new();
    
    private const int MaxRequests = 5;
    private static readonly TimeSpan WindowSize = TimeSpan.FromMinutes(1);

    [HttpGet("resource")]
    public IActionResult GetResource()
    {
        string? ip = Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;

        if (!_store.TryGetValue(ip, out var record) || (now - record.WindowStart) > WindowSize)
        {
            _store[ip] = new RateRecord { Count = 1, WindowStart = now };
            return Ok(new { message = "Success" });
        }

        if (record.Count >= MaxRequests)
        {
            int waitTime = (int)(WindowSize - (now - record.WindowStart)).TotalSeconds;
            return StatusCode(429, new { error = "Rate limit exceeded", retryAfter = $"{waitTime}s" });
        }

        record.Count++;
        return Ok(new { message = "Success", remaining = MaxRequests - record.Count });
    }
}
