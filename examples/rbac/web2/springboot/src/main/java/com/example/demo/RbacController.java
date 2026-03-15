package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;

@RestController
@RequestMapping("/api")
public class RbacController {

    private final Map<String, String> userRoles = Map.of(
        "alice", "ADMIN",
        "bob", "USER"
    );

    @GetMapping("/admin/data")
    public ResponseEntity<?> getAdminData(HttpServletRequest request) {
        String user = request.getHeader("X-User");
        String role = userRoles.get(user);

        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }

        return ResponseEntity.ok(Map.of("data", "Top Secret Admin Files"));
    }

    @GetMapping("/public/data")
    public ResponseEntity<?> getPublicData() {
        return ResponseEntity.ok(Map.of("data", "General Information"));
    }
}
