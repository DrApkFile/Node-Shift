package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/escrow")
public class EscrowController {

    private enum Status { PENDING, RELEASED, REFUNDED }

    public static class Escrow {
        public String buyer;
        public String seller;
        public double amount;
        public Status status = Status.PENDING;

        public Escrow(String buyer, String seller, double amount) {
            this.buyer = buyer;
            this.seller = seller;
            this.amount = amount;
        }
    }

    private static final Map<String, Escrow> escrows = new ConcurrentHashMap<>();

    @PostMapping("/init")
    public ResponseEntity<?> initEscrow(@RequestBody Map<String, Object> payload) {
        String id = payload.get("id").toString();
        String buyer = payload.get("buyer").toString();
        String seller = payload.get("seller").toString();
        double amount = Double.parseDouble(payload.get("amount").toString());

        escrows.put(id, new Escrow(buyer, seller, amount));
        return new ResponseEntity<>(Map.of("message", "Escrow initiated"), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/release")
    public ResponseEntity<?> release(@PathVariable String id, @RequestBody Map<String, String> payload) {
        Escrow escrow = escrows.get(id);
        if (escrow == null || escrow.status != Status.PENDING) {
            return ResponseEntity.badRequest().body("Invalid escrow state");
        }

        if (!payload.get("actor").equals(escrow.buyer)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only buyer can release");
        }

        escrow.status = Status.RELEASED;
        return ResponseEntity.ok(Map.of("status", "RELEASED", "msg", "Payment sent to " + escrow.seller));
    }
}
