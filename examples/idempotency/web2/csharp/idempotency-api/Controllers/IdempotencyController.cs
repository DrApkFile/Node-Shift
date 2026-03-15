using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace idempotency_api.Controllers;

[ApiController]
[Route("api")]
public class IdempotencyController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, object> _cache = new();

    [HttpPost("orders")]
    public IActionResult CreateOrder([FromHeader(Name = "Idempotency-Key")] string? key, [FromBody] dynamic body)
    {
        if (string.IsNullOrEmpty(key)) return BadRequest("Idempotency-Key header is required");

        if (_cache.TryGetValue(key, out var cachedResponse))
        {
            return Ok(cachedResponse);
        }

        var response = new { orderId = Guid.NewGuid(), status = "Success", data = body };
        
        _cache[key] = response;

        return Created("", response);
    }
}
