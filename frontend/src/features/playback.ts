import { PlaybackFrame } from "../core/types.js";

export type PlaybackRuntimeOptions = {
  frameDelayMs: number;
  loop: boolean;
};

export type PlaybackController = {
  setFrames: (frames: PlaybackFrame[]) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  isPlaying: () => boolean;
  setIndex: (index: number) => void;
  setOptions: (options: PlaybackRuntimeOptions) => void;
  onFrame: (handler: (frame: PlaybackFrame | null, index: number, total: number) => void) => void;
  currentIndex: () => number;
};

export function createPlaybackController(): PlaybackController {
  let frames: PlaybackFrame[] = [];
  let index = 0;
  let timer: number | null = null;
  let options: PlaybackRuntimeOptions = { frameDelayMs: 1000, loop: true };
  let frameHandler: (frame: PlaybackFrame | null, idx: number, total: number) => void = () => {};

  function notify(): void {
    frameHandler(frames[index] ?? null, index, frames.length);
  }

  function stopTimer(): void {
    if (timer != null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startTimer(): void {
    stopTimer();
    if (frames.length <= 1) return;
    timer = window.setInterval(() => {
      if (index >= frames.length - 1) {
        if (options.loop) {
          index = 0;
        } else {
          stopTimer();
        }
      } else {
        index += 1;
      }
      notify();
    }, options.frameDelayMs);
  }

  return {
    setFrames(nextFrames: PlaybackFrame[]) {
      frames = nextFrames;
      index = 0;
      stopTimer();
      notify();
    },
    play() {
      startTimer();
    },
    pause() {
      stopTimer();
    },
    toggle() {
      if (timer == null) startTimer();
      else stopTimer();
    },
    isPlaying() {
      return timer != null;
    },
    setIndex(nextIndex: number) {
      index = Math.max(0, Math.min(nextIndex, Math.max(0, frames.length - 1)));
      notify();
    },
    setOptions(nextOptions: PlaybackRuntimeOptions) {
      options = nextOptions;
      if (timer != null) startTimer();
    },
    onFrame(handler: (frame: PlaybackFrame | null, idx: number, total: number) => void) {
      frameHandler = handler;
      notify();
    },
    currentIndex() {
      return index;
    },
  };
}
