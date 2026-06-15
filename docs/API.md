# OpenClaw Cockpit — API

## REST endpoints

### `GET /state`

Returns the current avatar state.

```bash
curl -s http://localhost:31337/state
```

Response:

```json
{ "state": "idle" }
```

---

### `GET /set-state?state=<STATE>`

Sets the avatar state. Allowed states:

- `sleeping`
- `idle`
- `reading`
- `thinking`
- `working`
- `cron`
- `done`
- `error`

```bash
curl -s "http://localhost:31337/set-state?state=working"
```

Response:

```json
{ "ok": true, "state": "working" }
```

---

### `POST /chat`

Pushes a chat message to the Cockpit and broadcasts it to all connected
clients.

```bash
curl -s -X POST http://localhost:31337/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from the shell", "sender": "user"}'
```

`sender` must be `user` or `assistant`.

---

### `GET /chat`

Returns the persisted chat history (last N messages).

```bash
curl -s http://localhost:31337/chat
```

---

### `GET /stream`

Server-Sent Events endpoint. Emits a JSON payload on every tick.

Example event payload:

```json
{
  "type": "tick",
  "ts": "2026-06-16T00:00:00.000Z",
  "state": "idle",
  "metrics": { "cpu": 12.3, "ram": 45, "disk": 67, ... },
  "services": [ { "name": "OpenClaw Gateway", "status": "up" }, ... ],
  "websites": [ { "name": "example.com", "status": "up", "ms": 120 }, ... ],
  "openclaw": { "model": "ollama/kimi-k2.7-code:cloud", "session": "telegram", "status": "running" },
  "bitcoin": { "price": 123456, "blockHeight": 890123, "satsPerDollar": 8100, "satsPerEuro": 9300 },
  "reallife": { "weather": { "temp": 18, ... }, "moon": { "name": "Vollmond" } },
  "log": "[CPU] ..."
}
```

## Helper scripts

### `state-controller.py`

```bash
python3 state-controller.py <STATE>
```

Convenience wrapper for `GET /set-state`.

### `chat-send.py`

```bash
python3 chat-send.py "Your message" <user|assistant>
```

Convenience wrapper for `POST /chat`.

### `state-setter.sh`

```bash
bash state-setter.sh <STATE>
```

Minimal `curl` wrapper.
