from __future__ import annotations

from datetime import datetime, timedelta
from math import sqrt
from statistics import pvariance
from zoneinfo import ZoneInfo

from app.core.exceptions import AppValidationError
from app.models import (
    ComparisonDelta,
    OutputMeasurement,
    TimeAggregation,
    TimeframeAnalyticsResponse,
    TimeframeBucket,
    TimeframeGroupBy,
    WindFarmSimulationParams,
    WindRoseBin,
    WindRoseSummary,
)
from app.services.antarctic.constants import STATION_LOCAL_TZ
from app.services.antarctic.math_utils import avg, dominant_angle_deg, percentile, wind_toward_direction_deg


class PlaybackTimeframesMixin:
    repository: object
    aemet_client: object
    settings: object

    def get_timeframe_analytics(
        self,
        station: str,
        start_local: datetime,
        end_local: datetime,
        group_by: TimeframeGroupBy,
        timezone_input: str,
        compare_start_local: datetime | None = None,
        compare_end_local: datetime | None = None,
        simulation_params: WindFarmSimulationParams | None = None,
        force_refresh_on_empty: bool = False,
    ) -> TimeframeAnalyticsResponse:
        station_id = self.station_id_for(station)
        self._assert_station_supported_by_antarctic_endpoint(station_id)
        self._assert_station_selectable(station_id)
        if start_local >= end_local:
            raise AppValidationError("Start datetime must be before end datetime.")
        output_tz = self._resolve_output_timezone(timezone_input, start_local.tzinfo)

        rows = self.get_data(
            station=station_id,
            start_local=start_local,
            end_local=end_local,
            aggregation=TimeAggregation.NONE,
            selected_types=[],
            output_tz=output_tz,
        )
        if not rows and force_refresh_on_empty:
            self.refresh_data_range(
                station=station_id,
                start_local=start_local,
                end_local=end_local,
            )
            rows = self.get_data(
                station=station_id,
                start_local=start_local,
                end_local=end_local,
                aggregation=TimeAggregation.NONE,
                selected_types=[],
                output_tz=output_tz,
            )
        buckets = self._group_timeframe_buckets(rows, group_by, simulation_params, output_tz=output_tz)

        comparison: list[ComparisonDelta] = []
        if compare_start_local is not None and compare_end_local is not None and compare_start_local < compare_end_local:
            compare_rows = self.get_data(
                station=station_id,
                start_local=compare_start_local,
                end_local=compare_end_local,
                aggregation=TimeAggregation.NONE,
                selected_types=[],
                output_tz=output_tz,
            )
            comparison = self._comparison_deltas(rows, compare_rows, simulation_params)

        profile = next((item for item in self.get_station_profiles() if item.station_id == station_id), None)
        station_name = profile.station_name if profile is not None else station_id
        wind_rose = self._build_wind_rose(rows)
        return TimeframeAnalyticsResponse(
            stationId=station_id,
            stationName=station_name,
            groupBy=group_by,
            timezone_input=timezone_input,
            timezone_output=getattr(output_tz, "key", str(output_tz)),
            requestedStart=start_local,
            requestedEnd=end_local,
            buckets=buckets,
            windRose=wind_rose,
            comparison=comparison,
        )

    def _group_timeframe_buckets(
        self,
        rows: list[OutputMeasurement],
        group_by: TimeframeGroupBy,
        simulation_params: WindFarmSimulationParams | None,
        output_tz: ZoneInfo,
    ) -> list[TimeframeBucket]:
        groups: dict[tuple[str, datetime, datetime], list[OutputMeasurement]] = {}
        for row in rows:
            dt = row.datetime_cet.astimezone(STATION_LOCAL_TZ)
            if group_by == TimeframeGroupBy.HOUR:
                start = dt.replace(minute=0, second=0, microsecond=0)
                label = start.strftime("%Y-%m-%d %H:00")
                end = start + timedelta(hours=1)
            elif group_by == TimeframeGroupBy.DAY:
                start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
                label = start.strftime("%Y-%m-%d")
                end = start + timedelta(days=1)
            elif group_by == TimeframeGroupBy.WEEK:
                start = (dt - timedelta(days=dt.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
                label = f"{start.strftime('%Y')}-W{start.isocalendar().week:02d}"
                end = start + timedelta(days=7)
            elif group_by == TimeframeGroupBy.MONTH:
                start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                label = start.strftime("%Y-%m")
                if start.month == 12:
                    end = start.replace(year=start.year + 1, month=1)
                else:
                    end = start.replace(month=start.month + 1)
            else:
                season = self._season_label(dt)
                if season == "DJF":
                    season_year = dt.year if dt.month == 12 else dt.year - 1
                else:
                    season_year = dt.year
                label = f"{season_year}-{season}"
                month_start = 12 if season == "DJF" else (3 if season == "MAM" else (6 if season == "JJA" else 9))
                year_start = season_year
                start = dt.replace(year=year_start, month=month_start, day=1, hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=92)

            key = (label, start, end)
            groups.setdefault(key, []).append(row)

        output: list[TimeframeBucket] = []
        for (label, start, end), points in sorted(groups.items(), key=lambda item: item[0][1]):
            speeds = [point.speed_mps for point in points if point.speed_mps is not None]
            temperatures = [point.temperature_c for point in points if point.temperature_c is not None]
            pressures = [point.pressure_hpa for point in points if point.pressure_hpa is not None]
            directions = [
                wind_toward_direction_deg(point.direction_deg)
                for point in points
                if point.direction_deg is not None
            ]
            variability = round(sqrt(pvariance(speeds)), 3) if len(speeds) > 1 else None
            generation = self._estimate_generation_mwh(points, simulation_params)
            output.append(
                TimeframeBucket(
                    label=label,
                    start=start.astimezone(output_tz),
                    end=end.astimezone(output_tz),
                    dataPoints=len(points),
                    avgSpeed=avg(speeds),
                    minSpeed=round(min(speeds), 3) if speeds else None,
                    maxSpeed=round(max(speeds), 3) if speeds else None,
                    p90Speed=percentile(speeds, 0.9) if speeds else None,
                    hoursAbove3mps=round(sum(1 for value in speeds if value >= 3.0) * (10.0 / 60.0), 3) if speeds else None,
                    hoursAbove5mps=round(sum(1 for value in speeds if value >= 5.0) * (10.0 / 60.0), 3) if speeds else None,
                    speedVariability=variability,
                    dominantDirection=dominant_angle_deg(directions),
                    avgTemperature=avg(temperatures),
                    minTemperature=round(min(temperatures), 3) if temperatures else None,
                    maxTemperature=round(max(temperatures), 3) if temperatures else None,
                    avgPressure=avg(pressures),
                    estimatedGenerationMwh=generation,
                )
            )
        return output

    def _comparison_deltas(
        self,
        current_rows: list[OutputMeasurement],
        baseline_rows: list[OutputMeasurement],
        simulation_params: WindFarmSimulationParams | None,
    ) -> list[ComparisonDelta]:
        def summary(rows: list[OutputMeasurement]) -> dict[str, float | None]:
            speeds = [point.speed_mps for point in rows if point.speed_mps is not None]
            return {
                "avgSpeed": avg(speeds),
                "p90Speed": percentile(speeds, 0.9) if speeds else None,
                "hoursAbove5mps": round(sum(1 for value in speeds if value >= 5.0) * (10.0 / 60.0), 3) if speeds else None,
                "estimatedGenerationMwh": self._estimate_generation_mwh(rows, simulation_params),
            }

        current = summary(current_rows)
        baseline = summary(baseline_rows)
        metrics = ["avgSpeed", "p90Speed", "hoursAbove5mps", "estimatedGenerationMwh"]
        output: list[ComparisonDelta] = []
        for metric in metrics:
            base = baseline.get(metric)
            cur = current.get(metric)
            absolute = None if base is None or cur is None else round(cur - base, 3)
            percent = None
            if absolute is not None and base not in {None, 0}:
                percent = round((absolute / abs(base)) * 100.0, 3)
            output.append(
                ComparisonDelta(
                    metric=metric,
                    baseline=base,
                    current=cur,
                    absoluteDelta=absolute,
                    percentDelta=percent,
                )
            )
        return output

    def _estimate_generation_mwh(
        self,
        rows: list[OutputMeasurement],
        params: WindFarmSimulationParams | None,
    ) -> float | None:
        if params is None:
            return None
        rated_total_kw = params.turbine_count * params.rated_power_kw
        if rated_total_kw <= 0:
            return None

        cut_in = params.cut_in_speed_mps
        rated = params.rated_speed_mps
        cut_out = params.cut_out_speed_mps
        reference_density = params.reference_air_density_kgm3
        if not (0 <= cut_in < rated < cut_out):
            return None
        if reference_density <= 0:
            return None

        usable_rows = [row for row in rows if row.datetime_cet is not None]
        if not usable_rows:
            return None
        usable_rows.sort(key=lambda row: row.datetime_cet)

        observed_steps_hours: list[float] = []
        for idx in range(len(usable_rows) - 1):
            delta_hours = (usable_rows[idx + 1].datetime_cet - usable_rows[idx].datetime_cet).total_seconds() / 3600.0
            if 0 < delta_hours <= 24:
                observed_steps_hours.append(delta_hours)
        fallback_step_hours = observed_steps_hours[0] if observed_steps_hours else (10.0 / 60.0)

        energy_mwh = 0.0
        denom = (rated ** 3) - (cut_in ** 3)
        for idx, row in enumerate(usable_rows):
            speed = row.speed_mps
            if speed is None:
                continue
            if not self._within_operating_envelope(row, params):
                continue
            if idx + 1 < len(usable_rows):
                step_hours = (usable_rows[idx + 1].datetime_cet - row.datetime_cet).total_seconds() / 3600.0
                if step_hours <= 0 or step_hours > 24:
                    step_hours = fallback_step_hours
            else:
                step_hours = fallback_step_hours
            density = self._air_density_kgm3(row, fallback_density_kgm3=reference_density)
            density_ratio = max(0.0, density / reference_density)
            effective_speed = speed * (density_ratio ** (1.0 / 3.0))
            if effective_speed < cut_in or effective_speed >= cut_out:
                power_kw = 0.0
            elif effective_speed >= rated:
                power_kw = rated_total_kw
            else:
                ratio = ((effective_speed ** 3) - (cut_in ** 3)) / denom if denom > 0 else 0.0
                ratio = max(0.0, min(1.0, ratio))
                power_kw = rated_total_kw * ratio
            energy_mwh += (power_kw * step_hours) / 1000.0
        return round(energy_mwh, 3)

    @staticmethod
    def _air_density_kgm3(row: OutputMeasurement, fallback_density_kgm3: float) -> float:
        if row.pressure_hpa is None or row.temperature_c is None:
            return fallback_density_kgm3
        kelvin = row.temperature_c + 273.15
        if kelvin <= 0:
            return fallback_density_kgm3
        density = (row.pressure_hpa * 100.0) / (287.05 * kelvin)
        return density if density > 0 else fallback_density_kgm3

    @staticmethod
    def _within_operating_envelope(row: OutputMeasurement, params: WindFarmSimulationParams) -> bool:
        temperature = row.temperature_c
        pressure = row.pressure_hpa
        if (
            temperature is not None
            and params.min_operating_temp_c is not None
            and temperature < params.min_operating_temp_c
        ):
            return False
        if (
            temperature is not None
            and params.max_operating_temp_c is not None
            and temperature > params.max_operating_temp_c
        ):
            return False
        if (
            pressure is not None
            and params.min_operating_pressure_hpa is not None
            and pressure < params.min_operating_pressure_hpa
        ):
            return False
        if (
            pressure is not None
            and params.max_operating_pressure_hpa is not None
            and pressure > params.max_operating_pressure_hpa
        ):
            return False
        return True

    def _build_wind_rose(self, rows: list[OutputMeasurement]) -> WindRoseSummary:
        sectors = [
            "N", "NNE", "NE", "ENE",
            "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW",
            "W", "WNW", "NW", "NNW",
        ]
        bins: list[dict[str, object]] = [
            {"sector": sector, "speedBuckets": {"calm": 0, "breeze": 0, "strong": 0, "gale": 0}, "totalCount": 0}
            for sector in sectors
        ]

        directional_points = 0
        calm_points = 0
        for row in rows:
            if row.direction_deg is None or row.speed_mps is None:
                continue
            direction = wind_toward_direction_deg(row.direction_deg)
            if direction is None:
                continue
            index = int(((direction + 11.25) % 360) // 22.5)
            target = bins[index]
            speed = row.speed_mps
            if speed < 3.0:
                bucket = "calm"
                calm_points += 1
            elif speed < 8.0:
                bucket = "breeze"
            elif speed < 12.0:
                bucket = "strong"
            else:
                bucket = "gale"
            speed_buckets = target["speedBuckets"]
            if isinstance(speed_buckets, dict):
                speed_buckets[bucket] = int(speed_buckets.get(bucket, 0)) + 1
            target["totalCount"] = int(target.get("totalCount", 0)) + 1
            directional_points += 1

        dominant = max(bins, key=lambda item: int(item["totalCount"]), default=None)
        dominant_sector = None
        directional_concentration = None
        if dominant is not None:
            dominant_total = int(dominant["totalCount"])
            if dominant_total > 0:
                dominant_sector = str(dominant["sector"])
            if directional_points > 0:
                directional_concentration = round(dominant_total / directional_points, 3)
        calm_share = round(calm_points / directional_points, 3) if directional_points > 0 else None
        return WindRoseSummary(
            bins=[WindRoseBin.model_validate(item) for item in bins],
            dominantSector=dominant_sector,
            directionalConcentration=directional_concentration,
            calmShare=calm_share,
        )

    @staticmethod
    def _season_label(value: datetime) -> str:
        month = value.month
        if month in {12, 1, 2}:
            return "DJF"
        if month in {3, 4, 5}:
            return "MAM"
        if month in {6, 7, 8}:
            return "JJA"
        return "SON"
