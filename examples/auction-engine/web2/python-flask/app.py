from flask import Flask, request, jsonify

app = Flask(__name__)
auctions = {}

@app.route('/api/auctions', methods=['POST'])
def create_auction():
    data = request.json
    item_id = data.get('item_id')
    if item_id in auctions:
        return jsonify({'error': 'Already exists'}), 400
    
    auctions[item_id] = {
        'seller': data.get('seller'),
        'highest_bid': data.get('start_price', 0),
        'highest_bidder': None,
        'active': True
    }
    return jsonify({'message': 'Created', 'auction': auctions[item_id]}), 201

@app.route('/api/auctions/<item_id>/bid', methods=['POST'])
def bid(item_id):
    if item_id not in auctions: return jsonify({'error': 'Not found'}), 404
    
    auction = auctions[item_id]
    amount = request.json.get('amount')
    bidder = request.json.get('bidder')
    
    if amount <= auction['highest_bid']:
        return jsonify({'error': 'Price too low'}), 400
        
    auction['highest_bid'] = amount
    auction['highest_bidder'] = bidder
    return jsonify({'message': 'Bid success', 'new_high': amount})

if __name__ == '__main__':
    app.run(port=5002)
