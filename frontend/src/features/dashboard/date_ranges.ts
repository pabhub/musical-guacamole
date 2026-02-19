export type SeasonCode = "DJF" | "MAM" | "JJA" | "SON";

export function parseIsoDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function shiftDateByYears(date: Date, years: number): Date {
  const shifted = new Date(date.getTime());
  shifted.setFullYear(shifted.getFullYear() - years);
  return shifted;
}

export function seasonRange(year: number, season: SeasonCode): { start: Date; end: Date } {
  if (season === "DJF") {
    return { start: new Date(year, 11, 1, 0, 0, 0), end: new Date(year + 1, 2, 1, 0, 0, 0) };
  }
  if (season === "MAM") return { start: new Date(year, 2, 1, 0, 0, 0), end: new Date(year, 5, 1, 0, 0, 0) };
  if (season === "JJA") return { start: new Date(year, 5, 1, 0, 0, 0), end: new Date(year, 8, 1, 0, 0, 0) };
  return { start: new Date(year, 8, 1, 0, 0, 0), end: new Date(year, 11, 1, 0, 0, 0) };
}

export function yearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1, 0, 0, 0), end: new Date(year + 1, 0, 1, 0, 0, 0) };
}

export function ensureRangeOrder(start: string, end: string): { start: string; end: string } | null {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  if (startDate >= endDate) return null;
  return { start, end };
}

export function yearInConfiguredZone(value: string, timeZone: string): number | null {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  try {
    const yearText = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric" }).format(parsed);
    const year = Number.parseInt(yearText, 10);
    return Number.isFinite(year) ? year : null;
  } catch {
    return parsed.getUTCFullYear();
  }
}

export function compareRangeForYear(
  base: { start: string; end: string },
  targetYear: number,
  toDateTimeLocalInZone: (date: Date, timeZone: string) => string,
  timeZone: string,
): { start: string; end: string } | null {
  const baseStart = parseIsoDate(base.start);
  const baseEnd = parseIsoDate(base.end);
  if (!baseStart || !baseEnd) return null;
  const durationMs = baseEnd.getTime() - baseStart.getTime();
  if (durationMs <= 0) return null;

  const compareStartDate = new Date(baseStart.getTime());
  compareStartDate.setFullYear(targetYear);
  const compareEndDate = new Date(compareStartDate.getTime() + durationMs);
  if (compareStartDate >= compareEndDate) return null;

  return {
    start: toDateTimeLocalInZone(compareStartDate, timeZone),
    end: toDateTimeLocalInZone(compareEndDate, timeZone),
  };
}
