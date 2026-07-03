# 🟡 Pac-Swipe

A mobile-first, Pac-Man-style arcade game in a single self-contained HTML file —
no build step, no dependencies, works offline.

## Play

Open [`index.html`](index.html) in any browser. On a phone, serve the folder and
visit it from your mobile browser:

```bash
# from the repo root
python3 -m http.server 8080
# then open http://<your-computer-ip>:8080/pacman/ on your phone
```

Or host it anywhere static (GitHub Pages, Netlify, etc.) — it's one file.

## Controls

- **Mobile:** swipe anywhere on the maze — up / down / left / right. You can
  chain swipes without lifting your finger.
- **Desktop:** arrow keys or WASD. `P` or `Space` pauses.

## Features

- 🕹️ Classic maze gameplay: dots, power pellets, wrap-around tunnel, ghost house
- 👻 Four ghosts with distinct AI personalities (chaser, ambusher, flanker, shy)
  and scatter/chase mode cycles
- 💙 Power pellets turn ghosts frightened — eat them for 200 / 400 / 800 / 1600
  points; eyes fly home and respawn
- 🍒 Bonus fruit appears twice per level, worth more on higher levels
- 📈 Endless levels — each one is faster with shorter fright time
- ❤️ 3 lives, extra life at 10,000 points
- 🏆 High score saved on your device (localStorage)
- 🔊 Retro sound effects (WebAudio, mutable), pause button, auto-pause when the
  app goes to the background
