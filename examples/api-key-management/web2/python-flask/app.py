from flask import Flask, request, jsonify
import secrets
import hashlib
from functools import wraps
from datetime import datetime

app = Flask(__name__)

# Mock Database
api_keys_db = {}

def generate_key():
    return f"sk_test_{secrets.token_hex(24)}"

def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

# Middleware decorator
def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing Authorization Header'}), 401
            
        provided_key = auth_header.split(' ')[1]
        key_hash = hash_key(provided_key)
        
        key_data = api_keys_db.get(key_hash)
        if not key_data or not key_data.get('is_active'):
             return jsonify({'error': 'Invalid or revoked API Key'}), 401
             
        # Inject the parsed user data into the request context if needed
        request.key_data = key_data
        key_data['usage_count'] += 1
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/keys', methods=['POST'])
def create_key():
    data = request.json or {}
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
        
    new_key = generate_key()
    key_hash = hash_key(new_key)
    
    api_keys_db[key_hash] = {
        'user_id': user_id,
        'plan': data.get('plan', 'basic'),
        'is_active': True,
        'usage_count': 0,
        'created_at': datetime.now().isoformat()
    }
    
    return jsonify({
        'message': 'API Key generated.',
        'api_key': new_key
    }), 201

@app.route('/api/protected-data', methods=['GET'])
@require_api_key
def protected_route():
    return jsonify({
        'message': 'Access granted',
        'user_id': request.key_data['user_id'],
        'data': 'This is protected data from Flask.'
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
