# OpenClaw Cockpit — Setup Guide

This guide walks you through installing the Cockpit on a Linux host so it starts
automatically at login and shows up fullscreen.

---

## 1. Install dependencies

### Node.js

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm curl jq

# Verify
node --version   # should be >= 18
npm --version
```

### Optional: iostat

```bash
sudo apt install -y sysstat
```

### Browser

```bash
sudo apt install -y chromium-browser
# or
sudo apt install -y google-chrome-stable
```

---

## 2. Clone and install

```bash
git clone https://github.com/akamaru-claw/openclaw-cockpit.git
cd openclaw-cockpit
npm install
cp config.example.json config.json
nano config.json
```

Fill in your own values:

- `location.latitude` / `location.longitude`
- `location.name`
- `websites` array with your domains
- `services` array with the local daemons you want to monitor

See [`CONFIG.md`](CONFIG.md) for details.

---

## 3. Test manually

```bash
node server.js
```

Open `http://localhost:31337` in Chromium. You should see the dashboard and
the avatar state changing when you call:

```bash
python3 state-controller.py thinking
python3 state-controller.py idle
```

---

## 4. Create a systemd user service

Create `~/.config/systemd/user/cockpit-server.service`:

```ini
[Unit]
Description=OpenClaw Cockpit Server
After=graphical-session.target

[Service]
Type=simple
WorkingDirectory=%h/openclaw-cockpit
ExecStart=/usr/bin/node server.js
Restart=no
Environment="HOME=%h"

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user daemon-reload
systemctl --user enable cockpit-server.service
systemctl --user start cockpit-server.service
systemctl --user status cockpit-server.service
```

> Note: the service is bound to the user session. It starts at login and stops
> at logout. No auto-restart on crash — the user controls the dashboard.

---

## 5. Desktop shortcut and autostart

Create `~/Desktop/OpenClaw-Cockpit.desktop` (adjust the desktop path for your
distribution):

```ini
[Desktop Entry]
Name=OpenClaw Cockpit
Comment=OpenClaw Dashboard
Exec=chromium --start-fullscreen http://localhost:31337
Type=Application
Terminal=false
Icon=utilities-terminal
```

Mark executable:

```bash
chmod +x ~/Desktop/OpenClaw-Cockpit.desktop
```

Copy the same file into the autostart folder so it opens at login:

```bash
mkdir -p ~/.config/autostart
cp ~/Desktop/OpenClaw-Cockpit.desktop ~/.config/autostart/
```

---

## 6. Controls

When Chromium is open:

- `F11` — toggle fullscreen
- `Alt+F4` — close the dashboard

---

## 7. Updating

```bash
cd openclaw-cockpit
git pull origin master
npm install
systemctl --user restart cockpit-server.service
```

Then reload the browser with `Ctrl+F5`.
