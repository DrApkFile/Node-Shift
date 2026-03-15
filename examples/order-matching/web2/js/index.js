// order-matching/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// Simple Order Book
let orderBook = {
    bids: [], // Buy orders (sorted high to low)
    asks: []  // Sell orders (sorted low to high)
};

app.post('/api/orders', (req, res) => {
    const { trader, side, price, quantity } = req.body;

    const order = { trader, side, price, quantity, timestamp: Date.now() };

    if (side === 'BUY') {
        matchOrder(order, orderBook.asks, 'bids', (a, b) => b.price - a.price);
    } else {
        matchOrder(order, orderBook.bids, 'asks', (a, b) => a.price - b.price);
    }

    res.json({ message: 'Order processed', orderBook });
});

function matchOrder(newOrder, oppositeList, ownListKey, sortFn) {
    let remainingQty = newOrder.quantity;

    while (oppositeList.length > 0 && remainingQty > 0) {
        let bestOpposite = oppositeList[0];

        // Check if price matches
        const priceMatches = newOrder.side === 'BUY'
            ? newOrder.price >= bestOpposite.price
            : newOrder.price <= bestOpposite.price;

        if (!priceMatches) break;

        // Execute match
        const matchQty = Math.min(remainingQty, bestOpposite.quantity);
        console.log(`MATCH: ${matchQty} at ${bestOpposite.price} between ${newOrder.trader} and ${bestOpposite.trader}`);

        remainingQty -= matchQty;
        bestOpposite.quantity -= matchQty;

        if (bestOpposite.quantity === 0) {
            oppositeList.shift();
        }
    }

    if (remainingQty > 0) {
        newOrder.quantity = remainingQty;
        orderBook[ownListKey].push(newOrder);
        orderBook[ownListKey].sort(sortFn);
    }
}

const PORT = 3008;
app.listen(PORT, () => console.log(`Order Matcher (JS) running on port ${PORT}`));
