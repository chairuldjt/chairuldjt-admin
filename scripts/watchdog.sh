#!/bin/bash
# ============================================================
# ChairuldjtAdmin Watchdog — Cross-Server Health Monitor
# ============================================================
# Deploy this script on BOTH servers.
# Each server monitors the OTHER server.
#
# Setup:
#   1. Edit the config below
#   2. chmod +x watchdog.sh
#   3. Add to cron: crontab -e
#      */2 * * * * /path/to/watchdog.sh >> /var/log/watchdog.log 2>&1
#
# How it works:
#   - Every 2 minutes, checks the TARGET server via HTTP
#   - If 3 consecutive failures → sends Telegram alert
#   - When server comes back → sends recovery alert
# ============================================================

# ─── CONFIG (edit these) ────────────────────────────────────
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID_HERE"

# Target server to monitor (the OTHER server)
# For same network: use IP, e.g. "192.168.1.100"
# For different networks: use Cloudflare domain, e.g. "chatech.site"
TARGET_HOST="10.45.128.127"
TARGET_PORT="5069"
TARGET_NAME="Server Rumah"

# This server's name (for identification in alerts)
THIS_SERVER="Server Kantor"

# How many consecutive failures before alerting (default: 3)
FAIL_THRESHOLD=3

# Use HTTPS? Set to "yes" if using Cloudflare domain
USE_HTTPS="no"

# State file to track failures (auto-generated, don't edit)
STATE_FILE="/tmp/watchdog_$(echo ${TARGET_HOST} | tr '.' '_')_state"
# ─────────────────────────────────────────────────────────────

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

send_telegram() {
    local message="$1"
    local result
    result=$(curl -s -w "%{http_code}" -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d parse_mode="Markdown" \
        -d text="${message}")
    echo "[${TIMESTAMP}] 📤 Telegram response: ${result}"
}

# Health check — only HTTP, most reliable for cross-network
check_server() {
    local proto="http"
    if [ "$USE_HTTPS" = "yes" ]; then
        proto="https"
    fi

    local url="${proto}://${TARGET_HOST}:${TARGET_PORT}/api/verify"
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "${url}" 2>/dev/null)
    local exit_code=$?

    echo "[${TIMESTAMP}] 🔍 Check ${url} → HTTP ${http_code}, curl exit ${exit_code}"

    # Success only if curl succeeded AND got HTTP 2xx
    if [ "$exit_code" -eq 0 ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        return 0
    fi

    return 1
}

# Read current failure count
if [ -f "$STATE_FILE" ]; then
    FAIL_COUNT=$(head -1 "$STATE_FILE")
    WAS_DOWN=$(tail -1 "$STATE_FILE")
else
    FAIL_COUNT=0
    WAS_DOWN="no"
fi

# Check the target server
if check_server; then
    # Server is UP
    if [ "$WAS_DOWN" = "yes" ]; then
        # Was down, now recovered!
        send_telegram "✅ *Recovery — ${TARGET_NAME}*

🖥 *Target:* \`${TARGET_HOST}\`
📡 *Monitored by:* ${THIS_SERVER}
💡 Server is back *ONLINE*
🕐 *Time:* ${TIMESTAMP}"
        echo "[${TIMESTAMP}] ✅ ${TARGET_NAME} recovered!"
    else
        echo "[${TIMESTAMP}] ✅ ${TARGET_NAME} is UP"
    fi
    echo "0" > "$STATE_FILE"
    echo "no" >> "$STATE_FILE"
else
    # Server is DOWN
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > "$STATE_FILE"

    echo "[${TIMESTAMP}] ❌ ${TARGET_NAME} check FAILED (${FAIL_COUNT}/${FAIL_THRESHOLD})"

    if [ "$FAIL_COUNT" -ge "$FAIL_THRESHOLD" ] && [ "$WAS_DOWN" != "yes" ]; then
        # Threshold reached — send alert!
        send_telegram "🔴 *Server DOWN — ${TARGET_NAME}*

🖥 *Target:* \`${TARGET_HOST}:${TARGET_PORT}\`
📡 *Monitored by:* ${THIS_SERVER}
❌ *Failed checks:* ${FAIL_COUNT} consecutive
💡 *Possible causes:*
  • 🔌 Power outage
  • 🌐 Network unreachable
  • 💥 Application crashed
  • 🖥 Server hardware failure
🕐 *Time:* ${TIMESTAMP}"
        echo "yes" >> "$STATE_FILE"
        echo "[${TIMESTAMP}] 🚨 ALERT SENT for ${TARGET_NAME}!"
    else
        echo "$WAS_DOWN" >> "$STATE_FILE"
    fi
fi
