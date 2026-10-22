import { describe, expect, it } from "vitest";

import {
  createNewGame,
  getInitialCropStage,
  getInteractionTargetAt,
  isOccupied,
  isWalkable,
} from "./world";

describe("createNewGame", () => {
  it("creates a bounded 8 by 6 map with walkable grass and soil parcels", () => {
    const game = createNewGame(() => 0);

    expect(game.map).toMatchObject({ width: 8, height: 6 });
    expect(game.map.tiles).toHaveLength(48);
    expect(game.map.tiles).toEqual(
      expect.arrayContaining([
        { position: { x: 0, y: 0 }, kind: "grass", walkable: true },
        { position: { x: 1, y: 1 }, kind: "soil", walkable: true, tilled: false },
        { position: { x: 2, y: 2 }, kind: "soil", walkable: true, tilled: false },
      ]),
    );
  });

  it("creates one parcel for every coordinate inside the map boundaries", () => {
    const game = createNewGame(() => 0);
    const positions = new Set(game.map.tiles.map(({ position }) => `${position.x},${position.y}`));

    for (let y = 0; y < game.map.height; y += 1) {
      for (let x = 0; x < game.map.width; x += 1) {
        expect(positions).toContain(`${x},${y}`);
      }
    }

    for (const { position } of game.map.tiles) {
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThan(game.map.width);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThan(game.map.height);
    }
  });

  it("places the character, initial trees, crops, and empty inventory", () => {
    const game = createNewGame(() => 0);

    expect(game.character).toEqual({
      position: { x: 0, y: 0 },
      facing: "east",
      state: "idle",
    });
    expect(game.trees).toEqual([
      { id: "tree-1", position: { x: 4, y: 1 }, status: "available" },
      { id: "tree-2", position: { x: 5, y: 4 }, status: "available" },
    ]);
    expect(game.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 1 },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: 1 },
    ]);
    expect(game.inventory).toEqual({ crop: 0 });
  });

  it.each([
    [1, 0.39],
    [2, 0.4],
    [3, 0.7],
    [4, 0.9],
  ] as const)(
    "assigns stage %i to initial crops from controlled random values",
    (stage, randomValue) => {
      const game = createNewGame(() => randomValue);

      expect(game.crops).toEqual([
        { id: "crop-1", position: { x: 1, y: 1 }, stage },
        { id: "crop-2", position: { x: 2, y: 1 }, stage },
      ]);
    },
  );
});

describe("getInitialCropStage", () => {
  it.each([
    [1, 0.39],
    [2, 0.4],
    [3, 0.7],
    [4, 0.9],
  ] as const)("assigns stage %i when the controlled random value is %d", (stage, randomValue) => {
    expect(getInitialCropStage(() => randomValue)).toBe(stage);
  });
});

describe("world queries", () => {
  it("recognizes walkable grass and soil inside the map", () => {
    const game = createNewGame(() => 0);

    expect(isWalkable(game, { x: 0, y: 0 })).toBe(true);
    expect(isWalkable(game, { x: 2, y: 2 })).toBe(true);
    expect(isWalkable(game, { x: -1, y: 0 })).toBe(false);
    expect(isWalkable(game, { x: 8, y: 0 })).toBe(false);
  });

  it("recognizes positions occupied by trees or crops", () => {
    const game = createNewGame(() => 0);

    expect(isOccupied(game, { x: 4, y: 1 })).toBe(true);
    expect(isOccupied(game, { x: 1, y: 1 })).toBe(true);
    expect(isOccupied(game, { x: 0, y: 0 })).toBe(false);
    expect(isWalkable(game, { x: 4, y: 1 })).toBe(false);
    expect(isWalkable(game, { x: 1, y: 1 })).toBe(false);
  });

  it("finds parcels, trees, and crops as interaction targets", () => {
    const game = createNewGame(() => 0);

    expect(getInteractionTargetAt(game, { x: 0, y: 0 })).toEqual({
      kind: "parcel",
      position: { x: 0, y: 0 },
    });
    expect(getInteractionTargetAt(game, { x: 4, y: 1 })).toEqual({
      kind: "tree",
      position: { x: 4, y: 1 },
    });
    expect(getInteractionTargetAt(game, { x: 1, y: 1 })).toEqual({
      kind: "crop",
      position: { x: 1, y: 1 },
    });
    expect(getInteractionTargetAt(game, { x: 8, y: 0 })).toBeUndefined();
  });
});
