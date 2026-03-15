from flask import Flask, request, jsonify

app = Flask(__name__)
# Mock Storage
escrows = {}

@app.route('/api/escrow/init', methods=['POST'])
def init():
    data = request.json
    tx_id = data.get('id')
    escrows[tx_id] = {
        'buyer': data.get('buyer'),
        'seller': data.get('seller'),
        'amount': data.get('amount'),
        'status': 'PENDING'
    }
    return jsonify({'msg': 'Started', 'id': tx_id}), 201

@app.route('/api/escrow/<id>/release', methods=['POST'])
def release(id):
    escrow = escrows.get(id)
    if not escrow or escrow['status'] != 'PENDING':
        return jsonify({'error': 'Invalid state'}), 400
    
    if request.json.get('actor') != escrow['buyer']:
        return jsonify({'error': 'Unauthorized'}), 403
        
    escrow['status'] = 'RELEASED'
    return jsonify({'status': 'DONE'})

if __name__ == '__main__':
    app.run(port=5004)
