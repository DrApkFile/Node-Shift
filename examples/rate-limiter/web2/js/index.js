// rate-limiter/web2/js/index.js
const express = require('express');
const app = express();

// Simple Fixed Window Rate Limiter
// In-memory store: Key (IP/User) -> { count, windowStart }
const rateLimitStore = new Map();

const WINDOW_SIZE_MS = 60000; // 1 minute
const MAX_REQUESTS = 5;

const rateLimiter = (req, res, next) => {
    const key = req.ip; // Or req.user.id in a real app
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
        return next();
    }

    const record = rateLimitStore.get(key);

    // If window expired, reset
    if (now - record.windowStart > WINDOW_SIZE_MS) {
        record.count = 1;
        record.windowStart = now;
        return next();
    }

    // Increment and check
    record.count++;
    if (record.count > MAX_REQUESTS) {
        const timeLeft = Math.ceil((WINDOW_SIZE_MS - (now - record.windowStart)) / 1000);
        return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${timeLeft}s.`,
            retryAfterSeconds: timeLeft
        });
    }

    next();
};

app.get('/api/resource', rateLimiter, (req, res) => {
    res.json({ message: 'Success! You accessed the protected resource.' });
});

const PORT = 3006;
app.listen(PORT, () => console.log(`Rate Limiter API (JS) running on port ${PORT}`));
