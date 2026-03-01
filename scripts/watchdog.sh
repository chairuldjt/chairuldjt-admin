#!/bin/bash
# ============================================================
# ChairuldjtAdmin Watchdog — Cross-Server Health Monitor
# ============================================================
# Deploy this script on BOTH servers.
# Each server monitors the OTHER server.
#
# Setup:
#   1. Copy .env.watchdog.example → .env.watchdog
#   2. Edit .env.watchdog with your values
#   3. chmod +x watchdog.sh
#   4. Add to cron: crontab -e
#      */2 * * * * /path/to/watchdog.sh >> /var/log/watchdog.log 2>&1
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.watchdog"

# Load config from .env.watchdog
if [ ! -f "$ENV_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Config file not found: ${ENV_FILE}"
    echo "  Copy .env.watchdog.example to .env.watchdog and edit it."
    exit 1
fi

source "$ENV_FILE"

# Defaults
FAIL_THRESHOLD="${FAIL_THRESHOLD:-3}"
USE_HTTPS="${USE_HTTPS:-no}"
TARGET_PORT="${TARGET_PORT:-5069}"
TARGET_NAME="${TARGET_NAME:-Remote Server}"
THIS_SERVER="${THIS_SERVER:-This Server}"

# State file (auto-generated)
STATE_FILE="/tmp/watchdog_$(echo ${TARGET_HOST} | tr './' '_')_state"

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

if check_server; then
    if [ "$WAS_DOWN" = "yes" ]; then
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
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > "$STATE_FILE"

    echo "[${TIMESTAMP}] ❌ ${TARGET_NAME} check FAILED (${FAIL_COUNT}/${FAIL_THRESHOLD})"

    if [ "$FAIL_COUNT" -ge "$FAIL_THRESHOLD" ] && [ "$WAS_DOWN" != "yes" ]; then
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
