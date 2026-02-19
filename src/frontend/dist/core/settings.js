import { browserTimeZone, isValidTimeZone } from "./api.js";
export const INPUT_TIMEZONE_STORAGE_KEY = "aemet.input_timezone";
export const WIND_FARM_STORAGE_KEY = "aemet.wind_farm_params";
export const AUTH_USER_STORAGE_KEY = "aemet.api_username";
export const DEFAULT_WIND_FARM_PARAMS = {
    turbineCount: 6,
    ratedPowerKw: 900,
    cutInSpeedMps: 3,
    ratedSpeedMps: 12,
    cutOutSpeedMps: 25,
    referenceAirDensityKgM3: 1.225,
    minOperatingTempC: -40,
    maxOperatingTempC: 45,
    minOperatingPressureHpa: 850,
    maxOperatingPressureHpa: 1085,
};
export function configuredInputTimeZone(fallback = "UTC") {
    const stored = localStorage.getItem(INPUT_TIMEZONE_STORAGE_KEY)?.trim();
    if (stored && isValidTimeZone(stored))
        return stored;
    const browser = browserTimeZone();
    return isValidTimeZone(browser) ? browser : fallback;
}
export function getStoredInputTimeZone() {
    const stored = localStorage.getItem(INPUT_TIMEZONE_STORAGE_KEY)?.trim();
    if (!stored)
        return null;
    return isValidTimeZone(stored) ? stored : null;
}
export function saveInputTimeZone(zone) {
    localStorage.setItem(INPUT_TIMEZONE_STORAGE_KEY, zone);
}
export function clearInputTimeZone() {
    localStorage.removeItem(INPUT_TIMEZONE_STORAGE_KEY);
}
export function validateWindFarmParams(params) {
    if (!Number.isFinite(params.turbineCount) || params.turbineCount <= 0 || !Number.isInteger(params.turbineCount))
        return false;
    if (!Number.isFinite(params.ratedPowerKw) || params.ratedPowerKw <= 0)
        return false;
    if (!Number.isFinite(params.cutInSpeedMps) || params.cutInSpeedMps < 0)
        return false;
    if (!Number.isFinite(params.ratedSpeedMps) || params.ratedSpeedMps <= params.cutInSpeedMps)
        return false;
    if (!Number.isFinite(params.cutOutSpeedMps) || params.cutOutSpeedMps <= params.ratedSpeedMps)
        return false;
    if (!Number.isFinite(params.referenceAirDensityKgM3) || params.referenceAirDensityKgM3 <= 0)
        return false;
    if (!Number.isFinite(params.minOperatingTempC) || !Number.isFinite(params.maxOperatingTempC))
        return false;
    if (params.minOperatingTempC >= params.maxOperatingTempC)
        return false;
    if (!Number.isFinite(params.minOperatingPressureHpa) || !Number.isFinite(params.maxOperatingPressureHpa))
        return false;
    if (params.minOperatingPressureHpa >= params.maxOperatingPressureHpa)
        return false;
    return true;
}
function parseCandidateWindFarm(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        const defaults = DEFAULT_WIND_FARM_PARAMS;
        const candidate = {
            turbineCount: Number(parsed.turbineCount ?? defaults.turbineCount),
            ratedPowerKw: Number(parsed.ratedPowerKw ?? defaults.ratedPowerKw),
            cutInSpeedMps: Number(parsed.cutInSpeedMps ?? defaults.cutInSpeedMps),
            ratedSpeedMps: Number(parsed.ratedSpeedMps ?? defaults.ratedSpeedMps),
            cutOutSpeedMps: Number(parsed.cutOutSpeedMps ?? defaults.cutOutSpeedMps),
            referenceAirDensityKgM3: Number(parsed.referenceAirDensityKgM3 ?? defaults.referenceAirDensityKgM3),
            minOperatingTempC: Number(parsed.minOperatingTempC ?? defaults.minOperatingTempC),
            maxOperatingTempC: Number(parsed.maxOperatingTempC ?? defaults.maxOperatingTempC),
            minOperatingPressureHpa: Number(parsed.minOperatingPressureHpa ?? defaults.minOperatingPressureHpa),
            maxOperatingPressureHpa: Number(parsed.maxOperatingPressureHpa ?? defaults.maxOperatingPressureHpa),
        };
        return validateWindFarmParams(candidate) ? candidate : null;
    }
    catch {
        return null;
    }
}
export function readStoredWindFarmParamsOptional() {
    const raw = localStorage.getItem(WIND_FARM_STORAGE_KEY);
    return parseCandidateWindFarm(raw);
}
export function readStoredWindFarmParams(defaultParams = DEFAULT_WIND_FARM_PARAMS) {
    const parsed = readStoredWindFarmParamsOptional();
    if (parsed)
        return parsed;
    return { ...defaultParams };
}
export function saveWindFarmParams(params) {
    localStorage.setItem(WIND_FARM_STORAGE_KEY, JSON.stringify(params));
}
export function clearWindFarmParams() {
    localStorage.removeItem(WIND_FARM_STORAGE_KEY);
}
export function saveAuthUser(username) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, username);
}
export function getStoredAuthUser() {
    const stored = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return stored && stored.trim() ? stored : null;
}
export function clearAuthUser() {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}
