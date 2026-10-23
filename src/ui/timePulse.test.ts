import { describe, expect, it } from "vitest";

import { startTimePulse } from "./timePulse";

describe("time pulse", () => {
  it("sends the current time and supplied randomness on every animation frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    const random = () => 0.25;
    const receivedPulses: Array<{ now: number; random: () => number }> = [];
    const stop = startTimePulse(
      (now, pulseRandom) => receivedPulses.push({ now, random: pulseRandom }),
      {
        now: () => 1_234,
        random,
        requestFrame: (callback) => {
          callbacks.push(callback);
          return callbacks.length;
        },
        cancelFrame: () => undefined,
      },
    );

    callbacks[0]?.(0);
    callbacks[1]?.(16);

    expect(receivedPulses).toEqual([
      { now: 1_234, random },
      { now: 1_234, random },
    ]);

    stop();
  });

  it("cancels its pending frame when the screen unmounts", () => {
    const callbacks: FrameRequestCallback[] = [];
    const cancelledFrames: number[] = [];
    const stop = startTimePulse(() => undefined, {
      now: () => 1_234,
      random: () => 0,
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
