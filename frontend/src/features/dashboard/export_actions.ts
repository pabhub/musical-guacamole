import { fetchBlob, formatDateTime } from "../../core/api.js";
import { DashboardActionsContext } from "./actions_types.js";
import { selectedMeasurementTypes } from "./measurement_types.js";
import { stationDisplayName } from "./stations.js";

type ExportFormat = "csv" | "parquet";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFileToken(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return normalized || "antarctic-station";
}

function captureHeatmapMetricsForPdf(reportCard: HTMLElement): string[][] {
  const sourceShells = Array.from(reportCard.querySelectorAll<HTMLElement>(".comparison-heatmap-shell"));
  const capturedByShell: string[][] = [];

  for (const shell of sourceShells) {
    const tabButtons = Array.from(shell.querySelectorAll<HTMLButtonElement>(".comparison-tab"));
    const heatmapGrid = shell.querySelector<HTMLElement>("[data-role='heatmap-grid']");
    if (!tabButtons.length || !heatmapGrid) {
      capturedByShell.push([]);
      continue;
    }

    const activeButton = shell.querySelector<HTMLButtonElement>(".comparison-tab.active");
    const capturedBlocks: string[] = [];
    for (const tabButton of tabButtons) {
      tabButton.click();
      const metricLabel = tabButton.textContent?.trim() || "Metric";
      const heatmapHtml = heatmapGrid.innerHTML.trim();
      if (!heatmapHtml) continue;
      capturedBlocks.push(`
        <section class="pdf-metric-heatmap">
          <h6>${escapeHtml(metricLabel)}</h6>
          ${heatmapHtml}
        </section>
      `);
    }

    if (activeButton && !activeButton.classList.contains("active")) {
      activeButton.click();
    }

    capturedByShell.push(capturedBlocks);
  }

  return capturedByShell;
}

function cloneReportCardForPdf(reportCard: HTMLElement): HTMLElement {
  const capturedHeatmaps = captureHeatmapMetricsForPdf(reportCard);
  const clone = reportCard.cloneNode(true) as HTMLElement;
  clone.id = "pdf-analysis-report";
  clone.classList.remove("hidden");
  clone.querySelectorAll<HTMLElement>(".hidden").forEach((node) => node.remove());

  // Keep full report content in PDF, but remove the export button itself.
  clone.querySelectorAll("#export-pdf").forEach((node) => node.remove());

  // Expand details blocks so PDF contains full report data.
  clone.querySelectorAll("details").forEach((node) => {
    node.setAttribute("open", "open");
  });

  clone.querySelectorAll<HTMLElement>(".timeframe-controls").forEach((controls) => {
    const text = document.createElement("p");
    text.className = "pdf-timeframe-mode";
    text.textContent = "Comparison by: Month";
    controls.replaceWith(text);
  });

  const cloneShells = Array.from(clone.querySelectorAll<HTMLElement>(".comparison-heatmap-shell"));
  cloneShells.forEach((shell, index) => {
    const headTitle =
      shell.querySelector(".comparison-heatmap-head h5")?.textContent?.trim() || "Period vs year heatmap";
    const metricBlocks = capturedHeatmaps[index] ?? [];
    if (!metricBlocks.length) {
      shell.remove();
      return;
    }
    shell.innerHTML = `
      <div class="comparison-heatmap-head">
        <h5>${escapeHtml(headTitle)}</h5>
      </div>
      <div class="pdf-heatmap-stack">
        ${metricBlocks.join("")}
      </div>
    `;
  });
  clone.querySelectorAll(".comparison-cell-detail").forEach((node) => node.remove());
  clone.querySelectorAll(".comparison-tab-list").forEach((node) => node.remove());

  const sourceCanvases = Array.from(reportCard.querySelectorAll<HTMLCanvasElement>("canvas[id]"));
  for (const sourceCanvas of sourceCanvases) {
    const sourceId = sourceCanvas.id;
    if (!sourceId) continue;
    const clonedCanvas = clone.querySelector<HTMLCanvasElement>(`canvas[id="${sourceId}"]`);
    if (!clonedCanvas) continue;
    try {
      const img = document.createElement("img");
      img.src = sourceCanvas.toDataURL("image/png");
      img.alt = "Trend chart";
      img.className = "pdf-chart-image";
      clonedCanvas.replaceWith(img);
    } catch {
      clonedCanvas.remove();
    }
  }

  return clone;
}

function renderPdfDocument(params: {
  title: string;
  generatedAt: string;
  timezone: string;
  stationName: string;
  loadedStart: string;
  loadedEnd: string;
  checkedAt: string;
  latestObservation: string;
  historyYears: number;
  groupingLabel: string;
  selectedMeasurements: string;
  availableStations: string;
  effectiveEndReason: string;
  reportHtml: string;
}): string {
  const {
    title,
    generatedAt,
    timezone,
    stationName,
    loadedStart,
    loadedEnd,
    checkedAt,
    latestObservation,
    historyYears,
    groupingLabel,
    selectedMeasurements,
    availableStations,
    effectiveEndReason,
    reportHtml,
  } = params;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      line-height: 1.35;
      background: #ffffff;
    }
    .pdf-page {
      max-width: 186mm;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5 {
      margin: 0;
      font-family: "Space Grotesk", "IBM Plex Sans", sans-serif;
      color: #0f172a;
      break-after: avoid-page;
    }
    .pdf-head {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px;
      background: #f8fbff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .pdf-head h1 {
      font-size: 20px;
      margin-bottom: 4px;
    }
    .pdf-head p {
      margin: 0;
      font-size: 11px;
      color: #334155;
    }
    .pdf-meta-grid {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
    }
    .pdf-meta-item {
      border: 1px solid #d7e4f0;
      border-radius: 8px;
      padding: 7px 8px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .pdf-meta-item h4 {
      font-size: 10px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
    }
    .pdf-meta-item p {
      margin: 0;
      font-size: 11px;
      color: #0f172a;
    }
    .pdf-meta-item ul {
      margin: 0;
      padding-left: 16px;
      font-size: 10px;
      color: #334155;
    }
    .pdf-report {
      margin-top: 10px;
    }
    #pdf-analysis-report {
      border: 1px solid #bfd3e7;
      border-radius: 10px;
      padding: 10px;
      background: #ffffff;
    }
    #pdf-analysis-report .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    #pdf-analysis-report .analysis-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    #pdf-analysis-report .analysis-block {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #d9e6f3;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    #pdf-analysis-report .muted {
      margin: 0;
      color: #475569;
      font-size: 10px;
    }
    #pdf-analysis-report .metrics-grid {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }
    #pdf-analysis-report .metric-card,
    #pdf-analysis-report .decision-tile,
    #pdf-analysis-report .comparison-kpi,
    #pdf-analysis-report .comparison-decision-tile,
    #pdf-analysis-report .comparison-chip,
    #pdf-analysis-report .timeframe-card {
      border: 1px solid #d2dfed;
      border-radius: 8px;
      padding: 7px 8px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    #pdf-analysis-report .metric-card h3 {
      margin: 0;
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
    }
    #pdf-analysis-report .metric-card p {
      margin: 4px 0 0;
      font-size: 14px;
      font-weight: 700;
    }
    #pdf-analysis-report .decision-grid {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }
    #pdf-analysis-report .decision-tile h3,
    #pdf-analysis-report .comparison-decision-tile h5 {
      margin: 0;
      font-size: 12px;
    }
    #pdf-analysis-report .decision-tile p,
    #pdf-analysis-report .comparison-decision-tile p {
      margin: 4px 0 0;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }
    #pdf-analysis-report .timeframe-cards {
      margin-top: 8px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }
    #pdf-analysis-report .timeframe-card h4 {
      margin: 0;
      font-size: 12px;
    }
    #pdf-analysis-report .timeframe-card p {
      margin: 3px 0 0;
      font-size: 10px;
      color: #334155;
    }
    #pdf-analysis-report .comparison-summary {
      margin-top: 8px;
      border: 1px solid #d2dfed;
      border-radius: 8px;
      padding: 8px;
      background: #ffffff;
    }
    #pdf-analysis-report .comparison-kpi-grid,
    #pdf-analysis-report .comparison-decision-grid {
      margin-top: 7px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }
    #pdf-analysis-report .comparison-year-summary-wrap {
      margin-top: 7px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    #pdf-analysis-report .pdf-timeframe-mode {
      margin: 7px 0 0;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    #pdf-analysis-report .pdf-heatmap-stack {
      margin-top: 6px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    #pdf-analysis-report .pdf-metric-heatmap {
      border: 1px solid #d2dfed;
      border-radius: 8px;
      padding: 7px;
      background: #fff;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    #pdf-analysis-report .pdf-metric-heatmap h6 {
      margin: 0 0 6px;
      font-size: 11px;
      color: #0f172a;
    }
    #pdf-analysis-report .table-wrap {
      border: 1px solid #d2dfed;
      border-radius: 8px;
      overflow: visible;
      max-height: none;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    #pdf-analysis-report table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 9px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    #pdf-analysis-report th,
    #pdf-analysis-report td {
      border: 1px solid #e2e8f0;
      padding: 5px 6px;
      text-align: left;
      vertical-align: top;
      white-space: normal;
      word-break: break-word;
    }
    #pdf-analysis-report thead th {
      background: #f8fbff;
      font-weight: 700;
    }
    #pdf-analysis-report .decision-badge {
      display: inline-flex;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      color: #1d4ed8;
      background: #eff6ff;
    }
    #pdf-analysis-report .decision-badge.strong { color: #166534; border-color: #86efac; background: #ecfdf5; }
    #pdf-analysis-report .decision-badge.moderate { color: #92400e; border-color: #fcd34d; background: #fffbeb; }
    #pdf-analysis-report .decision-badge.low { color: #991b1b; border-color: #fca5a5; background: #fef2f2; }
    .pdf-chart-image {
      width: 100%;
      max-width: 100%;
      height: auto;
      border: 1px solid #d7e4f0;
      border-radius: 8px;
      display: block;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .pdf-sources {
      margin-top: 8px;
      border-top: 1px solid #dbe6f2;
      padding-top: 7px;
    }
    .pdf-sources p {
      margin: 0;
      font-size: 10px;
      color: #475569;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .pdf-head, #pdf-analysis-report, #pdf-analysis-report .analysis-block,
      #pdf-analysis-report .metric-card, #pdf-analysis-report .decision-tile,
      #pdf-analysis-report .comparison-kpi, #pdf-analysis-report .comparison-decision-tile,
      #pdf-analysis-report .comparison-year-summary-wrap, #pdf-analysis-report .pdf-metric-heatmap,
      #pdf-analysis-report .table-wrap, #pdf-analysis-report table {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="pdf-page">
    <section class="pdf-head">
      <h1>${escapeHtml(title)}</h1>
      <p>Generated: ${escapeHtml(generatedAt)} · Timezone: ${escapeHtml(timezone)}</p>
      <div class="pdf-meta-grid">
        <article class="pdf-meta-item">
          <h4>Station</h4>
          <p>${escapeHtml(stationName)}</p>
        </article>
        <article class="pdf-meta-item">
          <h4>Loaded timeframe</h4>
          <p>${escapeHtml(loadedStart)} → ${escapeHtml(loadedEnd)}</p>
        </article>
        <article class="pdf-meta-item">
          <h4>Analysis context</h4>
          <p>History window: ${historyYears} year(s) · Grouping: ${escapeHtml(groupingLabel)} · Data types: ${escapeHtml(selectedMeasurements)}</p>
        </article>
        <article class="pdf-meta-item">
          <h4>Observation metadata</h4>
          <p>Latest: ${escapeHtml(latestObservation)} · Checked: ${escapeHtml(checkedAt)}</p>
        </article>
        <article class="pdf-meta-item">
          <h4>Data sources</h4>
          <ul>
            <li>Fuente: AEMET (© AEMET)</li>
            <li>Information created using meteorology reports obtained from the Agencia Estatal de Meteorología, among others.</li>
            <li>Base map data: © OpenStreetMap contributors (ODbL)</li>
            <li>Antarctic stations in scope: ${escapeHtml(availableStations)}</li>
          </ul>
        </article>
        <article class="pdf-meta-item">
          <h4>Data-end cap reason</h4>
          <p>${escapeHtml(effectiveEndReason)}</p>
        </article>
      </div>
    </section>

    <section class="pdf-report">
      ${reportHtml}
    </section>

    <footer class="pdf-sources">
      <p>Report scope: Antarctic wind feasibility screening (GS Inima internal use).</p>
      <p>Attribution: Information provided by the Agencia Estatal de Meteorología (AEMET) · Source: AEMET · © AEMET.</p>
    </footer>
  </main>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    });
    window.addEventListener("afterprint", function () {
      try { window.close(); } catch (err) { /* no-op */ }
    });
  </script>
</body>
</html>`;
}

export async function downloadExport(ctx: DashboardActionsContext, format: ExportFormat): Promise<void> {
  if (!ctx.ensureAuthenticated()) return;
  if (!ctx.state.snapshotState || !ctx.state.baselineStartLocal || !ctx.state.baselineEndLocal) {
    ctx.setError("Load station baseline before exporting.");
    return;
  }
  ctx.setError(null);
  const params = new URLSearchParams({
    location: ctx.configuredInputTimeZone(),
    aggregation: "none",
    format,
  });
  for (const type of selectedMeasurementTypes()) params.append("types", type);
  const url = `/api/antarctic/export/fechaini/${ctx.state.baselineStartLocal}/fechafin/${ctx.state.baselineEndLocal}/estacion/${ctx.state.snapshotState.selectedStationId}?${params.toString()}`;
  try {
    const response = await fetchBlob(url);
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    const filename = filenameMatch?.[1] ?? `antarctic_export.${format}`;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    ctx.setError(error instanceof Error ? error.message : `Unable to export ${format.toUpperCase()}.`);
  }
}

export async function downloadAnalysisPdf(ctx: DashboardActionsContext): Promise<void> {
  try {
    if (!ctx.ensureAuthenticated()) return;
    const snapshot = ctx.state.snapshotState;
    if (!snapshot) {
      ctx.setError("Load station baseline before downloading the PDF report.");
      return;
    }
    const reportCard = document.getElementById("decision-card");
    if (!(reportCard instanceof HTMLElement) || reportCard.classList.contains("hidden")) {
      ctx.setError("Analysis report is not available yet. Run station analysis first.");
      return;
    }

    const selectedStation = snapshot.stations.find((station) => station.stationId === snapshot.selectedStationId) ?? null;
    if (!selectedStation) {
      ctx.setError("Selected station report is unavailable. Reload the station and try again.");
      return;
    }

    const groupingLabel = "Month";
    const timezone = ctx.configuredInputTimeZone();
    const generatedAtIso = new Date().toISOString();
    const generatedAtLabel = formatDateTime(generatedAtIso, timezone);
    const stationName = stationDisplayName(snapshot.selectedStationId, snapshot.selectedStationName);
    const title = `Antarctic Wind Analysis Report · ${stationName}`;
    const fileStem = `${sanitizeFileToken(stationName)}-analysis-report-${generatedAtIso.slice(0, 10)}`;
    const selectedMeasurements = selectedMeasurementTypes().join(", ") || "speed, direction, temperature, pressure";
    const availableStations = snapshot.stations
      .map((station) => stationDisplayName(station.stationId, station.stationName))
      .join(", ");

    const reportClone = cloneReportCardForPdf(reportCard);
    const html = renderPdfDocument({
      title,
      generatedAt: generatedAtLabel,
      timezone,
      stationName,
      loadedStart: formatDateTime(snapshot.requestedStart, timezone),
      loadedEnd: formatDateTime(snapshot.effectiveEnd, timezone),
      checkedAt: formatDateTime(snapshot.checked_at_utc, timezone),
      latestObservation: formatDateTime(selectedStation.summary.latestObservationUtc, timezone),
      historyYears: ctx.selectedHistoryYears(),
      groupingLabel,
      selectedMeasurements,
      availableStations,
      effectiveEndReason: snapshot.effectiveEndReason || "Latest available station observation bound.",
      reportHtml: reportClone.outerHTML,
    });

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const printWindow = window.open(objectUrl, "_blank", "width=1200,height=900");
    if (!printWindow) {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.download = `${fileStem}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
    ctx.setError(null);
  } catch (error) {
    ctx.setError(error instanceof Error ? error.message : "Unable to open PDF export preview.");
  }
}
