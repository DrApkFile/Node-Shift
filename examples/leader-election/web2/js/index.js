// leader-election/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// Global "Shared" State (Mocking Redis/DB)
let leaderState = {
    leaderId: null,
    expiry: 0
};

const LEASE_DURATION = 15000; // 15 seconds

app.post('/api/leader/claim', (req, res) => {
    const { candidateId } = req.body;
    const now = Date.now();

    // 1. Check if leadership has expired or is vacant
    if (!leaderState.leaderId || now > leaderState.expiry) {
        leaderState = {
            leaderId: candidateId,
            expiry: now + LEASE_DURATION
        };
        console.log(`New Leader Elected: ${candidateId}`);
        return res.json({ status: 'ELECTED', leaderId: candidateId, expiry: leaderState.expiry });
    }

    // 2. Reject if someone else is already leader
    if (leaderState.leaderId === candidateId) {
        // Renew lease
        leaderState.expiry = now + LEASE_DURATION;
        return res.json({ status: 'RENEWED', leaderId: candidateId, expiry: leaderState.expiry });
    }

    res.status(409).json({ status: 'FAILED', currentLeader: leaderState.leaderId });
});

app.get('/api/leader', (req, res) => res.json(leaderState));

const PORT = 3005;
app.listen(PORT, () => console.log(`Leader Election API (JS) running on port ${PORT}`));
