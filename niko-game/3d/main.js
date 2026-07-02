/* Niko's Big Secret — 3D visual-direction prototype.
   Kageyama at golden hour in a three-quarter 3D view, with articulated
   anime-styled characters built to the book's character guide: Niko (spiky
   hair, NIKO headband plate, wraps), Taro, Kiko, Sensei Willow (green haori),
   Momo the runaway chicken, and the grain-trail "bend with the wind" scene.
   Family-friendly by design (series-bible locked). */
import * as THREE from './lib/three.module.min.js';

/* ---------------- renderer / scene ---------------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5cfa8);           // golden-hour sky
scene.fog = new THREE.Fog(0xf2cfae, 55, 130);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300);

scene.add(new THREE.HemisphereLight(0xffe6c8, 0x8a9a5a, 0.9));
const sun = new THREE.DirectionalLight(0xffd9a0, 1.7);
sun.position.set(-24, 30, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0004;
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------------- toon materials ---------------- */
const gradient = new THREE.DataTexture(new Uint8Array([90, 160, 220, 255]), 4, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
const matCache = new Map();
function toon(color) {
  if (!matCache.has(color)) {
    matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
  }
  return matCache.get(color);
}
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/* ---------------- world ---------------- */
const colliders = [];
function addCollider(cx, cz, w, d) {
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

const ground = mesh(new THREE.PlaneGeometry(150, 150), toon(0x8fc27c), 0, 0, 0, false);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

function path(cx, cz, w, d) {
  const p = mesh(new THREE.PlaneGeometry(w, d), toon(0xe0c28c), cx, 0.02, cz, false);
  p.rotation.x = -Math.PI / 2;
  scene.add(p);
}
path(-9, -2, 22, 3);      // home -> centre
path(0, -11, 3, 22);      // centre -> academy
path(12, 0, 30, 3);       // centre -> market & bridge
path(-1, 9, 3, 18);       // centre -> training yard
path(-9, 8, 14, 3);       // centre -> bakery
path(38, 0, 14, 3);       // meadow path
path(11, 5, 14, 10);      // the marketplace square

// river + bridge
const waves = [];
const riverX = 29, riverW = 6;
{
  const water = new THREE.Mesh(new THREE.PlaneGeometry(riverW, 150), new THREE.MeshToonMaterial({ color: 0x6db3d6, gradientMap: gradient }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(riverX, 0.03, 0);
  water.receiveShadow = true;
  scene.add(water);
  for (let i = 0; i < 14; i++) {
    const wv = mesh(new THREE.PlaneGeometry(1.6, 0.12), toon(0xbfe6f5), riverX + (Math.random() - 0.5) * 4, 0.05, -40 + Math.random() * 80, false);
    wv.rotation.x = -Math.PI / 2;
    wv.userData.speed = 1.2 + Math.random();
    waves.push(wv);
    scene.add(wv);
  }
  addCollider(riverX, -21.6, riverW + 1, 38.8);
  addCollider(riverX, 21.6, riverW + 1, 38.8);
  const deck = mesh(new THREE.BoxGeometry(riverW + 3, 0.25, 4), toon(0xb98a5a), riverX, 0.22, 0);
  scene.add(deck);
  for (const side of [-1, 1]) {
    scene.add(mesh(new THREE.BoxGeometry(riverW + 3, 0.1, 0.12), toon(0x8a6a4a), riverX, 0.95, side * 1.9));
    for (let i = -2; i <= 2; i++) scene.add(mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), toon(0x8a6a4a), riverX + i * 2, 0.55, side * 1.9));
  }
}

function makeSign(text, x, y, z, scale = 1) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 96;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(255,248,236,.95)';
  g.beginPath(); g.roundRect(4, 4, 504, 88, 40); g.fill();
  g.strokeStyle = '#d9b98c'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#6b4a2f';
  g.font = 'bold 44px "Comic Sans MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true }));
  sp.scale.set(5.4 * scale, 1.0 * scale, 1);
  sp.position.set(x, y + 0.8, z);
  scene.add(sp);
}

function house(cx, cz, w, d, h, wallC, roofC, name, twoTier) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.add(mesh(new THREE.BoxGeometry(w, h, d), toon(wallC), 0, h / 2, 0));
  const roof = mesh(new THREE.ConeGeometry(1, h * 0.7, 4), toon(roofC), 0, h + h * 0.35, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w * 0.85, 1, d * 0.85);
  g.add(roof);
  if (twoTier) {
    const r2 = mesh(new THREE.ConeGeometry(1, h * 0.5, 4), toon(roofC), 0, h + h * 0.85, 0);
    r2.rotation.y = Math.PI / 4;
    r2.scale.set(w * 0.5, 1, d * 0.5);
    g.add(r2);
  }
  g.add(mesh(new THREE.BoxGeometry(1.1, 1.8, 0.1), toon(0x7a5a3a), 0, 0.9, d / 2 + 0.03));
  const win = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.7, 0.06), win, -w / 4, h * 0.55, d / 2 + 0.03, false));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.7, 0.06), win, w / 4, h * 0.55, d / 2 + 0.03, false));
  scene.add(g);
  addCollider(cx, cz, w + 0.6, d + 0.6);
  if (name) makeSign(name, cx, h + h * 0.85 + (twoTier ? h * 0.4 : 0), cz);
  return g;
}

house(-20, -8, 8, 6, 3.2, 0xf3e6d0, 0xc0574f, 'Home');
house(-16, 11, 6, 5, 3.0, 0xf7e9d4, 0xe0985a, "Hana's Bakery");
house(17, 14, 6, 5, 3.0, 0xe8d9c0, 0x8a6a4a, "Daichi's Workshop");
house(2, -25, 13, 7, 4.2, 0xf3e6d0, 0x22335f, 'Ninja Academy', true);

// marketplace stalls (Momo's favourite disaster zone)
function stall(cx, cz, canopyC) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.add(mesh(new THREE.BoxGeometry(2.6, 0.9, 1.2), toon(0xb98a5a), 0, 0.45, 0));
  for (const [px, pz] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6), toon(0x8a6a4a), px, 1.05, pz));
  }
  const canopy = mesh(new THREE.ConeGeometry(1, 0.55, 4), toon(canopyC), 0, 2.35, 0);
  canopy.rotation.y = Math.PI / 4;
  canopy.scale.set(1.8, 1, 1.1);
  g.add(canopy);
  // produce
  for (let i = 0; i < 5; i++) {
    g.add(mesh(new THREE.SphereGeometry(0.16, 8, 8), toon([0xe8964f, 0x7fb069, 0xd0342c][i % 3]), -0.9 + i * 0.45, 1.02, 0));
  }
  scene.add(g);
  addCollider(cx, cz, 3, 1.6);
  return g;
}
stall(7, 3, 0xd0342c);
stall(13, 7, 0x7fb069);
const GRAIN_STALL = { x: 10, z: 1.2 };
stall(10, 0, 0xe0985a);
makeSign('grain!', GRAIN_STALL.x, 2.6, GRAIN_STALL.z - 1, 0.6);

// Momo's crate (open lid until the plan works)
const crate = new THREE.Group();
crate.position.set(16, 0, 3.5);
{
  const wood = toon(0xa3764a);
  crate.add(mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), wood, 0, 0.06, 0));
  // slatted walls, like the book — so Momo stays visible once she's home
  for (const y of [0.3, 0.62]) {
    for (const [px, pz] of [[-0.65, 0], [0.65, 0], [0, -0.65], [0, 0.65]]) {
      crate.add(mesh(new THREE.BoxGeometry(px === 0 ? 1.4 : 0.09, 0.13, px === 0 ? 0.09 : 1.4), wood, px, y, pz));
    }
  }
  for (const [px, pz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) {
    crate.add(mesh(new THREE.BoxGeometry(0.1, 0.72, 0.1), wood, px, 0.36, pz));
  }
  const lid = mesh(new THREE.BoxGeometry(1.5, 0.08, 1.5), toon(0x8a6a4a), 0, 0.74, -0.72);
  lid.geometry.translate(0, 0, 0.72);
  lid.rotation.x = -2.2; // propped open
  crate.userData.lid = lid;
  crate.add(lid);
  scene.add(crate);
  addCollider(16, 3.5, 1.7, 1.7);
  makeSign("Momo's crate", 16, 1.6, 3.5, 0.7);
}

function tree(x, z, s = 1, sakura = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 2.4 * s, 7), toon(0x7a5a3a), 0, 1.2 * s, 0));
  const leaf = toon(sakura ? 0xf5a3c0 : 0x5d8a4a);
  const blobs = sakura
    ? [[0, 3.4, 0, 1.5], [-1.2, 2.7, 0.3, 1.05], [1.2, 2.7, -0.3, 1.05], [0, 2.9, 1.0, 0.9], [0.2, 2.9, -1.1, 0.9]]
    : [[0, 3.0, 0, 1.1], [-0.7, 2.4, 0.2, 0.8], [0.7, 2.4, -0.2, 0.8]];
  for (const [bx, by, bz, br] of blobs) g.add(mesh(new THREE.SphereGeometry(br, 12, 10), leaf, bx * s, by * s, bz * s));
  scene.add(g);
  addCollider(x, z, 1.1 * s, 1.1 * s);
}
tree(4, -3, 1.6, true);
tree(42, -4, 2.1, true);
[[-28, 2], [-26, -16], [-10, -20], [20, -12], [24, 12], [-24, 16], [8, 20], [22, 20], [-6, 24],
 [36, 12], [44, 6], [38, -14], [-32, -8], [-14, 20], [24, -20], [-30, 22], [12, 26],
].forEach(([x, z]) => tree(x, z, 0.9 + ((x * 7 + z * 13) % 10) / 22));
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2;
  tree(Math.cos(a) * (49 + (i % 3) * 2.4), Math.sin(a) * (42 + (i % 4) * 2.2), 1.2 + (i % 3) * 0.24);
}

// red paper lanterns, like the book cover
[[-8, -4], [4, -10], [-12, 6], [8, 8.5], [0, 4], [18, 1], [24.5, -3], [-4, -16]].forEach(([x, z], i) => {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6), toon(0x5a4a3a), 0, 1.2, 0));
  const paper = mesh(new THREE.SphereGeometry(0.34, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff5a3c }), 0, 2.6, 0, false);
  paper.scale.y = 1.15;
  g.add(paper);
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 8), toon(0x3a2e2a), 0, 3.02, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), toon(0x3a2e2a), 0, 2.2, 0));
  if (i % 2 === 0) {
    const pl = new THREE.PointLight(0xff8a5a, 7, 9);
    pl.position.set(0, 2.6, 0);
    g.add(pl);
  }
  scene.add(g);
  addCollider(x, z, 0.5, 0.5);
});

// training beam
{
  const g = new THREE.Group();
  g.position.set(-2, 0, 18);
  g.add(mesh(new THREE.BoxGeometry(6, 0.25, 0.4), toon(0xb98a5a), 0, 0.9, 0));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), toon(0x8a6a4a), -2.7, 0.45, 0));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), toon(0x8a6a4a), 2.7, 0.45, 0));
  scene.add(g);
  addCollider(-2, 18, 6.4, 0.9);
}

// wildflowers
{
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillStyle = '#f5a3c0';
    g.beginPath(); g.arc(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14, 11, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#f7d060';
  g.beginPath(); g.arc(32, 32, 9, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(cv);
  const im = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    420,
  );
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const S = new THREE.Vector3();
  for (let i = 0; i < 420; i++) {
    const s = 0.6 + Math.random() * 0.8;
    S.set(s, s, s);
    M.compose(new THREE.Vector3((Math.random() - 0.5) * 96, 0.04, (Math.random() - 0.5) * 80), Q, S);
    im.setMatrixAt(i, M);
  }
  scene.add(im);
}

// falling petals
const PETALS = 240;
const petalMesh = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(0.16, 0.1),
  new THREE.MeshBasicMaterial({ color: 0xf8aac8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  PETALS,
);
const petals = [];
for (let i = 0; i < PETALS; i++) {
  petals.push({
    x: (Math.random() - 0.5) * 90, y: Math.random() * 14, z: (Math.random() - 0.5) * 80,
    ph: Math.random() * 6.28, vy: 0.5 + Math.random() * 0.7,
  });
}
scene.add(petalMesh);

/* ---------------- anime faces ---------------- */
function faceTexture(open, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const eyeY = 128, dx = 52;
  for (const s of [-1, 1]) {
    const ex = 128 + s * dx;
    if (open) {
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(ex, eyeY, 27, 34, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = opts.eye || '#3a2418';
      g.beginPath(); g.ellipse(ex, eyeY + 4, 20, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1008';
      g.beginPath(); g.ellipse(ex, eyeY + 6, 10, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath(); g.arc(ex - 7, eyeY - 8, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ex + 8, eyeY + 12, 3.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#241a14'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.ellipse(ex, eyeY - 2, 28, 34, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    } else {
      g.strokeStyle = '#241a14'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.arc(ex, eyeY + 4, 22, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }
    g.strokeStyle = opts.brow || '#241a14'; g.lineWidth = 6;
    g.beginPath(); g.arc(ex, eyeY - 18, 26, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    if (opts.blush !== false) {
      g.fillStyle = 'rgba(240,130,120,.4)';
      g.beginPath(); g.ellipse(ex + s * 14, eyeY + 44, 16, 9, 0, 0, Math.PI * 2); g.fill();
    }
  }
  g.strokeStyle = '#8a4a3a'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(128, 178, 16, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function plateTexture(text) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#cfd6e2';
  g.beginPath(); g.roundRect(2, 2, 124, 60, 14); g.fill();
  g.strokeStyle = '#8a94a8'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#22335f';
  g.font = 'bold 30px "Comic Sans MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------------- character factory ---------------- */
function capsule(r, len, mat) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 10), mat);
}

function makePerson(cfg) {
  const h = cfg.h;
  const skin = toon(cfg.skin || 0xf7cfae);
  const cloth = toon(cfg.outfit);
  const hairM = toon(cfg.hair);
  const wraps = cfg.wraps ? toon(cfg.wraps) : null; // white shin/forearm bandages

  const root = new THREE.Group();
  const hipY = 0.48 * h, thighL = 0.24 * h, shinL = 0.2 * h;
  const torsoH = 0.32 * h, headR = 0.16 * h;
  const shoulderX = 0.15 * h;

  const pelvis = new THREE.Group();
  pelvis.position.y = hipY;
  root.add(pelvis);

  const torso = capsule(0.13 * h, torsoH * 0.62, cloth);
  torso.position.y = torsoH * 0.55;
  torso.castShadow = true;
  pelvis.add(torso);
  if (cfg.sash) {
    pelvis.add(mesh(new THREE.CylinderGeometry(0.135 * h, 0.135 * h, 0.07 * h, 12), toon(cfg.sash), 0, torsoH * 0.34, 0));
    pelvis.add(mesh(new THREE.BoxGeometry(0.05 * h, 0.14 * h, 0.02 * h), toon(cfg.sash), 0.1 * h, torsoH * 0.22, -0.1 * h));
    // knot at the front, like the book art
    pelvis.add(mesh(new THREE.SphereGeometry(0.035 * h, 8, 8), toon(cfg.sash), 0, torsoH * 0.34, 0.125 * h));
  }
  if (cfg.skirt) {
    pelvis.add(mesh(new THREE.ConeGeometry(0.2 * h, 0.42 * h, 12, 1, true), toon(cfg.skirt), 0, -0.06 * h, 0));
  }
  if (cfg.haori) { // open over-jacket (Sensei Willow's green haori)
    const hao = mesh(new THREE.CylinderGeometry(0.155 * h, 0.175 * h, torsoH * 0.95, 12, 1, true), toon(cfg.haori), 0, torsoH * 0.52, 0);
    pelvis.add(hao);
  }
  if (cfg.apron) {
    pelvis.add(mesh(new THREE.BoxGeometry(0.16 * h, 0.3 * h, 0.02 * h), toon(cfg.apron), 0, torsoH * 0.35, 0.125 * h));
  }

  const headG = new THREE.Group();
  headG.position.y = torsoH + headR * 0.7;
  pelvis.add(headG);
  const head = mesh(new THREE.SphereGeometry(headR, 18, 16), skin, 0, headR * 0.4, 0);
  headG.add(head);
  const faceOpen = faceTexture(true, cfg.face);
  const faceClosed = faceTexture(false, cfg.face);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(headR * 1.9, headR * 1.9),
    new THREE.MeshBasicMaterial({ map: faceOpen, transparent: true }),
  );
  face.position.set(0, headR * 0.34, headR * 0.88);
  headG.add(face);

  // hair
  const cap = mesh(new THREE.SphereGeometry(headR * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * (cfg.style === 'bob' ? 0.78 : 0.62)), hairM, 0, headR * 0.48, -headR * 0.12);
  headG.add(cap);
  if (cfg.style === 'spiky') {
    // the book's big wind-blown spikes
    const spikes = [[-0.6, 1.3, 0, -0.55], [-0.3, 1.5, -0.1, -0.25], [0, 1.6, -0.15, 0], [0.3, 1.5, -0.1, 0.25], [0.6, 1.3, 0, 0.55], [-0.45, 1.2, -0.5, -0.4], [0.45, 1.2, -0.5, 0.4]];
    for (const [sx, sy, sz, tilt] of spikes) {
      const sp = mesh(new THREE.ConeGeometry(headR * 0.26, headR * 0.9, 6), hairM, sx * headR, sy * headR, sz * headR - headR * 0.1);
      sp.rotation.z = -tilt * 1.3;
      headG.add(sp);
    }
  } else if (cfg.style === 'bun') {
    headG.add(mesh(new THREE.SphereGeometry(headR * 0.42, 10, 8), hairM, 0, headR * 1.2, -headR * 0.7));
  } else if (cfg.style === 'topknot') {
    headG.add(mesh(new THREE.CylinderGeometry(headR * 0.12, headR * 0.16, headR * 0.5, 8), hairM, 0, headR * 1.5, 0));
    headG.add(mesh(new THREE.SphereGeometry(headR * 0.26, 10, 8), hairM, 0, headR * 1.8, 0));
  }
  if (cfg.longHair) { // Willow's long white hair down the back
    const back = mesh(new THREE.CapsuleGeometry(headR * 0.35, headR * 1.6, 3, 8), hairM, 0, -headR * 0.3, -headR * 0.85);
    headG.add(back);
  }
  if (cfg.beard) {
    const beard = mesh(new THREE.ConeGeometry(headR * 0.5, headR * 2.0, 8), toon(cfg.beard), 0, -headR * 0.85, headR * 0.3);
    headG.add(beard);
  }
  if (cfg.band) {
    headG.add(mesh(new THREE.CylinderGeometry(headR * 1.02, headR * 1.02, headR * 0.26, 16, 1, true), toon(cfg.band), 0, headR * 0.5, 0));
    // trailing headband tails
    const tail = mesh(new THREE.BoxGeometry(headR * 0.16, headR * 0.8, headR * 0.03), toon(cfg.band), headR * 0.75, headR * 0.15, -headR * 0.7);
    tail.rotation.z = 0.4;
    headG.add(tail);
  }
  if (cfg.plate) { // the silver NIKO forehead plate
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(headR * 1.0, headR * 0.5), new THREE.MeshBasicMaterial({ map: plateTexture(cfg.plate), transparent: true }));
    pl.position.set(0, headR * 0.52, headR * 1.04);
    headG.add(pl);
  }

  function limb(px, py, upperLen, lowerLen, r, upperMat, lowerMat, endMat, isLeg) {
    const j1 = new THREE.Group();
    j1.position.set(px, py, 0);
    const upper = capsule(r, upperLen * 0.7, upperMat);
    upper.position.y = -upperLen / 2;
    upper.castShadow = true;
    j1.add(upper);
    const j2 = new THREE.Group();
    j2.position.y = -upperLen;
    j1.add(j2);
    const lower = capsule(r * 0.85, lowerLen * 0.7, lowerMat);
    lower.position.y = -lowerLen / 2;
    lower.castShadow = true;
    j2.add(lower);
    let end;
    if (isLeg) {
      end = mesh(new THREE.BoxGeometry(r * 2.4, r * 1.3, r * 3.6), endMat, 0, -lowerLen, r * 0.8);
    } else {
      end = mesh(new THREE.SphereGeometry(r * 1.15, 8, 8), endMat, 0, -lowerLen, 0);
    }
    j2.add(end);
    return [j1, j2];
  }
  const armR = 0.032 * h, legR = 0.04 * h;
  const foreM = wraps || skin;
  const shinM = wraps || cloth;
  const [shL, elL] = limb(-shoulderX, torsoH * 0.88, 0.17 * h, 0.15 * h, armR, cloth, foreM, skin, false);
  const [shR, elR] = limb(shoulderX, torsoH * 0.88, 0.17 * h, 0.15 * h, armR, cloth, foreM, skin, false);
  pelvis.add(shL, shR);
  const [hpL, knL] = limb(-0.07 * h, 0, thighL, shinL, legR, cloth, shinM, toon(0x3a2e2a), true);
  const [hpR, knR] = limb(0.07 * h, 0, thighL, shinL, legR, cloth, shinM, toon(0x3a2e2a), true);
  pelvis.add(hpL, hpR);

  root.userData = {
    h, pelvis, headG, face, faceOpen, faceClosed, torso,
    shL, shR, elL, elR, hpL, hpR, knL, knR,
    phase: Math.random() * 6, walk: 0, talk: 0, t: Math.random() * 10,
    blinkT: 1 + Math.random() * 3, blinking: 0,
  };
  scene.add(root);
  return root;
}

function animatePerson(p, dt, speed01) {
  const u = p.userData;
  u.t += dt;
  u.walk = THREE.MathUtils.lerp(u.walk, speed01, 1 - Math.pow(0.001, dt));
  const w = u.walk;
  u.phase += dt * (4 + 6 * w) * (w > 0.02 ? 1 : 0);
  const s = Math.sin(u.phase), c = Math.sin(u.phase + Math.PI);

  u.shL.rotation.x = s * 0.65 * w + Math.sin(u.t * 1.3) * 0.04 * (1 - w);
  u.shR.rotation.x = c * 0.65 * w + Math.sin(u.t * 1.5) * 0.04 * (1 - w);
  u.shL.rotation.z = 0.09 + w * 0.06;
  u.shR.rotation.z = -0.09 - w * 0.06;
  u.elL.rotation.x = -(0.25 + Math.max(0, -s) * 0.6 * w);
  u.elR.rotation.x = -(0.25 + Math.max(0, -c) * 0.6 * w);
  u.hpL.rotation.x = c * 0.7 * w;
  u.hpR.rotation.x = s * 0.7 * w;
  u.knL.rotation.x = Math.max(0, -c) * 1.1 * w;
  u.knR.rotation.x = Math.max(0, -s) * 1.1 * w;
  u.pelvis.position.y = 0.48 * u.h + Math.abs(Math.sin(u.phase)) * 0.028 * u.h * w;
  u.pelvis.rotation.x = 0.1 * w;
  u.pelvis.rotation.z = Math.sin(u.phase) * 0.03 * w;

  const br = 1 + Math.sin(u.t * 2.1) * 0.015 * (1 - w);
  u.torso.scale.set(br, 1, br);
  u.headG.rotation.y = Math.sin(u.t * 0.4) * 0.08 * (1 - w);
  u.headG.rotation.x = 0;

  if (u.talk > 0.01) {
    u.headG.rotation.x = Math.sin(u.t * 7) * 0.06 * u.talk;
    u.shR.rotation.x = THREE.MathUtils.lerp(u.shR.rotation.x, -1.5, u.talk * 0.7);
    u.elR.rotation.x = THREE.MathUtils.lerp(u.elR.rotation.x, -0.5 + Math.sin(u.t * 8) * 0.25, u.talk * 0.7);
  }

  u.blinkT -= dt;
  if (u.blinkT <= 0) { u.blinking = 0.13; u.blinkT = 1.6 + Math.random() * 3.4; u.face.material.map = u.faceClosed; }
  if (u.blinking > 0) {
    u.blinking -= dt;
    if (u.blinking <= 0) u.face.material.map = u.faceOpen;
  }
}

/* ---------------- Biscuit the raccoon ---------------- */
function makeBiscuit() {
  const g = new THREE.Group();
  const grey = toon(0x8d8d99), dark = toon(0x4a4a52);
  const body = mesh(new THREE.SphereGeometry(0.32, 12, 10), grey, 0, 0.34, 0);
  body.scale.set(1, 0.85, 1.25);
  g.add(body);
  const headG = new THREE.Group();
  headG.position.set(0, 0.52, 0.34);
  g.add(headG);
  headG.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), grey));
  const maskM = mesh(new THREE.SphereGeometry(0.19, 12, 10), dark, 0, 0.01, 0.045);
  maskM.scale.set(1.04, 0.5, 1);
  headG.add(maskM);
  for (const s of [-1, 1]) {
    headG.add(mesh(new THREE.ConeGeometry(0.06, 0.12, 6), dark, s * 0.12, 0.2, -0.02));
    headG.add(mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.08, 0.02, 0.17, false));
    headG.add(mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0x241a14 }), s * 0.08, 0.02, 0.2, false));
  }
  headG.add(mesh(new THREE.SphereGeometry(0.045, 8, 8), toon(0x241a14), 0, -0.05, 0.19));
  const tail = new THREE.Group();
  tail.position.set(0, 0.42, -0.36);
  g.add(tail);
  for (let i = 0; i < 4; i++) {
    tail.add(mesh(new THREE.SphereGeometry(0.11 - i * 0.018, 8, 8), i % 2 ? dark : grey, 0, i * 0.11, -i * 0.09));
  }
  const legs = [];
  for (const [lx, lz] of [[-0.16, 0.2], [0.16, 0.2], [-0.16, -0.2], [0.16, -0.2]]) {
    const leg = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), dark, lx, 0.1, lz);
    legs.push(leg);
    g.add(leg);
  }
  g.userData = { tail, legs, headG, phase: 0 };
  scene.add(g);
  return g;
}

/* ---------------- Momo the chicken ---------------- */
function makeMomo() {
  const g = new THREE.Group();
  const white = toon(0xf5f5f0);
  const body = mesh(new THREE.SphereGeometry(0.3, 12, 10), white, 0, 0.38, 0);
  body.scale.set(0.9, 0.95, 1.15);
  g.add(body);
  // tail feather fan
  for (let i = -1; i <= 1; i++) {
    const f = mesh(new THREE.ConeGeometry(0.09, 0.42, 6), white, i * 0.08, 0.58, -0.32);
    f.rotation.x = 0.9;
    f.rotation.z = i * 0.35;
    g.add(f);
  }
  // wings
  const wings = [];
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.SphereGeometry(0.16, 8, 8), white, s * 0.26, 0.42, 0);
    w.scale.set(0.4, 0.8, 1.1);
    wings.push(w);
    g.add(w);
  }
  // neck + head
  const neck = new THREE.Group();
  neck.position.set(0, 0.55, 0.22);
  g.add(neck);
  neck.add(mesh(new THREE.SphereGeometry(0.16, 10, 8), white, 0, 0.18, 0.06));
  // comb
  for (let i = 0; i < 3; i++) {
    neck.add(mesh(new THREE.SphereGeometry(0.05, 6, 6), toon(0xd0342c), 0, 0.34 - i * 0.02, 0.02 - i * 0.06));
  }
  // beak + wattle + eyes
  neck.add(mesh(new THREE.ConeGeometry(0.05, 0.14, 6), toon(0xe8b830), 0, 0.16, 0.22).rotateX(Math.PI / 2));
  neck.add(mesh(new THREE.SphereGeometry(0.035, 6, 6), toon(0xd0342c), 0, 0.08, 0.18));
  for (const s of [-1, 1]) {
    neck.add(mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x241a14 }), s * 0.09, 0.2, 0.12, false));
  }
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 5), toon(0xe8964f), s * 0.09, 0.11, 0.02);
    legs.push(leg);
    g.add(leg);
  }
  g.userData = { neck, wings, legs, phase: 0, state: 'loose', wanderT: 0, target: new THREE.Vector3(10, 0, 4), fleeT: 0, peckI: 0, peckT: 0 };
  scene.add(g);
  return g;
}

/* ---------------- cast (to the book's character guide) ---------------- */
const player = makePerson({
  h: 1.18, hair: 0x14141c, outfit: 0x27355c, sash: 0xd0342c, band: 0xd0342c,
  wraps: 0xf0f0f2, plate: 'NIKO', style: 'spiky', face: { eye: '#31210f' },
});
player.position.set(-14, 0, -4);
let heading = Math.PI;

const NPCS = [
  { id: 'hana', name: 'Hana', x: -16, z: -4.5, cfg: { h: 1.62, hair: 0x4a3423, outfit: 0xb06485, skirt: 0xb06485, apron: 0xfff3e0, style: 'bun', face: { eye: '#4a3020' } } },
  { id: 'daichi', name: 'Daichi', x: 15, z: 10.8, cfg: { h: 1.78, hair: 0x2a2a30, outfit: 0x5a6e4a, band: 0x8a6a4a, style: 'spiky', skin: 0xeab88a, face: { eye: '#3a2418', blush: false } } },
  { id: 'akiko', name: 'Akiko', x: -3.5, z: 16.4, cfg: { h: 1.5, hair: 0x1a1a22, outfit: 0x334d80, sash: 0xe0985a, style: 'topknot', face: { eye: '#3a2418' } } },
  { id: 'willow', name: 'Sensei Willow', x: 2, z: -20, cfg: { h: 1.62, hair: 0xe8e8ee, outfit: 0x3a3a4a, haori: 0x7a9a5a, skirt: 0x3a3a4a, sash: 0xb03a2c, beard: 0xe8e8ee, longHair: true, style: 'topknot', face: { eye: '#3a3040', blush: false } } },
  { id: 'taro', name: 'Taro', x: 6.5, z: 5.5, cfg: { h: 1.16, hair: 0xe8e8f0, outfit: 0x27355c, sash: 0xd0342c, band: 0x334d80, wraps: 0xf0f0f2, style: 'spiky', face: { eye: '#3a2418' } } },
  { id: 'kiko', name: 'Kiko', x: 13, z: 3.5, cfg: { h: 1.12, hair: 0x241a20, outfit: 0x27355c, sash: 0xd0342c, band: 0xf5a3c0, wraps: 0xf0f0f2, style: 'bob', face: { eye: '#33261a' } } },
];
NPCS.forEach((n) => {
  n.obj = makePerson(n.cfg);
  n.obj.position.set(n.x, 0, n.z);
  n.obj.rotation.y = Math.random() * 6.28;
});

let biscuit = null;
const momo = makeMomo();
momo.position.set(10, 0, 4);
momo.visible = false;

/* ---------------- story state ---------------- */
// phases: family -> chaos -> lesson -> grain -> trail -> caught
const S = { warmth: 0, met: {}, family: 0, phase: 'family', nearMiss: 0, grain: false };
const objTitle = document.getElementById('obj-title');
const objText = document.getElementById('obj-text');
const warmthN = document.getElementById('warmth-n');
const toastEl = document.getElementById('toast');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.style.display = 'none'; }, 3500);
}
function addWarmth(n, why) {
  S.warmth += n;
  warmthN.textContent = S.warmth;
  toast(`+${n} 🌸 ${why}`);
  Sfx.chime();
}
function objective(title, t) { objTitle.textContent = title; objText.textContent = t; }

/* ---------------- dialogue ---------------- */
const dlg = document.getElementById('dialog');
const dlgName = document.getElementById('dlg-name');
const dlgText = document.getElementById('dlg-text');
const D = { queue: [], npc: null, chars: 0, full: '' };

function say(npc, lines, onDone) {
  D.queue = lines.slice();
  D.npc = npc;
  D.onDone = onDone;
  dlg.style.display = 'block';
  nextLine();
}
function nextLine() {
  const line = D.queue.shift();
  if (!line) {
    dlg.style.display = 'none';
    if (D.npc) D.npc.obj.userData.talk = 0;
    const cb = D.onDone;
    D.npc = null; D.onDone = null;
    if (cb) cb();
    return;
  }
  dlgName.textContent = line[0];
  D.full = line[1];
  D.chars = 0;
  dlgText.textContent = '';
  if (D.npc) D.npc.obj.userData.talk = line[0] === D.npc.name ? 1 : 0;
  Sfx.blip();
}
function advance() {
  if (D.chars < D.full.length) { D.chars = D.full.length; dlgText.textContent = D.full; return; }
  nextLine();
}
dlg.addEventListener('click', advance);

/* ---------------- story dialogue ---------------- */
function talkTo(npc) {
  const first = !S.met[npc.id];
  S.met[npc.id] = true;
  const seq = linesFor(npc, first);
  say(npc, seq.lines, seq.after);
}

function linesFor(npc, first) {
  const ph = S.phase;
  switch (npc.id) {
    case 'hana':
      return { lines: first ? [
        ['Hana', 'Niko! Off to training? Here — a warm roll for the road, little blossom.'],
        ['Niko', 'Thanks, Mama! Today I’m going to be a REAL ninja. Probably. Maybe!'],
      ] : [['Hana', 'A strong ninja helps others rise. And eats breakfast!']], after: familyCheck(first) };
    case 'daichi':
      return { lines: first ? [
        ['Daichi', 'Ho, Niko! Remember: big things are built one piece at a time.'],
        ['Niko', 'Even… big brave feelings, Papa?'],
        ['Daichi', 'ESPECIALLY those.'],
      ] : [['Daichi', 'Measure twice, be kind always.']], after: familyCheck(first) };
    case 'akiko':
      return { lines: first ? [
        ['Akiko', 'Little brother! Watch the training yard today — Taro and Kiko are showing off again.'],
        ['Akiko', 'And if something goes wobbly… let’s try one more time. Family magic spell.'],
      ] : [['Akiko', 'One more time. It works on everything.']], after: familyCheck(first) };
    case 'taro':
      if (ph === 'chaos') return { lines: [
        ['Taro', 'I lunged at her and landed face-first in the VEGETABLES, Niko.'],
        ['Taro', 'She’s too fast! Strength isn’t working. This is embarrassing.'],
      ] };
      if (ph === 'caught' || ph === 'done') return { lines: [['Taro', 'How’d you DO that?! No flips, no shouting… teach me the quiet way, Niko.']] };
      return { lines: first ? [
        ['Taro', 'Watch me throw my ninja star, Niko! Bullseye. Every. Time.'],
        ['Niko', '(One day I’ll hit the target too. Today the target is safe.)'],
      ] : [['Taro', 'Yeah, but can you flip yet?']] };
    case 'kiko':
      if (ph === 'chaos') return { lines: [
        ['Kiko', 'I flipped RIGHT in front of her and she jumped over my head. A chicken, Niko. Over. My. Head.'],
      ] };
      if (ph === 'caught' || ph === 'done') return { lines: [['Kiko', 'Whoa. I can’t even do that. The grain trail? Genius.']] };
      return { lines: first ? [
        ['Kiko', 'Maybe you should sit this one out, Niko… I mean, the posts are pretty high.'],
        ['Niko', '(Maybe I can’t do it yet. YET.)'],
      ] : [['Kiko', 'Race you around the blossom tree!']] };
    case 'willow':
      if (ph === 'chaos') return { lines: [
        ['Sensei Willow', '…Interesting. Everyone chases the chicken, and the chicken wins.'],
        ['Sensei Willow', 'Tell me, Niko: what does a tree do when the wind blows?'],
        ['Niko', 'Uh… it sways?'],
        ['Sensei Willow', 'Exactly. It does not fight the wind. It bends with it. Watch Momo. See her pattern. Then guide her — do not chase her.'],
        ['Sensei Willow', 'There is grain at the market stall. A patient trail beats a fast lunge… every time.'],
      ], after: () => { S.phase = 'grain'; objective('Chapter 4 · Niko Takes Action', 'Take some grain from the market stall (it has a little sign!).'); } };
      if (ph === 'caught' || ph === 'done') return { lines: [
        ['Sensei Willow', 'Strength is not just muscles, Niko. It is thinking, observing, and acting when the time is right.'],
        ['Niko', 'So… I don’t have to fight to be a ninja?'],
        ['Sensei Willow', 'Not at all. There are many kinds of ninjas. You have found your own way. …Interesting, isn’t it?'],
      ], after: () => {
        if (S.phase === 'caught') { S.phase = 'done'; addWarmth(6, 'Willow’s lesson, learned.'); objective('Kageyama at golden hour', 'Explore! Cross the bridge to the great cherry tree. (Full story: the 2D slice.)'); }
      } };
      return { lines: first ? [
        ['Sensei Willow', '…Interesting. A small ninja with a big heart. Kageyama has been waiting for you.'],
      ] : [['Sensei Willow', 'A biscuit hidden is a biscuit twice enjoyed.']] };
  }
}

function familyCheck(first) {
  if (!first) return null;
  return () => {
    S.family++;
    if (S.family === 3 && S.phase === 'family') {
      biscuit = makeBiscuit();
      biscuit.position.copy(player.position).add(new THREE.Vector3(1.5, 0, 1));
      addWarmth(8, 'The whole family! (Biscuit joined you)');
      startChaos();
    }
  };
}

function startChaos() {
  S.phase = 'chaos';
  momo.visible = true;
  momo.userData.state = 'loose';
  objective('Chapter 3 · Chaos in the Village', 'Momo escaped into the marketplace (east of the square)! Try to catch her!');
  setTimeout(() => say(null, [
    ['Villager', 'MOMO’S ESCAPED AGAIN! Someone stop that chicken!'],
    ['Niko', 'A real ninja mission! Okay Momo… here I come!'],
  ]), 600);
}

function nearMissMomo() {
  S.nearMiss++;
  Sfx.tone(880, 0.12, 'square', 0.05);
  if (S.nearMiss === 1) toast('So close! She zigzagged away! 🐔');
  if (S.nearMiss === 2) toast('She’s faster than she looks!');
  if (S.nearMiss >= 3 && S.phase === 'chaos' && !S.hintGiven) {
    S.hintGiven = true;
    objective('Chapter 3 · Chaos in the Village', 'Chasing isn’t working… Sensei Willow is watching from the Academy. Ask him!');
    say(null, [
      ['Niko', '*puff* …*pant*… Chasing isn’t working. She dodges everyone who runs straight at her…'],
      ['Niko', 'Wait. Sensei Willow always says weird wise things. Time to hear one!'],
    ]);
  }
}

function takeGrain() {
  S.grain = true;
  Sfx.pop();
  toast('You got a handful of grain! 🌾');
  objective('Chapter 4 · Niko Takes Action', 'Now lay a grain trail at Momo’s crate — quietly!');
}

const grainDots = [];
function layTrail() {
  S.phase = 'trail';
  objective('Chapter 4 · Niko Takes Action', 'Shhh… watch. Bend with the wind…');
  // a trail of grain from mid-market to the crate
  const from = new THREE.Vector3(11, 0, 3.2), to = crate.position.clone().setY(0);
  for (let i = 0; i <= 4; i++) {
    const p = from.clone().lerp(to, i / 4);
    const dot = mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf7d060 }), p.x + (Math.random() - 0.5) * 0.2, 0.05, p.z + (Math.random() - 0.5) * 0.2, false);
    grainDots.push(dot);
    scene.add(dot);
  }
  say(null, [
    ['Niko', 'I don’t need to chase her… I just need to GUIDE her.'],
    ['Niko', '*sprinkle sprinkle* …and now, ever so quietly… we wait.'],
  ], () => {
    const u = momo.userData;
    u.state = 'peck';
    u.peckI = 0;
    u.peckT = 0;
  });
}

function momoCaught() {
  S.phase = 'caught';
  crate.userData.lid.rotation.x = -0.55; // the lid drops gently ajar — Momo peeks out
  Sfx.fanfare();
  addWarmth(12, 'Momo is home! The village cheers!');
  objective('Chapter 5 · Willow’s Lesson', 'The village erupts into cheers! Go see Sensei Willow.');
  say(null, [
    ['Villager', 'NIKO DID IT! Three cheers for Niko!'],
    ['Taro', 'How’d you do that?!'],
    ['Niko', 'I just… bent with the wind.'],
    ['Momo', 'bok. (She looks extremely comfortable, and not even slightly sorry.)'],
  ]);
}

/* ---------------- interactions ---------------- */
function interactables() {
  const list = [];
  NPCS.forEach((n) => list.push({ x: n.obj.position.x, z: n.obj.position.z, r: 2.6, label: `Talk to ${n.name}`, act: () => talkTo(n) }));
  if (S.phase === 'grain' && !S.grain) {
    list.push({ x: GRAIN_STALL.x, z: GRAIN_STALL.z, r: 2.2, label: 'Take a handful of grain', act: takeGrain });
  }
  if (S.phase === 'grain' && S.grain) {
    list.push({ x: crate.position.x, z: crate.position.z, r: 2.6, label: 'Lay the grain trail', act: layTrail });
  }
  return list;
}

/* ---------------- input ---------------- */
const keys = {};
let nearThing = null;
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  Sfx.ensure();
  if (e.code === 'KeyM') { Sfx.muted = !Sfx.muted; toast(Sfx.muted ? 'Sound off 🔇' : 'Sound on 🔊'); }
  if (dlg.style.display === 'block') {
    if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') advance();
    return;
  }
  if ((e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') && nearThing) nearThing.act();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
document.querySelectorAll('.tbtn').forEach((btn) => {
  const code = btn.dataset.k;
  const down = (e) => {
    e.preventDefault(); Sfx.ensure();
    if (code === 'Space') {
      if (dlg.style.display === 'block') { advance(); return; }
      if (nearThing) { nearThing.act(); return; }
    }
    keys[code] = true;
  };
  const up = (e) => { e.preventDefault(); keys[code] = false; };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', up);
});

/* ---------------- audio ---------------- */
const Sfx = {
  ctx: null, muted: false,
  ensure() {
    if (!Sfx.ctx) {
      try { Sfx.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const scale = [262, 294, 330, 392, 440, 523];
      setInterval(() => {
        if (Sfx.muted || Sfx.ctx.state !== 'running') return;
        if (Math.random() < 0.6) Sfx.tone(scale[(Math.random() * scale.length) | 0], 0.9, 'triangle', 0.025);
      }, 640);
    }
    if (Sfx.ctx.state === 'suspended') Sfx.ctx.resume();
  },
  tone(f, dur, type, vol, delay = 0) {
    if (!Sfx.ctx || Sfx.muted) return;
    const t0 = Sfx.ctx.currentTime + delay;
    const o = Sfx.ctx.createOscillator(), g = Sfx.ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(Sfx.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  blip() { Sfx.tone(660, 0.07, 'square', 0.03); },
  pop() { Sfx.tone(880, 0.1, 'triangle', 0.06); Sfx.tone(1320, 0.12, 'sine', 0.04, 0.05); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => Sfx.tone(f, 0.35, 'sine', 0.07, i * 0.09)); },
  fanfare() { [523, 659, 784, 880, 1047, 1319].forEach((f, i) => Sfx.tone(f, 0.4, 'triangle', 0.07, i * 0.11)); },
};

/* ---------------- movement / camera / loop ---------------- */
let camYaw = Math.PI * 0.1;
const promptEl = document.getElementById('prompt');
const clock = new THREE.Clock();

function blockedAt(x, z, r) {
  return colliders.some((c) => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);
}
function tryMove(obj, dx, dz, r) {
  let nx = obj.position.x + dx, nz = obj.position.z;
  if (!blockedAt(nx, nz, r)) obj.position.x = nx;
  nz = obj.position.z + dz;
  if (!blockedAt(obj.position.x, nz, r)) obj.position.z = nz;
  obj.position.x = THREE.MathUtils.clamp(obj.position.x, -46, 46);
  obj.position.z = THREE.MathUtils.clamp(obj.position.z, -38, 38);
}

/* Momo AI — she avoids anyone coming straight for her (that's the secret) */
function updateMomo(dt, t) {
  if (!momo.visible) return;
  const u = momo.userData;
  u.phase += dt * 10;
  const toPlayer = player.position.distanceTo(momo.position);

  if (u.state === 'loose') {
    // near-miss: the player lunges close, Momo darts away in a zigzag
    if (toPlayer < 1.6 && u.fleeT <= 0) {
      u.fleeT = 1.1;
      nearMissMomo();
    }
    let speed = 2.2, dir;
    if (u.fleeT > 0) {
      u.fleeT -= dt;
      speed = 6.2; // she's faster than any lunging ninja
      dir = momo.position.clone().sub(player.position).setY(0).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      dir.add(perp.multiplyScalar(Math.sin(t * 9) * 0.8)).normalize(); // zigzag!
    } else {
      u.wanderT -= dt;
      if (u.wanderT <= 0) {
        u.wanderT = 1.5 + Math.random() * 2;
        u.target.set(7 + Math.random() * 10, 0, -1 + Math.random() * 9); // the marketplace
      }
      dir = u.target.clone().sub(momo.position).setY(0);
      if (dir.length() < 0.4) dir.set(0, 0, 0);
      else dir.normalize();
    }
    if (dir.lengthSq() > 0) {
      tryMove(momo, dir.x * speed * dt, dir.z * speed * dt, 0.25);
      momo.rotation.y = Math.atan2(dir.x, dir.z);
      u.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(u.phase * 2 + i * Math.PI) * 0.8; });
      momo.position.y = Math.abs(Math.sin(u.phase)) * 0.06;
      const flap = u.fleeT > 0 ? 1.2 : 0.1;
      u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.3 + Math.sin(u.phase * 3) * flap * 0.5); });
    }
    u.neck.rotation.x = Math.sin(u.phase * 0.8) * 0.15;
  } else if (u.state === 'peck') {
    // following the grain trail, one polite peck at a time
    const dot = grainDots[u.peckI];
    if (!dot) {
      // hop into the crate
      const goal = crate.position.clone().setY(0);
      const d = goal.clone().sub(momo.position.clone().setY(0));
      if (d.length() < 0.2) { u.state = 'caged'; momo.position.set(crate.position.x, 0.15, crate.position.z); momoCaught(); }
      else {
        const dir = d.normalize();
        // she hops straight over the crate wall — no collider for chickens with a plan
        momo.position.x += dir.x * 2.4 * dt;
        momo.position.z += dir.z * 2.4 * dt;
        momo.position.y = 0.3 + Math.abs(Math.sin(u.phase)) * 0.3; // happy hops
        momo.rotation.y = Math.atan2(dir.x, dir.z);
      }
      return;
    }
    const d = dot.position.clone().setY(0).sub(momo.position.clone().setY(0));
    if (d.length() > 0.25) {
      const dir = d.normalize();
      momo.position.add(dir.multiplyScalar(2.4 * dt));
      momo.rotation.y = Math.atan2(dir.x, dir.z);
      u.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(u.phase * 2 + i * Math.PI) * 0.6; });
      u.neck.rotation.x = 0;
    } else {
      u.peckT += dt;
      u.neck.rotation.x = Math.abs(Math.sin(u.peckT * 8)) * 0.8; // peck peck
      if (u.peckT > 0.45) {
        u.peckT = 0;
        scene.remove(dot);
        grainDots[u.peckI] = null;
        u.peckI++;
        Sfx.tone(1200 + Math.random() * 300, 0.05, 'sine', 0.03);
      }
    }
  } else if (u.state === 'caged') {
    u.neck.rotation.x = Math.abs(Math.sin(t * 4)) * 0.3;
    momo.position.y = 0.15;
  }
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (keys.KeyQ) camYaw += dt * 1.6;
  if (keys.KeyE && !nearThing) camYaw -= dt * 1.6;

  let ix = 0, iz = 0;
  const talking = dlg.style.display === 'block';
  if (!talking) {
    if (keys.ArrowLeft || keys.KeyA) ix -= 1;
    if (keys.ArrowRight || keys.KeyD) ix += 1;
    if (keys.ArrowUp || keys.KeyW) iz -= 1;
    if (keys.ArrowDown || keys.KeyS) iz += 1;
  }
  const moving = ix || iz;
  let speed01 = 0;
  if (moving) {
    const len = Math.hypot(ix, iz); ix /= len; iz /= len;
    const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const dir = fwd.multiplyScalar(-iz).add(right.multiplyScalar(ix)).normalize();
    tryMove(player, dir.x * 4.6 * dt, dir.z * 4.6 * dt, 0.35);
    const target = Math.atan2(dir.x, dir.z);
    let dh = target - heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    heading += dh * Math.min(1, dt * 12);
    player.rotation.y = heading;
    speed01 = 1;
  }
  animatePerson(player, dt, speed01);
  NPCS.forEach((n) => animatePerson(n.obj, dt, 0));

  NPCS.forEach((n) => {
    const d = n.obj.position.distanceTo(player.position);
    if (d < 5) {
      const want = Math.atan2(player.position.x - n.obj.position.x, player.position.z - n.obj.position.z);
      let dh = want - n.obj.rotation.y;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      n.obj.rotation.y += dh * Math.min(1, dt * (talking ? 9 : 4));
    }
  });
  if (talking && D.npc) {
    const want = Math.atan2(D.npc.obj.position.x - player.position.x, D.npc.obj.position.z - player.position.z);
    let dh = want - heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    heading += dh * Math.min(1, dt * 8);
    player.rotation.y = heading;
  }

  if (biscuit) {
    const u = biscuit.userData;
    const goal = player.position.clone().add(new THREE.Vector3(Math.sin(heading + 2.4), 0, Math.cos(heading + 2.4)).multiplyScalar(1.1));
    const d = biscuit.position.distanceTo(goal);
    if (d > 0.3) {
      const dir = goal.clone().sub(biscuit.position).normalize();
      biscuit.position.add(dir.multiplyScalar(Math.min(d * 3, 5.2) * dt));
      biscuit.rotation.y = Math.atan2(dir.x, dir.z);
      u.phase += dt * 14;
      u.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(u.phase + (i % 2) * Math.PI) * 0.7; });
      biscuit.position.y = Math.abs(Math.sin(u.phase * 0.5)) * 0.08;
    } else {
      u.legs.forEach((leg) => { leg.rotation.x *= 0.8; });
      biscuit.position.y *= 0.8;
    }
    u.tail.rotation.z = Math.sin(t * 5) * 0.25;
    u.tail.rotation.x = -0.4 + Math.sin(t * 3.1) * 0.15;
  }

  updateMomo(dt, t);

  // nearest interactable
  nearThing = null;
  let best = 1e9;
  for (const it of interactables()) {
    const d = Math.hypot(player.position.x - it.x, player.position.z - it.z);
    if (d < it.r && d < best) { best = d; nearThing = it; }
  }
  promptEl.style.display = nearThing && !talking ? 'block' : 'none';
  if (nearThing) promptEl.textContent = `✦ ${nearThing.label}`;

  // camera
  let camTarget, lookAt;
  if (talking && D.npc) {
    const a = player.position, b = D.npc.obj.position;
    const back = a.clone().sub(b).setY(0).normalize();
    const side = new THREE.Vector3(-back.z, 0, back.x);
    camTarget = a.clone()
      .add(back.multiplyScalar(1.9))
      .add(side.multiplyScalar(1.8))
      .add(new THREE.Vector3(0, 1.8, 0));
    const npcHead = b.clone().add(new THREE.Vector3(0, D.npc.cfg.h * 0.92, 0));
    lookAt = npcHead.lerp(a.clone().add(new THREE.Vector3(0, 1.0, 0)), 0.22);
  } else if (S.phase === 'trail' && momo.visible) {
    // cinematic: watch Momo follow the trail
    camTarget = momo.position.clone().add(new THREE.Vector3(3.5, 2.6, 4.5));
    lookAt = momo.position.clone().add(new THREE.Vector3(0, 0.4, 0));
  } else {
    camTarget = player.position.clone().add(new THREE.Vector3(Math.sin(camYaw) * 9.5, 6.2, Math.cos(camYaw) * 9.5));
    lookAt = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  }
  camera.position.lerp(camTarget, 1 - Math.pow(0.005, dt));
  camera.lookAt(lookAt);

  if (talking && D.chars < D.full.length) {
    D.chars = Math.min(D.full.length, D.chars + dt * 55);
    dlgText.textContent = D.full.slice(0, Math.floor(D.chars));
  }

  // petals
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(1, 1, 1);
  petals.forEach((p, i) => {
    p.ph += dt * 2;
    p.y -= p.vy * dt;
    p.x += Math.sin(p.ph) * dt * 0.8;
    if (p.y < 0) { p.y = 10 + Math.random() * 5; p.x = player.position.x + (Math.random() - 0.5) * 60; p.z = player.position.z + (Math.random() - 0.5) * 50; }
    E.set(p.ph, p.ph * 0.7, 0);
    Q.setFromEuler(E);
    M.compose(new THREE.Vector3(p.x, p.y, p.z), Q, V);
    petalMesh.setMatrixAt(i, M);
  });
  petalMesh.instanceMatrix.needsUpdate = true;

  waves.forEach((wv) => {
    wv.position.z += wv.userData.speed * dt;
    if (wv.position.z > 42) wv.position.z = -42;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ---------------- boot ---------------- */
// small debug/testing handle (also handy in devtools)
window.NIKO = { player, S, momo, crate, NPCS, get biscuit() { return biscuit; } };
objective('Chapter 1 · The Ninja Village', 'Walk over and say hello to the family!');
document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('title').style.display = 'none';
  Sfx.ensure();
});
tick();
