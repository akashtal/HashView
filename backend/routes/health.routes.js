const express = require('express');
const mongoose = require('mongoose');
const { isCacheAvailable } = require('../config/redis');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get system health status for load balancers
 * @access  Public
 */
router.get('/', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = isCacheAvailable() ? 'connected' : 'disconnected';
  
  const isHealthy = dbStatus === 'connected';

  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
    uptime: process.uptime()
  };

  res.status(isHealthy ? 200 : 503).json(response);
});

module.exports = router;
