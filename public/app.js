/**
 * OpenClaw Cockpit Frontend
 * Connects to /stream SSE endpoint and updates the dashboard in real-time.
 */

const avatar = document.getElementById('avatar');
const avatarState = document.getElementById('avatar-state');
const voiceLines = document.getElementById('voice-lines');
const terminal = document.getElementById('terminal');
const chatStream = document.getElementById('chat-stream');
const clock = document.getElementById('clock');
const hostTag = document.getElementById('host-tag');
const footerStatus = document.getElementById('footer-status');

const states = {
  sleeping: { label: 'AKAMARU // SLEEPING', color: '#9FA8DA', file: 'avatar-sleeping.svg' },
  idle: { label: 'AKAMARU // IDLE', color: '#00FFFF', file: 'avatar-idle.svg' },
  reading: { label: 'AKAMARU // READING', color: '#00FFFF', file: 'avatar-reading.svg' },
  thinking: { label: 'AKAMARU // THINKING', color: '#E040FB', file: 'avatar-thinking.svg' },
  working: { label: 'AKAMARU // WORKING', color: '#FF5252', file: 'avatar-working.svg' },
  cron: { label: 'AKAMARU // CRON', color: '#FFD700', file: 'avatar-cron.svg' },
  done: { label: 'AKAMARU // DONE', color: '#FF4081', file: 'avatar-done.svg' },
  error: { label: 'AKAMARU // ERROR', color: '#FF2A2A', file: 'avatar-error.svg' }
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
  log(`State switched: ${state}`, 'STATE');
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
  clock.textContent = now.toLocaleTimeString('de-DE', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

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

function log(msg, tag = 'INFO') {
  const ts = new Date().toLocaleTimeString('de-DE', { hour12: false });
  console.log(`[${ts}] ${tag}: ${msg}`);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateMetrics(metrics) {
  document.getElementById('cpu').textContent = metrics.cpu.toFixed(1) + '%';
  document.getElementById('ram').textContent = metrics.ram.toFixed(0) + '%';
  document.getElementById('disk').textContent = metrics.disk.toFixed(0) + '%';
  document.getElementById('uptime').textContent = metrics.uptime;
  document.getElementById('load').textContent = metrics.load;
  document.getElementById('temp').textContent = metrics.temp ? metrics.temp + '°C' : '--';
}

function updateServices(services) {
  const list = document.getElementById('services');
  list.innerHTML = services.map(s => {
    const dotClass = s.status === 'up' ? 'up' : s.status === 'warn' ? 'warn' : 'down';
    return `<li><span><span class="status-dot ${dotClass}"></span>${s.name}</span><span>${s.status.toUpperCase()}</span></li>`;
  }).join('');
}

function updateOpenClaw(info) {
  document.getElementById('oc-model').textContent = info.model;
  document.getElementById('oc-session').textContent = info.session;
  document.getElementById('oc-status').textContent = info.status.toUpperCase();
}

function detectLocalState(metrics, services, log) {
  const downCount = services.filter(s => s.status === 'down').length;
  const logText = log || '';
  if (downCount > 2) return 'error';
  if (logText.includes('cron') || logText.includes('Cron')) return 'cron';
  if (logText.includes('Tool:') || logText.includes('exec') || logText.includes('working')) return 'working';
  if (metrics.cpu > 70 || metrics.ram > 85) return 'working';
  if (Date.now() - lastActivity > 60000) return 'sleeping';
  return null;
}

function connect() {
  const source = new EventSource('/stream');

  source.onopen = () => {
    footerStatus.textContent = 'connection: live stream active';
    footerStatus.style.color = '#05ffa1';
    log('Live stream verbunden.', 'NET');
    addChatMessage('Cockpit verbunden. Warte auf Input...', 'assistant');
  };

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'tick') {
      updateMetrics(data.metrics);
      updateServices(data.services);
      updateOpenClaw(data.openclaw);

      const remoteState = data.state;
      const localState = detectLocalState(data.metrics, data.services, data.log);
      const nextState = remoteState || localState || 'idle';
      if (nextState !== currentState) {
        setAvatarState(nextState);
      }

      if (data.chatMessage) {
        addChatMessage(data.chatMessage.text, data.chatMessage.sender);
      }
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
  connect();
  setAvatarState('idle');
});
