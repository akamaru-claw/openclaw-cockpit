/**
 * OpenClaw Cockpit Frontend
 * Connects to /stream SSE endpoint and updates the dashboard in real-time.
 */

const avatar = document.getElementById('avatar');
const avatarState = document.getElementById('avatar-state');
const voiceLines = document.getElementById('voice-lines');
const terminal = document.getElementById('terminal');
const clock = document.getElementById('clock');
const hostTag = document.getElementById('host-tag');
const footerStatus = document.getElementById('footer-status');

const states = {
  idle: { label: 'AKAMARU // IDLE', color: '#00f0ff', speed: '8s' },
  listening: { label: 'AKAMARU // LISTENING', color: '#f7931a', speed: '1s' },
  thinking: { label: 'AKAMARU // PROCESSING', color: '#ff2a6d', speed: '0.4s' },
  working: { label: 'AKAMARU // WORKING', color: '#05ffa1', speed: '2s' },
  alert: { label: 'AKAMARU // ALERT', color: '#ff2a6d', speed: '0.2s' }
};

const idleLines = [
  'Warte auf Input...',
  'Systeme nominal.',
  'Bereit für den nächsten Befehl.',
  'Scanne Umgebung...',
  'Akamaru online.'
];

const workLines = [
  'Berechne Szenarien...',
  'Verarbeite Daten...',
  'Verbinde Dienste...',
  'Optimiere Ausgabe...',
  'Sammle Metriken...'
];

let currentState = 'idle';
let lastActivity = Date.now();

function setAvatarState(state) {
  if (!states[state]) return;
  currentState = state;
  const cfg = states[state];
  avatarState.textContent = cfg.label;
  avatarState.style.color = cfg.color;
  avatarState.style.textShadow = `0 0 12px ${cfg.color}`;

  // Access SVG document inside <object> once loaded
  const svgDoc = avatar.contentDocument;
  if (!svgDoc) return;

  const statusRing = svgDoc.querySelector('.status-ring');
  const hudFast = svgDoc.querySelector('.hud-ring-fast');
  const hudSlow = svgDoc.querySelector('.hud-ring-slow');
  const circuits = svgDoc.querySelector('.circuits');

  if (statusRing) {
    statusRing.style.stroke = cfg.color;
    statusRing.style.animationDuration = cfg.speed;
    statusRing.style.filter = `drop-shadow(0 0 8px ${cfg.color})`;
  }
  if (hudFast) {
    hudFast.style.stroke = cfg.color;
    hudFast.style.animationDuration = cfg.speed;
  }
  if (hudSlow) {
    hudSlow.style.stroke = cfg.color;
    hudSlow.style.opacity = '0.4';
  }
  if (circuits) {
    circuits.style.stroke = cfg.color;
  }
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

function log(msg, tag = 'INFO') {
  const line = document.createElement('div');
  line.className = 'line';
  const ts = new Date().toLocaleTimeString('de-DE', { hour12: false });
  line.innerHTML = `<span class="ts">[${ts}]</span><span class="tag">${tag}</span>${escapeHtml(msg)}`;
  terminal.appendChild(line);
  if (terminal.children.length > 50) {
    terminal.removeChild(terminal.firstChild);
  }
  terminal.scrollTop = terminal.scrollHeight;
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

function detectState(metrics, services) {
  const downCount = services.filter(s => s.status === 'down').length;
  const highLoad = metrics.cpu > 70 || metrics.ram > 85;

  if (downCount > 2) return 'alert';
  if (highLoad) return 'working';
  if (Date.now() - lastActivity < 5000) return 'listening';
  return 'idle';
}

function connect() {
  const source = new EventSource('/stream');

  source.onopen = () => {
    footerStatus.textContent = 'connection: live stream active';
    footerStatus.style.color = '#05ffa1';
    log('Live stream verbunden.', 'NET');
    setAvatarState('working');
    setTimeout(() => setAvatarState('idle'), 3000);
  };

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'tick') {
      updateMetrics(data.metrics);
      updateServices(data.services);
      updateOpenClaw(data.openclaw);
      log(data.log || 'System tick received', 'SYS');

      const newState = detectState(data.metrics, data.services);
      if (newState !== currentState) {
        setAvatarState(newState);
      }
    }
  };

  source.onerror = () => {
    footerStatus.textContent = 'connection: stream lost - retrying...';
    footerStatus.style.color = '#ff2a6d';
    setAvatarState('alert');
    source.close();
    setTimeout(connect, 3000);
  };
}

// Avatar idle animation loop
setInterval(() => {
  if (currentState === 'idle') {
    voiceLines.textContent = pickLine(idleLines);
  } else if (currentState === 'working') {
    voiceLines.textContent = pickLine(workLines);
  } else if (currentState === 'alert') {
    voiceLines.textContent = 'Achtung: Mehrere Dienste offline.';
  } else if (currentState === 'listening') {
    voiceLines.textContent = 'Ich höre zu...';
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
