import { fetchBlob } from "../../core/api.js";
import { DashboardActionsContext } from "./actions_types.js";
import { selectedMeasurementTypes } from "./measurement_types.js";

export async function downloadExport(ctx: DashboardActionsContext, format: "csv" | "parquet"): Promise<void> {
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
