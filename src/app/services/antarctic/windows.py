from __future__ import annotations

from datetime import datetime


def start_of_month(value: datetime) -> datetime:
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def next_month_start(value: datetime) -> datetime:
    base = start_of_month(value)
    if base.month == 12:
        return base.replace(year=base.year + 1, month=1)
    return base.replace(month=base.month + 1)


def previous_month_start(value: datetime) -> datetime:
    base = start_of_month(value)
    if base.month == 1:
        return base.replace(year=base.year - 1, month=12)
    return base.replace(month=base.month - 1)


def split_month_windows_covering_range(start_utc: datetime, end_utc: datetime) -> list[tuple[datetime, datetime]]:
    if start_utc >= end_utc:
        return []

    windows: list[tuple[datetime, datetime]] = []
    cursor = start_of_month(start_utc)
    limit = next_month_start(end_utc)
    while cursor < limit:
        window_end = next_month_start(cursor)
        windows.append((cursor, window_end))
        cursor = window_end
    return windows
