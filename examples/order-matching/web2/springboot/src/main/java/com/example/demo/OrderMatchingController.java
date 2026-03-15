package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@RequestMapping("/api/orders")
public class OrderMatchingController {

    public static class Order {
        public String trader;
        public String side;
        public double price;
        public int quantity;
    }

    private final List<Order> bids = new ArrayList<>();
    private final List<Order> asks = new ArrayList<>();

    @PostMapping
    public synchronized ResponseEntity<?> placeOrder(@RequestBody Order order) {
        int remaining = order.quantity;

        if (order.side.equals("BUY")) {
            remaining = match(order, asks, true);
            if (remaining > 0) {
                order.quantity = remaining;
                bids.add(order);
                bids.sort((a, b) -> Double.compare(b.price, a.price));
            }
        } else {
            remaining = match(order, bids, false);
            if (remaining > 0) {
                order.quantity = remaining;
                asks.add(order);
                asks.sort(Comparator.comparingDouble(a -> a.price));
            }
        }

        return ResponseEntity.ok(Map.of("bids", bids, "asks", asks));
    }

    private int match(Order newOrder, List<Order> opposites, boolean isBuy) {
        Iterator<Order> it = opposites.iterator();
        int rem = newOrder.quantity;
        while (it.hasNext() && rem > 0) {
            Order best = it.next();
            boolean canMatch = isBuy ? (newOrder.price >= best.price) : (newOrder.price <= best.price);
            if (!canMatch) break;

            int matchQty = Math.min(rem, best.quantity);
            rem -= matchQty;
            best.quantity -= matchQty;
            if (best.quantity == 0) it.remove();
        }
        return rem;
    }
}
