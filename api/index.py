"""Vercel Serverless Function entrypoint.

Routes all requests to the FastAPI ASGI app in `app.main`.
"""

from pathlib import Path
import sys

project_root = Path(__file__).resolve().parents[1]
src_path = str(project_root / "src")
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from app.main import app

__all__ = ["app"]

