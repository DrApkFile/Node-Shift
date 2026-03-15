// api-key-management/web2/js/index.js
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// In-memory store for API keys (Map: Hash -> Key Data)
const apiKeys = new Map();

// Generate a secure API key
function generateApiKey() {
    return 'sk_test_' + crypto.randomBytes(24).toString('hex');
}

// Hash the API key for secure storage
function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// Endpoint to create a new API key
app.post('/api/keys', (req, res) => {
    const { userId, plan = 'basic' } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const newKey = generateApiKey();
    const keyHash = hashKey(newKey);
    
    // Store metadata against the hashed key
    apiKeys.set(keyHash, {
        userId,
        plan,
        createdAt: new Date(),
        active: true,
        requests: 0
    });

    // We only return the raw key ONCE. If lost, they must generate a new one.
    res.status(201).json({ 
        message: 'API Key created. Please save this key, it will not be shown again.',
        apiKey: newKey 
    });
});

// Middleware to authenticate API keys
function authenticateApiKey(req, res, next) {
    // 1. Extract the key from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const providedKey = authHeader.split(' ')[1];
    
    // 2. Hash the provided key to look it up securely
    const keyHash = hashKey(providedKey);
    const keyData = apiKeys.get(keyHash);

    // 3. Validate
    if (!keyData || !keyData.active) {
        return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    // 4. Track usage (Optional: Rate limiting could be added here)
    keyData.requests++;
    
    // 5. Attach user info to request
    req.user = { id: keyData.userId, plan: keyData.plan };
    next();
}

// Protected Endpoint
app.get('/api/protected-data', authenticateApiKey, (req, res) => {
    res.json({
        message: 'Access granted!',
        user: req.user,
        data: 'This is highly sensitive Web2 data.'
    });
});

// Endpoint to revoke a key
app.post('/api/keys/revoke', authenticateApiKey, (req, res) => {
    // Determine the key they used to authenticate
    const providedKey = req.headers['authorization'].split(' ')[1];
    const keyHash = hashKey(providedKey);
    
    // Mark as inactive
    const keyData = apiKeys.get(keyHash);
    keyData.active = false;
    
    res.json({ message: 'API key successfully revoked.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Node.js API Key Server running on port ${PORT}`);
});
