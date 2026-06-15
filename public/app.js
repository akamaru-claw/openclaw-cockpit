/**
 * OpenClaw Cockpit Frontend v0.3.2
 * Streams live system metrics, service status, chat, logs, bitcoin and real-life data to the dashboard.
 */

const avatar = document.getElementById('avatar');
const avatarState = document.getElementById('avatar-state');
const voiceLines = document.getElementById('voice-lines');
const terminal = document.getElementById('terminal');
const chatStream = document.getElementById('chat-stream');
const clock = document.getElementById('clock');
const hostTag = document.getElementById('host-tag');
const footerStatus = document.getElementById('footer-status');
const btcPrice = document.getElementById('btc-price');
const btcBlock = document.getElementById('btc-block');
const moscowUsd = document.getElementById('moscow-usd');
const moscowEur = document.getElementById('moscow-eur');

const states = {
  sleeping: { label: 'AKAMARU // SLEEPING', color: '#991b1b', file: 'avatar-sleeping.svg' },
  idle: { label: 'AKAMARU // IDLE', color: '#ef4444', file: 'avatar-idle.svg' },
  reading: { label: 'AKAMARU // READING', color: '#f7931a', file: 'avatar-reading.svg' },
  thinking: { label: 'AKAMARU // THINKING', color: '#a855f7', file: 'avatar-thinking.svg' },
  working: { label: 'AKAMARU // WORKING', color: '#ff3333', file: 'avatar-working.svg' },
  cron: { label: 'AKAMARU // CRON', color: '#c084fc', file: 'avatar-cron.svg' },
  done: { label: 'AKAMARU // DONE', color: '#22c55e', file: 'avatar-done.svg' },
  error: { label: 'AKAMARU // ERROR', color: '#ff0000', file: 'avatar-error.svg' }
};

const idleLines = [
  'Warte auf Input...',
  'Systeme nominal.',
  'Bereit für den nächsten Befehl.',
  'Scanne Umgebung...',
  'Akamaru online.'
];

const sleepLines = [
  'Zzz...',
  'Im Energiesparmodus.',
  'Akamaru schläft.',
  'Warte auf Weckruf...'
];

const readLines = [
  'Neue Nachricht erkannt...',
  'Input wird verarbeitet...',
  'Lese Daten...',
  'Befehl empfangen.'
];

const thinkLines = [
  'Berechne Szenarien...',
  'Verarbeite Daten...',
  'Optimiere Ausgabe...',
  'Denke nach...'
];

const workLines = [
  'Führe Befehle aus...',
  'Verbinde Dienste...',
  'Sammle Metriken...',
  'Arbeite...'
];

const cronLines = [
  'Cron-Job läuft...',
  'Hintergrundtask aktiv...',
  'Timer ausgelöst...'
];

const doneLines = [
  'Aufgabe erledigt!',
  'Erfolgreich gesendet.',
  'Fertig.',
  'Erledigt!'
];

const errorLines = [
  'Achtung: Fehler erkannt.',
  'Systemwarnung!',
  'Etwas ist schiefgelaufen.',
  'Fehler!'
];

let currentState = 'idle';
let lastActivity = Date.now();

function setAvatarState(state) {
  if (!states[state]) return;
  if (currentState === state) return;
  currentState = state;
  const cfg = states[state];
  avatarState.textContent = cfg.label;
  avatarState.style.color = cfg.color;
  avatarState.style.textShadow = `0 0 12px ${cfg.color}`;
  avatar.setAttribute('data', cfg.file);
  addLogLine(`State switched: ${state}`, 'STATE');
}

function whenAvatarReady(fn) {
  if (avatar.contentDocument) {
    fn();
  } else {
    avatar.addEventListener('load', fn, { once: true });
  }
}

function pickLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('de-DE', { hour12: false });
  if (clock) clock.textContent = timeStr;
  const bigClock = document.getElementById('clock');
  if (bigClock) bigClock.textContent = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addChatMessage(text, sender = 'assistant') {
  if (!chatStream) return;
  const msg = document.createElement('div');
  msg.className = `chat-msg ${sender}`;
  const ts = new Date().toLocaleTimeString('de-DE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const label = sender === 'user' ? 'KIBA' : 'AKAMARU';
  msg.innerHTML = `<div class="msg-header">${label} // ${ts}</div><div class="msg-text">${escapeHtml(text)}</div>`;
  chatStream.appendChild(msg);
  while (chatStream.children.length > 100) {
    chatStream.removeChild(chatStream.firstChild);
  }
  chatStream.scrollTop = chatStream.scrollHeight;
}

function addLogLine(msg, tag = 'INFO') {
  const line = document.createElement('div');
  line.className = 'line';
  const ts = new Date().toLocaleTimeString('de-DE', { hour12: false });
  line.innerHTML = `<span class="ts">[${ts}]</span><span class="tag">${tag}</span>${escapeHtml(msg)}`;
  if (terminal) {
    terminal.appendChild(line);
    if (terminal.children.length > 60) {
      terminal.removeChild(terminal.firstChild);
    }
    terminal.scrollTop = terminal.scrollHeight;
  }
}

function updateMetrics(metrics) {
  document.getElementById('cpu').textContent = metrics.cpu.toFixed(1) + '%';
  document.getElementById('ram').textContent = metrics.ram.toFixed(0) + '%';
  document.getElementById('disk').textContent = metrics.disk.toFixed(0) + '%';
  document.getElementById('uptime').textContent = metrics.uptime;
  document.getElementById('load').textContent = metrics.load;
  document.getElementById('temp').textContent = metrics.temp ? metrics.temp + '°C' : '--';
}

function updateBitcoin(btc) {
  if (!btc) return;
  if (btcPrice && btc.price) btcPrice.textContent = `BTC $${btc.price.toLocaleString('en-US')}`;
  if (btcBlock && btc.blockHeight) btcBlock.textContent = `BLOCK ${btc.blockHeight.toLocaleString('en-US')}`;
  if (moscowUsd && btc.satsPerDollar) moscowUsd.textContent = `$ ${btc.satsPerDollar.toLocaleString('en-US')} sats`;
  if (moscowEur && btc.satsPerEuro) moscowEur.textContent = `€ ${btc.satsPerEuro.toLocaleString('en-US')} sats`;
}

function updateBitcoin(btc) {
  if (!btc) return;
  if (btcPrice && btc.price) btcPrice.textContent = `BTC $${btc.price.toLocaleString('en-US')}`;
  if (btcBlock && btc.blockHeight) btcBlock.textContent = `BLOCK ${btc.blockHeight.toLocaleString('en-US')}`;
  if (moscowUsd && btc.satsPerDollar) moscowUsd.textContent = `$ ${btc.satsPerDollar.toLocaleString('en-US')} sats`;
  if (moscowEur && btc.satsPerEuro) moscowEur.textContent = `€ ${btc.satsPerEuro.toLocaleString('en-US')} sats`;
}

function updateServices(services) {
  const list = document.getElementById('services');
  list.innerHTML = services.map(s => {
    const dotClass = s.status === 'up' ? 'up' : s.status === 'warn' ? 'warn' : 'down';
    return `<li><span><span class="status-dot ${dotClass}"></span>${s.name}</span><span>${s.status.toUpperCase()}</span></li>`;
  }).join('');
}

function updateWebsites(sites) {
  const list = document.getElementById('websites');
  if (!list) return;
  list.innerHTML = sites.map(s => {
    const dotClass = s.status === 'up' ? 'up' : 'down';
    const latency = s.ms ? `${s.ms}ms` : '';
    return `<li><span><span class="status-dot ${dotClass}"></span>${s.name}</span><span>${latency} ${s.status.toUpperCase()}</span></li>`;
  }).join('');
}

function updateRealLife(rl) {
  if (!rl) return;
  const w = rl.weather || {};
  const m = rl.moon || {};
  const tempEl = document.getElementById('rl-temp');
  const humEl = document.getElementById('rl-humidity');
  const windEl = document.getElementById('rl-wind');
  const condEl = document.getElementById('rl-condition');
  const moonEl = document.getElementById('rl-moon');
  if (tempEl) tempEl.textContent = (w.temp !== undefined ? `${w.temp}°C` : '--°C');
  if (humEl) humEl.textContent = (w.humidity !== undefined ? `${w.humidity}%` : '--%');
  if (windEl) windEl.textContent = (w.wind !== undefined ? `${w.wind} km/h` : '-- km/h');
  if (condEl) condEl.textContent = (w.condition || '--');
  if (moonEl) moonEl.textContent = (m.name || '--');
}

function updateOpenClaw(info) {
  document.getElementById('oc-model').textContent = info.model;
  document.getElementById('oc-session').textContent = info.session;
  document.getElementById('oc-status').textContent = info.status.toUpperCase();
}

function detectLocalState(metrics, services, logLine) {
  const downCount = services.filter(s => s.status === 'down').length;
  const logText = logLine || '';
  if (downCount > 2) return 'error';
  if (logText.includes('cron') || logText.includes('Cron')) return 'cron';
  if (logText.includes('Tool:') || logText.includes('exec') || logText.includes('working')) return 'working';
  if (metrics.cpu > 70 || metrics.ram > 85) return 'working';
  if (Date.now() - lastActivity > 60000) return 'sleeping';
  return null;
}

async function loadChatHistory() {
  try {
    const res = await fetch('/chat');
    if (!res.ok) return;
    const history = await res.json();
    if (chatStream) chatStream.innerHTML = '';
    for (const entry of history.slice(-50)) {
      addChatMessage(entry.text, entry.sender);
    }
    addLogLine(`Chat history loaded: ${history.length} messages`, 'CHAT');
  } catch (e) {
    addLogLine(`Failed to load chat history: ${e.message}`, 'ERR');
  }
}

function connect() {
  const source = new EventSource('/stream');

  source.onopen = () => {
    footerStatus.textContent = 'connection: live stream active';
    footerStatus.style.color = '#05ffa1';
    addLogLine('Live stream verbunden.', 'NET');
  };

  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'tick') {
        if (data.metrics) updateMetrics(data.metrics);
        if (data.services) updateServices(data.services);
        if (data.websites) updateWebsites(data.websites);
        if (data.openclaw) updateOpenClaw(data.openclaw);
        if (data.bitcoin) updateBitcoin(data.bitcoin);
        if (data.reallife) updateRealLife(data.reallife);
        if (data.log) addLogLine(data.log, 'SYS');

        const remoteState = data.state;
        const localState = detectLocalState(data.metrics || {}, data.services || [], data.log);
        const nextState = remoteState || localState || 'idle';
        if (nextState !== currentState) {
          setAvatarState(nextState);
        }

        if (data.chatMessage) {
          addChatMessage(data.chatMessage.text, data.chatMessage.sender);
        }
      }
    } catch (e) {
      addLogLine(`SSE parse error: ${e.message}`, 'ERR');
    }
  };

  source.onerror = () => {
    footerStatus.textContent = 'connection: stream lost - retrying...';
    footerStatus.style.color = '#ff2a6d';
    setAvatarState('error');
    source.close();
    setTimeout(connect, 3000);
  };
}

// Avatar idle animation loop
setInterval(() => {
  if (currentState === 'idle') {
    voiceLines.textContent = pickLine(idleLines);
  } else if (currentState === 'sleeping') {
    voiceLines.textContent = pickLine(sleepLines);
  } else if (currentState === 'reading') {
    voiceLines.textContent = pickLine(readLines);
  } else if (currentState === 'thinking') {
    voiceLines.textContent = pickLine(thinkLines);
  } else if (currentState === 'working') {
    voiceLines.textContent = pickLine(workLines);
  } else if (currentState === 'cron') {
    voiceLines.textContent = pickLine(cronLines);
  } else if (currentState === 'done') {
    voiceLines.textContent = pickLine(doneLines);
  } else if (currentState === 'error') {
    voiceLines.textContent = pickLine(errorLines);
  }
}, 5000);

// Simulate activity when user interacts
document.addEventListener('mousemove', () => { lastActivity = Date.now(); });
document.addEventListener('keydown', () => { lastActivity = Date.now(); });

// Host tag
hostTag.textContent = 'host: ' + (window.location.hostname || 'unknown');

// Start
whenAvatarReady(() => {
  loadChatHistory().then(() => {
    connect();
    setAvatarState('idle');
    addChatMessage('Cockpit verbunden. Warte auf Input...', 'assistant');
  });
});
