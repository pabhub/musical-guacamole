import { WindFarmParams } from "../../core/types.js";

export function timeframeQueryParams(
  base: { start: string; end: string; groupBy: string },
  stationId: string,
  inputTimeZone: string,
  simulation: WindFarmParams | null,
): URLSearchParams {
  const params = new URLSearchParams({
    station: stationId,
    start: base.start,
    end: base.end,
    groupBy: base.groupBy,
    location: inputTimeZone,
  });

  if (simulation) {
    params.set("turbineCount", String(simulation.turbineCount));
    params.set("ratedPowerKw", String(simulation.ratedPowerKw));
    params.set("cutInSpeedMps", String(simulation.cutInSpeedMps));
    params.set("ratedSpeedMps", String(simulation.ratedSpeedMps));
    params.set("cutOutSpeedMps", String(simulation.cutOutSpeedMps));
    params.set("referenceAirDensityKgM3", String(simulation.referenceAirDensityKgM3));
    params.set("minOperatingTempC", String(simulation.minOperatingTempC));
    params.set("maxOperatingTempC", String(simulation.maxOperatingTempC));
    params.set("minOperatingPressureHpa", String(simulation.minOperatingPressureHpa));
    params.set("maxOperatingPressureHpa", String(simulation.maxOperatingPressureHpa));
  }

  return params;
}
