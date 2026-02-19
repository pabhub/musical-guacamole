import { fetchJson } from "../../core/api.js";
import { AnalysisBootstrapResponse } from "../../core/types.js";
import { renderStationMarkers } from "../overlay.js";
import { DashboardActionsContext } from "./actions_types.js";
import { stationLabel } from "./stations.js";

function populateStations(response: AnalysisBootstrapResponse, stationSelect: HTMLSelectElement): void {
  stationSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select station";
  stationSelect.appendChild(placeholder);
  for (const station of response.stations.filter((item) => item.isSelectable)) {
    const option = document.createElement("option");
    option.value = station.stationId;
    option.textContent = stationLabel(station.stationId, station.stationName);
    stationSelect.appendChild(option);
  }
}

export async function bootstrapDashboard(ctx: DashboardActionsContext): Promise<void> {
  if (!ctx.ensureAuthenticated()) return;
  if (ctx.state.dashboardBootstrapped) return;
  ctx.setError(null);
  ctx.setSnapshotSectionsVisible(false);
  ctx.setWorkflowStage("scope", "Loading Antarctic station bootstrap and latest snapshots.");
  ctx.setLoading(true);
  try {
    const bootstrap = await fetchJson<AnalysisBootstrapResponse>("/api/analysis/bootstrap");
    ctx.state.bootstrapState = bootstrap;
    populateStations(bootstrap, ctx.elements.stationSelect);
    ctx.elements.stationSelect.value = "";
    renderStationMarkers(
      ctx.map,
      ctx.overlayController,
      bootstrap.latestSnapshots,
      bootstrap.stations,
      null,
      ctx.getMapStationClickHandler(),
    );
    ctx.elements.statusEl.textContent = "Select station to start analysis.";
    ctx.state.dashboardBootstrapped = true;
  } catch (error) {
    ctx.setError(error instanceof Error ? error.message : "Unable to bootstrap dashboard.");
    ctx.elements.statusEl.textContent = "Dashboard bootstrap failed.";
  } finally {
    ctx.setLoading(false);
  }
}
