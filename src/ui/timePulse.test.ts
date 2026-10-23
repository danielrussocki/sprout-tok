import { describe, expect, it } from "vitest";

import { completeAction, startAction } from "../game/actions";
import { serializeGame } from "../game/save";
import { createNewGame } from "../game/world";
import { advanceTimePulse, startTimePulse } from "./timePulse";

describe("time pulse", () => {
  it("delegates pending crop growth to the pure time rule and preserves the result for saving", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0, 0),
      crops: [{ id: "crop-1", position: target, stage: 1 as const, growthReadyAt: null }],
    };
    const waitingGame = completeAction(
      startAction(game, "watering-1", "watering", target, 0),
      "watering-1",
      3_000,
    );

    expect(JSON.parse(serializeGame(waitingGame, 3_000)).crops).toEqual([
      { id: "crop-1", position: target, stage: 1, growthReadyAt: 63_000, lastWateredAt: 3_000 },
    ]);

    const grownGame = advanceTimePulse(waitingGame, 63_000, () => 0);

    expect(JSON.parse(serializeGame(grownGame, 63_000)).crops).toEqual([
      { id: "crop-1", position: target, stage: 2, growthReadyAt: null, lastWateredAt: 3_000 },
    ]);
  });

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
