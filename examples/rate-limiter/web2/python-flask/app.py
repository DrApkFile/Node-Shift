from flask import Flask, request, jsonify
import time

app = Flask(__name__)
# store: ip -> (timestamp, count)
limits = {}

MAX_CALLS = 5
WINDOW = 60

@app.route('/api/resource')
def resource():
    ip = request.remote_addr
    now = time.time()
    
    if ip not in limits or now - limits[ip][0] > WINDOW:
        limits[ip] = (now, 1)
        return jsonify({'msg': 'OK'})
    
    start_time, count = limits[ip]
    if count >= MAX_CALLS:
        return jsonify({'error': 'Rate limit exceeded'}), 429
        
    limits[ip] = (start_time, count + 1)
    return jsonify({'msg': 'OK', 'remaining': MAX_CALLS - count - 1})

if __name__ == '__main__':
    app.run(port=5007)
