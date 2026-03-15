// subscription-billing/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// In-memory store for user subscriptions
// key: userId -> value: { expiryDate, status }
const subscriptions = new Map();

app.post('/api/subscribe', (req, res) => {
    const { userId, planWeeks } = req.body;

    // Calculate expiry: Now + weeks
    const now = new Date();
    const expiryDate = new Date(now.getTime() + planWeeks * 7 * 24 * 60 * 60 * 1000);

    subscriptions.set(userId, {
        expiryDate: expiryDate.toISOString(),
        status: 'ACTIVE'
    });

    res.json({ message: 'Subscription activated', expiryDate: expiryDate.toISOString() });
});

app.get('/api/status/:userId', (req, res) => {
    const sub = subscriptions.get(req.params.userId);

    if (!sub) {
        return res.json({ status: 'NONE' });
    }

    const now = new Date();
    const expiry = new Date(sub.expiryDate);

    if (now > expiry) {
        sub.status = 'EXPIRED';
        return res.json({ status: 'EXPIRED', expiryDate: sub.expiryDate });
    }

    res.json({ status: 'ACTIVE', expiryDate: sub.expiryDate });
});

const PORT = 3010;
app.listen(PORT, () => console.log(`Subscription Billing API (JS) running on port ${PORT}`));
