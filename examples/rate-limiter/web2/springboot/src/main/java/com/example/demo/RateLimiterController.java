package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
public class RateLimiterController {

    private static class RateRecord {
        public int count;
        public long windowStart;

        public RateRecord(long windowStart) {
            this.count = 1;
            this.windowStart = windowStart;
        }
    }

    private final Map<String, RateRecord> limitStore = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS = 5;
    private static final long WINDOW_SIZE = 60000; // 1 min

    @GetMapping("/resource")
    public ResponseEntity<?> getResource(HttpServletRequest request) {
        String clientIp = request.getRemoteAddr();
        long now = System.currentTimeMillis();

        RateRecord record = limitStore.get(clientIp);

        if (record == null || (now - record.windowStart) > WINDOW_SIZE) {
            limitStore.put(clientIp, new RateRecord(now));
            return ResponseEntity.ok(Map.of("message", "Success"));
        }

        if (record.count >= MAX_REQUESTS) {
            long waitTime = (WINDOW_SIZE - (now - record.windowStart)) / 1000;
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate limit exceeded", "retryAfter", waitTime + "s"));
        }

        record.count++;
        return ResponseEntity.ok(Map.of("message", "Success", "remaining", MAX_REQUESTS - record.count));
    }
}
