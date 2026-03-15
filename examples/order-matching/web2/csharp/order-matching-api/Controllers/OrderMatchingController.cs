using Microsoft.AspNetCore.Mvc;

namespace order_matching_api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrderMatchingController : ControllerBase
{
    public class Order { public string Trader { get; set; } = ""; public string Side { get; set; } = ""; public double Price { get; set; } public int Quantity { get; set; } }
    
    private static readonly List<Order> _bids = new();
    private static readonly List<Order> _asks = new();
    private static readonly object _lock = new();

    [HttpPost]
    public IActionResult PlaceOrder([FromBody] Order order)
    {
        lock (_lock)
        {
            int remaining = order.Quantity;
            if (order.Side == "BUY")
            {
                remaining = Match(order, _asks, true);
                if (remaining > 0) {
                    order.Quantity = remaining;
                    _bids.add(order);
                    _bids.Sort((a,b) => b.Price.CompareTo(a.Price));
                }
            }
            else
            {
                remaining = Match(order, _bids, false);
                if (remaining > 0) {
                    order.Quantity = remaining;
                    _asks.add(order);
                    _asks.Sort((a,b) => a.Price.CompareTo(b.Price));
                }
            }
            return Ok(new { bids = _bids, asks = _asks });
        }
    }

    private int Match(Order o, List<Order> opposites, bool isBuy)
    {
        int rem = o.Quantity;
        for (int i = 0; i < opposites.Count && rem > 0; )
        {
            var best = opposites[i];
            bool canMatch = isBuy ? (o.Price >= best.Price) : (o.Price <= best.Price);
            if (!canMatch) break;

            int qty = Math.Min(rem, best.Quantity);
            rem -= qty;
            best.Quantity -= qty;
            if (best.Quantity == 0) opposites.RemoveAt(i);
            else i++;
        }
        return rem;
    }
}
