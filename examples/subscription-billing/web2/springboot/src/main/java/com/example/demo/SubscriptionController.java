package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    public static class SubState {
        public LocalDateTime expiry;
        public String status = "ACTIVE";

        public SubState(LocalDateTime expiry) {
            this.expiry = expiry;
        }
    }

    private final Map<String, SubState> db = new ConcurrentHashMap<>();

    @PostMapping("/buy")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> req) {
        String userId = (String) req.get("userId");
        int weeks = Integer.parseInt(req.get("weeks").toString());

        LocalDateTime expiry = LocalDateTime.now().plusWeeks(weeks);
        db.put(userId, new SubState(expiry));

        return ResponseEntity.ok(Map.of("message", "Subscribed", "expiry", expiry.toString()));
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<?> getStatus(@PathVariable String userId) {
        SubState sub = db.get(userId);
        if (sub == null) {
            return ResponseEntity.ok(Map.of("status", "NONE"));
        }

        if (LocalDateTime.now().isAfter(sub.expiry)) {
            sub.status = "EXPIRED";
            return ResponseEntity.ok(Map.of("status", "EXPIRED", "expiry", sub.expiry.toString()));
        }

        return ResponseEntity.ok(Map.of("status", "ACTIVE", "expiry", sub.expiry.toString()));
    }
}
