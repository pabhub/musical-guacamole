# API Contract (Frontend-Only Surface)

This project intentionally exposes only the endpoints required by the frontend dashboard and config/login flows.

## Public paths in `/docs`

- `POST /api/auth/token`
- `POST /api/auth/refresh`
- `GET /api/metadata/latest-availability/station/{identificacion}`
- `GET /api/analysis/bootstrap`
- `POST /api/analysis/query-jobs`
- `GET /api/analysis/query-jobs/{job_id}`
- `GET /api/analysis/query-jobs/{job_id}/result`
- `GET /api/analysis/playback`
- `GET /api/analysis/timeframes`
- `GET /api/antarctic/export/fechaini/{fechaIniStr}/fechafin/{fechaFinStr}/estacion/{identificacion}`

Page routes (`/`, `/login`, `/config`) are excluded from OpenAPI.

## Verification

1. Build frontend and start API:
   - `bash scripts/setup.sh`
   - `source .venv/bin/activate`
   - `bash scripts/start.sh --reload`
2. Open docs:
   - `http://127.0.0.1:8000/docs`
3. Confirm OpenAPI path contract in tests:
   - `pytest -q tests/test_api.py::test_openapi_lists_only_frontend_contract_paths`

## Notes

- Legacy routes (`/api/analysis/feasibility`, `/api/metadata/stations`, `/api/metadata/available-data`, `/api/antarctic/datos/...`) are intentionally not exposed.
- Antarctic observations are still sourced from AEMET upstream `antartida/datos` internally through cache-first month-window retrieval.
- Session behavior:
  - Access token expiry is rotated via `POST /api/auth/refresh` while the user remains active.
  - After 1 hour of inactivity on the frontend, the token is cleared and the user must authenticate again.
- `/api/analysis/timeframes` simulation supports density and operating-envelope factors:
  - `referenceAirDensityKgM3`
  - `minOperatingTempC`, `maxOperatingTempC`
  - `minOperatingPressureHpa`, `maxOperatingPressureHpa`
  - optional `forceRefreshOnEmpty=true` to retry with forced month-window refresh when initial timeframe query returns no buckets
