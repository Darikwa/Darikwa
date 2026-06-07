"""Thin async client for xAI's Grok Imagine image-to-video API.

The real API is a two-step asynchronous flow:

1. ``POST {base}/v1/videos/generations`` with the model, prompt, input image
   (as a base64 data URI) and output options. It returns a ``request_id``.
2. ``GET  {base}/v1/videos/{request_id}`` is polled until ``status`` becomes
   ``done`` (or ``failed`` / ``expired``). When done, the payload contains the
   finished clip's URL.

This module wraps both steps and also provides a ``mock`` implementation so the
UI can be exercised without an API key or credits.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass

import httpx

from .config import settings

# A small, reliably-hosted clip used only in mock mode.
_MOCK_VIDEO_URL = (
    "https://commondatastorage.googleapis.com/"
    "gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
)
_MOCK_DELAY_SECONDS = 6.0


class GrokError(RuntimeError):
    """Raised when the xAI API returns an error or an unexpected payload."""


@dataclass
class JobStatus:
    request_id: str
    status: str  # "processing" | "done" | "failed" | "expired"
    video_url: str | None = None
    error: str | None = None

    @property
    def is_terminal(self) -> bool:
        return self.status in {"done", "failed", "expired"}


# In-memory bookkeeping for mock jobs: request_id -> creation timestamp.
_mock_jobs: dict[str, float] = {}


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.xai_api_key}",
        "Content-Type": "application/json",
    }


async def submit(
    *,
    image_data_uri: str,
    prompt: str,
    duration: int,
    resolution: str,
    aspect_ratio: str,
) -> str:
    """Start an image-to-video job and return its ``request_id``."""
    if settings.mock_mode:
        request_id = f"mock-{uuid.uuid4().hex[:12]}"
        _mock_jobs[request_id] = time.monotonic()
        return request_id

    body = {
        "model": settings.video_model,
        "prompt": prompt,
        "image_url": image_data_uri,
        "duration": duration,
        "resolution": resolution,
        "aspect_ratio": aspect_ratio,
    }

    url = f"{settings.xai_base_url}/v1/videos/generations"
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        resp = await client.post(url, headers=_headers(), json=body)

    if resp.status_code >= 400:
        raise GrokError(_extract_error(resp))

    data = resp.json()
    request_id = data.get("request_id") or data.get("id")
    if not request_id:
        raise GrokError(f"xAI response missing request_id: {data!r}")
    return request_id


async def get_status(request_id: str) -> JobStatus:
    """Poll a job once and report its current status."""
    if settings.mock_mode or request_id.startswith("mock-"):
        started = _mock_jobs.get(request_id)
        if started is None:
            return JobStatus(request_id, "failed", error="Unknown mock job")
        if time.monotonic() - started < _MOCK_DELAY_SECONDS:
            return JobStatus(request_id, "processing")
        return JobStatus(request_id, "done", video_url=_MOCK_VIDEO_URL)

    url = f"{settings.xai_base_url}/v1/videos/{request_id}"
    async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
        resp = await client.get(url, headers=_headers())

    if resp.status_code >= 400:
        raise GrokError(_extract_error(resp))

    data = resp.json()
    status = (data.get("status") or "processing").lower()
    video_url = None
    video = data.get("video")
    if isinstance(video, dict):
        video_url = video.get("url")
    video_url = video_url or data.get("url")

    return JobStatus(
        request_id=request_id,
        status=status if status in {"done", "failed", "expired"} else "processing",
        video_url=video_url,
        error=data.get("error") if status == "failed" else None,
    )


async def stream_video(video_url: str):
    """Yield the raw bytes of a finished video for the download proxy."""
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("GET", video_url) as resp:
            resp.raise_for_status()
            async for chunk in resp.aiter_bytes():
                yield chunk


def _extract_error(resp: httpx.Response) -> str:
    try:
        payload = resp.json()
    except Exception:
        return f"xAI API error {resp.status_code}: {resp.text[:300]}"
    detail = (
        payload.get("error")
        or payload.get("message")
        or payload.get("detail")
        or payload
    )
    if isinstance(detail, dict):
        detail = detail.get("message", detail)
    return f"xAI API error {resp.status_code}: {detail}"


# Re-exported for callers that want to await terminal state directly (unused by
# the web routes, which poll from the browser, but handy for scripts/tests).
async def wait_until_done(request_id: str, poll_interval: float = 5.0) -> JobStatus:
    while True:
        status = await get_status(request_id)
        if status.is_terminal:
            return status
        await asyncio.sleep(poll_interval)
