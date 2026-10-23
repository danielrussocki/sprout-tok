import { describe, expect, it } from "vitest";

import type { GameState } from "./model";
import {
  createNewGame,
  doesTreePlacementPreserveWalkableConnections,
  generateTree,
  getGrassParcelsWithoutAdjacentSoil,
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
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 1, growthReadyAt: null },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: 1, growthReadyAt: null },
    ]);
    expect(game.inventory).toEqual({ crop: 0 });
  });

  it("initializes the last tree generation attempt at the received time", () => {
    const game = createNewGame(() => 0, 1_767_225_300_000);

    expect(game.lastTreeGenerationAttemptAt).toBe(1_767_225_300_000);
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
        { id: "crop-1", position: { x: 1, y: 1 }, stage, growthReadyAt: null },
        { id: "crop-2", position: { x: 2, y: 1 }, stage, growthReadyAt: null },
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
  it("rejects a grass parcel diagonally adjacent to soil", () => {
    const game: GameState = {
      map: {
        width: 2,
        height: 2,
        tiles: [
          { position: { x: 0, y: 0 }, kind: "soil", walkable: true, tilled: false },
          { position: { x: 1, y: 0 }, kind: "grass", walkable: true },
          { position: { x: 0, y: 1 }, kind: "grass", walkable: true },
          { position: { x: 1, y: 1 }, kind: "grass", walkable: true },
        ],
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(getGrassParcelsWithoutAdjacentSoil(game)).not.toContainEqual({
      position: { x: 1, y: 1 },
      kind: "grass",
      walkable: true,
    });
  });

  it("excludes grass parcels adjacent to soil in every direction", () => {
    const game: GameState = {
      map: {
        width: 3,
        height: 3,
        tiles: [
          { position: { x: 0, y: 0 }, kind: "grass", walkable: true },
          { position: { x: 1, y: 0 }, kind: "grass", walkable: true },
          { position: { x: 2, y: 0 }, kind: "grass", walkable: true },
          { position: { x: 0, y: 1 }, kind: "grass", walkable: true },
          { position: { x: 1, y: 1 }, kind: "soil", walkable: true, tilled: false },
          { position: { x: 2, y: 1 }, kind: "grass", walkable: true },
          { position: { x: 0, y: 2 }, kind: "grass", walkable: true },
          { position: { x: 1, y: 2 }, kind: "grass", walkable: true },
          { position: { x: 2, y: 2 }, kind: "grass", walkable: true },
        ],
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(getGrassParcelsWithoutAdjacentSoil(game)).toEqual([]);
  });

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

describe("tree placement connectivity", () => {
  it("rejects a candidate that would block the only connection between walkable parcels", () => {
    const game: GameState = {
      map: {
        width: 3,
        height: 1,
        tiles: [
          { position: { x: 0, y: 0 }, kind: "grass", walkable: true },
          { position: { x: 1, y: 0 }, kind: "grass", walkable: true },
          { position: { x: 2, y: 0 }, kind: "grass", walkable: true },
        ],
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(doesTreePlacementPreserveWalkableConnections(game, { x: 1, y: 0 })).toBe(false);
  });

  it("accepts a candidate when the remaining walkable parcels stay connected", () => {
    const game: GameState = {
      map: {
        width: 3,
        height: 3,
        tiles: Array.from({ length: 9 }, (_, index) => ({
          position: { x: index % 3, y: Math.floor(index / 3) },
          kind: "grass" as const,
          walkable: true as const,
        })),
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(doesTreePlacementPreserveWalkableConnections(game, { x: 1, y: 1 })).toBe(true);
  });
});

describe("tree generation parcel validation", () => {
  it("keeps a grass parcel that has no adjacent soil", () => {
    const game: GameState = {
      map: {
        width: 3,
        height: 3,
        tiles: Array.from({ length: 9 }, (_, index) => ({
          position: { x: index % 3, y: Math.floor(index / 3) },
          kind: "grass" as const,
          walkable: true as const,
        })),
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(getGrassParcelsWithoutAdjacentSoil(game)).toContainEqual({
      position: { x: 1, y: 1 },
      kind: "grass",
      walkable: true,
    });
  });

  it.each([
    ["north", { x: 1, y: 0 }],
    ["east", { x: 2, y: 1 }],
    ["south", { x: 1, y: 2 }],
    ["west", { x: 0, y: 1 }],
    ["northwest", { x: 0, y: 0 }],
    ["northeast", { x: 2, y: 0 }],
    ["southeast", { x: 2, y: 2 }],
    ["southwest", { x: 0, y: 2 }],
  ] as const)("rejects grass with soil to the %s", (_side, soilPosition) => {
    const game: GameState = {
      map: {
        width: 3,
        height: 3,
        tiles: Array.from({ length: 9 }, (_, index) => {
          const position = { x: index % 3, y: Math.floor(index / 3) };

          return position.x === soilPosition.x && position.y === soilPosition.y
            ? { position, kind: "soil" as const, walkable: true as const, tilled: false }
            : { position, kind: "grass" as const, walkable: true as const };
        }),
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(getGrassParcelsWithoutAdjacentSoil(game)).not.toContainEqual({
      position: { x: 1, y: 1 },
      kind: "grass",
      walkable: true,
    });
  });

  it("keeps grass outside the eight positions around soil", () => {
    const game: GameState = {
      map: {
        width: 4,
        height: 4,
        tiles: Array.from({ length: 16 }, (_, index) => {
          const position = { x: index % 4, y: Math.floor(index / 4) };

          return position.x === 1 && position.y === 1
            ? { position, kind: "soil" as const, walkable: true as const, tilled: false }
            : { position, kind: "grass" as const, walkable: true as const };
        }),
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(getGrassParcelsWithoutAdjacentSoil(game)).toContainEqual({
      position: { x: 3, y: 3 },
      kind: "grass",
      walkable: true,
    });
  });
});

describe("generateTree", () => {
  it.each([
    [0, { x: 0, y: 0 }],
    [0.5, { x: 1, y: 1 }],
    [0.999, { x: 2, y: 2 }],
  ] as const)(
    "creates one available tree in the parcel selected by controlled randomness %d",
    (randomValue, expectedPosition) => {
      const game: GameState = {
        map: {
          width: 3,
          height: 3,
          tiles: Array.from({ length: 9 }, (_, index) => ({
            position: { x: index % 3, y: Math.floor(index / 3) },
            kind: "grass" as const,
            walkable: true as const,
          })),
        },
        character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
        trees: [],
        crops: [],
        inventory: { crop: 0 },
        lastTreeGenerationAttemptAt: 0,
      };

      const generatedGame = generateTree(game, () => randomValue);

      expect(generatedGame.trees).toEqual([
        { id: "tree-1", position: expectedPosition, status: "available" },
      ]);
    },
  );

  it("does not modify the game when there are no valid candidates", () => {
    const game: GameState = {
      map: {
        width: 1,
        height: 1,
        tiles: [{ position: { x: 0, y: 0 }, kind: "soil", walkable: true, tilled: false }],
      },
      character: { position: { x: 0, y: 0 }, facing: "east", state: "idle" },
      trees: [],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    expect(generateTree(game, () => 0)).toBe(game);
  });

  it("allows a generated tree to be adjacent to an existing tree", () => {
    const game: GameState = {
      map: {
        width: 3,
        height: 3,
        tiles: Array.from({ length: 9 }, (_, index) => ({
          position: { x: index % 3, y: Math.floor(index / 3) },
          kind: "grass" as const,
          walkable: true as const,
        })),
      },
      character: { position: { x: 2, y: 2 }, facing: "west", state: "idle" },
      trees: [{ id: "tree-1", position: { x: 0, y: 0 }, status: "available" }],
      crops: [],
      inventory: { crop: 0 },
      lastTreeGenerationAttemptAt: 0,
    };

    const generatedGame = generateTree(game, () => 0);

    expect(generatedGame.trees).toContainEqual({
      id: "tree-2",
      position: { x: 1, y: 0 },
      status: "available",
    });
  });

  it("does not modify the game when it already contains five available or reduced trees", () => {
    const game = createNewGame(() => 0);
    const trees = Array.from({ length: 5 }, (_, index) =>
      index === 4
        ? {
            id: `tree-${index + 1}`,
            position: { x: index, y: 5 },
            status: "reduced" as const,
            reducedAt: 0,
          }
        : {
            id: `tree-${index + 1}`,
            position: { x: index, y: 5 },
            status: "available" as const,
          },
    );

    const gameAtTreeLimit = { ...game, trees };

    expect(generateTree(gameAtTreeLimit, () => 0)).toBe(gameAtTreeLimit);
  });
});
