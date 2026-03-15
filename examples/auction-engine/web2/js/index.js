// auction-engine/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// In-memory store for auctions
const auctions = new Map();

app.post('/api/auctions', (req, res) => {
    const { itemId, seller, startPrice } = req.body;
    if (!itemId || !seller || startPrice === undefined) {
        return res.status(400).json({ error: 'Missing required auction details' });
    }

    const auction = {
        itemId,
        seller,
        highestBid: startPrice,
        highestBidder: null,
        isActive: true,
        history: []
    };

    auctions.set(itemId, auction);
    res.status(201).json({ message: 'Auction created', auction });
});

app.post('/api/auctions/:itemId/bid', (req, res) => {
    const { itemId } = req.params;
    const { bidder, amount } = req.body;
    const auction = auctions.get(itemId);

    if (!auction || !auction.isActive) {
        return res.status(404).json({ error: 'Auction not found or expired' });
    }

    if (amount <= auction.highestBid) {
        return res.status(400).json({ error: `Bid must be higher than ${auction.highestBid}` });
    }

    // Update auction state
    auction.highestBid = amount;
    auction.highestBidder = bidder;
    auction.history.push({ bidder, amount, timestamp: new Date() });

    res.json({ message: 'Bid placed successfully', currentHighestBid: auction.highestBid });
});

app.get('/api/auctions/:itemId', (req, res) => {
    const auction = auctions.get(req.params.itemId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.json(auction);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auction Server running on port ${PORT}`));
