# Antarctic Wind Feasibility Framework (Analyst-Facing)

This document explains how the dashboard metrics map to practical Business Development questions.

## 1) Key questions and required evidence

1. Is there enough wind resource to justify deeper engineering studies?
2. How variable is the resource (hourly and directional)?
3. How extreme are environmental conditions that can impact CAPEX/OPEX?
4. How much diesel displacement potential exists at station scale?
5. What data confidence/coverage do we actually have?

## 2) What the app answers today (from AEMET Antarctic API)

The app computes, per station and selected window:

- average / P90 / max wind speed
- direction profile + prevailing direction
- hours above threshold speeds (3 m/s, 5 m/s)
- estimated wind power density proxy (`0.5 * rho * v^3`)
- simulated energy with configurable turbine power-curve thresholds corrected by air density and operating T/P limits
- temperature and pressure ranges
- data coverage ratio and latest observation freshness

### Analyst interpretation guidance

- High average speed with strong P90 supports moving to turbine-class matching.
- Strong directional concentration reduces yaw/terrain uncertainty.
- Large variability + low coverage suggests caution before investment-stage assumptions.
- Cold and high-wind extremes should be linked to cold-climate turbine requirements and O&M planning.
- Use density-corrected generation when comparing seasons/years; equal wind speed can yield different production under different pressure/temperature.

## 3) Why these metrics matter (external evidence)

- Wind power sensitivity to speed is cubic (`V^3`), so small speed shifts can strongly affect yield assumptions:
  - U.S. DOE small wind handbook: https://www.energy.gov/eere/wind/windexchange/small-wind-handbook
- Air density changes with pressure and temperature and therefore affects available wind power:
  - U.S. DOE Wind Resource Basics: https://windexchange.energy.gov/wind-resource-basics
  - NREL Wind Turbine Power Curves (sea-level density assumptions): https://nrel.github.io/turbine-models/
- Density correction for power curves is part of IEC performance testing practice (IEC 61400-12-1):
  - Overview paper referencing IEC-based correction approaches: https://www.sciencedirect.com/science/article/pii/S0306261922010950
- NREL SAM implementation documents hourly density correction with ideal gas law (`rho = P / (R*T)`):
  - https://samrepo.nrelcloud.org/help/wind_power.html
- Site selection depends on wind speed level and frequency distribution (not only peaks):
  - U.S. EIA wind siting note: https://www.eia.gov/energyexplained/wind/where-wind-power-is-harnessed.php
- Cold-climate wind projects must consider icing, low-temperature operation, safety, and O&M:
  - IEA Wind Task 19 summary: https://iea-wind.org/task19/
- Antarctic projects already demonstrate practical diesel displacement potential:
  - Ross Island wind farm (Meridian): https://www.meridianenergy.co.nz/who-we-are/our-power-stations/wind/ross-island/
  - Ross upgrade + BESS context: https://www.scottbaseredevelopment.govt.nz/wind-farm-upgrade
- Renewable hybrid station operation in Antarctica is feasible with microgrid design:
  - Princess Elisabeth station (IPF): https://www.polarfoundation.org/en/press/princess-elisabeth-antarctica-research-station-remains-icon-sustainability
- Broader status of renewables across Antarctic research stations:
  - Sustainability 2024 review: https://www.mdpi.com/2071-1050/16/1/426

## 4) Strategy for annual/seasonal view under AEMET one-month limit

The Antarctic endpoint is limited per request window, so annual analysis should be built through persisted monthly blocks.

Recommended process:

1. Pull 30-day windows sequentially by month and persist in SQLite.
2. Reuse cached windows for all repeat analytics.
3. Rate-limit scheduled refreshes (do not burst calls).
4. Build monthly climatology from cached windows (median/P90, directional bins, temperature extremes).

This app currently implements steps 1-2 for active windows and startup warm-cache.

## 5) What remains for later phases

- Explicit monthly-climatology endpoint from persisted history.
- Optional hybrid-system screening module (wind + storage proxy).
- Operational risk overlays (warnings/maps) only after confirming Antarctic applicability.

## 6) Recommendation checklist for analyst decisions

For each candidate station/timeframe, recommendations should include:

1. Wind resource adequacy:
   - seasonal/yearly mean, P90, and hours above cut-in/rated proxies.
2. Density-adjusted production potential:
   - generation estimates using measured pressure/temperature corrections.
3. Environmental operating risk:
   - share of intervals outside turbine operating temperature/pressure limits.
4. Directional consistency:
   - dominant sectors, concentration, and changes across years/seasons.
5. Data confidence:
   - coverage, missing intervals, and cache freshness/latest observation age.
