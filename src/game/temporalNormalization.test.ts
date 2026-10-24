import { describe, expect, it } from "vitest";

import { advanceMovement, selectPosition } from "./commands";
import { createNewGame } from "./world";

describe("temporal stamina normalization", () => {
  it("allows a running request when recovery raises stamina from 12 to 13 at the same time", () => {
    const gameBeforeRecovery = {
      ...createNewGame(() => 0, 0),
      stamina: {
        value: 12,
        recoveryProgressMs: 14_999,
        runningProgressMs: 0,
      },
    };
    const walkingGame = selectPosition(gameBeforeRecovery, { x: 2, y: 0 }, 1);

    const runningGame = selectPosition(walkingGame, { x: 2, y: 0 }, 1);

    expect(runningGame.character.state).toBe("running");
    expect(runningGame.stamina).toMatchObject({ value: 13, recoveryProgressMs: 0 });
  });

  it("applies walking recovery while advancing a movement pulse", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0, 0),
      { x: 2, y: 0 },
      0,
    );
    const gameBeforeRecovery = {
      ...walkingGame,
      stamina: {
        ...walkingGame.stamina!,
        value: 12,
        recoveryProgressMs: 29_999,
      },
    };

    const advancedGame = advanceMovement(gameBeforeRecovery, 1);

    expect(advancedGame.stamina).toMatchObject({ value: 13, recoveryProgressMs: 0 });
    expect(advancedGame.movement?.lastAdvancedAt).toBe(1);
  });

  it("processes consumption, exhaustion, arrivals, and recovery in a large movement pulse", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0, 0),
      { x: 7, y: 0 },
      0,
    );
    const gameBeforeRunning = {
      ...walkingGame,
      stamina: {
        value: 13,
        recoveryProgressMs: 29_900,
        runningProgressMs: 800,
      },
    };
    const runningGame = selectPosition(gameBeforeRunning, { x: 7, y: 0 }, 0);

    const advancedGame = advanceMovement(runningGame, 3_000);

    expect(advancedGame.character).toEqual({
      position: { x: 7, y: 0 },
      facing: "east",
      state: "idle",
    });
    expect(advancedGame.destination).toBeUndefined();
    expect(advancedGame.movement).toBeUndefined();
    expect(advancedGame.stamina).toEqual({
      value: 13,
      recoveryProgressMs: 2_700,
      runningProgressMs: 0,
    });
  });
});
