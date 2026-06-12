# ÉLAN — Luxury Organic Candle Landing Page

A conversion-focused, editorial landing page for a luxury organic candle brand
built around training and recovery rituals (a premium reimagining of
fitnesscandles.lovable.app).

## Run it

No build step. Open `index.html` directly, or serve the folder:

```bash
cd landing
python3 -m http.server 8080
# → http://localhost:8080
```

Deployable as-is to GitHub Pages, Netlify, Vercel, or any static host.

## What's inside

- `index.html` — semantic, accessible single-page layout
- `styles.css` — design system (Fraunces + Inter, dark/cream/gold palette)
- `script.js` — scroll reveals, demo cart, email capture, sticky mobile CTA

## Conversion design decisions

- **Positioning**: "the athlete's ritual" — three scents mapped to focus
  (Ignite), wind-down (Restore), and sleep (Rest), giving a reason to buy
  all three.
- **Price anchoring**: $58 singles anchor the $148 bundle (Save $26 badge,
  free shipping) as the obvious choice.
- **Risk reversal**: 30-day "flame-out guarantee" — refund without return.
- **Social proof**: rating in the hero, verified-buyer reviews, batch scarcity
  ("hand-poured weekly in batches of 200").
- **Capture**: 10% off email opt-in for visitors not ready to buy.
- **Mobile**: sticky bottom CTA appears after the hero scrolls away.

All imagery is CSS/SVG (animated flame included) — zero image assets, nothing
to break, fast first paint. The only external dependency is Google Fonts.

The cart and email form are front-end demos; wire them to your
commerce/ESP backend (e.g. Shopify Buy Button, Klaviyo) to go live.
