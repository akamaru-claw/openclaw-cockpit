# OpenClaw Cockpit — Troubleshooting

## Blank dashboard or no updates

1. Hard-reload the browser: `Ctrl+F5`.
2. Check the browser console (F12 → Console) for JavaScript errors.
3. Verify the server is running:

```bash
systemctl --user status cockpit-server.service
curl -s http://localhost:31337/state
```

## Avatar does not change state

Test the state endpoint directly:

```bash
curl -s "http://localhost:31337/set-state?state=working"
curl -s http://localhost:31337/state
```

If the server returns the new state but the avatar does not change, the SVG
file may be missing or the browser cache is stale. Hard-reload with `Ctrl+F5`.

## Chat panel is empty

Chat messages are not auto-detected. The assistant must explicitly call:

```bash
python3 chat-send.py "Hello" assistant
python3 chat-send.py "Hi" user
```

## Website status shows all red

The domains are checked via `curl` every 10 minutes. If the server has no
internet access, all sites are reported as `down`. Test manually:

```bash
curl -sL -o /dev/null -w "%{http_code}" https://example.com
```

## Layout overflows / scrollbars appear

The layout is tuned for a 16:10 laptop display at 100% browser zoom. If you
see scrollbars:

- Press `Ctrl+0` to reset zoom.
- Use `Ctrl + -` to zoom out.
- Disable any browser extensions that inject sidebars.

## Systemd service does not start at login

Make sure the service is enabled:

```bash
systemctl --user enable cockpit-server.service
```

If your desktop environment does not load user services, add a small
autostart script that runs `systemctl --user start cockpit-server.service`
before launching Chromium.

## High CPU usage from the Cockpit

Reduce log-stream detail or increase the SSE tick interval in `server.js`:

```js
const BROADCAST_INTERVAL = 5000; // milliseconds
```

The website status check is already limited to every 10 minutes.
