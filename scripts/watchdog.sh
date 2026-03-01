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
#   - Every 2 minutes, pings the TARGET server
#   - If 3 consecutive failures → sends Telegram alert
#   - When server comes back → sends recovery alert
# ============================================================

# ─── CONFIG (edit these) ────────────────────────────────────
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
TELEGRAM_CHAT_ID="YOUR_CHAT_ID_HERE"

# Target server to monitor (the OTHER server's IP/domain)
TARGET_HOST="10.45.128.127"
TARGET_PORT="5069"
TARGET_NAME="Server Rumah"

# This server's name (for identification)
THIS_SERVER="Server Kantor"

# How many consecutive failures before alerting
FAIL_THRESHOLD=3

# State file to track failures
STATE_FILE="/tmp/watchdog_${TARGET_HOST}_state"
# ─────────────────────────────────────────────────────────────

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

send_telegram() {
    local message="$1"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d parse_mode="Markdown" \
        -d text="${message}" > /dev/null 2>&1
}

# Try HTTP health check first, fallback to ping
check_server() {
    # Method 1: HTTP check (if ChairuldjtAdmin backend is running)
    if curl -s --connect-timeout 5 --max-time 10 "http://${TARGET_HOST}:${TARGET_PORT}/api/verify" > /dev/null 2>&1; then
        return 0
    fi

    # Method 2: Simple TCP port check
    if timeout 5 bash -c "echo > /dev/tcp/${TARGET_HOST}/${TARGET_PORT}" 2>/dev/null; then
        return 0
    fi

    # Method 3: ICMP ping fallback
    if ping -c 2 -W 3 "${TARGET_HOST}" > /dev/null 2>&1; then
        return 0
    fi

    return 1
}

# Read current failure count
if [ -f "$STATE_FILE" ]; then
    FAIL_COUNT=$(cat "$STATE_FILE" | head -1)
    WAS_DOWN=$(cat "$STATE_FILE" | tail -1)
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
    fi
    echo "0" > "$STATE_FILE"
    echo "no" >> "$STATE_FILE"
else
    # Server is DOWN
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$FAIL_COUNT" > "$STATE_FILE"

    echo "[${TIMESTAMP}] ❌ ${TARGET_NAME} check failed (${FAIL_COUNT}/${FAIL_THRESHOLD})"

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
        echo "[${TIMESTAMP}] 🚨 Alert sent for ${TARGET_NAME}!"
    else
        echo "$WAS_DOWN" >> "$STATE_FILE"
    fi
fi
