/* Sajal Baiddya — first-visit intro.
   A crew of AI "agents" (multiplayer-style cursors) builds the real page live: they orbit the logo,
   scatter, drag selections, draw icons with a pen tool, type the copy, copy-paste components, count up
   numbers and scroll the camera down the page. Everything they build is the real page, so the result is
   identical to the premade site. Plays once per browser (decided in index.html). Dependency-free.
   Exposes window.SBIntro = { init, progress, launch, skip }. */
(() => {
  'use strict';
  const root = document.documentElement;
  const doc = document;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = {
    lin: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    smooth: (t) => t * t * t * (t * (t * 6 - 15) + 10),            // smootherstep: no jolt at the start or the end of a move
    hum: (t) => t * t * t * (t * (t * 6 - 15) + 10)                // used for hand-like cursor moves
  };

  const KEY = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl+';
  const PALETTE = Array.from({ length: 14 }, (_, i) => 'hsl(' + Math.round((i * 137.508 + 222) % 360) + ' 88% 66%)');       // golden-angle hues: every cursor is easy to tell apart
  const NAMES = ['layout', 'type', 'assets', 'motion', 'a11y', 'seo', 'qa', 'copy', 'css', 'html', 'perf', 'forms', 'icons', 'docs'];
  let HEADER_H = 68;                                  // measured from the real header in init()
  const small = () => innerWidth < 700;
  const SAFE = () => (innerWidth < 640 ? 88 : 80);   // keeps the build area clear of the bottom bar

  /* ---------- state ---------- */
  let ctx = null, layer, grid, bar, barLog, barTime, barPct, barFill, mark;
  let alive = false, skipped = false, launched = false, finished = false;
  let mode = 'orbit', prog = 0, orbitT = 0, lastT = 0, lastBar = 0, t0 = 0, resolveDone = null;
  let jobs = [], doneCount = 0;
  const cursors = [];
  const live = new Set();          // running tweens
  const owners = new Map();        // owner -> its running tween (a new one cancels the old)
  const waiters = new Set();
  const typing = new Set();
  const hidden = new Set();
  const shells = [];
  const pens = new Set();          // svg shapes whose dash styles must be restored
  const cardParts = new Map();
  const svcParts = new Map();
  const lazyImgs = [];
  const splitEls = new Set();      // elements whose text nodes were split between cursors (re-merged afterwards)
  let idlePool = [];               // cursors with nothing to do (the scheduler hands them out, jobs may borrow them)
  let queue = [];                  // jobs not started yet
  let wakeSched = () => {};

  /* Everything the agents draw lives in PAGE coordinates inside a layer that scrolls with the page. Scrolling can therefore never
     pull a cursor, a frame or a caret away from the thing it is working on. */
  const R = (el) => {
    const r = el.getBoundingClientRect(), s = window.scrollY;
    return { left: r.left, top: r.top + s, right: r.right, bottom: r.bottom + s, width: r.width, height: r.height };
  };
  const cam = { y: 0, v: 0, target: 0, maxV: 700, on: false };       // the follow-camera

  const mk = (tag, cls, parent) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------- timing ---------- */
  /* Pacing: one steady, unhurried speed for the whole build. Smooth motion matters more than total length, so nothing speeds up. */
  const PACE = 1.6;                                   // 1 = the base durations; below 1 = slower and calmer
  const speed = () => PACE;

  const wait = (ms) => new Promise((resolve) => {
    if (skipped) return resolve();
    const done = () => { clearTimeout(id); waiters.delete(done); resolve(); };
    const id = setTimeout(done, ms / speed());
    waiters.add(done);
  });

  const nap = (ms) => {          // cancellable timer, used where a wait may be abandoned
    let cancel = () => {};
    const p = new Promise((resolve) => { const id = setTimeout(resolve, ms); cancel = () => { clearTimeout(id); resolve(); }; });
    p.cancel = cancel;
    return p;
  };

  /* One ticker drives everything. Each frame: (1) every tween writes, (2) every tween reads (caret / pen tip), (3) cursors render.
     Keeping writes and reads apart means several cursors typing at once cost one layout per frame, not one each. */
  function tween(dur, fn, easeFn = ease.inOut, owner, after, minMs = 0) {
    return new Promise((resolve) => {
      if (skipped || dur <= 0) { fn(1); if (after) after(1); resolve(); return; }
      const tw = { dur: Math.max(dur / speed(), minMs), fn, ease: easeFn, after, start: null, k: 0, dead: false, resolve };
      if (owner) {
        const prev = owners.get(owner);
        if (prev) { prev.dead = true; live.delete(prev); prev.resolve(); }
        owners.set(owner, tw);
        tw.owner = owner;
      }
      live.add(tw);
    });
  }

  function flushTweens() {
    live.forEach((tw) => { if (!tw.dead) { tw.fn(1); if (tw.after) tw.after(1); } tw.dead = true; tw.resolve(); });
    live.clear();
    owners.clear();
  }

  function tick(now) {
    if (!alive) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;

    camStep(dt);

    const list = [...live];
    for (const tw of list) {                                       // 1) writes
      if (tw.dead) continue;
      if (tw.start == null) tw.start = now;
      tw.k = Math.min((now - tw.start) / tw.dur, 1);
      tw.fn(tw.ease(tw.k));
    }
    for (const tw of list) if (!tw.dead && tw.after) tw.after(tw.ease(tw.k));     // 2) reads
    for (const tw of list) {
      if (!tw.dead && tw.k >= 1) {
        tw.dead = true;
        live.delete(tw);
        if (tw.owner && owners.get(tw.owner) === tw) owners.delete(tw.owner);
        tw.resolve();
      }
    }

    if (mode === 'orbit' && mark && mark.isConnected) {            // 3) cursors
      const r = R(mark);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      orbitT += dt * (1 + prog * prog * 2.4);                      // the swirl speeds up as loading completes
      cursors.forEach((c) => {
        const a = c.phase + orbitT * c.w, cs = Math.cos(c.th), sn = Math.sin(c.th);
        const ex = Math.cos(a) * c.R, ey = Math.sin(a) * c.R * c.k;
        c.x = cx + ex * cs - ey * sn;
        c.y = cy + ex * sn + ey * cs;
        c.vx = (c.x - c.rx) / dt; c.vy = (c.y - c.ry) / dt;       // carry the orbit's speed into the next phase
        c.rx = c.x; c.ry = c.y;
      });
    } else {
      /* Critically damped spring (SmoothDamp): the drawn cursor follows its target with continuous velocity, so it glides
         over target jumps (a caret wrapping to the next line) and over uneven frame times, without ever overshooting. */
      cursors.forEach((c) => {
        if (!c.soft) { c.rx = c.x; c.ry = c.y; c.vx = 0; c.vy = 0; return; }
        const om = 2 / (now < c.softUntil ? 0.2 : 0.07), xx = om * dt, ex = 1 / (1 + xx + 0.48 * xx * xx + 0.235 * xx * xx * xx);
        let ch = c.rx - c.x, tmp = (c.vx + om * ch) * dt;
        c.vx = (c.vx - om * tmp) * ex; c.rx = c.x + (ch + tmp) * ex;
        ch = c.ry - c.y; tmp = (c.vy + om * ch) * dt;
        c.vy = (c.vy - om * tmp) * ex; c.ry = c.y + (ch + tmp) * ex;
      });
    }
    cursors.forEach((c) => { c.el.style.transform = 'translate3d(' + c.rx.toFixed(2) + 'px,' + c.ry.toFixed(2) + 'px,0)'; });

    if (launched && now - lastBar > 250) {
      lastBar = now;
      const s = Math.floor((now - t0) / 1000);
      barTime.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }
    requestAnimationFrame(tick);
  }

  /* Continuous follow-camera: a critically damped spring with a speed limit keeps the earliest unfinished work in view, so the page
     glides down as the build advances instead of stopping and starting. */
  function camStep(dt) {
    if (!cam.on) return;
    const max = Math.max(0, root.scrollHeight - innerHeight);
    const target = clamp(cam.target, 0, max);
    const st = 0.9, om = 2 / st, xx = om * dt, ex = 1 / (1 + xx + 0.48 * xx * xx + 0.235 * xx * xx * xx);
    let ch = cam.y - target;
    const lim = cam.maxV * st;
    ch = clamp(ch, -lim, lim);
    const tgt = cam.y - ch, tmp = (cam.v + om * ch) * dt;
    cam.v = (cam.v - om * tmp) * ex;
    let out = tgt + (ch + tmp) * ex;
    if ((target - cam.y > 0) === (out > target)) { out = target; cam.v = 0; }
    cam.y = out;
    if (Math.abs(out - window.scrollY) > 0.25) window.scrollTo(0, out);
  }

  /* ---------- cursors ---------- */
  const makeCursor = (i, n) => {
    const el = mk('div', 'ag-cur', layer);
    el.style.setProperty('--c', PALETTE[i]);
    el.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 2l7.6 19.2 2.8-8.2 8.2-2.8L3 2z" fill="var(--c)" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
      '<span class="ag-cur__tag"></span>';
    $('.ag-cur__tag', el).textContent = NAMES[i];
    const sc = small() ? 0.72 : 1;
    const x = innerWidth / 2, y = innerHeight / 2;
    return {
      i, el, name: NAMES[i], color: PALETTE[i], x, y, rx: x, ry: y, vx: 0, vy: 0, soft: true, softUntil: 0, token: 0, parked: false, idleSince: 0,
      phase: (i / n) * Math.PI * 2, R: (84 + (i % 4) * 22) * sc, k: 0.42 + (i % 3) * 0.1, th: i * 0.6,
      w: (0.9 + (i % 3) * 0.25) * (i % 2 ? -1 : 1)
    };
  };

  function moveTo(c, x, y, dur, curve = true, easeFn = ease.smooth) {
    const x0 = c.x, y0 = c.y, dx = x - x0, dy = y - y0, dist = Math.hypot(dx, dy) || 1;
    if (dur == null) dur = clamp(240 + dist * 0.65, 320, 1400);
    const bend = curve ? rand(-0.16, 0.16) * dist : 0;
    const cx = (x0 + x) / 2 + (-dy / dist) * bend, cy = (y0 + y) / 2 + (dx / dist) * bend;
    return tween(dur, (p) => {
      const q = 1 - p;
      c.x = q * q * x0 + 2 * q * p * cx + p * p * x;
      c.y = q * q * y0 + 2 * q * p * cy + p * p * y;
    }, easeFn, c);
  }

  async function pointAt(c, el, o = {}) {
    const r = R(el);
    if (!r.width || !r.height) return false;
    const x = clamp(r.left + r.width * (o.fx == null ? 0.5 : o.fx) + (o.dx || 0), 4, innerWidth - 4);
    const y = r.top + r.height * (o.fy == null ? 0.5 : o.fy) + (o.dy || 0);
    await moveTo(c, x, y, o.dur);
    return true;
  }

  function click(c) {
    const r = mk('i', 'ag-rip', layer);
    r.style.setProperty('--c', c.color);
    r.style.left = c.rx + 'px';
    r.style.top = c.ry + 'px';
    setTimeout(() => r.remove(), 650);
    c.el.classList.add('is-press');
    setTimeout(() => c.el.classList.remove('is-press'), 130);
    return wait(60);
  }

  function hint(c, text, ms = 800) {
    const h = mk('div', 'ag-hint', layer);
    h.textContent = text;
    h.style.left = clamp(c.rx + 16, 8, innerWidth - 90) + 'px';
    h.style.top = Math.max(8, c.ry - 34) + 'px';
    requestAnimationFrame(() => h.classList.add('is-on'));
    setTimeout(() => { h.classList.remove('is-on'); setTimeout(() => h.remove(), 320); }, ms);
  }

  /* ---------- reveal helpers ---------- */
  const show = (el) => { if (!el) return; el.classList.remove('ag-hide'); hidden.delete(el); };

  const FX = {
    pop: [{ opacity: 0, transform: 'translateY(14px) scale(.95)' }, { opacity: 1, transform: 'none' }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
    wipeX: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]
  };

  function anim(el, frames, o = {}) {
    if (skipped || !el || !el.animate) return Promise.resolve();
    const opts = Object.assign({ easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards', duration: 480 }, o);
    opts.duration = opts.duration / speed();
    const a = el.animate(frames, opts);
    return a.finished.catch(() => {});
  }

  const pop = (el, ms = 420) => { show(el); return anim(el, FX.pop, { duration: ms }); };
  const line = (h) => { if (h) h.classList.add('ag-line'); };

  async function popAt(c, el, gap = 45) {
    if (!el) return;
    const r = R(el);
    if (skipped || !r.width || !r.height) { show(el); return; }
    await pointAt(c, el, { dur: 240 });
    click(c);
    pop(el);
    await wait(gap);
  }

  async function popEach(c, els, gap = 45) {
    for (const el of els) await popAt(c, el, gap);
  }

  function scanReveal(el, color, dur = 900) {
    const r = R(el);
    show(el);
    const ln = mk('div', 'ag-scan', layer);
    ln.style.setProperty('--c', color);
    ln.style.left = r.left + 'px';
    ln.style.width = r.width + 'px';
    ln.style.top = r.top + 'px';
    /* clip-path only (no filter): cheap to paint, so the wipe stays smooth even on large images. Linear, so the clip edge and scan line never part. */
    const a = anim(el, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: dur, easing: 'linear' });
    const b = tween(dur, (p) => { ln.style.top = (r.top + r.height * p) + 'px'; ln.style.opacity = String(1 - p * p); }, ease.lin);
    return Promise.all([a, b]).then(() => ln.remove());
  }

  /* ---------- pen tool: strokes of an SVG icon are drawn one by one, the cursor rides the pen tip ---------- */
  const finishPen = (e) => {
    e.style.strokeDasharray = '';
    e.style.strokeDashoffset = '';
    if (!e.getAttribute('style')) e.removeAttribute('style');
    pens.delete(e);
  };

  function penDraw(c, svg) {
    const shapes = $$('path, rect, circle, line, ellipse, polyline, polygon', svg).filter((e) => e.getTotalLength);
    if (!shapes.length) { show(svg); return Promise.resolve(); }
    const lens = shapes.map((e) => e.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    const cum = [0];
    lens.forEach((l, i) => cum.push(cum[i] + l / total));
    shapes.forEach((e, i) => {
      e.style.strokeDasharray = lens[i] + ' ' + lens[i];
      e.style.strokeDashoffset = String(lens[i]);
      pens.add(e);
    });
    show(svg);
    const locate = (p) => {
      let i = 0;
      while (i < shapes.length - 1 && p > cum[i + 1]) i++;
      return { i, local: clamp((p - cum[i]) / ((cum[i + 1] - cum[i]) || 1), 0, 1) };
    };
    return tween(clamp(total * 26, 1100, 2400), (p) => {
      for (let i = 0; i < shapes.length; i++) {
        const local = clamp((p - cum[i]) / ((cum[i + 1] - cum[i]) || 1), 0, 1);
        shapes[i].style.strokeDashoffset = String(lens[i] * (1 - local));
      }
    }, ease.smooth, c, (p) => {
      if (skipped) return;
      const { i, local } = locate(p);
      const pt = shapes[i].getPointAtLength(lens[i] * local);
      const m = shapes[i].getScreenCTM();
      if (m) { c.x = m.a * pt.x + m.c * pt.y + m.e; c.y = m.b * pt.x + m.d * pt.y + m.f + window.scrollY; }
    }).then(() => shapes.forEach(finishPen));
  }

  /* ---------- selection boxes (drag, handles, alignment guides, size read-out) ---------- */
  function clipRect(r, o = {}) {
    const s = window.scrollY;
    const top = s + (o.top ? 0 : HEADER_H);
    const bottom = s + innerHeight - SAFE();
    const l = Math.max(r.left, 0), rr = Math.min(r.left + r.width, innerWidth);
    const t = Math.max(r.top, top), b = Math.min(r.top + r.height, bottom);
    return { left: l, top: t, width: Math.max(0, rr - l), height: Math.max(0, b - t) };
  }

  function makeSel(c, r, guides, small) {
    const box = mk('div', 'ag-sel', layer);
    box.style.setProperty('--c', c.color);
    box.style.left = r.left + 'px';
    box.style.top = r.top + 'px';
    if (small) box.classList.add('is-sm');
    for (let i = 0; i < 8; i++) mk('i', '', box);
    if (guides && !small) for (let i = 0; i < 4; i++) mk('s', '', box);
    const dim = mk('b', '', box);
    if (r.top < 30) box.classList.add('is-lbl-in');
    return { box, dim };
  }

  async function dragSelect(c, rect, o = {}) {
    const r = clipRect(rect, o);
    if (r.width < 6 || r.height < 6) return null;
    await moveTo(c, r.left, r.top);
    await wait(70);                                 // mouse down
    const { box, dim } = makeSel(c, r, true, !!o.small);
    box.style.width = '0px';
    box.style.height = '0px';
    c.soft = false;                                 // the cursor tip must stay glued to the box corner
    c.el.classList.add('is-press');
    await tween(o.dur || 700, (p) => {
      const w = r.width * p, h = r.height * p;
      box.style.width = w + 'px';
      box.style.height = h + 'px';
      c.x = r.left + w;
      c.y = r.top + h;
      dim.textContent = Math.round(w) + ' × ' + Math.round(h);
    }, ease.smooth, c);
    c.soft = true;
    c.el.classList.remove('is-press');
    await wait(60);                                 // mouse up
    return box;
  }

  function selectBox(c, rect) {
    const r = { left: rect.left - 3, top: rect.top - 3, width: rect.width + 6, height: rect.height + 6 };
    const { box, dim } = makeSel(c, r, false);
    box.style.width = r.width + 'px';
    box.style.height = r.height + 'px';
    dim.textContent = Math.round(rect.width) + ' × ' + Math.round(rect.height);
    return box;
  }

  function finishSel(box) {
    if (!box) return;
    box.classList.add('is-out');
    setTimeout(() => box.remove(), 380);
  }

  /* ---------- text tool ----------
     A cursor drags a text frame over the spot, then types into it, one character at a time. Untyped text stays in place
     but invisible, so the layout never moves while it is typed. Long texts are split between idle cursors that type
     their own segments at the same time; groups of small items (nav links, tags, labels) are shared the same way. */
  const textNodesOf = (el) => {
    const w = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const out = [];
    let n;
    while ((n = w.nextNode())) if (/\S/.test(n.nodeValue)) out.push(n);
    return out;
  };

  function prepNodes(nodes) {
    return nodes.map((node) => {
      const full = node.nodeValue;
      const rest = doc.createElement('span');
      rest.className = 'ag-rest';
      rest.textContent = full;
      node.nodeValue = '';
      node.parentNode.insertBefore(rest, node.nextSibling);
      return { n: node, rest, full, len: full.length, t: -1 };
    });
  }

  function finishType(entry) {
    entry.parts.forEach((p) => { p.n.nodeValue = p.full; p.rest.remove(); });
    if (entry.caret) entry.caret.remove();
  }

  /* k contiguous groups of text nodes of similar length, cut at word boundaries (text nodes are split with splitText) */
  function splitNodes(nodes, k) {
    const total = nodes.reduce((s, n) => s + n.nodeValue.length, 0);
    const groups = Array.from({ length: k }, () => []);
    const target = (i) => Math.round((total * (i + 1)) / k);
    const todo = nodes.slice();
    let g = 0, acc = 0;
    while (todo.length) {
      const node = todo.shift();
      const text = node.nodeValue;
      if (g < k - 1 && acc + text.length > target(g)) {
        const sp = text.indexOf(' ', Math.max(0, target(g) - acc));
        const cut = sp === -1 ? text.length : sp + 1;
        if (cut < text.length) {
          const tail = node.splitText(cut);
          groups[g].push(node);
          acc += cut;
          g++;
          todo.unshift(tail);
          continue;
        }
        groups[g].push(node);
        acc += text.length;
        g++;
        continue;
      }
      groups[g].push(node);
      acc += text.length;
    }
    return groups.filter((x) => x.length);
  }

  async function typeParts(c, parts, cps) {
    const total = parts.reduce((s, p) => s + p.len, 0);
    if (!total) return;
    const caret = c ? mk('i', 'ag-caret') : null;
    if (caret) caret.style.setProperty('--ag-c', c.color);
    const entry = { parts, caret };
    typing.add(entry);
    if (window.__sbTyped) parts.forEach((p) => window.__sbTyped.add(p.n.parentElement));      // opt-in diagnostics
    const hRec = window.__sbH ? parts[0].n.parentElement.closest('h1,h2,h3,h4,p,dt,dd,li,a,span,div') : null;      // opt-in diagnostics: element height at every frame
    let cur = -1;
    const dur = clamp((total / cps) * 1000, 130, 4200);
    await tween(dur, (p) => {
      let left = Math.floor(total * p), idx = -1;
      parts.forEach((pt, i) => {
        const take = clamp(left, 0, pt.len);
        if (pt.t !== take) { pt.n.nodeValue = pt.full.slice(0, take); pt.rest.textContent = pt.full.slice(take); pt.t = take; }
        if (idx < 0 && take < pt.len) idx = i;
        left -= take;
      });
      if (idx < 0) idx = parts.length - 1;
      if (hRec) window.__sbH.push([hRec, hRec.offsetHeight]);
      if (caret && idx !== cur) { cur = idx; parts[idx].rest.parentNode.insertBefore(caret, parts[idx].rest); }
    }, ease.lin, c || undefined, c ? () => {
      if (skipped) return;
      const cr = caret.getBoundingClientRect();
      if (cr.width || cr.height) {
        const nx = cr.right + 5, ny = cr.bottom - 1 + window.scrollY;
        if (Math.abs(ny - c.y) > 12 && Math.abs(nx - c.x) > 60) c.softUntil = performance.now() + 500;   // new line: sweep back softly
        c.x = nx; c.y = ny;
      }
    } : undefined);
    finishType(entry);
    typing.delete(entry);
  }

  const unionOf = (rects) => {
    let l = Infinity, t2 = Infinity, r = -Infinity, b = -Infinity;
    rects.forEach((q) => { if (!q.width && !q.height) return; l = Math.min(l, q.left); t2 = Math.min(t2, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
    return isFinite(l) ? { left: l, top: t2, width: r - l, height: b - t2 } : { left: 0, top: 0, width: 0, height: 0 };
  };

  async function frameBox(c, r, o = {}) {
    const rect = { left: r.left - 2, top: r.top - 2, width: r.width + 4, height: r.height + 4 };
    const small = rect.width < 170 || rect.height < 34;
    const dur = clamp(220 + Math.hypot(rect.width, rect.height) * 0.42, 280, 900);
    return dragSelect(c, rect, { dur, small, top: o.top });
  }

  /* one cursor writes one run of text nodes (a whole element, or its own segment of it) */
  async function writeSeg(c, el, parts, cps, o, whole) {
    let box = null;
    const rect = whole ? R(el) : unionOf(parts.map((p) => R(p.rest)));
    const sr = parts.length ? parts[0].rest.getClientRects()[0] : null;
    const sx = clamp((sr ? sr.left : rect.left) + 3, 4, innerWidth - 4);
    const sy = sr ? sr.top + window.scrollY + Math.min(sr.height, 28) * 0.7 : rect.top + Math.min(rect.height, 28) * 0.7;
    if (c && !o.noBox) {
      box = await frameBox(c, rect, o);
      if (Math.hypot(sx - c.x, sy - c.y) > 90) await moveTo(c, sx, sy);        // click into the frame, at the start of the text
      click(c);
    } else if (c && !o.noMove) {
      await moveTo(c, sx, sy);
      click(c);
    }
    show(el);
    if (o.fx && whole) anim(el, o.fx, { duration: 380 });
    await typeParts(c, parts, cps);
    finishSel(box);
  }

  async function write(c, el, cps = 200, o = {}) {
    if (!el) return;
    const nodes = textNodesOf(el);
    const total = nodes.reduce((s, n) => s + n.nodeValue.length, 0);
    if (!total) { show(el); return; }
    let crew = [c], groups = [nodes], helpers = [];
    const want = c && !o.solo ? Math.min(4, Math.floor(total / 90)) : 0;
    if (want) {
      helpers = borrow(want, c);
      if (helpers.length) {
        groups = splitNodes(nodes, helpers.length + 1);
        helpers.slice(groups.length - 1).forEach(giveBack);          // not enough text for everyone: return the extras
        helpers = helpers.slice(0, groups.length - 1);
        crew = [c, ...helpers];
        if (groups.length > 1) splitEls.add(el);
      }
    }
    const partsList = groups.map(prepNodes);                          // all text is hidden before anyone reveals the element
    const whole = groups.length === 1;
    await Promise.all(crew.map((cu, i) => writeSeg(cu, el, partsList[i], cps, o, whole)));
    if (!whole) { el.normalize(); splitEls.delete(el); }
    helpers.forEach(giveBack);
  }

  /* idle cursors can be lent to a job; they are handed back (and the scheduler woken) when it is done with them */
  function borrow(n, near) {
    const got = [];
    for (let i = 0; i < n && idlePool.length; i++) {
      let best = 0, bd = Infinity;
      idlePool.forEach((x, k) => { const d = Math.abs(x.y - near.y); if (d < bd) { bd = d; best = k; } });
      const h = idlePool.splice(best, 1)[0];
      h.token++;
      appear(h, near.x + rand(-80, 80), near.y + rand(-50, 50));
      got.push(h);
    }
    return got;
  }

  function giveBack(h) {
    h.idleSince = performance.now();
    idlePool.push(h);
    wakeSched();
  }

  /* A cursor that was dismissed fades back in next to where it is needed */
  function appear(c, x, y) {
    if (!c.parked) return;
    c.parked = false;
    c.x = c.rx = clamp(x, 10, innerWidth - 10);
    c.y = c.ry = y;
    c.vx = c.vy = 0;
    c.el.classList.add('is-in');
  }

  function dismiss(c) {
    c.parked = true;
    c.token++;
    c.el.classList.remove('is-in');
  }

  /* shares a list of items between this cursor and idle ones: everyone takes the next item from the same pile, and the lead
     cursor keeps checking whether another cursor has become free, so help arrives as soon as it is available */
  async function fanOut(c, items, fn, max = 4) {
    const todo = items.slice();
    const running = [];
    let crew = 1;
    const work = async (cu) => { while (todo.length) await fn(cu, todo.shift()); };
    const recruit = () => {
      while (todo.length > 1 && crew < max) {
        const got = borrow(1, c);
        if (!got.length) break;
        crew++;
        running.push(work(got[0]).finally(() => { crew--; giveBack(got[0]); }));
      }
    };
    while (todo.length) {
      recruit();
      await fn(c, todo.shift());
    }
    await Promise.all(running);
  }

  /* ---------- copy & paste (a ghost carried by the cursor) ---------- */
  async function ghostMove(c, fr, tr, label) {
    const g = mk('div', 'ag-ghost', layer);
    g.style.setProperty('--c', c.color);
    g.textContent = label || '';
    const dist = Math.hypot(tr.left - fr.left, tr.top - fr.top);
    await moveTo(c, fr.left + fr.width / 2, fr.top + fr.height / 2);       // pick the copy up from its centre
    hint(c, KEY + 'V', 1100);
    c.soft = false;
    await tween(clamp(700 + dist * 0.55, 800, 1700), (p) => {
      const L = fr.left + (tr.left - fr.left) * p, T = fr.top + (tr.top - fr.top) * p;
      const W = fr.width + (tr.width - fr.width) * p, Hh = fr.height + (tr.height - fr.height) * p;
      g.style.left = L + 'px'; g.style.top = T + 'px'; g.style.width = W + 'px'; g.style.height = Hh + 'px';
      c.x = L + W / 2; c.y = T + Hh / 2;
    }, ease.inOut, c);
    c.soft = true;
    g.classList.add('is-out');
    setTimeout(() => g.remove(), 380);
  }

  async function copyChip(c, src, dst) {
    const sel = selectBox(c, R(src));
    await pointAt(c, src);
    click(c);
    hint(c, KEY + 'C');
    await wait(260);
    await ghostMove(c, R(src), R(dst), src.textContent.trim());
    await write(c, dst, 40, { noBox: true, noMove: true, fx: FX.pop, solo: true });
    finishSel(sel);
  }

  async function pasteBlock(c, from, to, label) {
    let fr = R(from);
    const tr = R(to);
    const s = window.scrollY;
    const visible = fr.bottom - s > HEADER_H + 30 && fr.top - s < innerHeight - SAFE();
    if (visible) {
      const sel = selectBox(c, fr);
      await moveTo(c, fr.left + fr.width / 2, fr.top + fr.height / 2);
      await click(c);
      hint(c, KEY + 'C');
      await wait(400);
      finishSel(sel);
    } else {
      fr = { left: tr.left, top: s + HEADER_H - fr.height * 0.55, width: tr.width, height: tr.height };
    }
    await ghostMove(c, { left: fr.left, top: fr.top, width: fr.width, height: fr.height }, tr, label);
    show(to);
    anim(to, FX.fade, { duration: 380 });
  }

  /* ---------- composite builders ---------- */
  async function buildCard(c, card, from, job) {
    const p = cardParts.get(card);
    if (from) {
      await pasteBlock(c, from, card, 'project card');
    } else {
      const box = await dragSelect(c, R(card), { dur: 450 });
      show(card);
      anim(card, FX.fade, { duration: 350 });
      finishSel(box);
    }
    if (job) job.ready = true;
    if (p.wrap) scanReveal(p.wrap, c.color, 700);          // the "assets" pass paints the image while the copy is typed
    await write(c, p.h3, 150);
    await write(c, p.meta, 190);
    await write(c, p.p, 300);
    await fanOut(c, p.tags, (cu, li) => write(cu, li, 70, { fx: FX.pop, solo: true }), 3);
  }

  async function buildService(c, card, from, job) {
    const p = svcParts.get(card);
    if (from) {
      await pasteBlock(c, from, card, 'service card');
    } else {
      const box = await dragSelect(c, R(card), { dur: 450 });
      show(card);
      anim(card, FX.fade, { duration: 350 });
      finishSel(box);
    }
    if (job) job.ready = true;
    pop(p.icon);
    if (p.svg) {
      await pointAt(c, p.svg, { dur: 240 });
      await penDraw(c, p.svg);
    }
    await write(c, p.h3, 140);
    await write(c, p.p, 280);
    await fanOut(c, p.tags, (cu, li) => write(cu, li, 70, { fx: FX.pop, solo: true }), 3);
  }

  /* ---------- work selection ---------- */
  const unionRect = (els) => {
    let tp = Infinity, bt = -Infinity;
    els.forEach((e) => {
      const r = R(e);
      if (!r.width && !r.height) return;
      tp = Math.min(tp, r.top); bt = Math.max(bt, r.bottom);
    });
    return { top: tp, bottom: bt };
  };

  /* A job may start as soon as its top is on screen or within a third of a screen below it: the camera is gliding that way anyway,
     so cursors are busy on everything near the screen instead of waiting for the camera to arrive. */
  function startable(job) {
    if (job.fixed) return true;
    const u = unionRect(job.els);
    if (!isFinite(u.top)) return true;
    return u.top < window.scrollY + innerHeight - SAFE() + 0.33 * innerHeight;
  }

  /* the camera keeps the earliest unfinished work a little below the header */
  function updateCamTarget() {
    const j = jobs.find((x) => !x.done && !x.fixed);
    if (!j) return;
    const u = unionRect(j.els);
    if (isFinite(u.top)) cam.target = Math.max(0, u.top - (HEADER_H + 0.16 * innerHeight));
  }

  /* ---------- the page, as a list of build jobs ---------- */
  function defineJobs() {
    const J = [];
    const H = (x) => { (Array.isArray(x) ? x : [x]).forEach((e) => { if (e) hidden.add(e); }); return x; };
    const add = (id, log, els, run, o = {}) => {
      const j = Object.assign({ id, log, els: els.filter(Boolean), run, deps: [], done: false }, o);
      J.push(j);
      return j;
    };
    const head = (id, log, h, p, shell) => add(id, log, [h, p], async (c) => {
      if (shell) shell.classList.add('ag-shell');
      await write(c, h, 150); line(h);
      await write(c, p, 260);
    });

    /* header: the bar first, then its texts are written by several cursors at once */
    const header = $('.header');
    if (header) shells.push(header);
    const bMark = H($('.brand__mark')), bName = H($('.brand__name'));
    const navA = H($$('.nav a')), actions = H($$('.header__actions .icon-btn'));
    let headerJob = null;
    if (header) {
      headerJob = add('header', 'drafting the sticky header', [header], async (c, job) => {
        const box = await dragSelect(c, R(header), { dur: 420, top: true });
        header.classList.add('ag-shell');
        anim(header, FX.wipeX, { duration: 500 });
        finishSel(box);
        job.ready = true;
        await popEach(c, actions, 50);
      }, { fixed: true });
    }


    /* hero */
    const hello = H($('.hero__hello')), title = H($('.hero__title')), role = H($('.hero__role')), lead = H($('.hero__lead'));
    const btns = H($$('.hero__cta .btn')), linkAs = H($$('.hero__links a'));
    const photo = H($('.hero__photo')), pimg = H($('.hero__photo img')), chips = H($$('.hero__photo .chip'));
    add('hero-a', 'writing the hero headline', [hello, title], async (c) => {
      await write(c, hello, 90);
      await write(c, title, 130);
    });
    add('hero-b', 'setting the role line + intro', [role, lead], async (c) => {
      const prompt = $('.prompt', role);
      await pointAt(c, role, { fx: 0.1 });
      click(c);
      const pp = prompt ? prepNodes(textNodesOf(prompt)) : [];
      show(role);
      anim(role, FX.wipeX, { duration: 450 });
      await typeParts(c, pp, 30);
      ctx.startTypewriter();
      await write(c, lead, 230);
    });
    add('hero-cta', 'writing the calls to action', [...btns, ...linkAs], async (c) => {
      await fanOut(c, btns, (cu, b) => write(cu, b, 80, { fx: FX.pop, solo: true }), 2);
      await fanOut(c, linkAs, (cu, a) => write(cu, a, 80, { solo: true }), 3);
    });
    const photoJob = add('hero-photo', 'rendering the portrait + tech chips', [photo], async (c, job) => {
      const box = await dragSelect(c, R(pimg), { dur: 420 });
      show(photo);
      anim(photo, FX.fade, { duration: 400 });
      await scanReveal(pimg, c.color, 650);
      finishSel(box);
      if (chips.length) await write(c, chips[0], 40, { fx: FX.pop, solo: true });
      job.ready = true;
    });
    if (header) {
      add('header-brand', 'writing the brand', [header], async (c) => {
        await write(c, bMark, 40, { top: true, solo: true });
        await write(c, bName, 100, { top: true, solo: true });
      }, { fixed: true, deps: [headerJob] });
      add('header-nav', 'writing the navigation', [header], async (c) => {
        if (small()) { navA.forEach((a) => show(a)); return; }
        await fanOut(c, navA, (cu, a) => write(cu, a, 90, { top: true, solo: true }), 3);
      }, { fixed: true, deps: [headerJob] });
    }

    chips.slice(1).forEach((chip, i) => {
      add('hero-chip-' + (i + 1), 'pasting a tech chip', [chip], (c) => copyChip(c, chips[0], chip), { deps: [photoJob] });
    });

    /* tech strip */
    const marquee = H($('.marquee')), mTrack = $('.marquee__track');
    if (marquee) add('marquee', 'filling the tech marquee', [marquee], async (c) => {
      const box = await dragSelect(c, R(marquee), { dur: 380 });
      const pp = mTrack ? prepNodes(textNodesOf(mTrack)) : [];
      show(marquee);
      await Promise.all([anim(marquee, FX.wipeX, { duration: 550 }), typeParts(c, pp, 520)]);
      finishSel(box);
    });

    /* about */
    const aPhoto = H($('.about__photo')), aH2 = H($('.about__body h2')), aP = H($$('.about__body > p'));
    const facts = H($('.facts')), factRows = H($$('.facts > div')), factTexts = H($$('.facts dt, .facts dd'));
    if (aPhoto) add('about-photo', 'placing the about photo', [aPhoto], async (c) => {
      const img = $('img', aPhoto) || aPhoto;
      const box = await dragSelect(c, R(img), { dur: 380 });
      await scanReveal(aPhoto, c.color, 650);
      finishSel(box);
    });
    add('about-h2', 'writing the about heading', [aH2], async (c) => { await write(c, aH2, 140); line(aH2); });
    aP.forEach((p, i) => add('about-p' + i, 'writing the about copy', [p], (c) => write(c, p, 230)));
    if (facts) add('about-facts', 'building the facts list', [facts], async (c) => {
      show(facts);
      anim(facts, FX.wipeX, { duration: 400 });
      factRows.forEach((row, i) => setTimeout(() => { show(row); anim(row, FX.wipeX, { duration: 300 }); }, i * 90));
      await fanOut(c, factTexts, (cu, e) => write(cu, e, e.tagName === 'DT' ? 70 : 120, { solo: true }), 4);
    });

    /* at a glance: counters */
    const stats = $('.stats');
    if (stats) shells.push(stats);
    $$('.stat').forEach((st, i) => {
      const num = H($('.stat__num', st)), label = H($('.stat__label', st));
      add('stat-' + i, i ? 'counting up' : 'drafting the highlights band', [st], async (c) => {
        if (stats) stats.classList.add('ag-shell');
        await pointAt(c, num, { dur: 300 });
        click(c);
        show(num);
        anim(num, FX.pop, { duration: 380 });
        if (ctx.countUp) ctx.countUp(num, 1200 / speed());          // the number counts on its own; the cursor does not wait for it
        await write(c, label, 110, { solo: true });
      });
    });

    /* services */
    const svH2 = H($('#services .section__head h2')), svP = H($('#services .section__head p'));
    if (svH2) head('services-head', 'outlining the services', svH2, svP);
    const svcs = $$('.service');
    svcs.forEach((card) => {
      H(card);
      const p = { icon: $('.service__icon', card), svg: $('.service__icon svg', card), h3: $('h3', card), p: $('p', card), tags: $$('.tags li', card) };
      H([p.icon, p.svg, p.h3, p.p, ...p.tags]);
      svcParts.set(card, p);
    });
    let firstSvc = null;
    svcs.forEach((card, i) => {
      const j = add('svc-' + i, i ? 'pasting a service card' : 'building a service card', [card],
        (c, job) => buildService(c, card, i ? svcs[0] : null, job), firstSvc ? { deps: [firstSvc] } : {});
      if (!i) firstSvc = j;
    });

    /* process */
    const subH3 = H($('.section__head--sub h3')), subP = H($('.section__head--sub p'));
    if (subH3) add('steps-head', 'outlining the process', [subH3, subP], async (c) => {
      await write(c, subH3, 140);
      await write(c, subP, 260);
    });
    const wrap = $('.steps-wrap'), sLine = H($('.steps__line')), nums = H($$('.step__num')), sh4 = H($$('.step h4')), sp = H($$('.step p'));
    const stepLis = H($$('.step'));       // on phones each step also paints its own connector
    if (wrap && sLine) {
      const lineJob = add('steps-line', 'drawing the process line', [wrap], async (c, job) => {
        const numParts = nums.map((n) => prepNodes(textNodesOf(n)));            // badge numbers are typed as the line reaches them
        const badge = (i) => { pop(nums[i], 380); typeParts(null, numParts[i], 30); };
        const lr = R(sLine);
        if (!lr.width && !lr.height) {                       // phone layout: connectors belong to the steps, so grow them one by one
          for (let i = 0; i < nums.length; i++) {
            await pointAt(c, nums[i], { dur: 320 });
            click(c);
            show(stepLis[i]);
            anim(stepLis[i], FX.fade, { duration: 350 });
            badge(i);
            await wait(120);
          }
          job.ready = true;
          return;
        }
        const horiz = lr.width >= lr.height;
        const a0 = horiz ? { x: lr.left, y: lr.top + lr.height / 2 } : { x: lr.left + lr.width / 2, y: lr.top };
        const a1 = horiz ? { x: lr.right, y: a0.y } : { x: a0.x, y: lr.bottom };
        const at = nums.map((n) => {
          const r = R(n);
          return horiz ? (r.left + r.width / 2 - a0.x) / ((a1.x - a0.x) || 1) : (r.top + r.height / 2 - a0.y) / ((a1.y - a0.y) || 1);
        });
        await moveTo(c, a0.x, a0.y);
        click(c);
        /* the line is revealed from the very same value that moves the cursor, so its tip and the pen can never drift apart */
        const clip = (p) => (horiz ? 'inset(0 ' + ((1 - p) * 100).toFixed(3) + '% 0 0)' : 'inset(0 0 ' + ((1 - p) * 100).toFixed(3) + '% 0)');
        sLine.style.clipPath = clip(0);
        show(sLine);
        stepLis.forEach((li) => show(li));
        const popped = new Set();
        c.soft = false;
        await tween(2200, (p) => {
          c.x = a0.x + (a1.x - a0.x) * p;
          c.y = a0.y + (a1.y - a0.y) * p;
          sLine.style.clipPath = clip(p);
          at.forEach((tt, i) => { if (!popped.has(i) && p >= tt - 0.02) { popped.add(i); badge(i); } });
        }, ease.smooth, c);
        c.soft = true;
        sLine.style.clipPath = '';
        if (!sLine.getAttribute('style')) sLine.removeAttribute('style');
        nums.forEach((n, i) => { if (!popped.has(i)) badge(i); });
        job.ready = true;
      });
      $$('.step').forEach((li, i) => {
        add('step-' + i, 'writing step ' + (i + 1), [li], async (c) => {
          await write(c, sh4[i], 110);
          await write(c, sp[i], 250);
        }, { deps: [lineJob] });
      });
    }

    /* work */
    const work = $('#work');
    if (work) shells.push(work);
    const wH2 = H($('#work .section__head h2')), wP = H($('#work .section__head p'));
    head('work-head', 'drafting the work section', wH2, wP, work);
    const regCard = (card) => {
      H(card);
      const p = { wrap: $('.featured__img, .project__img', card), h3: $('h3', card), meta: $('.meta', card), p: $('p:not(.meta)', card), tags: $$('.tags li', card) };
      H([p.wrap, p.h3, p.meta, p.p, ...p.tags]);
      cardParts.set(card, p);
    };
    const featured = $('.featured');
    if (featured) { regCard(featured); add('work-featured', 'building the featured project', [featured], (c, job) => buildCard(c, featured, null, job)); }
    const projects = $$('.project');
    projects.forEach(regCard);
    let firstCard = null;
    projects.forEach((card, i) => {
      const j = add('work-p' + i, i ? 'pasting a project card' : 'building a project card', [card],
        (c, job) => buildCard(c, card, i ? projects[0] : null, job), firstCard ? { deps: [firstCard] } : {});
      if (!i) firstCard = j;
    });

    /* skills */
    const sH2 = H($('#skills .section__head h2')), sP = H($('#skills .section__head p'));
    head('skills-head', 'listing the skills', sH2, sP);
    $$('.skills__group').forEach((g) => {
      H(g);
      const h3 = H($('h3', g)), tg = H($$('.tags li', g));
      const name = h3 ? h3.textContent.trim().toLowerCase() : 'skills';
      add('skills-' + name, 'tagging ' + name, [g], async (c) => {
        show(g);
        await write(c, h3, 90, { solo: true });
        await fanOut(c, tg, (cu, li) => write(cu, li, 70, { fx: FX.pop, solo: true }), 3);
      });
    });

    /* background */
    const bgSec = $('#background');
    if (bgSec) shells.push(bgSec);
    const bH2 = H($('#background .section__head h2')), rows = H($('.rows'));
    add('bg-head', 'writing the background', [bH2], async (c) => {
      bgSec.classList.add('ag-shell');
      await write(c, bH2, 150); line(bH2);
      show(rows);
      anim(rows, FX.wipeX, { duration: 400 });
    });
    $$('.row').forEach((row, i) => {
      H(row);
      const rt = H($('.row__title', row)), rb = H($('.row__body', row));
      add('bg-row-' + i, 'filling a timeline row', [row], async (c) => {
        show(row);
        anim(row, FX.wipeX, { duration: 400 });
        await write(c, rt, 120);
        await write(c, rb, 250);
      });
    });

    /* contact */
    const cH2 = H($('.contact__intro h2')), cP = H($('.contact__intro h2 + p')), mail = H($('.contact__mail')), cLinks = H($$('.contact__links a'));
    add('contact-a', 'writing the contact copy', [cH2, cP, mail, ...cLinks], async (c) => {
      await write(c, cH2, 150); line(cH2);
      await write(c, cP, 240);
      await write(c, mail, 130, { solo: true });
      await fanOut(c, cLinks, (cu, a) => write(cu, a, 80, { solo: true }), 3);
    });
    const form = H($('.form')), labels = H($$('.form .field label')), inputs = H($$('.form .field input, .form .field textarea')), sbtn = H($('.form .btn'));
    if (form) add('contact-form', 'wiring up the contact form', [form], async (c) => {
      const box = await dragSelect(c, R(form), { dur: 420 });
      show(form);
      anim(form, FX.fade, { duration: 350 });
      finishSel(box);
      await fanOut(c, $$('.form .field'), async (cu, f) => {
        await write(cu, $('label', f), 70, { solo: true });
        await popAt(cu, $('input, textarea', f), 40);
      }, 3);
      await write(c, sbtn, 70, { fx: FX.pop, solo: true });
    });

    /* footer */
    const footer = H($('.footer')), fP = H($('.footer p')), fA = H($$('.footer a'));
    if (footer) add('footer', 'shipping the footer', [footer], async (c) => {
      const box = await dragSelect(c, R(footer), { dur: 380 });
      show(footer);
      await anim(footer, FX.wipeX, { duration: 450 });
      finishSel(box);
      await fanOut(c, [fP, ...fA], (cu, e) => write(cu, e, 110, { solo: true }), 3);
    });

    return J;
  }

  /* ---------- bar (live build status) ---------- */
  function buildBar() {
    bar = mk('div', 'ag-bar', doc.body);
    bar.innerHTML = '<span class="ag-bar__dot" aria-hidden="true"></span>' +
      '<span class="ag-bar__log" aria-hidden="true"></span>' +
      '<span class="ag-bar__time" aria-hidden="true">00:00</span>' +
      '<span class="ag-bar__pct" aria-hidden="true">0%</span>' +
      '<button class="ag-bar__skip" type="button" aria-label="Skip the intro animation">Skip <kbd>Esc</kbd></button>' +
      '<i class="ag-bar__fill" aria-hidden="true"></i>';
    barLog = $('.ag-bar__log', bar);
    barTime = $('.ag-bar__time', bar);
    barPct = $('.ag-bar__pct', bar);
    barFill = $('.ag-bar__fill', bar);
    $('.ag-bar__skip', bar).addEventListener('click', () => skip());
  }

  function setLog(c, text) {
    if (!barLog) return;
    barLog.textContent = '';
    if (c) {
      const b = mk('b', '', barLog);
      b.textContent = c.name;
      b.style.color = c.color;
    }
    barLog.appendChild(doc.createTextNode((c ? ' › ' : '') + text));
  }

  function setProgress() {
    if (!jobs.length) return;
    const pct = Math.round((doneCount / jobs.length) * 100);
    barPct.textContent = pct + '%';
    barFill.style.width = pct + '%';
  }

  /* ---------- scheduler: cursors pick up jobs that are on screen, the camera scrolls when nothing is ---------- */
  /* No cursor ever wanders without a task: a free cursor either takes a job that is on or near the screen, or is lent to a job that
     is running (it types part of its text), or, if there is truly nothing to do for a moment, it leaves and fades back in when needed. */
  async function runJob(job, c) {
    c.token++;
    const u = unionRect(job.els);
    if (c.parked) appear(c, innerWidth / 2 + rand(-200, 200), (isFinite(u.top) ? u.top : window.scrollY + 200) - 60);
    setLog(c, job.log);
    const began = performance.now();
    try { await job.run(c, job); } catch (e) { console.warn('[intro]', job.id, e); }
    if (window.__sbTrace) window.__sbTrace.push([job.id, c.name, Math.round(began), Math.round(performance.now() - began), Math.round(window.scrollY)]);   // opt-in diagnostics
    job.done = true;
    doneCount++;
    setProgress();
  }

  async function schedule() {
    queue = jobs.slice();
    idlePool = cursors.slice();
    cursors.forEach((c) => { c.idleSince = performance.now(); });
    let running = 0, wakeUp = null, woke = false;
    const wake = () => { woke = true; if (wakeUp) { const r = wakeUp; wakeUp = null; r(); } };
    wakeSched = wake;
    const ready = (j) => !j.deps.some((d) => !(d.done || d.ready));
    cam.y = window.scrollY; cam.v = 0; cam.maxV = 700; cam.on = true;
    let lastCam = 0;

    while ((queue.length || running) && !skipped) {
      const now = performance.now();
      if (now - lastCam > 120) { lastCam = now; updateCamTarget(); }

      // start every job that is ready and on / near the screen (not only the first one: a job waiting for its dependency must not block the rest)
      for (let i = 0; i < queue.length && idlePool.length && !skipped; ) {
        const job = queue[i];
        if (!ready(job) || !startable(job)) { i++; continue; }
        queue.splice(i, 1);
        const u = unionRect(job.els);
        let best = 0, bd = Infinity;
        idlePool.forEach((c, k) => { const d = Math.abs(c.y - (isFinite(u.top) ? u.top : 0)); if (d < bd) { bd = d; best = k; } });
        const c = idlePool.splice(best, 1)[0];
        running++;
        runJob(job, c).finally(() => { running--; c.idleSince = performance.now(); idlePool.push(c); wake(); });
        await wait(rand(40, 110));
      }
      if (skipped) break;
      if (!queue.length && !running) break;

      // somebody has been free for a while and nothing is waiting for them: dismiss them
      const anyWaiting = queue.some((j) => ready(j) && startable(j));
      if (!anyWaiting) idlePool.forEach((c) => { if (!c.parked && now - c.idleSince > 350) dismiss(c); });

      if (!woke) {
        const tm = nap(120);
        await Promise.race([new Promise((r) => { wakeUp = r; }), tm]);
        tm.cancel();
      }
      woke = false;
    }
  }

  /* ---------- launch / chaos / finale ---------- */
  async function chaos(ms) {
    setLog(null, 'spawning ' + cursors.length + ' agents · planning layout…');
    cam.y = window.scrollY;
    const end = performance.now() + ms;
    await Promise.all(cursors.map(async (c) => {
      while (!skipped && performance.now() < end) {
        await moveTo(c, rand(30, innerWidth - 30), rand(30, innerHeight - 30), rand(300, 520), true, ease.smooth);
      }
    }));
  }

  async function finale() {
    const qa = cursors[cursors.length - 1];
    if (qa.parked) appear(qa, innerWidth / 2, window.scrollY + innerHeight / 2);
    setLog(qa, 'audit complete · layout ✓ a11y ✓ seo ✓ perf ✓');
    await wait(500);
    cursors.forEach((c) => { c.token++; });
    cam.target = 0; cam.maxV = 1500; cam.on = true;
    cursors.forEach((c, i) => setTimeout(() => c.el.classList.remove('is-in'), 150 * i));        // the agents sign off one by one while the page glides home
    const t1 = performance.now();
    while (!skipped && (Math.abs(window.scrollY) > 2 || Math.abs(cam.v) > 5) && performance.now() - t1 < 12000) await wait(80);
    cam.on = false;
    bar.classList.add('is-done');
    barPct.textContent = '100%';
    barFill.style.width = '100%';
    setLog(null, '✓ build complete · deployed to sb-sajal.github.io');
    await wait(1000);
    bar.classList.remove('is-on');
    await wait(350);
  }

  function revealAll() {
    typing.forEach(finishType);
    typing.clear();
    splitEls.forEach((el) => el.normalize());
    splitEls.clear();
    pens.forEach(finishPen);
    hidden.forEach((el) => el.classList.remove('ag-hide'));
    hidden.clear();
    shells.forEach((el) => el.classList.add('ag-shell'));
    $$('h2').forEach((h) => h.classList.add('ag-line'));
    if (ctx) {
      if (ctx.finishCounters) ctx.finishCounters();
      if (ctx.startTypewriter) ctx.startTypewriter();
    }
  }

  /* While the agents work the page must not move under their cursors: block every way of scrolling it. */
  const insideBar = (e) => !!(e.target && e.target.closest && e.target.closest('.ag-bar'));
  const stopScroll = (e) => { if (!insideBar(e) && e.cancelable) e.preventDefault(); };
  const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);
  const onKey = (e) => {
    if (e.key === 'Escape') { skip(); return; }
    if (SCROLL_KEYS.has(e.key) && !insideBar(e)) e.preventDefault();
  };
  const stopAnchor = (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
    if (a && !insideBar(e)) e.preventDefault();       // a nav click must not yank the page away from the agents
  };
  const lockScroll = (on) => {
    const m = on ? 'addEventListener' : 'removeEventListener';
    doc[m]('click', stopAnchor, true);
    doc[m]('wheel', stopScroll, { passive: false });
    doc[m]('touchmove', stopScroll, { passive: false });
    doc[m]('keydown', onKey);
  };

  function cleanup() {
    if (!alive) return;
    alive = false;
    cam.on = false;
    lockScroll(false);
    lazyImgs.forEach((i) => { i.loading = 'lazy'; });
    root.style.scrollBehavior = '';
    if (!root.getAttribute('style')) root.removeAttribute('style');
    window.scrollTo(0, 0);
    const gone = [layer, grid, bar];
    gone.forEach((e) => e && e.classList.add('is-gone'));
    setTimeout(() => gone.forEach((e) => e && e.remove()), 650);
  }

  function finish() {
    if (finished) return;
    finished = true;
    flushTweens();
    revealAll();
    cleanup();
    if (resolveDone) resolveDone();
  }

  async function run() {
    launched = true;
    if (skipped) return;
    mode = 'free';
    t0 = performance.now();
    grid.classList.add('is-on');
    bar.classList.add('is-on');
    await chaos(1300);
    await schedule();
    if (!skipped) await finale();
  }

  function launch() {
    return new Promise((resolve) => {
      resolveDone = resolve;
      run().catch((e) => console.warn('[intro]', e)).finally(finish);
    });
  }

  function skip() {
    if (skipped) return;
    skipped = true;
    cam.on = false;
    waiters.forEach((f) => f());
    flushTweens();
    revealAll();
    if (launched) setTimeout(finish, 700);   // normally the run loop unwinds on its own within a frame or two
  }

  /* ---------- public API ---------- */
  function init(c) {
    if (alive) return;
    ctx = c || {};
    alive = true;
    root.classList.add('intro-build');
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    $$('img[loading="lazy"]').forEach((i) => { lazyImgs.push(i); i.loading = 'eager'; });     // so images are ready when the agents reach them
    layer = mk('div', 'ag-layer', doc.body);
    layer.setAttribute('aria-hidden', 'true');
    grid = mk('div', 'ag-grid', doc.body);
    grid.setAttribute('aria-hidden', 'true');
    mark = $('.loader__mark');
    const hd = $('.header');
    if (hd && hd.offsetHeight) HEADER_H = hd.offsetHeight;
    buildBar();
    jobs = defineJobs();
    hidden.forEach((e) => e.classList.add('ag-hide'));
    const n = innerWidth < 700 ? 8 : innerWidth < 1100 ? 10 : 14;
    for (let i = 0; i < n; i++) cursors.push(makeCursor(i, n));
    cursors.forEach((cu, i) => setTimeout(() => cu.el.classList.add('is-in'), 150 + i * 70));
    const fit = () => { layer.style.height = Math.max(root.scrollHeight, innerHeight) + 'px'; };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(doc.body); else window.addEventListener('resize', fit);
    lockScroll(true);
    window.__sbSkip = skip;
    lastT = performance.now();
    requestAnimationFrame(tick);
  }

  window.SBIntro = { init, progress: (p) => { prog = clamp(p, 0, 1); }, launch, skip };
})();
