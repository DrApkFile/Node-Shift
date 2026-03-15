// leaderboard-ranking/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// In-memory store: { username: score }
const scores = new Map();

app.post('/api/scores', (req, res) => {
    const { username, score } = req.body;
    if (!username || score === undefined) {
        return res.status(400).json({ error: 'Username and score are required' });
    }

    // Keep the highest score for the user
    const currentScore = scores.get(username) || 0;
    if (score > currentScore) {
        scores.set(username, score);
    }

    res.json({ message: 'Score updated', username, currentHighScore: scores.get(username) });
});

app.get('/api/leaderboard', (req, res) => {
    // Sort and take top 10
    const leaderboard = Array.from(scores.entries())
        .map(([username, score]) => ({ username, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    res.json(leaderboard);
});

const PORT = 3007;
app.listen(PORT, () => console.log(`Leaderboard API (JS) running on port ${PORT}`));
