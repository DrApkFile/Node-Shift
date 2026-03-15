// escrow-engine/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// In-memory store for escrows
// Key: transactionId -> Value: { buyer, seller, amount, status: 'PENDING' | 'RELEASED' | 'REFUNDED' }
const escrows = new Map();

app.post('/api/escrow/init', (req, res) => {
    const { transactionId, buyer, seller, amount } = req.body;
    if (!transactionId || !buyer || !seller || !amount) {
        return res.status(400).json({ error: 'Missing transaction details' });
    }

    if (escrows.has(transactionId)) {
        return res.status(400).json({ error: 'Transaction ID already exists' });
    }

    const escrow = { buyer, seller, amount, status: 'PENDING' };
    escrows.set(transactionId, escrow);

    console.log(`Escrow initiated: ${transactionId} - ${amount} from ${buyer} to ${seller}`);
    res.status(201).json({ message: 'Escrow initiated', escrow });
});

app.post('/api/escrow/:id/release', (req, res) => {
    const { id } = req.params;
    const { actor } = req.body; // In a real app, this would be authenticated session user

    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    if (escrow.status !== 'PENDING') return res.status(400).json({ error: 'Escrow already finalized' });

    // Only buyer can release funds
    if (actor !== escrow.buyer) {
        return res.status(403).json({ error: 'Only the buyer can release the funds' });
    }

    escrow.status = 'RELEASED';
    console.log(`Funds released for ${id}. Transferring ${escrow.amount} to ${escrow.seller}`);

    res.json({ message: 'Funds released to seller', status: escrow.status });
});

app.post('/api/escrow/:id/refund', (req, res) => {
    const { id } = req.params;
    const { actor } = req.body;

    const escrow = escrows.get(id);
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    if (escrow.status !== 'PENDING') return res.status(400).json({ error: 'Escrow already finalized' });

    // Only seller can initiate a refund (or a dispute resolved by admin)
    if (actor !== escrow.seller) {
        return res.status(403).json({ error: 'Only the seller can initiate a refund' });
    }

    escrow.status = 'REFUNDED';
    console.log(`Funds refunded for ${id}. Returning ${escrow.amount} to ${escrow.buyer}`);

    res.json({ message: 'Funds refunded to buyer', status: escrow.status });
});

app.get('/api/escrow/:id', (req, res) => {
    const escrow = escrows.get(req.params.id);
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    res.json(escrow);
});

const PORT = 3003;
app.listen(PORT, () => console.log(`Escrow Server (JS) running on port ${PORT}`));
