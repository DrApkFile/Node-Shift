from flask import Flask, request, jsonify

app = Flask(__name__)
scores = {} # username -> score

@app.route('/api/scores', methods=['POST'])
def update():
    data = request.json
    user = data.get('username')
    val = data.get('score', 0)
    
    if user:
        scores[user] = max(scores.get(user, 0), val)
    return jsonify({'status': 'OK'})

@app.route('/api/leaderboard')
def board():
    # Sort by value descending
    board = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:10]
    return jsonify([{'username': u, 'score': s} for u, s in board])

if __name__ == '__main__':
    app.run(port=5008)
