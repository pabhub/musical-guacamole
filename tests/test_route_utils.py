from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException

from app.api.route_utils import (
    call_service_or_http,
    coerce_datetime_to_timezone,
    parse_local_datetime_or_400,
    parse_local_range_or_400,
    parse_optional_local_datetime_or_400,
    parse_timezone_or_400,
)


def test_parse_timezone_or_400_valid_zone():
    tz = parse_timezone_or_400("Europe/Madrid")
    assert isinstance(tz, ZoneInfo)
    assert tz.key == "Europe/Madrid"


def test_parse_timezone_or_400_invalid_zone():
    with pytest.raises(HTTPException) as exc:
        parse_timezone_or_400("Not/A-TimeZone")
    assert exc.value.status_code == 400
    assert "Invalid timezone location" in str(exc.value.detail)


def test_parse_local_datetime_or_400_parses_and_applies_timezone():
    tz = ZoneInfo("UTC")
    parsed = parse_local_datetime_or_400("2026-02-18T10:00:00", tz)
    assert parsed.isoformat().endswith("+00:00")
    assert parsed.hour == 10


def test_parse_local_datetime_or_400_custom_error_prefix():
    tz = ZoneInfo("UTC")
    with pytest.raises(HTTPException) as exc:
        parse_local_datetime_or_400("2026/02/18 10:00:00", tz, error_prefix="Comparison datetime")
    assert exc.value.status_code == 400
    assert exc.value.detail == "Comparison datetime format must be YYYY-MM-DDTHH:MM:SS"


def test_parse_local_range_or_400_returns_start_and_end():
    tz = ZoneInfo("UTC")
    start, end = parse_local_range_or_400("2026-02-18T00:00:00", "2026-02-19T00:00:00", tz)
    assert start < end


def test_parse_optional_local_datetime_or_400_none():
    tz = ZoneInfo("UTC")
    assert parse_optional_local_datetime_or_400(None, tz) is None


def test_coerce_datetime_to_timezone_converts_aware_datetime():
    tz = ZoneInfo("Europe/Madrid")
    utc_dt = datetime(2026, 2, 18, 10, 0, tzinfo=ZoneInfo("UTC"))
    converted = coerce_datetime_to_timezone(utc_dt, tz)
    assert converted.tzinfo is not None
    assert converted.astimezone(ZoneInfo("UTC")).hour == 10


def test_call_service_or_http_maps_value_error_to_400():
    with pytest.raises(HTTPException) as exc:
        call_service_or_http(
            lambda: (_ for _ in ()).throw(ValueError("bad request")),
            logger=logging.getLogger("test"),
            endpoint="analysis/test",
        )
    assert exc.value.status_code == 400
    assert exc.value.detail == "bad request"


def test_call_service_or_http_maps_runtime_error_to_502():
    with pytest.raises(HTTPException) as exc:
        call_service_or_http(
            lambda: (_ for _ in ()).throw(RuntimeError("upstream failed")),
            logger=logging.getLogger("test"),
            endpoint="analysis/test",
            context={"station": "89064"},
        )
    assert exc.value.status_code == 502
    assert exc.value.detail == "upstream failed"
