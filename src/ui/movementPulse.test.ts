import { describe, expect, it } from "vitest";

import { startMovementPulse } from "./movementPulse";

describe("movement pulse", () => {
  it("sends the current time on every animation frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    const receivedTimes: number[] = [];
    const stop = startMovementPulse((now) => receivedTimes.push(now), {
      now: () => 1_234,
      requestFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancelFrame: () => undefined,
    });

    callbacks[0]?.(0);
    callbacks[1]?.(16);

    expect(receivedTimes).toEqual([1_234, 1_234]);

    stop();
  });

  it("cancels its pending frame when walking ends", () => {
    const callbacks: FrameRequestCallback[] = [];
    const cancelledFrames: number[] = [];
    const stop = startMovementPulse(() => undefined, {
      now: () => 1_234,
      requestFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancelFrame: (frameId) => cancelledFrames.push(frameId),
    });

    callbacks[0]?.(0);
    stop();
    callbacks[1]?.(16);

    expect(cancelledFrames).toEqual([2]);
  });
});
