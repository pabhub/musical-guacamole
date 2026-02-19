import logging
import os

_CONFIGURED = False


def _resolve_log_level() -> int:
    raw = os.getenv("LOG_LEVEL", "INFO").strip().upper()
    if raw in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
        return getattr(logging, raw, logging.INFO)
    return logging.INFO


def configure_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    level = _resolve_log_level()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(level)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    _CONFIGURED = True
