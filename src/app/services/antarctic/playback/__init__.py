from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from app.core.exceptions import AppValidationError
from app.models import (
    FeasibilitySnapshotResponse,
    MeasurementType,
    StationFeasibilitySeries,
    StationRole,
    TimeAggregation,
)
from app.services.antarctic.constants import UTC
from app.services.antarctic.playback.frames import PlaybackFramesMixin
from app.services.antarctic.playback.query_jobs import PlaybackQueryJobsMixin
from app.services.antarctic.playback.timeframes import PlaybackTimeframesMixin


class PlaybackAnalyticsMixin(PlaybackQueryJobsMixin, PlaybackFramesMixin, PlaybackTimeframesMixin):
    repository: object
    aemet_client: object
    settings: object

    def get_station_snapshot(
        self,
        station: str,
        start_local: datetime,
        end_local: datetime | None,
        aggregation: TimeAggregation,
        selected_types: list[MeasurementType],
        timezone_input: str,
    ) -> FeasibilitySnapshotResponse:
        selected_station_id = self.station_id_for(station)
        self._assert_station_supported_by_antarctic_endpoint(selected_station_id)
        self._assert_station_selectable(selected_station_id)
        output_tz = self._resolve_output_timezone(timezone_input, start_local.tzinfo or UTC)

        latest = self.get_latest_availability(selected_station_id)
        if latest.newest_observation_utc is None:
            raise AppValidationError(
                f"No recent observations are available for station '{selected_station_id}'."
            )

        latest_local = latest.newest_observation_utc.astimezone(output_tz)
        effective_end_local = latest_local
        if end_local is not None:
            effective_end_local = min(effective_end_local, end_local)

        if start_local >= effective_end_local:
            raise AppValidationError(
                "Start datetime must be earlier than effective end datetime for this station."
            )

        rows = self.get_data(
            station=selected_station_id,
            start_local=start_local,
            end_local=effective_end_local,
            aggregation=aggregation,
            selected_types=selected_types,
            output_tz=output_tz,
        )
        profile = next((item for item in self.get_station_profiles() if item.station_id == selected_station_id), None)
        station_name = profile.station_name if profile is not None else selected_station_id
        role = profile.role if profile is not None else StationRole.METEO
        latest_utc = self.repository.get_latest_measurement_timestamp(selected_station_id)
        summary = self._build_summary(
            station_id=selected_station_id,
            station_name=station_name,
            role=role,
            rows=rows,
            start_local=start_local,
            end_local=effective_end_local,
            aggregation=aggregation,
            latest_observation_utc=latest_utc,
        )

        return FeasibilitySnapshotResponse(
            checked_at_utc=datetime.now(UTC),
            selectedStationId=selected_station_id,
            selectedStationName=station_name,
            requestedStart=start_local,
            effectiveEnd=effective_end_local,
            effectiveEndReason="limited_by_station_constraints",
            timezone_input=timezone_input,
            timezone_output=getattr(output_tz, "key", str(output_tz)),
            aggregation=aggregation,
            mapStationIds=[selected_station_id],
            notes=[
                "Single-station snapshot generated from cache-first retrieval strategy.",
                "Data retrieval is chunked into full calendar-month upstream windows, but the analysis window can span multiple months/years.",
                "Window end is capped by latest available station observation.",
            ],
            stations=[
                StationFeasibilitySeries(
                    stationId=selected_station_id,
                    stationName=station_name,
                    role=role,
                    summary=summary,
                    data=rows,
                )
            ],
        )

    @staticmethod
    def _resolve_output_timezone(timezone_input: str, fallback: Any = UTC) -> ZoneInfo:
        try:
            return ZoneInfo(timezone_input)
        except Exception:
            if isinstance(fallback, ZoneInfo):
                return fallback
            return UTC
