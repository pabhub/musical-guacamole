export const PLAY_ICON_MARKUP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12l10-6-10-6z" fill="currentColor"></path></svg><span class="sr-only">Play</span>';
export const PAUSE_ICON_MARKUP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h4v12H7zm6 0h4v12h-4z" fill="currentColor"></path></svg><span class="sr-only">Pause</span>';

export function setPlaybackButtonVisual(playbackPlayBtn: HTMLButtonElement, playing: boolean): void {
  playbackPlayBtn.innerHTML = playing ? PAUSE_ICON_MARKUP : PLAY_ICON_MARKUP;
  playbackPlayBtn.setAttribute("aria-label", playing ? "Pause playback" : "Play playback");
}

export function selectedPlaybackDelayMs(playbackSpeedSelect: HTMLSelectElement): number {
  const factor = Number.parseFloat(playbackSpeedSelect.value.replace("x", ""));
  if (Number.isFinite(factor) && factor > 0) {
    return Math.max(16, Math.round(900 / factor));
  }
  return 900;
}

export function updatePlaybackControls(
  playbackSlider: HTMLInputElement,
  playbackPlayBtn: HTMLButtonElement,
  frameCount: number,
): void {
  playbackSlider.min = "0";
  playbackSlider.max = String(Math.max(0, frameCount - 1));
  playbackSlider.value = "0";
  playbackPlayBtn.disabled = frameCount <= 1;
  if (frameCount <= 1) {
    setPlaybackButtonVisual(playbackPlayBtn, false);
  }
}
