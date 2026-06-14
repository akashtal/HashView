const logger = require('./logger');

class CircuitBreaker {
  constructor(name, failureThreshold = 5, resetTimeout = 30000) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout; // ms to wait before half-open

    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF-OPEN'
    this.failureCount = 0;
    this.nextAttempt = null;
  }

  async execute(action) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        logger.info(`[Circuit Breaker] ${this.name} changing to HALF-OPEN`);
        this.state = 'HALF-OPEN';
      } else {
        throw new Error(`Circuit breaker for ${this.name} is OPEN`);
      }
    }

    try {
      const result = await action();
      this.success();
      return result;
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  success() {
    if (this.state === 'HALF-OPEN') {
      logger.info(`[Circuit Breaker] ${this.name} changing to CLOSED`);
      this.state = 'CLOSED';
    }
    this.failureCount = 0;
  }

  fail(error) {
    this.failureCount++;
    logger.warn(`[Circuit Breaker] ${this.name} failed (${this.failureCount}/${this.failureThreshold}) - ${error.message}`);
    
    if (this.failureCount >= this.failureThreshold) {
      logger.error(`[Circuit Breaker] ${this.name} changing to OPEN`);
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }
}

module.exports = CircuitBreaker;
