from datetime import datetime, timedelta


def ensure_max_window_days(start: datetime, end: datetime, max_days: int = 30) -> None:
    if start >= end:
        raise ValueError("Start datetime must be before end datetime")
    max_end = start + timedelta(days=max_days)
    if end > max_end:
        raise ValueError(f"Date range cannot exceed {max_days} days from start datetime")

