/**
 * AI Gateway — Health Route
 * GET /ai/health
 *
 * Returns the health status of the AI gateway and all configured providers.
 * Used by monitoring systems and the admin dashboard.
 * No authentication required (public endpoint for infrastructure health checks).
 */

const express = require('express');
const router = express.Router();
const { getRouter } = require('../providers/router');
const settings = require('../config/settings');

router.get('/', async (req, res) => {
  try {
    const providerRouter = getRouter();
    const providerHealth = await providerRouter.healthCheck();

    const overallHealthy = providerHealth.primary?.healthy || providerHealth.fallback?.healthy;

    res.status(overallHealthy ? 200 : 503).json({
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'HashView AI Gateway',
      providers: providerHealth,
      config: {
        primaryProvider:  settings.primaryProvider,
        fallbackProvider: settings.fallbackProvider,
        cacheEnabled:     settings.search.cacheEnabled,
        searchRadius:     settings.search.defaultRadius,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

module.exports = router;
