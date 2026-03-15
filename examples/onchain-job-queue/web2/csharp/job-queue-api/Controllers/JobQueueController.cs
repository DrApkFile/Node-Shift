using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;

namespace job_queue_api.Controllers;

[ApiController]
[Route("api/jobs")]
public class JobQueueController : ControllerBase
{
    public class Job { public int Id { get; set; } public string Task { get; set; } = ""; public string Status { get; set; } = "Pending"; public double Bounty { get; set; } public string? Worker { get; set; } }
    
    private static readonly ConcurrentDictionary<int, Job> _jobs = new();
    private static int _counter = 0;

    [HttpPost]
    public IActionResult Create([FromBody] dynamic req)
    {
        var id = Interlocked.Increment(ref _counter);
        var job = new Job { Id = id, Task = req.task, Bounty = req.bounty };
        _jobs[id] = job;
        return Created("", job);
    }

    [HttpPost("{id}/claim")]
    public IActionResult Claim(int id, [FromBody] dynamic req)
    {
        if (!_jobs.TryGetValue(id, out var job) || job.Status != "Pending")
            return BadRequest("Job unavailable");

        job.Status = "Claimed";
        job.Worker = req.worker;
        return Ok(job);
    }
}
