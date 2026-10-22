import { describe, expect, it } from "vitest";

import { arriveAtDestination, assignDestination } from "./movement";
import { createNewGame } from "./world";

describe("assignDestination", () => {
  it("changes an idle character to walking and stores its destination", () => {
    const game = createNewGame(() => 0);

    const updatedGame = assignDestination(game, { x: 0, y: 1 });

    expect(updatedGame).toEqual({
      ...game,
      character: { ...game.character, state: "walking" },
      destination: { x: 0, y: 1 },
    });
    expect(game.character.state).toBe("idle");
    expect(game.destination).toBeUndefined();
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
  it("moves the character to its destination and returns it to idle", () => {
    const game = assignDestination(
      createNewGame(() => 0),
      { x: 0, y: 1 },
    );

    const updatedGame = arriveAtDestination(game);

    expect(updatedGame.character).toEqual({
      position: { x: 0, y: 1 },
      facing: "east",
      state: "idle",
    });
    expect(updatedGame.destination).toBeUndefined();
  });

  it("faces an adjacent pending target after arriving", () => {
    const game = assignDestination(
      createNewGame(() => 0),
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
