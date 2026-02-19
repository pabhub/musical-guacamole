# Implementation Plan and Backlog

## Completed in this overhaul

1. Antarctic-only product scope
- Enforced UI station selection to:
  - `89064` Meteo Station Juan Carlos I
  - `89070` Meteo Station Gabriel de Castilla
- Added fixed Antarctic station model including supplemental and archive IDs.

2. Startup UX and map behavior
- Added `/api/analysis/bootstrap`.
- Startup now shows 3 active station overlays (`89064`, `89064R`, `89070`) from persisted/latest cache.

3. API call minimization and persistence
- Warm-cache strategy on active stations with freshness checks.
- SQLite fetch-window reuse to avoid repeated upstream requests.
- Archive ID (`89064RA`) excluded from startup map calls.

4. Analyst API surface finalized for frontend
- Exposed in `/docs`:
  - `POST /api/auth/token`
  - `GET /api/metadata/latest-availability/station/{identificacion}`
  - `GET /api/analysis/bootstrap`
  - `POST /api/analysis/query-jobs`
  - `GET /api/analysis/query-jobs/{job_id}`
  - `GET /api/analysis/query-jobs/{job_id}/result`
  - `GET /api/analysis/playback`
  - `GET /api/analysis/timeframes`
  - `GET /api/antarctic/export/fechaini/{fechaIniStr}/fechafin/{fechaFinStr}/estacion/{identificacion}`
- Removed legacy HTTP routes not used by frontend:
  - `/api/analysis/feasibility`
  - `/api/metadata/available-data`
  - `/api/metadata/stations`
  - `/api/antarctic/datos/...`

5. UI/UX redesign + frontend code structure
- Rebuilt dashboard for feasibility screening:
  - KPI cards
  - station comparison table
  - wind/temperature-pressure/direction charts
  - legal attribution panel
  - selected station detail table
- Split frontend logic into focused modules (`dashboard/analysis_job.ts`, `dashboard/bootstrap_flow.ts`, `dashboard/export_actions.ts`, `dashboard/chart_*`, `dashboard/timeframe_manager.ts`, etc.) and enabled strict TS unused checks.
- Added cross-page shared frontend modules under `frontend/src/core/` (`dom.ts`, `navigation.ts`, `settings.ts`) and consumed them from dashboard/config/login.
- Replaced large page HTML files with componentized templates under `frontend/src/components/`; `frontend/src/pages/*` now only host thin `#app-root` shells.

6. Compliance
- AEMET + OSM attribution integrated in UI and response headers.
- Tests include compliance header assertions and explicit API contract/OpenAPI path assertions.

## Next priorities

1. Historical backfill orchestrator
- Goal: build month-by-month persisted history (12+ months) without burst calling.
- Output: monthly climatology cards (P50/P90 speed, directional concentration, temperature extremes).

2. Extended Antarctic variables
- Evaluate adding `racha`, `hr`, `prec` when available in Antarctic payloads.
- Keep field-level null-safe behavior and explicit coverage reporting.

3. Decision scorecard
- Add configurable screening thresholds and traffic-light scoring for:
  - resource quality
  - variability risk
  - data confidence
  - operability constraints

4. Optional contextual modules
- Evaluate additional AEMET products only where Antarctic applicability is confirmed.
- Keep these modules non-blocking and cache-aware.

5. Reporting
- Export a decision memo package (summary KPIs + charts + source attribution footer).
