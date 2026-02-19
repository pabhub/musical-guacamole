import { formatDateTime, formatNumber } from "../../core/api.js";
import { TimeframeAnalyticsResponse } from "../../core/types.js";
import { periodWord, summarize } from "./summary.js";

export { renderComparison } from "./comparison.js";

export function renderTimeframeCards(
  container: HTMLDivElement,
  payload: TimeframeAnalyticsResponse,
): void {
  container.innerHTML = "";
  const groupBy = payload.groupBy === "season" ? "season" : "month";
  const summary = summarize(payload);
  const dominant = payload.windRose.dominantSector ?? "n/a";
  const concentration = payload.windRose.directionalConcentration == null
    ? "n/a"
    : `${(payload.windRose.directionalConcentration * 100).toFixed(1)}%`;
  const periodLabel = periodWord(groupBy, summary.bucketCount);
  const groupingLabel = groupBy === "month" ? "Monthly" : "Seasonal";

  const cards = [
    `
      <h4>Selected Scope</h4>
      <p>${formatDateTime(payload.requestedStart)} → ${formatDateTime(payload.requestedEnd)}</p>
      <p>Grouping: ${groupingLabel} · ${periodLabel.replace(/^./, (value) => value.toUpperCase())}: ${formatNumber(summary.bucketCount, 0)} · Data Points: ${formatNumber(summary.dataPoints, 0)}</p>
      <p>Dominant heading (toward): ${dominant} · Concentration: ${concentration}</p>
    `,
    `
      <h4>Wind Performance</h4>
      <p>Speed min/avg/max: ${formatNumber(summary.minSpeed)} / ${formatNumber(summary.avgSpeed)} / ${formatNumber(summary.maxSpeed)} m/s</p>
      <p>P90 speed: ${formatNumber(summary.p90Speed)} m/s</p>
      <p>Hours ≥ 3 m/s: ${formatNumber(summary.hoursAbove3mps)} · Hours ≥ 5 m/s: ${formatNumber(summary.hoursAbove5mps)}</p>
    `,
    `
      <h4>Environment + Yield</h4>
      <p>Temp range: ${formatNumber(summary.minTemperature)} to ${formatNumber(summary.maxTemperature)} ºC</p>
      <p>Avg pressure: ${formatNumber(summary.avgPressure)} hPa</p>
      <p>Estimated generation: ${formatNumber(summary.estimatedGenerationMwh)} MWh</p>
    `,
  ];

  for (const html of cards) {
    const card = document.createElement("article");
    card.className = "timeframe-card";
    card.innerHTML = html;
    container.appendChild(card);
  }
}

export function renderTimeframeTable(
  tbody: HTMLTableSectionElement,
  payload: TimeframeAnalyticsResponse,
): void {
  tbody.innerHTML = "";
  for (const bucket of payload.buckets) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${bucket.label}</td>
      <td>${formatDateTime(bucket.start)}</td>
      <td>${formatDateTime(bucket.end)}</td>
      <td>${formatNumber(bucket.dataPoints, 0)}</td>
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
