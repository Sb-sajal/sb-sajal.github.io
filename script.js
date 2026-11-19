/* Sajal Baiddya — portfolio. Small, dependency-free. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Typewriter (hero role) ---------- */
  const typedEl = $('#typed');
  const roles = ['Fullstack Web Developer', 'Flutter App Builder', 'Linux Enthusiast', 'Bot & Automation Maker', 'Mathematics Student'];
  let typerStarted = false;
  const startTypewriter = async () => {
    if (!typedEl || typerStarted) return;
    typerStarted = true;
    if (reduceMotion.matches) { typedEl.textContent = roles[0]; return; }
    typedEl.textContent = '';
    for (let i = 0; ; i = (i + 1) % roles.length) {
      const w = roles[i];
      for (let c = 1; c <= w.length; c++) { typedEl.textContent = w.slice(0, c); await sleep(65 + Math.random() * 45); }
      await sleep(1800);
      for (let c = w.length - 1; c >= 0; c--) { typedEl.textContent = w.slice(0, c); await sleep(32); }
      await sleep(380);
    }
  };

  /* ---------- Loader + first-visit intro ---------- */
  // First visit: loader with orbiting agent cursors, then intro.js builds the page live.
  // Return visits never see any of it: the head script marks <html> as "no-intro".
  const loader = $('#loader');
  window.__sbBoot = true;                          // tells the failsafe in <head> that this script is running
  const introMode = root.classList.contains('intro') && !!loader;

  const finishLoading = () => {                    // plain reveal (return visits, or if the intro could not run)
    root.classList.remove('is-loading', 'intro', 'intro-build');
    root.classList.add('is-ready');
    root.style.removeProperty('--sbw');
    if (!root.getAttribute('style')) root.removeAttribute('style');
    startTypewriter();
    if (loader) setTimeout(() => loader.remove(), reduceMotion.matches ? 0 : 1500);
  };
  const finishIntro = () => {                      // the page is built: hand control to the visitor
    root.classList.add('is-ready', 'intro-done');
    root.classList.remove('is-loading', 'intro', 'intro-build');
    startTypewriter();
    document.querySelectorAll('.ag-shell, .ag-line').forEach((el) => el.classList.remove('ag-shell', 'ag-line'));
    document.querySelectorAll('[class=""]').forEach((el) => el.removeAttribute('class'));
    root.style.removeProperty('--sbw');
    if (!root.getAttribute('style')) root.removeAttribute('style');     // leave the DOM exactly as the premade page has it
    if (loader) loader.remove();
    try { if (/[?&]intro\b/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  };

  // Resolves when the web fonts are in (or after maxMs, whichever comes first)
  const fontsSettled = (maxMs) => new Promise((resolve) => {
    const t0 = performance.now();
    const check = () => {
      if (window.__sbFonts || performance.now() - t0 > maxMs) {
        const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.race([ready, new Promise((r) => setTimeout(r, 800))]).then(resolve, resolve);
      } else setTimeout(check, 60);
    };
    check();
  });

  if (!introMode) {
    if (loader) loader.remove();
    finishLoading();
  } else {
    let introApi = null;
    const fontsPromise = fontsSettled(1600);       // runs while the loader plays, so it costs no extra time
    const introReady = new Promise((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'intro.js';
      tag.onload = () => { introApi = window.SBIntro || null; resolve(introApi); };
      tag.onerror = () => resolve(null);
      document.head.appendChild(tag);
      setTimeout(() => resolve(introApi), 4000);
    });
    introReady.then((api) => {
      if (!api) return;
      try { api.init({ startTypewriter, countUp: (el, ms) => countUp(el, ms), finishCounters: () => finishCounters() }); } catch (e) { console.warn(e); try { api.skip(); } catch (e2) {} introApi = null; }
    });

    const ring = $('#ringFg');
    const pctEl = $('#loaderPct');
    const textEl = $('#loaderText');
    const CIRC = 314.16;
    const MIN = 2800;                              // long enough to enjoy the cursors circling the logo
    const steps = [[0, 'spawning build agents'], [28, 'reading the brief'], [55, 'planning the layout'], [82, 'handing out tasks'], [100, 'go']];
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    setTimeout(() => { loaded = true; }, 4500);

    let shown = 0, stepIdx = -1, done = false;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min((now - t0) / MIN, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // ease in-out so the count is readable
      const target = Math.min(eased * 100, loaded ? 100 : 92);
      shown += (target - shown) * 0.2;
      if (loaded && t >= 1 && shown > 99.4) shown = 100;
      const v = Math.round(shown);
      pctEl.textContent = v;
      ring.style.strokeDashoffset = String(CIRC * (1 - shown / 100));
      if (introApi) introApi.progress(shown / 100);
      const idx = steps.reduce((acc, st, i) => (v >= st[0] ? i : acc), 0);
      if (idx !== stepIdx) {
        stepIdx = idx;
        textEl.textContent = steps[idx][1];
        textEl.classList.remove('swap'); void textEl.offsetWidth; textEl.classList.add('swap');
      }
      if (shown >= 100 && !done) {
        done = true;
        setTimeout(async () => {
          loader.classList.add('is-done');          // the curtain lifts while the agents scatter
          const api = await introReady;
          await fontsPromise;                      // build on final text metrics, so nothing reflows under the agents
          if (api && introApi) {
            try { localStorage.setItem('sb_intro', '1'); } catch (e) {}           // the build really starts now: remember it
            try { document.cookie = 'sb_intro=1; max-age=31536000; path=/; SameSite=Lax'; } catch (e) {}
            root.classList.remove('is-loading');
            setTimeout(() => loader.remove(), 1700);
            try { await api.launch(); } catch (e) { console.warn(e); }
            finishIntro();
          } else {
            setTimeout(finishLoading, 420);
          }
        }, 380);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Floating commands in the background ---------- */
  const floatLayer = $('#bgFloat');
  if (floatLayer) {
    const snippets = [
      'sudo apt install coffee', 'git commit -m "fix: it works now"', 'flutter run --release', 'python app.py',
      'docker compose up -d', 'ls -la ~/projects', 'npm run build', 'cd ~/portfolio && code .',
      'def build(idea): return product', 'print("Hello, world!")', 'git push origin main', '// TODO: sleep',
      'pip install flask', 'chmod +x ship.sh', 'ssh dev@localhost', 'tail -f server.log',
      'const ship = () => "done";', 'import telegram', 'grep -r "bug" .', '$ whoami  # sajal',
      'sum(n**2 for n in range(10))', '404: sleep not found', 'systemctl start ideas', 'flask run --debug'
    ];
    const count = window.innerWidth < 760 ? 9 : 16;
    const pool = snippets.slice().sort(() => Math.random() - 0.5).slice(0, count);
    const frag = document.createDocumentFragment();
    pool.forEach((text, i) => {
      const el = document.createElement('span');
      el.textContent = text;
      el.style.setProperty('--x', (3 + ((i + Math.random() * 0.8) / count) * 88).toFixed(1) + '%');
      el.style.setProperty('--y', (6 + Math.random() * 86).toFixed(1) + '%');
      el.style.setProperty('--dur', (34 + Math.random() * 34).toFixed(1) + 's');
      el.style.setProperty('--delay', '-' + (Math.random() * 60).toFixed(1) + 's');
      el.style.setProperty('--fs', (11 + Math.random() * 4).toFixed(1) + 'px');
      el.style.setProperty('--o', (0.07 + Math.random() * 0.06).toFixed(3));
      el.style.setProperty('--dx', ((Math.random() - 0.5) * 80).toFixed(0) + 'px');
      frag.appendChild(el);
    });
    floatLayer.appendChild(frag);
  }

  /* ---------- Background: drifting blobs ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const blobEls = [...document.querySelectorAll('#bgBlobs i')];
  const blobState = (el) => ({ x: rand(-15, 85), y: rand(-15, 85), s: rand(0.85, 1.25), r: rand(-40, 40) });
  const blobCss = (st) => 'translate3d(' + st.x.toFixed(1) + 'vw,' + st.y.toFixed(1) + 'vh,0) scale(' + st.s.toFixed(2) + ') rotate(' + st.r.toFixed(0) + 'deg)';
  blobEls.forEach((el) => {
    let cur = blobState(el);
    el.style.transform = blobCss(cur);
    if (reduceMotion.matches) return;
    const wander = () => {
      const next = blobState(el);
      const anim = el.animate([{ transform: blobCss(cur) }, { transform: blobCss(next) }],
        { duration: rand(16000, 30000), easing: 'ease-in-out', fill: 'forwards' });
      anim.onfinish = () => { cur = next; el.style.transform = blobCss(cur); anim.cancel(); wander(); };
    };
    wander();
  });

  /* ---------- Background: tiny particles + soft orbs (canvas) ---------- */
  const cv = $('#bgParticles');
  if (cv && cv.getContext) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, particles = [], orbs = [];
    const mouse = { x: -9999, y: -9999 };
    let rgb = [111, 149, 255], rgb2 = [63, 216, 172];
    const hexToRgb = (hex) => {
      const m = hex.trim().replace('#', '');
      const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
      return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
    };
    const readColors = () => {
      const cs = getComputedStyle(root);
      try { rgb = hexToRgb(cs.getPropertyValue('--accent')); rgb2 = hexToRgb(cs.getPropertyValue('--accent-2')); } catch (e) {}
    };
    const make = () => {
      const count = Math.max(26, Math.min(90, Math.round((W * H) / 16000)));
      particles = Array.from({ length: count }, () => ({
        x: rand(0, W), y: rand(0, H), vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25),
        r: rand(0.7, 2.1), a: rand(0.25, 0.7), ph: rand(0, 6.28), tw: rand(0.4, 1.4), alt: Math.random() < 0.3
      }));
      orbs = Array.from({ length: W < 760 ? 4 : 7 }, () => ({
        x: rand(0, W), y: rand(0, H), vx: rand(-0.12, 0.12), vy: rand(-0.12, 0.12), r: rand(36, 96), a: rand(0.05, 0.1), alt: Math.random() < 0.4
      }));
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make();
      if (reduceMotion.matches) draw(0);
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      orbs.forEach((o) => {
        const c = o.alt ? rgb2 : rgb;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + o.a + ')');
        g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.2832); ctx.fill();
      });
      particles.forEach((p) => {
        const c = p.alt ? rgb2 : rgb;
        const tw = 0.6 + 0.4 * Math.sin(t * 0.001 * p.tw + p.ph);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (p.a * tw).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      });
    };
    const step = () => {
      orbs.forEach((o) => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r; else if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r; else if (o.y > H + o.r) o.y = -o.r;
      });
      particles.forEach((p) => {
        // gentle random wandering, capped speed
        p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02;
        // tiny push away from the cursor
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 12100 && d2 > 1) { const f = (1 - Math.sqrt(d2) / 110) * 0.06; p.vx += (dx / Math.sqrt(d2)) * f; p.vy += (dy / Math.sqrt(d2)) * f; }
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.38) { p.vx *= 0.38 / sp; p.vy *= 0.38 / sp; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4; else if (p.y > H + 4) p.y = -4;
      });
    };
    const loop = (t) => { step(); draw(t); requestAnimationFrame(loop); };

    readColors();
    resize();
    window.addEventListener('resize', resize);
    new MutationObserver(() => { readColors(); if (reduceMotion.matches) draw(0); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (!reduceMotion.matches) {
      window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
      const clearMouse = () => { mouse.x = mouse.y = -9999; };
      document.documentElement.addEventListener('mouseleave', clearMouse);
      window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') clearMouse(); });
      window.addEventListener('pointercancel', clearMouse);
      requestAnimationFrame(loop);
    }
  }

  /* ---------- Theme ---------- */
  const themeBtn = $('#themeToggle');
  const syncTheme = () => {
    const dark = root.dataset.theme !== 'light';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0e1621' : '#f6f7f9';
  };
  const applyTheme = (next) => {
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncTheme();
  };
  let activeTransitions = 0;

  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';

    // No View Transitions support or reduced motion: plain switch
    if (!document.startViewTransition || reduceMotion.matches) { applyTheme(next); return; }

    // New theme expands as a circle from the center of the toggle button
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    activeTransitions++;
    root.classList.add('theme-switching');
    const vt = document.startViewTransition(() => applyTheme(next));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.65, 0, .25, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
    vt.finished.catch(() => {}).then(() => {
      if (--activeTransitions === 0) root.classList.remove('theme-switching');
    });
  });
  syncTheme();

  /* ---------- Mobile menu ---------- */
  const nav = $('#nav');
  const menuBtn = $('#menuToggle');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('#nav, #menuToggle')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 47.5625em)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Current section in nav ---------- */
  const links = [...nav.querySelectorAll('a')];
  const linkFor = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const setActive = (id) => links.forEach((a) => {
    a.classList.toggle('is-active', linkFor.get(id) === a);
    if (!a.getAttribute('class')) a.removeAttribute('class');
  });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', ...linkFor.keys()].forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* ---------- Counters ("At a glance") ----------
     Numbers are computed from the page itself, so they never go stale. The HTML already holds the final value. */
  const counters = [...document.querySelectorAll('[data-count]')];
  const countTarget = (el) => {
    const sel = el.dataset.countOf;
    if (!sel) return Number(el.dataset.count) || 0;
    const items = [...document.querySelectorAll(sel)];
    return el.hasAttribute('data-unique') ? new Set(items.map((n) => n.textContent.trim().toLowerCase())).size : items.length;
  };
  counters.forEach((el) => { el.dataset.final = String(countTarget(el)); el.textContent = el.dataset.final; });
  const finishCounters = () => counters.forEach((el) => { el.textContent = el.dataset.final; });
  const countUp = (el, ms = 1400) => new Promise((resolve) => {
    const end = Number(el.dataset.final) || 0;
    if (reduceMotion.matches || end <= 0) { el.textContent = String(end); resolve(); return; }
    let t0 = null;
    el.textContent = '0';
    const step = (now) => {
      if (t0 === null) t0 = now;
      const k = Math.min((now - t0) / ms, 1);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
  if (introMode) {
    counters.forEach((el) => { el.textContent = '0'; });                 // the agents count them up
  } else if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    counters.forEach((el) => { el.textContent = '0'; });
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
    window.addEventListener('scroll', () => {                              // safety net, like the reveals
      if (innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) { finishCounters(); }
    }, { passive: true });
  }

  /* ---------- Footer year ---------- */
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Contact form (Web3Forms) ---------- */
  const form = $('#contactForm');
  const status = $('#formStatus');
  const submitBtn = $('#submitBtn');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rules = {
    name: (v) => (v ? '' : 'Enter your name.'),
    email: (v) => (emailRe.test(v) ? '' : 'Enter a valid email address.'),
    message: (v) => (v.length >= 10 ? '' : 'Write at least 10 characters.')
  };
  const check = (field) => {
    const input = form.elements[field];
    const msg = rules[field](input.value.trim());
    $('#' + field + 'Error').textContent = msg;
    input.closest('.field').classList.toggle('has-error', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const checkAll = () => {
    const fields = Object.keys(rules);
    const ok = fields.map(check);                    // run every check so all errors show
    const bad = fields.find((_, i) => !ok[i]);
    if (bad) form.elements[bad].focus();
    return !bad;
  };

  form.addEventListener('input', (e) => {
    const f = e.target.name;
    if (rules[f] && e.target.closest('.field').classList.contains('has-error')) check(f);
  });
  form.addEventListener('focusout', (e) => {
    const f = e.target.name;
    if (rules[f] && e.target.value.trim() !== '') check(f);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form__status';
    status.textContent = '';
    if (!checkAll()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      const data = new FormData(form);
      data.append('subject', 'New message from ' + data.get('name') + ' via portfolio');
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { Accept: 'application/json' }, body: data
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
      form.reset();
      Object.keys(rules).forEach((f) => form.elements[f].removeAttribute('aria-invalid'));
      status.textContent = 'Message sent. I will reply soon.';
      status.classList.add('is-ok');
    } catch (err) {
      status.textContent = 'Could not send the message. Email me directly at sbsajal0369@gmail.com.';
      status.classList.add('is-error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
    }
  });

  /* ---------- Micro-interactions ---------- */

  // Header shadow and scroll progress
  const header = $('#header');
  const bar = $('#scrollBar');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    ticking = false;
  };
  const queueScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);
  onScroll();

  // Reveal on scroll (staggered inside each group). Content stays visible without JS.
  const revealTargets = [...document.querySelectorAll('[data-reveal]')];
  if (introMode) {
    // The intro reveals everything itself, so just mark the scroll-reveals as done: nothing stays hidden afterwards.
    revealTargets.forEach((el) => {
      const group = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
      el.style.setProperty('--i', group.indexOf(el));
      el.classList.add('will-reveal', 'is-in');
    });
  } else if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const targets = revealTargets;
    targets.forEach((el) => {
      const group = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
      el.style.setProperty('--i', group.indexOf(el));
      el.classList.add('will-reveal');
    });
    const show = (el) => el.classList.add('is-in');
    const ro = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { show(en.target); ro.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => ro.observe(el));
    // Safety net: anything still hidden once the user reaches the page end
    window.addEventListener('scroll', () => {
      if (innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        targets.forEach((el) => { show(el); ro.unobserve(el); });
      }
    }, { passive: true });
  }

  // Button press ripple
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn');
    if (!b || b.disabled || reduceMotion.matches) return;
    const rect = b.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - rect.left - size / 2) + 'px;top:' + (e.clientY - rect.top - size / 2) + 'px';
    b.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });

  // Magnetic hero buttons and cursor glow (mouse only)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    document.querySelectorAll('.hero__cta .btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate(' + dx * 8 + 'px,' + dy * 6 + 'px)';
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
    document.querySelectorAll('.featured, .project, .service, .form').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  // Click the email to copy it (opens the mail app if copying is unavailable)
  const mail = $('.contact__mail');
  const toast = $('#toast');
  if (mail && navigator.clipboard && window.isSecureContext) {
    mail.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      navigator.clipboard.writeText('sbsajal0369@gmail.com').then(() => {
        toast.textContent = 'Email copied';
        toast.classList.add('is-on');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('is-on'), 1800);
      }).catch(() => { window.location.href = 'mailto:sbsajal0369@gmail.com'; });
    });
  }
})();
