import { describe, expect, it } from "vitest";

import { arriveAtDestination, assignDestination } from "./movement";
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
