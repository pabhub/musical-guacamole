# Antarctic API Positioning

## Question

Can Antarctic station IDs (`89064`, `89064R`, `89064RA`, `89070`) be treated as generic station IDs across AEMET endpoint families, or should they be handled as Antarctic-specific?

## Findings

1. The Antarctic endpoint has strict behavior and constraints:
   - upstream path family: `/api/antartida/datos/.../estacion/{identificacion}`
   - hard one-month limit in upstream responses (`"El rango de fechas no puede ser superior a 1 mes"`)
2. AEMET OpenData operational FAQ documents API usage constraints, including request-rate limits (40 req/min currently documented) and endpoint-specific behaviors.
3. Non-Antarctic climatological families are documented around `idema` station patterns; for this product, coverage consistency for Antarctic IDs is not guaranteed enough to make them part of the core flow.

## Decision

This application treats Antarctic IDs as Antarctic-endpoint entities for core analytics.

- Core upstream source: Antarctic endpoint only.
- App HTTP contract exposed in `/docs`: cache-first `/api/analysis/*`, `/api/metadata/latest-availability/*`, and `/api/antarctic/export/*` (no direct `/api/antarctic/datos/*` passthrough).
- UI selection restricted to meteo stations:
  - `89064` (Juan Carlos I)
  - `89070` (Gabriel de Castilla)
- Supplemental data for Juan is included through:
  - `89064R` (active supplemental)
  - `89064RA` (archive metadata, not startup overlay)

## Why this is safer

- Predictable semantics for analysts and fewer integration surprises.
- Lower risk of hitting API limits by avoiding exploratory cross-endpoint calls for each query.
- Easier cache strategy because all operational data windows come from one canonical source.

## Sources

- AEMET legal notice: https://www.aemet.es/en/nota_legal
- AEMET OpenData FAQ (2025-11): https://www.aemet.es/documentos_d/eltiempo/prediccion/ayuda_aemet_opendata.pdf
