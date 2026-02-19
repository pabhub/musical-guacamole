const authTokenStorageKey = "aemet.api_access_token";
const authTokenExpiryStorageKey = "aemet.api_access_token_expires_at";
function nowEpochSeconds() {
    return Math.floor(Date.now() / 1000);
}
function authTokenFromStorage() {
    const token = localStorage.getItem(authTokenStorageKey);
    const rawExpiry = localStorage.getItem(authTokenExpiryStorageKey);
    if (!token || !rawExpiry)
        return null;
    const expiry = Number(rawExpiry);
    if (!Number.isFinite(expiry) || expiry <= nowEpochSeconds()) {
        clearAuthToken();
        return null;
    }
    return token;
}
function requestWithAuth(options) {
    const request = { ...(options ?? {}) };
    const headers = new Headers(request.headers ?? {});
    const token = authTokenFromStorage();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    request.headers = headers;
    return request;
}
function notifyAuthRequired() {
    window.dispatchEvent(new CustomEvent("auth:required"));
}
function parseErrorDetail(payload) {
    if (payload && typeof payload === "object" && "detail" in payload) {
        const detail = payload.detail;
        if (typeof detail === "string")
            return detail;
    }
    return "Request failed";
}
export async function fetchJson(url, options) {
    const response = await fetch(url, requestWithAuth(options));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && !url.includes("/api/auth/token")) {
            clearAuthToken();
            notifyAuthRequired();
        }
        throw new Error(parseErrorDetail(payload));
    }
    return payload;
}
export async function fetchBlob(url, options) {
    const response = await fetch(url, requestWithAuth(options));
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
            clearAuthToken();
            notifyAuthRequired();
        }
        throw new Error(parseErrorDetail(payload));
    }
    return response;
}
export function saveAuthToken(token, expiresInSeconds) {
    const ttl = Math.max(30, Math.floor(expiresInSeconds));
    localStorage.setItem(authTokenStorageKey, token);
    localStorage.setItem(authTokenExpiryStorageKey, String(nowEpochSeconds() + ttl));
}
export function clearAuthToken() {
    localStorage.removeItem(authTokenStorageKey);
    localStorage.removeItem(authTokenExpiryStorageKey);
}
export function hasValidAuthToken() {
    return authTokenFromStorage() != null;
}
export function toApiDateTime(value) {
    if (!value)
        return "";
    return value.length === 16 ? `${value}:00` : value;
}
export function formatDateTime(value, timeZone = "Europe/Madrid") {
    if (!value)
        return "n/a";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime()))
        return value;
    return new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(dt);
}
export function formatNumber(value, digits = 2) {
    return value == null ? "n/a" : value.toFixed(digits);
}
export function browserTimeZone() {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.trim() ? zone : "UTC";
}
export function isValidTimeZone(zone) {
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: zone });
        return true;
    }
    catch {
        return false;
    }
}
export function toDateTimeLocalInZone(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const read = (type) => parts.find((part) => part.type === type)?.value ?? "00";
    return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}:${read("second")}`;
}
