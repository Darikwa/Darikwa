# Niko the Ninja That Could! — Game Design Document

*Response to the master prompt in `gamedesignprompt.md`. The playable vertical
slice in this folder implements the systems marked ✅.*

---

## 1. Elevator pitch

**Niko the Ninja That Could!** is a warm, story-driven adventure for children
and families (E / PEGI 3) in which you *raise* a hero instead of grinding one.
You are Niko — a small, clumsy, endlessly determined ninja growing from
toddler to young leader in the hidden village of Kageyama, where "a strong
ninja helps others rise." There is no combat and no game-over: every skill
begins as a wobbly, funny failure and is mastered through gentle practice
(*"Maybe I can't do it… YET"*), every problem has a kind or clever solution,
and every act of helping makes the village visibly blossom. It's *Fable*'s
aging hero and world-that-remembers, wrapped in *Ni no Kuni* storybook warmth,
*Spiritfarer* care-as-gameplay, and *Bluey* humour.

## 2. Core gameplay loop ✅

```
Explore Kageyama → meet someone who needs help / hit a challenge
   → TRY → stumble (soft, funny fail) → kind nudge from family
   → TRY AGAIN (each attempt literally makes the next one easier)
   → master it → Kindness Meter rises → the village blossoms
   → now help someone who is where you just were
```

Sessions are short, complete "help someone" loops of 5–15 minutes with a
longer chapter spine (the seven books) for players who want it.

**In the slice:** the TRY-AGAIN loop is a real mechanic — every minigame
(First Steps, Stepping Stones, Balance Beam, Silent Step) tracks brave tries
per skill and widens its tolerance with each failure, so persistence is
mechanically rewarded, never punished. Fails trigger rotating encouragement
lines from the family instead of a fail screen.

## 3. Four-stage progression ✅ *(stages 1–2 playable)*

| Stage | Age | World | Sample skills |
|---|---|---|---|
| **Origins** ✅ | 0–4 | The family yard | Crawl → **first steps** (minigame) → **brave jump**; "one more time" taught by Akiko |
| **Academy** ✅ | 5–7 | The whole village opens | **Balance beam**, **silent step** (hide-and-seek stealth), helping verbs: fetch, mend, light, rescue |
| **Wider World** | 8–10 | New villages, dragon's mountain | Rooftop dash, blossom-leaf glider, animal-speak, tool-crafting |
| **Leadership** | 11–13 | Region-wide festivals | Team commands, mentoring younger ninjas, big-contraption building |

Choices, friendships and skills carry forward; the age-up is a cherry-blossom
cutscene and the world physically opens (in the slice, the yard gate unlocks
and Kageyama becomes explorable). Skills are gated by story and practice —
never by XP.

## 4. Kindness Meter — rules & rewards ✅

- **Raised by:** helping neighbours, first friendships, patience through
  failure, creative solutions, festivals, caring for animals.
- **No evil path, no decay, no punishment.** The only variable is how much
  the village flourishes.
- **Visible feedback (implemented):** at 15 / 35 / 55 / 75 warmth the world
  blossoms in waves — wildflowers bloom along the paths, lanterns glow at
  dusk, petal-fall thickens, NPCs gain celebratory lines.
- **Rewards:** new companions (Biscuit), new areas (the mended bridge opens
  the meadow), story scenes (the Festival of Blossoms at 80+), cosmetics and
  recipes in the full game — never power that trivialises challenge.

## 5. Chapter breakdown — the seven books ✅ *(1–3 playable + book 7 in miniature)*

1. **Niko is Born — Family** ✅ *(tutorial)*: movement, the yard, meeting
   Hana, Daichi, Akiko; Biscuit arrives.
2. **Niko Takes His First Steps — Trying** ✅: the TRY-AGAIN loop is taught
   with the First Steps and Stepping Stones minigames; ends in the age-up.
3. **First Day at Ninja School — Courage** ✅: Academy hub, Sensei Willow,
   first friends (Kenji & Mei), balance beam, the silent step.
4. **The Midnight Obstacle Course — Different strengths**: co-solve relay
   where each friend's ability clears one leg (Kenji climbs, Mei navigates
   by stars…).
5. **The Dragon's Secret — Understanding others**: befriend, don't fight;
   Hana's poultice heals a sneezing dragon-cub. *(Foreshadowed in the slice's
   festival ending.)*
6. **The Shadow Sneezes — Creativity**: invention/puzzle chapter built on
   Daichi's contraption system.
7. **The Lost Kitten Rescue — Helping others** ✅ *(in miniature)*: an
   open-ended rescue with three equally valid kind solutions.

## 6. Side quests ✅ *(4 of 7 implemented)*

1. ✅ **Biscuit's Custard Caper** — follow the crumb trail; the companion
   causes the problem you solve (the running gag is a mechanic).
2. ✅ **The Wobbly Bridge** — gather four planks with Daichi and rebuild it
   "one piece at a time" so Elder Tomo can reach the meadow he was married in.
3. ✅ **Lantern Night** — light all 8 lanterns to welcome baby Ren; the timer
   is pure flavour — kindness never fails.
4. ✅ **Lost Kitten Rescue** — coax Sora down by silent-step climbing,
   raccoon diplomacy, or a trail of Hana's warm bread.
5. **Hana's Poultice** — forage herbs, healing minigame (leads into Book 5).
6. **Akiko's One More Time** — rhythm practice that celebrates persistence,
   not speed.
7. **The Different-Strengths Relay** — recruit friends whose abilities each
   clear one leg of a course nobody can finish alone.

## 7. Art & audio brief ✅ *(style-bible compliant)*

- **Look:** storybook warmth — bright flat colours, soft rounded shapes,
  cinematic vignette, drifting cherry-blossom petals. **Locked:** Niko always
  has black hair, dark brown eyes, a navy outfit and a red sash — at every
  age. No hyper-realism, no dark/horror aesthetics.
- **Audio (implemented procedurally):** gentle pentatonic koto-style plucks
  over a warm root drone; soft chimes for kindness, comic tumbles for soft
  fails, a little fanfare for mastery. Full game: gentle orchestral +
  Japanese-inspired instrumentation, cosy village ambience, warm read-aloud
  voice-over.
- **Fail states:** never "Game Over" — always "Maybe not yet — let's try one
  more time."

## 8. Platform & scope recommendation

- **Vertical slice (this folder):** Books 1–3 + Book 7 in miniature, proving
  the age-up transition, the TRY-AGAIN loop and the Kindness Meter — built as
  a zero-dependency HTML5 canvas game so it runs anywhere a browser does,
  keyboard and touch.
- **Lead platforms for production:** Nintendo Switch + PC (family/handheld
  fit) with a tablet-friendly control scheme; Unity or Godot with stylised
  toon shading for a small team.
- **Session shape:** 5–15 minute self-contained helping loops; ~8–12 hour
  chapter spine across the four life stages.

---

*The franchise's emotional promise — effort and kindness matter more than
being the best — survived every design trade-off in this slice: there is no
way to lose, only more ways to help.*
