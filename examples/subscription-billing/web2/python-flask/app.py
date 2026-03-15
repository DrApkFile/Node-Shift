from flask import Flask, request, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)
subscriptions = {}

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    data = request.json
    user_id = data.get('userId')
    weeks = data.get('weeks', 4)
    
    expiry = datetime.now() + timedelta(weeks=weeks)
    subscriptions[user_id] = expiry
    
    return jsonify({'msg': 'Subscribed', 'expiry': expiry.isoformat()})

@app.route('/api/status/<user_id>')
def status(user_id):
    expiry = subscriptions.get(user_id)
    if not expiry:
        return jsonify({'status': 'NONE'})
    
    active = datetime.now() < expiry
    return jsonify({
        'status': 'ACTIVE' if active else 'EXPIRED',
        'expiry': expiry.isoformat()
    })

if __name__ == '__main__':
    app.run(port=5011)
