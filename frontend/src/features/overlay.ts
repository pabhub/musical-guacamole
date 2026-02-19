declare const L: any;

import { formatDateTime, formatNumber } from "../core/api.js";
import { LatestSnapshot, PlaybackFrame, StationProfile } from "../core/types.js";

export type OverlayOptions = {
  showDirectionTrail: boolean;
  showTemperatureHalo: boolean;
  showPressureRing: boolean;
};

export type OverlayController = {
  markerLayer: any;
  vectorLayer: any;
  trailLayer: any;
  climateLayer: any;
  markers: Map<string, any>;
  currentTrail: Array<[number, number]>;
  selectedStationId: string | null;
  selectedLatLng: [number, number] | null;
};

export function createOverlayController(map: any): OverlayController {
  return {
    markerLayer: L.layerGroup().addTo(map),
    vectorLayer: L.layerGroup().addTo(map),
    trailLayer: L.layerGroup().addTo(map),
    climateLayer: L.layerGroup().addTo(map),
    markers: new Map<string, any>(),
    currentTrail: [],
    selectedStationId: null,
    selectedLatLng: null,
  };
}

export function stationColor(stationId: string): string {
  if (stationId.toUpperCase().endsWith("R")) return "#0284c7";
  if (stationId === "89070") return "#ea580c";
  return "#0f766e";
}

export function renderStationMarkers(
  map: any,
  controller: OverlayController,
  snapshots: LatestSnapshot[],
  profiles: StationProfile[],
  selectedStationId: string | null,
  onStationClick: (stationId: string) => void,
): void {
  controller.markerLayer.clearLayers();
  controller.markers.clear();
  controller.selectedLatLng = null;
  const profileMap = new Map<string, StationProfile>(profiles.map((profile) => [profile.stationId, profile]));
  const bounds: Array<[number, number]> = [];

  for (const snapshot of snapshots) {
    const profile = profileMap.get(snapshot.stationId);
    const lat = snapshot.latitude ?? profile?.latitude ?? null;
    const lon = snapshot.longitude ?? profile?.longitude ?? null;
    if (lat == null || lon == null) continue;
    const isSelected = selectedStationId === snapshot.stationId;
    const color = stationColor(snapshot.stationId);
    const marker = L.circleMarker([lat, lon], {
      radius: isSelected ? 10 : 7,
      color: isSelected ? "#0f172a" : color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: isSelected ? 3 : 2,
    });
    marker.bindPopup(
      `<strong>${snapshot.stationName}</strong><br/>Latest: ${formatDateTime(snapshot.datetime)}<br/>Wind: ${formatNumber(snapshot.speed)} m/s`
    );
    marker.on("click", () => onStationClick(snapshot.stationId));
    marker.addTo(controller.markerLayer);
    controller.markers.set(snapshot.stationId, marker);
    bounds.push([lat, lon]);
    if (isSelected) {
      controller.selectedLatLng = [lat, lon];
    }
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [18, 18], maxZoom: 8 });
  }
}

function speedColor(speed: number | null): string {
  if (speed == null) return "#94a3b8";
  if (speed < 3) return "#1d4ed8";
  if (speed < 8) return "#16a34a";
  if (speed < 12) return "#d97706";
  return "#dc2626";
}

function arrowHead(
  start: [number, number],
  end: [number, number],
  size = 0.0035,
): [[number, number], [number, number], [number, number]] {
  const [y1, x1] = start;
  const [y2, x2] = end;
  const vx = x2 - x1;
  const vy = y2 - y1;
  const length = Math.hypot(vx, vy) || 1;
  const ux = vx / length;
  const uy = vy / length;
  const px = -uy;
  const py = ux;

  const tailX = x2 - ux * size * 2.2;
  const tailY = y2 - uy * size * 2.2;
  const left: [number, number] = [tailY + py * size, tailX + px * size];
  const right: [number, number] = [tailY - py * size, tailX - px * size];
  return [end, left, right];
}

export function renderPlaybackOverlay(
  controller: OverlayController,
  frame: PlaybackFrame | null,
  options: OverlayOptions,
): void {
  controller.vectorLayer.clearLayers();
  controller.trailLayer.clearLayers();
  controller.climateLayer.clearLayers();
  if (!frame || !controller.selectedLatLng) return;

  const [lat, lon] = controller.selectedLatLng;
  const color = speedColor(frame.speed);
  const speedMagnitude = Math.max(0, frame.speed ?? 0);
  const scale = 0.012 + Math.min(speedMagnitude, 25) * 0.0012;

  L.circleMarker([lat, lon], {
    radius: 7,
    color: "#0f172a",
    weight: 2,
    fillColor: color,
    fillOpacity: 0.95,
  }).addTo(controller.vectorLayer);
  L.circle([lat, lon], {
    radius: 650,
    color,
    weight: 1.6,
    opacity: 0.45,
    fillColor: color,
    fillOpacity: 0.09,
  }).addTo(controller.vectorLayer);

  if (frame.dx != null && frame.dy != null) {
    const endLat = lat + frame.dy * scale;
    const endLon = lon + frame.dx * scale;
    L.polyline([[lat, lon], [endLat, endLon]], {
      color,
      weight: 4.4,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(controller.vectorLayer);
    L.polyline([[lat, lon], [endLat, endLon]], {
      color: "#0f172a",
      weight: 7,
      opacity: 0.18,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(controller.vectorLayer);
    L.polygon(arrowHead([lat, lon], [endLat, endLon]), {
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 1,
    }).addTo(controller.vectorLayer);
    L.circleMarker([endLat, endLon], {
      radius: 3.8,
      color: "#0f172a",
      fillColor: color,
      fillOpacity: 1,
      weight: 1,
    }).addTo(
      controller.vectorLayer
    );

    controller.currentTrail.push([endLat, endLon]);
    if (controller.currentTrail.length > 90) {
      controller.currentTrail.shift();
    }
  }

  if (options.showDirectionTrail && controller.currentTrail.length > 2) {
    L.polyline(controller.currentTrail, {
      color: "#1e293b",
      weight: 2.2,
      opacity: 0.38,
      dashArray: "4,6",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(
      controller.trailLayer
    );
    const tail = controller.currentTrail.slice(-10);
    tail.forEach((point, idx) => {
      const opacity = Math.max(0.12, idx / tail.length * 0.38);
      L.circleMarker(point, {
        radius: 2.2,
        color: "#334155",
        weight: 1,
        fillColor: "#334155",
        fillOpacity: opacity,
        opacity,
      }).addTo(controller.trailLayer);
    });
  }

  if (options.showTemperatureHalo && frame.temperature != null) {
    const radius = Math.max(2800, 2800 + (frame.temperature + 25) * 95);
    const haloColor = frame.temperature < -5 ? "#38bdf8" : frame.temperature < 2 ? "#14b8a6" : "#f97316";
    L.circle([lat, lon], { radius, color: haloColor, weight: 1.5, opacity: 0.48, fillOpacity: 0.1 }).addTo(
      controller.climateLayer
    );
  }

  if (options.showPressureRing && frame.pressure != null) {
    const pressureDelta = Math.abs(frame.pressure - 1000);
    const radius = 2400 + pressureDelta * 35;
    L.circle([lat, lon], { radius, color: "#7c3aed", weight: 1.2, opacity: 0.4, fillOpacity: 0 }).addTo(
      controller.climateLayer
    );
  }
}

export function clearPlaybackTrail(controller: OverlayController): void {
  controller.currentTrail = [];
}
