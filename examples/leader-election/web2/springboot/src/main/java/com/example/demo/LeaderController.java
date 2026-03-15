package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@RequestMapping("/api/leader")
public class LeaderController {

    public static class LeaderState {
        public String leaderId;
        public long expiresAt;

        public LeaderState(String leaderId, long expiresAt) {
            this.leaderId = leaderId;
            this.expiresAt = expiresAt;
        }
    }

    private final AtomicReference<LeaderState> leader = new AtomicReference<>(new LeaderState(null, 0));
    private static final long LEASE_TIME = 15000;

    @PostMapping("/claim")
    public ResponseEntity<?> claim(@RequestBody Map<String, String> payload) {
        String candidateId = payload.get("id");
        long now = System.currentTimeMillis();

        LeaderState current = leader.get();

        // Vacant or Expired
        if (current.leaderId == null || now > current.expiresAt) {
            LeaderState newState = new LeaderState(candidateId, now + LEASE_TIME);
            if (leader.compareAndSet(current, newState)) {
                return ResponseEntity.ok(Map.of("status", "ELECTED", "leader", newState));
            }
            // If someone else won the race, fall through to conflict
            current = leader.get();
        }

        // Renew
        if (candidateId.equals(current.leaderId)) {
            current.expiresAt = now + LEASE_TIME;
            return ResponseEntity.ok(Map.of("status", "RENEWED", "leader", current));
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("status", "FAILED", "currentLeader", current.leaderId));
    }
}
