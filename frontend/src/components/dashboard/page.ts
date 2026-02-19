import { renderPageRoot } from "../render.js";
import { complianceFooterTemplate } from "../layout/footer.js";
import { topNavTemplate } from "../layout/top_nav.js";
import { dashboardChartsTemplate } from "./charts.js";
import { decisionSnapshotTemplate } from "./decision.js";
import { dashboardHeroTemplate } from "./hero.js";
import { rawTablesTemplate } from "./raw_tables.js";
import { resultsSkeletonTemplate } from "./results_skeleton.js";
import { stationWorkspaceTemplate } from "./station_workspace.js";
import { timeframeAnalysisTemplate } from "./timeframe.js";

export function dashboardPageTemplate(): string {
  return `
    ${topNavTemplate({
      active: "dashboard",
      brand: "GS Inima · Antarctic Wind Feasibility",
      showAuth: true,
    })}
    <main class="container">
      ${dashboardHeroTemplate()}
      <section class="content-stack">
        ${stationWorkspaceTemplate()}
        ${resultsSkeletonTemplate()}
        ${dashboardChartsTemplate()}
        ${timeframeAnalysisTemplate()}
        ${decisionSnapshotTemplate()}
        ${rawTablesTemplate()}
      </section>
    </main>
    ${complianceFooterTemplate()}
  `;
}

export function renderDashboardPage(): void {
  renderPageRoot(dashboardPageTemplate());
}
