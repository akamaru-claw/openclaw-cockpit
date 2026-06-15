/**
 * OpenClaw Cockpit Server
 * Streams live system metrics and service status to the dashboard via SSE.
 */
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 31337;

app.use(express.static(path.join(__dirname, 'public')));

const clients = new Set();

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
  const services = [
    { name: 'OpenClaw Gateway', check: 'ss -tlnp | grep -q ":18789"', port: 18789 },
    { name: 'Ollama', check: 'ss -tlnp | grep -q ":11434"', port: 11434 },
    { name: 'PhoenixD', check: 'ss -tlnp | grep -q ":9740"', port: 9740 },
    { name: 'Home Assistant', check: 'curl -s -o /dev/null -w "%{http_code}" https://mugiwarahome.duckdns.org:8123', port: 8123 },
    { name: 'Autodarts Dashboard', check: 'ss -tlnp | grep -q ":8765"', port: 8765 },
    { name: 'T-Display Proxy', check: 'ss -tlnp | grep -q ":8888"', port: 8888 }
  ];

  const results = [];
  for (const s of services) {
    const out = await run(s.check);
    let status = 'down';
    if (out === '' || out === '200' || out === '301' || out === '302' || out === '401' || out === '403') {
      status = 'up';
    }
    results.push({ ...s, status });
  }
  return results;
}

async function getOpenClawInfo() {
  const model = await run("ps aux | grep -oP 'openclaw.*--model\s+\K[^ ]+' | head -1");
  const status = await run("systemctl --user is-active openclaw 2>/dev/null || echo 'running'");
  return {
    model: model || 'ollama/kimi-k2.7-code:cloud',
    session: 'telegram:404307047',
    status: status || 'running'
  };
}

async function getLogLine() {
  const line = await run("journalctl -b 0 -n 1 --no-pager 2>/dev/null | tail -1");
  return line;
}

async function broadcast() {
  const payload = {
    type: 'tick',
    ts: new Date().toISOString(),
    metrics: await getMetrics(),
    services: await getServices(),
    openclaw: await getOpenClawInfo(),
    log: await getLogLine()
  };

  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

app.get('/status', async (req, res) => {
  res.json({
    metrics: await getMetrics(),
    services: await getServices(),
    openclaw: await getOpenClawInfo()
  });
});

setInterval(broadcast, 2000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenClaw Cockpit server running on http://0.0.0.0:${PORT}`);
});
