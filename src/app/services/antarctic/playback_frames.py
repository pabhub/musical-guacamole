from __future__ import annotations

from datetime import datetime, timedelta
from math import cos, radians, sin
from zoneinfo import ZoneInfo

from app.core.exceptions import AppValidationError
from app.models import (
    FrameQuality,
    OutputMeasurement,
    PlaybackFrame,
    PlaybackResponse,
    PlaybackStep,
    TimeAggregation,
)
from app.services.antarctic.math_utils import avg, avg_angle_deg, wind_toward_direction_deg


class PlaybackFramesMixin:
    repository: object
    aemet_client: object
    settings: object

    def get_playback_frames(
        self,
        station: str,
        start_local: datetime,
        end_local: datetime,
        step: PlaybackStep,
        timezone_input: str,
    ) -> PlaybackResponse:
        station_id = self.station_id_for(station)
        self._assert_station_supported_by_antarctic_endpoint(station_id)
        self._assert_station_selectable(station_id)
        if start_local >= end_local:
            raise AppValidationError("Start datetime must be before end datetime.")
        output_tz = self._resolve_output_timezone(timezone_input, start_local.tzinfo)

        effective_step = self._coerce_playback_step(start_local, end_local, step)
        rows = self._rows_for_playback(station_id, start_local, end_local, effective_step, output_tz=output_tz)
        frames = self._rows_to_frames(rows, start_local, end_local, effective_step, output_tz=output_tz)
        profile = next((item for item in self.get_station_profiles() if item.station_id == station_id), None)
        station_name = profile.station_name if profile is not None else station_id

        quality_counts = {
            FrameQuality.OBSERVED.value: 0,
            FrameQuality.AGGREGATED.value: 0,
            FrameQuality.GAP_FILLED.value: 0,
        }
        for frame in frames:
            quality_counts[frame.quality_flag.value] = quality_counts.get(frame.quality_flag.value, 0) + 1

        wind_rose = self._build_wind_rose(rows)

        return PlaybackResponse(
            stationId=station_id,
            stationName=station_name,
            requestedStep=step,
            effectiveStep=effective_step,
            timezone_input=timezone_input,
            timezone_output=getattr(output_tz, "key", str(output_tz)),
            start=start_local,
            end=end_local,
            frames=frames,
            framesPlanned=len(frames),
            framesReady=len(frames),
            qualityCounts=quality_counts,
            windRose=wind_rose,
        )

    def _rows_for_playback(
        self,
        station_id: str,
        start_local: datetime,
        end_local: datetime,
        step: PlaybackStep,
        output_tz: ZoneInfo,
    ) -> list[OutputMeasurement]:
        if step == PlaybackStep.TEN_MINUTES:
            return self.get_data(
                station=station_id,
                start_local=start_local,
                end_local=end_local,
                aggregation=TimeAggregation.NONE,
                selected_types=[],
                output_tz=output_tz,
            )
        if step == PlaybackStep.HOURLY:
            return self.get_data(
                station=station_id,
                start_local=start_local,
                end_local=end_local,
                aggregation=TimeAggregation.HOURLY,
                selected_types=[],
                output_tz=output_tz,
            )
        if step == PlaybackStep.DAILY:
            return self.get_data(
                station=station_id,
                start_local=start_local,
                end_local=end_local,
                aggregation=TimeAggregation.DAILY,
                selected_types=[],
                output_tz=output_tz,
            )

        hourly = self.get_data(
            station=station_id,
            start_local=start_local,
            end_local=end_local,
            aggregation=TimeAggregation.HOURLY,
            selected_types=[],
            output_tz=output_tz,
        )
        grouped: dict[datetime, list[OutputMeasurement]] = {}
        for row in hourly:
            dt = row.datetime_cet
            key = dt.replace(hour=(dt.hour // 3) * 3, minute=0, second=0, microsecond=0)
            grouped.setdefault(key, []).append(row)

        aggregated: list[OutputMeasurement] = []
        for key in sorted(grouped.keys()):
            points = grouped[key]
            aggregated.append(
                OutputMeasurement(
                    stationName=points[0].station_name,
                    datetime=key,
                    temperature=avg([point.temperature_c for point in points]),
                    pressure=avg([point.pressure_hpa for point in points]),
                    speed=avg([point.speed_mps for point in points]),
                    direction=avg_angle_deg(
                        [point.direction_deg for point in points if point.direction_deg is not None]
                    ),
                    latitude=points[0].latitude,
                    longitude=points[0].longitude,
                    altitude=points[0].altitude_m,
                )
            )
        return aggregated

    def _rows_to_frames(
        self,
        rows: list[OutputMeasurement],
        start_local: datetime,
        end_local: datetime,
        step: PlaybackStep,
        output_tz: ZoneInfo,
    ) -> list[PlaybackFrame]:
        if not rows and start_local >= end_local:
            return []

        step_delta = self._step_delta(step)
        aligned_start = self._floor_to_step(start_local.astimezone(output_tz), step)
        aligned_end = end_local.astimezone(output_tz)

        row_map: dict[str, OutputMeasurement] = {}
        for row in rows:
            key = self._floor_to_step(row.datetime_cet.astimezone(output_tz), step).isoformat()
            row_map[key] = row

        frames: list[PlaybackFrame] = []
        cursor = aligned_start
        last_observed: OutputMeasurement | None = None
        while cursor <= aligned_end:
            key = cursor.isoformat()
            matched = row_map.get(key)
            quality = FrameQuality.OBSERVED if step == PlaybackStep.TEN_MINUTES else FrameQuality.AGGREGATED
            if matched is None:
                matched = last_observed
                quality = FrameQuality.GAP_FILLED
            if matched is not None:
                last_observed = matched

            speed = matched.speed_mps if matched is not None else None
            direction_from = matched.direction_deg if matched is not None else None
            direction = wind_toward_direction_deg(direction_from)
            temperature = matched.temperature_c if matched is not None else None
            pressure = matched.pressure_hpa if matched is not None else None
            dx, dy = self._vector_components(speed, direction)
            frames.append(
                PlaybackFrame(
                    datetime=cursor,
                    speed=speed,
                    direction=direction,
                    temperature=temperature,
                    pressure=pressure,
                    qualityFlag=quality,
                    dx=dx,
                    dy=dy,
                )
            )
            cursor = cursor + step_delta
        return frames

    def _coerce_playback_step(self, start_local: datetime, end_local: datetime, step: PlaybackStep) -> PlaybackStep:
        candidate = step
        while self._frame_count_for_range(start_local, end_local, candidate) > 1500:
            if candidate == PlaybackStep.TEN_MINUTES:
                candidate = PlaybackStep.HOURLY
                continue
            if candidate == PlaybackStep.HOURLY:
                candidate = PlaybackStep.THREE_HOURLY
                continue
            if candidate == PlaybackStep.THREE_HOURLY:
                candidate = PlaybackStep.DAILY
                continue
            break
        return candidate

    @staticmethod
    def _step_delta(step: PlaybackStep) -> timedelta:
        if step == PlaybackStep.TEN_MINUTES:
            return timedelta(minutes=10)
        if step == PlaybackStep.HOURLY:
            return timedelta(hours=1)
        if step == PlaybackStep.THREE_HOURLY:
            return timedelta(hours=3)
        return timedelta(days=1)

    def _frame_count_for_range(self, start_local: datetime, end_local: datetime, step: PlaybackStep) -> int:
        if end_local <= start_local:
            return 0
        seconds = (end_local - start_local).total_seconds()
        interval = self._step_delta(step).total_seconds()
        return int(seconds // interval) + 1

    def _floor_to_step(self, value: datetime, step: PlaybackStep) -> datetime:
        if step == PlaybackStep.TEN_MINUTES:
            minute = (value.minute // 10) * 10
            return value.replace(minute=minute, second=0, microsecond=0)
        if step == PlaybackStep.HOURLY:
            return value.replace(minute=0, second=0, microsecond=0)
        if step == PlaybackStep.THREE_HOURLY:
            hour = (value.hour // 3) * 3
            return value.replace(hour=hour, minute=0, second=0, microsecond=0)
        return value.replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _vector_components(speed: float | None, direction: float | None) -> tuple[float | None, float | None]:
        if speed is None or direction is None:
            return None, None
        rad = radians(direction % 360.0)
        dx = round(speed * sin(rad), 4)
        dy = round(speed * cos(rad), 4)
        return dx, dy
