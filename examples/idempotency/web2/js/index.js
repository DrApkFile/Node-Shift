// idempotency/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// In-memory cache for idempotency keys
// Key: Idempotency-Key -> Value: { status, response, timestamp }
const idempotencyStore = new Map();

app.post('/api/orders', (req, res) => {
    const idempotencyKey = req.header('Idempotency-Key');

    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key header is required' });
    }

    // 1. Check if we have seen this key before
    if (idempotencyStore.has(idempotencyKey)) {
        console.log(`Duplicate request detected for key: ${idempotencyKey}`);
        const cached = idempotencyStore.get(idempotencyKey);

        // Return the CACHED response
        return res.status(cached.status).json(cached.response);
    }

    // 2. Process the request (Simulate order creation)
    const { itemId, amount } = req.body;
    console.log(`Processing NEW request for item ${itemId}`);

    // Simulate "Work"
    const orderResponse = {
        orderId: Math.floor(Math.random() * 100000),
        status: 'SUCCESS',
        total: amount
    };

    // 3. Store the result in the cache
    idempotencyStore.set(idempotencyKey, {
        status: 201,
        response: orderResponse,
        timestamp: Date.now()
    });

    res.status(201).json(orderResponse);
});

const PORT = 3004;
app.listen(PORT, () => console.log(`Idempotency API (JS) running on port ${PORT}`));
