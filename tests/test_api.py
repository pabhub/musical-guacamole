from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.dependencies import get_auth_service, require_api_user
from app.main import app, get_service
from app.models import MeasurementType, OutputMeasurement
from app.services.auth_service import AuthUser


class FakeService:
    def get_data(self, station, start_local, end_local, aggregation, selected_types):
        return [
            OutputMeasurement(
                stationName="Dummy",
                datetime=start_local,
                temperature=1.0,
                pressure=2.0 if not selected_types or MeasurementType.PRESSURE in selected_types else None,
                speed=3.0,
                direction=180.0,
                latitude=-62.97,
                longitude=-60.68,
                altitude=15.0,
            )
        ]

    def get_latest_availability(self, station):
        return {
            "station": station,
            "checked_at_utc": "2026-02-18T10:00:00+00:00",
            "newest_observation_utc": "2026-02-18T08:50:00+00:00",
            "suggested_start_utc": "2026-02-17T08:50:00+00:00",
            "suggested_end_utc": "2026-02-18T08:50:00+00:00",
            "probe_window_hours": 24,
            "suggested_aggregation": "none",
            "note": "Suggested window targets latest available observations from AEMET.",
        }

    def get_analysis_bootstrap(self):
        return {
            "checked_at_utc": "2026-02-18T12:00:00+00:00",
            "note": "Bootstrap ok",
            "stations": [
                {
                    "stationId": "89064",
                    "stationName": "Estación Meteorológica Juan Carlos I",
                    "role": "meteo",
                    "isSelectable": True,
                    "primaryStationId": "89064",
                    "latitude": -62.66325,
                    "longitude": -60.38959,
                    "altitude": 12.0,
                },
                {
                    "stationId": "89070",
                    "stationName": "Estación Meteorológica Gabriel de Castilla",
                    "role": "meteo",
                    "isSelectable": True,
                    "primaryStationId": "89070",
                    "latitude": -62.97697,
                    "longitude": -60.67528,
                    "altitude": 12.0,
                },
            ],
            "selectableStationIds": ["89064", "89070"],
            "mapStationIds": ["89064", "89070"],
            "latestObservationByStation": {
                "89064": "2026-02-18T08:50:00+00:00",
                "89070": "2026-02-18T08:30:00+00:00",
            },
            "suggestedStartByStation": {
                "89064": "2026-01-18T08:50:00+00:00",
                "89070": "2026-01-18T08:30:00+00:00",
            },
            "latestSnapshots": [
                {
                    "stationId": "89064",
                    "stationName": "Estación Meteorológica Juan Carlos I",
                    "role": "meteo",
                    "datetime": "2026-02-18T09:50:00+01:00",
                    "speed": 5.2,
                    "direction": 180.0,
                    "temperature": -3.0,
                    "pressure": 990.0,
                    "latitude": -62.66325,
                    "longitude": -60.38959,
                    "altitude": 12.0,
                }
            ],
        }

    def create_query_job(
        self,
        station,
        start_local,
        end_local,
        timezone_input,
        playback_step,
        aggregation,
        selected_types,
        history_start_local,
    ):
        _ = end_local
        return {
            "jobId": "job_123",
            "status": "pending",
            "stationId": station,
            "requestedStartUtc": "2026-01-18T08:50:00+00:00",
            "effectiveEndUtc": "2026-02-18T08:50:00+00:00",
            "historyStartUtc": "2025-12-18T08:50:00+00:00",
            "totalWindows": 2,
            "cachedWindows": 1,
            "missingWindows": 1,
            "totalApiCallsPlanned": 2,
            "completedApiCalls": 0,
            "framesPlanned": 24,
            "framesReady": 12,
            "playbackReady": False,
            "message": "Queued missing windows for fetch.",
        }

    def get_query_job_status(self, job_id):
        return {
            "jobId": job_id,
            "status": "running",
            "stationId": "89064",
            "totalWindows": 2,
            "cachedWindows": 1,
            "missingWindows": 1,
            "completedWindows": 1,
            "totalApiCallsPlanned": 2,
            "completedApiCalls": 1,
            "framesPlanned": 24,
            "framesReady": 16,
            "playbackReady": False,
            "percent": 50.0,
            "message": "Fetching missing windows from AEMET.",
            "errorDetail": None,
            "updatedAtUtc": "2026-02-18T12:10:00+00:00",
        }

    def get_query_job_result(self, job_id):
        _ = job_id
        return {
            "checked_at_utc": "2026-02-18T12:00:00+00:00",
            "selectedStationId": "89064",
            "selectedStationName": "Estación Meteorológica Juan Carlos I",
            "requestedStart": "2026-01-18T08:50:00+00:00",
            "effectiveEnd": "2026-02-18T08:50:00+00:00",
            "effectiveEndReason": "limited_by_latest_available_observation",
            "timezone_input": "UTC",
            "timezone_output": "Europe/Madrid",
            "aggregation": "hourly",
            "mapStationIds": ["89064", "89070"],
            "notes": ["note-a", "note-b"],
            "stations": [
                {
                    "stationId": "89064",
                    "stationName": "Estación Meteorológica Juan Carlos I",
                    "role": "meteo",
                    "summary": {
                        "stationId": "89064",
                        "stationName": "Estación Meteorológica Juan Carlos I",
                        "role": "meteo",
                        "dataPoints": 1,
                        "coverageRatio": 1.0,
                        "avgSpeed": 5.0,
                        "p90Speed": 5.0,
                        "maxSpeed": 5.0,
                        "hoursAbove3mps": 1.0,
                        "hoursAbove5mps": 1.0,
                        "avgTemperature": -3.0,
                        "minTemperature": -3.0,
                        "maxTemperature": -3.0,
                        "avgPressure": 990.0,
                        "prevailingDirection": 180.0,
                        "estimatedWindPowerDensity": 80.0,
                        "latestObservationUtc": "2026-02-18T08:50:00+00:00",
                    },
                    "data": [
                        {
                            "stationName": "Estación Meteorológica Juan Carlos I",
                            "datetime": "2026-02-18T09:50:00+01:00",
                            "temperature": -3.0,
                            "pressure": 990.0,
                            "speed": 5.0,
                            "direction": 180.0,
                            "latitude": -62.66325,
                            "longitude": -60.38959,
                            "altitude": 12.0,
                        }
                    ],
                }
            ],
        }

    def get_playback_frames(self, station, start_local, end_local, step, timezone_input):
        _ = (start_local, end_local, step)
        return {
            "stationId": station,
            "stationName": "Estación Meteorológica Juan Carlos I",
            "requestedStep": "1h",
            "effectiveStep": "1h",
            "timezone_input": timezone_input,
            "timezone_output": "Europe/Madrid",
            "start": "2026-01-18T08:50:00+00:00",
            "end": "2026-02-18T08:50:00+00:00",
            "frames": [
                {
                    "datetime": "2026-02-18T09:50:00+01:00",
                    "speed": 5.0,
                    "direction": 180.0,
                    "temperature": -3.0,
                    "pressure": 990.0,
                    "qualityFlag": "observed",
                    "dx": 0.0,
                    "dy": -5.0,
                }
            ],
            "framesPlanned": 1,
            "framesReady": 1,
            "qualityCounts": {"observed": 1, "aggregated": 0, "gap_filled": 0},
            "windRose": {
                "bins": [
                    {"sector": "N", "speedBuckets": {"calm": 0, "breeze": 0, "strong": 0, "gale": 0}, "totalCount": 0}
                ],
                "dominantSector": "S",
                "directionalConcentration": 1.0,
                "calmShare": 0.0,
            },
        }

    def get_timeframe_analytics(
        self,
        station,
        start_local,
        end_local,
        group_by,
        timezone_input,
        compare_start_local,
        compare_end_local,
        simulation_params,
        force_refresh_on_empty=False,
    ):
        _ = (
            start_local,
            end_local,
            group_by,
            compare_start_local,
            compare_end_local,
            simulation_params,
            force_refresh_on_empty,
        )
        return {
            "stationId": station,
            "stationName": "Estación Meteorológica Juan Carlos I",
            "groupBy": "day",
            "timezone_input": timezone_input,
            "timezone_output": "Europe/Madrid",
            "requestedStart": "2026-01-18T08:50:00+00:00",
            "requestedEnd": "2026-02-18T08:50:00+00:00",
            "buckets": [
                {
                    "label": "2026-02-18",
                    "start": "2026-02-18T00:00:00+01:00",
                    "end": "2026-02-19T00:00:00+01:00",
                    "dataPoints": 6,
                    "avgSpeed": 5.0,
                    "p90Speed": 6.0,
                    "hoursAbove3mps": 4.0,
                    "hoursAbove5mps": 2.0,
                    "speedVariability": 1.1,
                    "dominantDirection": 185.0,
                    "minTemperature": -6.0,
                    "maxTemperature": -2.0,
                    "estimatedGenerationMwh": 12.4,
                }
            ],
            "windRose": {
                "bins": [
                    {"sector": "N", "speedBuckets": {"calm": 0, "breeze": 0, "strong": 0, "gale": 0}, "totalCount": 0}
                ],
                "dominantSector": "S",
                "directionalConcentration": 1.0,
                "calmShare": 0.0,
            },
            "comparison": [
                {
                    "metric": "avgSpeed",
                    "baseline": 4.0,
                    "current": 5.0,
                    "absoluteDelta": 1.0,
                    "percentDelta": 25.0,
                }
            ],
        }


class ErrorService:
    def get_data(self, station, start_local, end_local, aggregation, selected_types):
        _ = (station, start_local, end_local, aggregation, selected_types)
        raise RuntimeError("AEMET response missing 'datos' URL. estado=401")


class ValidationService:
    def get_data(self, station, start_local, end_local, aggregation, selected_types):
        _ = (station, start_local, end_local, aggregation, selected_types)
        raise ValueError("Station '1234X' is not classified for AEMET Antarctic endpoint")


class ValidationAvailabilityService:
    def get_latest_availability(self, station):
        _ = station
        raise ValueError("Station '1234X' is not classified for AEMET Antarctic endpoint")


class FakeAuthService:
    auth_enabled = True
    token_ttl_seconds = 3600

    def issue_access_token(self, username, password):
        if username == "tester" and password == "secret":
            return "token-abc"
        raise PermissionError("Invalid username or password.")

    def issue_access_token_for_subject(self, subject):
        if subject == "tester":
            return "token-refresh"
        raise PermissionError("Invalid token subject.")

    def validate_access_token(self, token):
        if token not in {"token-abc", "token-refresh"}:
            raise PermissionError("Token has expired.")
        return AuthUser(username="tester")


app.dependency_overrides[get_service] = lambda: FakeService()
app.dependency_overrides[require_api_user] = lambda: AuthUser(username="test")
client = TestClient(app)


def test_removed_api_surface_is_not_exposed_anymore():
    assert client.get("/api/metadata/available-data").status_code == 404
    assert client.get("/api/metadata/stations").status_code == 404
    assert client.get("/api/analysis/feasibility").status_code == 404
    assert client.get(
        "/api/antarctic/datos/fechaini/2024-01-01T00:00:00/fechafin/2024-01-01T01:00:00/estacion/89064"
    ).status_code == 404


def test_openapi_lists_only_frontend_contract_paths():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    payload = response.json()
    paths = set(payload.get("paths", {}).keys())
    assert paths == {
        "/api/auth/token",
        "/api/auth/refresh",
        "/api/metadata/latest-availability/station/{identificacion}",
        "/api/analysis/bootstrap",
        "/api/analysis/query-jobs",
        "/api/analysis/query-jobs/{job_id}",
        "/api/analysis/query-jobs/{job_id}/result",
        "/api/analysis/playback",
        "/api/analysis/timeframes",
        "/api/antarctic/export/fechaini/{fechaIniStr}/fechafin/{fechaFinStr}/estacion/{identificacion}",
    }


def test_export_csv_returns_downloadable_file():
    response = client.get(
        "/api/antarctic/export/fechaini/2024-01-01T00:00:00/fechafin/2026-01-01T01:00:00/estacion/gabriel-de-castilla",
        params={"location": "UTC", "aggregation": "none", "format": "csv", "types": ["pressure"]},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["x-aemet-source"] == "Fuente: AEMET"
    assert response.headers["x-osm-copyright-url"] == "https://www.openstreetmap.org/copyright"
    assert "stationName,datetime,temperature,pressure,speed,direction,latitude,longitude,altitude" in response.text
    assert "Dummy" in response.text


def test_export_invalid_timezone_returns_400():
    response = client.get(
        "/api/antarctic/export/fechaini/2024-01-01T00:00:00/fechafin/2024-01-01T01:00:00/estacion/gabriel-de-castilla",
        params={"location": "Mars/Base", "format": "csv"},
    )
    assert response.status_code == 400


def test_export_parquet_returns_not_implemented_without_extra_deps():
    response = client.get(
        "/api/antarctic/export/fechaini/2024-01-01T00:00:00/fechafin/2024-01-01T01:00:00/estacion/gabriel-de-castilla",
        params={"location": "UTC", "aggregation": "none", "format": "parquet"},
    )
    assert response.status_code in {200, 501}
    if response.status_code == 501:
        assert "Parquet export requires" in response.json()["detail"]


def test_export_runtime_error_returns_502():
    app.dependency_overrides[get_service] = lambda: ErrorService()
    try:
        response = client.get(
            "/api/antarctic/export/fechaini/2024-01-01T00:00:00/fechafin/2024-01-01T01:00:00/estacion/gabriel-de-castilla",
            params={"location": "UTC", "format": "csv"},
        )
        assert response.status_code == 502
        assert "missing 'datos'" in response.json()["detail"]
    finally:
        app.dependency_overrides[get_service] = lambda: FakeService()


def test_export_validation_error_returns_400():
    app.dependency_overrides[get_service] = lambda: ValidationService()
    try:
        response = client.get(
            "/api/antarctic/export/fechaini/2024-01-01T00:00:00/fechafin/2024-01-01T01:00:00/estacion/1234X",
            params={"location": "UTC", "format": "csv"},
        )
        assert response.status_code == 400
        assert "not classified" in response.json()["detail"]
    finally:
        app.dependency_overrides[get_service] = lambda: FakeService()


def test_latest_availability_endpoint_returns_payload():
    app.dependency_overrides[get_service] = lambda: FakeService()
    response = client.get("/api/metadata/latest-availability/station/gabriel-de-castilla")
    assert response.status_code == 200
    payload = response.json()
    assert payload["station"] == "gabriel-de-castilla"
    assert payload["newest_observation_utc"] == "2026-02-18T08:50:00Z"
    assert payload["suggested_start_utc"] == "2026-02-17T08:50:00Z"


def test_latest_availability_validation_error_returns_400():
    app.dependency_overrides[get_service] = lambda: ValidationAvailabilityService()
    try:
        response = client.get("/api/metadata/latest-availability/station/1234X")
        assert response.status_code == 400
        assert "not classified" in response.json()["detail"]
    finally:
        app.dependency_overrides[get_service] = lambda: FakeService()


def test_analysis_bootstrap_endpoint_returns_antarctic_station_profiles():
    app.dependency_overrides[get_service] = lambda: FakeService()
    response = client.get("/api/analysis/bootstrap")
    assert response.status_code == 200
    payload = response.json()
    assert payload["selectableStationIds"] == ["89064", "89070"]
    assert payload["mapStationIds"] == ["89064", "89070"]
    assert payload["latestSnapshots"][0]["stationId"] == "89064"
    assert response.headers["x-aemet-source"] == "Fuente: AEMET"


def test_analysis_bootstrap_sets_request_id_header():
    app.dependency_overrides[get_service] = lambda: FakeService()
    response = client.get("/api/analysis/bootstrap")
    assert response.status_code == 200
    assert response.headers.get("x-request-id")


def test_analysis_query_job_endpoints():
    app.dependency_overrides[get_service] = lambda: FakeService()
    create = client.post(
        "/api/analysis/query-jobs",
        json={
            "station": "89064",
            "start": "2026-01-18T08:50:00",
            "location": "UTC",
            "playbackStep": "1h",
            "aggregation": "hourly",
            "types": ["speed", "direction"],
        },
    )
    assert create.status_code == 200
    created = create.json()
    assert created["jobId"] == "job_123"

    status = client.get("/api/analysis/query-jobs/job_123")
    assert status.status_code == 200
    assert status.json()["status"] == "running"

    result = client.get("/api/analysis/query-jobs/job_123/result")
    assert result.status_code == 200
    assert result.json()["selectedStationId"] == "89064"


def test_playback_and_timeframe_endpoints():
    app.dependency_overrides[get_service] = lambda: FakeService()
    playback = client.get(
        "/api/analysis/playback",
        params={
            "station": "89064",
            "start": "2026-01-18T08:50:00",
            "end": "2026-01-19T08:50:00",
            "step": "1h",
            "location": "UTC",
        },
    )
    assert playback.status_code == 200
    assert playback.json()["effectiveStep"] == "1h"

    timeframe = client.get(
        "/api/analysis/timeframes",
        params={
            "station": "89064",
            "start": "2026-01-18T08:50:00",
            "end": "2026-01-19T08:50:00",
            "groupBy": "day",
            "location": "UTC",
            "turbineCount": 6,
            "ratedPowerKw": 900,
            "cutInSpeedMps": 3,
            "ratedSpeedMps": 12,
            "cutOutSpeedMps": 25,
            "referenceAirDensityKgM3": 1.225,
            "minOperatingTempC": -40,
            "maxOperatingTempC": 45,
            "minOperatingPressureHpa": 850,
            "maxOperatingPressureHpa": 1085,
        },
    )
    assert timeframe.status_code == 200
    payload = timeframe.json()
    assert payload["buckets"][0]["estimatedGenerationMwh"] == 12.4


def test_timeframe_endpoint_comparison_range_validation():
    app.dependency_overrides[get_service] = lambda: FakeService()
    response = client.get(
        "/api/analysis/timeframes",
        params={
            "station": "89064",
            "start": "2026-01-18T08:50:00",
            "end": "2026-01-19T08:50:00",
            "groupBy": "day",
            "location": "UTC",
            "compareStart": "2024-01-01T00:00:00",
            "compareEnd": "2023-01-01T00:00:00",
        },
    )
    assert response.status_code == 400
    assert "must be before" in response.json()["detail"]


def test_jwt_auth_endpoint_and_protected_routes():
    app.dependency_overrides.pop(require_api_user, None)
    app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
    app.dependency_overrides[get_service] = lambda: FakeService()
    try:
        unauthorized = client.get("/api/analysis/bootstrap")
        assert unauthorized.status_code == 401

        invalid_login = client.post("/api/auth/token", json={"username": "tester", "password": "wrong"})
        assert invalid_login.status_code == 401

        login = client.post("/api/auth/token", json={"username": "tester", "password": "secret"})
        assert login.status_code == 200
        payload = login.json()
        assert payload["tokenType"] == "bearer"
        assert payload["expiresInSeconds"] == 3600

        token = payload["accessToken"]
        authorized = client.get("/api/analysis/bootstrap", headers={"Authorization": f"Bearer {token}"})
        assert authorized.status_code == 200

        refreshed = client.post("/api/auth/refresh", headers={"Authorization": f"Bearer {token}"})
        assert refreshed.status_code == 200
        refreshed_payload = refreshed.json()
        assert refreshed_payload["accessToken"] == "token-refresh"
        authorized_with_refreshed = client.get(
            "/api/analysis/bootstrap",
            headers={"Authorization": f"Bearer {refreshed_payload['accessToken']}"},
        )
        assert authorized_with_refreshed.status_code == 200
    finally:
        app.dependency_overrides.pop(get_auth_service, None)
        app.dependency_overrides[get_service] = lambda: FakeService()
        app.dependency_overrides[require_api_user] = lambda: AuthUser(username="test")
