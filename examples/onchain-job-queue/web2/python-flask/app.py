from flask import Flask, request, jsonify

app = Flask(__name__)
jobs = []

@app.route('/api/jobs', methods=['POST'])
def add_job():
    j = request.json
    job = {'id': len(jobs)+1, 'task': j['task'], 'status': 'PENDING', 'reward': j['reward']}
    jobs.append(job)
    return jsonify(job), 201

@app.route('/api/jobs/<int:id>/claim', methods=['POST'])
def claim(id):
    job = next((j for j in jobs if j['id'] == id), None)
    if job and job['status'] == 'PENDING':
        job['status'] = 'CLAIMED'
        job['worker'] = request.json['worker']
        return jsonify(job)
    return jsonify({'err': 'busy'}), 400

@app.route('/api/jobs/<int:id>/complete', methods=['POST'])
def done(id):
    job = next((j for j in jobs if j['id'] == id), None)
    if job and job['status'] == 'CLAIMED':
        job['status'] = 'COMPLETED'
        return jsonify({'payout': job['reward']})
    return jsonify({'err': 'fail'}), 400

if __name__ == '__main__':
    app.run(port=5010)
