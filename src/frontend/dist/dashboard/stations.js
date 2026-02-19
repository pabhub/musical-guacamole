export function stationDisplayName(stationId, stationName) {
    if (stationId === "89064")
        return "Meteo Station Juan Carlos I";
    if (stationId === "89070")
        return "Meteo Station Gabriel de Castilla";
    const cleaned = stationName?.trim();
    return cleaned && cleaned.length > 0 ? cleaned : stationId;
}
export function stationLabel(stationId, stationName) {
    return stationDisplayName(stationId, stationName);
}
