using Microsoft.AspNetCore.Mvc;

namespace leader_election_api.Controllers;

[ApiController]
[Route("api/leader")]
public class LeaderController : ControllerBase
{
    private static string? _leaderId = null;
    private static DateTime _expiry = DateTime.MinValue;
    private static readonly object _lock = new();

    private static readonly TimeSpan Lease = TimeSpan.FromSeconds(15);

    [HttpPost("claim")]
    public IActionResult Claim([FromBody] dynamic req)
    {
        string candidateId = req.id;
        var now = DateTime.UtcNow;

        lock (_lock)
        {
            if (_leaderId == null || now > _expiry)
            {
                _leaderId = candidateId;
                _expiry = now + Lease;
                return Ok(new { status = "Elected", leaderId = _leaderId, expiry = _expiry });
            }

            if (_leaderId == candidateId)
            {
                _expiry = now + Lease;
                return Ok(new { status = "Renewed", leaderId = _leaderId, expiry = _expiry });
            }

            return Conflict(new { status = "Failed", currentLeader = _leaderId });
        }
    }
}
