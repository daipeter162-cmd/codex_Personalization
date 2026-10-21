#!/usr/bin/env node
/*
 * Starts Codex with a local DevTools port and injects the splash animation + background.
 *   node launch.js           start Codex (or re-inject if it is already running with the port)
 *   node launch.js --force   close a Codex that was started without the port, then start it
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ROOT = __dirname;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const PORT = cfg.debugPort || 9229;
const BASE = `http://127.0.0.1:${PORT}`;
const force = process.argv.includes('--force');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[codex-splash]', ...a);

function codexExe() {
  const loc = execFileSync('powershell.exe', ['-NoProfile', '-Command',
    '(Get-AppxPackage OpenAI.Codex | Select-Object -First 1).InstallLocation'], { encoding: 'utf8' }).trim();
  if (!loc) throw new Error('OpenAI.Codex package not found');
  return path.join(loc, 'app', 'ChatGPT.exe');
}

function codexRunning() {
  const out = execFileSync('tasklist.exe', ['/FI', 'IMAGENAME eq ChatGPT.exe', '/NH'], { encoding: 'utf8' });
  return /ChatGPT\.exe/i.test(out);
}

async function portOpen() {
  try { return (await fetch(`${BASE}/json/version`)).ok; } catch { return false; }
}

async function mainTarget(timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const list = await (await fetch(`${BASE}/json/list`)).json();
      const t = list.find((x) => x.type === 'page' && x.url.startsWith('app://-/index.html'));
      if (t) return t;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('Codex main window did not appear');
}

function imageFile(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/png';
  return { mime, b64: fs.readFileSync(file).toString('base64') };
}

function buildPayload() {
  const { mime, b64 } = imageFile(path.resolve(ROOT, cfg.imagePath));
  const vars = `--codex-bg-opacity:${cfg.bgOpacity};--codex-bg-position:${cfg.bgPosition};--codex-surface-alpha:${cfg.surfaceAlpha}`;
  const sheet = fs.readFileSync(path.join(ROOT, 'src', 'background.css'), 'utf8');
  const splash = fs.readFileSync(path.join(ROOT, 'src', 'splash.js'), 'utf8');
  const opts = {
    duration: cfg.duration, meshCenter: cfg.meshCenter, meshRadius: cfg.meshRadius,
    code: cfg.code, palette: cfg.palette, arcColors: cfg.arcColors,
  };

  // Runs on every new document: background always, splash once per window session.
  // The image goes through a blob: URL because Chromium drops CSS variables larger than ~2 MB.
  const boot = `(() => {
    if (window.__codexPersonalized) return; window.__codexPersonalized = true;
    const bin = atob(${JSON.stringify(b64)}), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const img = URL.createObjectURL(new Blob([bytes], { type: ${JSON.stringify(mime)} }));
    const css = ':root{--codex-bg-image:url("' + img + '");${vars}}\\n' + ${JSON.stringify(sheet)};
    const addStyle = () => {
      if (!document.documentElement || document.getElementById('codex-personalization')) return;
      const s = document.createElement('style'); s.id = 'codex-personalization'; s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    };
    // The app rewrites <head> and <html> attributes while it boots, so keep re-applying.
    const keep = () => {
      addStyle();
      if (window.__codexBgWanted && document.documentElement && document.documentElement.getAttribute('data-codex-bg') !== 'on')
        document.documentElement.setAttribute('data-codex-bg', 'on');
    };
    keep(); document.addEventListener('DOMContentLoaded', keep); setInterval(keep, 1000);
    let first = ${cfg.splash !== false};
    try { first = first && !sessionStorage.getItem('codexSplashPlayed'); sessionStorage.setItem('codexSplashPlayed', '1'); } catch {}
    if (!first) { window.__codexBgWanted = true; keep(); return; }
    window.__CODEX_SPLASH__ = Object.assign(${JSON.stringify(opts)}, { img });
    ${splash}
  })();`;
  return boot;
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const closed = new Promise((res) => { ws.onclose = res; });
  return {
    ready,
    closed,
    send: (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }),
    close: () => ws.close(),
  };
}

(async () => {
  if (!(await portOpen())) {
    if (codexRunning()) {
      if (!force) {
        log('Codex is already running without the debug port. Close it first, or run: node launch.js --force');
        process.exit(1);
      }
      log('closing running Codex…');
      try { execFileSync('taskkill.exe', ['/IM', 'ChatGPT.exe', '/F'], { stdio: 'ignore' }); } catch { /* already gone */ }
      await sleep(1500);
    }
    const exe = codexExe();
    log('starting', exe);
    spawn(exe, [`--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore' }).unref();
  }

  const target = await mainTarget(30000);
  const payload = buildPayload();
  const c = cdp(target.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: payload });
  const r = await c.send('Runtime.evaluate', { expression: payload });
  if (r.result && r.result.exceptionDetails) log('inject error:', r.result.exceptionDetails.text);
  log('injected into', target.url);
  // Scripts added with addScriptToEvaluateOnNewDocument live only as long as this session,
  // so stay connected (keeps the background across Ctrl+R) and exit when Codex closes.
  await c.closed;
  process.exit(0);
})().catch((err) => { console.error('[codex-splash]', err.message || err); process.exit(1); });
