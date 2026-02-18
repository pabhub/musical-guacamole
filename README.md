# GS Inima Challenge – AEMET Antarctic Service

This repository contains a complete solution for the three parts of the challenge:

- **Part 1:** FastAPI service to query Antarctic weather station time series from AEMET.
- **Part 2:** SQLite cache to reduce pressure on AEMET API + structured logging.
- **Part 3:** Lightweight TypeScript front-end to query and view data quickly.

## Architecture overview

- `app/main.py`: FastAPI app + API endpoint + static frontend serving.
- `app/aemet_client.py`: HTTP client for AEMET API.
- `app/database.py`: SQLite repository with UPSERT strategy.
- `app/service.py`: business logic (timezone handling + aggregation + type filtering).
- `tests/`: API and service tests, including DST behavior.
- `frontend/src/app.ts`: TypeScript frontend source.
- `frontend/dist/*`: browser-ready static files.

## API endpoint

`GET /api/antarctic/datos/fechaini/{fechaIniStr}/fechafin/{fechaFinStr}/estacion/{identificacion}`

### Path params

- `fechaIniStr`: `YYYY-MM-DDTHH:MM:SS`
- `fechaFinStr`: `YYYY-MM-DDTHH:MM:SS`
- `identificacion`: station identifier. Supports:
  - slugs: `gabriel-de-castilla`, `juan-carlos-i`
  - direct AEMET station IDs from station catalog (e.g. `89064`, `89070`)

### Query params

- `location`: IANA timezone string (`UTC`, `Europe/Berlin`, etc.)
- `aggregation`: `none | hourly | daily | monthly`
- `types`: repeatable list among `temperature`, `pressure`, `speed`, `direction`
  - if omitted, all are returned

### Output

- `datetime` always returned in `Europe/Madrid` (CET/CEST) with timezone offset.
- each row also includes station geospatial data when available: `latitude`, `longitude`, `altitude`.
- source 10-min granularity is kept for `aggregation=none`.
- `hourly/daily/monthly` perform mean aggregation.

### Export endpoint

`GET /api/antarctic/export/fechaini/{fechaIniStr}/fechafin/{fechaFinStr}/estacion/{identificacion}`

Uses the same query parameters as the main data endpoint (`location`, `aggregation`, `types`) plus:

- `format`: `csv` (default) or `parquet`

Notes:

- CSV export is always available.
- Parquet export requires optional dependencies (`pandas` + `pyarrow`); otherwise the endpoint returns `501`.


## Other AEMET data that may be useful

For wind-farm feasibility studies, AEMET station payloads often include additional variables beyond the current MVP (`temp`, `pres`, `vel`). Useful examples are:

- `hr`: relative humidity
- `prec`: precipitation
- `dir`: wind direction
- `racha`: wind gust
- `vis`: visibility
- `tpr`: dew point

This project now exposes a helper endpoint to document what is currently returned and what can be added next. It also persists station coordinates in SQLite for map-based analytics:

- `GET /api/metadata/available-data`
- `GET /api/metadata/latest-availability/station/{identificacion}`
- `GET /api/metadata/stations` (AEMET station catalog cached in DB)
  - optional query param: `force_refresh=true` to bypass cache and refresh from AEMET immediately
  - response includes: `checked_at_utc`, `cached_until_utc`, `cache_hit`, `data`

> Note: exact field availability can vary by station and period in the source API.

If the upstream AEMET API reports no observations for the selected time window, the dashboard can now probe recent history and suggest a start/end datetime window based on the newest available observation.

## Environment variables

- `AEMET_API_KEY` (**required** for real calls)
- `DATABASE_URL` (default: `sqlite:///./aemet_cache.db`)
- `REQUEST_TIMEOUT_SECONDS` (default: `20`)
- `AEMET_GABRIEL_STATION_ID` (default: `89064`)
- `AEMET_JUAN_STATION_ID` (default: `89070`)
- `CACHE_FRESHNESS_SECONDS` (default: `10800`, i.e. 3 hours)
- `STATION_CATALOG_FRESHNESS_SECONDS` (default: `604800`, i.e. 7 days)

## Get AEMET API key

1. Open [AEMET OpenData](https://opendata.aemet.es/centrodedescargas/inicio)
2. Go to [API key request page](https://opendata.aemet.es/centrodedescargas/obtencionAPIKey)
3. Submit your email and captcha
4. Wait for the email containing your API key

## Local `.env` setup

```bash
cp .env.example .env
```

Set your key in `.env`:

```dotenv
AEMET_API_KEY=your_real_key_here
```

The backend now loads `.env` automatically (current working directory first, then project root).

## One-command setup

```bash
bash scripts/setup.sh
```

What it does:

- creates `.venv` if missing
- installs backend dependencies
- installs frontend dependencies
- builds `frontend/dist`
- warns if `.env` or `AEMET_API_KEY` is missing

Useful options:

```bash
bash scripts/setup.sh --run-tests
bash scripts/setup.sh --backend-only
bash scripts/setup.sh --frontend-only
bash scripts/setup.sh --strict-env
```

## One-command local run (backend + frontend)

```bash
bash scripts/up_local.sh
```

This command:

- runs setup (backend deps + frontend deps + frontend build)
- validates `.env` + `AEMET_API_KEY` (strict mode by default)
- starts FastAPI with `--reload`

Useful options:

```bash
bash scripts/up_local.sh --no-strict-env
bash scripts/up_local.sh --no-reload
bash scripts/up_local.sh --host 0.0.0.0 --port 8000
```

## Run backend (local dev)

```bash
bash scripts/start.sh --reload
```

Useful options:

```bash
bash scripts/start.sh --host 127.0.0.1 --port 8000 --reload
bash scripts/start.sh --strict-env
```

## Manual backend run (equivalent)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

`.[dev]` installs optional development dependencies (for this project: `pytest` and `pytest-cov`) in addition to runtime dependencies. Quotes are required in `zsh`.

Open:

- Swagger: `http://127.0.0.1:8000/docs`
- UI: `http://127.0.0.1:8000/`
- Config page: `http://127.0.0.1:8000/config`

Input timezone is now configured on the config page and persisted in the browser. If no custom timezone is saved, the app defaults to the user's browser timezone.

## Front-end notes

A minimal TypeScript frontend is provided in `frontend/src/*` and built static assets in `frontend/dist/*`.

The UI includes a **modern streamlined layout** and a **Leaflet + OpenStreetMap** map that overlays station coordinates returned by the API (`latitude`/`longitude`) with interactive popups (altitude/temperature). It also renders wind **flow vectors** from speed/direction, includes a **timeline playback** control, and shows an **average wind table** (avg speed and circular-mean direction over the selected window).

It now also includes chart visualizations and UX upgrades for date/time handling:

- Wind speed line chart over the selected timeline
- Combined temperature + pressure trend chart (dual-axis)
- Quick date-range buttons (last 6h / 24h / 7d)
- `datetime-local` pickers with automatic conversion to the API datetime format (`YYYY-MM-DDTHH:MM:SS`)
- User-selectable display timezone in the UI for table/map/timeline/chart labels (without changing API contract)
- KPI metric cards (rows, average/peak speed proxy, average temperature) for instant situational awareness
- Improved chart readability (smoother lines, gradient area fill, cleaner tooltips/legends)
- One-click export actions (CSV/Parquet) from the current query window
- Improved empty/error states (no-data table rows, chart placeholders, map guidance banners)
- Searchable station catalog panel backed by `/api/metadata/stations`
- Station dropdown populated from catalog with placeholder `Select station`
- Station map markers for all catalog stations; clicking a marker selects that station in dropdown

### Frontend production build pipeline

A reproducible frontend build pipeline is included:

```bash
npm --prefix frontend install
bash scripts/build_frontend.sh
```

This compiles `frontend/src/app.ts` with `tsc` and outputs production-ready static assets (`app.js`, `index.html`, `style.css`) under `frontend/dist/`.

## Deployment notes

### Generic server deployment (backend + frontend)

Use setup + strict startup:

```bash
bash scripts/setup.sh --strict-env
bash scripts/start.sh --strict-env --host 0.0.0.0 --port ${PORT:-8000}
```

### Netlify (frontend-only hosting)

Netlify can host `frontend/dist` as static assets. It does not run the FastAPI backend process.

- Build command:
  - `bash scripts/setup.sh --frontend-only`
- Publish directory:
  - `frontend/dist`

For full app deployment, host backend separately (e.g., Render/Fly.io/Railway/VM) and route frontend API calls to that backend.

## AEMET API limits investigation

A dedicated investigation note is available at `docs/aemet_api_limits.md`, including:

- findings from this environment
- conservative operational recommendations
- a reproducible script (`scripts/check_aemet_limits.sh`) to validate limits from a network with internet access

## Tests

```bash
pytest -q
```

Includes:

- endpoint parameter validation
- measurement type filtering
- hourly aggregation
- daily aggregation behavior on DST transition (Europe/Madrid)

## TODO / future improvements

- add auth + role-based access if exposed beyond internal network.
