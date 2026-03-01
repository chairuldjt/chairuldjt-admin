import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.watchdog');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('❌ .env.watchdog file not found! Please create it based on .env.watchdog.example');
    process.exit(1);
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TARGET_HOST = process.env.TARGET_HOST;
const TARGET_PORT = process.env.TARGET_PORT;
const TARGET_NAME = process.env.TARGET_NAME || 'Remote Server';
const THIS_SERVER = process.env.THIS_SERVER || 'Watchdog';
const FAIL_THRESHOLD = parseInt(process.env.FAIL_THRESHOLD) || 3;
const USE_HTTPS = process.env.USE_HTTPS === 'yes';

if (!BOT_TOKEN || !CHAT_ID || !TARGET_HOST) {
    console.error('❌ Missing required configuration in .env.watchdog');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });
const protocol = USE_HTTPS ? 'https' : 'http';
const url = `${protocol}://${TARGET_HOST}${TARGET_PORT ? ':' + TARGET_PORT : ''}`;

let failureCount = 0;
let isDown = false;

const timestamp = () => new Date().toLocaleString();

async function sendTelegram(message) {
    try {
        await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('❌ Failed to send Telegram notification:', err.message);
    }
}

async function checkServer() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        if (isDown) {
            const msg = `✅ *Server RECOVERED*\n\n` +
                `🖥 *Target:* \`${TARGET_NAME}\`\n` +
                `📡 *URL:* ${url}\n` +
                `🕵️‍♂️ *Reporter:* \`${THIS_SERVER}\`\n` +
                `🕐 *Time:* ${timestamp()}`;
            console.log(msg.replace(/\*/g, ''));
            await sendTelegram(msg);
            isDown = false;
        }

        failureCount = 0;
    } catch (err) {
        failureCount++;
        const errorMsg = err.name === 'AbortError' ? 'Timeout' : err.message;
        console.log(`⚠️ Check failed (${failureCount}/${FAIL_THRESHOLD}): ${errorMsg}`);

        if (failureCount >= FAIL_THRESHOLD && !isDown) {
            isDown = true;
            const msg = `🚨 *Server DOWN Alert*\n\n` +
                `🖥 *Target:* \`${TARGET_NAME}\`\n` +
                `📡 *URL:* ${url}\n` +
                `❌ *Error:* ${errorMsg}\n` +
                `🕵️‍♂️ *Reporter:* \`${THIS_SERVER}\`\n` +
                `🕐 *Time:* ${timestamp()}`;
            console.error(msg.replace(/\*/g, ''));
            await sendTelegram(msg);
        }
    }
}

console.log(`🚀 Watchdog started on \`${THIS_SERVER}\` monitoring \`${TARGET_NAME}\` (${url})`);
console.log(`📏 Alert Threshold: ${FAIL_THRESHOLD} consecutive failures.`);

// Initial check
checkServer();

// Run every 60 seconds
setInterval(checkServer, 60000);
