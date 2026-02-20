"""Vercel serverless function entrypoint.

Imports the FastAPI ``app`` from the project source so Vercel can
discover this as a Serverless Function inside the ``api/`` directory.
``maxDuration`` for this function is set in ``vercel.json``.
"""

from pathlib import Path
import sys

_project_root = Path(__file__).resolve().parent.parent
_src_path = str(_project_root / "src")
if _src_path not in sys.path:
    sys.path.insert(0, _src_path)

from app.main import app  # noqa: F401  (re-exported for Vercel ASGI)

__all__ = ["app"]
