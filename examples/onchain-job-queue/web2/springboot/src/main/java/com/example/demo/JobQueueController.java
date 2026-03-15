package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/jobs")
public class JobQueueController {

    public static class Job {
        public int id;
        public String task;
        public String status = "PENDING";
        public double bounty;
        public String worker;
    }

    private final Map<Integer, Job> jobs = new ConcurrentHashMap<>();
    private final AtomicInteger counter = new AtomicInteger();

    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Map<String, Object> req) {
        Job job = new Job();
        job.id = counter.incrementAndGet();
        job.task = (String) req.get("task");
        job.bounty = Double.parseDouble(req.get("bounty").toString());
        jobs.put(job.id, job);
        return new ResponseEntity<>(job, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/claim")
    public ResponseEntity<?> claimJob(@PathVariable int id, @RequestBody Map<String, String> req) {
        Job job = jobs.get(id);
        if (job == null || !job.status.equals("PENDING")) {
            return ResponseEntity.badRequest().body("Job not available");
        }
        job.status = "CLAIMED";
        job.worker = req.get("worker");
        return ResponseEntity.ok(job);
    }
}
