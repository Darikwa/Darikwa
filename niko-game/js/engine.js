'use strict';
/* engine.js — tiny helpers, input, and gentle WebAudio for
   "Niko the Ninja That Could!". No dependencies, no build step. */

const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  // deterministic per-tile noise so grass speckles don't flicker
  hash: (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  },
};

/* ---------------- input ---------------- */
const Input = {
  keys: {},
  init() {
    addEventListener('keydown', (e) => {
      Input.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat && window.Game) Game.keydown(e.code);
    });
    addEventListener('keyup', (e) => { Input.keys[e.code] = false; });

    // touch buttons behave like held keys; tapping the action button also
    // acts as a key press
    document.querySelectorAll('.tbtn').forEach((btn) => {
      const code = btn.dataset.k;
      const down = (e) => {
        e.preventDefault();
        Input.keys[code] = true;
        if (window.Game) Game.keydown(code);
      };
      const up = (e) => { e.preventDefault(); Input.keys[code] = false; };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    });
  },
  axis() {
    let x = 0, y = 0;
    if (Input.keys.ArrowLeft || Input.keys.KeyA) x -= 1;
    if (Input.keys.ArrowRight || Input.keys.KeyD) x += 1;
    if (Input.keys.ArrowUp || Input.keys.KeyW) y -= 1;
    if (Input.keys.ArrowDown || Input.keys.KeyS) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y };
  },
};

/* ---------------- audio ----------------
   Gentle procedural sound: soft plucks on a pentatonic scale for music,
   little chirps and chimes for feedback. Starts on first user gesture. */
const Sfx = {
  ctx: null,
  muted: false,
  _musicTimer: null,

  ensure() {
    if (!Sfx.ctx) {
      try {
        Sfx.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { return; }
      Sfx._startMusic();
    }
    if (Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
  },

  toggleMute() {
    Sfx.muted = !Sfx.muted;
    return Sfx.muted;
  },

  tone(freq, dur = 0.2, type = 'sine', vol = 0.12, delay = 0) {
    if (!Sfx.ctx || Sfx.muted) return;
    const t0 = Sfx.ctx.currentTime + delay;
    const osc = Sfx.ctx.createOscillator();
    const gain = Sfx.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(Sfx.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  blip()   { Sfx.tone(660, 0.07, 'square', 0.04); },
  step()   { Sfx.tone(U.rand(180, 220), 0.05, 'sine', 0.03); },
  pop()    { Sfx.tone(880, 0.1, 'triangle', 0.08); Sfx.tone(1320, 0.12, 'sine', 0.05, 0.05); },
  tumble() { Sfx.tone(220, 0.15, 'sine', 0.1); Sfx.tone(140, 0.25, 'sine', 0.1, 0.1); },
  chime()  {
    [523, 659, 784, 1047].forEach((f, i) => Sfx.tone(f, 0.35, 'sine', 0.09, i * 0.09));
  },
  fanfare() {
    [523, 659, 784, 880, 1047, 1319].forEach((f, i) => Sfx.tone(f, 0.4, 'triangle', 0.09, i * 0.11));
  },
  sparkle() { Sfx.tone(U.rand(1200, 1800), 0.15, 'sine', 0.04); },

  _startMusic() {
    // A drifting pentatonic lullaby: soft koto-ish plucks, never insistent.
    const scale = [262, 294, 330, 392, 440, 523, 587];
    let beat = 0;
    Sfx._musicTimer = setInterval(() => {
      if (!Sfx.ctx || Sfx.muted || Sfx.ctx.state !== 'running') return;
      beat++;
      if (Math.random() < 0.62) {
        const f = U.pick(scale);
        Sfx.tone(f, 0.9, 'triangle', 0.028);
        if (Math.random() < 0.3) Sfx.tone(f * 1.5, 1.1, 'sine', 0.014, 0.18);
      }
      if (beat % 8 === 0) Sfx.tone(131, 1.6, 'sine', 0.02); // warm low root
    }, 640);
  },
};

/* ---------------- drawing helpers ---------------- */
function rr(ctx, x, y, w, h, r) {
  // rounded-rect path
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Draw a chibi storybook character. Niko's look (black hair, dark brown
   eyes, navy outfit, red sash) is locked by the Visual Style Bible. */
function drawPerson(ctx, x, y, o) {
  const h = o.h || 34;              // total height in px
  const w = h * 0.62;
  const bob = o.bob || 0;
  const headR = h * 0.30;
  const bodyH = h * 0.48;
  const by = y - bodyH + bob;       // body top (y = feet)

  ctx.save();
  // shadow
  ctx.fillStyle = 'rgba(40,60,40,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w * 0.55, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = o.outfit || '#22335f';
  rr(ctx, x - w / 2, by, w, bodyH + 2, w * 0.4);
  ctx.fill();
  // sash / belt
  if (o.sash) {
    ctx.fillStyle = o.sash;
    ctx.fillRect(x - w / 2, by + bodyH * 0.45, w, h * 0.10);
    // sash knot tail
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 2, by + bodyH * 0.5);
    ctx.lineTo(x + w / 2 + 5, by + bodyH * 0.75);
    ctx.lineTo(x + w / 2 - 1, by + bodyH * 0.7);
    ctx.fill();
  }
  if (o.apron) {
    ctx.fillStyle = o.apron;
    rr(ctx, x - w * 0.32, by + bodyH * 0.3, w * 0.64, bodyH * 0.62, 4);
    ctx.fill();
  }

  // head
  const hy = by - headR + 3 + bob * 0.4;
  ctx.fillStyle = o.skin || '#f7cfae';
  ctx.beginPath();
  ctx.arc(x, hy, headR, 0, Math.PI * 2);
  ctx.fill();

  // hair — a soft cap over the top of the head
  ctx.fillStyle = o.hair || '#1a1a22';
  ctx.beginPath();
  ctx.arc(x, hy - headR * 0.12, headR * 1.02, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  if (o.bun) { // little topknot (Akiko / Willow)
    ctx.beginPath();
    ctx.arc(x, hy - headR * 1.1, headR * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.beard) {
    ctx.fillStyle = o.beard;
    ctx.beginPath();
    ctx.ellipse(x, hy + headR * 0.75, headR * 0.55, headR * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // eyes — Niko's are always dark brown
  ctx.fillStyle = o.eyes || '#3a2418';
  const ey = hy + headR * 0.12;
  if (o.sleepy) {
    ctx.strokeStyle = o.eyes || '#3a2418';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.5, ey); ctx.lineTo(x - headR * 0.15, ey);
    ctx.moveTo(x + headR * 0.15, ey); ctx.lineTo(x + headR * 0.5, ey);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x - headR * 0.34, ey, headR * 0.13, 0, Math.PI * 2);
    ctx.arc(x + headR * 0.34, ey, headR * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  // rosy cheeks + smile
  ctx.fillStyle = 'rgba(240,130,120,.4)';
  ctx.beginPath();
  ctx.arc(x - headR * 0.55, ey + headR * 0.3, headR * 0.16, 0, Math.PI * 2);
  ctx.arc(x + headR * 0.55, ey + headR * 0.3, headR * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a4a3a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, ey + headR * 0.32, headR * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // headband (ninja kids)
  if (o.band) {
    ctx.fillStyle = o.band;
    ctx.fillRect(x - headR * 0.95, hy - headR * 0.42, headR * 1.9, headR * 0.3);
  }
  ctx.restore();
}

/* Biscuit the raccoon — the mischief is canonical. */
function drawRaccoon(ctx, x, y, bob = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(scale, scale);
  // shadow
  ctx.fillStyle = 'rgba(40,60,40,.25)';
  ctx.beginPath(); ctx.ellipse(0, 2, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  // striped tail
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#4a4a52' : '#8d8d99';
    ctx.beginPath();
    ctx.arc(11 + i * 3.4, -6 - i * 2.4, 5 - i * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  // body
  ctx.fillStyle = '#8d8d99';
  ctx.beginPath(); ctx.ellipse(0, -7, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.beginPath(); ctx.arc(-4, -15, 7, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = '#4a4a52';
  ctx.beginPath();
  ctx.arc(-8.5, -20.5, 2.6, 0, Math.PI * 2);
  ctx.arc(0.5, -20.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // mask
  ctx.fillStyle = '#3a3a42';
  ctx.beginPath(); ctx.ellipse(-4, -14.5, 6.4, 3, 0, 0, Math.PI * 2); ctx.fill();
  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-6.5, -14.5, 1.7, 0, Math.PI * 2);
  ctx.arc(-1.5, -14.5, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241a14';
  ctx.beginPath();
  ctx.arc(-6.5, -14.5, 0.9, 0, Math.PI * 2);
  ctx.arc(-1.5, -14.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  // snout
  ctx.fillStyle = '#d9d9e2';
  ctx.beginPath(); ctx.ellipse(-4, -11.5, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#241a14';
  ctx.beginPath(); ctx.arc(-4, -12.2, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawKitten(ctx, x, y, bob = 0) {
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = '#e8964f';
  ctx.beginPath(); ctx.ellipse(0, -5, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -12, 5.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); // ears
  ctx.moveTo(-4.5, -15); ctx.lineTo(-3, -19.5); ctx.lineTo(-0.8, -16);
  ctx.moveTo(4.5, -15); ctx.lineTo(3, -19.5); ctx.lineTo(0.8, -16);
  ctx.fill();
  // tail
  ctx.strokeStyle = '#e8964f'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(6, -4); ctx.quadraticCurveTo(12, -8, 10, -14); ctx.stroke();
  // face
  ctx.fillStyle = '#241a14';
  ctx.beginPath();
  ctx.arc(-2, -12.5, 0.8, 0, Math.PI * 2);
  ctx.arc(2, -12.5, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a55f2a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, -10.8, 1.4, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}
