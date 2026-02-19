export function toggleSection(element, visible) {
    element.classList.toggle("hidden", !visible);
}
export function setPlaybackSectionVisible(mapPlaybackShellEl, playbackProgressWrap, visible) {
    toggleSection(mapPlaybackShellEl, visible);
    if (!visible)
        playbackProgressWrap.classList.remove("show");
}
export function setTimeframeSectionVisible(timeframeCardEl, visible) {
    toggleSection(timeframeCardEl, visible);
}
export function setSnapshotSectionsVisible(decisionCardEl, chartsSectionEl, rawCardEl, mapPlaybackShellEl, playbackProgressWrap, timeframeCardEl, visible) {
    toggleSection(decisionCardEl, visible);
    toggleSection(chartsSectionEl, visible);
    toggleSection(rawCardEl, visible);
    if (!visible) {
        setPlaybackSectionVisible(mapPlaybackShellEl, playbackProgressWrap, false);
        setTimeframeSectionVisible(timeframeCardEl, false);
    }
}
export function setResultsSkeletonVisible(resultsSkeletonEl, visible) {
    toggleSection(resultsSkeletonEl, visible);
}
export function updateChartVisibility(rows, hasDirectionData, windChartCardEl, weatherChartCardEl, roseChartCardEl, chartsSectionEl, decisionCardEl) {
    const hasSpeedData = rows.some((row) => row.speed != null);
    const hasWeatherData = rows.some((row) => row.temperature != null || row.pressure != null);
    toggleSection(windChartCardEl, hasSpeedData);
    toggleSection(weatherChartCardEl, hasWeatherData);
    toggleSection(roseChartCardEl, hasDirectionData);
    const hasAnyChart = hasSpeedData || hasWeatherData || hasDirectionData;
    if (decisionCardEl.classList.contains("hidden")) {
        toggleSection(chartsSectionEl, false);
    }
    else {
        toggleSection(chartsSectionEl, hasAnyChart);
    }
}
export function setError(errorBannerEl, message) {
    if (!message) {
        errorBannerEl.textContent = "";
        errorBannerEl.classList.add("hidden");
        return;
    }
    errorBannerEl.textContent = message;
    errorBannerEl.classList.remove("hidden");
}
export function setTablesCollapsed(tablesPanelEl, toggleTablesButton, collapsed) {
    tablesPanelEl.classList.toggle("collapsed", collapsed);
    toggleTablesButton.textContent = collapsed ? "Show tables" : "Hide tables";
}
export function setLoading(stationSelect, historyYearsSelect, loading) {
    stationSelect.disabled = loading;
    historyYearsSelect.disabled = loading;
}
