# Operations Runbook

## 1. Redis Connection Failures
**Symptom:** App fails to start, throwing `ECONNREFUSED` on port 6379.
**Action:** 
- Check if Redis is running: `sudo systemctl status redis`
- Verify firewall rules on AWS ElastiCache.

## 2. Socket.IO Disconnects
**Symptom:** Clients rapidly connect and disconnect.
**Action:**
- Ensure the Load Balancer is configured for sticky sessions.
- Verify the PM2 instances are correctly talking to the Redis Adapter.

## 3. PM2 Instance Crashes
**Symptom:** 502 Bad Gateway errors.
**Action:**
- Read logs: `pm2 logs hashview-api`
- Usually caused by unhandled Promise rejections. Check Sentry dashboard.
