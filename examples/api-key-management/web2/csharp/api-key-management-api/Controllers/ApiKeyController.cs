using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using System.Collections.Concurrent;

namespace api_key_management_api.Controllers;

[ApiController]
[Route("api")]
public class ApiKeyController : ControllerBase
{
    // Mock DB: SHA256 Hash -> Metadata
    private static readonly ConcurrentDictionary<string, KeyMetadata> _keysDb = new();

    public class KeyMetadata
    {
        public string UserId { get; set; } = string.Empty;
        public string Plan { get; set; } = "basic";
        public bool IsActive { get; set; } = true;
        public int UsageCount { get; set; } = 0;
    }

    public class CreateKeyRequest { public string UserId { get; set; } = string.Empty; public string Plan { get; set; } = "basic"; }

    private static string HashKey(string key)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(bytes).ToLower();
    }

    [HttpPost("keys")]
    public IActionResult CreateKey([FromBody] CreateKeyRequest request)
    {
        if (string.IsNullOrEmpty(request.UserId)) return BadRequest(new { error = "UserId required" });

        string rawKey = $"sk_test_{Guid.NewGuid():n}";
        string hashedKey = HashKey(rawKey);

        _keysDb[hashedKey] = new KeyMetadata { UserId = request.UserId, Plan = request.Plan };

        return Created("", new { message = "API Key created. Save it now.", apiKey = rawKey });
    }

    [HttpGet("protected-data")]
    public IActionResult GetProtectedData()
    {
        string? authHeader = Request.Headers.Authorization;
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            return Unauthorized(new { error = "Missing or invalid Authorization header" });

        string token = authHeader["Bearer ".Length..];
        string hashedToken = HashKey(token);

        if (!_keysDb.TryGetValue(hashedToken, out var meta) || !meta.IsActive)
            return Unauthorized(new { error = "Invalid or revoked key" });

        meta.UsageCount++;
        return Ok(new { 
            message = "Access granted to .NET API!", 
            userId = meta.UserId, 
            data = "Highly sensitive C# records" 
        });
    }
}
