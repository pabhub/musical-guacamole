export function resultsSkeletonTemplate(): string {
  return `
    <section id="results-skeleton" class="results-skeleton hidden" aria-live="polite" aria-label="Loading analytics components">
      <article class="card skeleton-card">
        <div class="skeleton-block skeleton-title"></div>
        <div class="skeleton-grid-4">
          <div class="skeleton-block skeleton-metric"></div>
          <div class="skeleton-block skeleton-metric"></div>
          <div class="skeleton-block skeleton-metric"></div>
          <div class="skeleton-block skeleton-metric"></div>
        </div>
        <p class="skeleton-label">Loading decision snapshot...</p>
      </article>

      <article class="card skeleton-card">
        <div class="skeleton-block skeleton-title"></div>
        <div class="skeleton-grid-3">
          <div class="skeleton-block skeleton-chart"></div>
          <div class="skeleton-block skeleton-chart"></div>
          <div class="skeleton-block skeleton-chart"></div>
        </div>
        <p class="skeleton-label">Loading charts...</p>
      </article>

      <article class="card skeleton-card">
        <div class="skeleton-block skeleton-title"></div>
        <div class="skeleton-grid-2">
          <div class="skeleton-block skeleton-table"></div>
          <div class="skeleton-block skeleton-table"></div>
        </div>
        <p class="skeleton-label">Loading timeframe analytics and raw tables...</p>
      </article>
    </section>
  `;
}
