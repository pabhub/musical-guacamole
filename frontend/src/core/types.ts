export type StationRole = "meteo" | "supplemental" | "archive";

export type AuthTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export type StationProfile = {
  stationId: string;
  stationName: string;
  role: StationRole;
  isSelectable: boolean;
  primaryStationId: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
};

export type LatestSnapshot = {
  stationId: string;
  stationName: string;
  role: StationRole;
  datetime: string;
  speed: number | null;
  direction: number | null;
  temperature: number | null;
  pressure: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
};

export type AnalysisBootstrapResponse = {
  checked_at_utc: string;
  note: string;
  stations: StationProfile[];
  selectableStationIds: string[];
  mapStationIds: string[];
  latestObservationByStation: Record<string, string | null>;
  suggestedStartByStation: Record<string, string | null>;
  latestSnapshots: LatestSnapshot[];
};

export type StationSummary = {
  stationId: string;
  stationName: string;
  role: StationRole;
  dataPoints: number;
  coverageRatio: number | null;
  avgSpeed: number | null;
  p90Speed: number | null;
  maxSpeed: number | null;
  hoursAbove3mps: number | null;
  hoursAbove5mps: number | null;
  avgTemperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  avgPressure: number | null;
  prevailingDirection: number | null;
  estimatedWindPowerDensity: number | null;
  latestObservationUtc: string | null;
};

export type DataRow = {
  stationName: string;
  datetime: string;
  temperature: number | null;
  pressure: number | null;
  speed: number | null;
  direction: number | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
};

export type StationSeries = {
  stationId: string;
  stationName: string;
  role: StationRole;
  summary: StationSummary;
  data: DataRow[];
};

export type FeasibilitySnapshotResponse = {
  checked_at_utc: string;
  selectedStationId: string;
  selectedStationName: string;
  requestedStart: string;
  effectiveEnd: string;
  effectiveEndReason: string;
  timezone_input: string;
  timezone_output: string;
  aggregation: string;
  mapStationIds: string[];
  notes: string[];
  stations: StationSeries[];
};

export type QueryJobCreateResponse = {
  jobId: string;
  status: string;
  stationId: string;
  requestedStartUtc: string;
  effectiveEndUtc: string;
  historyStartUtc: string;
  totalWindows: number;
  cachedWindows: number;
  missingWindows: number;
  totalApiCallsPlanned: number;
  completedApiCalls: number;
  framesPlanned: number;
  framesReady: number;
  playbackReady: boolean;
  message: string;
};

export type QueryJobStatusResponse = {
  jobId: string;
  status: string;
  stationId: string;
  totalWindows: number;
  cachedWindows: number;
  missingWindows: number;
  completedWindows: number;
  totalApiCallsPlanned: number;
  completedApiCalls: number;
  framesPlanned: number;
  framesReady: number;
  playbackReady: boolean;
  percent: number;
  message: string;
  errorDetail: string | null;
  updatedAtUtc: string;
};

export type PlaybackStep = "10m" | "1h" | "3h" | "1d";
export type FrameQuality = "observed" | "aggregated" | "gap_filled";

export type PlaybackFrame = {
  datetime: string;
  speed: number | null;
  direction: number | null;
  temperature: number | null;
  pressure: number | null;
  qualityFlag: FrameQuality;
  dx: number | null;
  dy: number | null;
};

export type WindRoseBin = {
  sector: string;
  speedBuckets: Record<string, number>;
  totalCount: number;
};

export type WindRoseSummary = {
  bins: WindRoseBin[];
  dominantSector: string | null;
  directionalConcentration: number | null;
  calmShare: number | null;
};

export type PlaybackResponse = {
  stationId: string;
  stationName: string;
  requestedStep: PlaybackStep;
  effectiveStep: PlaybackStep;
  timezone_input: string;
  timezone_output: string;
  start: string;
  end: string;
  frames: PlaybackFrame[];
  framesPlanned: number;
  framesReady: number;
  qualityCounts: Record<string, number>;
  windRose: WindRoseSummary;
};

export type TimeframeBucket = {
  label: string;
  start: string;
  end: string;
  dataPoints: number;
  avgSpeed: number | null;
  minSpeed: number | null;
  maxSpeed: number | null;
  p90Speed: number | null;
  hoursAbove3mps: number | null;
  hoursAbove5mps: number | null;
  speedVariability: number | null;
  dominantDirection: number | null;
  avgTemperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  avgPressure: number | null;
  estimatedGenerationMwh: number | null;
};

export type ComparisonDelta = {
  metric: string;
  baseline: number | null;
  current: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
};

export type TimeframeAnalyticsResponse = {
  stationId: string;
  stationName: string;
  groupBy: "hour" | "day" | "week" | "month" | "season";
  timezone_input: string;
  timezone_output: string;
  requestedStart: string;
  requestedEnd: string;
  buckets: TimeframeBucket[];
  windRose: WindRoseSummary;
  comparison: ComparisonDelta[];
};

export type WindFarmParams = {
  turbineCount: number;
  ratedPowerKw: number;
  cutInSpeedMps: number;
  ratedSpeedMps: number;
  cutOutSpeedMps: number;
  referenceAirDensityKgM3: number;
  minOperatingTempC: number;
  maxOperatingTempC: number;
  minOperatingPressureHpa: number;
  maxOperatingPressureHpa: number;
};
