const ALL_MEASUREMENT_TYPES = ["temperature", "pressure", "speed", "direction"] as const;

export function selectedMeasurementTypes(): string[] {
  return [...ALL_MEASUREMENT_TYPES];
}
