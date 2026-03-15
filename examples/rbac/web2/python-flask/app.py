from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)

# Mock DB
ROLES = {'alice': 'admin', 'bob': 'user'}

def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = request.headers.get('User')
            if ROLES.get(user) != role:
                return jsonify({'error': 'Forbidden'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/admin')
@role_required('admin')
def admin():
    return jsonify({'msg': 'Admin access'})

@app.route('/public')
def public():
    return jsonify({'msg': 'Public access'})

if __name__ == '__main__':
    app.run(port=5012)
