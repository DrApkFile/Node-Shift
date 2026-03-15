package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final Map<String, Integer> scores = new ConcurrentHashMap<>();

    @PostMapping("/scores")
    public ResponseEntity<?> updateScore(@RequestBody Map<String, Object> payload) {
        String username = (String) payload.get("username");
        int score = Integer.parseInt(payload.get("score").toString());

        scores.merge(username, score, Math::max);
        return ResponseEntity.ok(Map.of("message", "Score updated", "highScore", scores.get(username)));
    }

    @GetMapping
    public List<Map<String, Object>> getLeaderboard() {
        return scores.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(e -> Map.of("username", (Object)e.getKey(), "score", (Object)e.getValue()))
                .collect(Collectors.toList());
    }
}
