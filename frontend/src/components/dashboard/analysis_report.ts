export function analysisReportTemplate(): string {
  return `
    <article id="decision-card" class="card hidden">
      <div class="section-head">
        <div class="analysis-title-row">
          <h2>Analysis & Recommendations Report</h2>
          <span id="decision-badge" class="decision-badge">Screening</span>
        </div>
        <div class="analysis-head-actions">
          <p id="decision-updated" class="muted"></p>
          <button type="button" id="export-pdf" class="secondary icon-btn" title="Download Analysis Report PDF" aria-label="Download Analysis Report PDF">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13 4.5V9h4.5M8 14h4M8 17h8M11 12v6m0 0-2-2m2 2 2-2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="sr-only">Download Analysis Report PDF</span>
          </button>
        </div>
      </div>

      <section class="analysis-block">
        <h3>Current Window Snapshot</h3>
        <section id="metrics-grid" class="metrics-grid"></section>
        <div class="decision-grid">
          <article class="decision-tile">
            <h3>Wind Resource Signal</h3>
            <p id="decision-wind"></p>
          </article>
          <article class="decision-tile">
            <h3>Data Quality & Coverage</h3>
            <p id="decision-quality"></p>
          </article>
          <article class="decision-tile">
            <h3>Operational Implications</h3>
            <p id="decision-risk"></p>
          </article>
        </div>
      </section>

      <section id="timeframe-section" class="analysis-block hidden">
        <div class="analysis-subhead">
          <h3>Loaded Years Comparison</h3>
          <p class="muted">Grouping uses loaded station history from the selected map station. Missing year/period values are shown as "-".</p>
        </div>
        <div class="timeframe-controls">
          <label>Compare by
            <select id="timeframe-grouping">
              <option value="month" selected>Month</option>
              <option value="season">Season</option>
            </select>
          </label>
          <label class="timeframe-action">
            <span class="timeframe-action-label" aria-hidden="true">Action</span>
            <button id="timeframe-run" type="button">Run analysis</button>
          </label>
        </div>
        <p id="timeframe-status" class="timeframe-status timeframe-status-info">Ready to compare loaded years.</p>
        <p id="generation-summary" class="muted">Configure wind farm parameters in Config page to calculate expected generation with air-density and operating-envelope correction.</p>
        <div id="timeframe-trend-wrap" class="timeframe-trend-wrap hidden">
          <h3>Timeframe Min / Avg / Max Trends</h3>
          <div class="chart-shell timeframe-chart-shell"><canvas id="timeframe-trend-chart"></canvas></div>
        </div>
        <div id="timeframe-cards" class="timeframe-cards"></div>
        <div id="timeframe-comparison" class="comparison-grid"></div>
      </section>
    </article>
  `;
}
