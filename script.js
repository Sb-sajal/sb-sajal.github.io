/**
 * ============================================================
 * SAJAL BAIDDYA (Rafael) — Portfolio Script
 * Vanilla JavaScript (ES6) — No Dependencies
 * ============================================================
 */

'use strict';

/* ============================================================
   UTILITY HELPERS
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const debounce = (fn, ms = 100) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/* ============================================================
   SOUND ENGINE (Web Audio API — Subtle UI Sounds)
   ============================================================ */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch { /* Web Audio not supported */ }
  }

  play(type) {
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'hover':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, now);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'theme':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const sound = new SoundEngine();

/* ============================================================
   LOADING SCREEN
   ============================================================ */
class Loader {
  constructor() {
    this.el = $('#loader');
    this.progressFill = $('#loaderProgressFill');
    this.percentage = $('#loaderPercentage');
    this.particlesContainer = $('#loaderParticles');
    this.codeSnippetsContainer = $('#loaderCodeSnippets');
    this.progress = 0;
    this.codeSnippets = [
      'npm install', 'git push origin main', 'docker build -t app .',
      'python manage.py runserver', 'flutter build apk', 'sudo systemctl restart nginx',
      'gcc -o main main.c', 'chmod +x deploy.sh', 'ssh user@server',
      'kubectl apply -f config.yaml', 'npm run build', 'make clean'
    ];
    this.init();
  }

  init() {
    document.body.classList.add('loading');
    this.createParticles();
    this.createCodeSnippets();
    this.animate();
  }

  createParticles() {
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 3}s`;
      p.style.animationDuration = `${2 + Math.random() * 3}s`;
      this.particlesContainer.appendChild(p);
    }
  }

  createCodeSnippets() {
    this.codeSnippets.forEach((code, i) => {
      const el = document.createElement('div');
      el.className = 'code-snippet';
      el.textContent = code;
      el.style.left = `${10 + Math.random() * 70}%`;
      el.style.top = `${10 + Math.random() * 70}%`;
      el.style.animationDelay = `${i * 0.6}s`;
      this.codeSnippetsContainer.appendChild(el);
    });
  }

  animate() {
    const interval = setInterval(() => {
      this.progress += Math.random() * 8 + 2;
      if (this.progress >= 100) {
        this.progress = 100;
        clearInterval(interval);
        setTimeout(() => this.hide(), 400);
      }
      this.progressFill.style.width = `${this.progress}%`;
      this.percentage.textContent = `${Math.round(this.progress)}%`;
    }, 120);
  }

  hide() {
    this.el.classList.add('hidden');
    document.body.classList.remove('loading');
    setTimeout(() => { this.el.style.display = 'none'; }, 800);
  }
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
class CustomCursor {
  constructor() {
    this.cursor = $('#cursor');
    this.dot = $('.cursor__dot', this.cursor);
    this.ring = $('.cursor__ring', this.cursor);
    this.ripple = $('#cursorRipple');
    this.pos = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.isTouch = window.matchMedia('(hover: none)').matches;
    if (!this.isTouch) this.init();
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
    });

    document.addEventListener('mousedown', (e) => {
      this.cursor.classList.add('click');
      this.ripple.style.left = `${e.clientX}px`;
      this.ripple.style.top = `${e.clientY}px`;
      this.ripple.classList.remove('active');
      void this.ripple.offsetWidth; // force reflow
      this.ripple.classList.add('active');
      sound.init();
      sound.play('click');
      setTimeout(() => this.cursor.classList.remove('click'), 400);
    });

    // Hover detection
    const hoverEls = 'a, button, [data-sound], input, textarea, [role="button"]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverEls)) {
        this.cursor.classList.add('hover');
        if (e.target.closest('[data-sound]')) {
          sound.init();
          sound.play('hover');
        }
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverEls)) {
        this.cursor.classList.remove('hover');
      }
    });

    this.render();
  }

  render() {
    // Smooth follow for the ring
    this.pos.x += (this.target.x - this.pos.x) * 0.15;
    this.pos.y += (this.target.y - this.pos.y) * 0.15;

    this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    requestAnimationFrame(() => this.render());
  }
}

/* ============================================================
   SCROLL PROGRESS BAR
   ============================================================ */
class ScrollProgress {
  constructor() {
    this.el = $('#scrollProgress');
    this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.update(), { passive: true });
  }

  update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    this.el.style.width = `${pct}%`;
    this.el.setAttribute('aria-valuenow', Math.round(pct));
  }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
class Navigation {
  constructor() {
    this.nav = $('#navbar');
    this.hamburger = $('#hamburger');
    this.menu = $('#navMenu');
    this.backdrop = $('#navBackdrop');
    this.closeBtn = $('#navClose');
    this.links = $$('.nav__link');
    this.sections = $$('.section[id]');
    this.init();
  }

  open() {
    this.hamburger.classList.add('active');
    this.menu.classList.add('active');
    this.backdrop.classList.add('active');
    this.hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.hamburger.classList.remove('active');
    this.menu.classList.remove('active');
    this.backdrop.classList.remove('active');
    this.hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  init() {
    // Scroll effect
    window.addEventListener('scroll', () => {
      this.nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Hamburger toggle
    this.hamburger.addEventListener('click', () => {
      const isActive = this.hamburger.classList.contains('active');
      isActive ? this.close() : this.open();
      sound.init();
      sound.play('click');
    });

    // Close by clicking the empty space (backdrop) outside the menu
    this.backdrop.addEventListener('click', () => this.close());

    // Close via the explicit X button inside the drawer
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.hamburger.classList.contains('active')) this.close();
    });

    // Link clicks
    this.links.forEach(link => {
      link.addEventListener('click', () => this.close());
    });

    // Active section tracking
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          this.links.forEach(l => l.classList.toggle('active', l.dataset.section === id));
        }
      });
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

    this.sections.forEach(s => observer.observe(s));
  }
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */
class ThemeToggle {
  constructor() {
    this.toggle = $('#themeToggle');
    this.html = document.documentElement;
    this.init();
  }

  init() {
    // Restore saved theme
    const saved = localStorage.getItem('theme');
    if (saved) {
      this.html.setAttribute('data-theme', saved);
    }

    this.toggle.addEventListener('click', () => {
      const current = this.html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      sound.init();
      sound.play('theme');
    });
  }
}

/* ============================================================
   MUTE TOGGLE
   ============================================================ */
class MuteToggle {
  constructor() {
    this.btn = $('#muteToggle');
    this.dock = $('#socialDock');
    this.init();
  }

  init() {
    // Restore saved state
    const muted = localStorage.getItem('muted') === 'true';
    if (muted) {
      sound.muted = true;
      this.dock.classList.add('muted');
    }

    this.btn.addEventListener('click', () => {
      const isMuted = sound.toggle();
      this.dock.classList.toggle('muted', isMuted);
      localStorage.setItem('muted', isMuted);
    });
  }
}

/* ============================================================
   TYPEWRITER EFFECT
   ============================================================ */
class Typewriter {
  constructor() {
    this.el = $('#typewriterText');
    this.phrases = [
      'Fullstack Web Developer',
      'Vibe Coder',
      'Linux Lover',
      'Tech Savvy',
      'Problem Solver',
      'Open Source Enthusiast'
    ];
    this.phraseIdx = 0;
    this.charIdx = 0;
    this.isDeleting = false;
    this.typeSpeed = 80;
    this.deleteSpeed = 40;
    this.pauseTime = 2000;
    this.init();
  }

  init() {
    this.type();
  }

  type() {
    const current = this.phrases[this.phraseIdx];

    if (this.isDeleting) {
      this.charIdx--;
      this.el.textContent = current.substring(0, this.charIdx);
    } else {
      this.charIdx++;
      this.el.textContent = current.substring(0, this.charIdx);
    }

    let delay = this.isDeleting ? this.deleteSpeed : this.typeSpeed;

    if (!this.isDeleting && this.charIdx === current.length) {
      delay = this.pauseTime;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIdx === 0) {
      this.isDeleting = false;
      this.phraseIdx = (this.phraseIdx + 1) % this.phrases.length;
      delay = 500;
    }

    setTimeout(() => this.type(), delay);
  }
}

/* ============================================================
   REVEAL ANIMATIONS (Intersection Observer)
   ============================================================ */
class RevealObserver {
  constructor() {
    this.init();
  }

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Animate skill bars if inside
          $$('.skill-bar', entry.target).forEach(bar => this.animateSkillBar(bar));
          // Animate circular skills
          $$('.circular-skill', entry.target).forEach(c => this.animateCircular(c));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    $$('.reveal').forEach(el => observer.observe(el));
  }

  animateSkillBar(bar) {
    const pct = bar.dataset.percent || 0;
    const fill = $('.skill-bar__fill', bar);
    setTimeout(() => { fill.style.width = `${pct}%`; }, 200);
  }

  animateCircular(el) {
    const pct = parseInt(el.dataset.percent) || 0;
    const fill = $('.circular-skill__fill', el);
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (pct / 100) * circumference;
    setTimeout(() => { fill.style.strokeDashoffset = offset; }, 300);
  }
}

/* ============================================================
   COUNTER ANIMATION (About section)
   ============================================================ */
class CounterAnimation {
  constructor() {
    this.init();
  }

  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    $$('.about__stat-number').forEach(el => observer.observe(el));
  }

  animate(el) {
    const target = parseInt(el.dataset.count) || 0;
    const duration = 2000;
    const start = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }
}

/* ============================================================
   RADAR CHART (Canvas)
   ============================================================ */
class RadarChart {
  constructor() {
    this.canvas = $('#radarChart');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.labels = ['Problem\nSolving', 'Communication', 'Creativity', 'Leadership', 'Teamwork'];
    this.values = [0.9, 0.75, 0.85, 0.7, 0.8];
    this.animatedValues = new Array(this.values.length).fill(0);
    this.isAnimated = false;
    this.init();
  }

  init() {
    if (!this.canvas || !this.ctx) return;

    // Set canvas size for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;

    // Observe for animation trigger
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.isAnimated) {
        this.isAnimated = true;
        this.animateIn();
        observer.disconnect();
      }
    }, { threshold: 0.3 });

    observer.observe(this.canvas);

    // Draw initial state
    this.draw();
  }

  animateIn() {
    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedValues = this.values.map(v => v * eased);
      this.draw();

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = Math.min(cx, cy) * 0.7;
    const n = this.labels.length;

    ctx.clearRect(0, 0, this.width, this.height);

    // Draw grid
    for (let level = 1; level <= 5; level++) {
      const r = (radius / 5) * level;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
      const r = radius * this.animatedValues[idx];
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = radius * this.animatedValues[i];
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      ctx.strokeStyle = '#0B0B0B';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const labelR = radius + 25;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);
      const lines = this.labels[i].split('\n');
      lines.forEach((line, li) => {
        ctx.fillText(line, x, y + li * 13 - (lines.length - 1) * 6);
      });
    }
  }
}

/* ============================================================
   PROJECT FILTERING & TILT
   ============================================================ */
class ProjectsSection {
  constructor() {
    this.filters = $$('.projects__filter');
    this.cards = $$('.project-card');
    this.init();
  }

  init() {
    // Filter buttons
    this.filters.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        this.filter(filter);
      });
    });

    // Tilt effect on cards
    this.cards.forEach(card => {
      if (card.hasAttribute('data-tilt')) {
        card.addEventListener('mousemove', (e) => this.tilt(card, e));
        card.addEventListener('mouseleave', () => this.untile(card));
      }
    });
  }

  filter(category) {
    this.cards.forEach(card => {
      const cat = card.dataset.category;
      const show = category === 'all' || cat === category;
      card.style.transition = 'opacity 0.3s, transform 0.3s';
      if (show) {
        card.style.display = '';
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
        });
      } else {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => { card.style.display = 'none'; }, 300);
      }
    });
  }

  tilt(card, e) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -5;
    const rotateY = ((x - cx) / cx) * 5;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  }

  untile(card) {
    card.style.transform = '';
  }
}

/* ============================================================
   GALLERY SLIDER
   ============================================================ */
class GallerySlider {
  constructor() {
    this.track = $('#galleryTrack');
    this.slides = $$('.gallery__slide');
    this.prevBtn = $('#galleryPrev');
    this.nextBtn = $('#galleryNext');
    this.dotsContainer = $('#galleryDots');
    this.current = 0;
    this.total = this.slides.length;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.init();
  }

  init() {
    if (!this.track || this.total === 0) return;

    this.createDots();
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());

    // Touch support
    this.track.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this.track.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      const diff = this.touchStartX - this.touchEndX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? this.next() : this.prev();
      }
    }, { passive: true });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!$('#lightbox').classList.contains('active')) return;
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'Escape') this.closeLightbox();
    });

    // Auto-advance
    this.autoInterval = setInterval(() => this.next(), 5000);
    this.track.addEventListener('mouseenter', () => clearInterval(this.autoInterval));
    this.track.addEventListener('mouseleave', () => {
      this.autoInterval = setInterval(() => this.next(), 5000);
    });

    this.update();
  }

  createDots() {
    for (let i = 0; i < this.total; i++) {
      const dot = document.createElement('button');
      dot.className = `gallery__dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      this.dotsContainer.appendChild(dot);
    }
  }

  goTo(index) {
    this.current = clamp(index, 0, this.total - 1);
    this.update();
  }

  next() {
    this.goTo((this.current + 1) % this.total);
  }

  prev() {
    this.goTo((this.current - 1 + this.total) % this.total);
  }

  update() {
    this.track.style.transform = `translateX(-${this.current * 100}%)`;
    $$('.gallery__dot', this.dotsContainer).forEach((d, i) => {
      d.classList.toggle('active', i === this.current);
      d.setAttribute('aria-selected', i === this.current);
    });
  }

  closeLightbox() {
    $('#lightbox').classList.remove('active');
  }
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
class Lightbox {
  constructor() {
    this.el = $('#lightbox');
    this.image = $('#lightboxImage');
    this.caption = $('#lightboxCaption');
    this.closeBtn = $('#lightboxClose');
    this.prevBtn = $('#lightboxPrev');
    this.nextBtn = $('#lightboxNext');
    this.frames = $$('[data-lightbox]');
    this.currentIndex = 0;
    this.init();
  }

  init() {
    this.frames.forEach((frame, i) => {
      frame.addEventListener('click', () => {
        this.currentIndex = i;
        this.open(i);
      });
    });

    this.closeBtn.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  open(index) {
    const frame = this.frames[index];
    const img = $('img', frame);
    const cap = $('.gallery__caption', frame);
    this.image.src = img.src;
    this.image.alt = img.alt;
    this.caption.textContent = cap ? cap.textContent : '';
    this.el.classList.add('active');
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.el.classList.remove('active');
    this.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.frames.length;
    this.open(this.currentIndex);
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.frames.length) % this.frames.length;
    this.open(this.currentIndex);
  }
}

/* ============================================================
   CONTACT FORM (Web3Forms submission + validation)
   ============================================================ */
class ContactForm {
  constructor() {
    this.form = $('#contactForm');
    this.success = $('#contactSuccess');
    this.submitBtn = this.form ? this.form.querySelector('button[type="submit"]') : null;
    this.submitBtnLabel = this.submitBtn ? this.submitBtn.querySelector('span').textContent : '';
    this.init();
  }

  init() {
    if (!this.form) return;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.validate()) {
        this.submitToWeb3Forms();
      }
    });

    // Real-time validation
    $$('.form-input', this.form).forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('invalid')) {
          this.validateField(input);
        }
      });
    });
  }

  validate() {
    const fields = $$('.form-input', this.form);
    let valid = true;
    fields.forEach(f => {
      if (!this.validateField(f)) valid = false;
    });
    return valid;
  }

  validateField(input) {
    const name = input.name;
    const value = input.value.trim();
    const errorEl = $(`#${name}Error`);
    let msg = '';

    if (!value) {
      msg = 'This field is required';
    } else if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      msg = 'Please enter a valid email address';
    } else if (name === 'message' && value.length < 10) {
      msg = 'Message must be at least 10 characters';
    }

    if (msg) {
      input.classList.add('invalid');
      input.classList.remove('valid');
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.classList.add('visible');
      }
      return false;
    } else {
      input.classList.remove('invalid');
      input.classList.add('valid');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
      }
      return true;
    }
  }

  async submitToWeb3Forms() {
    const accessKeyField = this.form.querySelector('input[name="access_key"]');
    const accessKey = accessKeyField ? accessKeyField.value.trim() : '';

    // No key configured yet — tell the developer, don't silently pretend it worked.
    if (!accessKey) {
      console.warn('[ContactForm] Web3Forms access_key is empty. Get a free key at https://web3forms.com and paste it into the hidden "access_key" input in index.html.');
      this.showError('Form is not fully configured yet. Please email me directly for now.');
      return;
    }

    this.setLoading(true);

    try {
      const formData = new FormData(this.form);
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        this.showSuccess();
      } else {
        this.showError(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      this.showError('Network error. Please check your connection and try again.');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    if (!this.submitBtn) return;
    this.submitBtn.disabled = isLoading;
    const label = this.submitBtn.querySelector('span');
    if (label) label.textContent = isLoading ? 'Sending...' : this.submitBtnLabel;
  }

  showError(message) {
    let errorBanner = $('#contactFormError', this.form.parentElement);
    if (!errorBanner) {
      errorBanner = document.createElement('p');
      errorBanner.id = 'contactFormError';
      errorBanner.className = 'form-error visible';
      errorBanner.style.marginTop = '0.75rem';
      errorBanner.setAttribute('role', 'alert');
      this.form.insertAdjacentElement('afterend', errorBanner);
    }
    errorBanner.textContent = message;
    errorBanner.classList.add('visible');
    setTimeout(() => errorBanner.classList.remove('visible'), 5000);
  }

  showSuccess() {
    this.success.classList.add('visible');
    this.form.style.opacity = '0';
    this.form.style.pointerEvents = 'none';

    setTimeout(() => {
      this.form.reset();
      this.success.classList.remove('visible');
      this.form.style.opacity = '1';
      this.form.style.pointerEvents = '';
      $$('.form-input', this.form).forEach(f => {
        f.classList.remove('valid', 'invalid');
      });
    }, 4000);
  }
}

/* ============================================================
   HERO PARTICLES
   ============================================================ */
class HeroParticles {
  constructor() {
    this.container = $('#heroParticles');
    this.init();
  }

  init() {
    if (!this.container) return;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 8}s`;
      p.style.animationDuration = `${6 + Math.random() * 6}s`;
      this.container.appendChild(p);
    }
  }
}

/* ============================================================
   PARALLAX (Mouse-based for hero)
   ============================================================ */
class Parallax {
  constructor() {
    this.elements = $$('[data-parallax]');
    this.init();
  }

  init() {
    if (!this.elements.length) return;
    document.addEventListener('mousemove', debounce((e) => {
      const mx = (e.clientX / window.innerWidth - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;

      this.elements.forEach(el => {
        const factor = parseFloat(el.dataset.parallax) || 0.02;
        const x = mx * factor * 100;
        const y = my * factor * 100;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
    }, 16));
  }
}

/* ============================================================
   BACK TO TOP
   ============================================================ */
class BackToTop {
  constructor() {
    this.btn = $('#backToTop');
    this.init();
  }

  init() {
    if (!this.btn) return;
    this.btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ============================================================
   FOOTER YEAR
   ============================================================ */
function setCurrentYear() {
  const el = $('#currentYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Start loading screen
  const loader = new Loader();

  // Init all modules
  new CustomCursor();
  new ScrollProgress();
  new Navigation();
  new ThemeToggle();
  new MuteToggle();
  new Typewriter();
  new RevealObserver();
  new CounterAnimation();
  new RadarChart();
  new ProjectsSection();
  new GallerySlider();
  new Lightbox();
  new ContactForm();
  new HeroParticles();
  new Parallax();
  new BackToTop();
  setCurrentYear();
});
