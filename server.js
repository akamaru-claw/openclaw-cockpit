/**
 * OpenClaw Cockpit Server
 * Streams live system metrics and service status to the dashboard via SSE.
 */
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = config.server.port || 31337;
const HOST = config.server.host || '127.0.0.1';

const CONFIG_FILE = path.join(__dirname, 'config.json');
const DEFAULT_CONFIG = {
  server: { port: 31337, host: '127.0.0.1' },
  location: { name: 'Berlin', latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin' },
  bitcoin: { updateSeconds: 60 },
  weather: { updateMinutes: 5 },
  websites: {
    checkIntervalMinutes: 10,
    sites: [{ name: 'example.com', url: 'https://example.com' }]
  },
  services: {
    checks: [
      { name: 'OpenClaw Gateway', check: "ss -tlnp | grep -q ':18789'" },
      { name: 'Ollama', check: "ss -tlnp | grep -q ':11434'" }
    ]
  },
  chat: { maxHistory: 50 }
};

let config = DEFAULT_CONFIG;
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...DEFAULT_CONFIG, ...parsed };
      if (parsed.location) config.location = { ...DEFAULT_CONFIG.location, ...parsed.location };
      if (parsed.websites) config.websites = { ...DEFAULT_CONFIG.websites, ...parsed.websites };
      if (parsed.services) config.services = { ...DEFAULT_CONFIG.services, ...parsed.services };
      if (parsed.chat) config.chat = { ...DEFAULT_CONFIG.chat, ...parsed.chat };
    }
  } catch (e) {
    console.error('Failed to load config.json, using defaults:', e.message);
  }
}
loadConfig();

const CHAT_FILE = path.join(__dirname, 'chat.json');
const MAX_CHAT_HISTORY = config.chat.maxHistory || 50;

function readChatHistory() {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8'));
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function addChatMessage(text, sender = 'assistant') {
  const history = readChatHistory();
  const entry = {
    id: Date.now().toString(),
    text: text.slice(0, 2000),
    sender,
    ts: new Date().toISOString()
  };
  history.push(entry);
  while (history.length > MAX_CHAT_HISTORY) {
    history.shift();
  }
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to write chat history:', e.message);
  }
  return entry;
}

function broadcastChatMessage(entry) {
  const data = `data: ${JSON.stringify({ type: 'tick', chatMessage: entry }) }\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const clients = new Set();

const STATE_FILE = path.join(__dirname, 'state.json');
const DEFAULT_STATE = 'idle';

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return data.state || DEFAULT_STATE;
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_STATE;
}

function run(cmd, timeout = 5000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      resolve(stdout.trim() || stderr.trim() || '');
    });
  });
}

async function getMetrics() {
  const cpu = await run("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'");
  const ram = await run("free | awk 'NR==2{printf \"%.0f\", $3*100/$2 }'");
  const disk = await run("df -h / | tail -1 | awk '{print $5}' | tr -d '%'");
  const uptime = await run("uptime -p | sed 's/up //'");
  const load = await run("cat /proc/loadavg | awk '{print $1 \" \" $2 \" \" $3}'");
  const temp = await run("cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1 | awk '{printf \"%.0f\", $1/1000}'");
  return {
    cpu: parseFloat(cpu) || 0,
    ram: parseFloat(ram) || 0,
    disk: parseFloat(disk) || 0,
    uptime,
    load,
    temp: parseFloat(temp) || 0
  };
}

async function getServices() {
  const checks = (config.services && config.services.checks) || DEFAULT_CONFIG.services.checks;
  const results = [];
  for (const s of checks) {
    const out = await run(s.check);
    let status = 'down';
    if (out === '' || out === '200' || out === '301' || out === '302' || out === '401' || out === '403') {
      status = 'up';
    }
    results.push({ name: s.name, status });
  }
  return results;
}

async function getWebsites() {
  const sites = (config.websites && config.websites.sites) || DEFAULT_CONFIG.websites.sites;
  const checkInterval = (config.websites && config.websites.checkIntervalMinutes || 10) * 60 * 1000;
  const now = Date.now();

  if (now - lastWebsiteCheck < checkInterval && cachedWebsites.length > 0) {
    return cachedWebsites.map(s => ({ ...s, cached: true }));
  }

  const results = [];
  for (const site of sites) {
    try {
      const out = await run(`curl -sL -o /dev/null -w "%{http_code}|%{time_total}" --max-time 15 "${site.url}"`);
      const [code, time] = out.split('|');
      const ms = Math.round(parseFloat(time) * 1000);
      const status = (code === '200' || code === '301' || code === '302' || code === '401' || code === '403') ? 'up' : 'down';
      results.push({ name: site.name, url: site.url, status, code, ms, cached: false });
    } catch (e) {
      results.push({ name: site.name, url: site.url, status: 'down', code: 'ERR', ms: 0, cached: false });
    }
  }

  cachedWebsites = results;
  lastWebsiteCheck = now;
  return results;
}

// initial website check on startup, then every configured interval
getWebsites().catch(console.error);
setInterval(() => getWebsites().catch(console.error), (config.websites && config.websites.checkIntervalMinutes || 10) * 60 * 1000);

async function getOpenClawInfo() {
  const model = await run("ps aux | grep -oP 'openclaw.*--model\s+\K[^ ]+' | head -1");
  const status = await run("systemctl --user is-active openclaw 2>/dev/null || echo 'running'");
  return {
    model: model || 'unknown',
    session: 'local',
    status: status || 'running'
  };
}

async function getLogLine() {
  const topProc = await run("ps -eo pid,pcpu,comm --sort=-pcpu | head -2 | tail -1 | awk '{print $1 \" \" $2 \"% \" $3}'");
  const topMem = await run("ps -eo pid,pmem,comm --sort=-pmem | head -2 | tail -1 | awk '{print $1 \" \" $2 \"% \" $3}'");
  const netConn = await run("ss -t -a state established '( dport = :18789 or sport = :18789 or dport = :11434 or sport = :11434 )' | tail -1 | awk '{print $4 \" <-> \" $5}'");
  const latestLog = await run("journalctl --user -n 1 --no-pager 2>/dev/null | tail -1 | sed 's/^[^ ]* [^ ]* //'");
  const ioLoad = await run("iostat -c 1 1 2>/dev/null | awk '/^$/ {next} /avg-cpu/ {getline; printf \"usr:%s sys:%s io:%s idle:%s\", $1, $3, $4, $NF}'");
  const activeUsers = await run("who | wc -l");
  const dockerPs = await run("docker ps --format '{{.Names}}' 2>/dev/null | head -5 | tr '\n' ' ' || echo 'docker not available'");
  return `[CPU] ${topProc} | [MEM] ${topMem} | [NET] ${netConn || 'no active svc conn'} | [JOURNAL] ${latestLog} | [IO] ${ioLoad} | [USERS] ${activeUsers} | [DOCKER] ${dockerPs}`;
}

let bitcoinData = {
  price: 0,
  blockHeight: 0,
  satsPerDollar: 0,
  satsPerEuro: 0,
  updatedAt: null
};

async function fetchJson(url, fallback) {
  try {
    const data = await run(`curl -sL --max-time 10 "${url}" 2>/dev/null || echo ''`);
    if (!data) return fallback;
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
}

async function updateBitcoinData() {
  try {
    const [priceUsd, priceEur, height] = await Promise.all([
      fetchJson('https://api.coinbase.com/v2/exchange-rates?currency=BTC', null),
      fetchJson('https://api.coinbase.com/v2/exchange-rates?currency=USD', null),
      fetchJson('https://mempool.space/api/blocks/tip/height', 0)
    ]);

    const btcUsd = priceUsd?.data?.rates?.USD;
    const usdEur = priceEur?.data?.rates?.EUR;
    const btcEur = btcUsd && usdEur ? (parseFloat(btcUsd) / parseFloat(usdEur)) : null;

    bitcoinData = {
      price: btcUsd ? parseFloat(btcUsd) : 0,
      blockHeight: height ? parseInt(height, 10) : 0,
      satsPerDollar: btcUsd ? Math.round(100000000 / parseFloat(btcUsd)) : 0,
      satsPerEuro: btcEur ? Math.round(100000000 / btcEur) : 0,
      updatedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error('Bitcoin data update failed:', e.message);
  }
}

updateBitcoinData();
setInterval(updateBitcoinData, (config.bitcoin?.updateSeconds || 60) * 1000);

let realLifeData = {
  weather: { temp: 0, humidity: 0, wind: 0, condition: 'Unknown', isDay: true },
  moon: { age: 0, name: 'Unknown' },
  updatedAt: null
};

const WMO_CODES = {
  0: 'Klar', 1: 'Meist klar', 2: 'Teils bewölkt', 3: 'Bedeckt',
  45: 'Nebel', 48: 'Reifnebel', 51: 'Nieselregen', 53: 'Nieselregen', 55: 'Nieselregen',
  61: 'Regen', 63: 'Regen', 65: 'Regen', 71: 'Schneefall', 73: 'Schneefall', 75: 'Schneefall',
  77: 'Schneegriesel', 80: 'Regenschauer', 81: 'Regenschauer', 82: 'Regenschauer',
  85: 'Schneeschauer', 86: 'Schneeschauer', 95: 'Gewitter', 96: 'Gewitter', 99: 'Gewitter'
};

function getMoonPhase(date = new Date()) {
  const synodic = 29.53059;
  const ref = new Date('2000-01-06T18:14:00Z');
  const diff = (date - ref) / 1000 / 3600 / 24;
  const age = ((diff % synodic) + synodic) % synodic;
  const phase = age / synodic;
  let name = 'Unknown';
  if (phase < 0.02 || phase > 0.98) name = 'Neumond';
  else if (phase < 0.23) name = 'Zunehmende Sichel';
  else if (phase < 0.27) name = 'Erstes Viertel';
  else if (phase < 0.48) name = 'Zunehmender Mond';
  else if (phase < 0.52) name = 'Vollmond';
  else if (phase < 0.73) name = 'Abnehmender Mond';
  else if (phase < 0.77) name = 'Letztes Viertel';
  else name = 'Abnehmende Sichel';
  return { age: Math.round(age), phase, name };
}

async function updateRealLifeData() {
  try {
    const loc = config.location || DEFAULT_CONFIG.location;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=${encodeURIComponent(loc.timezone || 'Europe/Berlin')}`;
    const data = await fetchJson(url, null);
    const current = data?.current;
    if (current) {
      realLifeData = {
        weather: {
          temp: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          wind: current.wind_speed_10m,
          condition: WMO_CODES[current.weather_code] || `Code ${current.weather_code}`,
          isDay: current.is_day === 1
        },
        moon: getMoonPhase(),
        updatedAt: new Date().toISOString()
      };
    } else {
      realLifeData.moon = getMoonPhase();
    }
  } catch (e) {
    realLifeData.moon = getMoonPhase();
    console.error('Real life data update failed:', e.message);
  }
}

updateRealLifeData();
setInterval(updateRealLifeData, (config.weather?.updateMinutes || 5) * 60 * 1000);

async function broadcast() {
  const payload = {
    type: 'tick',
    ts: new Date().toISOString(),
    state: readState(),
    metrics: await getMetrics(),
    services: await getServices(),
    websites: await getWebsites(),
    openclaw: await getOpenClawInfo(),
    log: await getLogLine(),
    bitcoin: bitcoinData,
    reallife: realLifeData
  };

  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}

app.get('/state', (req, res) => {
  res.json({ state: readState(), ts: new Date().toISOString() });
});

app.get('/set-state', (req, res) => {
  const ALLOWED_STATES = ['idle', 'reading', 'thinking', 'working', 'cron', 'done', 'error', 'sleeping'];
  const state = req.query.state;
  if (!ALLOWED_STATES.includes(state)) {
    return res.status(400).json({ error: 'invalid state' });
  }
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ state, ts: new Date().toISOString() }));
    res.json({ state });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/chat', (req, res) => {
  const { text, sender } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text required' });
  }
  const entry = addChatMessage(text, sender === 'user' ? 'user' : 'assistant');
  broadcastChatMessage(entry);
  res.json({ ok: true, id: entry.id });
});

app.get('/chat', (req, res) => {
  res.json(readChatHistory());
});

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Send recent chat history on connect
  const history = readChatHistory();
  for (const entry of history.slice(-20)) {
    res.write(`data: ${JSON.stringify({ type: 'tick', chatMessage: entry })}\n\n`);
  }

  req.on('close', () => {
    clients.delete(res);
  });
});

app.get('/status', async (req, res) => {
  res.json({
    state: readState(),
    metrics: await getMetrics(),
    services: await getServices(),
    openclaw: await getOpenClawInfo()
  });
});

setInterval(broadcast, 2000);

app.listen(PORT, HOST, () => {
  console.log(`OpenClaw Cockpit server running on http://${HOST}:${PORT}`);
});
