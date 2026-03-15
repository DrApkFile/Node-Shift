using Microsoft.AspNetCore.Mvc;

namespace circuit_breaker_api.Controllers;

[ApiController]
[Route("api")]
public class CircuitBreakerController : ControllerBase
{
    private enum BreakerState { Closed, Open, HalfOpen }

    private static BreakerState _state = BreakerState.Closed;
    private static int _failureCount = 0;
    private static DateTime _lastFailureTime = DateTime.MinValue;

    private const int Threshold = 3;
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    [HttpGet("call")]
    public IActionResult CallService()
    {
        var now = DateTime.UtcNow;

        if (_state == BreakerState.Open && (now - _lastFailureTime > Timeout))
        {
            _state = BreakerState.HalfOpen;
        }

        if (_state == BreakerState.Open)
        {
            return StatusCode(503, new { error = "Circuit is OPEN" });
        }

        // Simulate random failure
        if (Random.Shared.NextDouble() > 0.5) // Success
        {
            _state = BreakerState.Closed;
            _failureCount = 0;
            return Ok(new { status = "success" });
        }
        else // Failure
        {
            _failureCount++;
            _lastFailureTime = now;

            if (_state == BreakerState.HalfOpen || _failureCount >= Threshold)
            {
                _state = BreakerState.Open;
            }

            return StatusCode(500, new { status = "fail", state = _state.ToString() });
        }
    }
}
