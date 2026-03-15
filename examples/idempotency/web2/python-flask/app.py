from flask import Flask, request, jsonify

app = Flask(__name__)
cache = {}

@app.route('/api/payments', methods=['POST'])
def process_payment():
    key = request.headers.get('Idempotency-Key')
    if not key:
        return jsonify({'error': 'Idempotency-Key header is required'}), 400

    if key in cache:
        return jsonify(cache[key]), 200

    # Logic
    response = {'payment_id': 'pay_999', 'status': 'captured'}
    
    cache[key] = response
    return jsonify(response), 201

if __name__ == '__main__':
    app.run(port=5005)
