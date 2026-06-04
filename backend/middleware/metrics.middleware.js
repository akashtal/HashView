/**
 * HashView API Metrics Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks per-request metrics that are exported to Grafana Cloud via the
 * /metrics endpoint (Prometheus format). Grafana Cloud scrapes this endpoint
 * every 15–60 seconds.
 *
 * Metrics collected:
 *   • http_requests_total          — request count by method, route, status
 *   • http_request_duration_ms     — response time histogram by route
 *   • http_errors_total            — count of 4xx/5xx errors by route
 *   • active_users_total           — unique authenticated users (1hr window)
 *
 * To enable Grafana Cloud scraping:
 *   1. Create a free account at grafana.com/products/cloud
 *   2. Go to Connections → Add new connection → Prometheus
 *   3. Set the scrape URL to: https://api.hashview.co.uk/metrics
 *   4. Add header: Authorization: Bearer YOUR_GRAFANA_TOKEN
 *      (set GRAFANA_METRICS_TOKEN in .env to protect the /metrics endpoint)
 */

// Request counters
const counters = {
  requests: {},      // { 'POST /reviews': { total: 0, success: 0, errors: 0 } }
  errorsByCode: {},  // { '500': 5, '404': 2 }
  activeUsers: new Set(),
  activeUsersTimestamps: {},
};

// Histogram buckets for response time (ms)
const BUCKETS = [10, 50, 100, 200, 500, 1000, 2000, 5000, Infinity];
const durationHistogram = {}; // { 'POST /reviews': [0, 0, 0, ...] }

const normalizeRoute = (req) => {
  // Replace dynamic params like /business/63a1b... with /business/:id
  // to avoid high-cardinality metrics blowup
  let route = req.route?.path || req.path || 'unknown';
  // Replace MongoDB ObjectId patterns
  route = route.replace(/\/[0-9a-f]{24}(\/|$)/gi, '/:id$1');
  // Replace UUIDs
  route = route.replace(/\/[0-9a-f-]{36}(\/|$)/gi, '/:id$1');
  return `${req.method} ${route}`;
};

// ─── Middleware: Record request start time ────────────────────────────────────
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = normalizeRoute(req);
    const status = res.statusCode;

    // ── Request counter ───────────────────────────────────────────────────────
    if (!counters.requests[route]) {
      counters.requests[route] = { total: 0, success: 0, errors: 0 };
    }
    counters.requests[route].total++;

    if (status >= 200 && status < 400) {
      counters.requests[route].success++;
    } else {
      counters.requests[route].errors++;
      counters.errorsByCode[status] = (counters.errorsByCode[status] || 0) + 1;
    }

    // ── Duration histogram ────────────────────────────────────────────────────
    if (!durationHistogram[route]) {
      durationHistogram[route] = new Array(BUCKETS.length).fill(0);
    }
    const bucketIdx = BUCKETS.findIndex((b) => duration <= b);
    durationHistogram[route][bucketIdx >= 0 ? bucketIdx : BUCKETS.length - 1]++;

    // ── Active users (1-hour rolling window) ─────────────────────────────────
    if (req.userId) {
      const now = Date.now();
      counters.activeUsers.add(req.userId);
      counters.activeUsersTimestamps[req.userId] = now;

      // Evict users not seen in the last hour
      const oneHourAgo = now - 60 * 60 * 1000;
      for (const [uid, ts] of Object.entries(counters.activeUsersTimestamps)) {
        if (ts < oneHourAgo) {
          counters.activeUsers.delete(uid);
          delete counters.activeUsersTimestamps[uid];
        }
      }
    }
  });

  next();
};

// ─── Prometheus exposition format ────────────────────────────────────────────
const renderMetrics = () => {
  const lines = [];

  // http_requests_total
  lines.push('# HELP http_requests_total Total HTTP requests by route and outcome');
  lines.push('# TYPE http_requests_total counter');
  for (const [route, counts] of Object.entries(counters.requests)) {
    const label = route.replace(/"/g, '\\"');
    lines.push(`http_requests_total{route="${label}",outcome="success"} ${counts.success}`);
    lines.push(`http_requests_total{route="${label}",outcome="error"} ${counts.errors}`);
  }

  // http_errors_total
  lines.push('# HELP http_errors_total Total HTTP errors by status code');
  lines.push('# TYPE http_errors_total counter');
  for (const [code, count] of Object.entries(counters.errorsByCode)) {
    lines.push(`http_errors_total{status="${code}"} ${count}`);
  }

  // http_request_duration_ms histogram
  lines.push('# HELP http_request_duration_ms Response duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms histogram');
  for (const [route, buckets] of Object.entries(durationHistogram)) {
    const label = route.replace(/"/g, '\\"');
    let cumulative = 0;
    BUCKETS.forEach((le, i) => {
      cumulative += buckets[i];
      const leLabel = le === Infinity ? '+Inf' : String(le);
      lines.push(`http_request_duration_ms_bucket{route="${label}",le="${leLabel}"} ${cumulative}`);
    });
    lines.push(`http_request_duration_ms_count{route="${label}"} ${buckets.reduce((a, b) => a + b, 0)}`);
  }

  // active_users
  lines.push('# HELP active_users_total Unique authenticated users active in the last 1 hour');
  lines.push('# TYPE active_users_total gauge');
  lines.push(`active_users_total ${counters.activeUsers.size}`);

  // process uptime
  lines.push('# HELP process_uptime_seconds Node.js process uptime');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

  // memory
  const mem = process.memoryUsage();
  lines.push('# HELP process_memory_heap_used_bytes Heap memory used');
  lines.push('# TYPE process_memory_heap_used_bytes gauge');
  lines.push(`process_memory_heap_used_bytes ${mem.heapUsed}`);

  return lines.join('\n') + '\n';
};

module.exports = { metricsMiddleware, renderMetrics };
