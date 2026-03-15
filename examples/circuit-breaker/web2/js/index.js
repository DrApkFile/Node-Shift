// circuit-breaker/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// Circuit Breaker State
const State = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

const config = {
    errorThreshold: 3,
    resetTimeout: 10000, // 10 seconds
};

let breaker = {
    state: State.CLOSED,
    failureCount: 0,
    lastFailureTime: null,
};

function handleServiceCall() {
    // Simulate a 50% chance of failure from a "Remote Service"
    if (Math.random() > 0.5) return "Success!";
    throw new Error("Remote Service Failure");
}

app.get('/api/call', (req, res) => {
    const now = Date.now();

    // 1. Check if we should transition from OPEN to HALF_OPEN
    if (breaker.state === State.OPEN && (now - breaker.lastFailureTime > config.resetTimeout)) {
        breaker.state = State.HALF_OPEN;
        console.log("Circuit switched to HALF_OPEN (Testing trial request)");
    }

    // 2. Immediate fail if OPEN
    if (breaker.state === State.OPEN) {
        return res.status(503).json({
            error: "Circuit is OPEN. Request failed immediately to prevent overload.",
            retryAfter: `${Math.ceil((config.resetTimeout - (now - breaker.lastFailureTime)) / 1000)}s`
        });
    }

    try {
        const result = handleServiceCall();

        // 3. Success logic
        if (breaker.state === State.HALF_OPEN) {
            console.log("Trial success! Circuit reset to CLOSED.");
        }
        breaker.state = State.CLOSED;
        breaker.failureCount = 0;

        res.json({ status: "Success", data: result });
    } catch (err) {
        // 4. Failure logic
        breaker.failureCount++;
        breaker.lastFailureTime = now;

        if (breaker.state === State.HALF_OPEN || breaker.failureCount >= config.errorThreshold) {
            breaker.state = State.OPEN;
            console.warn(`Circuit tripped to OPEN! Threshold: ${breaker.failureCount}`);
        }

        res.status(500).json({ status: "Error", message: err.message, circuitState: breaker.state });
    }
});

app.get('/api/status', (req, res) => res.json(breaker));

const PORT = 3002;
app.listen(PORT, () => console.log(`Circuit Breaker Server (JS) running on port ${PORT}`));
