package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auctions")
public class AuctionController {

    private static final Map<String, Auction> auctions = new ConcurrentHashMap<>();

    public static class Auction {
        public String itemId;
        public String seller;
        public double highestBid;
        public String highestBidder;
        public boolean isActive = true;

        public Auction(String itemId, String seller, double startPrice) {
            this.itemId = itemId;
            this.seller = seller;
            this.highestBid = startPrice;
        }
    }

    @PostMapping
    public ResponseEntity<Auction> createAuction(@RequestBody Map<String, Object> payload) {
        String itemId = (String) payload.get("item_id");
        String seller = (String) payload.get("seller");
        double startPrice = Double.parseDouble(payload.get("start_price").toString());

        Auction auction = new Auction(itemId, seller, startPrice);
        auctions.put(itemId, auction);
        return new ResponseEntity<>(auction, HttpStatus.CREATED);
    }

    @PostMapping("/{itemId}/bid")
    public ResponseEntity<?> placeBid(@PathVariable String itemId, @RequestBody Map<String, Object> payload) {
        Auction auction = auctions.get(itemId);
        if (auction == null || !auction.isActive) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Auction not found");
        }

        double amount = Double.parseDouble(payload.get("amount").toString());
        String bidder = (String) payload.get("bidder");

        if (amount <= auction.highestBid) {
            return ResponseEntity.badRequest().body("Bid must be higher than current: " + auction.highestBid);
        }

        auction.highestBid = amount;
        auction.highestBidder = bidder;
        return ResponseEntity.ok(Map.of("message", "Bid accepted", "highest_bid", amount));
    }
}
