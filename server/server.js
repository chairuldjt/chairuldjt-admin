import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initMonitor, refreshMonitorSettings, getMonitorStatus, sendShutdownNotification } from './monitor.js';
import si from 'systeminformation';

dotenv.config();
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Production: serve React build from dist/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// In-memory notification log
const notifications = [];
function addNotification(type, message) {
    notifications.unshift({ id: Date.now(), type, message, time: new Date().toISOString(), read: false });
    if (notifications.length > 50) notifications.pop();
}

// Start Monitoring Service & log initial boot
initMonitor();
addNotification('info', 'ChairuldjtAdmin server started.');

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied, token missing' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ───────────── AUTH ─────────────

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'User not found' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid password' });
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { username: user.username, full_name: user.full_name } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ───────────── SYSTEM STATS ─────────────

app.get('/api/system-stats', authenticateToken, async (req, res) => {
    try {
        const [cpu, mem, disk, osInfo, time] = await Promise.all([
            si.currentLoad(), si.mem(), si.fsSize(), si.osInfo(), si.time()
        ]);
        const loadAvg = os.loadavg();
        res.json({
            cpu: cpu.currentLoad.toFixed(1),
            mem: {
                used: (mem.active / (1024 ** 3)).toFixed(1),
                total: (mem.total / (1024 ** 3)).toFixed(1),
                percent: ((mem.active / mem.total) * 100).toFixed(1)
            },
            disk: {
                used: (disk[0].used / (1024 ** 3)).toFixed(1),
                total: (disk[0].size / (1024 ** 3)).toFixed(1),
                percent: disk[0].use.toFixed(1)
            },
            loadAvg: loadAvg[0].toFixed(2),
            uptime: time.uptime,
            hostname: osInfo.hostname,
            distro: osInfo.distro,
            kernel: osInfo.kernel
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────── SERVICES (systemd) ─────────────

app.get('/api/services', authenticateToken, async (req, res) => {
    try {
        const { stdout } = await execAsync(
            "systemctl list-units --type=service --all --no-pager --plain --output=json 2>/dev/null || " +
            "systemctl list-units --type=service --all --no-pager --plain"
        );
        // Try JSON parse first (newer systemd), fallback to text parsing
        let services = [];
        try {
            services = JSON.parse(stdout).map(s => ({
                name: s.unit, description: s.description,
                status: s.active, sub: s.sub
            }));
        } catch {
            // Text fallback
            const lines = stdout.trim().split('\n').filter(l => l.includes('.service'));
            services = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    name: parts[0], status: parts[2] || 'unknown',
                    sub: parts[3] || '', description: parts.slice(4).join(' ')
                };
            });
        }
        res.json(services);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/services/:name/:action', authenticateToken, async (req, res) => {
    const { name, action } = req.params;
    const allowed = ['start', 'stop', 'restart'];
    if (!allowed.includes(action)) return res.status(400).json({ error: 'Invalid action' });
    try {
        await execAsync(`sudo systemctl ${action} ${name}`);
        res.json({ message: `${name} ${action}ed successfully` });
    } catch (err) {
        res.status(500).json({ error: err.stderr || err.message });
    }
});

// ───────────── STORAGE ─────────────

app.get('/api/storage', authenticateToken, async (req, res) => {
    try {
        const [disks, diskIO] = await Promise.all([si.fsSize(), si.disksIO()]);
        const filesystems = disks.map(d => ({
            fs: d.fs, type: d.type, mount: d.mount,
            size: (d.size / (1024 ** 3)).toFixed(1),
            used: (d.used / (1024 ** 3)).toFixed(1),
            available: ((d.size - d.used) / (1024 ** 3)).toFixed(1),
            percent: d.use.toFixed(1)
        }));
        res.json({
            filesystems,
            io: {
                read: ((diskIO.rIO_sec || 0) / (1024 ** 2)).toFixed(2),
                write: ((diskIO.wIO_sec || 0) / (1024 ** 2)).toFixed(2)
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────── SECURITY ─────────────

app.get('/api/security', authenticateToken, async (req, res) => {
    try {
        // SSH Auth Logs
        let authLogs = [];
        try {
            const { stdout } = await execAsync("journalctl -u ssh -u sshd --no-pager -n 50 --output=short-iso 2>/dev/null || echo ''");
            authLogs = stdout.trim().split('\n').filter(l => l.length > 5).map(line => {
                const isSuccess = line.includes('Accepted');
                const isFailed = line.includes('Failed') || line.includes('Invalid');
                return { raw: line, type: isSuccess ? 'success' : isFailed ? 'failed' : 'info' };
            }).slice(-30);
        } catch { /* no log access */ }

        // UFW Status
        let firewall = { active: false, rules: [] };
        try {
            const { stdout } = await execAsync("sudo ufw status numbered 2>/dev/null || echo 'inactive'");
            firewall.active = stdout.includes('Status: active');
            const ruleLines = stdout.split('\n').filter(l => l.match(/^\[\s*\d+\]/));
            firewall.rules = ruleLines.map(r => r.trim());
        } catch { /* ufw not available */ }

        res.json({ authLogs, firewall });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────── SYSTEM USERS ─────────────

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const passwdContent = readFileSync('/etc/passwd', 'utf-8');
        const users = passwdContent.trim().split('\n').map(line => {
            const [username, , uid, gid, info, home, shell] = line.split(':');
            return { username, uid: parseInt(uid), gid: parseInt(gid), info: info || '', home, shell };
        });
        res.json(users);
    } catch (err) {
        // Windows fallback for development
        res.json([
            { username: 'root', uid: 0, gid: 0, info: 'root', home: '/root', shell: '/bin/bash' },
            { username: 'chairul', uid: 1000, gid: 1000, info: '', home: '/home/chairul', shell: '/bin/bash' },
        ]);
    }
});

// ───────────── SETTINGS ─────────────

app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/monitor-status', authenticateToken, async (req, res) => {
    try {
        const status = await getMonitorStatus();
        res.json(status);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────── NOTIFICATIONS ─────────────

app.get('/api/notifications', authenticateToken, (req, res) => {
    res.json(notifications);
});

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
    notifications.forEach(n => n.read = true);
    res.json({ message: 'All marked as read' });
});

// ───────────── SETTINGS ─────────────

app.post('/api/settings', authenticateToken, async (req, res) => {
    const settings = req.body;
    try {
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }
        refreshMonitorSettings();
        addNotification('success', 'Monitoring settings updated.');
        res.json({ message: 'Settings saved successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ───────────── HTTP + WebSocket Server ─────────────

const server = createServer(app);

// WebSocket Terminal
const wss = new WebSocketServer({ server, path: '/ws/terminal' });

wss.on('connection', async (ws, req) => {
    // Verify JWT from query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) { ws.close(1008, 'No token'); return; }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch { ws.close(1008, 'Invalid token'); return; }

    console.log('🖥 Terminal WebSocket connected');

    // Detect shell based on OS
    const isWindows = process.platform === 'win32';
    const shellPath = isWindows ? 'cmd.exe' : '/bin/bash';
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';

    // Try to use node-pty if available, otherwise use child_process
    try {
        const { spawn } = await import('node-pty');
        const pty = spawn(shellPath, [], {
            name: 'xterm-256color',
            cols: 120, rows: 30,
            cwd: homeDir,
            env: process.env
        });
        pty.onData(data => { if (ws.readyState === 1) ws.send(data); });
        ws.on('message', msg => {
            const str = msg.toString();
            try {
                const parsed = JSON.parse(str);
                if (parsed.type === 'resize') pty.resize(parsed.cols, parsed.rows);
                else pty.write(str);
            } catch { pty.write(str); }
        });
        ws.on('close', () => { pty.kill(); console.log('🖥 Terminal disconnected'); });
    } catch {
        // Fallback: use child_process.spawn
        try {
            const { spawn: cpSpawn } = await import('child_process');
            const shell = cpSpawn(shellPath, [], {
                cwd: homeDir,
                env: { ...process.env, TERM: 'xterm-256color' }
            });
            shell.on('error', (err) => {
                console.error('❌ Shell spawn error:', err.message);
                if (ws.readyState === 1) ws.send(`\r\nError: ${err.message}\r\n`);
                ws.close();
            });
            shell.stdout.on('data', d => { if (ws.readyState === 1) ws.send(d.toString()); });
            shell.stderr.on('data', d => { if (ws.readyState === 1) ws.send(d.toString()); });
            ws.on('message', msg => shell.stdin.write(msg.toString()));
            ws.on('close', () => { shell.kill(); console.log('🖥 Terminal disconnected (fallback)'); });
        } catch (err) {
            console.error('❌ Terminal fallback failed:', err.message);
            if (ws.readyState === 1) ws.send(`\r\nTerminal not available: ${err.message}\r\n`);
            ws.close();
        }
    }
});

// Production: SPA fallback — all non-API routes serve index.html
if (existsSync(distPath)) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

server.listen(PORT, () => {
    console.log(`📡 ChairuldjtAdmin running on http://localhost:${PORT}`);
});

// Graceful shutdown — send Telegram "going offline" notification with reason
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Sending shutdown notification...`);
    try {
        await sendShutdownNotification(signal);
    } catch (err) {
        console.error('❌ Shutdown notification error:', err.message);
    }
    process.exit(0);
};

// Linux signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Windows: Ctrl+Break
process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));

// Crash handlers — detect application errors
process.on('uncaughtException', async (err) => {
    console.error('💥 Uncaught Exception:', err.message);
    await gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', async (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    await gracefulShutdown('UNHANDLED_REJECTION');
});
