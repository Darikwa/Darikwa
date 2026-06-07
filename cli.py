#!/usr/bin/env python3
"""Command-line companion to the web app: picture in, video out.

Usage:
    python cli.py path/to/image.png \
        --prompt "Slow cinematic push-in, golden hour" \
        --duration 6 --resolution 720p --aspect-ratio 16:9 \
        --out clip.mp4

Honours the same environment variables as the web app (see .env.example).
If XAI_API_KEY is unset it runs in mock mode and downloads a sample clip.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import mimetypes
import sys
from pathlib import Path

import httpx

from app import grok_client


async def run(args: argparse.Namespace) -> int:
    image_path = Path(args.image)
    if not image_path.is_file():
        print(f"error: no such file: {image_path}", file=sys.stderr)
        return 1

    mime = mimetypes.guess_type(image_path.name)[0] or "image/png"
    b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
    data_uri = f"data:{mime};base64,{b64}"

    print("Submitting to Grok Imagine…")
    request_id = await grok_client.submit(
        image_data_uri=data_uri,
        prompt=args.prompt,
        duration=args.duration,
        resolution=args.resolution,
        aspect_ratio=args.aspect_ratio,
    )
    print(f"  request_id = {request_id}")
    print("Waiting for the video to render…")

    status = await grok_client.wait_until_done(request_id, poll_interval=args.poll)
    if status.status != "done" or not status.video_url:
        print(f"error: generation {status.status}: {status.error or ''}", file=sys.stderr)
        return 2

    out = Path(args.out)
    print(f"Downloading -> {out}")
    with out.open("wb") as fh:
        async for chunk in grok_client.stream_video(status.video_url):
            fh.write(chunk)

    print(f"Done. Saved {out} ({out.stat().st_size / 1024:.0f} KB)")
    return 0


def main() -> None:
    p = argparse.ArgumentParser(description="Grok Imagine picture-to-video CLI")
    p.add_argument("image", help="Path to the source image (PNG/JPEG/WebP)")
    p.add_argument("--prompt", required=True, help="Describe the motion/camera")
    p.add_argument("--duration", type=int, default=5, help="1-15 seconds (default 5)")
    p.add_argument("--resolution", default="720p", choices=["480p", "720p"])
    p.add_argument("--aspect-ratio", default="16:9", dest="aspect_ratio")
    p.add_argument("--out", default="clip.mp4", help="Output .mp4 path")
    p.add_argument("--poll", type=float, default=5.0, help="Poll interval seconds")
    args = p.parse_args()

    try:
        rc = asyncio.run(run(args))
    except grok_client.GrokError as exc:
        print(f"error: {exc}", file=sys.stderr)
        rc = 3
    except httpx.HTTPError as exc:
        print(f"network error: {exc}", file=sys.stderr)
        rc = 4
    sys.exit(rc)


if __name__ == "__main__":
    main()
