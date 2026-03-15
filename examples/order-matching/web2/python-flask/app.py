from flask import Flask, request, jsonify

app = Flask(__name__)
book = {'bids': [], 'asks': []}

@app.route('/api/orders', methods=['POST'])
def add_order():
    o = request.json
    side = o['side']
    rem = o['qty']
    
    if side == 'BUY':
        target = book['asks']
        while target and rem > 0 and o['price'] >= target[0]['price']:
            match = min(rem, target[0]['qty'])
            rem -= match
            target[0]['qty'] -= match
            if target[0]['qty'] == 0: target.pop(0)
        if rem > 0:
            book['bids'].append({'user': o['user'], 'price': o['price'], 'qty': rem})
            book['bids'].sort(key=lambda x: x['price'], reverse=True)
    else:
        target = book['bids']
        while target and rem > 0 and o['price'] <= target[0]['price']:
            match = min(rem, target[0]['qty'])
            rem -= match
            target[0]['qty'] -= match
            if target[0]['qty'] == 0: target.pop(0)
        if rem > 0:
            book['asks'].append({'user': o['user'], 'price': o['price'], 'qty': rem})
            book['asks'].sort(key=lambda x: x['price'])
            
    return jsonify(book)

if __name__ == '__main__':
    app.run(port=5009)
