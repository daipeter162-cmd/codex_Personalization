/*
 * Codex splash: neon line-art -> full color reveal, typed code, light streaks.
 * Reads window.__CODEX_SPLASH__ = { img, duration, meshCenter, meshRadius, code }.
 * On fade-out it sets <html data-codex-bg="on"> so background.css can take over.
 */
(function run() {
  if (!document.body) return document.addEventListener('DOMContentLoaded', run, { once: true });
  if (window.__codexSplashActive) return;
  const cfg = Object.assign({
    img: '',
    duration: 11000,
    meshCenter: [0.55, 0.3], // face position as a fraction of the image
    meshRadius: 0.17,        // fraction of image width
    code: null,              // array of lines, or null for the built-in text
    palette: null,           // hex colours cycled along the neon line art
    arcColors: null,         // hex colours of the light ribbons
  }, window.__CODEX_SPLASH__ || {});
  if (!cfg.img) return;
  window.__codexSplashActive = true;

  const DEFAULT_CODE = [
    '// 唤醒核心 · 意识矩阵加载',
    "const seed = 'ocean://memory';",
    'await boot(seed); // neural matrix online',
    "const clock = sync('neural');",
    'clock.rate = 60; // synchronize light particles',
    '// 光子阵列 · 信号接入',
    "const photons = collect('cyan');",
    'photons.spread(0.72);',
    'await photons.align(); // spectrum calibrated',
    '// 收集微光 · 重建轮廓',
    "const light = scan('hair');",
    'await light.trace(); // luminous strands rebuilt',
    'light.edge = 0.85;',
    "light.tint = ['cyan', 'violet', 'ice'];",
    '// 深空链路 · 初始化',
    "const link = connect('deep-space');",
    'await link.listen();',
    'link.signal = 1.0;',
    '// 解码记忆图谱 · 轮廓与神经节点同步',
    'const face = await decode(); // resolve topology',
    'face.mesh({ density: 0.36 });',
    'face.resolve();',
    '// 轮廓映射 · 剪影重建',
    "const contour = trace('silhouette');",
    'contour.smooth(0.92); // preserve silhouette',
    'await contour.reveal();',
    '// 流星穿越 · 捕获能量',
    "const trails = emit('stardust');",
    'trails.velocity = 0.86;',
    'trails.palette = light.tint;',
    'await trails.cross();',
    '// 瞳孔聚焦 · 神经联动',
    'await eyes.open(0.85); // iris aperture synchronized',
    "const pulse = connect('iris');",
    "pulse.glow('cyan');",
    '// 虹膜核心 · 微光共振',
    'pulse.phase = clock.phase;',
    'pulse.bloom(0.72);',
    'await pulse.stabilize();',
    '// 向未知之境启航 · 所有光流连接自洽',
    'scene.attach(face);',
    "scene.depth = 'quiet';",
    'scene.focus = eyes.center;',
    '// 现实归位 · 退场完成',
    'await photons.settle();',
    'contour.fade(0.12);',
    'trails.release();',
    "await sync('consciousness');",
    '// 所有系统 · 已同步',
    'await scene.ready(); // consciousness online',
  ];

  // Timeline in ms for an 11s run, scaled to cfg.duration.
  const k = cfg.duration / 11000;
  const T = {
    artStart: 400, artEnd: 3600,
    meshIn: 1400, meshOut: 6600,
    typeStart: 500, typeEnd: 8600,
    colorStart: 4800, colorEnd: 8400,
    fxOut: 8600, fxEnd: 9600,
    codeOut: 8800, codeEnd: 9800,
    fadeStart: 9800, end: 11000,
  };
  for (const key in T) T[key] *= k;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- DOM ----------
  const root = document.createElement('div');
  root.id = 'codex-splash';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#000;overflow:hidden;cursor:default;';
  root.innerHTML = `
    <style>
      #codex-splash canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      #codex-splash .cs-drag{position:absolute;left:0;right:0;top:0;height:40px;-webkit-app-region:drag;z-index:3}
      #codex-splash pre{position:absolute;left:5%;top:8%;bottom:10%;width:min(48%,600px);margin:0;overflow:hidden;z-index:2;
        font:12.5px/1.7 "Cascadia Code","JetBrains Mono",Consolas,monospace;color:rgba(178,188,206,.52);white-space:pre;
        -webkit-mask-image:linear-gradient(to bottom,transparent,#000 10%,#000 90%,transparent);pointer-events:none}
      #codex-splash pre .c{color:rgba(150,162,186,.38)}
      #codex-splash pre .cur{display:inline-block;width:.55em;height:1.1em;vertical-align:-.2em;background:rgba(200,215,240,.7);animation:cs-blink 1s steps(1) infinite}
      #codex-splash pre > div{transition:transform .35s ease-out}
      @keyframes cs-blink{50%{opacity:0}}
    </style>
    <canvas></canvas><div class="cs-drag"></div><pre><div></div></pre>`;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const pre = root.querySelector('pre');
  const codeBox = pre.firstElementChild;
  (document.body || document.documentElement).appendChild(root);

  let W = 0, H = 0, DPR = 1;
  const scratchA = document.createElement('canvas');
  const scratchB = document.createElement('canvas');
  const sa = scratchA.getContext('2d');
  const sb = scratchB.getContext('2d');
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [canvas, scratchA, scratchB]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    layout();
  }

  // ---------- image layers ----------
  let photo, edges, glow, rect = { x: 0, y: 0, w: 0, h: 0 };
  const hexRgb = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  const hexList = (list, fallback) => {
    const out = (Array.isArray(list) ? list : []).map(hexRgb).filter(Boolean);
    return out.length ? out : fallback;
  };
  const PALETTE = hexList(cfg.palette, [[124, 92, 255], [56, 225, 255], [255, 95, 200], [205, 232, 255], [150, 110, 255]]);
  function pal(t) {
    t = ((t % 1) + 1) % 1;
    const f = t * PALETTE.length, i = Math.floor(f), u = f - i;
    const a = PALETTE[i], b = PALETTE[(i + 1) % PALETTE.length];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }

  function buildLayers(img) {
    const h = Math.min(img.naturalHeight, 1100);
    const w = Math.round(h * img.naturalWidth / img.naturalHeight);
    photo = document.createElement('canvas'); photo.width = w; photo.height = h;
    const pc = photo.getContext('2d', { willReadFrequently: true });
    pc.drawImage(img, 0, 0, w, h);
    const src = pc.getImageData(0, 0, w, h).data;

    // grayscale + 3x3 box blur to keep only meaningful contours
    const g = new Float32Array(w * h), b = new Float32Array(w * h);
    for (let i = 0, p = 0; i < g.length; i++, p += 4) g[i] = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += g[(y + dy) * w + x + dx];
      b[y * w + x] = s / 9;
    }
    // Sobel magnitude
    const mag = new Float32Array(w * h);
    let max = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -b[i - w - 1] - 2 * b[i - 1] - b[i + w - 1] + b[i - w + 1] + 2 * b[i + 1] + b[i + w + 1];
      const gy = -b[i - w - 1] - 2 * b[i - w] - b[i - w + 1] + b[i + w - 1] + 2 * b[i + w] + b[i + w + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[i] = m; if (m > max) max = m;
    }
    // normalise by the 97th percentile so a few hard edges don't wash out the rest
    const hist = new Uint32Array(256);
    for (let i = 0; i < mag.length; i++) hist[Math.min(255, (mag[i] / max * 255) | 0)]++;
    let acc = 0, p97 = 255;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > mag.length * 0.97) { p97 = i; break; } }
    const norm = Math.max(1, (p97 / 255) * max);

    edges = document.createElement('canvas'); edges.width = w; edges.height = h;
    const ec = edges.getContext('2d');
    const out = ec.createImageData(w, h), o = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = clamp((mag[i] / norm - 0.22) / 0.7);
      v = v * v * (3 - 2 * v);
      if (v <= 0.01) continue;
      const t = x / w * 0.55 + y / h * 0.45 + 0.12 * Math.sin(y / h * 9 + x / w * 6);
      const c = pal(t), lift = 0.55 + 0.45 * v, p = i * 4;
      o[p] = Math.min(255, c[0] * lift + 40 * v);
      o[p + 1] = Math.min(255, c[1] * lift + 40 * v);
      o[p + 2] = Math.min(255, c[2] * lift + 40 * v);
      o[p + 3] = 255 * v;
    }
    ec.putImageData(out, 0, 0);

    glow = document.createElement('canvas'); glow.width = w; glow.height = h;
    const gc = glow.getContext('2d');
    gc.filter = 'blur(7px)'; gc.drawImage(edges, 0, 0);
    gc.globalCompositeOperation = 'lighter';
    gc.filter = 'blur(2px)'; gc.drawImage(edges, 0, 0);
    gc.filter = 'none';
  }

  function layout() {
    if (!photo) return;
    const ar = photo.width / photo.height;
    let h = H, w = h * ar;
    if (w < W * 0.6) { w = W * 0.6; h = w / ar; }
    rect = { x: W - w, y: (H - h) / 2, w, h };
  }

  // ---------- face mesh ----------
  let mesh = null;
  function buildMesh() {
    const [cx, cy] = cfg.meshCenter, r = cfg.meshRadius, ar = photo.width / photo.height;
    const rx = r, ry = r * 1.25 * ar; // fractions of width / height
    const s = r / 5, rowH = s * 0.866;
    const pts = new Map(), list = [];
    for (let row = -12; row <= 12; row++) for (let col = -12; col <= 12; col++) {
      const fx = col * s + (row & 1 ? s / 2 : 0), fy = row * rowH * ar;
      const d = (fx / rx) ** 2 + (fy / ry) ** 2;
      if (d > 1) continue;
      const pt = { x: cx + fx + rand(-0.3, 0.3) * s, y: cy + fy + rand(-0.3, 0.3) * s * ar, d, ph: rand(0, 6.28) };
      pts.set(row + ',' + col, pt); list.push(pt);
    }
    const lines = [];
    for (const [key, p] of pts) {
      const [row, col] = key.split(',').map(Number);
      const odd = row & 1;
      for (const n of [[row, col + 1], [row + 1, col - 1 + odd], [row + 1, col + odd]]) {
        const q = pts.get(n[0] + ',' + n[1]);
        if (q) lines.push([p, q]);
      }
    }
    mesh = { pts: list, lines };
  }

  // ---------- light fx ----------
  const ARC_COLORS = hexList(cfg.arcColors, [[120, 230, 255], [170, 130, 255], [235, 245, 255], [255, 120, 210], [110, 255, 220]])
    .map((c) => c.join(','));
  const arcs = ARC_COLORS.map((c, i) => ({
    c, y0: rand(0.25, 0.85), y1: rand(0.15, 0.75), c1: rand(0.1, 0.9), c2: rand(0.2, 0.95),
    amp: rand(0.04, 0.12), sp: rand(0.25, 0.6), ph: rand(0, 6.28), w: rand(1.2, 2.6),
    run: rand(0.35, 0.7), seg: rand(0.25, 0.5), delay: i * 220,
  }));
  const meteors = [];
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.4, 1.6), v: rand(0.004, 0.015), ph: rand(0, 6.28) }));

  function drawFx(t, a) {
    if (a <= 0) return;
    const s = t / 1000;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const arc of arcs) {
      const la = a * prog(t, arc.delay, arc.delay + 900);
      if (la <= 0) continue;
      const wob = (o) => Math.sin(s * arc.sp + arc.ph + o) * arc.amp * H;
      ctx.beginPath();
      ctx.moveTo(-0.1 * W, arc.y0 * H + wob(0));
      ctx.bezierCurveTo(0.33 * W, arc.c1 * H + wob(1.3), 0.66 * W, arc.c2 * H + wob(2.6), 1.1 * W, arc.y1 * H + wob(3.9));
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, `rgba(${arc.c},0)`);
      grad.addColorStop(0.5, `rgba(${arc.c},${0.32 * la})`);
      grad.addColorStop(1, `rgba(${arc.c},0)`);
      ctx.strokeStyle = grad; ctx.lineWidth = arc.w; ctx.shadowColor = `rgba(${arc.c},0.9)`; ctx.shadowBlur = 10;
      ctx.setLineDash([]); ctx.stroke();
      // travelling highlight
      const len = W * 1.4, seg = len * arc.seg;
      ctx.setLineDash([seg, len * 3]);
      ctx.lineDashOffset = -(((s * arc.run * len) % (len + seg)) - seg);
      ctx.strokeStyle = `rgba(${arc.c},${0.85 * la})`; ctx.lineWidth = arc.w * 1.4; ctx.shadowBlur = 18;
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.shadowBlur = 0;

    if (Math.random() < 0.06 * a && meteors.length < 8) {
      meteors.push({ x: rand(0.05, 0.95) * W, y: -rand(0, 0.2) * H, len: rand(80, 220), v: rand(160, 420), w: rand(1, 2.2),
        c: Math.random() < 0.5 ? '255,90,190' : (Math.random() < 0.5 ? '90,230,255' : '120,255,190') });
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.y += m.v / 60;
      if (m.y - m.len > H) { meteors.splice(i, 1); continue; }
      const g = ctx.createLinearGradient(m.x, m.y - m.len, m.x, m.y);
      g.addColorStop(0, `rgba(${m.c},0)`); g.addColorStop(1, `rgba(${m.c},${0.9 * a})`);
      ctx.strokeStyle = g; ctx.lineWidth = m.w; ctx.shadowColor = `rgba(${m.c},1)`; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(m.x, m.y - m.len); ctx.lineTo(m.x, m.y); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (const d of dust) {
      d.y -= d.v / 60; if (d.y < 0) { d.y = 1; d.x = Math.random(); }
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(s * 1.7 + d.ph));
      ctx.fillStyle = `rgba(200,225,255,${0.5 * tw * a})`;
      ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawMesh(t, a) {
    if (!mesh || a <= 0) return;
    const s = t / 1000, px = (p) => rect.x + p.x * rect.w, py = (p) => rect.y + p.y * rect.h;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 0.7;
    for (const [p, q] of mesh.lines) {
      const fade = (1 - Math.max(p.d, q.d)) ** 0.6;
      ctx.strokeStyle = `rgba(190,220,255,${0.35 * a * fade})`;
      ctx.beginPath(); ctx.moveTo(px(p), py(p)); ctx.lineTo(px(q), py(q)); ctx.stroke();
    }
    for (const p of mesh.pts) {
      const tw = 0.5 + 0.5 * Math.sin(s * 3 + p.ph);
      ctx.fillStyle = `rgba(220,240,255,${0.8 * a * tw * (1 - p.d)})`;
      ctx.beginPath(); ctx.arc(px(p), py(p), 1.3, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- code typing ----------
  const code = (Array.isArray(cfg.code) && cfg.code.length ? cfg.code : DEFAULT_CODE).join('\n');
  const esc = (str) => str.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  let typed = -1;
  function drawCode(t) {
    const n = Math.floor(code.length * prog(t, T.typeStart, T.typeEnd));
    if (n !== typed) {
      typed = n;
      codeBox.innerHTML = esc(code.slice(0, n)).replace(/\/\/[^\n]*/g, (m) => `<span class="c">${m}</span>`) + '<span class="cur"></span>';
      const over = codeBox.offsetHeight - pre.clientHeight * 0.85;
      codeBox.style.transform = `translateY(${-Math.max(0, over)}px)`;
    }
    pre.style.opacity = String(1 - ease(prog(t, T.codeOut, T.codeEnd)));
  }

  // ---------- frame ----------
  function frame(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const artP = ease(prog(t, T.artStart, T.artEnd));
    const colorP = ease(prog(t, T.colorStart, T.colorEnd));
    const meshA = prog(t, T.meshIn, T.meshIn + 1000) * (1 - prog(t, T.meshOut - 1000, T.meshOut));
    const fxA = prog(t, 200, 900) * (1 - prog(t, T.fxOut, T.fxEnd));
    const { x, y, w, h } = rect;
    const fcx = x + cfg.meshCenter[0] * w, fcy = y + cfg.meshCenter[1] * h;

    // full-colour photo, revealed radially from the face
    if (colorP > 0) {
      if (colorP < 1) {
        sb.setTransform(DPR, 0, 0, DPR, 0, 0);
        sb.globalCompositeOperation = 'source-over';
        sb.clearRect(0, 0, W, H);
        sb.drawImage(photo, x, y, w, h);
        const R = Math.hypot(Math.max(fcx - x, x + w - fcx), Math.max(fcy - y, y + h - fcy)) * 1.35;
        const r = colorP * R;
        const g = sb.createRadialGradient(fcx, fcy, 0, fcx, fcy, Math.max(1, r));
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.6, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        sb.globalCompositeOperation = 'destination-in';
        sb.fillStyle = g; sb.fillRect(0, 0, W, H);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(scratchB, 0, 0);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      } else {
        ctx.drawImage(photo, x, y, w, h);
      }
    }

    // neon line art, swept in from the top
    const lineA = (1 - 0.8 * colorP) * (0.85 + 0.15 * Math.sin(t / 90) * (1 - artP));
    if (artP > 0 && lineA > 0) {
      sa.setTransform(DPR, 0, 0, DPR, 0, 0);
      sa.globalCompositeOperation = 'source-over';
      sa.clearRect(0, 0, W, H);
      sa.drawImage(glow, x, y, w, h);
      sa.globalCompositeOperation = 'lighter';
      sa.drawImage(edges, x, y, w, h);
      if (artP < 1) {
        const sweep = y + artP * h * 1.2, soft = h * 0.18;
        const g = sa.createLinearGradient(0, sweep - soft, 0, sweep);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        sa.globalCompositeOperation = 'destination-in';
        sa.fillStyle = g; sa.fillRect(0, 0, W, H);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = lineA;
      ctx.drawImage(scratchA, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    drawMesh(t, meshA * (1 - colorP));

    // blend the image's left edge and top/bottom into black
    let g = ctx.createLinearGradient(x, 0, x + w * 0.38, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, x + w * 0.38, H);
    g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.12, 'rgba(0,0,0,0)');
    g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    drawFx(t, fxA);
    drawCode(t);
  }

  // ---------- run ----------
  let start = 0, offset = 0, bgOn = false, raf = 0;
  function tick(now) {
    if (!start) start = now;
    const t = now - start + offset;
    frame(t);
    if (t >= T.fadeStart && !bgOn) {
      bgOn = true;
      window.__codexBgWanted = true; document.documentElement.setAttribute('data-codex-bg', 'on');
    }
    root.style.opacity = String(1 - ease(prog(t, T.fadeStart, T.end)));
    if (t >= T.end) return finish();
    raf = requestAnimationFrame(tick);
  }
  function skip() {
    const t = performance.now() - start + offset;
    if (start && t < T.fadeStart) offset += T.fadeStart - t;
  }
  function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') skip(); }
  function finish() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    window.__codexSplashActive = false;
    window.__codexSplashStop = null;
    window.__codexBgWanted = true; document.documentElement.setAttribute('data-codex-bg', 'on');
  }
  const onResize = () => resize();
  window.__codexSplashStop = finish; // lets a host page (customize.html) cancel and replay

  const img = new Image();
  img.onload = () => {
    try { buildLayers(img); } catch (err) { console.error('[codex-splash]', err); return finish(); }
    buildMesh();
    resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('click', skip);
    raf = requestAnimationFrame(tick);
  };
  img.onerror = () => { console.error('[codex-splash] image failed to load'); finish(); };
  img.src = cfg.img;
})();

