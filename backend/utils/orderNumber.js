/**
 * Generates a unique, human-readable order number.
 * Format: HV-{BUSINESS_CODE}-{SEQUENCE}
 * Example: HV-ABC-0042
 */
exports.generateOrderNumber = async (businessId) => {
  // Scaffolding for Phase 1
  const crypto = require('crypto');
  const sequence = crypto.randomInt(1000, 9999);
  return `HV-TEMP-${sequence}`; // Will be replaced with real sequence logic in Phase 5
};
