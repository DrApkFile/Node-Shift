from flask import Flask, request, jsonify
import time

app = Flask(__name__)

# State
leader = {
    'id': None,
    'expiry': 0
}

@app.route('/api/leader/claim', methods=['POST'])
def claim():
    candidate = request.json.get('id')
    now = time.time()
    
    if not leader['id'] or now > leader['expiry']:
        leader['id'] = candidate
        leader['expiry'] = now + 10
        return jsonify({'status': 'WON', 'leader': candidate})
    
    if leader['id'] == candidate:
        leader['expiry'] = now + 10
        return jsonify({'status': 'RENEWED'})
        
    return jsonify({'status': 'LOST', 'current': leader['id']}), 409

if __name__ == '__main__':
    app.run(port=5006)
