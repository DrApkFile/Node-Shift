package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
public class ApiKeyController {

    // Mock DB: Hash -> KeyMetadata
    private static final Map<String, KeyMetadata> apiKeysDb = new ConcurrentHashMap<>();

    // Record for Key Metadata
    public static class KeyMetadata {
        public String userId;
        public String plan;
        public boolean isActive;
        public int usageCount;

        public KeyMetadata(String userId, String plan) {
            this.userId = userId;
            this.plan = plan;
            this.isActive = true;
            this.usageCount = 0;
        }
    }

    // Response object for key creation
    public static class CreateKeyResponse {
        public String message;
        public String apiKey;

        public CreateKeyResponse(String message, String apiKey) {
            this.message = message;
            this.apiKey = apiKey;
        }
    }

    private String hashKey(String key) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] encodedHash = digest.digest(key.getBytes());
        StringBuilder hexString = new StringBuilder(2 * encodedHash.length);
        for (byte b : encodedHash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    @PostMapping("/keys")
    public ResponseEntity<?> createKey(@RequestBody Map<String, String> payload) throws NoSuchAlgorithmException {
        String userId = payload.get("user_id");
        if (userId == null) return ResponseEntity.badRequest().body("user_id is required");

        String rawKey = "sk_test_" + UUID.randomUUID().toString().replace("-", "");
        String hashedKey = hashKey(rawKey);

        apiKeysDb.put(hashedKey, new KeyMetadata(userId, payload.getOrDefault("plan", "basic")));

        return new ResponseEntity<>(new CreateKeyResponse("Key generated. Store safely.", rawKey), HttpStatus.CREATED);
    }

    @GetMapping("/protected-data")
    public ResponseEntity<?> getProtectedData(@RequestHeader(value = "Authorization", required = false) String authHeader) throws NoSuchAlgorithmException {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Missing Authorization header");
        }

        String token = authHeader.substring(7);
        String hashedToken = hashKey(token);

        KeyMetadata meta = apiKeysDb.get(hashedToken);
        if (meta == null || !meta.isActive) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or revoked API Key");
        }

        meta.usageCount++;
        return ResponseEntity.ok(Map.of(
            "message", "Access granted to Spring Boot!",
            "user_id", meta.userId,
            "data", "Confidential enterprise report"
        ));
    }
}
