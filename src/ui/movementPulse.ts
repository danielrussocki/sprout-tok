interface MovementPulseOptions {
  now: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frameId: number) => void;
}

const browserMovementPulseOptions: MovementPulseOptions = {
  now: () => Date.now(),
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (frameId) => window.cancelAnimationFrame(frameId),
};

export function startMovementPulse(
  onPulse: (now: number) => void,
  options: MovementPulseOptions = browserMovementPulseOptions,
): () => void {
  let stopped = false;
  let frameId: number | undefined;

  const pulse: FrameRequestCallback = () => {
    if (stopped) {
      return;
    }

    onPulse(options.now());
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
