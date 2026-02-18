from __future__ import annotations

import logging
import csv
import json
import unicodedata
from datetime import datetime
from io import StringIO
from typing import Any

import httpx

from app.models import SourceMeasurement, StationCatalogItem

logger = logging.getLogger(__name__)


class AemetClient:
    BASE_URL = "https://opendata.aemet.es/opendata/api"

    def __init__(self, api_key: str, timeout_seconds: float = 20.0) -> None:
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    def fetch_station_data(
        self,
        start_utc: datetime,
        end_utc: datetime,
        station_id: str,
    ) -> list[SourceMeasurement]:
        if not self.api_key:
            raise RuntimeError("AEMET_API_KEY environment variable is required")

        endpoint = (
            f"{self.BASE_URL}/antartida/datos/fechaini/{start_utc.strftime('%Y-%m-%dT%H:%M:%SUTC')}"
            f"/fechafin/{end_utc.strftime('%Y-%m-%dT%H:%M:%SUTC')}/estacion/{station_id}"
        )
        logger.info("Requesting AEMET metadata URL for station %s", station_id)

        raw_items = self._request_data_items(endpoint, allow_no_data=True, no_data_log_context=f"station={station_id}")
        return [self._map_row(row) for row in raw_items]

    def fetch_station_inventory(self) -> list[StationCatalogItem]:
        if not self.api_key:
            raise RuntimeError("AEMET_API_KEY environment variable is required")

        endpoint = f"{self.BASE_URL}/valores/climatologicos/inventarioestaciones/todasestaciones"
        logger.info("Requesting AEMET station inventory metadata URL")
        raw_items = self._request_data_items(endpoint, allow_no_data=False)
        stations: list[StationCatalogItem] = []
        for row in raw_items:
            if not isinstance(row, dict):
                continue
            source = row.get("properties") if isinstance(row.get("properties"), dict) else row
            normalized = {str(k).strip().lower(): v for k, v in source.items()}
            station_id = self._extract_station_id(normalized)
            if not station_id:
                continue
            station_name = self._extract_station_name(normalized, station_id)
            if not station_name:
                station_name = station_id
            stations.append(
                StationCatalogItem(
                    stationId=station_id,
                    stationName=station_name,
                    province=self._normalize_province_code(normalized.get("provincia") or normalized.get("provincia_nombre")),
                    latitude=self._to_coordinate(
                        normalized.get("latitud") or normalized.get("lat") or normalized.get("latitude"),
                        is_longitude=False,
                    ),
                    longitude=self._to_coordinate(
                        normalized.get("longitud") or normalized.get("lon") or normalized.get("longitude"),
                        is_longitude=True,
                    ),
                    altitude=self._to_float(normalized.get("altitud") or normalized.get("alt") or normalized.get("altitude")),
                )
            )
        if stations:
            logger.info("Parsed %d stations from inventory payload (%d raw rows).", len(stations), len(raw_items))
            return stations

        sample_keys: list[str] = []
        for row in raw_items[:3]:
            if isinstance(row, dict):
                source = row.get("properties") if isinstance(row.get("properties"), dict) else row
                sample_keys.extend([str(k) for k in source.keys()])
        unique_keys = sorted({k for k in sample_keys})[:20]
        raise RuntimeError(
            "AEMET station inventory parsed but no station identifiers were detected. "
            f"sample_keys={unique_keys}"
        )

    @staticmethod
    def _normalize_province_code(value: Any) -> str | None:
        if value in (None, ""):
            return None
        raw = str(value).strip()
        if not raw:
            return None
        canonical = unicodedata.normalize("NFD", raw).encode("ascii", "ignore").decode("ascii").upper()
        if canonical in {"ANTARTIDA", "ANTARCTIDA", "ANTARCTIC"}:
            return "ANTARCTIC"
        return canonical

    @staticmethod
    def _extract_station_name(normalized: dict[str, Any], fallback: str) -> str:
        for key in ("nombre", "name", "estacion", "station_name", "denominacion", "descripcion"):
            value = normalized.get(key)
            if value is None:
                continue
            name = str(value).strip()
            if name:
                return name
        for key, value in normalized.items():
            key_low = key.lower()
            if any(token in key_low for token in ("nombre", "name", "denominacion", "estacion")):
                name = str(value).strip()
                if name:
                    return name
        return fallback

    @staticmethod
    def _extract_station_id(normalized: dict[str, Any]) -> str:
        preferred_keys = (
            "indicativo",
            "idema",
            "indicatif",
            "estacion",
            "station_id",
            "stationid",
            "codigo",
            "code",
            "id",
        )
        for key in preferred_keys:
            value = normalized.get(key)
            if value is None:
                continue
            station_id = str(value).strip()
            if station_id:
                return station_id
        for key, value in normalized.items():
            key_low = key.lower()
            if any(token in key_low for token in ("indic", "idema", "station", "codigo", "code")):
                station_id = str(value).strip()
                if station_id:
                    return station_id
        return ""

    def _request_data_items(
        self,
        endpoint: str,
        allow_no_data: bool,
        no_data_log_context: str | None = None,
    ) -> list[dict[str, Any]]:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            meta_response = client.get(endpoint, params={"api_key": self.api_key})
            try:
                meta_response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(f"AEMET metadata request failed with HTTP {exc.response.status_code}") from exc

            try:
                payload = meta_response.json()
            except ValueError as exc:
                raise RuntimeError("AEMET metadata response is not valid JSON") from exc

            if not isinstance(payload, dict):
                raise RuntimeError("AEMET metadata response has unexpected shape")

            data_url = payload.get("datos")
            if not data_url:
                estado = payload.get("estado")
                descripcion = payload.get("descripcion")
                if allow_no_data and str(estado) == "404" and isinstance(descripcion, str) and "no hay datos" in descripcion.lower():
                    context = f" ({no_data_log_context})" if no_data_log_context else ""
                    logger.info("AEMET returned no data for requested criteria%s", context)
                    return []
                detail_parts = ["AEMET response missing 'datos' URL"]
                if estado is not None:
                    detail_parts.append(f"estado={estado}")
                if descripcion:
                    detail_parts.append(f"descripcion={descripcion}")
                raise RuntimeError(". ".join(detail_parts))

            logger.info("Downloading AEMET data from temporary URL")
            data_response = client.get(data_url)
            try:
                data_response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(f"AEMET data download failed with HTTP {exc.response.status_code}") from exc

            try:
                raw_items = data_response.json()
            except ValueError as exc:
                json_rows = self._parse_json_rows(data_response.text)
                if json_rows is not None:
                    return json_rows
                csv_rows = self._parse_csv_rows(data_response.text)
                if csv_rows is not None:
                    return csv_rows
                raise RuntimeError("AEMET data payload is not valid JSON") from exc

            if isinstance(raw_items, str):
                json_rows = self._parse_json_rows(raw_items)
                if json_rows is not None:
                    return json_rows
                csv_rows = self._parse_csv_rows(raw_items)
                if csv_rows is not None:
                    return csv_rows

            if isinstance(raw_items, dict):
                nested_lists = [value for value in raw_items.values() if isinstance(value, list)]
                if len(nested_lists) == 1:
                    nested = nested_lists[0]
                    if all(isinstance(item, dict) for item in nested):
                        return nested

            if not isinstance(raw_items, list):
                snippet = str(raw_items)[:240]
                raise RuntimeError(f"AEMET data payload has unexpected shape (sample={snippet})")

        return raw_items

    @staticmethod
    def _parse_json_rows(payload: str) -> list[dict[str, Any]] | None:
        text = payload.lstrip("\ufeff").strip()
        if not text:
            return []

        # NDJSON / one-object-per-line (optionally with trailing comma).
        lines = [line.strip().rstrip(",") for line in text.splitlines() if line.strip()]
        line_objects: list[dict[str, Any]] = []
        for line in lines:
            if not (line.startswith("{") and line.endswith("}")):
                line_objects = []
                break
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                line_objects = []
                break
            if not isinstance(obj, dict):
                line_objects = []
                break
            line_objects.append(obj)
        if line_objects:
            return line_objects

        # Concatenated objects without delimiters/newlines.
        objects: list[dict[str, Any]] = []
        depth = 0
        start = -1
        for idx, ch in enumerate(text):
            if ch == "{":
                if depth == 0:
                    start = idx
                depth += 1
            elif ch == "}":
                if depth > 0:
                    depth -= 1
                    if depth == 0 and start != -1:
                        fragment = text[start: idx + 1]
                        try:
                            obj = json.loads(fragment)
                        except json.JSONDecodeError:
                            return None
                        if not isinstance(obj, dict):
                            return None
                        objects.append(obj)
                        start = -1
        return objects if objects else None

    @staticmethod
    def _parse_csv_rows(payload: str) -> list[dict[str, Any]] | None:
        text = payload.lstrip("\ufeff").strip()
        if not text:
            return []

        lines = text.splitlines()
        if not lines:
            return []

        candidate_delimiters = [";", ",", "\t", "|"]
        header_index = None
        delimiter = None

        for idx, line in enumerate(lines[:40]):
            lower = line.lower()
            if "indicativo" in lower and "nombre" in lower:
                counts = {d: line.count(d) for d in candidate_delimiters}
                best = max(counts, key=counts.get)
                if counts[best] > 0:
                    header_index = idx
                    delimiter = best
                    break
            counts = {d: line.count(d) for d in candidate_delimiters}
            best = max(counts, key=counts.get)
            if counts[best] >= 2:
                header_index = idx
                delimiter = best
                break

        if header_index is None or delimiter is None:
            return None

        candidate_text = "\n".join(lines[header_index:])
        reader = csv.DictReader(StringIO(candidate_text), delimiter=delimiter)
        rows: list[dict[str, Any]] = []
        for row in reader:
            normalized = {
                (k.strip() if isinstance(k, str) else k): (v.strip() if isinstance(v, str) else v)
                for k, v in row.items()
            }
            if all((v in (None, "") for v in normalized.values())):
                continue
            rows.append(normalized)
        return rows if rows else None

    @classmethod
    def _to_coordinate(cls, value: Any, is_longitude: bool) -> float | None:
        # Some AEMET inventory payloads encode coordinates as DDMMSSH / DDDMMSSH.
        if value in (None, ""):
            return None
        if isinstance(value, str):
            raw = value.strip().upper()
            if raw and raw[-1] in {"N", "S", "E", "W"}:
                hemi = raw[-1]
                digits = raw[:-1]
                if digits.isdigit():
                    if is_longitude:
                        deg_len = 3 if len(digits) >= 7 else 2
                    else:
                        deg_len = 2
                    if len(digits) >= deg_len + 4:
                        deg = int(digits[:deg_len])
                        minutes = int(digits[deg_len:deg_len + 2])
                        seconds = int(digits[deg_len + 2:deg_len + 4])
                        decimal = deg + (minutes / 60.0) + (seconds / 3600.0)
                        if hemi in {"S", "W"}:
                            decimal *= -1
                        return round(decimal, 6)
        return cls._to_float(value)

    @staticmethod
    def _to_float(value: Any) -> float | None:
        if value in (None, ""):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _map_row(cls, row: dict) -> SourceMeasurement:
        return SourceMeasurement(
            station_name=row.get("nombre", ""),
            measured_at_utc=datetime.fromisoformat(row["fhora"].replace("Z", "+00:00")),
            temperature_c=cls._to_float(row.get("temp")),
            pressure_hpa=cls._to_float(row.get("pres")),
            speed_mps=cls._to_float(row.get("vel")),
            direction_deg=cls._to_float(row.get("dir")),
            latitude=cls._to_float(row.get("lat") or row.get("latitud")),
            longitude=cls._to_float(row.get("lon") or row.get("long") or row.get("longitud")),
            altitude_m=cls._to_float(row.get("alt") or row.get("altitud")),
        )
