import { shiftDateByYears } from "./date_ranges.js";
export function selectedStationLatestDate(bootstrapState, stationId) {
    if (!bootstrapState)
        return null;
    const latestIso = bootstrapState.latestObservationByStation[stationId];
    if (!latestIso)
        return null;
    const date = new Date(latestIso);
    return Number.isNaN(date.getTime()) ? null : date;
}
export function computeBaselineStart(bootstrapState, stationId, years, toDateTimeLocalInZone, inputTimeZone) {
    if (!bootstrapState)
        return "";
    const latest = selectedStationLatestDate(bootstrapState, stationId);
    if (!latest)
        return "";
    const start = shiftDateByYears(latest, years);
    return toDateTimeLocalInZone(start, inputTimeZone);
}
