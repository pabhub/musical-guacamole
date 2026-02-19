export function parseIsoDate(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
export function shiftDateByYears(date, years) {
    const shifted = new Date(date.getTime());
    shifted.setFullYear(shifted.getFullYear() - years);
    return shifted;
}
export function seasonRange(year, season) {
    if (season === "DJF") {
        return { start: new Date(year, 11, 1, 0, 0, 0), end: new Date(year + 1, 2, 1, 0, 0, 0) };
    }
    if (season === "MAM")
        return { start: new Date(year, 2, 1, 0, 0, 0), end: new Date(year, 5, 1, 0, 0, 0) };
    if (season === "JJA")
        return { start: new Date(year, 5, 1, 0, 0, 0), end: new Date(year, 8, 1, 0, 0, 0) };
    return { start: new Date(year, 8, 1, 0, 0, 0), end: new Date(year, 11, 1, 0, 0, 0) };
}
export function yearRange(year) {
    return { start: new Date(year, 0, 1, 0, 0, 0), end: new Date(year + 1, 0, 1, 0, 0, 0) };
}
export function ensureRangeOrder(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
        return null;
    if (startDate >= endDate)
        return null;
    return { start, end };
}
export function yearInConfiguredZone(value, timeZone) {
    const parsed = parseIsoDate(value);
    if (!parsed)
        return null;
    try {
        const yearText = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric" }).format(parsed);
        const year = Number.parseInt(yearText, 10);
        return Number.isFinite(year) ? year : null;
    }
    catch {
        return parsed.getUTCFullYear();
    }
}
export function compareRangeForYear(base, targetYear, toDateTimeLocalInZone, timeZone) {
    const baseStart = parseIsoDate(base.start);
    const baseEnd = parseIsoDate(base.end);
    if (!baseStart || !baseEnd)
        return null;
    const durationMs = baseEnd.getTime() - baseStart.getTime();
    if (durationMs <= 0)
        return null;
    const compareStartDate = new Date(baseStart.getTime());
    compareStartDate.setFullYear(targetYear);
    const compareEndDate = new Date(compareStartDate.getTime() + durationMs);
    if (compareStartDate >= compareEndDate)
        return null;
    return {
        start: toDateTimeLocalInZone(compareStartDate, timeZone),
        end: toDateTimeLocalInZone(compareEndDate, timeZone),
    };
}
