package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api")
public class CircuitBreakerController {

    private enum State { CLOSED, OPEN, HALF_OPEN }
    
    private State state = State.CLOSED;
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicLong lastFailureTime = new AtomicLong(0);
    
    private static final int THRESHOLD = 3;
    private static final long TIMEOUT = 10000; // 10s

    @GetMapping("/call")
    public synchronized ResponseEntity<?> callService() {
        long now = System.currentTimeMillis();

        if (state == State.OPEN && (now - lastFailureTime.get() > TIMEOUT)) {
            state = State.HALF_OPEN;
        }

        if (state == State.OPEN) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Circuit is OPEN"));
        }

        if (Math.random() > 0.5) { // Success
            state = State.CLOSED;
            failureCount.set(0);
            return ResponseEntity.ok(Map.of("status", "success"));
        } else { // Failure
            int currentFailures = failureCount.incrementAndGet();
            lastFailureTime.set(now);
            
            if (state == State.HALF_OPEN || currentFailures >= THRESHOLD) {
                state = State.OPEN;
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "fail", "state", state));
        }
    }
}
