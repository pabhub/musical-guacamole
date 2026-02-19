export function stationDisplayName(stationId: string, stationName?: string | null): string {
  if (stationId === "89064") return "Meteo Station Juan Carlos I";
  if (stationId === "89070") return "Meteo Station Gabriel de Castilla";
  const cleaned = stationName?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : "Unknown Antarctic station";
}

export function stationLabel(stationId: string, stationName: string): string {
  return stationDisplayName(stationId, stationName);
}
