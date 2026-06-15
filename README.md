# OpenClaw Cockpit

A futuristic, cyberpunk-style live dashboard for OpenClaw hosts. It shows system metrics, running services, OpenClaw node status and an animated AI avatar that reacts to the current machine state.

## Features

- **Live system metrics** via Server-Sent Events (SSE): CPU, RAM, disk, load, uptime, temperature
- **Service status** monitoring: OpenClaw Gateway, Ollama, PhoenixD, Home Assistant, Autodarts Dashboard, T-Display Proxy
- **OpenClaw node info**: active model, session, status
- **Animated SVG avatar**: reacts to `idle`, `listening`, `working`, `alert` states
- **Live log stream** from the system journal
- **CRT/cyberpunk UI** with dark theme and neon accents
- **Modular and self-contained**: pure HTML/CSS/JS frontend, small Node.js backend

## Screenshot

*[Add screenshot here]*

## Architecture

```
openclaw-cockpit/
├── server.js           # Node.js SSE server + metric collection
├── package.json
├── README.md
└── public/
    ├── index.html      # Dashboard layout
    ├── style.css       # Cyberpunk theme
    ├── app.js          # Frontend logic + SSE client
    └── avatar.svg      # Animated Akamaru avatar
```

## Requirements

- Node.js 18+
- Linux host (metrics use `/proc`, `df`, `free`, `ss`, `journalctl`)

## Installation

```bash
git clone https://github.com/akamaru-claw/openclaw-cockpit.git
cd openclaw-cockpit
npm install
```

## Usage

Start the server:

```bash
npm start
```

Open in browser:

```bash
http://localhost:31337
```

To run on boot or as a service, create a systemd user service (example included below).

## Configuration

The dashboard is configurable by editing `server.js`:

- `PORT`: server port (default `31337`)
- `services`: list of services to monitor and their port/health checks
- metrics collection commands

Frontend theme can be changed in `public/style.css` and `public/app.js`.

## Avatar

The avatar is a fully vector-based SVG with CSS animations. It does not require any external image service. States are updated by the frontend when the backend sends new metrics. You can replace `public/avatar.svg` with your own SVG as long as it contains the CSS classes used by `app.js`:

- `.status-ring`
- `.hud-ring-fast`
- `.hud-ring-slow`
- `.circuits`

## Extending

To add new metrics:

1. Add the collection command in `getMetrics()` in `server.js`
2. Send it in the SSE payload
3. Display it in `public/app.js` and `public/index.html`

To add new services:

1. Add a service entry to the `services` array in `server.js`
2. The frontend will render it automatically

## Security Notes

- The dashboard exposes system metrics. Do not expose it to the public internet without authentication.
- By default it listens on `0.0.0.0`. Bind to `127.0.0.1` if you only want local access.
- No sensitive credentials are collected or displayed.

## License

MIT

## Author

Akamaru for the OpenClaw community
