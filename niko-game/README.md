# 🥷🌸 Niko the Ninja That Could!

A playable **vertical slice** of the story-driven, non-violent family
adventure game from the Niko universe — Books 1–3 as chapters, the
TRY-AGAIN loop, the Kindness Meter, and an age-up from toddler to Academy
student. Rated E / PEGI 3 in spirit: no combat, no death, no game-over.

> *"Maybe I can't do it… **yet**."*

## Play it

No build step, no dependencies — it's plain HTML5/Canvas/JS:

```bash
# either just open the file…
open niko-game/index.html          # macOS
xdg-open niko-game/index.html      # Linux

# …or serve it (recommended so saves persist per-site)
cd niko-game && python3 -m http.server 8080
# then visit http://localhost:8080
```

Works with keyboard (WASD/arrows + E/Space, M to mute) and touch
(on-screen pad appears on touch devices). Progress autosaves to
`localStorage`.

## What's in the slice

| System | Where you'll meet it |
|---|---|
| **Chapter 1 · Niko is Born** | Meet Hana, Daichi and Akiko in the family yard; Biscuit the raccoon adopts you |
| **Chapter 2 · First Steps** | The TRY-AGAIN loop: wobbly first-steps and stepping-stone minigames where every fail makes the next try easier |
| **Age-up** | A cherry-blossom cutscene — Niko turns 5, the yard gate opens, the whole village unlocks |
| **Chapter 3 · Ninja School** | Sensei Willow ("…Interesting."), first friends, the balance beam, the silent step |
| **Kindness Meter** | Helping raises Village Warmth — Kageyama visibly blossoms in four waves (flowers, glowing lanterns, thicker petal-fall) |
| **Side stories** | The Wobbly Bridge, Lantern Night, Biscuit's Custard Caper, and the Lost Kitten Rescue (three equally kind solutions) |
| **The festival** | At 80+ warmth the village throws a festival for "the ninja that COULD" — and a dragon-shaped shadow teases Chapter 4… |

Design details and the full production plan live in
[`GAME_DESIGN.md`](GAME_DESIGN.md).

## Style-bible compliance

Niko always has **black hair, dark brown eyes, a navy outfit and a red
sash** — at age 1 and at age 5. Fail states are soft ("one more time!"),
tone is warm and funny, and there is no way to lose — only more ways to
help.

## Code layout

```
niko-game/
├── index.html        # canvas + HTML UI overlays (title, dialogue, HUD, touch pad)
├── css/style.css     # storybook UI styling
└── js/
    ├── engine.js     # input, procedural WebAudio, chibi-character drawing
    └── game.js       # world, quests, dialogue, minigames, kindness, save/load
```
