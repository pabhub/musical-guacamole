export function setQueryProgress(queryProgressWrap, queryProgressBar, queryProgressText, status) {
    queryProgressWrap.classList.add("show");
    queryProgressBar.max = Math.max(1, status.totalApiCallsPlanned);
    queryProgressBar.value = Math.min(status.totalApiCallsPlanned, status.completedApiCalls);
    queryProgressText.textContent = `${status.message} API calls: ${status.completedApiCalls}/${status.totalApiCallsPlanned}. Windows cached ${status.cachedWindows}/${status.totalWindows}.`;
}
export function setPlaybackProgress(playbackProgressWrap, playbackProgressBar, playbackProgressText, ready, total, message) {
    playbackProgressWrap.classList.add("show");
    playbackProgressBar.max = Math.max(1, total);
    playbackProgressBar.value = Math.min(ready, total);
    playbackProgressText.textContent = `${message} Frames ${ready}/${total}.`;
}
