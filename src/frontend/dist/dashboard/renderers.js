import { formatDateTime, formatNumber } from "../api.js";
import { stationDisplayName } from "./stations.js";
export function renderMetrics(snapshot, metricsGridEl) {
    metricsGridEl.innerHTML = "";
    const selected = snapshot.stations.find((station) => station.stationId === snapshot.selectedStationId);
    if (!selected)
        return;
    const metrics = [
        { label: "Rows", value: String(selected.summary.dataPoints) },
        { label: "Coverage", value: selected.summary.coverageRatio == null ? "n/a" : `${(selected.summary.coverageRatio * 100).toFixed(1)}%` },
        { label: "Avg Speed", value: `${formatNumber(selected.summary.avgSpeed)} m/s` },
        { label: "P90 Speed (90th pct)", value: `${formatNumber(selected.summary.p90Speed)} m/s` },
        { label: "Hours ≥ 5 m/s", value: selected.summary.hoursAbove5mps == null ? "n/a" : selected.summary.hoursAbove5mps.toFixed(1) },
        { label: "WPD Proxy", value: selected.summary.estimatedWindPowerDensity == null ? "n/a" : `${selected.summary.estimatedWindPowerDensity.toFixed(1)} W/m²` },
        { label: "Temp Range", value: `${formatNumber(selected.summary.minTemperature)} to ${formatNumber(selected.summary.maxTemperature)} ºC` },
        { label: "Prevailing Dir", value: `${formatNumber(selected.summary.prevailingDirection)}º` },
        { label: "Avg Pressure", value: `${formatNumber(selected.summary.avgPressure)} hPa` },
        { label: "Latest UTC", value: formatDateTime(selected.summary.latestObservationUtc, "UTC") },
        { label: "Interval", value: "10-minute source" },
        { label: "Station", value: stationDisplayName(snapshot.selectedStationId, snapshot.selectedStationName) },
    ];
    metrics.forEach((metric, index) => {
        const card = document.createElement("article");
        card.className = index < 4 ? "metric-card emphasis" : "metric-card";
        card.innerHTML = `<h3>${metric.label}</h3><p>${metric.value}</p>`;
        metricsGridEl.appendChild(card);
    });
}
export function renderDecisionGuidance(snapshot, elements) {
    const { decisionUpdatedEl, decisionBadgeEl, decisionWindEl, decisionQualityEl, decisionRiskEl } = elements;
    const selected = snapshot.stations.find((station) => station.stationId === snapshot.selectedStationId);
    if (!selected) {
        decisionUpdatedEl.textContent = "No decision guidance available.";
        decisionBadgeEl.className = "decision-badge";
        decisionBadgeEl.textContent = "Screening";
        decisionWindEl.textContent = "No data yet.";
        decisionQualityEl.textContent = "No data yet.";
        decisionRiskEl.textContent = "No data yet.";
        return;
    }
    const summary = selected.summary;
    const avgSpeed = summary.avgSpeed;
    const p90Speed = summary.p90Speed;
    const coverage = summary.coverageRatio;
    const variability = summary.hoursAbove5mps;
    const latestUtc = summary.latestObservationUtc;
    let windSignal = "Wind signal is inconclusive. Extend history and review seasonal behavior.";
    let badgeClass = "decision-badge moderate";
    let badgeText = "Moderate signal";
    if (avgSpeed != null && p90Speed != null) {
        if (avgSpeed >= 7.0 && p90Speed >= 10.0) {
            windSignal = "Strong wind resource signal. Proceed to higher-resolution engineering yield assessment.";
            badgeClass = "decision-badge strong";
            badgeText = "Strong signal";
        }
        else if (avgSpeed >= 5.0 && p90Speed >= 8.0) {
            windSignal = "Moderate wind resource. Validate with longer history and wake/turbulence assumptions.";
        }
        else {
            windSignal = "Low-to-moderate wind resource in current window. Feasibility is uncertain for utility-scale output.";
            badgeClass = "decision-badge low";
            badgeText = "Low signal";
        }
    }
    let quality = "Coverage and data quality require review.";
    if (coverage != null) {
        if (coverage >= 0.9)
            quality = `Coverage is high (${(coverage * 100).toFixed(1)}%).`;
        else if (coverage >= 0.7)
            quality = `Coverage is partial (${(coverage * 100).toFixed(1)}%).`;
        else
            quality = `Coverage is low (${(coverage * 100).toFixed(1)}%). Extend backfill before decisions.`;
    }
    const riskParts = [];
    if (variability != null)
        riskParts.push(`Hours above 5 m/s: ${variability.toFixed(1)}.`);
    if (summary.maxSpeed != null)
        riskParts.push(`Observed max speed: ${summary.maxSpeed.toFixed(2)} m/s.`);
    if (summary.minTemperature != null || summary.maxTemperature != null) {
        riskParts.push(`Temperature range: ${formatNumber(summary.minTemperature)} to ${formatNumber(summary.maxTemperature)} ºC.`);
    }
    if (riskParts.length === 0)
        riskParts.push("Insufficient extremes for operational risk hints in this window.");
    decisionBadgeEl.className = badgeClass;
    decisionBadgeEl.textContent = badgeText;
    decisionUpdatedEl.textContent = `Snapshot: ${summary.dataPoints} rows · Latest UTC ${formatDateTime(latestUtc, "UTC")}.`;
    decisionWindEl.textContent = windSignal;
    decisionQualityEl.textContent = quality;
    decisionRiskEl.textContent = riskParts.join(" ");
}
export function renderSummaryTable(snapshot, summaryOutputEl) {
    summaryOutputEl.innerHTML = "";
    for (const station of snapshot.stations) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${stationDisplayName(station.stationId, station.stationName)}</td>
      <td>${station.summary.dataPoints}</td>
      <td>${station.summary.coverageRatio == null ? "n/a" : `${(station.summary.coverageRatio * 100).toFixed(1)}%`}</td>
      <td>${formatNumber(station.summary.avgSpeed)}</td>
      <td>${formatNumber(station.summary.p90Speed)}</td>
      <td>${formatNumber(station.summary.maxSpeed)}</td>
      <td>${station.summary.hoursAbove5mps == null ? "n/a" : station.summary.hoursAbove5mps.toFixed(1)}</td>
      <td>${formatNumber(station.summary.avgTemperature)}</td>
      <td>${station.summary.estimatedWindPowerDensity == null ? "n/a" : station.summary.estimatedWindPowerDensity.toFixed(1)}</td>
      <td>${formatDateTime(station.summary.latestObservationUtc, "UTC")}</td>
    `;
        summaryOutputEl.appendChild(row);
    }
}
export function renderRowsTable(snapshot, rowsOutputEl) {
    rowsOutputEl.innerHTML = "";
    const selected = snapshot.stations.find((station) => station.stationId === snapshot.selectedStationId);
    if (!selected || selected.data.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td colspan='8'>No rows available for selected station in this window.</td>";
        rowsOutputEl.appendChild(row);
        return;
    }
    for (const point of selected.data) {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${formatDateTime(point.datetime)}</td>
      <td>${formatNumber(point.temperature)}</td>
      <td>${formatNumber(point.pressure)}</td>
      <td>${formatNumber(point.speed)}</td>
      <td>${formatNumber(point.direction)}</td>
      <td>${formatNumber(point.latitude, 5)}</td>
      <td>${formatNumber(point.longitude, 5)}</td>
      <td>${formatNumber(point.altitude, 1)}</td>
    `;
        rowsOutputEl.appendChild(row);
    }
}
