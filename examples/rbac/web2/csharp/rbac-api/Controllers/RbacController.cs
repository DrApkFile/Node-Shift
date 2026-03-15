using Microsoft.AspNetCore.Mvc;

namespace rbac_api.Controllers;

[ApiController]
[Route("api")]
public class RbacController : ControllerBase
{
    private static readonly Dictionary<string, string> _roles = new() {
        { "alice", "ADMIN" },
        { "bob", "USER" }
    };

    [HttpGet("admin")]
    public IActionResult AdminOnly()
    {
        var user = Request.Headers["X-User"].ToString();
        if (_roles.TryGetValue(user, out var role) && role == "ADMIN")
        {
            return Ok(new { msg = "Sensitive admin data" });
        }
        return Forbid();
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new { status = "Publicly alive" });
    }
}
