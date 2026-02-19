import { browserTimeZone, formatNumber, isValidTimeZone } from "../../core/api.js";
import { TimeframeAnalyticsResponse } from "../../core/types.js";

export type SummaryStats = {
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

export type YearSummary = {
  year: number;
  bucketCount: number;
  coverageRatio: number;
  avgSpeed: number | null;
  p90Speed: number | null;
  hoursAbove5mps: number | null;
  generationMwh: number | null;
};

export type YearBucket = TimeframeAnalyticsResponse["buckets"][number] & { __year: number; __key: string };

const inputTimezoneStorageKey = "aemet.input_timezone";

function resolvedTimeZone(fallback = "UTC"): string {
  const stored = localStorage.getItem(inputTimezoneStorageKey)?.trim();
  if (stored && isValidTimeZone(stored)) return stored;
  const browser = browserTimeZone();
  return isValidTimeZone(browser) ? browser : fallback;
}

function yearAndMonthInConfiguredZone(value: Date): { year: number; month: number } {
  const timezone = resolvedTimeZone();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(value);
    const year = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "", 10);
    const month = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "", 10);
    if (Number.isFinite(year) && Number.isFinite(month)) {
      return { year, month };
    }
  } catch {
    // fallback below
  }
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
  };
}

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

export function avgValue(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarize(payload: TimeframeAnalyticsResponse): SummaryStats {
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

export function metricValue(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return formatNumber(value, digits);
}

export function periodWord(groupBy: "month" | "season", count: number): string {
  if (groupBy === "month") return count === 1 ? "month" : "months";
  return count === 1 ? "season" : "seasons";
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

export function displayBucketKey(key: string, groupBy: string): string {
  if (groupBy === "month") return MONTH_LABELS[key] ?? key;
  return key;
}

export const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
export const SEASON_KEYS = ["DJF", "MAM", "JJA", "SON"];

export function parseYearAndKey(
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
      const mapped = yearAndMonthInConfiguredZone(parsedStart);
      return {
        year: mapped.year,
        key: String(mapped.month).padStart(2, "0"),
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

export function buildYearSummaries(
  years: number[],
  expectedKeys: string[],
  bucketsByYear: Map<number, YearBucket[]>,
): YearSummary[] {
  return years.map((year) => {
    const buckets = bucketsByYear.get(year) ?? [];
    const summary = summarizeYearBuckets(buckets);
    return {
      year,
      bucketCount: buckets.length,
      coverageRatio: expectedKeys.length > 0 ? buckets.length / expectedKeys.length : 0,
      avgSpeed: summary.avgSpeed,
      p90Speed: summary.p90Speed,
      hoursAbove5mps: summary.hoursAbove5mps,
      generationMwh: summary.generationMwh,
    };
  });
}

function range(values: number[]): { min: number; max: number } | null {
  if (!values.length) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function decisionFromYearSummaries(
  yearSummaries: YearSummary[],
  overallSummary: SummaryStats,
  groupBy: "month" | "season",
): {
  badgeClass: string;
  badgeText: string;
  windComment: string;
  qualityComment: string;
  riskComment: string;
} {
  const validAvgSpeeds = yearSummaries
    .map((year) => year.avgSpeed)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const validP90Speeds = yearSummaries
    .map((year) => year.p90Speed)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const coverageStrongYears = yearSummaries.filter((year) => year.coverageRatio >= 0.75).length;
  const avgCoverage = avgValue(yearSummaries.map((year) => year.coverageRatio)) ?? 0;

  const meanAvgSpeed = avgValue(validAvgSpeeds);
  const meanP90Speed = avgValue(validP90Speeds);
  const speedRange = range(validAvgSpeeds);
  const strongestYear = yearSummaries
    .filter((year): year is YearSummary & { avgSpeed: number } => year.avgSpeed != null && Number.isFinite(year.avgSpeed))
    .sort((a, b) => b.avgSpeed - a.avgSpeed)[0];
  const weakestYear = yearSummaries
    .filter((year): year is YearSummary & { avgSpeed: number } => year.avgSpeed != null && Number.isFinite(year.avgSpeed))
    .sort((a, b) => a.avgSpeed - b.avgSpeed)[0];

  let badgeClass = "decision-badge moderate";
  let badgeText = "Moderate signal";
  if (meanAvgSpeed != null && meanP90Speed != null) {
    if (meanAvgSpeed >= 7.0 && meanP90Speed >= 10.0) {
      badgeClass = "decision-badge strong";
      badgeText = "Strong signal";
    } else if (meanAvgSpeed < 5.0 || meanP90Speed < 8.0) {
      badgeClass = "decision-badge low";
      badgeText = "Low signal";
    }
  }

  const windCommentParts: string[] = [];
  windCommentParts.push(
    `Loaded-year mean wind is ${formatNumber(meanAvgSpeed)} m/s with mean P90 ${formatNumber(meanP90Speed)} m/s.`,
  );
  if (strongestYear && weakestYear && strongestYear.year !== weakestYear.year) {
    windCommentParts.push(
      `Best year ${strongestYear.year}: ${formatNumber(strongestYear.avgSpeed)} m/s vs weakest ${weakestYear.year}: ${formatNumber(weakestYear.avgSpeed)} m/s.`,
    );
  }
  if (speedRange != null) {
    const spread = speedRange.max - speedRange.min;
    if (spread >= 1.5) {
      windCommentParts.push("Interannual wind spread is high, so yield assumptions should include conservative P50/P90 cases.");
    } else {
      windCommentParts.push("Interannual wind spread is moderate, indicating a relatively stable multi-year signal.");
    }
  }

  const qualityCommentParts: string[] = [];
  qualityCommentParts.push(
    `Coverage across loaded years averages ${(avgCoverage * 100).toFixed(1)}% of expected ${periodWord(groupBy, 2)}.`,
  );
  qualityCommentParts.push(
    `Years with strong ${periodWord(groupBy, 2)} coverage: ${coverageStrongYears}/${yearSummaries.length}.`,
  );
  qualityCommentParts.push(`Missing year/${groupBy} cells are displayed as "-".`);

  const generationYears = yearSummaries.filter((year) => year.generationMwh != null && Number.isFinite(year.generationMwh)).length;
  const riskCommentParts: string[] = [];
  riskCommentParts.push(
    `Observed speed envelope in loaded scope: ${formatNumber(overallSummary.minSpeed)} to ${formatNumber(overallSummary.maxSpeed)} m/s.`,
  );
  riskCommentParts.push(
    `Temperature range: ${formatNumber(overallSummary.minTemperature)} to ${formatNumber(overallSummary.maxTemperature)} ºC.`,
  );
  if (generationYears === 0) {
    riskCommentParts.push("Generation comparison requires simulation parameters in Config.");
  } else {
    riskCommentParts.push(`Generation is available for ${generationYears}/${yearSummaries.length} loaded years.`);
  }

  return {
    badgeClass,
    badgeText,
    windComment: windCommentParts.join(" "),
    qualityComment: qualityCommentParts.join(" "),
    riskComment: riskCommentParts.join(" "),
  };
}
