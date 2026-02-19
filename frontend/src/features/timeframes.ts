import { formatDateTime, formatNumber } from "../core/api.js";
import { TimeframeAnalyticsResponse } from "../core/types.js";

type SummaryStats = {
  bucketCount: number;
  dataPoints: number;
  minSpeed: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  p90Speed: number | null;
  hoursAbove3mps: number | null;
  hoursAbove5mps: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  avgPressure: number | null;
  estimatedGenerationMwh: number | null;
};

function weightedAverage(values: Array<number | null>, weights: number[]): number | null {
  let sum = 0;
  let weightSum = 0;
  for (let idx = 0; idx < values.length; idx += 1) {
    const value = values[idx];
    const weight = weights[idx];
    if (value == null || !Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) continue;
    sum += value * weight;
    weightSum += weight;
  }
  if (weightSum <= 0) return null;
  return sum / weightSum;
}

function minValue(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!filtered.length) return null;
  return Math.min(...filtered);
}

function maxValue(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!filtered.length) return null;
  return Math.max(...filtered);
}

function sumValue(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0);
}

function summarize(payload: TimeframeAnalyticsResponse): SummaryStats {
  const weights = payload.buckets.map((bucket) => Math.max(0, bucket.dataPoints));
  const totalRows = weights.reduce((sum, value) => sum + value, 0);
  return {
    bucketCount: payload.buckets.length,
    dataPoints: totalRows,
    minSpeed: minValue(payload.buckets.map((bucket) => bucket.minSpeed)),
    avgSpeed: weightedAverage(payload.buckets.map((bucket) => bucket.avgSpeed), weights),
    maxSpeed: maxValue(payload.buckets.map((bucket) => bucket.maxSpeed)),
    p90Speed: weightedAverage(payload.buckets.map((bucket) => bucket.p90Speed), weights),
    hoursAbove3mps: sumValue(payload.buckets.map((bucket) => bucket.hoursAbove3mps)),
    hoursAbove5mps: sumValue(payload.buckets.map((bucket) => bucket.hoursAbove5mps)),
    minTemperature: minValue(payload.buckets.map((bucket) => bucket.minTemperature)),
    maxTemperature: maxValue(payload.buckets.map((bucket) => bucket.maxTemperature)),
    avgPressure: weightedAverage(payload.buckets.map((bucket) => bucket.avgPressure), weights),
    estimatedGenerationMwh: sumValue(payload.buckets.map((bucket) => bucket.estimatedGenerationMwh)),
  };
}

function metricValue(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(digits);
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

function displayBucketKey(key: string, groupBy: string): string {
  if (groupBy === "month") return MONTH_LABELS[key] ?? key;
  return key;
}

const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const SEASON_KEYS = ["DJF", "MAM", "JJA", "SON"];

type YearBucket = TimeframeAnalyticsResponse["buckets"][number] & { __year: number; __key: string };

function parseYearAndKey(
  bucket: TimeframeAnalyticsResponse["buckets"][number],
  groupBy: "month" | "season",
): { year: number | null; key: string } {
  if (groupBy === "month") {
    const labelMatch = bucket.label.match(/^(\d{4})-(\d{2})$/);
    if (labelMatch) {
      return {
        year: Number.parseInt(labelMatch[1], 10),
        key: labelMatch[2],
      };
    }
    const parsedStart = new Date(bucket.start);
    if (!Number.isNaN(parsedStart.getTime())) {
      return {
        year: parsedStart.getUTCFullYear(),
        key: String(parsedStart.getUTCMonth() + 1).padStart(2, "0"),
      };
    }
    return { year: null, key: bucket.label };
  }

  const seasonMatch = bucket.label.match(/^(\d{4})-(DJF|MAM|JJA|SON)$/);
  if (seasonMatch) {
    return {
      year: Number.parseInt(seasonMatch[1], 10),
      key: seasonMatch[2],
    };
  }
  const fallbackSeason = bucket.label.match(/(DJF|MAM|JJA|SON)$/);
  return { year: null, key: fallbackSeason?.[1] ?? bucket.label };
}

function summarizeYearBuckets(buckets: YearBucket[]): {
  avgSpeed: number | null;
  p90Speed: number | null;
  hoursAbove5mps: number | null;
  generationMwh: number | null;
} {
  const weights = buckets.map((bucket) => Math.max(0, bucket.dataPoints));
  return {
    avgSpeed: weightedAverage(buckets.map((bucket) => bucket.avgSpeed), weights),
    p90Speed: weightedAverage(buckets.map((bucket) => bucket.p90Speed), weights),
    hoursAbove5mps: sumValue(buckets.map((bucket) => bucket.hoursAbove5mps)),
    generationMwh: sumValue(buckets.map((bucket) => bucket.estimatedGenerationMwh)),
  };
}

export function renderTimeframeCards(
  container: HTMLDivElement,
  payload: TimeframeAnalyticsResponse,
): void {
  container.innerHTML = "";
  const summary = summarize(payload);
  const dominant = payload.windRose.dominantSector ?? "n/a";
  const concentration = payload.windRose.directionalConcentration == null
    ? "n/a"
    : `${(payload.windRose.directionalConcentration * 100).toFixed(1)}%`;

  const cards = [
    `
      <h4>Selected Scope</h4>
      <p>${formatDateTime(payload.requestedStart)} → ${formatDateTime(payload.requestedEnd)}</p>
      <p>Grouping: ${payload.groupBy} · Buckets: ${summary.bucketCount} · Rows: ${summary.dataPoints}</p>
      <p>Dominant direction: ${dominant} · Concentration: ${concentration}</p>
    `,
    `
      <h4>Wind Performance</h4>
      <p>Speed min/avg/max: ${formatNumber(summary.minSpeed)} / ${formatNumber(summary.avgSpeed)} / ${formatNumber(summary.maxSpeed)} m/s</p>
      <p>P90 speed: ${formatNumber(summary.p90Speed)} m/s</p>
      <p>Hours ≥ 3 m/s: ${formatNumber(summary.hoursAbove3mps)} · Hours ≥ 5 m/s: ${formatNumber(summary.hoursAbove5mps)}</p>
    `,
    `
      <h4>Environment + Yield</h4>
      <p>Temp range: ${formatNumber(summary.minTemperature)} to ${formatNumber(summary.maxTemperature)} ºC</p>
      <p>Avg pressure: ${formatNumber(summary.avgPressure)} hPa</p>
      <p>Estimated generation: ${formatNumber(summary.estimatedGenerationMwh)} MWh</p>
    `,
  ];

  for (const html of cards) {
    const card = document.createElement("article");
    card.className = "timeframe-card";
    card.innerHTML = html;
    container.appendChild(card);
  }
}

export function renderTimeframeTable(
  tbody: HTMLTableSectionElement,
  payload: TimeframeAnalyticsResponse,
): void {
  tbody.innerHTML = "";
  for (const bucket of payload.buckets) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${bucket.label}</td>
      <td>${formatDateTime(bucket.start)}</td>
      <td>${formatDateTime(bucket.end)}</td>
      <td>${bucket.dataPoints}</td>
      <td>${formatNumber(bucket.minSpeed)}</td>
      <td>${formatNumber(bucket.avgSpeed)}</td>
      <td>${formatNumber(bucket.maxSpeed)}</td>
      <td>${formatNumber(bucket.p90Speed)}</td>
      <td>${formatNumber(bucket.hoursAbove3mps)}</td>
      <td>${formatNumber(bucket.hoursAbove5mps)}</td>
      <td>${formatNumber(bucket.speedVariability)}</td>
      <td>${formatNumber(bucket.dominantDirection)}</td>
      <td>${formatNumber(bucket.avgTemperature)}</td>
      <td>${formatNumber(bucket.avgPressure)}</td>
      <td>${formatNumber(bucket.estimatedGenerationMwh)}</td>
    `;
    tbody.appendChild(row);
  }
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

  const yearSummaryRows = years.map((year) => {
    const buckets = bucketsByYear.get(year) ?? [];
    const summary = summarizeYearBuckets(buckets);
    return `
      <tr>
        <td>${year}</td>
        <td>${buckets.length}/${expectedKeys.length}</td>
        <td>${metricValue(summary.avgSpeed)}</td>
        <td>${metricValue(summary.p90Speed)}</td>
        <td>${metricValue(summary.hoursAbove5mps)}</td>
        <td>${metricValue(summary.generationMwh, 3)}</td>
      </tr>
    `;
  }).join("");

  const bucketRows = expectedKeys.map((bucketKey) => {
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
  }).join("");

  const yearHeader = years
    .map((year) => `<th colspan="4">${year}</th>`)
    .join("");
  const metricHeader = years
    .map(() => "<th>Avg</th><th>P90</th><th>Hrs ≥ 5</th><th>Gen (MWh)</th>")
    .join("");

  const wrap = document.createElement("article");
  wrap.className = "comparison-summary";
  wrap.innerHTML = `
    <h4>${groupBy === "month" ? "Monthly" : "Seasonal"} comparison across loaded years</h4>
    <p class="muted">
      Loaded years: ${years.join(", ")}.
      Missing year/bucket combinations are shown as "-".
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Coverage</th>
            <th>Avg Speed</th>
            <th>P90 Speed</th>
            <th>Hours ≥ 5</th>
            <th>Generation (MWh)</th>
          </tr>
        </thead>
        <tbody>${yearSummaryRows}</tbody>
      </table>
    </div>
    <div class="table-wrap table-group">
      <table>
        <thead>
          <tr>
            <th>${groupBy === "month" ? "Month" : "Season"}</th>
            ${yearHeader}
          </tr>
          <tr>
            <th>Metric</th>
            ${metricHeader}
          </tr>
        </thead>
        <tbody>${bucketRows}</tbody>
      </table>
    </div>
  `;
  container.appendChild(wrap);
}
