export function createPlaybackController() {
    let frames = [];
    let index = 0;
    let timer = null;
    let options = { frameDelayMs: 1000, loop: true };
    let frameHandler = () => { };
    function notify() {
        frameHandler(frames[index] ?? null, index, frames.length);
    }
    function stopTimer() {
        if (timer != null) {
            window.clearInterval(timer);
            timer = null;
        }
    }
    function startTimer() {
        stopTimer();
        if (frames.length <= 1)
            return;
        timer = window.setInterval(() => {
            if (index >= frames.length - 1) {
                if (options.loop) {
                    index = 0;
                }
                else {
                    stopTimer();
                }
            }
            else {
                index += 1;
            }
            notify();
        }, options.frameDelayMs);
    }
    return {
        setFrames(nextFrames) {
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
            if (timer == null)
                startTimer();
            else
                stopTimer();
        },
        isPlaying() {
            return timer != null;
        },
        setIndex(nextIndex) {
            index = Math.max(0, Math.min(nextIndex, Math.max(0, frames.length - 1)));
            notify();
        },
        setOptions(nextOptions) {
            options = nextOptions;
            if (timer != null)
                startTimer();
        },
        onFrame(handler) {
            frameHandler = handler;
            notify();
        },
        currentIndex() {
            return index;
        },
    };
}
