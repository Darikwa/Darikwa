'use strict';
/* game.js — "Niko the Ninja That Could!" vertical slice.
   Books 1–3 as playable chapters, the TRY-AGAIN loop, the Kindness Meter,
   an age-up from toddler to Academy student, and four side stories.
   Everything is drawn procedurally on canvas; no assets, no build step. */

/* ================= constants & state ================= */
const T = 32;                 // tile size (px)
const MAPW = 52, MAPH = 40;   // world size (tiles)
const VIEW_W = 960, VIEW_H = 600;
const SAVE_KEY = 'niko-save-v1';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Persistent game state (saved to localStorage)
let S = null;
function freshState() {
  return {
    mode: 'title',        // title | explore | dialogue | minigame | cutscene
    stage: 1,             // 1 = Origins (age 1), 2 = Academy (age 5)
    kindness: 0,
    px: 8.5 * T, py: 11 * T,   // player position
    flags: {},            // quest / story flags
    lanternsLit: [],      // ids of lit lanterns
    planksGot: [],        // ids of collected planks
    custardStage: 0,      // 0 off, 1..3 chasing, 4 done
    tries: {},            // attempt counters per skill (the "yet" record)
  };
}

// Transient (not saved)
const W = {
  tiles: [], solid: [],
  buildings: [], trees: [], fences: [], lanterns: [], planks: [],
  flowers: [], crumbs: [],
  cam: { x: 0, y: 0 },
  petals: [], sparkles: [],
  time: 0,
  playerBob: 0, moving: false, stepT: 0,
  biscuit: { x: 0, y: 0, mode: 'hidden' },  // hidden | follow | spot
  biscuitSpot: null,
  lanternTimer: 0,
  nearest: null,
};

/* ================= tiles & world building ================= */
const TILE = { GRASS: 0, PATH: 1, WATER: 2, SAND: 3, BRIDGE: 4, FLOOR: 5 };

function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return TILE.GRASS;
  return W.tiles[ty * MAPW + tx];
}
function setTile(tx, ty, t) { if (tx >= 0 && ty >= 0 && tx < MAPW && ty < MAPH) W.tiles[ty * MAPW + tx] = t; }
function setSolid(tx, ty, v) { if (tx >= 0 && ty >= 0 && tx < MAPW && ty < MAPH) W.solid[ty * MAPW + tx] = v; }
function isSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return true;
  return W.solid[ty * MAPW + tx];
}
function fillTiles(x1, y1, x2, y2, t, solid) {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
    setTile(x, y, t);
    if (solid !== undefined) setSolid(x, y, solid);
  }
}

function placeBuilding(tx, ty, tw, th, style) {
  W.buildings.push(Object.assign({ tx, ty, tw, th }, style));
  for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) setSolid(x, y, true);
}
function placeTree(tx, ty, kind = 'pine') {
  W.trees.push({ tx, ty, kind });
  setSolid(tx, ty, true);
}
function placeFenceRect(x1, y1, x2, y2, gates) {
  for (let x = x1; x <= x2; x++) { addFence(x, y1, gates); addFence(x, y2, gates); }
  for (let y = y1 + 1; y < y2; y++) { addFence(x1, y, gates); addFence(x2, y, gates); }
}
function addFence(tx, ty, gates) {
  if (gates && gates.some((g) => g[0] === tx && g[1] === ty)) {
    W.fences.push({ tx, ty, gate: true });
    setSolid(tx, ty, true); // opened later at age-up
    return;
  }
  if (isSolid(tx, ty)) return; // don't fence over buildings
  W.fences.push({ tx, ty, gate: false });
  setSolid(tx, ty, true);
}

const GATE_TILES = [[16, 9], [16, 10]];
const LANTERN_SPOTS = [
  [18, 9], [24, 14], [29, 10], [22, 19], [31, 19], [24, 25], [33, 21], [20, 27],
];
const PLANK_SPOTS = [[19, 33], [11, 26], [35, 15], [28, 27]];
const POND = [[12, 11], [13, 11], [13, 12]];
const SAKURA = { tx: 28, ty: 18 };            // village square blossom tree
const GREAT_TREE = { tx: 48, ty: 14 };        // meadow tree (kitten!)

function buildWorld() {
  W.tiles = new Array(MAPW * MAPH).fill(TILE.GRASS);
  W.solid = new Array(MAPW * MAPH).fill(false);
  W.buildings = []; W.trees = []; W.fences = []; W.lanterns = []; W.planks = [];

  // river + (broken) bridge
  fillTiles(42, 0, 44, MAPH - 1, TILE.WATER, true);
  fillTiles(42, 19, 44, 21, TILE.WATER, true); // bridge slot — walkable once fixed

  // paths
  fillTiles(17, 9, 24, 10, TILE.PATH);         // yard gate -> east
  fillTiles(23, 10, 24, 19, TILE.PATH);        // down to square
  fillTiles(22, 18, 32, 23, TILE.PATH);        // village square
  fillTiles(29, 8, 30, 18, TILE.PATH);         // up to academy
  fillTiles(21, 23, 22, 29, TILE.PATH);        // down to training yard
  fillTiles(13, 20, 22, 21, TILE.PATH);        // west to bakery
  fillTiles(32, 20, 41, 21, TILE.PATH);        // east to bridge
  fillTiles(45, 20, 48, 21, TILE.PATH);        // meadow path
  fillTiles(4, 4, 16, 13, TILE.SAND);          // family yard
  fillTiles(18, 29, 26, 34, TILE.SAND);        // training yard

  // pond in the family yard (brave-jump stones live here)
  POND.forEach(([x, y]) => { setTile(x, y, TILE.WATER); setSolid(x, y, true); });

  // buildings
  placeBuilding(6, 5, 6, 4, { wall: '#f3e6d0', roof: '#c0574f', name: 'Home', door: 8 });
  placeBuilding(8, 21, 5, 3, { wall: '#f7e9d4', roof: '#e0985a', name: "Hana's Bakery", door: 10 });
  placeBuilding(32, 26, 5, 3, { wall: '#e8d9c0', roof: '#8a6a4a', name: "Daichi's Workshop", door: 34 });
  placeBuilding(26, 3, 9, 5, { wall: '#f3e6d0', roof: '#22335f', name: 'Kageyama Ninja Academy', door: 30 });

  // family yard fence, with a gate that opens when Niko turns 5
  placeFenceRect(4, 4, 16, 13, GATE_TILES);

  // trees — border ring plus scattered woods
  for (let x = 0; x < MAPW; x += 2) { placeTree(x, 0); placeTree(x + (x % 4 ? 0 : 1), MAPH - 1); }
  for (let y = 2; y < MAPH - 1; y += 2) { placeTree(0, y); if (y % 4) placeTree(1, y + 1); }
  for (let y = 2; y < MAPH - 2; y += 3) placeTree(50 + (y % 2), y);
  [[19, 16], [34, 12], [37, 24], [15, 16], [38, 30], [17, 25], [30, 32], [12, 33],
   [36, 8], [22, 6], [40, 5], [8, 17], [5, 28], [9, 30], [40, 33], [46, 30], [47, 8],
  ].forEach(([x, y]) => { if (!isSolid(x, y) && tileAt(x, y) === TILE.GRASS) placeTree(x, y); });

  // blossom trees (solid trunk tiles, huge pink canopies)
  placeTree(SAKURA.tx, SAKURA.ty, 'sakura');
  placeTree(GREAT_TREE.tx, GREAT_TREE.ty, 'great');

  // village well
  setSolid(25, 21, true);

  // lantern posts
  LANTERN_SPOTS.forEach(([x, y], i) => W.lanterns.push({ id: i, tx: x, ty: y }));
  PLANK_SPOTS.forEach(([x, y], i) => W.planks.push({ id: i, tx: x, ty: y }));

  // deterministic flower positions, revealed by Village Warmth level
  W.flowers = [];
  for (let y = 2; y < MAPH - 2; y++) for (let x = 2; x < MAPW - 2; x++) {
    if (tileAt(x, y) !== TILE.GRASS || isSolid(x, y)) continue;
    const h = U.hash(x, y);
    if (h < 0.16) W.flowers.push({ tx: x, ty: y, lvl: 1 + (Math.floor(h * 997) % 4), hue: h });
  }

  applyFlags(); // re-open gates / fix bridge for loaded saves
}

function applyFlags() {
  if (S.stage >= 2) {
    GATE_TILES.forEach(([x, y]) => setSolid(x, y, false));
  }
  if (S.flags.bridgeFixed) {
    fillTiles(42, 19, 44, 21, TILE.BRIDGE, false);
  }
  if (S.flags.biscuitJoined && W.biscuit.mode === 'hidden' && S.custardStage === 0) {
    W.biscuit.mode = 'follow';
    W.biscuit.x = S.px - 30; W.biscuit.y = S.py + 10;
  }
  npcs.forEach((n) => n.place());
}

/* ================= NPCs ================= */
function makeNpc(def) { return Object.assign({ x: 0, y: 0, visible: true }, def); }

const npcs = [
  makeNpc({
    id: 'hana', name: 'Hana',
    look: { h: 36, hair: '#4a3423', outfit: '#b06485', apron: '#fff3e0', bun: true },
    place() { if (S.stage === 1) { this.x = 7.5 * T; this.y = 10.5 * T; } else { this.x = 10.5 * T; this.y = 24.8 * T; } },
  }),
  makeNpc({
    id: 'daichi', name: 'Daichi',
    look: { h: 42, hair: '#2a2a30', outfit: '#5a6e4a', skin: '#eab88a', band: '#8a6a4a' },
    place() { if (S.stage === 1) { this.x = 13.5 * T; this.y = 7.5 * T; } else { this.x = 34.5 * T; this.y = 29.8 * T; } },
  }),
  makeNpc({
    id: 'akiko', name: 'Akiko',
    look: { h: 34, hair: '#1a1a22', outfit: '#334d80', sash: '#e0985a', bun: true },
    place() { if (S.stage === 1) { this.x = 10.5 * T; this.y = 12.3 * T; } else { this.x = 22.5 * T; this.y = 31.5 * T; } },
  }),
  makeNpc({
    id: 'willow', name: 'Sensei Willow',
    look: { h: 40, hair: '#d9d9e2', outfit: '#6a5a7a', beard: '#d9d9e2', sleepy: true, bun: true },
    place() { this.visible = S.stage >= 2; this.x = 30.5 * T; this.y = 8.8 * T; },
  }),
  makeNpc({
    id: 'kenji', name: 'Kenji',
    look: { h: 30, hair: '#3a2a1a', outfit: '#7a4a3a', band: '#d0342c' },
    place() { this.visible = S.stage >= 2; this.x = 28 * T; this.y = 9.4 * T; },
  }),
  makeNpc({
    id: 'mei', name: 'Mei',
    look: { h: 29, hair: '#241a14', outfit: '#7fb069', band: '#f5a3c0' },
    place() {
      this.visible = S.stage >= 2;
      if (S.flags.bridgeFixed && !S.flags.kittenDone) { this.x = 46.5 * T; this.y = 18.5 * T; }
      else if (S.flags.kittenDone) { this.x = 47.5 * T; this.y = 18.5 * T; }
      else { this.x = 32.5 * T; this.y = 9.4 * T; }
    },
  }),
  makeNpc({
    id: 'tomo', name: 'Elder Tomo',
    look: { h: 32, hair: '#e8e8ee', outfit: '#8a7a5a', beard: '#e8e8ee' },
    place() { this.visible = S.stage >= 2; this.x = 40 * T; this.y = 21.6 * T; },
  }),
  makeNpc({
    id: 'yuki', name: 'Yuki',
    look: { h: 34, hair: '#5a4a3a', outfit: '#d9a3b8', apron: '#fff' },
    place() { this.visible = S.stage >= 2; this.x = 26.5 * T; this.y = 22.6 * T; },
  }),
];
const npc = (id) => npcs.find((n) => n.id === id);

/* ================= dialogue ================= */
const dlgEl = document.getElementById('dialog');
const dlgName = document.getElementById('dlg-name');
const dlgText = document.getElementById('dlg-text');
const choicesEl = document.getElementById('choices');

const D = { queue: [], onDone: null, chars: 0, full: '' };

function say(lines, onDone) {
  D.queue = lines.map((l) => (typeof l === 'string' ? { who: 'Niko', text: l } : l));
  D.onDone = onDone || null;
  S.mode = 'dialogue';
  dlgEl.classList.remove('hidden');
  nextLine();
}
function nextLine() {
  const line = D.queue.shift();
  if (!line) {
    dlgEl.classList.add('hidden');
    S.mode = 'explore';
    const cb = D.onDone; D.onDone = null;
    if (cb) cb();
    return;
  }
  dlgName.textContent = line.who;
  D.full = line.text;
  D.chars = 0;
  dlgText.textContent = '';
  Sfx.blip();
}
function advanceDialogue() {
  if (D.chars < D.full.length) { D.chars = D.full.length; dlgText.textContent = D.full; return; }
  nextLine();
}
function updateDialogue(dt) {
  if (D.chars < D.full.length) {
    D.chars = Math.min(D.full.length, D.chars + dt * 55);
    dlgText.textContent = D.full.slice(0, Math.floor(D.chars));
  }
}
dlgEl.addEventListener('click', () => { if (S && S.mode === 'dialogue') advanceDialogue(); });

function choice(options) {
  S.mode = 'dialogue'; // block movement
  choicesEl.innerHTML = '';
  choicesEl.classList.remove('hidden');
  options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1}. ${opt.label}`;
    b.onclick = () => { choicesEl.classList.add('hidden'); Sfx.pop(); opt.action(); };
    choicesEl.appendChild(b);
  });
}
function choiceKey(n) {
  const btns = choicesEl.querySelectorAll('button');
  if (btns[n]) btns[n].click();
}

/* ================= kindness & HUD ================= */
const meterFill = document.getElementById('meter-fill');
const ageBadge = document.getElementById('age-badge');
const questTitle = document.getElementById('quest-title');
const questObj = document.getElementById('quest-obj');
const toastsEl = document.getElementById('toasts');

function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  toastsEl.appendChild(d);
  setTimeout(() => d.remove(), 4200);
}

function blossomLevel() {
  return S.kindness >= 75 ? 4 : S.kindness >= 55 ? 3 : S.kindness >= 35 ? 2 : S.kindness >= 15 ? 1 : 0;
}

function addKindness(n, reason) {
  const before = blossomLevel();
  S.kindness = U.clamp(S.kindness + n, 0, 100);
  toast(`+${n} 🌸 ${reason}`);
  Sfx.chime();
  if (blossomLevel() > before) {
    toast('Kageyama blossoms a little more! 🌸');
    for (let i = 0; i < 26; i++) spawnPetal(true);
    Sfx.fanfare();
  }
  refreshHud();
  saveGame();
  maybeFestival();
}

function refreshHud() {
  meterFill.style.width = `${S.kindness}%`;
  ageBadge.textContent = S.stage === 1 ? 'Age 1' : 'Age 5';
  const q = currentObjective();
  questTitle.textContent = q.title;
  questObj.textContent = q.obj;
}

/* ================= story: chapters & objectives ================= */
function currentObjective() {
  const f = S.flags;
  if (S.stage === 1) {
    if (!f.hana1 || !f.daichi1 || !f.akiko1) {
      const left = [!f.hana1 && 'Mama Hana', !f.daichi1 && 'Papa Daichi', !f.akiko1 && 'big sister Akiko'].filter(Boolean);
      return { title: 'Chapter 1 · Niko is Born', obj: `Say hello to ${left.join(', ')}.` };
    }
    if (!f.ch1Done) return { title: 'Chapter 1 · Niko is Born', obj: 'Someone small is rustling in the yard…' };
    if (!f.walkUnlocked) return { title: 'Chapter 2 · First Steps', obj: 'Go to Mama Hana and try your first steps!' };
    if (!f.jumpDone) return { title: 'Chapter 2 · First Steps', obj: 'Try the stepping stones by the little pond!' };
    return { title: 'Chapter 2 · First Steps', obj: 'You did it! Watch the blossoms fall…' };
  }
  if (!f.metWillow) return { title: 'Chapter 3 · First Day at Ninja School', obj: 'Walk north to the Academy and meet Sensei Willow.' };
  if (!f.metKids) return { title: 'Chapter 3 · First Day at Ninja School', obj: 'Make friends with Kenji and Mei at the Academy.' };
  if (!f.beamDone) return { title: 'Chapter 3 · First Day at Ninja School', obj: 'Lesson one: find Akiko at the training yard (south) and try the balance beam.' };
  if (!f.sneakDone) return { title: 'Chapter 3 · First Day at Ninja School', obj: 'Lesson two: Sensei Willow hid biscuits in the garden. Practise the silent step!' };
  // free-roam side stories
  const side = [];
  if (!f.bridgeFixed) side.push('Elder Tomo needs the bridge mended');
  if (!f.lanternDone) side.push('Yuki is planning Lantern Night');
  if (S.custardStage < 4) side.push('Hana’s biscuits have vanished…');
  if (f.bridgeFixed && !f.kittenDone) side.push('Mei needs help across the river');
  if (side.length) return { title: 'Kageyama · Side Stories', obj: side[0] + '.' };
  return { title: 'Kageyama in Bloom', obj: 'Explore, practise, and keep helping others rise!' };
}

/* ---- NPC dialogue trees ---- */
function talkTo(id) {
  const f = S.flags;
  switch (id) {
    case 'hana': return talkHana(f);
    case 'daichi': return talkDaichi(f);
    case 'akiko': return talkAkiko(f);
    case 'willow': return talkWillow(f);
    case 'kenji': return talkKenji(f);
    case 'mei': return talkMei(f);
    case 'tomo': return talkTomo(f);
    case 'yuki': return talkYuki(f);
  }
}

function talkHana(f) {
  if (S.stage === 1) {
    if (!f.hana1) {
      f.hana1 = true;
      return say([
        { who: 'Hana', text: 'There you are, my little blossom! Welcome to the world, Niko. 🌸' },
        { who: 'Hana', text: 'This is Kageyama — the hidden village. Everyone here helps everyone else rise.' },
        { who: 'Niko', text: 'Goo… ba? (Niko waves his tiny arms!)' },
      ], checkCh1);
    }
    if (f.ch1Done && !f.walkUnlocked) {
      return say([
        { who: 'Hana', text: 'Niko, sweetheart — would you like to try walking? Come, step towards me!' },
        { who: 'Hana', text: 'Wobbling is just walking that hasn’t finished practising. Ready?' },
      ], () => MG.start(mgFirstSteps()));
    }
    return say([{ who: 'Hana', text: 'Fresh bread soon! Growing ninjas need warm tummies.' }]);
  }
  // stage 2
  if (f.sneakDone && S.custardStage === 0) {
    S.custardStage = 1;
    setBiscuitSpot(0);
    saveGame();
    return say([
      { who: 'Hana', text: 'Oh no, oh no! My festival biscuits — the whole tray — GONE!' },
      { who: 'Hana', text: 'All that’s left is a trail of crumbs and one very suspicious pawprint…' },
      { who: 'Niko', text: 'BISCUIT!! Don’t worry Mama, ninja detective Niko is on the case!' },
    ]);
  }
  if (S.custardStage > 0 && S.custardStage < 4) {
    return say([{ who: 'Hana', text: 'Follow the crumbs, little detective! That raccoon can’t have gone far.' }]);
  }
  return say([{ who: 'Hana', text: U.pick([
    'My big Academy boy! Here — a warm roll for the road.',
    'Kindness is like yeast, Niko. A little makes everything rise.',
    'Be home before the lanterns sleep!',
  ]) }]);
}

function talkDaichi(f) {
  if (S.stage === 1) {
    if (!f.daichi1) {
      f.daichi1 = true;
      return say([
        { who: 'Daichi', text: 'Ho! Look at those strong little hands. A builder’s hands, maybe!' },
        { who: 'Daichi', text: 'Remember this, tiny one: big things are built one piece at a time.' },
        { who: 'Niko', text: 'Ba! (Niko grabs Papa’s thumb and does NOT let go.)' },
      ], checkCh1);
    }
    return say([{ who: 'Daichi', text: 'One piece at a time, Niko. That’s how everything good gets made.' }]);
  }
  if (f.bridgeQuest === 1) {
    f.bridgeQuest = 2;
    saveGame();
    return say([
      { who: 'Daichi', text: 'The old bridge? Of course we’ll mend it — Elder Tomo crossed it as a boy!' },
      { who: 'Daichi', text: 'I lent my good planks all over the village. Find 4 planks and bring yourself back here… I mean, to the bridge!' },
      { who: 'Niko', text: 'Four planks! One piece at a time!' },
    ]);
  }
  if (f.bridgeQuest === 2 && !f.bridgeFixed) {
    return say([{ who: 'Daichi', text: `Planks so far: ${S.planksGot.length} of 4. They glow a little — keep your eyes soft and look around the village.` }]);
  }
  return say([{ who: 'Daichi', text: U.pick([
    'A strong ninja helps others rise. A strong carpenter builds them stairs!',
    'Measure twice, be kind always.',
    'That birdhouse? Built it one piece at a time.',
  ]) }]);
}

function talkAkiko(f) {
  if (S.stage === 1) {
    if (!f.akiko1) {
      f.akiko1 = true;
      return say([
        { who: 'Akiko', text: 'So YOU’RE my little brother! I’m Akiko. I’m twelve, and I’m going to teach you everything.' },
        { who: 'Akiko', text: 'First rule of Kageyama: if it’s hard, we try one more time. Deal?' },
        { who: 'Niko', text: 'Da! (It’s a deal.)' },
      ], checkCh1);
    }
    if (f.walkUnlocked && !f.jumpDone) {
      return say([{ who: 'Akiko', text: 'You’re WALKING! Okay, next: see those stepping stones on the pond? Little hops. You can do it!' }]);
    }
    return say([{ who: 'Akiko', text: 'Let’s try one more time. That’s our family magic spell.' }]);
  }
  if (f.metKids && !f.beamDone) {
    return say([
      { who: 'Akiko', text: 'Lesson one is balance, little brother. This beam wobbled me for a whole summer.' },
      { who: 'Akiko', text: 'Fall as many times as you like — the mats are soft and so is my heart. Ready?' },
    ], () => MG.start(mgBeam()));
  }
  return say([{ who: 'Akiko', text: U.pick([
    'Let’s try one more time — it works on everything.',
    'You know what’s stronger than talent? Tuesday-afternoon practice.',
    'I’m proud of you, Niko. Don’t tell Biscuit, he’ll get jealous.',
  ]) }]);
}

function talkWillow(f) {
  if (!f.metWillow) {
    f.metWillow = true;
    addKindness(6, 'Brave first hello!');
    return say([
      { who: 'Sensei Willow', text: '…Interesting. A new student, small as a teacup, brave as a mountain.' },
      { who: 'Niko', text: 'I’m Niko! I can’t do very much… YET.' },
      { who: 'Sensei Willow', text: '“Yet.” The most powerful word a ninja knows. Welcome to the Academy, Niko.' },
      { who: 'Sensei Willow', text: 'Two students wait by the gate. Friends first — lessons after. Off you go.' },
    ]);
  }
  if (f.metKids && f.beamDone && !f.sneakDone) {
    return say([
      { who: 'Sensei Willow', text: 'Lesson two: the silent step. It is for hide-and-seek, and for not waking grandmothers.' },
      { who: 'Sensei Willow', text: 'I have hidden a jar of biscuits in my garden. I shall nap beside it. Sneak past me while my eyes are closed…' },
      { who: 'Sensei Willow', text: 'If I spot you, we simply begin again. …Interesting, isn’t it, how that’s not scary at all?' },
    ], () => MG.start(mgSneak()));
  }
  return say([{ who: 'Sensei Willow', text: U.pick([
    '…Interesting.',
    'A biscuit hidden is a biscuit twice enjoyed.',
    'The strongest ninjas I ever trained were the kindest ones. Every single time.',
  ]) }]);
}

function talkKenji(f) {
  if (f.metWillow && !f.metKids) return meetKids('kenji');
  return say([{ who: 'Kenji', text: U.pick([
    'I can climb ANYTHING. Walls, trees, Dad…',
    'Race you to the well! …after snack time.',
    'Mei remembers every star. I remember every ladder.',
  ]) }]);
}
function talkMei(f) {
  if (f.metWillow && !f.metKids) return meetKids('mei');
  if (f.bridgeFixed && !f.kittenDone && npcNear('mei', 45 * T)) return kittenQuest();
  return say([{ who: 'Mei', text: U.pick([
    'Did you know the great cherry tree across the river is 300 years old?',
    'Everyone’s good at something different. That’s the whole trick of a team!',
    'Sora the kitten follows me everywhere. Mostly.',
  ]) }]);
}
function npcNear(id, minX) { return npc(id).x >= minX; }

function meetKids(which) {
  const f = S.flags;
  f[`met_${which}`] = true;
  const seq = which === 'kenji'
    ? [
      { who: 'Kenji', text: 'New kid! I’m Kenji. I can climb the flagpole. Well. Half of it. The bottom half.' },
      { who: 'Niko', text: 'That’s the best half to start with!' },
    ]
    : [
      { who: 'Mei', text: 'Hello! I’m Mei. I know all the constellations and exactly none of the cartwheels.' },
      { who: 'Niko', text: 'I’ll trade you a cartwheel for a star!' },
    ];
  return say(seq, () => {
    if (f.met_kenji && f.met_mei && !f.metKids) {
      f.metKids = true;
      addKindness(6, 'First friends!');
      say([
        { who: 'Kenji', text: 'You’re alright, Niko. See you at lessons!' },
        { who: 'Mei', text: 'Akiko is your sister?! She’s LEGEND. She’s at the training yard, south of the square.' },
      ]);
    }
  });
}

function talkTomo(f) {
  if (!f.sneakDone) return say([{ who: 'Elder Tomo', text: 'Mind the river, little one. The old bridge is poorly.' }]);
  if (!f.bridgeQuest) {
    f.bridgeQuest = 1;
    saveGame();
    return say([
      { who: 'Elder Tomo', text: 'Across that river is the meadow where I was married, young ninja. Sixty springs ago.' },
      { who: 'Elder Tomo', text: 'The bridge broke last winter, and my old knees can’t swim. Could you… no, no, you’re too small.' },
      { who: 'Niko', text: 'Too small YET! I know exactly who to ask. Papa can build anything!' },
    ]);
  }
  if (f.bridgeQuest >= 1 && !f.bridgeFixed) {
    if (S.planksGot.length >= 4) return bridgeBuild();
    return say([{ who: 'Elder Tomo', text: `Daichi says ${4 - S.planksGot.length} more plank${4 - S.planksGot.length === 1 ? '' : 's'}. Take your time — I’ve waited a year, I can wait a morning.` }]);
  }
  return say([{ who: 'Elder Tomo', text: 'I visited the meadow today. Thank you, Niko. Sixty springs, and it’s lovelier than ever.' }]);
}

function bridgeBuild() {
  say([
    { who: 'Elder Tomo', text: 'All four planks! And here comes Daichi with his big hammer!' },
    { who: 'Daichi', text: 'Right then. One piece at a time…' },
    { who: 'Niko', text: '*hammer hammer hammer* … *proud small hammer*' },
    { who: 'Daichi', text: 'DONE! Kageyama, your bridge is back!' },
    { who: 'Elder Tomo', text: 'Oh… oh my. Thank you, both of you. The meadow, at last.' },
  ], () => {
    S.flags.bridgeFixed = true;
    fillTiles(42, 19, 44, 21, TILE.BRIDGE, false);
    npc('mei').place();
    addKindness(12, 'The bridge is mended!');
  });
}

function talkYuki(f) {
  if (!f.sneakDone) return say([{ who: 'Yuki', text: 'Shh — the baby is sleeping. Babies are VERY good at that.' }]);
  if (!f.lanternActive && !f.lanternDone) {
    return say([
      { who: 'Yuki', text: 'Tonight we welcome baby Ren with Lantern Night — every lantern lit before the stars come out!' },
      { who: 'Yuki', text: 'But I’ve got my hands full of, well, baby. Could you light the 8 village lanterns for me?' },
    ], () => choice([
      { label: 'Light them all! (start Lantern Night)', action: startLanterns },
      { label: 'Maybe in a little while.', action: () => say([{ who: 'Yuki', text: 'Any time before dusk, little ninja!' }]) },
    ]));
  }
  if (f.lanternActive) return say([{ who: 'Yuki', text: `${S.lanternsLit.length} of 8 lanterns glowing! The village looks so warm already.` }]);
  return say([{ who: 'Yuki', text: 'Baby Ren slept through the whole festival. Perfect first Lantern Night, really.' }]);
}

function startLanterns() {
  S.flags.lanternActive = true;
  W.lanternTimer = 0;
  say([
    { who: 'Niko', text: 'Eight lanterns before starlight — a real ninja mission!' },
    { who: 'Yuki', text: 'The lighting-wick is by the door. Off you go — and thank you, Niko!' },
  ]);
}

function lightLantern(l) {
  if (S.lanternsLit.includes(l.id)) return;
  S.lanternsLit.push(l.id);
  Sfx.sparkle(); Sfx.pop();
  for (let i = 0; i < 6; i++) W.sparkles.push({ x: l.tx * T + 16, y: l.ty * T + 4, vx: U.rand(-25, 25), vy: U.rand(-50, -15), t: 1 });
  toast(`Lantern lit! ${S.lanternsLit.length} / 8`);
  if (S.lanternsLit.length >= 8) {
    S.flags.lanternActive = false;
    S.flags.lanternDone = true;
    say([
      { who: 'Yuki', text: 'Look at it. LOOK at it! The whole village is glowing for baby Ren.' },
      { who: 'Niko', text: 'Welcome to Kageyama, baby Ren. It’s a really good village. You’ll see.' },
    ], () => addKindness(12, 'Lantern Night shines!'));
  }
  saveGame();
}

/* ---- Biscuit & the custard caper ---- */
const CUSTARD_SPOTS = [[16, 20], [23, 15], [29, 22]];
function setBiscuitSpot(i) {
  W.biscuit.mode = 'spot';
  W.biscuitSpot = i;
  W.biscuit.x = CUSTARD_SPOTS[i][0] * T + 16;
  W.biscuit.y = CUSTARD_SPOTS[i][1] * T + 16;
  // crumb trail decals
  W.crumbs = [];
  const from = i === 0 ? [10.5, 24.5] : CUSTARD_SPOTS[i - 1].map((v) => v + 0.5);
  const to = CUSTARD_SPOTS[i].map((v) => v + 0.5);
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    W.crumbs.push({
      x: U.lerp(from[0], to[0], t) * T + U.rand(-8, 8),
      y: U.lerp(from[1], to[1], t) * T + U.rand(-8, 8),
    });
  }
}
function catchBiscuit() {
  const stage = S.custardStage;
  if (stage === 1 || stage === 2) {
    say([
      { who: 'Biscuit', text: stage === 1 ? '*innocent raccoon noises* (His whiskers are COVERED in crumbs.)' : '*guiltier raccoon noises* (He is literally holding the tray.)' },
      { who: 'Niko', text: stage === 1 ? 'BISCUIT! Come back here, you fluffy burglar!' : 'You can’t out-scamper a ninja, Biscuit!' },
    ], () => {
      S.custardStage++;
      setBiscuitSpot(S.custardStage - 1);
      saveGame();
    });
    return;
  }
  // final catch
  say([
    { who: 'Biscuit', text: '*surrender raccoon noises* (He offers back the tray. One biscuit has a tiny bite in it.)' },
    { who: 'Niko', text: 'ALL of them, Biscuit… okay, you can keep the nibbled one.' },
    { who: 'Hana', text: 'My biscuits! Oh, you two. Detective work deserves payment — one each, no crumbs for burglars… oh, go on then.' },
  ], () => {
    S.custardStage = 4;
    W.crumbs = [];
    W.biscuit.mode = 'follow';
    addKindness(10, 'The Custard Caper, solved!');
  });
}

/* ---- kitten rescue (three kind solutions) ---- */
function kittenQuest() {
  say([
    { who: 'Mei', text: 'Niko! Sora chased a butterfly ALL the way up the great cherry tree and now she’s stuck and crying!' },
    { who: 'Niko', text: 'Don’t worry, Mei. There’s always a way — usually three!' },
  ], () => choice([
    { label: 'Climb up quietly with the silent step 🐾', action: () => kittenSolve('climb') },
    { label: 'Ask Biscuit to have a gentle word ☝️', action: () => kittenSolve('biscuit') },
    { label: 'Make a trail of Hana’s warm bread 🍞', action: () => kittenSolve('bread') },
  ]));
}
function kittenSolve(how) {
  const seqs = {
    climb: [
      { who: 'Niko', text: '*silent step… silent step… silent CLIMB…*' },
      { who: 'Niko', text: 'Hey Sora. Nice branch. Mind if I sit? …Want a lift down?' },
      { who: 'Mei', text: 'She’s PURRING. Niko, you absolute ninja.' },
    ],
    biscuit: [
      { who: 'Biscuit', text: '*diplomatic raccoon noises* (He climbs up and appears to be… negotiating?)' },
      { who: 'Biscuit', text: '*triumphant raccoon noises* (Sora rides down on his back like a tiny orange queen.)' },
      { who: 'Mei', text: 'A raccoon rescue service. Kageyama has EVERYTHING.' },
    ],
    bread: [
      { who: 'Niko', text: 'One warm bread-crumb… two warm bread-crumbs… all the way down the trunk.' },
      { who: 'Niko', text: 'Sniff… sniff sniff… PATTER PATTER PATTER. Works every time!' },
      { who: 'Mei', text: 'Clever! Mama Hana’s bread could tempt a kitten off the moon.' },
    ],
  };
  say(seqs[how].concat([
    { who: 'Mei', text: 'Thank you, Niko. You know what I love about you? You never once said “I can’t.”' },
    { who: 'Niko', text: 'Oh I say it all the time! I just always put a “yet” on the end.' },
  ]), () => {
    S.flags.kittenDone = true;
    npc('mei').place();
    addKindness(14, 'Sora the kitten is safe!');
  });
}

/* ---- chapter 1 completion & Biscuit's arrival ---- */
function checkCh1() {
  const f = S.flags;
  if (f.hana1 && f.daichi1 && f.akiko1 && !f.ch1Done) {
    setTimeout(() => {
      say([
        { who: '???', text: '*rustle rustle* …*CRASH* …*extremely casual whistling*' },
        { who: 'Akiko', text: 'And THAT is Biscuit the raccoon. He turned up the day you were born and never left.' },
        { who: 'Biscuit', text: '*friendly raccoon noises* (He drops a slightly-nibbled biscuit into Niko’s lap. A gift!)' },
        { who: 'Hana', text: 'Welcome to the family, both of you. Now — growing up starts tomorrow. Or… right now, if you like!' },
      ], () => {
        f.ch1Done = true;
        f.biscuitJoined = true;
        W.biscuit.mode = 'follow';
        W.biscuit.x = S.px - 30; W.biscuit.y = S.py + 10;
        addKindness(8, 'A family, and a raccoon.');
      });
    }, 250);
  }
}

/* ---- age-up & festival cutscenes ---- */
const CUT = { lines: [], i: 0, t: 0, onDone: null };
function cutscene(lines, onDone) {
  S.mode = 'cutscene';
  CUT.lines = lines; CUT.i = 0; CUT.t = 0; CUT.onDone = onDone;
  for (let i = 0; i < 40; i++) spawnPetal(true);
}
function updateCutscene(dt) {
  CUT.t += dt;
  if (CUT.t > 3.0) { CUT.t = 0; CUT.i++; }
  if (CUT.i >= CUT.lines.length) endCutscene();
}
function endCutscene() {
  S.mode = 'explore';
  const cb = CUT.onDone; CUT.onDone = null;
  if (cb) cb();
}

function ageUp() {
  cutscene([
    'The seasons turn in Kageyama…',
    'Cherry blossoms fall, and fall, and fall…',
    'Little Niko practises every single day.',
    'He is five years old now — and today is his first day at Ninja School!',
  ], () => {
    S.stage = 2;
    GATE_TILES.forEach(([x, y]) => setSolid(x, y, false));
    npcs.forEach((n) => n.place());
    S.px = 17.5 * T; S.py = 10 * T; // just outside the family gate
    toast('The yard gate is open — the village is yours! 🌸');
    Sfx.fanfare();
    refreshHud();
    saveGame();
  });
}

function maybeFestival() {
  if (S.kindness >= 80 && !S.flags.festivalDone) {
    S.flags.festivalDone = true;
    saveGame();
    const fire = () => {
      if (S.mode !== 'explore') { setTimeout(fire, 1000); return; }
      cutscene([
      'That evening, all of Kageyama gathers under the blossom tree…',
      'Lanterns glow. The mended bridge creaks happily. Sora naps on Elder Tomo’s lap.',
      '“To Niko!” they cheer. “The ninja that COULD!”',
      'Niko grins. “I couldn’t do any of it… yet. And then I could!”',
      'Beyond the mountains, a dragon-shaped shadow watches, curious and kind…',
      '🌸 To be continued in Chapter 4: The Wider World 🌸',
      ], () => toast('Thank you for playing the vertical slice! 🌸'));
    };
    setTimeout(fire, 800);
  }
}

/* ================= the TRY-AGAIN minigames =================
   Every skill starts wobbly. Every failure is soft, funny, and makes the
   next try a little easier. Mastery is celebrated, never demanded. */
const MG = {
  cur: null,
  start(def) { MG.cur = def; S.mode = 'minigame'; if (def.enter) def.enter(); },
  end() { MG.cur = null; S.mode = 'explore'; },
};

const CHEERS = [
  { who: 'Hana', text: 'Wobbling is just walking that hasn’t finished practising!' },
  { who: 'Akiko', text: 'Let’s try one more time!' },
  { who: 'Daichi', text: 'One piece at a time, little one!' },
  { who: 'Biscuit', text: '*encouraging raccoon noises*' },
  { who: 'Akiko', text: 'That fall was 10/10. The getting-up will be even better.' },
  { who: 'Hana', text: 'Every ninja in this village fell over a thousand times. Ask Sensei Willow!' },
];

function tryCounter(skill) {
  S.tries[skill] = (S.tries[skill] || 0) + 1;
  return S.tries[skill];
}

/* -- shared walk-the-line minigame (First Steps & Balance Beam) -- */
function makeStepGame(cfg) {
  return {
    steps: 0, tilt: 0, driftV: 0, lastSide: 0, state: 'intro', msg: '',
    wind: 0, windT: U.rand(3, 5), t: 0,
    enter() { this.attempts = S.tries[cfg.skill] || 0; },
    ease() { return 1 / (1 + this.attempts * 0.35); }, // practice = steadier
    key(code) {
      if (this.state === 'intro' && (code === 'Space' || code === 'Enter')) { this.state = 'play'; return; }
      if (this.state === 'fallen' && (code === 'Space' || code === 'Enter')) {
        this.state = 'play'; this.tilt = 0; this.driftV = 0; this.steps = Math.max(0, this.steps - 1);
        return;
      }
      if (this.state === 'won' && (code === 'Space' || code === 'Enter')) { MG.end(); cfg.onWin(); return; }
      if (this.state !== 'play') return;
      const left = code === 'ArrowLeft' || code === 'KeyA';
      const right = code === 'ArrowRight' || code === 'KeyD';
      if (!left && !right) return;
      const side = left ? -1 : 1;
      if (side === this.lastSide) {
        this.tilt += side * 0.34; // same foot twice = extra wobble
        Sfx.step();
        return;
      }
      this.lastSide = side;
      this.steps++;
      this.tilt += side * 0.16 - this.tilt * 0.45; // stepping recentres you
      Sfx.step();
      if (this.steps >= cfg.goal) { this.state = 'won'; Sfx.fanfare(); }
    },
    update(dt) {
      this.t += dt;
      if (this.state !== 'play') return;
      // gentle random drift, tamed by practice
      this.driftV += U.rand(-1, 1) * dt * cfg.drift * this.ease();
      this.driftV = U.clamp(this.driftV, -0.5, 0.5);
      if (cfg.windy) {
        this.windT -= dt;
        if (this.windT <= 0) { this.wind = U.pick([-1, 1]) * 0.35; this.windT = U.rand(2.5, 4.5); setTimeout(() => { this.wind = 0; }, 1200); }
      }
      this.tilt += (this.driftV + this.wind * this.ease()) * dt * 2.2;
      if (Math.abs(this.tilt) > 1) {
        this.state = 'fallen';
        this.attempts = tryCounter(cfg.skill);
        this.msg = U.pick(CHEERS);
        Sfx.tumble();
      }
    },
    draw() {
      const g = ctx;
      // sky & ground
      const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, cfg.sky[0]); grad.addColorStop(1, cfg.sky[1]);
      g.fillStyle = grad; g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.fillStyle = cfg.ground; g.fillRect(0, 460, VIEW_W, VIEW_H - 460);
      // course
      const x0 = 150, x1 = 810, y = 460;
      if (cfg.beam) {
        g.fillStyle = '#b98a5a'; rr(g, x0 - 20, y - 14, x1 - x0 + 40, 16, 8); g.fill();
        g.fillStyle = '#8a6a4a';
        g.fillRect(x0, y, 10, 40); g.fillRect(x1 - 10, y, 10, 40);
        g.fillStyle = '#a8d5f2'; // soft mats
        rr(g, x0 - 40, y + 30, x1 - x0 + 80, 26, 12); g.fill();
      } else {
        g.fillStyle = 'rgba(255,255,255,.4)';
        for (let i = 0; i <= cfg.goal; i++) {
          g.beginPath(); g.ellipse(U.lerp(x0, x1 - 60, i / cfg.goal), y + 6, 14, 5, 0, 0, Math.PI * 2); g.fill();
        }
      }
      // the waiting cheerer
      drawPerson(g, x1 + 40, y + (cfg.beam ? -14 : 4), cfg.cheerLook);
      // Niko, tilting
      const nx = U.lerp(x0, x1 - 60, this.steps / cfg.goal);
      const ny = y + (cfg.beam ? -14 : 4);
      const fallen = this.state === 'fallen';
      const tiltDraw = fallen ? (this.tilt > 0 ? 1.35 : -1.35) : this.tilt * 0.5;
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(tiltDraw);
      drawPerson(g, 0, 0, playerLook());
      ctx.restore();
      if (fallen) { g.font = '22px sans-serif'; g.fillText('💫', nx + 14, ny - 46); }

      // tilt meter
      g.fillStyle = 'rgba(255,248,236,.9)'; rr(g, VIEW_W / 2 - 130, 40, 260, 26, 13); g.fill();
      g.fillStyle = '#7fb069'; rr(g, VIEW_W / 2 - 30, 42, 60, 22, 10); g.fill();
      const mx = VIEW_W / 2 + U.clamp(this.tilt, -1, 1) * 120;
      g.fillStyle = '#d0342c'; g.beginPath(); g.arc(mx, 53, 9, 0, Math.PI * 2); g.fill();
      drawMgText(cfg.title,
        this.state === 'intro' ? cfg.intro
        : this.state === 'fallen' ? `${this.msg.who}: “${this.msg.text}”  —  press SPACE to try again!`
        : this.state === 'won' ? cfg.winText
        : cfg.help,
        this.state === 'won');
      if (this.state === 'play' && this.wind) {
        g.font = 'bold 30px sans-serif'; g.fillStyle = '#4a6a8a';
        g.fillText(this.wind < 0 ? '🍃⬅ wind!' : 'wind ➡🍃', VIEW_W / 2 - 60, 110);
      }
      const tries = S.tries[cfg.skill] || 0;
      if (tries > 0 && this.state === 'play') {
        g.font = '14px sans-serif'; g.fillStyle = 'rgba(58,46,42,.8)';
        g.fillText(`practice makes steadier: ${tries} brave ${tries === 1 ? 'try' : 'tries'} so far 💪`, 20, VIEW_H - 20);
      }
    },
  };
}

function mgFirstSteps() {
  return makeStepGame({
    skill: 'walk', goal: 8, drift: 2.6, windy: false, beam: false,
    sky: ['#ffe9c9', '#ffd9e0'], ground: '#e8d9a8',
    title: 'First Steps!',
    intro: 'Alternate ⬅ and ➡ (or A / D) to toddle towards Mama. Keep the red dot in the green! Press SPACE to start.',
    help: 'Left… right… left… right… you’ve got this!',
    winText: 'NIKO IS WALKING! Hana scoops you up and spins you around! Press SPACE!',
    cheerLook: { h: 36, hair: '#4a3423', outfit: '#b06485', apron: '#fff3e0', bun: true },
    onWin() {
      S.flags.walkUnlocked = true;
      say([
        { who: 'Hana', text: 'You WALKED! Eight whole steps! Oh, my brave little blossom!' },
        { who: 'Akiko', text: 'See? “One more time” magic. Now — see those stepping stones on the pond?' },
      ], () => addKindness(8, 'First steps taken!'));
    },
  });
}

function mgBeam() {
  return makeStepGame({
    skill: 'beam', goal: 12, drift: 3.4, windy: true, beam: true,
    sky: ['#cde8f5', '#e8f5d8'], ground: '#e8d9a8',
    title: 'The Balance Beam',
    intro: 'Alternate ⬅ and ➡ across the beam. Mind the breeze — and remember, the mats are soft! SPACE to start.',
    help: 'Steady… steady… Akiko is cheering for you!',
    winText: 'ALL THE WAY ACROSS! Akiko is doing the proud-big-sister dance! Press SPACE!',
    cheerLook: { h: 34, hair: '#1a1a22', outfit: '#334d80', sash: '#e0985a', bun: true },
    onWin() {
      S.flags.beamDone = true;
      say([
        { who: 'Akiko', text: 'A whole summer it took me — you got it in an afternoon of one-more-times!' },
        { who: 'Niko', text: 'My knees only wobbled a LITTLE bit at the end.' },
        { who: 'Akiko', text: 'Wobbly knees, steady heart. Go see Sensei Willow — lesson two awaits.' },
      ], () => addKindness(10, 'Balance: mastered!'));
    },
  });
}

/* -- Brave Jump: time the hop across the pond stones -- */
function mgJump() {
  return {
    stone: 0, t: 0, zone: 0.22 + (S.tries.jump || 0) * 0.04, state: 'intro',
    msg: '', hopT: 0,
    enter() {},
    key(code) {
      if (this.state === 'intro' && (code === 'Space' || code === 'Enter')) { this.state = 'play'; return; }
      if (this.state === 'splash' && (code === 'Space' || code === 'Enter')) { this.state = 'play'; return; }
      if (this.state === 'won' && (code === 'Space' || code === 'Enter')) {
        MG.end();
        S.flags.jumpDone = true;
        say([
          { who: 'Akiko', text: 'THREE stone-hops! Mama! Papa! Did you SEE him?!' },
          { who: 'Hana', text: 'Our little ninja. Growing right in front of us…' },
        ], () => { addKindness(6, 'Brave jumps!'); setTimeout(ageUp, 400); });
        return;
      }
      if (this.state !== 'play' || this.hopT > 0) return;
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        const m = Math.sin(this.t * 3.1);
        if (Math.abs(m) <= this.zone) {
          this.hopT = 0.5; Sfx.pop();
        } else {
          this.state = 'splash';
          tryCounter('jump');
          this.zone = Math.min(0.5, this.zone + 0.045); // splashes make it easier
          this.msg = U.pick([
            'SPLASH! Biscuit giggles so hard he falls in too.',
            'SPLOOSH! “Refreshing!” says nobody’s dignity. Try again!',
            'A splash! Akiko: “Even splashes are practice!”',
          ]);
          Sfx.tumble();
        }
      }
    },
    update(dt) {
      this.t += dt;
      if (this.hopT > 0) {
        this.hopT -= dt;
        if (this.hopT <= 0) {
          this.stone++;
          if (this.stone >= 3) { this.state = 'won'; Sfx.fanfare(); }
        }
      }
    },
    draw() {
      const g = ctx;
      const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, '#ffe9c9'); grad.addColorStop(1, '#bfe3f2');
      g.fillStyle = grad; g.fillRect(0, 0, VIEW_W, VIEW_H);
      // pond
      g.fillStyle = '#6db3d6'; rr(g, 80, 380, 800, 160, 60); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.arc(200 + i * 140, 430 + (i % 2) * 40, 18, 0.2, Math.PI - 0.4); g.stroke();
      }
      // stones + banks
      g.fillStyle = '#e8d9a8';
      rr(g, 0, 420, 120, 180, 20); g.fill(); rr(g, 840, 420, 120, 180, 20); g.fill();
      const sx = [260, 450, 640];
      g.fillStyle = '#9a9aa6';
      sx.forEach((x) => { g.beginPath(); g.ellipse(x, 470, 42, 18, 0, 0, Math.PI * 2); g.fill(); });
      // niko
      const positions = [110, 260, 450, 640, 880];
      const from = positions[this.stone];
      const to = positions[this.stone + 1] || from;
      const p = this.hopT > 0 ? 1 - this.hopT / 0.5 : 0;
      const nx = U.lerp(from, to, p);
      const ny = (this.state === 'splash' ? 500 : 452) - Math.sin(p * Math.PI) * 60;
      drawPerson(g, nx, ny, playerLook());
      if (this.state === 'splash') { g.font = '26px sans-serif'; g.fillText('💦', nx - 12, ny - 40); }
      drawRaccoon(g, 60, 452, Math.sin(this.t * 4) * 2);
      // timing bar
      g.fillStyle = 'rgba(255,248,236,.92)'; rr(g, VIEW_W / 2 - 160, 60, 320, 34, 17); g.fill();
      const zw = this.zone * 150;
      g.fillStyle = '#7fb069'; rr(g, VIEW_W / 2 - zw, 64, zw * 2, 26, 12); g.fill();
      const m = Math.sin(this.t * 3.1);
      g.fillStyle = '#d0342c'; g.beginPath(); g.arc(VIEW_W / 2 + m * 150, 77, 10, 0, Math.PI * 2); g.fill();
      drawMgText('The Stepping Stones',
        this.state === 'intro' ? 'Press SPACE when the red dot is in the green — three brave hops! SPACE to start.'
        : this.state === 'splash' ? `${this.msg}  —  press SPACE for one more time!`
        : this.state === 'won' ? 'THREE HOPS! You’re across! Press SPACE!'
        : `Hop ${this.stone + 1} of 3 — wait for the green…`,
        this.state === 'won');
    },
  };
}

/* -- The Silent Step: sneak past napping Sensei Willow -- */
function mgSneak() {
  return {
    x: 480, y: 540, state: 'intro', eye: 'closed', eyeT: 2.5, t: 0,
    closedBonus: (S.tries.sneak || 0) * 0.3,
    enter() {},
    key(code) {
      if (this.state === 'intro' && (code === 'Space' || code === 'Enter')) { this.state = 'play'; return; }
      if (this.state === 'spotted' && (code === 'Space' || code === 'Enter')) {
        this.state = 'play'; this.x = 480; this.y = 540; this.eye = 'closed'; this.eyeT = 2.5;
        return;
      }
      if (this.state === 'won' && (code === 'Space' || code === 'Enter')) {
        MG.end();
        S.flags.sneakDone = true;
        say([
          { who: 'Sensei Willow', text: '…Interesting. I heard the wind, two moths, and a raccoon eating my chrysanthemums. But not you.' },
          { who: 'Niko', text: 'I did it! I really — wait, Biscuit ate your WHAT?' },
          { who: 'Sensei Willow', text: 'Lesson two: complete. Take a biscuit, silent one. The village has many doors for you now.' },
        ], () => addKindness(10, 'The silent step!'));
        return;
      }
    },
    update(dt) {
      if (this.state !== 'play') return;
      this.t += dt;
      this.eyeT -= dt;
      if (this.eyeT <= 0) {
        if (this.eye === 'closed') { this.eye = 'warn'; this.eyeT = 0.7; Sfx.blip(); }
        else if (this.eye === 'warn') { this.eye = 'open'; this.eyeT = U.rand(1.2, 1.8); }
        else { this.eye = 'closed'; this.eyeT = U.rand(2.0, 2.8) + this.closedBonus; }
      }
      const a = Input.axis();
      const moving = a.x || a.y;
      if (moving) {
        this.x = U.clamp(this.x + a.x * 150 * dt, 60, 900);
        this.y = U.clamp(this.y + a.y * 150 * dt, 130, 570);
        if (this.eye === 'open') {
          this.state = 'spotted';
          tryCounter('sneak');
          this.closedBonus = Math.min(1.5, this.closedBonus + 0.3);
          Sfx.tumble();
        }
      }
      if (U.dist(this.x, this.y, 480, 100) < 46 && this.state === 'play') {
        this.state = 'won'; Sfx.fanfare();
      }
    },
    draw() {
      const g = ctx;
      const grad = g.createLinearGradient(0, 0, 0, VIEW_H);
      grad.addColorStop(0, '#dff0d8'); grad.addColorStop(1, '#bfe3c8');
      g.fillStyle = grad; g.fillRect(0, 0, VIEW_W, VIEW_H);
      // garden dressing
      g.fillStyle = '#a8c898';
      [[140, 200], [800, 260], [230, 420], [720, 460], [150, 320], [830, 380]].forEach(([x, y]) => {
        g.beginPath(); g.ellipse(x, y, 46, 22, 0, 0, Math.PI * 2); g.fill();
      });
      g.font = '22px sans-serif';
      [[140, 195], [800, 255], [230, 415], [720, 455]].forEach(([x, y]) => g.fillText('🌼', x - 10, y));
      // biscuit jar
      g.fillStyle = '#e8c88a'; rr(g, 456, 76, 48, 40, 10); g.fill();
      g.fillStyle = '#b98a5a'; rr(g, 452, 68, 56, 14, 6); g.fill();
      g.font = '15px sans-serif'; g.fillStyle = '#6b4a2f'; g.fillText('biscuits!', 448, 136);
      // Willow, napping beside it
      drawPerson(g, 560, 130, Object.assign({}, npc('willow').look, { sleepy: this.eye !== 'open' }));
      const bubble = this.eye === 'closed' ? '💤' : this.eye === 'warn' ? '❔' : '👀';
      g.font = '26px sans-serif'; g.fillText(bubble, 585, 80);
      // eye state banner
      const col = this.eye === 'closed' ? '#7fb069' : this.eye === 'warn' ? '#e0b85a' : '#d0342c';
      g.fillStyle = col; rr(g, VIEW_W / 2 - 130, 24, 260, 30, 15); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center';
      g.fillText(this.eye === 'closed' ? 'Sensei is dozing — tiptoe!' : this.eye === 'warn' ? 'He’s stirring…!' : 'EYES OPEN — freeze!', VIEW_W / 2, 44);
      g.textAlign = 'left';
      // Niko
      drawPerson(g, this.x, this.y, playerLook());
      if (this.state === 'spotted') { g.font = '30px sans-serif'; g.fillText('❗', this.x - 8, this.y - 55); }
      drawMgText('The Silent Step',
        this.state === 'intro' ? 'Tiptoe to the biscuit jar — but only move while Sensei dozes (💤). SPACE to start.'
        : this.state === 'spotted' ? '“…Interesting,” says Sensei Willow. Back to the gate — SPACE for one more time!'
        : this.state === 'won' ? 'You reached the biscuits without a sound! Press SPACE!'
        : 'Move on 💤 … freeze on 👀',
        this.state === 'won');
    },
  };
}

function drawMgText(title, body, gold) {
  const g = ctx;
  g.fillStyle = 'rgba(255,248,236,.94)';
  rr(g, VIEW_W / 2 - 340, VIEW_H - 108, 680, 84, 16); g.fill();
  g.strokeStyle = gold ? '#e0b85a' : '#d9b98c'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#8a5a2b'; g.font = 'bold 17px sans-serif'; g.textAlign = 'center';
  g.fillText(title, VIEW_W / 2, VIEW_H - 82);
  g.fillStyle = '#3a2e2a'; g.font = '14.5px sans-serif';
  wrapText(g, body, VIEW_W / 2, VIEW_H - 58, 640, 19);
  g.textAlign = 'left';
}
function wrapText(g, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW) { g.fillText(line, cx, y); y += lh; line = w; }
    else line = test;
  }
  if (line) g.fillText(line, cx, y);
}

/* ================= interactables ================= */
function interactables() {
  const list = [];
  npcs.forEach((n) => {
    if (!n.visible) return;
    list.push({ x: n.x, y: n.y, r: 46, label: `Talk to ${n.name}`, act: () => talkTo(n.id) });
  });
  if (W.biscuit.mode === 'spot') {
    list.push({ x: W.biscuit.x, y: W.biscuit.y, r: 40, label: 'Catch Biscuit!', act: catchBiscuit });
  }
  // gate (locked in stage 1)
  if (S.stage === 1) {
    list.push({
      x: 16.5 * T, y: 10 * T, r: 44, label: 'The yard gate',
      act: () => say([
        { who: 'Niko', text: 'Ba? (The big wide world is out there…)' },
        { who: 'Hana', text: 'Soon, little blossom! First: hellos, first steps, and a few more breakfasts.' },
      ]),
    });
  }
  // pond stepping stones
  if (S.stage === 1 && S.flags.walkUnlocked && !S.flags.jumpDone) {
    list.push({ x: 12.5 * T, y: 11.5 * T, r: 50, label: 'Try the stepping stones', act: () => MG.start(mgJump()) });
  }
  // lanterns
  if (S.flags.lanternActive) {
    W.lanterns.forEach((l) => {
      if (!S.lanternsLit.includes(l.id)) {
        list.push({ x: l.tx * T + 16, y: l.ty * T + 16, r: 40, label: 'Light the lantern', act: () => lightLantern(l) });
      }
    });
  }
  // planks
  if (S.flags.bridgeQuest === 2 && !S.flags.bridgeFixed) {
    W.planks.forEach((p) => {
      if (!S.planksGot.includes(p.id)) {
        list.push({
          x: p.tx * T + 16, y: p.ty * T + 16, r: 40, label: 'Pick up the plank',
          act: () => {
            S.planksGot.push(p.id);
            Sfx.pop();
            toast(`Plank! ${S.planksGot.length} / 4 🪵`);
            saveGame();
            if (S.planksGot.length >= 4) toast('All planks! Back to Elder Tomo at the bridge!');
          },
        });
      }
    });
  }
  // scenery
  list.push({
    x: SAKURA.tx * T + 16, y: SAKURA.ty * T + 8, r: 56, label: 'The blossom tree',
    act: () => { for (let i = 0; i < 16; i++) spawnPetal(true); Sfx.sparkle(); say([{ who: 'Niko', text: U.pick(['Petal rain! Best tree in the whole village.', 'Akiko says this tree is older than Sensei Willow. The tree refuses to comment.', '*happy ninja-under-a-tree noises*']) }]); },
  });
  list.push({
    x: 25.5 * T, y: 21.5 * T, r: 44, label: 'The wishing well',
    act: () => { Sfx.sparkle(); say([{ who: 'Niko', text: U.pick(['*plip!* I wish… for everyone to have a good day. And biscuits.', '*plip!* The well says “thank you” in echo language.', 'Echo! Echo! (The well is very good at this game.)']) }]); },
  });
  if (S.stage >= 2 && S.flags.kittenDone === undefined && !S.flags.bridgeFixed) {
    list.push({
      x: 43 * T, y: 20.5 * T, r: 52, label: 'The broken bridge',
      act: () => say([{ who: 'Niko', text: 'Poor old bridge. Somebody should fix you… somebody with a papa who’s a carpenter, maybe!' }]),
    });
  }
  return list;
}

/* ================= movement & explore ================= */
function playerLook() {
  return S.stage === 1
    ? { h: 22, hair: '#1a1a22', eyes: '#3a2418', outfit: '#22335f', sash: '#d0342c' }
    : { h: 32, hair: '#1a1a22', eyes: '#3a2418', outfit: '#22335f', sash: '#d0342c', band: '#d0342c' };
}
function playerSpeed() {
  if (S.stage >= 2) return 165;
  return S.flags.walkUnlocked ? 110 : 70; // crawling is slow and adorable
}

function circleBlocked(px, py) {
  const r = 8;
  for (const [dx, dy] of [[-r, -r * 0.3], [r, -r * 0.3], [-r, r * 0.6], [r, r * 0.6]]) {
    if (isSolid(Math.floor((px + dx) / T), Math.floor((py + dy) / T))) return true;
  }
  return false;
}

function updateExplore(dt) {
  const a = Input.axis();
  const sp = playerSpeed();
  W.moving = !!(a.x || a.y);
  if (a.x) { const nx = S.px + a.x * sp * dt; if (!circleBlocked(nx, S.py)) S.px = nx; }
  if (a.y) { const ny = S.py + a.y * sp * dt; if (!circleBlocked(S.px, ny)) S.py = ny; }
  if (W.moving) {
    W.stepT += dt;
    if (W.stepT > 0.28) { W.stepT = 0; Sfx.step(); }
  }
  W.playerBob = W.moving ? Math.sin(W.time * 12) * 2 : Math.sin(W.time * 2.5) * 0.8;

  // biscuit follows with happy lag
  if (W.biscuit.mode === 'follow') {
    const tx = S.px - 26, ty = S.py + 8;
    W.biscuit.x = U.lerp(W.biscuit.x, tx, 1 - Math.pow(0.02, dt));
    W.biscuit.y = U.lerp(W.biscuit.y, ty, 1 - Math.pow(0.02, dt));
  }

  // lantern night clock (flavour only — kindness never punishes)
  if (S.flags.lanternActive) W.lanternTimer += dt;

  // nearest interactable
  const list = interactables();
  W.nearest = null;
  let best = 1e9;
  for (const it of list) {
    const d = U.dist(S.px, S.py, it.x, it.y);
    if (d < it.r && d < best) { best = d; W.nearest = it; }
  }

  // camera
  W.cam.x = U.clamp(S.px - VIEW_W / 2, 0, MAPW * T - VIEW_W);
  W.cam.y = U.clamp(S.py - VIEW_H / 2, 0, MAPH * T - VIEW_H);
}

/* ================= petals & sparkles ================= */
function spawnPetal(burst) {
  const cam = W.cam;
  W.petals.push({
    x: burst ? U.rand(cam.x, cam.x + VIEW_W) : cam.x + U.rand(-40, VIEW_W + 40),
    y: burst ? U.rand(cam.y, cam.y + VIEW_H) : cam.y - 20,
    vx: U.rand(-14, 26), vy: U.rand(14, 34),
    ph: U.rand(0, 6.28), t: U.rand(6, 11),
  });
}
function updateParticles(dt) {
  const rate = 0.5 + blossomLevel() * 0.9;
  if (Math.random() < rate * dt) spawnPetal(false);
  W.petals = W.petals.filter((p) => (p.t -= dt) > 0);
  W.petals.forEach((p) => {
    p.ph += dt * 2;
    p.x += (p.vx + Math.sin(p.ph) * 18) * dt;
    p.y += p.vy * dt;
  });
  W.sparkles = W.sparkles.filter((s) => (s.t -= dt) > 0);
  W.sparkles.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; });
}

/* ================= world rendering ================= */
const TILE_COLORS = {
  [TILE.GRASS]: ['#8fca7c', '#86c274'],
  [TILE.PATH]: ['#e0c28c', '#d9ba84'],
  [TILE.SAND]: ['#ead9a9', '#e3d2a2'],
  [TILE.BRIDGE]: ['#b98a5a', '#b08252'],
};

function drawWorld() {
  const g = ctx;
  const cam = W.cam;
  g.save();
  g.translate(-cam.x, -cam.y);

  const x0 = Math.floor(cam.x / T), x1 = Math.ceil((cam.x + VIEW_W) / T);
  const y0 = Math.floor(cam.y / T), y1 = Math.ceil((cam.y + VIEW_H) / T);

  // tiles
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = tileAt(x, y);
    if (t === TILE.WATER) {
      g.fillStyle = '#6db3d6';
      g.fillRect(x * T, y * T, T, T);
      if ((x + y * 3 + Math.floor(W.time * 2)) % 7 === 0) {
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
        g.beginPath(); g.arc(x * T + 16, y * T + 18, 8, 0.3, Math.PI - 0.5); g.stroke();
      }
      continue;
    }
    const pair = TILE_COLORS[t] || TILE_COLORS[TILE.GRASS];
    g.fillStyle = pair[U.hash(x, y) > 0.5 ? 0 : 1];
    g.fillRect(x * T, y * T, T, T);
    if (t === TILE.GRASS && U.hash(x + 99, y) < 0.09) {
      g.fillStyle = 'rgba(70,120,60,.4)';
      g.fillRect(x * T + 8 + U.hash(x, y + 7) * 14, y * T + 10 + U.hash(x + 3, y) * 12, 2, 5);
    }
    if (t === TILE.BRIDGE) {
      g.strokeStyle = 'rgba(90,60,30,.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x * T, y * T + 16); g.lineTo(x * T + T, y * T + 16); g.stroke();
    }
  }

  // broken bridge planks (before it's fixed)
  if (!S.flags.bridgeFixed) {
    g.save();
    g.translate(42 * T, 19 * T);
    g.rotate(-0.08);
    g.fillStyle = '#a3764a';
    g.fillRect(4, 10, 88, 12); g.fillRect(-2, 52, 60, 12);
    g.fillStyle = '#8a6a4a'; g.fillRect(30, 30, 34, 10);
    g.restore();
  }

  // flowers (revealed by warmth)
  const lvl = blossomLevel();
  W.flowers.forEach((f) => {
    if (f.lvl > lvl) return;
    if (f.tx < x0 - 1 || f.tx > x1 || f.ty < y0 - 1 || f.ty > y1) return;
    const px = f.tx * T + 6 + f.hue * 18, py = f.ty * T + 8 + ((f.hue * 7) % 1) * 16;
    g.fillStyle = ['#f5a3c0', '#f7d060', '#f78fb3', '#fff'][f.lvl - 1];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath(); g.arc(px + Math.cos(a) * 3, py + Math.sin(a) * 3, 2.2, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#e8b830';
    g.beginPath(); g.arc(px, py, 1.8, 0, Math.PI * 2); g.fill();
  });

  // crumbs (custard caper)
  g.fillStyle = '#c9973f';
  W.crumbs.forEach((c) => { g.beginPath(); g.arc(c.x, c.y, 3, 0, Math.PI * 2); g.fill(); });

  // plank pickups
  if (S.flags.bridgeQuest === 2 && !S.flags.bridgeFixed) {
    W.planks.forEach((p) => {
      if (S.planksGot.includes(p.id)) return;
      const px = p.tx * T, py = p.ty * T;
      const glow = 0.5 + Math.sin(W.time * 3 + p.id) * 0.3;
      g.fillStyle = `rgba(255,220,120,${glow * 0.35})`;
      g.beginPath(); g.arc(px + 16, py + 16, 18, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(px + 16, py + 16); g.rotate(0.5);
      g.fillStyle = '#b98a5a'; rr(g, -14, -5, 28, 10, 3); g.fill();
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 1.5; g.stroke();
      g.restore();
    });
  }

  /* -- depth-sorted drawables -- */
  const draws = [];

  W.fences.forEach((f) => {
    const open = f.gate && S.stage >= 2;
    draws.push({ y: f.ty * T + 24, fn: () => drawFence(g, f, open) });
  });
  W.buildings.forEach((b) => draws.push({ y: (b.ty + b.th) * T, fn: () => drawBuilding(g, b) }));
  W.trees.forEach((t) => draws.push({ y: t.ty * T + 28, fn: () => drawTree(g, t) }));
  W.lanterns.forEach((l) => {
    const lit = S.lanternsLit.includes(l.id) || (S.flags.lanternDone && true);
    draws.push({ y: l.ty * T + 30, fn: () => drawLantern(g, l, lit || blossomLevel() >= 2) });
  });
  draws.push({ y: 21.9 * T, fn: () => drawWell(g, 25 * T, 21 * T) });
  // training beam prop
  draws.push({ y: 31.4 * T, fn: () => {
    g.fillStyle = '#b98a5a'; rr(g, 19 * T, 31 * T, 6 * T, 10, 5); g.fill();
    g.fillStyle = '#8a6a4a'; g.fillRect(19 * T + 4, 31 * T + 8, 8, 14); g.fillRect(25 * T - 12, 31 * T + 8, 8, 14);
  } });
  // kitten in the great tree
  if (S.flags.bridgeFixed && !S.flags.kittenDone) {
    draws.push({ y: 1e9, fn: () => {
      drawKitten(g, GREAT_TREE.tx * T + 26, GREAT_TREE.ty * T - 68, Math.sin(W.time * 3) * 2);
      g.font = '16px sans-serif'; g.fillText('😿', GREAT_TREE.tx * T + 44, GREAT_TREE.ty * T - 84);
    } });
  } else if (S.flags.kittenDone) {
    draws.push({ y: 19 * T, fn: () => drawKitten(g, 47 * T + 8, 18.6 * T, Math.sin(W.time * 3) * 1.5) });
  }

  npcs.forEach((n) => {
    if (!n.visible) return;
    draws.push({ y: n.y, fn: () => {
      drawPerson(g, n.x, n.y, Object.assign({ bob: Math.sin(W.time * 2 + n.x) * 1.2 }, n.look));
      if (questMark(n)) {
        g.font = 'bold 20px sans-serif'; g.fillStyle = '#e8b830';
        g.fillText('!', n.x - 4, n.y - (n.look.h || 34) - 14 + Math.sin(W.time * 4) * 3);
      }
    } });
  });
  if (W.biscuit.mode !== 'hidden') {
    draws.push({ y: W.biscuit.y, fn: () => drawRaccoon(g, W.biscuit.x, W.biscuit.y, Math.sin(W.time * 5) * 1.5) });
  }
  draws.push({ y: S.py, fn: () => drawPerson(g, S.px, S.py, Object.assign({ bob: W.playerBob }, playerLook())) });

  draws.sort((a, b) => a.y - b.y).forEach((d) => d.fn());

  // sparkles & petals
  W.sparkles.forEach((s) => {
    g.fillStyle = `rgba(255,230,140,${s.t})`;
    g.beginPath(); g.arc(s.x, s.y, 3, 0, Math.PI * 2); g.fill();
  });
  W.petals.forEach((p) => {
    g.fillStyle = 'rgba(248,170,200,.85)';
    g.save(); g.translate(p.x, p.y); g.rotate(p.ph);
    g.beginPath(); g.ellipse(0, 0, 4, 2.4, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  });

  // interaction prompt
  if (W.nearest && S.mode === 'explore') {
    const it = W.nearest;
    g.font = 'bold 13px sans-serif';
    const w = g.measureText(it.label).width + 34;
    g.fillStyle = 'rgba(255,248,236,.94)';
    rr(g, it.x - w / 2, it.y - 64, w, 24, 12); g.fill();
    g.strokeStyle = '#d9b98c'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#d0342c'; g.fillText('✦', it.x - w / 2 + 10, it.y - 47);
    g.fillStyle = '#3a2e2a'; g.fillText(it.label, it.x - w / 2 + 24, it.y - 47);
  }

  g.restore();

  // gentle dusk tint during Lantern Night
  if (S.flags.lanternActive) {
    g.fillStyle = 'rgba(40,40,90,.18)';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // warm vignette
  const v = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(120,70,40,.16)');
  g.fillStyle = v; g.fillRect(0, 0, VIEW_W, VIEW_H);
}

function questMark(n) {
  const f = S.flags;
  if (S.stage === 1) {
    if ((n.id === 'hana' && !f.hana1) || (n.id === 'daichi' && !f.daichi1) || (n.id === 'akiko' && !f.akiko1)) return true;
    if (n.id === 'hana' && f.ch1Done && !f.walkUnlocked) return true;
    return false;
  }
  if (n.id === 'willow' && (!f.metWillow || (f.metKids && f.beamDone && !f.sneakDone))) return true;
  if ((n.id === 'kenji' && f.metWillow && !f.met_kenji) || (n.id === 'mei' && f.metWillow && !f.met_mei)) return true;
  if (n.id === 'akiko' && f.metKids && !f.beamDone) return true;
  if (f.sneakDone) {
    if (n.id === 'tomo' && !f.bridgeFixed) return true;
    if (n.id === 'yuki' && !f.lanternDone && !f.lanternActive) return true;
    if (n.id === 'hana' && S.custardStage === 0) return true;
    if (n.id === 'daichi' && f.bridgeQuest === 1) return true;
    if (n.id === 'mei' && f.bridgeFixed && !f.kittenDone) return true;
  }
  return false;
}

/* -- prop drawing -- */
function drawBuilding(g, b) {
  const x = b.tx * T, y = b.ty * T, w = b.tw * T, h = b.th * T;
  // wall
  g.fillStyle = b.wall;
  g.fillRect(x + 4, y + h * 0.35, w - 8, h * 0.65);
  // roof
  g.fillStyle = b.roof;
  g.beginPath();
  g.moveTo(x - 8, y + h * 0.4);
  g.lineTo(x + w * 0.5, y - h * 0.15);
  g.lineTo(x + w + 8, y + h * 0.4);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.12)';
  g.fillRect(x + 4, y + h * 0.35, w - 8, 6);
  // door
  const dx = b.door * T;
  g.fillStyle = '#7a5a3a';
  rr(g, dx - 10, y + h - 30, 22, 30, 6); g.fill();
  // windows
  g.fillStyle = '#ffe9b0';
  rr(g, x + 14, y + h * 0.5, 18, 16, 4); g.fill();
  rr(g, x + w - 32, y + h * 0.5, 18, 16, 4); g.fill();
  // sign
  g.font = 'bold 11px sans-serif'; g.textAlign = 'center';
  g.fillStyle = 'rgba(255,248,236,.9)';
  const tw = g.measureText(b.name).width + 14;
  rr(g, x + w / 2 - tw / 2, y + h * 0.16, tw, 16, 8); g.fill();
  g.fillStyle = '#6b4a2f';
  g.fillText(b.name, x + w / 2, y + h * 0.16 + 12);
  g.textAlign = 'left';
}

function drawTree(g, t) {
  const x = t.tx * T + 16, y = t.ty * T + 28;
  if (t.kind === 'sakura' || t.kind === 'great') {
    const s = t.kind === 'great' ? 1.5 : 1.15;
    g.fillStyle = '#8a5a3a';
    g.fillRect(x - 6 * s, y - 34 * s, 12 * s, 36 * s);
    g.fillStyle = '#f5a3c0';
    [[0, -52], [-26, -38], [26, -38], [-14, -60], [14, -60]].forEach(([ox, oy]) => {
      g.beginPath(); g.arc(x + ox * s, y + oy * s, 22 * s, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.arc(x - 10 * s, y - 58 * s, 10 * s, 0, Math.PI * 2); g.fill();
    return;
  }
  g.fillStyle = '#7a5a3a';
  g.fillRect(x - 4, y - 18, 8, 20);
  g.fillStyle = U.hash(t.tx, t.ty) > 0.5 ? '#5d8a4a' : '#6a9a55';
  g.beginPath();
  g.arc(x, y - 30, 15, 0, Math.PI * 2);
  g.arc(x - 10, y - 20, 12, 0, Math.PI * 2);
  g.arc(x + 10, y - 20, 12, 0, Math.PI * 2);
  g.fill();
}

function drawFence(g, f, open) {
  const x = f.tx * T, y = f.ty * T;
  if (f.gate) {
    g.fillStyle = '#a3764a';
    if (open) { // swung-open gate posts
      g.fillRect(x + 2, y + 8, 5, 18);
      g.fillRect(x + 25, y + 8, 5, 18);
    } else {
      g.fillRect(x + 2, y + 8, 5, 18); g.fillRect(x + 25, y + 8, 5, 18);
      g.fillRect(x + 2, y + 11, 28, 4); g.fillRect(x + 2, y + 19, 28, 4);
    }
    return;
  }
  g.fillStyle = '#b98a5a';
  g.fillRect(x + 6, y + 8, 5, 18);
  g.fillRect(x + 21, y + 8, 5, 18);
  g.fillRect(x, y + 12, T, 4);
}

function drawLantern(g, l, lit) {
  const x = l.tx * T + 16, y = l.ty * T + 30;
  if (lit) {
    const glow = g.createRadialGradient(x, y - 26, 4, x, y - 26, 42);
    glow.addColorStop(0, 'rgba(255,214,120,.55)');
    glow.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(x, y - 26, 42, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#5a4a3a';
  g.fillRect(x - 2, y - 22, 4, 24);
  g.fillStyle = lit ? '#ffd678' : '#d9cbb8';
  rr(g, x - 7, y - 34, 14, 16, 4); g.fill();
  g.fillStyle = '#5a4a3a';
  g.fillRect(x - 9, y - 36, 18, 3);
}

function drawWell(g, x, y) {
  g.fillStyle = '#9a9aa6';
  g.beginPath(); g.ellipse(x + 16, y + 20, 16, 10, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6db3d6';
  g.beginPath(); g.ellipse(x + 16, y + 20, 10, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a6a4a';
  g.fillRect(x + 2, y - 6, 4, 26); g.fillRect(x + 26, y - 6, 4, 26);
  g.fillStyle = '#c0574f';
  g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 16, y - 16); g.lineTo(x + 36, y - 4); g.closePath(); g.fill();
}

/* ================= cutscene rendering ================= */
function drawCutscene() {
  const g = ctx;
  drawWorld();
  g.fillStyle = 'rgba(30,25,45,.72)';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  const line = CUT.lines[CUT.i] || '';
  g.fillStyle = '#fff8ec';
  g.font = '24px "Comic Sans MS", "Segoe Print", sans-serif';
  g.textAlign = 'center';
  const alpha = Math.min(1, CUT.t * 2.2, Math.max(0, (3.0 - CUT.t) * 2.2));
  g.globalAlpha = alpha;
  wrapText(g, line, VIEW_W / 2, VIEW_H / 2 - 10, 720, 34);
  g.globalAlpha = 1;
  g.font = '13px sans-serif';
  g.fillStyle = 'rgba(255,248,236,.6)';
  g.fillText('SPACE to continue', VIEW_W / 2, VIEW_H - 30);
  g.textAlign = 'left';
}

/* ================= save / load ================= */
function saveGame() {
  try {
    const copy = Object.assign({}, S, { mode: 'explore' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
  } catch (e) { /* private mode etc. — play on without saving */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return Object.assign(freshState(), JSON.parse(raw));
  } catch (e) { return null; }
}

/* ================= game object & loop ================= */
window.Game = {
  keydown(code) {
    Sfx.ensure();
    if (!S) return;
    if (code === 'KeyM') {
      const m = Sfx.toggleMute();
      toast(m ? 'Sound off 🔇' : 'Sound on 🔊');
      return;
    }
    switch (S.mode) {
      case 'dialogue':
        if (!choicesEl.classList.contains('hidden')) {
          if (code.startsWith('Digit')) choiceKey(parseInt(code.slice(5), 10) - 1);
          return;
        }
        if (code === 'Space' || code === 'KeyE' || code === 'Enter') advanceDialogue();
        break;
      case 'explore':
        if ((code === 'Space' || code === 'KeyE' || code === 'Enter') && W.nearest) {
          Sfx.blip();
          W.nearest.act();
        }
        break;
      case 'minigame':
        if (MG.cur) MG.cur.key(code);
        break;
      case 'cutscene':
        if (code === 'Space' || code === 'Enter') { CUT.t = 0; CUT.i++; if (CUT.i >= CUT.lines.length) endCutscene(); }
        break;
    }
  },
};

let lastT = 0;
function frame(ms) {
  const dt = Math.min(0.05, (ms - lastT) / 1000 || 0.016);
  lastT = ms;
  if (S && S.mode !== 'title') {
    W.time += dt;
    updateParticles(dt);
    if (S.mode === 'explore') updateExplore(dt);
    else if (S.mode === 'dialogue') { updateDialogue(dt); updateExplore(0); }
    else if (S.mode === 'minigame' && MG.cur) MG.cur.update(dt);
    else if (S.mode === 'cutscene') updateCutscene(dt);

    if (S.mode === 'minigame' && MG.cur) MG.cur.draw();
    else if (S.mode === 'cutscene') drawCutscene();
    else drawWorld();
    refreshHud();
  }
  requestAnimationFrame(frame);
}

/* ================= boot ================= */
function startGame(state) {
  S = state;
  buildWorld();
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  S.mode = 'explore';
  refreshHud();
  Sfx.ensure();
  if (S.stage === 1 && !S.flags.hana1) {
    setTimeout(() => say([
      { who: 'Narrator', text: 'In the hidden village of Kageyama, where the mountains hold hands with the mist, a small ninja opens his eyes…' },
      { who: 'Narrator', text: 'This is Niko. He can’t do very much at all. …YET.' },
      { who: 'Niko', text: '*determined baby noises*' },
    ]), 400);
  }
}

function boot() {
  Input.init();
  const saved = loadGame();
  const btnNew = document.getElementById('btn-new');
  const btnCont = document.getElementById('btn-continue');
  if (saved) btnCont.classList.remove('hidden');
  btnNew.onclick = () => { Sfx.ensure(); startGame(freshState()); };
  btnCont.onclick = () => { Sfx.ensure(); startGame(saved); };
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
