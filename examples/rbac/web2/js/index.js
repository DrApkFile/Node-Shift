// rbac/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// Mock DB
const users = {
    'alice': 'ADMIN',
    'bob': 'EDITOR',
    'charlie': 'VIEWER'
};

// RBAC Middleware
const checkRole = (requiredRole) => {
    return (req, res, next) => {
        const username = req.header('X-Username');
        const userRole = users[username];

        if (!userRole) return res.status(401).json({ error: 'Unauthorized' });

        const roles = ['VIEWER', 'EDITOR', 'ADMIN'];
        if (roles.indexOf(userRole) < roles.indexOf(requiredRole)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

app.get('/api/admin/dashboard', checkRole('ADMIN'), (req, res) => {
    res.json({ message: 'Welcome to the Admin Dashboard' });
});

app.post('/api/edit', checkRole('EDITOR'), (req, res) => {
    res.json({ message: 'Content updated successfully' });
});

app.get('/api/view', checkRole('VIEWER'), (req, res) => {
    res.json({ message: 'Viewing public content' });
});

const PORT = 3011;
app.listen(PORT, () => console.log(`RBAC API (JS) running on port ${PORT}`));
