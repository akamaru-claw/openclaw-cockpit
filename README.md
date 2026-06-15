# OpenClaw Cockpit

A local, cyberpunk-themed dashboard for the OpenClaw personal assistant runtime.
Designed to run fullscreen in Chromium at `http://localhost:31337` on a Linux host.

**Repository:** https://github.com/akamaru-claw/openclaw-cockpit

---

## What it does

The Cockpit visualizes the current state of the OpenClaw assistant and the host
machine on a single screen. A Node.js backend streams live data via
Server-Sent Events (SSE) to a static frontend.

Features:

- **Animated SVG avatar** with 8 activity states: `sleeping`, `idle`, `reading`,
  `thinking`, `working`, `cron`, `done`, `error`
- **System metrics** (CPU, RAM, disk, uptime, load, temperature)
- **Real-life metrics** (current weather, humidity, wind, moon phase)
- **Active services** status for local daemons
- **Website status** monitor for configurable domains, checked every 10 minutes
- **Live Bitcoin data**: price in USD, latest block height, Moscow Time
  (sats per USD/EUR)
- **Live conversation** panel synced from the current chat
- **Live log stream** with top processes, memory hogs, network connections and
  recent journal entries
- **OpenClaw node info**: model, session, runtime status

---

## Requirements

- Linux host with a graphical session (tested on Ubuntu 24.04)
- Node.js 18+
- `npm`
- Standard CLI tools: `curl`, `awk`, `ss`, `ps`, `df`, `free`, `uptime`,
  `iostat`, `journalctl`
- Optional: `systemd --user` for auto-start
- Optional: `chromium` or `google-chrome` for the kiosk view

---

## Quick start

```bash
git clone https://github.com/akamaru-claw/openclaw-cockpit.git
cd openclaw-cockpit
npm install
cp config.example.json config.json
# edit config.json for your setup
node server.js
```

Open `http://localhost:31337` in your browser.

For a full step-by-step setup see [`docs/SETUP.md`](docs/SETUP.md).

---

## Documentation

| Document | Purpose |
|----------|---------|
| [`docs/SETUP.md`](docs/SETUP.md) | Full installation, systemd service, desktop shortcut |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the backend, SSE, frontend and scripts interact |
| [`docs/CONFIG.md`](docs/CONFIG.md) | Configure domains, weather location and services |
| [`docs/API.md`](docs/API.md) | REST / SSE endpoints and helper scripts |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Common problems and fixes |

---

## Screenshot / layout

```
┌─────────────────┬─────────────────┬─────────────────┐
│   AVATAR        │  SYSTEM METRICS │ REAL LIFE METRICS│
│   + state       │                 │  (weather/moon) │
├─────────────────┼─────────────────┼─────────────────┤
│  ACTIVE SERVICES│  OPENCLAW NODE  │  WEBSITE STATUS │
├─────────────────┴─────────────────┼─────────────────┤
│   LIVE CONVERSATION  │   LIVE LOG STREAM              │
└─────────────────────────────────────┴─────────────────┘
```

The layout is a fixed CSS grid tuned for a 16:10 laptop display. No scrolling
is required on a standard MacBook-sized screen.

---

## Security / privacy

The Cockpit is intended to be **local-only**:

- Server binds to `127.0.0.1:31337` by default
- No public reverse proxy required
- No external secrets in the repository
- Create `config.json` from `config.example.json` and keep it local

---

## License

Personal project. No public license.
