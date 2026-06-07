"""Application configuration loaded from environment variables.

Values are read once at import time. Copy `.env.example` to `.env` and fill in
your xAI credentials, or export the variables in your shell before launching.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

try:
    # Optional: load a local .env file if python-dotenv is installed.
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - dotenv is optional
    pass


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    # xAI / Grok Imagine credentials and endpoint.
    xai_api_key: str = os.getenv("XAI_API_KEY", "")
    xai_base_url: str = os.getenv("XAI_BASE_URL", "https://api.x.ai")
    video_model: str = os.getenv("GROK_VIDEO_MODEL", "grok-imagine-video")

    # When true (or when no API key is set) the app serves a sample clip instead
    # of calling xAI. Handy for trying the UI without spending credits.
    mock_mode: bool = _as_bool(os.getenv("GROK_MOCK")) or not os.getenv("XAI_API_KEY")

    # Upload guard rails.
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))

    # How long a single HTTP call to xAI may take (seconds).
    request_timeout: float = float(os.getenv("XAI_TIMEOUT", "60"))


settings = Settings()
