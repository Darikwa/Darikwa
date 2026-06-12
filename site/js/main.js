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
  const splitTargets = document.querySelectorAll("[data-split]");
  splitTargets.forEach((el) => {
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
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal, [data-split]").forEach((el) => io.observe(el));

  /* ---------- reading progress bar ---------- */
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

  /* ---------- custom cursor + magnetic buttons ---------- */
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduceMotion) {
    const cursor = document.getElementById("cursor");
    let cx = -100, cy = -100, tx = cx, ty = cy;

    window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });

    (function followCursor() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate(${cx - 6}px, ${cy - 6}px)`;
      requestAnimationFrame(followCursor);
    })();

    document.querySelectorAll("a, button, summary").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });

    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 0.3;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- hero constellation ----------
     A drifting field of nodes linked when close — a small nod to the
     "neural" theme. Pauses off-screen, skipped entirely for reduced
     motion or data-saver. */
  if (!reduceMotion && !saveData) {
    const canvas = document.getElementById("field");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, nodes = [], running = false, rafId = 0;
    const pointer = { x: -1e4, y: -1e4 };
    const LINK = 130;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(110, Math.floor((w * h) / 16000));
      nodes = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }));
    };

    const step = () => {
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        // gentle pull toward the pointer
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 32000) {
          n.vx += dx * 0.00002;
          n.vy += dy * 0.00002;
        }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK) {
            ctx.strokeStyle = `rgba(216, 255, 61, ${0.14 * (1 - dist / LINK)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = "rgba(242, 239, 230, 0.5)";
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
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
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
      },
      { passive: true }
    );
    canvas.parentElement.addEventListener("pointerleave", () => {
      pointer.x = -1e4;
      pointer.y = -1e4;
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
