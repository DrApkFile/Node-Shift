// onchain-job-queue/web2/js/index.js
const express = require('express');
const app = express();
app.use(express.json());

// Mock Job Queue (Normally RabbitMQ/Redis)
let platformJobs = [];
let jobCounter = 0;

app.post('/api/jobs', (req, res) => {
    const { task, bounty } = req.body;
    const job = {
        id: ++jobCounter,
        task,
        bounty,
        status: 'PENDING',
        worker: null
    };
    platformJobs.push(job);
    res.status(201).json({ message: 'Job posted', jobId: job.id });
});

app.post('/api/jobs/:id/claim', (req, res) => {
    const { workerId } = req.body;
    const job = platformJobs.find(j => j.id == req.params.id);

    if (!job || job.status !== 'PENDING') {
        return res.status(400).json({ error: 'Job not available' });
    }

    job.status = 'CLAIMED';
    job.worker = workerId;
    res.json({ message: 'Job claimed', job });
});

app.post('/api/jobs/:id/complete', (req, res) => {
    const job = platformJobs.find(j => j.id == req.params.id);
    if (!job || job.status !== 'CLAIMED') {
        return res.status(400).json({ error: 'Job not in progress' });
    }

    job.status = 'COMPLETED';
    res.json({ message: 'Job completed!', payout: job.bounty });
});

const PORT = 3009;
app.listen(PORT, () => console.log(`Job Queue API (JS) running on port ${PORT}`));
