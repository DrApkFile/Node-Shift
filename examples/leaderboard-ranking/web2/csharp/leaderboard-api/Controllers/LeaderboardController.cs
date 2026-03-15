using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace leaderboard_api.Controllers;

[ApiController]
[Route("api/leaderboard")]
public class LeaderboardController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, int> _scores = new();

    [HttpPost("scores")]
    public IActionResult UpdateScore([FromBody] dynamic req)
    {
        string username = req.username;
        int score = req.score;

        _scores.AddOrUpdate(username, score, (key, current) => Math.max(current, score));
        return Ok(new { status = "Success", currentHigh = _scores[username] });
    }

    [HttpGet]
    public IActionResult GetLeaderboard()
    {
        var top10 = _scores.Select(x => new { username = x.Key, score = x.Value })
                           .OrderByDescending(x => x.score)
                           .Take(10);
        return Ok(top10);
    }
}
