package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
public class IdempotencyController {

    private final Map<String, Object> idempotencyCache = new ConcurrentHashMap<>();

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(
            @RequestHeader("Idempotency-Key") String key,
            @RequestBody Map<String, Object> body) {
        
        if (key == null || key.isEmpty()) {
            return ResponseEntity.badRequest().body("Idempotency-Key is required");
        }

        // 1. Check cache
        if (idempotencyCache.containsKey(key)) {
            System.out.println("Duplicate request for key: " + key);
            return ResponseEntity.ok(idempotencyCache.get(key));
        }

        // 2. Logic
        Map<String, Object> response = Map.of(
            "order_id", UUID.randomUUID().toString(),
            "status", "CREATED",
            "item", body.get("item")
        );

        // 3. Store
        idempotencyCache.put(key, response);

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
