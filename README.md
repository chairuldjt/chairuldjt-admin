# ⚡ ChairuldjtAdmin

Modern, glassmorphism-styled server dashboard for managing your personal Linux server.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)

## Features

| Feature | Description |
|---------|-------------|
| 📊 **Overview** | Real-time CPU, RAM, Disk, Load Average with live charts |
| 🔧 **Services** | Start/stop/restart systemd services |
| 💾 **Storage** | Mounted filesystems, disk I/O statistics |
| 🔒 **Security** | SSH auth logs, UFW firewall status & rules |
| 🖥 **Terminal** | Full web terminal via WebSocket (xterm.js) |
| 👥 **Users** | Linux system users from `/etc/passwd` |
| 🤖 **Telegram** | Alerts for high resource usage + shutdown reason detection |
| 🔔 **Notifications** | In-app notification center with real-time events |
| 🐕 **Watchdog** | Cross-server mutual health monitoring via cron |
| 🔐 **Auth** | JWT login with bcrypt-hashed passwords |

## Tech Stack

**Frontend:** React 19, Tailwind CSS v4, Recharts, Lucide Icons, xterm.js
**Backend:** Express.js v5, MySQL2, systeminformation, WebSocket
**Monitoring:** node-telegram-bot-api, cron watchdog

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MySQL server
- Ubuntu Linux (for full functionality)

### Install

```bash
git clone https://github.com/chairuldjt/chairuldjt-admin.git
cd chairuldjt-admin
npm install
```

### Configure

```bash
cp .env.example .env
nano .env
```

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=nexus_admin
JWT_SECRET=change-this-to-a-random-secret
PORT=5069
```

### Database

```bash
npm run db:init
```

### Run

```bash
# Development (2 ports: Vite 5173 + Express 5069)
npm run dev

# Production (single port: 5069)
npm run build
npm start
```

### Run with PM2

```bash
sudo npm install -g pm2
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # auto-start on server reboot
```

Useful PM2 commands:

```bash
pm2 logs              # real-time logs
pm2 monit             # CPU/RAM monitor
pm2 restart chairuldjt-admin
pm2 stop chairuldjt-admin
```

---

## Web Terminal Setup

The dashboard includes a full web terminal powered by **xterm.js + WebSocket**. It works in two modes:

### Basic Mode (works out of the box)

Uses Node.js `child_process.spawn` — provides a functional shell but without full terminal features like resize and colors.

### Full Mode (recommended for production)

Install `node-pty` for full PTY support (resize, colors, Ctrl+C handling):

```bash
# Install build tools (required for node-pty)
sudo apt update
sudo apt install -y build-essential python3

# Install node-pty
npm install node-pty
```

> **Note:** `node-pty` requires native compilation. If you see errors during `npm install node-pty`, make sure `build-essential` and `python3` are installed.

### Terminal behavior by OS

| OS | Shell | Notes |
|----|-------|-------|
| Linux | `/bin/bash` | Full support |
| Windows | `cmd.exe` | Basic support (for local dev only) |

### Cloudflare Tunnel

If serving via Cloudflare Tunnel, the terminal WebSocket works automatically. Ensure:

- **SSL/TLS** is set to **Full** in Cloudflare dashboard
- **WebSockets** are **enabled** (Network → WebSockets ON)

The frontend auto-detects the protocol and uses `wss://` for HTTPS connections.

---

## Telegram Monitoring

### Setup

1. Message [@BotFather](https://t.me/BotFather) → create bot → copy **API Token**
2. Message [@userinfobot](https://t.me/userinfobot) → get your **Chat ID**
3. Open **Settings** page in dashboard → enter token & chat ID → Save

### Notifications

| Event | Notification |
|-------|-------------|
| Server start | ✅ Online + hostname + timestamp |
| Settings refresh | 🔄 Restarted + hostname + timestamp |
| CPU/RAM > threshold | ⚠️ High Resource Usage + stats + timestamp |
| Ctrl+C / `systemctl stop` | 🔴 Offline — 🛑 Manual stop (Ctrl+C) |
| PM2 stop/restart | 🔴 Offline — ⚙️ Process terminated (systemctl/PM2/Docker) |
| SSH disconnect | 🔴 Offline — 📡 Terminal closed / SSH disconnected |
| Code crash | 🔴 Offline — 💥 Application crash |
| Power outage (on next boot) | 🔌 Recovery Alert — Unexpected shutdown |

Threshold and cooldown are configurable from the **Settings** page in the dashboard.

### Shutdown detection

The system uses a `.last_shutdown` state file:
- On start: writes `status: running`
- On graceful shutdown: writes `status: stopped` + reason
- On next boot: if file still says `running` → detected as ungraceful (power loss/OOM/crash)

---

## Watchdog (Cross-Server Monitoring)

For real-time detection of power outages and network failures, deploy the watchdog script on a **second server**. Both servers monitor each other.

```
Server Rumah ◄──── watchdog.sh (cron) ────► Server Kantor
     │                                          │
     └── monitors kantor every 2 min            └── monitors rumah every 2 min
```

### Setup

**On Server Rumah** (monitors Server Kantor):

```bash
nano scripts/watchdog.sh
```

```bash
# Edit these values:
TARGET_HOST="IP_SERVER_KANTOR"
TARGET_PORT="5069"
TARGET_NAME="Server Kantor"
THIS_SERVER="Server Rumah"
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_CHAT_ID="your_chat_id"
```

```bash
chmod +x scripts/watchdog.sh

# Add to cron (runs every 2 minutes)
crontab -e
# Add this line:
*/2 * * * * /absolute/path/to/scripts/watchdog.sh >> /var/log/watchdog.log 2>&1
```

**On Server Kantor** (monitors Server Rumah): same steps, swap `TARGET_*` values.

### Health check layers

The watchdog uses 3 layers of checks before declaring a server down:

| Layer | Method | What it checks |
|-------|--------|---------------|
| 1 | HTTP GET `/api/verify` | Application is running |
| 2 | TCP port check | Port 5069 is open |
| 3 | ICMP ping | Server is reachable |

After **3 consecutive failures** (~6 minutes) → sends alert to Telegram.
When server recovers → sends recovery notification.

---

## Deployment with Cloudflare Tunnel

```yaml
# In your Cloudflare Tunnel config:
- hostname: yourdomain.com
  service: http://localhost:5069
```

Production serves everything on **one port** (5069):
- `yourdomain.com/` → React dashboard
- `yourdomain.com/api/*` → REST API
- `yourdomain.com/ws/*` → WebSocket terminal

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/login` | ❌ | Login |
| GET | `/api/verify` | ✅ | Verify JWT token |
| GET | `/api/system-stats` | ✅ | CPU, RAM, Disk, Load Avg, Uptime |
| GET | `/api/services` | ✅ | List systemd services |
| POST | `/api/services/:name/:action` | ✅ | Start/stop/restart service |
| GET | `/api/storage` | ✅ | Filesystems + disk I/O |
| GET | `/api/security` | ✅ | SSH logs + UFW rules |
| GET | `/api/users` | ✅ | System users |
| GET | `/api/notifications` | ✅ | In-app notifications |
| POST | `/api/notifications/read-all` | ✅ | Mark all read |
| GET | `/api/monitor-status` | ✅ | Telegram monitor status |
| GET/POST | `/api/settings` | ✅ | Config (Telegram, threshold) |
| WS | `/ws/terminal` | ✅ | WebSocket shell |

---

## Project Structure

```
├── scripts/
│   └── watchdog.sh            # Cross-server health monitor
├── server/
│   ├── server.js              # Express API + WebSocket + static serving
│   ├── monitor.js             # Telegram monitoring + shutdown detection
│   └── dbInit.js              # Database migration
├── src/
│   ├── components/layout/
│   │   └── Shell.jsx          # Sidebar + Header + Notifications
│   ├── pages/
│   │   ├── Overview.jsx       # Dashboard home
│   │   ├── Services.jsx       # Systemd manager
│   │   ├── Storage.jsx        # Filesystem viewer
│   │   ├── Security.jsx       # SSH & firewall
│   │   ├── Terminal.jsx       # Web terminal (xterm.js)
│   │   ├── UsersPage.jsx      # System users
│   │   ├── Settings.jsx       # Telegram & monitoring config
│   │   └── Login.jsx          # Auth page
│   └── App.jsx                # React Router
├── ecosystem.config.cjs       # PM2 configuration
├── .env.example               # Environment template
└── package.json
```

## License

MIT
