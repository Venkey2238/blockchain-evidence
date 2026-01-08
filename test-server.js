const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.get('/api/user/:wallet', (req, res) => {
    res.json({ user: { role: 'admin', full_name: 'Test User' } });
});

app.post('/api/admin/*', (req, res) => {
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🔐 EVID-DGC running on http://localhost:${PORT}`);
    console.log(`📱 Test the navbar fix at:`);
    console.log(`   - Main: http://localhost:${PORT}`);
    console.log(`   - Admin: http://localhost:${PORT}/admin.html`);
    console.log(`   - Analyst: http://localhost:${PORT}/dashboard-analyst.html`);
    console.log(`   - All dashboards available for testing`);
});