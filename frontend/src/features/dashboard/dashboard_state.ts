import { AnalysisBootstrapResponse, FeasibilitySnapshotResponse } from "../../core/types.js";

export type DashboardState = {
  bootstrapState: AnalysisBootstrapResponse | null;
  snapshotState: FeasibilitySnapshotResponse | null;
  dashboardBootstrapped: boolean;
  baselineStartLocal: string;
  baselineEndLocal: string;
  lastLoadedStationId: string;
  lastLoadedHistoryYears: number;
};

export function createDashboardState(): DashboardState {
  return {
    bootstrapState: null,
    snapshotState: null,
    dashboardBootstrapped: false,
    baselineStartLocal: "",
    baselineEndLocal: "",
    lastLoadedStationId: "",
    lastLoadedHistoryYears: 0,
  };
}
