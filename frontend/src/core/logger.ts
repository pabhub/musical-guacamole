const DEBUG_STORAGE_KEY = "aemet.debug_logging";

type LogContext = Record<string, unknown> | undefined;

function debugEnabled(): boolean {
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function baseMessage(scope: string, message: string): string {
  return `[${scope}] ${message}`;
}

export function setDebugLoggingEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore storage failures on restricted environments.
  }
}

export function logDebug(scope: string, message: string, context?: LogContext): void {
  if (!debugEnabled()) return;
  if (context) {
    console.debug(baseMessage(scope, message), context);
    return;
  }
  console.debug(baseMessage(scope, message));
}

export function logInfo(scope: string, message: string, context?: LogContext): void {
  if (!debugEnabled()) return;
  if (context) {
    console.info(baseMessage(scope, message), context);
    return;
  }
  console.info(baseMessage(scope, message));
}

export function logWarn(scope: string, message: string, context?: LogContext): void {
  if (context) {
    console.warn(baseMessage(scope, message), context);
    return;
  }
  console.warn(baseMessage(scope, message));
}

export function logError(scope: string, message: string, context?: LogContext): void {
  if (context) {
    console.error(baseMessage(scope, message), context);
    return;
  }
  console.error(baseMessage(scope, message));
}
