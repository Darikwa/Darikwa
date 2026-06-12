/* Darikwa — progressive enhancement layer.
   Everything here is decoration: the page is complete, readable and
   navigable with JavaScript disabled. */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  document.documentElement.classList.add("js");
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- split headings into animatable words ----------
     The original text stays in the DOM as plain words, so crawlers and
     screen readers see normal content. */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((word, i) => {
      const outer = document.createElement("span");
      outer.className = "word";
      const inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--i", i);
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------- scroll-triggered reveals ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal, [data-split]").forEach((el) => io.observe(el));

  /* ---------- reading progress hairline ---------- */
  const bar = document.getElementById("progressBar");
  let progressTicking = false;
  const paintProgress = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    progressTicking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!progressTicking) {
        progressTicking = true;
        requestAnimationFrame(paintProgress);
      }
    },
    { passive: true }
  );
  paintProgress();

  /* ---------- scroll-scrubbed statement ----------
     Words begin faint and fill to ink, one by one, as the paragraph
     travels up the viewport. Scrubbed directly from scroll position, so
     it tracks the reader's pace instead of playing on a timer. */
  const scrubEls = [];
  if (!reduceMotion) {
    document.querySelectorAll("[data-scrub]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      const spans = words.map((word, i) => {
        const span = document.createElement("span");
        span.className = "scrub-word";
        span.textContent = word;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
        return span;
      });
      scrubEls.push({ el, spans });
    });
  }

  const paintScrub = () => {
    const vh = window.innerHeight;
    scrubEls.forEach(({ el, spans }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      // 0 when the paragraph enters the lower viewport, 1 by its upper third
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.45)));
      const filled = progress * spans.length;
      spans.forEach((span, i) => {
        const k = Math.min(1, Math.max(0, filled - i));
        span.style.opacity = (0.16 + 0.84 * k).toFixed(3);
      });
    });
  };

  /* ---------- parting cloud ----------
     The word cloud sits gathered in a pinned viewport; as the visitor
     scrolls through the section, each word slides out to its own side of
     the centre line — scrubbed from scroll position, eased both ways. */
  const part = document.querySelector(".part");
  let partItems = [];
  let partEdges = [];

  const initPart = () => {
    const cloud = part.querySelector(".part-cloud");
    const items = [...cloud.children];
    items.forEach((li) => { li.style.transform = ""; });
    const mid = cloud.getBoundingClientRect();
    const centre = mid.left + mid.width / 2;
    partItems = items.map((li, i) => {
      const r = li.getBoundingClientRect();
      const dx = r.left + r.width / 2 - centre;
      const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
      const mag = 0.75 + ((i * 7919) % 97) / 97 * 0.7; // deterministic spread
      return { li, dir, mag, width: r.width };
    });
  };

  const paintPart = () => {
    const vh = window.innerHeight;
    const r = part.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const raw = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
    // easeInOutQuad — graceful at both ends
    const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    const reach = window.innerWidth / 2;
    partItems.forEach(({ li, dir, mag, width }) => {
      li.style.transform = `translateX(${p * dir * (reach + width) * mag}px)`;
    });
    partEdges.forEach((edge) => { edge.style.opacity = (0.25 + 0.75 * p).toFixed(3); });
  };

  if (part && !reduceMotion) {
    part.classList.add("part-on");
    partEdges = [...part.querySelectorAll(".part-edge")];
    initPart();
    // word widths shift once Fraunces arrives — measure again
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { initPart(); paintScrolled(); });
    }
  }

  /* ---------- unified scroll-scrubbed painting ---------- */
  const paintScrolled = () => {
    paintScrub();
    if (part && partItems.length) paintPart();
  };
  let scrubTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!scrubTicking) {
        scrubTicking = true;
        requestAnimationFrame(() => {
          paintScrolled();
          scrubTicking = false;
        });
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", () => {
    if (part && partItems.length) initPart();
    paintScrolled();
  });
  paintScrolled();

  /* ---------- cursor ring (gentle, heavily damped) ---------- */
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduceMotion) {
    const cursor = document.getElementById("cursor");
    let cx = -100, cy = -100, tx = cx, ty = cy;

    window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });

    (function followCursor() {
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(followCursor);
    })();

    document.querySelectorAll("a, button, summary").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- hero silk threads ----------
     A handful of slow sine-layered curves in champagne gold — deterministic,
     cheap to draw, perfectly smooth. The pointer adds a soft, heavily damped
     drift. Pauses off-screen; skipped for reduced motion or data-saver. */
  if (!reduceMotion && !saveData) {
    const canvas = document.getElementById("silk");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, running = false, rafId = 0;
    const THREADS = 11;
    const STEP = 10; // px between sampled points along each curve

    // damped pointer influence, normalised to [-1, 1]
    const drift = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const step = (now) => {
      const t = now * 0.00012; // very slow clock
      drift.x += (drift.tx - drift.x) * 0.02;
      drift.y += (drift.ty - drift.y) * 0.02;

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      for (let i = 0; i < THREADS; i++) {
        const f = i / (THREADS - 1);
        const baseY = h * (0.12 + 0.76 * f);
        const amp1 = 26 + 14 * Math.sin(i * 1.7);
        const amp2 = 12 + 6 * Math.cos(i * 2.3);
        const phase = i * 0.9;
        const alpha = 0.05 + 0.07 * Math.sin(f * Math.PI);

        ctx.strokeStyle = `rgba(168, 133, 59, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let x = -STEP; x <= w + STEP; x += STEP) {
          const y =
            baseY +
            Math.sin(x * 0.0021 + t * 7 + phase) * amp1 +
            Math.sin(x * 0.0047 - t * 4.5 + phase * 2) * amp2 +
            drift.y * 18 * Math.sin(f * Math.PI) +
            drift.x * 10 * Math.sin(x * 0.001 + phase);
          if (x === -STEP) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (running) rafId = requestAnimationFrame(step);
    };

    const heroIO = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        rafId = requestAnimationFrame(step);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    });

    canvas.parentElement.addEventListener(
      "pointermove",
      (e) => {
        const r = canvas.getBoundingClientRect();
        drift.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        drift.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      },
      { passive: true }
    );
    canvas.parentElement.addEventListener("pointerleave", () => {
      drift.tx = 0;
      drift.ty = 0;
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();
    heroIO.observe(canvas);
  }
})();
