/**
 * Pipeline Layer 4: Retriever
 *
 * Executes the MongoDB aggregation pipeline built by Layer 3.
 * Uses a read-only connection pattern — this layer NEVER writes.
 *
 * Returns raw business data + total count for pagination.
 */

const mongoose = require('mongoose');

/**
 * Layer 4: Execute the aggregation pipeline against MongoDB.
 *
 * @param {Object[]} pipeline - Aggregation pipeline from Layer 3
 * @returns {Promise<{ businesses: Object[], totalCount: number }>}
 */
async function executeQuery(pipeline) {
  // Use the existing Mongoose connection (established in server.js)
  const Business = mongoose.model('Business');

  const queryStart = Date.now();
  const rawResult = await Business.aggregate(pipeline).allowDiskUse(true);
  const queryMs = Date.now() - queryStart;

  // $facet returns: [{ total: [{count: N}], results: [...] }]
  const facet = rawResult[0] || {};
  const totalCount = facet.total?.[0]?.count || 0;
  const businesses = facet.results || [];

  return { businesses, totalCount, queryMs };
}

module.exports = { executeQuery };
