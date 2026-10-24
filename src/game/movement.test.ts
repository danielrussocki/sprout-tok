import { describe, expect, it } from "vitest";

import { advanceMovementUntil, arriveAtDestination, assignDestination } from "./movement";
import { createNewGame } from "./world";

describe("assignDestination", () => {
  it("changes an idle character to walking and stores an ordered route without moving it", () => {
    const game = createNewGame(() => 0);

    const updatedGame = assignDestination(game, { x: 2, y: 0 });

    expect(updatedGame.character).toEqual({ ...game.character, state: "walking" });
    expect(updatedGame.destination).toEqual({ x: 2, y: 0 });
    expect(updatedGame.route).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(game.character.state).toBe("idle");
    expect(game.destination).toBeUndefined();
    expect(game.route).toBeUndefined();
  });

  it("replaces the previous destination and pending interaction with the latest selection", () => {
    const gameWithPendingInteraction = assignDestination(
      createNewGame(() => 0),
      { x: 4, y: 0 },
      { kind: "tree", position: { x: 4, y: 1 } },
    );

    const updatedGame = assignDestination(gameWithPendingInteraction, { x: 0, y: 1 });

    expect(updatedGame.destination).toEqual({ x: 0, y: 1 });
    expect(updatedGame.pendingTarget).toBeUndefined();
    expect(updatedGame.character.state).toBe("walking");
  });

  it("keeps only the latest pending interaction when orders target different objects", () => {
    const gameWithTreeOrder = assignDestination(
      createNewGame(() => 0),
      { x: 4, y: 0 },
      { kind: "tree", position: { x: 4, y: 1 } },
    );

    const updatedGame = assignDestination(
      gameWithTreeOrder,
      { x: 1, y: 0 },
      { kind: "crop", position: { x: 1, y: 1 } },
    );

    expect(updatedGame.destination).toEqual({ x: 1, y: 0 });
    expect(updatedGame.pendingTarget).toEqual({ kind: "crop", position: { x: 1, y: 1 } });
    expect(updatedGame.pendingTarget).not.toEqual(gameWithTreeOrder.pendingTarget);
  });

  it("starts a replacement route from the continuous position without a diagonal segment", () => {
    const walkingGame = advanceMovementUntil(
      assignDestination(
        createNewGame(() => 0),
        { x: 2, y: 0 },
        undefined,
        1_000,
      ),
      1_175,
    );

    const updatedGame = assignDestination(walkingGame, { x: 0, y: 2 }, undefined, 1_175);

    expect(updatedGame.character.position).toEqual({ x: 0, y: 0 });
    expect(updatedGame.destination).toEqual({ x: 0, y: 2 });
    expect(updatedGame.movement).toMatchObject({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
      lastAdvancedAt: 1_175,
    });
    expect(updatedGame.route).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ]);
  });

  it("replaces the pending target while preserving the current continuous route origin", () => {
    const walkingGame = advanceMovementUntil(
      assignDestination(
        createNewGame(() => 0),
        { x: 4, y: 0 },
        { kind: "tree", position: { x: 4, y: 1 } },
        1_000,
      ),
      1_175,
    );

    const updatedGame = assignDestination(
      walkingGame,
      { x: 1, y: 0 },
      { kind: "crop", position: { x: 1, y: 1 } },
      1_175,
    );

    expect(updatedGame.pendingTarget).toEqual({ kind: "crop", position: { x: 1, y: 1 } });
    expect(updatedGame.movement).toEqual({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
      remainingRoute: [],
      lastAdvancedAt: 1_175,
    });
  });
});

describe("arriveAtDestination", () => {
  it("advances the logical position by one route parcel and keeps walking", () => {
    const game = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
    );

    const updatedGame = arriveAtDestination(game);

    expect(updatedGame.character).toEqual({
      position: { x: 1, y: 0 },
      facing: "east",
      state: "walking",
    });
    expect(updatedGame.destination).toEqual({ x: 2, y: 0 });
    expect(updatedGame.route).toEqual([{ x: 2, y: 0 }]);
  });

  it("becomes idle only after confirming the final route parcel", () => {
    const game = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
    );

    const afterFirstArrival = arriveAtDestination(game);
    const afterFinalArrival = arriveAtDestination(afterFirstArrival);

    expect(afterFirstArrival.character.state).toBe("walking");
    expect(afterFirstArrival.destination).toEqual({ x: 2, y: 0 });
    expect(afterFinalArrival.character).toEqual({
      position: { x: 2, y: 0 },
      facing: "east",
      state: "idle",
    });
    expect(afterFinalArrival.destination).toBeUndefined();
    expect(afterFinalArrival.route).toBeUndefined();
  });

  it("faces an adjacent pending target after arriving", () => {
    const game = assignDestination(
      {
        ...createNewGame(() => 0),
        character: { position: { x: 3, y: 0 }, facing: "east", state: "idle" },
      },
      { x: 4, y: 0 },
      { kind: "tree", position: { x: 4, y: 1 } },
    );

    const updatedGame = arriveAtDestination(game);

    expect(updatedGame.character).toEqual({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "idle",
    });
    expect(updatedGame.pendingTarget).toEqual({ kind: "tree", position: { x: 4, y: 1 } });
  });
});

describe("advanceMovementUntil", () => {
  it("processes arrivals and running consumption before continuing on foot after exhaustion", () => {
    const runningGame = {
      ...assignDestination(
        createNewGame(() => 0),
        { x: 7, y: 0 },
        undefined,
        1_000,
      ),
      character: {
        ...createNewGame(() => 0).character,
        state: "running" as const,
      },
      stamina: {
        value: 13,
        recoveryProgressMs: 0,
        runningProgressMs: 0,
      },
    };

    const updatedGame = advanceMovementUntil(runningGame, 2_175);

    expect(updatedGame.character).toEqual({
      position: { x: 6, y: 0 },
      facing: "east",
      state: "walking",
    });
    expect(updatedGame.stamina).toEqual({
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
    expect(updatedGame.movement).toEqual({
      continuousPosition: { x: 87 / 14, y: 0 },
      activeSegment: { start: { x: 87 / 14, y: 0 }, end: { x: 7, y: 0 } },
      remainingRoute: [],
      lastAdvancedAt: 2_175,
    });
    expect(updatedGame.route).toEqual([{ x: 7, y: 0 }]);
  });

  it("moves twice as far while running as while walking over the same route and duration", () => {
    const walkingGame = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      undefined,
      1_000,
    );
    const runningGame = {
      ...walkingGame,
      character: { ...walkingGame.character, state: "running" as const },
    };

    const afterWalking = advanceMovementUntil(walkingGame, 1_087.5);
    const afterRunning = advanceMovementUntil(runningGame, 1_087.5);

    expect(afterWalking.movement?.continuousPosition).toEqual({ x: 0.25, y: 0 });
    expect(afterRunning.movement?.continuousPosition).toEqual({ x: 0.5, y: 0 });
    expect(afterRunning.route).toEqual(walkingGame.route);
  });

  it("updates the continuous position without confirming the next parcel before it is reached", () => {
    const walkingGame = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      undefined,
      1_000,
    );

    const updatedGame = advanceMovementUntil(walkingGame, 1_175);

    expect(updatedGame.character).toEqual({
      position: { x: 0, y: 0 },
      facing: "east",
      state: "walking",
    });
    expect(updatedGame.movement).toEqual({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
      remainingRoute: [{ x: 2, y: 0 }],
      lastAdvancedAt: 1_175,
    });
  });

  it("accumulates continuous displacement across consecutive pulses", () => {
    const walkingGame = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      undefined,
      1_000,
    );
    const afterFirstPulse = advanceMovementUntil(walkingGame, 1_016);
    const afterSecondPulse = advanceMovementUntil(afterFirstPulse, 1_032);

    expect(afterFirstPulse.movement?.continuousPosition.x).toBeCloseTo(16 / 350);
    expect(afterSecondPulse.movement?.continuousPosition).toEqual({
      x: 32 / 350,
      y: 0,
    });
    expect(afterSecondPulse.movement?.activeSegment.start).toEqual({ x: 32 / 350, y: 0 });
    expect(afterSecondPulse.character.position).toEqual({ x: 0, y: 0 });
  });

  it("confirms every reached route parcel and completes the route in one time advance", () => {
    const walkingGame = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      undefined,
      1_000,
    );

    const updatedGame = advanceMovementUntil(walkingGame, 1_700);

    expect(updatedGame.character).toEqual({
      position: { x: 2, y: 0 },
      facing: "east",
      state: "idle",
    });
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.route).toBeUndefined();
    expect(updatedGame.movement).toBeUndefined();
  });
});
