interface TimePulseOptions {
  now: () => number;
  random: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frameId: number) => void;
}

const browserTimePulseOptions: TimePulseOptions = {
  now: () => Date.now(),
  random: () => Math.random(),
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
};

export function startTimePulse(
  onPulse: (now: number, random: () => number) => void,
  options: TimePulseOptions = browserTimePulseOptions,
): () => void {
  let stopped = false;
  let frameId: number | undefined;

  const pulse: FrameRequestCallback = () => {
    if (stopped) {
      return;
    }

    onPulse(options.now(), options.random);
    frameId = options.requestFrame(pulse);
  };

  frameId = options.requestFrame(pulse);

  return () => {
    stopped = true;

    if (frameId !== undefined) {
      options.cancelFrame(frameId);
    }
  };
}
