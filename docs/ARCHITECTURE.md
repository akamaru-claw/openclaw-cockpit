# OpenClaw Cockpit — Architecture

## Overview

The Cockpit is a small local web application that streams live data from the
host machine to a static frontend.

```
┌──────────────┐   SSE /stream    ┌──────────────┐
│  Frontend    │ ◄─────────────── │   Node.js    │
│  (index.html)│                  │   server.js  │
│  app.js      │                  │              │
└──────────────┘                  └──────┬───────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                 │
                     ▼                 ▼                 ▼
               /proc, ps      systemd --user        public APIs
               df, free        journalctl            Coinbase
               ss, iostat      curl checks           mempool.space
               sensors          (websites)            Open-Meteo
```

## Components

### `server.js`

The Express backend serves the static frontend and exposes an SSE endpoint at
`/stream`. Every few seconds it broadcasts a JSON payload (`type: 'tick'`) with:

- `state` — current avatar state
- `metrics` — CPU, RAM, disk, uptime, load, temperature
- `services` — local daemon status
- `websites` — cached website status (updated every 10 minutes)
- `openclaw` — model, session and runtime status
- `bitcoin` — cached price, block height, Moscow Time
- `reallife` — cached weather, moon phase
- `log` — current system log line

It also accepts `/set-state` and `/chat` so the assistant can update the
dashboard explicitly.

### Frontend

`index.html` is a static page that loads `style.css` and `app.js`. It connects
to `/stream` with `EventSource` and updates the DOM on every tick.

The grid layout is implemented in CSS and is intentionally fixed to fit a
16:10 laptop display without scrolling.

### Helper scripts

- `state-controller.py` — sets the avatar state via HTTP
- `chat-send.py` — pushes a chat message via HTTP
- `state-setter.sh` — minimal `curl` wrapper

These scripts allow the assistant to reflect its actual activity on the
Cockpit. They are not auto-detected because reliable inference of assistant
state from system logs alone turned out to be fragile.

## Data flow

1. The assistant calls `state-controller.py reading` when a message arrives.
2. The assistant calls `state-controller.py working` while executing tools.
3. The assistant calls `state-controller.py done` when the response is ready.
4. The assistant calls `chat-send.py` to mirror the conversation.
5. `server.js` broadcasts these changes to all connected browsers instantly.

## Polling strategy

| Data | Update interval | Source |
|------|-----------------|--------|
| Avatar state | Instant (on `/set-state`) | Assistant scripts |
| Chat messages | Instant (on `POST /chat`) | Assistant scripts |
| System metrics | Every SSE tick (~2s) | Local `/proc` / shell |
| Active services | Every SSE tick (~2s) | Local sockets / `curl` |
| System log line | Every SSE tick (~2s) | Local shell commands |
| Website status | Every 10 minutes + cache | HTTPS `curl` checks |
| Bitcoin data | Every 60 seconds | Coinbase + mempool.space |
| Weather / moon | Every 5 minutes | Open-Meteo + local math |

This mix keeps CPU and network load low while still feeling live.

## Why local-only?

The Cockpit intentionally exposes system process lists, journal entries and
active connections. These should not be served to the public internet. The
recommended deployment is `127.0.0.1:31337` behind a local browser window.
