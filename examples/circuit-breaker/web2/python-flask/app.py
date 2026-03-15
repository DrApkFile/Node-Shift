from flask import Flask, jsonify
import time
import random

app = Flask(__name__)

# State
breaker = {
    'state': 'CLOSED',
    'failures': 0,
    'last_fail': 0
}

THRESHOLD = 3
TIMEOUT = 10

@app.route('/api/call')
def call():
    now = time.time()
    
    if breaker['state'] == 'OPEN' and (now - breaker['last_fail'] > TIMEOUT):
        breaker['state'] = 'HALF_OPEN'
        
    if breaker['state'] == 'OPEN':
        return jsonify({'error': 'Circuit is OPEN'}), 503

    # Trial
    if random.random() > 0.5: # Success
        breaker['state'] = 'CLOSED'
        breaker['failures'] = 0
        return jsonify({'status': 'OK'})
    else: # Failure
        breaker['failures'] += 1
        breaker['last_fail'] = now
        if breaker['state'] == 'HALF_OPEN' or breaker['failures'] >= THRESHOLD:
            breaker['state'] = 'OPEN'
        return jsonify({'status': 'FAIL', 'state': breaker['state']}), 500

if __name__ == '__main__':
    app.run(port=5003)
