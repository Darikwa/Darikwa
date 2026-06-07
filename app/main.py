"""FastAPI web app: turn a still picture into a short video with Grok Imagine.

Routes:
    GET  /                       -> the single-page UI
    POST /api/generate           -> upload image + options, start a job
    GET  /api/status/{id}        -> poll job status (status + video URL)
    GET  /api/download/{id}      -> stream the finished clip as an attachment
    GET  /api/health             -> basic readiness info
"""
from __future__ import annotations

import base64
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import grok_client
from .config import settings

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Grok Picture-to-Video", version="1.0.0")

ALLOWED_RESOLUTIONS = {"480p", "720p"}
ALLOWED_ASPECT_RATIOS = {"16:9", "9:16", "1:1", "4:3", "3:4"}
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse(
        {
            "ok": True,
            "mock_mode": settings.mock_mode,
            "model": settings.video_model,
        }
    )


@app.post("/api/generate")
async def generate(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    duration: int = Form(5),
    resolution: str = Form("720p"),
    aspect_ratio: str = Form("16:9"),
) -> JSONResponse:
    # --- validate inputs -------------------------------------------------
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image type '{image.content_type}'. "
            "Use PNG, JPEG or WebP.",
        )

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(raw) > settings.max_upload_bytes:
        limit_mb = settings.max_upload_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Limit is {limit_mb:.0f} MB.",
        )

    prompt = prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    if not 1 <= duration <= 15:
        raise HTTPException(status_code=400, detail="Duration must be 1-15 seconds.")
    if resolution not in ALLOWED_RESOLUTIONS:
        raise HTTPException(status_code=400, detail="Resolution must be 480p or 720p.")
    if aspect_ratio not in ALLOWED_ASPECT_RATIOS:
        raise HTTPException(status_code=400, detail="Unsupported aspect ratio.")

    # --- build the data URI and submit ----------------------------------
    b64 = base64.b64encode(raw).decode("ascii")
    data_uri = f"data:{image.content_type};base64,{b64}"

    try:
        request_id = await grok_client.submit(
            image_data_uri=data_uri,
            prompt=prompt,
            duration=duration,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
        )
    except grok_client.GrokError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return JSONResponse({"request_id": request_id})


@app.get("/api/status/{request_id}")
async def status(request_id: str) -> JSONResponse:
    try:
        result = await grok_client.get_status(request_id)
    except grok_client.GrokError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return JSONResponse(
        {
            "request_id": result.request_id,
            "status": result.status,
            "video_url": result.video_url,
            "error": result.error,
        }
    )


@app.get("/api/download/{request_id}")
async def download(request_id: str) -> StreamingResponse:
    """Proxy the finished clip so the browser download works regardless of
    CORS or signed-URL quirks on the upstream host."""
    try:
        result = await grok_client.get_status(request_id)
    except grok_client.GrokError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if result.status != "done" or not result.video_url:
        raise HTTPException(status_code=409, detail="Video is not ready yet.")

    filename = f"grok-video-{request_id}.mp4"
    return StreamingResponse(
        grok_client.stream_video(result.video_url),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Serve CSS/JS assets. Mounted last so it doesn't shadow the API routes above.
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
