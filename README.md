# OpenClaw Cockpit

A local, cyberpunk-themed dashboard for the OpenClaw personal assistant runtime. Built for a MacBook (Linux) host and designed to run fullscreen in Chromium at `http://localhost:31337`.

**Repository:** https://github.com/akamaru-claw/openclaw-cockpit  
**Branch:** `master`

---

## What it does

The Cockpit visualizes the current state of the OpenClaw assistant and the host machine on a single screen. It uses a Node.js backend to stream live data via Server-Sent Events (SSE) to a static frontend.

Features:

- **Animated SVG avatar** with 8 activity states: `sleeping`, `idle`, `reading`, `thinking`, `working`, `cron`, `done`, `error`
- **Live system metrics** (CPU, RAM, disk, uptime, load, temperature)
- **Real-life metrics** for Paderborn: current weather, humidity, wind and moon phase
- **Active services** status for local daemons
- **Website status** monitor for 5 domains, checked every 10 minutes
- **Live Bitcoin data**: price in USD, latest block height, Moscow Time (sats per USD/EUR)
- **Live conversation** panel synced from the current chat
- **Live log stream** with top processes, memory hogs, network connections and recent journal entries
- **OpenClaw node info**: model, session, runtime status

---

## Requirements

- Linux host (tested on Ubuntu 24.04 on a MacBook)
- Node.js 18+
- `npm`
- `curl`, `jq`, `awk`, `ss`, `ps`, `df`, `free`, `uptime`, `iostat`
- Optional: `systemd --user` for the service

---

## Installation

```bash
# Clone the repository
git clone https://github.com/akamaru-claw/openclaw-cockpit.git
cd openclaw-cockpit

# Install dependencies
npm install

# Start manually for testing
node server.js
```

The server listens on **127.0.0.1:31337** only. Open `http://localhost:31337` in a browser.

---

## Systemd service (auto-start at login)

A user-level systemd unit keeps the server running in the background.

```bash
# Copy the unit file
mkdir -p ~/.config/systemd/user
cp ~/.openclaw/workspace/openclaw-cockpit/cockpit-server.service ~/.config/systemd/user/

# Reload and enable
systemctl --user daemon-reload
systemctl --user enable cockpit-server.service
systemctl --user start cockpit-server.service

# Check status
systemctl --user status cockpit-server.service
```

The unit is intentionally bound to the user session. It starts at login and stops at logout. No auto-restart on crash per user preference.

---

## Desktop shortcut and autostart

```bash
# Desktop shortcut
/home/jordy/Schreibtisch/OpenClaw-Cockpit.desktop

# Autostart entry
~/.config/autostart/openclaw-cockpit.desktop
```

Both open Chromium in `--start-fullscreen` pointing to `http://localhost:31337`. Press `F11` to toggle fullscreen and `Alt+F4` to close.

---

## Frontend layout

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

The layout is a fixed 3×3 CSS grid with no scrolling required on a standard MacBook display.

---

## Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serve the frontend |
| GET | `/stream` | SSE stream with live ticks |
| GET | `/state` | Current avatar state |
| GET | `/set-state?state=<STATE>` | Set avatar state |
| GET | `/chat` | Get persisted chat history |
| POST | `/chat` | Push a chat message (`{ text, sender }`) |

State values allowed: `sleeping`, `idle`, `reading`, `thinking`, `working`, `cron`, `done`, `error`.

---

## Helper scripts

| Script | Purpose |
|--------|---------|
| `state-controller.py <STATE>` | Explicitly set the avatar state |
| `chat-send.py <TEXT> <sender>` | Push a chat message to the dashboard |
| `state-setter.sh` | Simple `curl` wrapper for `/set-state` |

These scripts are used by the assistant to keep the Cockpit in sync with real interactions.

---

## Data sources

- **Bitcoin price / EUR rate**: Coinbase public API (updated every 60s)
- **Bitcoin block height**: mempool.space public API (updated every 60s)
- **Weather / moon phase**: Open-Meteo public API, local moon-phase math (updated every 5min)
- **Website status**: Direct HTTPS checks with `curl` (updated every 10min)
- **System data**: Local `/proc`, `ss`, `journalctl`, `iostat`, `ps` polled every SSE tick

---

## Security / privacy

The Cockpit is intentionally **local-only**:

- Server binds to `127.0.0.1:31337`
- No public nginx proxy or Cloudflare tunnel route
- No Basic Auth required locally
- No external secrets in the repository

Sensitive tokens (`.env.*`) are excluded via `.gitignore`.

---

## Development workflow

```bash
cd openclaw-cockpit
git pull origin master
# make changes
npm test        # if tests exist
node server.js  # manual test
git add -A
git commit -m "vX.Y.Z: short description"
git push origin master
```

Always bump the cache-busting query strings (`style.css?v=X.Y.Z`, `app.js?v=X.Y.Z`) and the footer version when changing frontend assets.

---

## Version history (recent)

| Version | Highlights |
|---------|------------|
| v0.2.9  | Website status checks reduced to every 10 minutes |
| v0.2.8  | Split metrics into System + Real Life (weather, moon phase) |
| v0.2.7  | Website status monitor for 5 domains |
| v0.2.6  | Bitcoin price, block height, Moscow Time in top bar |
| v0.2.5  | Compact layout without scrolling on MacBook display |
| v0.2.4  | Large clock in top bar |
| v0.2.3  | Local-only deployment, full system log stream |
| v0.2.2  | Split bottom row into chat + system log panels |
| v0.2.1  | Fixed duplicate `chatStream` JS bug, cache busting |
| v0.2.0  | Live conversation panel, chat history via SSE |
| v0.1.x  | First dashboard versions with metrics, services and log stream |

---

## Troubleshooting

**Blank dashboard / no updates**: Hard-reload with `Ctrl+F5`. Check browser console for JS errors. Verify `cockpit-server.service` is running: `systemctl --user status cockpit-server.service`.

**Avatar does not change**: Use `python3 state-controller.py <STATE>`. Check `/state` endpoint returns the expected value.

**Chat not updating**: Messages must be sent via `chat-send.py` or `POST /chat`. The assistant must explicitly call it.

**Layout overflows**: This version is tuned for a ~16:10 MacBook display. If elements are cut off, reduce browser zoom (`Ctrl + -`).

---

## License

Proprietary / personal project. No public license.
