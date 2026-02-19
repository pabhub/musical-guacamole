import { AnalysisBootstrapResponse } from "../../core/types.js";
import { shiftDateByYears } from "./date_ranges.js";

export function selectedStationLatestDate(
  bootstrapState: AnalysisBootstrapResponse | null,
  stationId: string,
): Date | null {
  if (!bootstrapState) return null;
  const latestIso = bootstrapState.latestObservationByStation[stationId];
  if (!latestIso) return null;
  const date = new Date(latestIso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeBaselineStart(
  bootstrapState: AnalysisBootstrapResponse | null,
  stationId: string,
  years: number,
  toDateTimeLocalInZone: (date: Date, timeZone: string) => string,
  inputTimeZone: string,
): string {
  if (!bootstrapState) return "";
  const latest = selectedStationLatestDate(bootstrapState, stationId);
  if (!latest) return "";
  const start = shiftDateByYears(latest, years);
  return toDateTimeLocalInZone(start, inputTimeZone);
}
