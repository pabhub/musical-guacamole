from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class Station(str, Enum):
    GABRIEL_DE_CASTILLA = "gabriel-de-castilla"
    JUAN_CARLOS_I = "juan-carlos-i"


class StationRole(str, Enum):
    METEO = "meteo"
    SUPPLEMENTAL = "supplemental"
    ARCHIVE = "archive"


class StationCatalogItem(BaseModel):
    station_id: str = Field(alias="stationId")
    station_name: str = Field(alias="stationName")
    province: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    altitude_m: float | None = Field(default=None, alias="altitude")
    data_endpoint: str = Field(default="valores-climatologicos-inventario", alias="dataEndpoint")
    is_antarctic_station: bool = Field(default=False, alias="isAntarcticStation")


class StationCatalogResponse(BaseModel):
    checked_at_utc: datetime
    cached_until_utc: datetime
    cache_hit: bool
    data: list[StationCatalogItem]


class StationProfile(BaseModel):
    station_id: str = Field(alias="stationId")
    station_name: str = Field(alias="stationName")
    role: StationRole
    is_selectable: bool = Field(alias="isSelectable")
    primary_station_id: str = Field(alias="primaryStationId")
    latitude: float | None = None
    longitude: float | None = None
    altitude_m: float | None = Field(default=None, alias="altitude")

