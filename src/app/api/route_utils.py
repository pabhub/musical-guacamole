from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Callable, TypeVar
from zoneinfo import ZoneInfo

from fastapi import HTTPException

T = TypeVar("T")

DATETIME_FORMAT_HINT = "YYYY-MM-DDTHH:MM:SS"
SERVICE_ERROR_RESPONSES = {
    400: {"description": "Input validation or domain rule violation."},
    502: {"description": "Upstream AEMET dependency failed or returned invalid payload."},
}


def parse_timezone_or_400(location: str) -> ZoneInfo:
    try:
        return ZoneInfo(location)
    except Exception as exc:  # pragma: no cover - ZoneInfo exposes broad failures
        raise HTTPException(status_code=400, detail=f"Invalid timezone location: {location}") from exc


def coerce_datetime_to_timezone(value: datetime, tz: ZoneInfo) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=tz)
    return value.astimezone(tz)


def parse_local_datetime_or_400(
    raw: str,
    tz: ZoneInfo,
    *,
    error_prefix: str = "Datetime",
) -> datetime:
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{error_prefix} format must be {DATETIME_FORMAT_HINT}") from exc
    return coerce_datetime_to_timezone(parsed, tz)


def parse_local_range_or_400(
    start_raw: str,
    end_raw: str,
    tz: ZoneInfo,
    *,
    error_prefix: str = "Datetime",
) -> tuple[datetime, datetime]:
    start_local = parse_local_datetime_or_400(start_raw, tz, error_prefix=error_prefix)
    end_local = parse_local_datetime_or_400(end_raw, tz, error_prefix=error_prefix)
    return start_local, end_local


def parse_optional_local_datetime_or_400(
    raw: str | None,
    tz: ZoneInfo,
    *,
    error_prefix: str = "Datetime",
) -> datetime | None:
    if raw is None:
        return None
    return parse_local_datetime_or_400(raw, tz, error_prefix=error_prefix)


def to_utc_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(ZoneInfo("UTC")).isoformat()


def call_service_or_http(
    call: Callable[[], T],
    *,
    logger: logging.Logger,
    endpoint: str,
    context: dict[str, Any] | None = None,
) -> T:
    try:
        return call()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        context_text = ""
        if context:
            context_text = " " + " ".join(f"{key}={value}" for key, value in context.items())
        logger.warning("Upstream AEMET failure on %s endpoint%s: detail=%s", endpoint, context_text, str(exc))
        raise HTTPException(status_code=502, detail=str(exc)) from exc
