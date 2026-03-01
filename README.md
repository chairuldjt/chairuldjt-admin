# ⚡ ChairuldjtAdmin

Modern, glassmorphism-styled server dashboard for managing your personal Linux server. Built with React + Express.js.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

| Feature | Description |
|---------|-------------|
| 📊 **Overview** | Real-time CPU, RAM, Disk, Load Average with live charts |
| 🔧 **Services** | Start/stop/restart systemd services |
| 💾 **Storage** | Mounted filesystems, disk I/O statistics |
| 🔒 **Security** | SSH auth logs, UFW firewall status & rules |
| 🖥 **Terminal** | Full web terminal via WebSocket (xterm.js) |
| 👥 **Users** | Linux system users from `/etc/passwd` |
| 🤖 **Telegram** | Alerts when CPU/RAM > 90% via Telegram Bot |
| 🔐 **Auth** | JWT login with bcrypt-hashed passwords in MySQL |

## Tech Stack

**Frontend:** React 19, Tailwind CSS v4, Recharts, Lucide Icons, xterm.js  
**Backend:** Express.js, MySQL2, systeminformation, node-telegram-bot-api, WebSocket  
**Auth:** JWT + bcrypt  

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **MySQL** server running
- **Ubuntu** (for full functionality — services, terminal, security logs)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/nexusadmin.git
cd nexusadmin

# Install dependencies
npm install

# (Optional) For better terminal support
sudo apt install build-essential python3
npm install node-pty
```

### Configuration

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=nexus_admin
JWT_SECRET=your-secret-key-here
PORT=5000
```

### Database Setup

```bash
npm run db:init
```

This creates the `nexus_admin` database, `users` table, `settings` table, and a default admin user.

### Run

```bash
# Development (frontend + backend)
npm run dev

# Production build
npm run build

# Backend only
npm run server
```

## Telegram Monitoring

1. Create a bot via [@BotFather](https://t.me/BotFather) → copy the **API Token**
2. Get your Chat ID from [@userinfobot](https://t.me/userinfobot)
3. Open **Settings** in the dashboard and save both values
4. The bot will notify you when CPU/RAM exceeds 90%

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/login` | ❌ | Login with username/password |
| GET | `/api/verify` | ✅ | Verify JWT token |
| GET | `/api/system-stats` | ✅ | CPU, RAM, Disk, Load Avg, Uptime |
| GET | `/api/services` | ✅ | List systemd services |
| POST | `/api/services/:name/:action` | ✅ | Start/stop/restart a service |
| GET | `/api/storage` | ✅ | Mounted filesystems + disk I/O |
| GET | `/api/security` | ✅ | SSH logs + UFW status |
| GET | `/api/users` | ✅ | System users |
| GET/POST | `/api/settings` | ✅ | Telegram bot config |
| WS | `/ws/terminal` | ✅ | WebSocket shell terminal |

## Project Structure

```
├── server/
│   ├── server.js        # Express API + WebSocket
│   ├── monitor.js       # Telegram monitoring service
│   └── dbInit.js        # Database migration
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── Shell.jsx # Sidebar + Header layout
│   ├── pages/
│   │   ├── Overview.jsx  # Dashboard home
│   │   ├── Services.jsx  # Systemd manager
│   │   ├── Storage.jsx   # Filesystem viewer
│   │   ├── Security.jsx  # SSH & firewall
│   │   ├── Terminal.jsx  # Web terminal
│   │   ├── UsersPage.jsx # System users
│   │   ├── Settings.jsx  # Telegram config
│   │   └── Login.jsx     # Auth page
│   ├── App.jsx
│   └── index.css
├── .env
└── package.json
```

## License

MIT
