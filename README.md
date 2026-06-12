# Darikwa

This repository contains two things:

1. **[`site/`](site/)** — the **darikwa.com landing page**: a zero-framework,
   crawler-first single page (semantic HTML + vanilla CSS/JS, no build step).
   Deploy it by pointing any static host — GitHub Pages, Cloudflare Pages,
   Netlify, or a plain nginx root — at the `site/` directory. Includes
   `robots.txt`, `sitemap.xml`, an Open Graph image and JSON-LD structured data.
   Preview locally with `python3 -m http.server -d site 8000`.
2. The **Grok Picture-to-Video** app, documented below.

---

# 🎬 Grok Picture-to-Video

Turn a still image into a short, animated video clip using **xAI's Grok Imagine**
image-to-video model. Drag in a picture, describe the motion, and get an `.mp4`
back — through a clean web UI or a command-line tool.

> Grok Imagine is **image-to-video**: every generation starts from an input
> image. The app submits your picture + prompt to xAI, polls until the clip is
> rendered, then streams it back for preview and download.

---

## Features

- 🖼️ **Drag-and-drop web UI** — upload, set a prompt, watch progress, preview, download.
- 🎛️ **Controls** for duration (1–15s), resolution (480p / 720p) and aspect ratio.
- ⚡ **Async-aware** — mirrors xAI's submit → poll → fetch flow with live status.
- 🧪 **Mock mode** — runs end-to-end without an API key (serves a sample clip),
  so you can try the UI without spending credits.
- 🖥️ **CLI** (`cli.py`) for scripting and batch jobs, sharing the same backend client.

---

## Quick start

```bash
# 1. Install dependencies (a virtualenv is recommended)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Configure your key
cp .env.example .env
#   then edit .env and set XAI_API_KEY=...

# 3. Run the web app
uvicorn app.main:app --reload

# 4. Open http://127.0.0.1:8000
```

Without an `XAI_API_KEY`, the app starts in **mock mode** automatically — handy
for a first look at the interface.

---

## Configuration

All settings come from environment variables (or a `.env` file). See
[`.env.example`](.env.example).

| Variable            | Default                | Description                                         |
| ------------------- | ---------------------- | --------------------------------------------------- |
| `XAI_API_KEY`       | _(none)_               | Your xAI key with Grok Imagine access. **Required** for real generation. |
| `XAI_BASE_URL`      | `https://api.x.ai`     | API base URL.                                       |
| `GROK_VIDEO_MODEL`  | `grok-imagine-video`   | Video model id.                                     |
| `MAX_UPLOAD_BYTES`  | `15728640` (15 MB)     | Max upload size.                                    |
| `XAI_TIMEOUT`       | `60`                   | Per-request timeout (seconds).                      |
| `GROK_MOCK`         | `0`                    | Set `1` to force mock mode.                         |

---

## Command-line use

```bash
python cli.py photo.jpg \
  --prompt "Slow cinematic push-in, clouds drifting, golden-hour light" \
  --duration 6 --resolution 720p --aspect-ratio 16:9 \
  --out clip.mp4
```

---

## How it works

```
Browser ──upload image + prompt──▶  FastAPI  ──POST /v1/videos/generations──▶  xAI
   ▲                                   │                                        │
   │        poll /api/status/{id} ◀────┘   ◀──── request_id ────────────────────┘
   │                                   │
   └──◀── video URL / download ────────┘   GET /v1/videos/{id}  (status: done)
```

- **`app/main.py`** — FastAPI routes: `/api/generate`, `/api/status/{id}`,
  `/api/download/{id}`, `/api/health`.
- **`app/grok_client.py`** — async wrapper around xAI's two-step video API,
  plus the mock implementation.
- **`app/config.py`** — environment-driven settings.
- **`app/static/`** — the single-page front-end (HTML/CSS/JS, no build step).
- **`cli.py`** — terminal companion built on the same client.

The download route proxies the finished clip through the backend so saving works
regardless of CORS or signed-URL expiry on the upstream host.

---

## Project layout

```
.
├── app/
│   ├── main.py            # FastAPI app + routes
│   ├── config.py          # settings from env
│   ├── grok_client.py     # xAI Grok Imagine client (+ mock)
│   └── static/            # index.html, style.css, app.js
├── cli.py                 # command-line tool
├── requirements.txt
├── .env.example
└── README.md
```

---

## Notes

- API request/response field names target xAI's documented Grok Imagine video
  endpoints. They're isolated in `app/grok_client.py` and configurable via env,
  so if xAI adjusts a path or field you only touch one file.
- Generated `.mp4` files and your `.env` are git-ignored.
