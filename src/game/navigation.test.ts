import { describe, expect, it } from "vitest";

import { findClosestWalkableAdjacentParcel, isValidDestination } from "./navigation";
import { createNewGame } from "./world";

describe("isValidDestination", () => {
  it("accepts an empty walkable destination inside the map", () => {
    const game = createNewGame(() => 0);

    expect(isValidDestination(game, { x: 0, y: 1 })).toBe(true);
  });

  it.each([
    ["outside the western boundary", { x: -1, y: 0 }],
    ["outside the eastern boundary", { x: 8, y: 0 }],
    ["a tree", { x: 4, y: 1 }],
    ["a crop", { x: 1, y: 1 }],
  ])("rejects %s without moving the character", (_description, destination) => {
    const game = createNewGame(() => 0);
    const initialCharacter = structuredClone(game.character);

    expect(isValidDestination(game, destination)).toBe(false);
    expect(game.character).toEqual(initialCharacter);
  });
});

describe("findClosestWalkableAdjacentParcel", () => {
  it.each([
    ["north", { x: 0, y: 0 }, { x: 4, y: 0 }],
    ["east", { x: 7, y: 1 }, { x: 5, y: 1 }],
    ["south", { x: 4, y: 4 }, { x: 4, y: 2 }],
    ["west", { x: 1, y: 1 }, { x: 3, y: 1 }],
  ] as const)(
    "selects the closest walkable parcel to the %s of the target",
    (_direction, position, expected) => {
      const game = createNewGame(() => 0);
      game.crops = [];
      game.character.position = position;

      expect(findClosestWalkableAdjacentParcel(game, { x: 4, y: 1 })).toEqual(expected);
    },
  );

  it("breaks equal route distances in north, east, south, west order", () => {
    const game = createNewGame(() => 0);

    expect(findClosestWalkableAdjacentParcel(game, { x: 4, y: 1 })).toEqual({ x: 4, y: 0 });
  });

  it("returns undefined when no adjacent parcel is walkable", () => {
    const game = createNewGame(() => 0);
    game.trees.push(
      { id: "block-north", position: { x: 4, y: 0 }, status: "available" },
      { id: "block-east", position: { x: 5, y: 1 }, status: "available" },
      { id: "block-south", position: { x: 4, y: 2 }, status: "available" },
      { id: "block-west", position: { x: 3, y: 1 }, status: "available" },
    );

    expect(findClosestWalkableAdjacentParcel(game, { x: 4, y: 1 })).toBeUndefined();
  });
});
