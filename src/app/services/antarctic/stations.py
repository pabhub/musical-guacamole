from __future__ import annotations

from datetime import datetime, timedelta

from app.core.exceptions import AppValidationError
from app.models import Station, StationCatalogItem, StationCatalogResponse, StationProfile, StationRole
from app.services.antarctic.constants import KNOWN_ANTARCTIC_STATIONS, UTC


class StationCatalogMixin:
    settings: object
    repository: object

    def station_id_for(self, station: str | Station) -> str:
        if isinstance(station, Station):
            return self.settings.gabriel_station_id if station == Station.GABRIEL_DE_CASTILLA else self.settings.juan_station_id
        normalized = station.strip()
        if normalized == Station.GABRIEL_DE_CASTILLA.value:
            return self.settings.gabriel_station_id
        if normalized == Station.JUAN_CARLOS_I.value:
            return self.settings.juan_station_id
        return normalized

    def get_station_catalog(self, force_refresh: bool = False, antarctic_only: bool = True) -> StationCatalogResponse:
        checked_at_utc = datetime.now(UTC)
        min_fetched_at_utc = checked_at_utc - timedelta(seconds=self.settings.station_catalog_freshness_seconds)
        cache_hit = (not force_refresh) and self.repository.has_fresh_station_catalog(min_fetched_at_utc)

        if cache_hit:
            cached_rows = self.repository.get_station_catalog()
            rows = self._annotate_station_catalog(cached_rows)
            if rows != cached_rows:
                self.repository.upsert_station_catalog(rows)
            last_fetched_at = self.repository.get_station_catalog_last_fetched_at()
        else:
            rows = self._annotate_station_catalog(self.aemet_client.fetch_station_inventory())
            last_fetched_at = self.repository.upsert_station_catalog(rows)

        if antarctic_only:
            rows = [row for row in rows if row.is_antarctic_station]

        effective_fetched_at = last_fetched_at or checked_at_utc
        return StationCatalogResponse(
            checked_at_utc=checked_at_utc,
            cached_until_utc=effective_fetched_at + timedelta(seconds=self.settings.station_catalog_freshness_seconds),
            cache_hit=cache_hit,
            data=rows,
        )

    def get_station_profiles(self) -> list[StationProfile]:
        catalog = self._known_antarctic_station_catalog()
        profiles: list[StationProfile] = []
        for station_id, station in catalog.items():
            definition = self._antarctic_station_definitions().get(station_id, {})
            role = definition.get("role", StationRole.SUPPLEMENTAL)
            is_selectable = bool(definition.get("is_selectable", False))
            primary_station_id = str(definition.get("primary_station_id", station_id))
            profiles.append(
                StationProfile(
                    stationId=station_id,
                    stationName=station.station_name,
                    role=role if isinstance(role, StationRole) else StationRole(str(role)),
                    isSelectable=is_selectable,
                    primaryStationId=primary_station_id,
                    latitude=station.latitude,
                    longitude=station.longitude,
                    altitude=station.altitude_m,
                )
            )
        return sorted(
            profiles,
            key=lambda profile: (
                0 if profile.role == StationRole.METEO else (1 if profile.role == StationRole.SUPPLEMENTAL else 2),
                profile.station_name.upper(),
            ),
        )

    def _annotate_station_catalog(self, rows: list[StationCatalogItem]) -> list[StationCatalogItem]:
        known_antarctic_catalog = self._known_antarctic_station_catalog()
        known_antarctic_ids = set(known_antarctic_catalog.keys())
        enriched: dict[str, StationCatalogItem] = {}

        for row in rows:
            known = known_antarctic_catalog.get(row.station_id)
            is_antarctic = row.station_id in known_antarctic_ids or (row.province or "").upper() == "ANTARCTIC"
            endpoint = "antartida" if is_antarctic else "valores-climatologicos-inventario"
            enriched[row.station_id] = row.model_copy(
                update={
                    "station_name": known.station_name if known else row.station_name,
                    "province": "ANTARCTIC" if is_antarctic else row.province,
                    "latitude": row.latitude if row.latitude is not None else (known.latitude if known else None),
                    "longitude": row.longitude if row.longitude is not None else (known.longitude if known else None),
                    "altitude_m": row.altitude_m if row.altitude_m is not None else (known.altitude_m if known else None),
                    "data_endpoint": endpoint,
                    "is_antarctic_station": is_antarctic,
                }
            )

        for station_id, known in known_antarctic_catalog.items():
            existing = enriched.get(station_id)
            if existing is None:
                enriched[station_id] = known
            else:
                enriched[station_id] = existing.model_copy(
                    update={
                        "station_name": existing.station_name or known.station_name,
                        "province": "ANTARCTIC",
                        "latitude": existing.latitude if existing.latitude is not None else known.latitude,
                        "longitude": existing.longitude if existing.longitude is not None else known.longitude,
                        "altitude_m": existing.altitude_m if existing.altitude_m is not None else known.altitude_m,
                        "data_endpoint": "antartida",
                        "is_antarctic_station": True,
                    }
                )

        return sorted(enriched.values(), key=lambda row: row.station_id.upper())

    def _known_antarctic_station_ids(self) -> dict[str, str]:
        known_catalog = self._known_antarctic_station_catalog()
        return {station_id: row.station_name for station_id, row in known_catalog.items()}

    def _known_antarctic_station_catalog(self) -> dict[str, StationCatalogItem]:
        known: dict[str, StationCatalogItem] = {}
        for station_id, payload in self._antarctic_station_definitions().items():
            known[station_id] = StationCatalogItem(
                stationId=station_id,
                stationName=str(payload["station_name"]),
                province="ANTARCTIC",
                latitude=float(payload["latitude"]),
                longitude=float(payload["longitude"]),
                altitude=float(payload["altitude"]),
                dataEndpoint="antartida",
                isAntarcticStation=True,
            )
        return known

    def _antarctic_station_definitions(self) -> dict[str, dict[str, object]]:
        definitions = {key: dict(value) for key, value in KNOWN_ANTARCTIC_STATIONS.items()}

        juan_station_id = self.settings.juan_station_id.strip()
        if juan_station_id and juan_station_id not in definitions:
            base = KNOWN_ANTARCTIC_STATIONS["89064"]
            definitions[juan_station_id] = dict(base, primary_station_id=juan_station_id)
        gabriel_station_id = self.settings.gabriel_station_id.strip()
        if gabriel_station_id and gabriel_station_id not in definitions:
            base = KNOWN_ANTARCTIC_STATIONS["89070"]
            definitions[gabriel_station_id] = dict(base, primary_station_id=gabriel_station_id)

        return definitions

    def _selectable_meteo_station_ids(self) -> list[str]:
        ids = [
            station_id
            for station_id, payload in self._antarctic_station_definitions().items()
            if bool(payload.get("is_selectable", False))
        ]
        return sorted(ids)

    def _map_overlay_station_ids(self) -> list[str]:
        ids = [
            station_id
            for station_id, payload in self._antarctic_station_definitions().items()
            if bool(payload.get("include_on_map", False))
        ]
        return sorted(ids)

    def _assert_station_supported_by_antarctic_endpoint(self, station_id: str) -> None:
        if station_id in self._known_antarctic_station_ids():
            return

        station = self.repository.get_station_catalog_item(station_id)
        if station is None:
            raise AppValidationError(
                f"Station '{station_id}' is not present in Antarctic station catalog. "
                "Use /api/analysis/bootstrap to retrieve valid Antarctic stations."
            )

        if station.is_antarctic_station or station.data_endpoint == "antartida":
            return

        raise AppValidationError(
            f"Station '{station_id}' is not classified for AEMET Antarctic endpoint "
            f"(dataEndpoint='{station.data_endpoint}')."
        )

    def _assert_station_selectable(self, station_id: str) -> None:
        if station_id in self._selectable_meteo_station_ids():
            return
        raise AppValidationError(
            f"Station '{station_id}' is not selectable in this app. "
            "Use Meteo Station Juan Carlos I (89064) or Meteo Station Gabriel de Castilla (89070)."
        )
