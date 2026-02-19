import { browserTimeZone, isValidTimeZone, startAuthSessionManager } from "./core/api.js";
import { requiredElement } from "./core/dom.js";
import { renderConfigPage } from "./components/config/page.js";
import {
  clearInputTimeZone,
  clearWindFarmParams,
  configuredInputTimeZone,
  getStoredInputTimeZone,
  readStoredWindFarmParams,
  saveInputTimeZone,
  saveWindFarmParams,
  validateWindFarmParams,
} from "./core/settings.js";
import { WindFarmParams } from "./core/types.js";

renderConfigPage();
startAuthSessionManager();

const browserInput = requiredElement<HTMLInputElement>("browser-timezone");
const customInput = requiredElement<HTMLInputElement>("custom-timezone");
const timezoneStatusEl = requiredElement<HTMLParagraphElement>("config-status");
const timezoneSaveBtn = requiredElement<HTMLButtonElement>("save-custom");
const timezoneResetBtn = requiredElement<HTMLButtonElement>("use-browser");

const windFarmStatusEl = requiredElement<HTMLParagraphElement>("wf-status");
const turbinesInput = requiredElement<HTMLInputElement>("wf-turbines");
const ratedPowerInput = requiredElement<HTMLInputElement>("wf-rated-power");
const cutInInput = requiredElement<HTMLInputElement>("wf-cut-in");
const ratedSpeedInput = requiredElement<HTMLInputElement>("wf-rated-speed");
const cutOutInput = requiredElement<HTMLInputElement>("wf-cut-out");
const referenceDensityInput = requiredElement<HTMLInputElement>("wf-ref-density");
const minOperatingTempInput = requiredElement<HTMLInputElement>("wf-min-temp");
const maxOperatingTempInput = requiredElement<HTMLInputElement>("wf-max-temp");
const minOperatingPressureInput = requiredElement<HTMLInputElement>("wf-min-pressure");
const maxOperatingPressureInput = requiredElement<HTMLInputElement>("wf-max-pressure");
const saveWindFarmBtn = requiredElement<HTMLButtonElement>("save-wf");
const resetWindFarmBtn = requiredElement<HTMLButtonElement>("reset-wf");

function setTimeZoneStatus(message: string): void {
  timezoneStatusEl.textContent = message;
}

function setWindFarmStatus(message: string): void {
  windFarmStatusEl.textContent = message;
}

function hydrateTimeZoneSettings(): void {
  const browser = browserTimeZone();
  const stored = getStoredInputTimeZone();
  browserInput.value = browser;
  customInput.value = stored ?? "";
  if (stored) {
    setTimeZoneStatus(`Current input timezone: ${stored} (custom).`);
    return;
  }
  setTimeZoneStatus(`Current input timezone: ${configuredInputTimeZone()} (browser default).`);
}

function hydrateWindFarmSettings(): void {
  const params = readStoredWindFarmParams();
  turbinesInput.value = String(params.turbineCount);
  ratedPowerInput.value = String(params.ratedPowerKw);
  cutInInput.value = String(params.cutInSpeedMps);
  ratedSpeedInput.value = String(params.ratedSpeedMps);
  cutOutInput.value = String(params.cutOutSpeedMps);
  referenceDensityInput.value = String(params.referenceAirDensityKgM3);
  minOperatingTempInput.value = String(params.minOperatingTempC);
  maxOperatingTempInput.value = String(params.maxOperatingTempC);
  minOperatingPressureInput.value = String(params.minOperatingPressureHpa);
  maxOperatingPressureInput.value = String(params.maxOperatingPressureHpa);
  setWindFarmStatus(
    `Current simulation: ${params.turbineCount} turbines × ${params.ratedPowerKw} kW, ` +
    `rho_ref ${params.referenceAirDensityKgM3} kg/m³, ` +
    `operating ${params.minOperatingTempC}..${params.maxOperatingTempC} ºC and ` +
    `${params.minOperatingPressureHpa}..${params.maxOperatingPressureHpa} hPa.`,
  );
}

timezoneSaveBtn.addEventListener("click", () => {
  const raw = customInput.value.trim();
  if (!raw) {
    setTimeZoneStatus("Enter an IANA timezone or keep browser default.");
    return;
  }
  if (!isValidTimeZone(raw)) {
    setTimeZoneStatus("Invalid timezone. Example: Europe/Madrid, UTC, America/Santiago.");
    return;
  }
  saveInputTimeZone(raw);
  setTimeZoneStatus(`Saved. Current input timezone: ${raw} (custom).`);
});

timezoneResetBtn.addEventListener("click", () => {
  clearInputTimeZone();
  customInput.value = "";
  setTimeZoneStatus(`Saved. Current input timezone: ${configuredInputTimeZone()} (browser default).`);
});

saveWindFarmBtn.addEventListener("click", () => {
  const payload: WindFarmParams = {
    turbineCount: Number(turbinesInput.value),
    ratedPowerKw: Number(ratedPowerInput.value),
    cutInSpeedMps: Number(cutInInput.value),
    ratedSpeedMps: Number(ratedSpeedInput.value),
    cutOutSpeedMps: Number(cutOutInput.value),
    referenceAirDensityKgM3: Number(referenceDensityInput.value),
    minOperatingTempC: Number(minOperatingTempInput.value),
    maxOperatingTempC: Number(maxOperatingTempInput.value),
    minOperatingPressureHpa: Number(minOperatingPressureInput.value),
    maxOperatingPressureHpa: Number(maxOperatingPressureInput.value),
  };
  if (!validateWindFarmParams(payload)) {
    setWindFarmStatus(
      "Use valid values: cut-in < rated < cut-out, positive count/power/rho_ref, and min < max for temperature/pressure.",
    );
    return;
  }
  saveWindFarmParams(payload);
  setWindFarmStatus(
    `Saved simulation: ${payload.turbineCount} turbines × ${payload.ratedPowerKw} kW, ` +
    `rho_ref ${payload.referenceAirDensityKgM3} kg/m³, ` +
    `operating ${payload.minOperatingTempC}..${payload.maxOperatingTempC} ºC / ` +
    `${payload.minOperatingPressureHpa}..${payload.maxOperatingPressureHpa} hPa.`,
  );
});

resetWindFarmBtn.addEventListener("click", () => {
  clearWindFarmParams();
  hydrateWindFarmSettings();
  setWindFarmStatus("Wind farm parameters reset to defaults.");
});

hydrateTimeZoneSettings();
hydrateWindFarmSettings();
