"""Vercel Serverless Function entrypoint when Root Directory is `src`."""

from pathlib import Path
import sys

src_root = Path(__file__).resolve().parents[1]
src_path = str(src_root)
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from app.main import app

__all__ = ["app"]

