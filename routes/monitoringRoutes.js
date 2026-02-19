const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await monitoringService.getSystemMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await monitoringService.getAlerts();
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/log-metrics', async (req, res) => {
  try {
    const result = await monitoringService.logMetrics();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
