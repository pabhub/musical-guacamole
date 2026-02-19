import { QueryJobCreateResponse, QueryJobStatusResponse } from "../../core/types.js";

export function setQueryProgress(
  queryProgressWrap: HTMLDivElement,
  queryProgressBar: HTMLProgressElement,
  queryProgressText: HTMLParagraphElement,
  status: QueryJobCreateResponse | QueryJobStatusResponse,
): void {
  queryProgressWrap.classList.add("show");
  queryProgressBar.max = Math.max(1, status.totalApiCallsPlanned);
  queryProgressBar.value = Math.min(status.totalApiCallsPlanned, status.completedApiCalls);
  queryProgressText.textContent = `${status.message} API calls: ${status.completedApiCalls}/${status.totalApiCallsPlanned}. Windows cached ${status.cachedWindows}/${status.totalWindows}.`;
}

export function setPlaybackProgress(
  playbackProgressWrap: HTMLDivElement,
  playbackProgressBar: HTMLProgressElement,
  playbackProgressText: HTMLParagraphElement,
  ready: number,
  total: number,
  message: string,
): void {
  playbackProgressWrap.classList.add("show");
  playbackProgressBar.max = Math.max(1, total);
  playbackProgressBar.value = Math.min(ready, total);
  playbackProgressText.textContent = `${message} Frames ${ready}/${total}.`;
}
