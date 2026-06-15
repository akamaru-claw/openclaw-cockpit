# OpenClaw Cockpit — Configuration

Create `config.json` from `config.example.json`. It is loaded by
`server.js` and the helper scripts.

## `config.json` fields

```json
{
  "server": {
    "port": 31337,
    "host": "127.0.0.1"
  },
  "location": {
    "name": "Paderborn",
    "latitude": 51.7191,
    "longitude": 8.7574,
    "timezone": "Europe/Berlin"
  },
  "bitcoin": {
    "updateSeconds": 60
  },
  "weather": {
    "updateMinutes": 5
  },
  "websites": {
    "checkIntervalMinutes": 10,
    "sites": [
      { "name": "example.com", "url": "https://example.com" }
    ]
  },
  "services": {
    "checks": [
      { "name": "OpenClaw Gateway", "check": "ss -tlnp | grep -q \":18789\"" },
      { "name": "Ollama", "check": "ss -tlnp | grep -q \":11434\"" }
    ]
  },
  "chat": {
    "maxHistory": 100
  }
}
```

## Notes

- `websites.sites` defines the domains shown in the **Website Status** panel.
- `location` is used for the weather query. Find coordinates at
  https://open-meteo.com.
- `services.checks` are arbitrary shell commands. A command is considered
  `up` when it exits `0` or returns `200`/`301`/`302`/`401`/`403`.
- `config.json` is ignored by Git. Never commit personal endpoints or tokens.
