export function createDashboardState() {
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
