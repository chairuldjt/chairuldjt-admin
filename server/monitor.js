import si from 'systeminformation';
import TelegramBot from 'node-telegram-bot-api';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHUTDOWN_FILE = path.join(__dirname, '.last_shutdown');

let bot = null;
let chatId = null;
let isMonitoring = false;
let alertThreshold = 90;
let alertCooldown = 10 * 60 * 1000;
let lastAlertTime = 0;
const hostname = os.hostname();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

const timestamp = () => new Date().toLocaleString();

// Signal → human-readable reason map
const SHUTDOWN_REASONS = {
    'SIGINT': '🛑 Manual stop (Ctrl+C)',
    'SIGTERM': '⚙️ Process terminated (systemctl/PM2/Docker)',
    'SIGHUP': '📡 Terminal closed / SSH disconnected',
    'SIGBREAK': '🛑 Manual stop (Ctrl+Break)',
    'UNCAUGHT_EXCEPTION': '💥 Application crash (uncaught exception)',
    'UNHANDLED_REJECTION': '💥 Application crash (unhandled promise)',
};

async function getTelegramSettings() {
    const [rows] = await pool.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    return settings;
}

export async function getMonitorStatus() {
    const settings = await getTelegramSettings();
    return {
        configured: !!(settings.telegram_token && settings.telegram_chat_id),
        monitoring: isMonitoring,
        threshold: parseInt(settings.alert_threshold) || 90,
        cooldown: parseInt(settings.alert_cooldown) || 10,
    };
}

// Mark server as "running" — on next boot, if this file is missing → ungraceful shutdown
function markRunning() {
    try {
        fs.writeFileSync(SHUTDOWN_FILE, JSON.stringify({ status: 'running', pid: process.pid, since: new Date().toISOString() }));
    } catch { /* ignore */ }
}

// Mark server as "stopped" — written during graceful shutdown
function markStopped(reason) {
    try {
        fs.writeFileSync(SHUTDOWN_FILE, JSON.stringify({ status: 'stopped', reason, time: new Date().toISOString() }));
    } catch { /* ignore */ }
}

// Check if last shutdown was clean or not
function detectLastShutdown() {
    try {
        if (!fs.existsSync(SHUTDOWN_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(SHUTDOWN_FILE, 'utf-8'));
        // If file says "running" → last shutdown was NOT graceful (power loss, OOM, crash)
        if (data.status === 'running') {
            return { ungraceful: true, lastPid: data.pid, runningSince: data.since };
        }
        return { ungraceful: false, reason: data.reason, time: data.time };
    } catch { return null; }
}

export async function initMonitor() {
    const settings = await getTelegramSettings();
    const token = settings.telegram_token;
    chatId = settings.telegram_chat_id;
    alertThreshold = parseInt(settings.alert_threshold) || 90;
    alertCooldown = (parseInt(settings.alert_cooldown) || 10) * 60 * 1000;

    if (token && chatId) {
        try {
            const isRestart = !!bot;
            bot = new TelegramBot(token, { polling: false });
            console.log('🤖 Telegram Bot initialized for monitoring.');

            if (!isMonitoring) {
                startMonitoringLoop();

                // Check for ungraceful shutdown on first boot
                const lastShutdown = detectLastShutdown();
                if (lastShutdown?.ungraceful) {
                    const recoveryMsg = `🔌 *Recovery Alert*\n\n🖥 *Host:* \`${hostname}\`\n⚠️ Last shutdown was *unexpected*\n💡 *Possible cause:* Power outage, OOM kill, or system crash\n📅 *Was running since:* ${lastShutdown.runningSince}\n🕐 *Recovered at:* ${timestamp()}`;
                    bot.sendMessage(chatId, recoveryMsg, { parse_mode: 'Markdown' }).catch(() => { });
                }
            }

            // Mark as running for next boot check
            markRunning();

            // Send boot / restart notification
            const msgType = isRestart ? '🔄 *Restarted*' : '✅ *Online*';
            const msg = `${msgType}\n\n🖥 *Host:* \`${hostname}\`\n📡 ChairuldjtAdmin monitoring is active.\n📏 Threshold: ${alertThreshold}%\n🕐 *Time:* ${timestamp()}`;

            bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' })
                .then(() => console.log('💬 Telegram notification sent.'))
                .catch(err => console.log('ℹ️ Notification failed:', err.message));

        } catch (err) {
            console.error('❌ Failed to init Telegram Bot:', err.message);
        }
    } else {
        console.log('ℹ️ Telegram settings incomplete, monitor in standby.');
        markRunning();
    }
}

async function startMonitoringLoop() {
    isMonitoring = true;
    console.log('📊 Starting monitoring loop (every 60s)...');

    setInterval(async () => {
        try {
            const cpu = await si.currentLoad();
            const mem = await si.mem();
            const cpuLoad = cpu.currentLoad;
            const memUsedPercent = (mem.active / mem.total) * 100;

            if (cpuLoad > alertThreshold || memUsedPercent > alertThreshold) {
                const now = Date.now();
                if (now - lastAlertTime > alertCooldown) {
                    const message = `⚠️ *High Resource Usage!*\n\n` +
                        `🖥 *Host:* \`${hostname}\`\n` +
                        `🖥 *CPU:* ${cpuLoad.toFixed(1)}%\n` +
                        `🧠 *RAM:* ${memUsedPercent.toFixed(1)}%\n` +
                        `📏 *Threshold:* ${alertThreshold}%\n` +
                        `🕐 *Time:* ${timestamp()}`;

                    if (bot && chatId) {
                        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                        lastAlertTime = now;
                    }
                }
            }
        } catch (err) {
            console.error('❌ Monitoring Loop Error:', err.message);
        }
    }, 60000);
}

// Called from graceful shutdown handler with signal/reason
export async function sendShutdownNotification(signal) {
    const reason = SHUTDOWN_REASONS[signal] || `Unknown (${signal})`;
    markStopped(reason);

    if (bot && chatId) {
        try {
            const msg = `🔴 *Server OFFLINE*\n\n` +
                `🖥 *Host:* \`${hostname}\`\n` +
                `📋 *Reason:* ${reason}\n` +
                `🕐 *Time:* ${timestamp()}`;
            await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
            console.log('📤 Shutdown notification sent.');
        } catch (err) {
            console.error('❌ Shutdown notification failed:', err.message);
        }
    }
}

export async function refreshMonitorSettings() {
    console.log('🔄 Refreshing monitor settings...');
    await initMonitor();
}
