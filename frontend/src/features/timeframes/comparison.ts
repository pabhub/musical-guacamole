import { formatNumber } from "../../core/api.js";
import { TimeframeAnalyticsResponse } from "../../core/types.js";
import {
  MONTH_KEYS,
  SEASON_KEYS,
  YearBucket,
  YearSummary,
  avgValue,
  buildYearSummaries,
  decisionFromYearSummaries,
  displayBucketKey,
  metricValue,
  parseYearAndKey,
  periodWord,
  summarize,
} from "./summary.js";

type ComparisonMetricKey = "avgSpeed" | "p90Speed" | "hoursAbove5mps" | "estimatedGenerationMwh";

type ComparisonMetricDef = {
  key: ComparisonMetricKey;
  shortLabel: string;
  fullLabel: string;
  digits: number;
  unit: string;
  hue: number;
};

const HEADING_16 = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW",
  "W", "WNW", "NW", "NNW",
];

const COMPARISON_METRICS: ComparisonMetricDef[] = [
  { key: "avgSpeed", shortLabel: "Avg Speed", fullLabel: "Average speed", digits: 2, unit: "m/s", hue: 206 },
  { key: "p90Speed", shortLabel: "P90 Speed", fullLabel: "P90 speed", digits: 2, unit: "m/s", hue: 186 },
  { key: "hoursAbove5mps", shortLabel: "Hours >= 5", fullLabel: "Hours above 5 m/s", digits: 1, unit: "h", hue: 32 },
  { key: "estimatedGenerationMwh", shortLabel: "Generation", fullLabel: "Estimated generation", digits: 3, unit: "MWh", hue: 152 },
];

function metricValueForBucket(
  bucket: YearBucket | undefined,
  metricKey: ComparisonMetricKey,
): number | null {
  if (!bucket) return null;
  if (metricKey === "avgSpeed") return bucket.avgSpeed;
  if (metricKey === "p90Speed") return bucket.p90Speed;
  if (metricKey === "hoursAbove5mps") return bucket.hoursAbove5mps;
  return bucket.estimatedGenerationMwh;
}

function metricBounds(
  values: Array<number | null>,
): { min: number; max: number } | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!valid.length) return null;
  return {
    min: Math.min(...valid),
    max: Math.max(...valid),
  };
}

function headingLabel(degrees: number | null | undefined): string {
  if (degrees == null || !Number.isFinite(degrees)) return "-";
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.floor(((normalized + 11.25) % 360) / 22.5);
  const sector = HEADING_16[index] ?? "n/a";
  return `${sector} (${formatNumber(normalized, 0)}°)`;
}

function heatCellStyle(metric: ComparisonMetricDef, value: number | null, bounds: { min: number; max: number } | null): string {
  if (value == null || bounds == null) return "";
  const spread = Math.max(1e-9, bounds.max - bounds.min);
  const intensity = Math.max(0, Math.min(1, (value - bounds.min) / spread));
  const lightness = 97 - intensity * 34;
  const borderLightness = 86 - intensity * 20;
  return `background: hsl(${metric.hue} 90% ${lightness}%); border-color: hsl(${metric.hue} 70% ${borderLightness}%);`;
}

function firstAvailableSelection(
  keys: string[],
  years: number[],
  bucketMap: Map<string, YearBucket>,
): { year: number; key: string } | null {
  for (const key of keys) {
    for (const year of years) {
      if (bucketMap.has(`${year}|${key}`)) {
        return { year, key };
      }
    }
  }
  return null;
}

export function renderComparison(
  container: HTMLDivElement,
  selectedPayload: TimeframeAnalyticsResponse,
  loadedYears: number[] = [],
): void {
  container.innerHTML = "";

  const groupBy = selectedPayload.groupBy === "season" ? "season" : "month";
  const expectedKeys = groupBy === "season" ? SEASON_KEYS : MONTH_KEYS;
  const parsedBuckets: YearBucket[] = [];
  const yearsSet = new Set<number>(loadedYears);

  for (const bucket of selectedPayload.buckets) {
    const parsed = parseYearAndKey(bucket, groupBy);
    if (parsed.year == null) continue;
    yearsSet.add(parsed.year);
    parsedBuckets.push({ ...bucket, __year: parsed.year, __key: parsed.key });
  }

  const years = Array.from(yearsSet)
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  if (!years.length) {
    container.textContent = "No loaded years available for comparison.";
    return;
  }

  const yearAndKeyToBucket = new Map<string, YearBucket>();
  const bucketsByYear = new Map<number, YearBucket[]>();
  for (const bucket of parsedBuckets) {
    yearAndKeyToBucket.set(`${bucket.__year}|${bucket.__key}`, bucket);
    const existing = bucketsByYear.get(bucket.__year) ?? [];
    existing.push(bucket);
    bucketsByYear.set(bucket.__year, existing);
  }
  const yearSummaries = buildYearSummaries(years, expectedKeys, bucketsByYear);
  const overallSummary = summarize(selectedPayload);
  const decision = decisionFromYearSummaries(yearSummaries, overallSummary, groupBy);

  const yearSummaryRows = yearSummaries.map((summary) => {
    return `
      <tr>
        <td>${summary.year}</td>
        <td>${summary.bucketCount}/${expectedKeys.length}</td>
        <td>${metricValue(summary.avgSpeed)}</td>
        <td>${metricValue(summary.p90Speed)}</td>
        <td>${metricValue(summary.hoursAbove5mps)}</td>
        <td>${metricValue(summary.generationMwh, 3)}</td>
      </tr>
    `;
  }).join("");

  const bestAvgYear = yearSummaries
    .filter((summary): summary is YearSummary & { avgSpeed: number } => summary.avgSpeed != null && Number.isFinite(summary.avgSpeed))
    .sort((left, right) => right.avgSpeed - left.avgSpeed)[0];
  const bestGenerationYear = yearSummaries
    .filter((summary): summary is YearSummary & { generationMwh: number } => summary.generationMwh != null && Number.isFinite(summary.generationMwh))
    .sort((left, right) => right.generationMwh - left.generationMwh)[0];
  const avgCoverage = avgValue(yearSummaries.map((summary) => summary.coverageRatio));
  const loadedPeriods = parsedBuckets.length;

  const wrap = document.createElement("article");
  wrap.className = "comparison-summary";
  wrap.innerHTML = `
    <h4>${groupBy === "month" ? "Monthly" : "Seasonal"} comparison across loaded years</h4>
    <p class="muted">
      Loaded years: ${years.join(", ")}.
      Missing year/${groupBy} combinations are shown as "-".
    </p>
    <section class="comparison-decision">
      <div class="comparison-decision-head">
        <span class="${decision.badgeClass}">${decision.badgeText}</span>
        <p class="muted">Decision comments are derived from loaded-year ${periodWord(groupBy, 2)} and current simulation settings.</p>
      </div>
      <div class="comparison-decision-grid">
        <article class="comparison-decision-tile">
          <h5>Wind Resource Signal</h5>
          <p>${decision.windComment}</p>
        </article>
        <article class="comparison-decision-tile">
          <h5>Data Quality & Coverage</h5>
          <p>${decision.qualityComment}</p>
        </article>
        <article class="comparison-decision-tile">
          <h5>Operational Implications</h5>
          <p>${decision.riskComment}</p>
        </article>
      </div>
    </section>
    <section class="comparison-kpi-grid">
      <article class="comparison-kpi">
        <h5>Best wind year</h5>
        <p>${bestAvgYear ? `${bestAvgYear.year} · ${metricValue(bestAvgYear.avgSpeed)} m/s` : "-"}</p>
      </article>
      <article class="comparison-kpi">
        <h5>Best generation year</h5>
        <p>${bestGenerationYear ? `${bestGenerationYear.year} · ${metricValue(bestGenerationYear.generationMwh, 3)} MWh` : "-"}</p>
      </article>
      <article class="comparison-kpi">
        <h5>Average year coverage</h5>
        <p>${avgCoverage == null ? "-" : `${(avgCoverage * 100).toFixed(1)}%`}</p>
      </article>
      <article class="comparison-kpi">
        <h5>Loaded ${groupBy === "month" ? "months" : "seasons"}</h5>
        <p>${formatNumber(loadedPeriods, 0)}</p>
      </article>
    </section>
    <div class="table-wrap comparison-year-summary-wrap">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Coverage (${groupBy === "month" ? "months" : "seasons"})</th>
            <th>Avg Speed</th>
            <th>P90 Speed</th>
            <th>Hours ≥ 5</th>
            <th>Generation (MWh)</th>
          </tr>
        </thead>
        <tbody>${yearSummaryRows}</tbody>
      </table>
    </div>
    <section class="comparison-heatmap-shell">
      <div class="comparison-heatmap-head">
        <h5>Period vs year heatmap</h5>
        <p class="muted">Switch metric tabs to see trend intensity. Click a cell for period detail.</p>
      </div>
      <div class="comparison-tab-list" role="tablist" aria-label="Comparison metric tabs">
        ${COMPARISON_METRICS.map((metric, index) => (
          `<button class="comparison-tab${index === 0 ? " active" : ""}" type="button" role="tab" aria-selected="${index === 0 ? "true" : "false"}" data-metric="${metric.key}">${metric.shortLabel}</button>`
        )).join("")}
      </div>
      <div class="comparison-heatmap-wrap" data-role="heatmap-grid"></div>
      <article class="comparison-cell-detail" data-role="cell-detail">
        <h5>Selected period detail</h5>
        <p class="muted">Click a heatmap cell to inspect that period and compare it across years.</p>
      </article>
    </section>
    <details class="comparison-raw-details">
      <summary>Raw comparison table</summary>
      <p class="muted comparison-raw-note">Full matrix for audit/export checks.</p>
      <div class="table-wrap table-group">
        <table>
          <thead>
            <tr>
              <th>${groupBy === "month" ? "Month" : "Season"}</th>
              ${years.map((year) => `<th colspan="4">${year}</th>`).join("")}
            </tr>
            <tr>
              <th>Metric</th>
              ${years.map(() => "<th>Avg</th><th>P90</th><th>Hrs ≥ 5</th><th>Gen (MWh)</th>").join("")}
            </tr>
          </thead>
          <tbody>
            ${expectedKeys.map((bucketKey) => {
              const cells = years.map((year) => {
                const bucket = yearAndKeyToBucket.get(`${year}|${bucketKey}`);
                if (!bucket) {
                  return `
                    <td class="comparison-missing">-</td>
                    <td class="comparison-missing">-</td>
                    <td class="comparison-missing">-</td>
                    <td class="comparison-missing">-</td>
                  `;
                }
                return `
                  <td>${metricValue(bucket.avgSpeed)}</td>
                  <td>${metricValue(bucket.p90Speed)}</td>
                  <td>${metricValue(bucket.hoursAbove5mps)}</td>
                  <td>${metricValue(bucket.estimatedGenerationMwh, 3)}</td>
                `;
              }).join("");
              return `
                <tr>
                  <td>${displayBucketKey(bucketKey, groupBy)}</td>
                  ${cells}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
  container.appendChild(wrap);

  const heatmapGridEl = wrap.querySelector<HTMLDivElement>("[data-role='heatmap-grid']");
  const cellDetailEl = wrap.querySelector<HTMLDivElement>("[data-role='cell-detail']");
  const tabButtons = Array.from(wrap.querySelectorAll<HTMLButtonElement>(".comparison-tab"));
  if (!heatmapGridEl || !cellDetailEl || !tabButtons.length) return;

  let activeMetric: ComparisonMetricDef = COMPARISON_METRICS[0];
  const initialSelection = firstAvailableSelection(expectedKeys, years, yearAndKeyToBucket);
  let selectedYear = initialSelection?.year ?? years[0];
  let selectedKey = initialSelection?.key ?? expectedKeys[0];

  const renderDetail = (): void => {
    const selectedBucket = yearAndKeyToBucket.get(`${selectedYear}|${selectedKey}`);
    if (!selectedBucket) {
      cellDetailEl.innerHTML = `
        <h5>Selected period detail</h5>
        <p class="muted">${displayBucketKey(selectedKey, groupBy)} ${selectedYear} is missing in loaded history.</p>
      `;
      return;
    }

    const peers = years.map((year) => ({
      year,
      bucket: yearAndKeyToBucket.get(`${year}|${selectedKey}`),
    }));
    const peerMetricValues = peers.map((peer) => metricValueForBucket(peer.bucket, activeMetric.key));
    const peerValidValues = peerMetricValues.filter((value): value is number => value != null && Number.isFinite(value));
    const peerBounds = metricBounds(peerMetricValues);
    const peerMax = peerValidValues.length ? Math.max(...peerValidValues) : null;
    const peerMin = peerValidValues.length ? Math.min(...peerValidValues) : null;
    const selectedMetricValue = metricValueForBucket(selectedBucket, activeMetric.key);

    const peerRows = peers.map((peer) => {
      const value = metricValueForBucket(peer.bucket, activeMetric.key);
      if (value == null || peerBounds == null || peerMax == null || peerMax <= 0) {
        return `
          <li class="comparison-peer-row">
            <span class="comparison-peer-year">${peer.year}</span>
            <span class="comparison-peer-value">-</span>
          </li>
        `;
      }
      const ratioToMax = Math.max(0, Math.min(1, value / peerMax));
      const width = value > 0 ? Math.max(12, ratioToMax * 100) : 0;
      const hue = 24 + ratioToMax * 112;
      const rowClass = peer.year === selectedYear ? "comparison-peer-row active" : "comparison-peer-row";
      return `
        <li class="${rowClass}">
          <span class="comparison-peer-year">${peer.year}</span>
          <span class="comparison-peer-track">
            <span class="comparison-peer-fill" style="width:${Math.max(0, Math.min(100, width)).toFixed(1)}%; background:linear-gradient(90deg, hsl(${hue - 10} 84% 64%), hsl(${hue} 86% 48%));"></span>
          </span>
          <span class="comparison-peer-value">${metricValue(value, activeMetric.digits)}</span>
        </li>
      `;
    }).join("");

    cellDetailEl.innerHTML = `
      <h5>${displayBucketKey(selectedKey, groupBy)} ${selectedYear}</h5>
      <p class="muted">${activeMetric.fullLabel}: <strong>${selectedMetricValue == null ? "-" : `${metricValue(selectedMetricValue, activeMetric.digits)} ${activeMetric.unit}`}</strong></p>
      <div class="comparison-cell-metrics">
        <span>Avg: ${metricValue(selectedBucket.avgSpeed)} m/s</span>
        <span>P90: ${metricValue(selectedBucket.p90Speed)} m/s</span>
        <span>Hours ≥ 5: ${metricValue(selectedBucket.hoursAbove5mps)} h</span>
        <span>Gen: ${metricValue(selectedBucket.estimatedGenerationMwh, 3)} MWh</span>
        <span>Temp avg: ${metricValue(selectedBucket.avgTemperature)} ºC</span>
        <span>Pressure avg: ${metricValue(selectedBucket.avgPressure)} hPa</span>
        <span>Direction: ${headingLabel(selectedBucket.dominantDirection)}</span>
      </div>
      <div class="comparison-peer-section">
        <p class="muted">Same ${groupBy} across loaded years (${activeMetric.shortLabel})</p>
        ${
          peerBounds == null || peerMax == null || peerMin == null
            ? ""
            : `<p class="comparison-peer-meta">Scale: relative to max ${metricValue(peerMax, activeMetric.digits)} ${activeMetric.unit}. Min loaded year is ${metricValue(peerMin, activeMetric.digits)} ${activeMetric.unit}.</p>`
        }
        <ul class="comparison-peer-bars">${peerRows}</ul>
      </div>
    `;
  };

  const renderHeatmap = (): void => {
    const values = expectedKeys.flatMap((key) =>
      years.map((year) => metricValueForBucket(yearAndKeyToBucket.get(`${year}|${key}`), activeMetric.key))
    );
    const bounds = metricBounds(values);
    heatmapGridEl.innerHTML = `
      <table class="comparison-heatmap-table">
        <thead>
          <tr>
            <th>${groupBy === "month" ? "Month" : "Season"}</th>
            ${years.map((year) => `<th>${year}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${expectedKeys.map((bucketKey) => {
            const cells = years.map((year) => {
              const bucket = yearAndKeyToBucket.get(`${year}|${bucketKey}`);
              const value = metricValueForBucket(bucket, activeMetric.key);
              if (!bucket || value == null) {
                return `<td><span class="heat-cell-missing">-</span></td>`;
              }
              const selectedClass = selectedYear === year && selectedKey === bucketKey ? " heat-cell-selected" : "";
              return `
                <td>
                  <button
                    type="button"
                    class="heat-cell-btn${selectedClass}"
                    data-year="${year}"
                    data-key="${bucketKey}"
                    title="${displayBucketKey(bucketKey, groupBy)} ${year}: ${metricValue(value, activeMetric.digits)} ${activeMetric.unit}"
                    style="${heatCellStyle(activeMetric, value, bounds)}"
                  >
                    ${metricValue(value, activeMetric.digits)}
                  </button>
                </td>
              `;
            }).join("");
            return `
              <tr>
                <th>${displayBucketKey(bucketKey, groupBy)}</th>
                ${cells}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
    renderDetail();
  };

  for (const button of tabButtons) {
    button.addEventListener("click", () => {
      const key = button.dataset.metric as ComparisonMetricKey | undefined;
      const nextMetric = COMPARISON_METRICS.find((metric) => metric.key === key);
      if (!nextMetric) return;
      activeMetric = nextMetric;
      for (const tab of tabButtons) {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      }
      renderHeatmap();
    });
  }

  heatmapGridEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>("button.heat-cell-btn");
    if (!button) return;
    const year = Number.parseInt(button.dataset.year ?? "", 10);
    const key = button.dataset.key;
    if (!Number.isFinite(year) || !key) return;
    selectedYear = year;
    selectedKey = key;
    renderHeatmap();
  });

  renderHeatmap();
}
