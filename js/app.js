/* ═══════════════════════════════════════════════════════════════════════════
   CREW BARBERSHOP — scroll engine
   Native scroll + sticky pinning (keeps a11y, anchors, mobile momentum),
   with all animated values lerped in a single rAF loop for the cinematic feel.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  /** remap v from [i0,i1] to [o0,o1], clamped */
  const map = (v, i0, i1, o0, o1) => {
    if (i1 === i0) return o0;
    return o0 + (o1 - o0) * clamp((v - i0) / (i1 - i0));
  };
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  let vh = innerHeight, vw = innerWidth;
  let isMobile = vw < 760;

  /* ─────────────────────────── PRELOADER ─────────────────────────── */
  const preloader = $('#preloader');
  const preFill   = $('#preloadFill');
  const preNum    = $('#preloadNum');

  function runPreloader() {
    let pct = 0;
    const tick = setInterval(() => {
      pct += Math.random() * 16 + 6;
      if (pct >= 100) { pct = 100; clearInterval(tick); finish(); }
      preFill.style.width = pct + '%';
      preNum.textContent = Math.floor(pct);
    }, 110);

    function finish() {
      setTimeout(() => {
        preloader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        $$('.kin b').forEach(b => b.classList.add('in'));
        // Kick first-screen reveals once the curtain is clearing
        setTimeout(() => {
          $$('#hero [data-reveal]').forEach(el => el.classList.add('in'));
        }, 420);
        setTimeout(() => preloader.remove(), 2200);
      }, 240);
    }
  }

  /* ─────────────────────────── TEXT SPLITTING ─────────────────────────── */
  function splitLines() {
    $$('[data-reveal-lines]').forEach(el => {
      const parts = el.innerHTML.split(/<br\s*\/?>/i);
      if (parts.length < 2) return;                 // no explicit lines → plain reveal
      el.innerHTML = parts
        .map(p => `<span class="ln"><span>${p.trim()}</span></span>`)
        .join('');
    });
  }

  /* ─────────────────────────── REVEAL OBSERVER ─────────────────────────── */
  function initReveals() {
    const targets = $$('[data-reveal], [data-reveal-lines], [data-card], [data-product], .corridor__cta');
    if (!('IntersectionObserver' in window) || REDUCED) {
      targets.forEach(t => t.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    targets.forEach(t => { if (!t.closest('#hero')) io.observe(t); });
  }

  /* ─────────────────────────── LAZY VIDEO ─────────────────────────── *
   * Each <video data-src> loads only when near the viewport. If the file
   * isn't there yet (pre-Seedance), the element removes itself and the
   * procedural art layer underneath stays on screen — never a broken box.
   * ──────────────────────────────────────────────────────────────────── */
  function initVideo() {
    const vids = $$('video[data-src]');
    if (!vids.length) return;

    const load = (v) => {
      if (v.dataset.loaded) return;
      v.dataset.loaded = '1';

      v.addEventListener('canplay', () => {
        v.classList.add('is-ready');
        v.play().catch(() => {});
      }, { once: true });

      v.addEventListener('error', () => v.remove(), { once: true });
      v.src = v.dataset.src;
      v.load();
    };

    if (!('IntersectionObserver' in window)) { vids.forEach(load); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { load(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '320px 0px' });

    vids.forEach(v => io.observe(v));
  }

  /* ─────────────────────────── SCENES ─────────────────────────── */
  const scenes = [];
  function measure() {
    vh = innerHeight; vw = innerWidth; isMobile = vw < 760;
    scenes.length = 0;
    $$('[data-scene]').forEach(el => {
      const top = el.getBoundingClientRect().top + scrollY;
      scenes.push({ el, top, h: el.offsetHeight, id: el.id, p: 0 });
    });
    docH = document.documentElement.scrollHeight - vh;
  }
  let docH = 1;

  /** 0 → 1 across the scene's pinned travel */
  function sceneProgress(s) {
    return clamp((smoothY - s.top) / Math.max(1, s.h - vh));
  }

  /* ─────────────────────────── ELEMENT CACHE ─────────────────────────── */
  const heroMedia   = $('.hero__media');
  const heroContent = $('.hero__content');
  const lbTop       = $('.letterbox--top');
  const lbBot       = $('.letterbox--bot');
  const tunnelWords = $$('.tunnel__word');
  const maniCopy    = $('.manifesto__copy');
  const cutsHeading = $('[data-corridor-title]');
  const cuts        = $$('.cut');
  const progressBar = $('#progressBar');
  const nav         = $('#nav');
  const bookbar     = $('.bookbar');

  /* ─────────────────────────── SCROLL LOOP ─────────────────────────── */
  let targetY = scrollY, smoothY = scrollY, lastNavY = scrollY;

  function frame() {
    targetY = scrollY;
    smoothY = REDUCED ? targetY : lerp(smoothY, targetY, 0.115);
    if (Math.abs(targetY - smoothY) < 0.08) smoothY = targetY;

    scenes.forEach(s => { s.p = sceneProgress(s); });

    renderHero();
    renderManifesto();
    renderCorridor();
    renderChrome();

    requestAnimationFrame(frame);
  }

  /* ── 01 · HERO ─────────────────────────────────────────────────────── */
  function renderHero() {
    const s = scenes.find(x => x.id === 'hero');
    if (!s) return;
    const p = s.p;

    // Camera pushes into the plate, plate drifts up + scales
    if (heroMedia) {
      const z = map(p, 0, 1, 0, isMobile ? 90 : 210);
      const y = map(p, 0, 1, 0, -vh * 0.14);
      heroMedia.style.transform = `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(2)}px) scale(${(1 + p * 0.06).toFixed(4)})`;
    }

    // Letterbox bars open on entry, close on exit — the "shot" framing
    if (lbTop && lbBot) {
      const open = map(p, 0, 0.16, 0, 1);      // 1 = fully open (bars retracted)
      const close = map(p, 0.72, 1, 0, 1);     // bars come back in
      const h = lerp(1, 0.06, easeOut(open)) + close * 0.9;
      lbTop.style.transform = `translate3d(0,${(-100 + h * 100).toFixed(2)}%,0)`;
      lbBot.style.transform = `translate3d(0,${(100 - h * 100).toFixed(2)}%,0)`;
    }

    // Title rises and dissolves
    if (heroContent) {
      const y = map(p, 0, 1, 0, -vh * 0.34);
      const o = 1 - map(p, 0.26, 0.62, 0, 1);
      const sc = 1 - map(p, 0, 1, 0, 0.08);
      heroContent.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
      heroContent.style.opacity = o.toFixed(3);
    }
  }

  /* ── 02 · MANIFESTO WORD TUNNEL ────────────────────────────────────── *
   * Words sit at fixed world-Z; a virtual camera flies through them.
   * ──────────────────────────────────────────────────────────────────── */
  // Wide gap = one word owns the frame at a time; the next is still far enough
  // back to read as depth rather than clutter.
  const T_GAP = 2200, T_START = -2800, T_END = 520;
  const T_PHASE = 0.72;   // words own 0 → 0.72, the copy owns 0.72 → 1
  function renderManifesto() {
    const s = scenes.find(x => x.id === 'manifesto');
    if (!s || !tunnelWords.length || REDUCED) return;
    const p = s.p;

    const n = tunnelWords.length;
    const travel = (n - 1) * T_GAP + (T_END - T_START);
    const cam = T_START + clamp(p / T_PHASE) * travel;

    tunnelWords.forEach((w, i) => {
      const z = cam - i * T_GAP;                       // CSS translateZ
      if (z > T_END || z < T_START - 400) { w.style.opacity = '0'; return; }

      // Slow ramp so a distant word stays faint — depth, not collision —
      // and only reaches full weight just before it passes the lens.
      const fadeIn = Math.pow(map(z, T_START, T_END - 400, 0, 1), 2.1);
      const fadeOut = 1 - map(z, T_END - 380, T_END, 0, 1);
      const o = Math.min(fadeIn, fadeOut);
      const rot = map(z, T_START, T_END, 7, -7);
      const x = (i % 2 ? 1 : -1) * map(z, T_START, T_END, 1, 9);

      w.style.opacity = o.toFixed(3);
      w.style.transform =
        `translate3d(${x.toFixed(2)}%, 0, ${z.toFixed(2)}px) rotateX(${rot.toFixed(2)}deg)`;
    });

    // Copy takes over once the last word has flown past the lens
    if (maniCopy) {
      const o = map(p, T_PHASE, T_PHASE + 0.12, 0, 1) * (1 - map(p, 0.95, 1, 0, 1));
      maniCopy.style.opacity = o.toFixed(3);
      maniCopy.style.transform = `translate3d(0, ${map(p, T_PHASE, 0.95, 44, 0).toFixed(1)}px, 0)`;
    }
  }

  /* ── 03 · THE CUTS — 3D corridor flythrough ────────────────────────── */
  const C_GAP = 620, C_START = -3200, C_END = 780;
  function renderCorridor() {
    const s = scenes.find(x => x.id === 'cuts');
    if (!s || !cuts.length || REDUCED) return;
    const p = s.p;

    const n = cuts.length;
    const travel = (n - 1) * C_GAP + (C_END - C_START);
    const cam = C_START + p * travel;

    cuts.forEach((el, i) => {
      const z = cam - i * C_GAP;

      if (z > C_END || z < C_START - 400) {
        if (el.style.opacity !== '0') el.style.opacity = '0';
        return;
      }

      // Depth fade in / flare out past camera
      const o = Math.min(
        map(z, C_START, C_START + 1000, 0, 1),
        1 - map(z, C_END - 460, C_END, 0, 1)
      );

      // Lateral drift — cards swing wider as they near the lens
      const spread = map(z, C_START, C_END, 0.28, 1.5);
      const xPct = parseFloat(el.style.getPropertyValue('--x')) || 0;
      const yPct = parseFloat(el.style.getPropertyValue('--y')) || 0;
      const x = xPct * spread * (isMobile ? 0.55 : 1);
      const y = yPct * spread * (isMobile ? 0.5 : 1);

      const rotY = map(z, C_START, C_END, 0, xPct > 0 ? -14 : 14);
      const rotX = map(z, C_START, C_END, 0, 5);

      // Cheap depth-of-field
      const blur = Math.max(
        map(z, C_START + 300, C_START + 1600, 4.5, 0),
        map(z, C_END - 620, C_END, 0, 6)
      );

      el.style.opacity = o.toFixed(3);
      el.style.transform =
        `translate3d(${x.toFixed(2)}%, ${y.toFixed(2)}%, ${z.toFixed(2)}px) ` +
        `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;
      el.style.filter = blur > 0.25 ? `blur(${blur.toFixed(1)}px)` : 'none';
    });

    // Heading pushes toward the lens then clears out
    if (cutsHeading) {
      const z = map(p, 0, 0.34, 0, 900);
      const o = 1 - map(p, 0.06, 0.3, 0, 1);
      cutsHeading.style.transform = `translate(-50%,-50%) translate3d(0,0,${z.toFixed(1)}px)`;
      cutsHeading.style.opacity = o.toFixed(3);
    }
  }

  /* ── CHROME: progress, nav, bookbar ────────────────────────────────── */
  function renderChrome() {
    if (progressBar) progressBar.style.width = (clamp(smoothY / docH) * 100).toFixed(2) + '%';

    if (nav) {
      const down = scrollY > lastNavY && scrollY > vh * 0.9;
      nav.classList.toggle('is-hidden', down && !$('#drawer').classList.contains('is-open'));
      lastNavY = scrollY;
    }

    if (bookbar) bookbar.classList.toggle('in', scrollY > vh * 0.8);
  }

  /* ─────────────────────────── UI BITS ─────────────────────────── */
  function initDrawer() {
    const burger = $('#burger');
    const drawer = $('#drawer');
    if (!burger || !drawer) return;

    const set = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('drawer-open', open);
    };

    burger.addEventListener('click', () =>
      set(burger.getAttribute('aria-expanded') !== 'true'));
    $$('a', drawer).forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  function initMarquees() {
    $$('[data-marquee] .marquee__track').forEach(track => {
      track.innerHTML += track.innerHTML;          // seamless -50% loop
    });
  }

  function initTilt() {
    if (REDUCED || matchMedia('(hover: none)').matches) return;
    $$('[data-tilt]').forEach(card => {
      const media = $('.barber__media', card);
      if (!media) return;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        media.style.transform =
          `translateZ(50px) rotateY(${(dx * 9).toFixed(2)}deg) rotateX(${(-dy * 7).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave', () => { media.style.transform = ''; });
    });
  }

  /* ─────────────────────────── SHOP ─────────────────────────── *
   * Each size radio carries its own Stripe Payment Link in data-url; picking
   * a size just swaps the buy button's href. One-size products put the URL on
   * the button itself. No cart, no backend, no card data ever touches us.
   *
   * A product with no valid https:// link renders as "Coming Soon" and is
   * unclickable — a half-configured shop must never look purchasable.
   * ──────────────────────────────────────────────────────────────────────── */
  function initShop() {
    $$('[data-product]').forEach(card => {
      const buy = $('[data-buy]', card);
      if (!buy) return;

      const radios = $$('input[type="radio"]', card);
      const labels = $$('.btn__label', buy);
      const priceEl = $('.product__price', card);
      const price = priceEl ? priceEl.textContent.trim() : '';

      const apply = () => {
        const picked = radios.find(r => r.checked);
        const url = (picked ? picked.dataset.url : buy.dataset.url || '').trim();
        const live = /^https:\/\/\S+$/.test(url);

        card.classList.toggle('is-unconfigured', !live);
        buy.href = live ? url : '#';
        buy.setAttribute('aria-disabled', String(!live));
        if (live) buy.removeAttribute('tabindex'); else buy.setAttribute('tabindex', '-1');

        const size = picked ? ` (${picked.value})` : '';
        const text = live ? `Buy${size} — ${price}` : 'Coming Soon';
        labels.forEach(l => { l.textContent = text; });
      };

      radios.forEach(r => r.addEventListener('change', apply));
      buy.addEventListener('click', e => {
        if (buy.getAttribute('aria-disabled') === 'true') e.preventDefault();
      });
      apply();
    });
  }

  /* Product photos load the same lazy way the videos do: if the file isn't
     there, the element is dropped and the procedural art stays visible. */
  function initProductImages() {
    const imgs = $$('img[data-src]');
    if (!imgs.length) return;
    const load = img => {
      img.addEventListener('load', () => { img.hidden = false; }, { once: true });
      img.addEventListener('error', () => img.remove(), { once: true });
      img.src = img.dataset.src;
    };
    if (!('IntersectionObserver' in window)) { imgs.forEach(load); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '320px 0px' });
    imgs.forEach(i => io.observe(i));
  }

  function initYear() {
    const y = $('#yr'); if (y) y.textContent = new Date().getFullYear();
  }

  /* ─────────────────────────── BOOT ─────────────────────────── */
  function boot() {
    splitLines();
    initYear();
    initMarquees();
    initDrawer();
    initTilt();
    initVideo();
    initShop();
    initProductImages();
    initReveals();
    measure();
    runPreloader();
    requestAnimationFrame(frame);

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 140); });
    addEventListener('load', measure);
    // Fonts change layout height — re-measure once they land
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
