import { formatDateTime, formatNumber } from "./api.js";
export function renderTimeframeCards(container, payload) {
    container.innerHTML = "";
    for (const bucket of payload.buckets) {
        const card = document.createElement("article");
        card.className = "timeframe-card";
        card.innerHTML = `
      <h4>${bucket.label}</h4>
      <p>Speed min/avg/max: ${formatNumber(bucket.minSpeed)} / ${formatNumber(bucket.avgSpeed)} / ${formatNumber(bucket.maxSpeed)} m/s</p>
      <p>P90 speed: ${formatNumber(bucket.p90Speed)} m/s</p>
      <p>Hours ≥ 5 m/s: ${formatNumber(bucket.hoursAbove5mps)}</p>
      <p>Temp min/avg/max: ${formatNumber(bucket.minTemperature)} / ${formatNumber(bucket.avgTemperature)} / ${formatNumber(bucket.maxTemperature)} ºC</p>
      <p>Avg pressure: ${formatNumber(bucket.avgPressure)} hPa</p>
      <p>Expected generation: ${formatNumber(bucket.estimatedGenerationMwh)} MWh</p>
    `;
        container.appendChild(card);
    }
}
export function renderTimeframeTable(tbody, payload) {
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
export function renderComparison(container, payload) {
    container.innerHTML = "";
    if (!payload.comparison.length) {
        container.textContent = "No comparison range selected.";
        return;
    }
    for (const item of payload.comparison) {
        const chip = document.createElement("article");
        chip.className = "comparison-chip";
        chip.innerHTML = `
      <h5>${item.metric}</h5>
      <p>Baseline: ${formatNumber(item.baseline)}</p>
      <p>Current: ${formatNumber(item.current)}</p>
      <p>Delta: ${formatNumber(item.absoluteDelta)} (${formatNumber(item.percentDelta)}%)</p>
    `;
        container.appendChild(chip);
    }
}
