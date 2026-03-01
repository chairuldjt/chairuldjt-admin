# ⚡ ChairuldjtAdmin

Modern, glassmorphism-styled server dashboard for managing your personal Linux server.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)

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
**Backend:** Express.js, MySQL2, systeminformation, WebSocket
**Monitoring:** node-telegram-bot-api, cron watchdog

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MySQL server
- Ubuntu Linux (for full functionality)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/chairuldjt-admin.git
cd chairuldjt-admin
npm install
```

### Configure

```bash
cp .env.example .env
nano .env  # Edit DB credentials & JWT secret
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
# Development (frontend + backend)
npm run dev

# Production (backend only, serve dist/ via nginx)
npm run build
npm start
```

> For better terminal support: `sudo apt install build-essential python3 && npm install node-pty`

---

## Telegram Monitoring

### Setup

1. Message [@BotFather](https://t.me/BotFather) → create bot → copy **API Token**
2. Message [@userinfobot](https://t.me/userinfobot) → get your **Chat ID**
3. Open **Settings** page in dashboard → save both values

### Notifications

| Event | Notification |
|-------|-------------|
| Server start | ✅ Online + hostname + timestamp |
| Settings refresh | 🔄 Restarted |
| CPU/RAM > threshold | ⚠️ High Resource Usage |
| Ctrl+C / `systemctl stop` | 🔴 Offline — Manual stop |
| SSH disconnect | 🔴 Offline — Terminal closed |
| Code crash | 🔴 Offline — Application crash |
| Power outage (on next boot) | 🔌 Recovery Alert — Unexpected shutdown |

Threshold and cooldown are configurable from the Settings page.

---

## Watchdog (Cross-Server Monitoring)

For detecting power outages and network failures in **real-time**, deploy the watchdog script on a **second server**. Both servers monitor each other.

```
Server Rumah ◄──── watchdog.sh (cron) ────► Server Kantor
     │                                          │
     └── monitors kantor every 2 min            └── monitors rumah every 2 min
```

### Setup

**On Server Rumah** (monitors Server Kantor):

```bash
# Edit the config section in the script
nano scripts/watchdog.sh
```

```bash
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

### How it works

1. Every 2 minutes, checks target via **HTTP → TCP → ICMP ping** (3 layers)
2. After **3 consecutive failures** → sends 🔴 Server DOWN alert to Telegram
3. When server recovers → sends ✅ Recovery alert
4. Possible causes listed: power outage, network failure, crash, hardware failure

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/login` | ❌ | Login |
| GET | `/api/verify` | ✅ | Verify JWT |
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
│   └── watchdog.sh       # Cross-server health monitor
├── server/
│   ├── server.js         # Express API + WebSocket
│   ├── monitor.js        # Telegram monitoring + shutdown detection
│   └── dbInit.js         # Database migration
├── src/
│   ├── components/layout/
│   │   └── Shell.jsx     # Sidebar + Header + Notifications
│   ├── pages/
│   │   ├── Overview.jsx  # Dashboard home
│   │   ├── Services.jsx  # Systemd manager
│   │   ├── Storage.jsx   # Filesystem viewer
│   │   ├── Security.jsx  # SSH & firewall
│   │   ├── Terminal.jsx  # Web terminal
│   │   ├── UsersPage.jsx # System users
│   │   ├── Settings.jsx  # Telegram config
│   │   └── Login.jsx     # Auth page
│   └── App.jsx           # Router
├── .env.example
└── package.json
```

## License

MIT
