#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# HashView EC2 — Grafana Alloy Deploy Script
# ─────────────────────────────────────────────────────────────────────────────
# Run this script ON THE EC2 SERVER (not locally):
#   ssh -i hashview-backend.pem ec2-user@44.249.50.162
#   bash /home/ec2-user/HashView/backend/scripts/deploy-alloy.sh
#
# What this does:
#   1. Installs Grafana Alloy agent via Grafana's official install script
#   2. Copies the HashView Alloy config to /etc/alloy/config.alloy
#   3. Restarts the alloy systemd service
#   4. Updates backend .env with the correct GRAFANA_METRICS_TOKEN
#   5. Restarts the HashView backend via PM2 to pick up the new .env

set -e  # Exit on any error

HASHVIEW_DIR="/home/ec2-user/HashView"
BACKEND_DIR="$HASHVIEW_DIR/backend"
ALLOY_CONFIG_DEST="/etc/alloy/config.alloy"
METRICS_TOKEN="hashview-metrics-secret-2025"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  HashView → Grafana Alloy Deployment"
echo "════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Install Grafana Alloy ───────────────────────────────────────────
echo "▶ Step 1: Installing Grafana Alloy..."

GCLOUD_HOSTED_METRICS_ID="3283306" \
GCLOUD_HOSTED_METRICS_URL="https://prometheus-prod-55-prod-gb-south-1.grafana.net/api/prom/push" \
GCLOUD_HOSTED_LOGS_ID="1637328" \
GCLOUD_HOSTED_LOGS_URL="https://logs-prod-035.grafana.net/loki/api/v1/push" \
GCLOUD_FM_URL="https://fleet-management-prod-023.grafana.net" \
GCLOUD_FM_POLL_FREQUENCY="60s" \
GCLOUD_FM_HOSTED_ID="1679541" \
ARCH="amd64" \
GCLOUD_RW_API_KEY="glc_eyJvIjoiMTgwMDQ4NCIsIm4iOiJzdGFjay0xNjc5NTQxLWFsbG95LWhhc2h2aWV3IiwiayI6IjhqTUh1OGRISjI4VUlRM0Y5MjgyWVF6MyIsIm0iOnsiciI6InByb2QtZ2Itc291dGgtMSJ9fQ==" \
/bin/sh -c "$(curl -fsSL https://storage.googleapis.com/cloud-onboarding/alloy/scripts/install-linux.sh)"

echo "✅ Grafana Alloy installed"

# ─── Step 2: Copy HashView Alloy config ──────────────────────────────────────
echo ""
echo "▶ Step 2: Installing HashView Alloy config..."

sudo cp "$BACKEND_DIR/alloy.config.river" "$ALLOY_CONFIG_DEST"
echo "✅ Config copied to $ALLOY_CONFIG_DEST"

# ─── Step 3: Update backend .env with GRAFANA_METRICS_TOKEN ──────────────────
echo ""
echo "▶ Step 3: Updating backend .env with metrics token..."

if grep -q "GRAFANA_METRICS_TOKEN=" "$BACKEND_DIR/.env"; then
    # Update existing token line
    sed -i "s/^GRAFANA_METRICS_TOKEN=.*/GRAFANA_METRICS_TOKEN=$METRICS_TOKEN/" "$BACKEND_DIR/.env"
else
    # Append if not found
    echo "GRAFANA_METRICS_TOKEN=$METRICS_TOKEN" >> "$BACKEND_DIR/.env"
fi
echo "✅ GRAFANA_METRICS_TOKEN set in .env"

# ─── Step 4: Restart HashView backend to pick up new .env ────────────────────
echo ""
echo "▶ Step 4: Restarting HashView backend via PM2..."
cd "$BACKEND_DIR"
pm2 restart hashview-backend --update-env
echo "✅ Backend restarted"

# ─── Step 5: Restart Grafana Alloy service ───────────────────────────────────
echo ""
echo "▶ Step 5: Starting Grafana Alloy service..."
sudo systemctl enable alloy
sudo systemctl restart alloy
sleep 3
sudo systemctl status alloy --no-pager | head -20
echo "✅ Alloy service running"

# ─── Step 6: Verify the /metrics endpoint is reachable by Alloy ──────────────
echo ""
echo "▶ Step 6: Testing /metrics endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $METRICS_TOKEN" \
    http://localhost:5001/metrics)

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ /metrics endpoint responding (HTTP 200)"
    echo ""
    echo "First 5 metric lines:"
    curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:5001/metrics | head -5
else
    echo "❌ /metrics returned HTTP $HTTP_STATUS — check backend is running"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  Next: Go to Grafana Cloud → Explore → Prometheus"
echo "  Query: http_requests_total{job=\"hashview-backend\"}"
echo "  Metrics should appear within 1-2 minutes."
echo "════════════════════════════════════════════════════════"
echo ""
