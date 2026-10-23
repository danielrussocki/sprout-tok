import { describe, expect, it, vi } from "vitest";

import { completeAction, plantCrop, startAction } from "./actions";
import type { GameState } from "./model";
import { canWaterCrop, normalizeTime, treeGenerationIntervalMs } from "./time";
import { createNewGame } from "./world";

function createGameAtTreeLimit(): GameState {
  const game = createNewGame(() => 0, 0);

  return {
    ...game,
    trees: Array.from({ length: 5 }, (_, index) => ({
      id: `tree-${index + 1}`,
      position: { x: index, y: 5 },
      status: "available" as const,
    })),
  };
}

function createGameWithoutTreeCandidates(): GameState {
  const game = createNewGame(() => 0, 0);

  return {
    ...game,
    map: {
      ...game.map,
      tiles: game.map.tiles.map((parcel) =>
        parcel.kind === "grass"
          ? {
              position: parcel.position,
              kind: "soil" as const,
              walkable: true as const,
              tilled: false,
            }
          : parcel,
      ),
    },
  };
}

function createGameWithOnlyDiagonalGrassToSoil(): GameState {
  const game = createNewGame(() => 0, 0);

  return {
    ...game,
    trees: [],
    crops: [],
    map: {
      width: 3,
      height: 3,
      tiles: Array.from({ length: 9 }, (_, index) => {
        const position = { x: index % 3, y: Math.floor(index / 3) };
        const isGrassDiagonalToSoil =
          (position.x === 0 || position.x === 2) && (position.y === 0 || position.y === 2);

        return isGrassDiagonalToSoil
          ? { position, kind: "grass" as const, walkable: true as const }
          : { position, kind: "soil" as const, walkable: true as const, tilled: false };
      }),
    },
  };
}

describe("normalizeTime", () => {
  it("keeps a crop waiting before its growth minute expires", () => {
    const growthReadyAt = 160_000;
    const game = {
      ...createNewGame(() => 0, 100_000),
      crops: [{ id: "crop-1", position: { x: 1, y: 1 }, stage: 1 as const, growthReadyAt }],
    };

    const normalizedGame = normalizeTime(game, growthReadyAt - 1);

    expect(normalizedGame).toBe(game);
    expect(normalizedGame.crops[0]).toEqual({
      id: "crop-1",
      position: { x: 1, y: 1 },
      stage: 1,
      growthReadyAt,
    });
  });

  it("advances a crop at exactly its growth minute and clears the wait", () => {
    const growthReadyAt = 160_000;
    const game = {
      ...createNewGame(() => 0, 100_000),
      crops: [{ id: "crop-1", position: { x: 1, y: 1 }, stage: 2 as const, growthReadyAt }],
    };

    const normalizedGame = normalizeTime(game, growthReadyAt);

    expect(normalizedGame.crops[0]).toEqual({
      id: "crop-1",
      position: { x: 1, y: 1 },
      stage: 3,
      growthReadyAt: null,
    });
  });

  it("advances a crop when its growth minute has already expired", () => {
    const growthReadyAt = 160_000;
    const game = {
      ...createNewGame(() => 0, 100_000),
      crops: [{ id: "crop-1", position: { x: 1, y: 1 }, stage: 3 as const, growthReadyAt }],
    };

    const normalizedGame = normalizeTime(game, growthReadyAt + 1);

    expect(normalizedGame.crops[0]).toEqual({
      id: "crop-1",
      position: { x: 1, y: 1 },
      stage: 4,
      growthReadyAt: null,
    });
  });

  it("makes a planted crop harvestable after three completed growth waits", () => {
    const target = { x: 1, y: 2 };
    const game = createNewGame(() => 0);
    const tilledGame = {
      ...game,
      map: {
        ...game.map,
        tiles: game.map.tiles.map((parcel) =>
          parcel.position.x === target.x && parcel.position.y === target.y
            ? { ...parcel, tilled: true }
            : parcel,
        ),
      },
    };
    const plantedGame = plantCrop(tilledGame, target);

    const afterFirstWait = normalizeTime(
      completeAction(
        startAction(plantedGame, "watering-1", "watering", target, 1_000),
        "watering-1",
        4_000,
      ),
      64_000,
    );
    const afterSecondWait = normalizeTime(
      completeAction(
        startAction(afterFirstWait, "watering-2", "watering", target, 65_000),
        "watering-2",
        68_000,
      ),
      128_000,
    );
    const afterThirdWait = normalizeTime(
      completeAction(
        startAction(afterSecondWait, "watering-3", "watering", target, 129_000),
        "watering-3",
        132_000,
      ),
      192_000,
    );

    expect(afterFirstWait.crops.find((crop) => crop.id === "crop-3")).toMatchObject({
      stage: 2,
      growthReadyAt: null,
    });
    expect(afterSecondWait.crops.find((crop) => crop.id === "crop-3")).toMatchObject({
      stage: 3,
      growthReadyAt: null,
    });
    expect(afterThirdWait.crops.find((crop) => crop.id === "crop-3")).toMatchObject({
      stage: 4,
      growthReadyAt: null,
    });
  });

  it("advances each crop with a due growth wait once and clears only its wait", () => {
    const now = 10_000;
    const game = {
      ...createNewGame(() => 0, now),
      crops: [
        {
          id: "crop-due-stage-one",
          position: { x: 1, y: 1 },
          stage: 1 as const,
          growthReadyAt: now,
        },
        {
          id: "crop-due-stage-three",
          position: { x: 2, y: 1 },
          stage: 3 as const,
          growthReadyAt: now - 1,
        },
        {
          id: "crop-waiting",
          position: { x: 1, y: 2 },
          stage: 2 as const,
          growthReadyAt: now + 1,
        },
      ],
    };

    const normalizedGame = normalizeTime(game, now);

    expect(normalizedGame.crops).toEqual([
      {
        id: "crop-due-stage-one",
        position: { x: 1, y: 1 },
        stage: 2,
        growthReadyAt: null,
      },
      {
        id: "crop-due-stage-three",
        position: { x: 2, y: 1 },
        stage: 4,
        growthReadyAt: null,
      },
      {
        id: "crop-waiting",
        position: { x: 1, y: 2 },
        stage: 2,
        growthReadyAt: now + 1,
      },
    ]);
  });

  it("generates a tree and records the attempt at the exact five-minute interval", () => {
    const game = createNewGame(() => 0, 0);

    const normalizedGame = normalizeTime(game, treeGenerationIntervalMs, () => 0);

    expect(normalizedGame.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs);
    expect(normalizedGame.trees).toHaveLength(3);
    expect(normalizedGame.trees.at(-1)).toMatchObject({ status: "available" });
  });

  it("waits another five minutes after an attempt blocked by the tree limit", () => {
    const game = createGameAtTreeLimit();

    const afterFirstAttempt = normalizeTime(game, treeGenerationIntervalMs, () => 0);
    const beforeNextAttempt = normalizeTime(
      afterFirstAttempt,
      treeGenerationIntervalMs * 2 - 1,
      () => 0,
    );
    const afterNextAttempt = normalizeTime(
      afterFirstAttempt,
      treeGenerationIntervalMs * 2,
      () => 0,
    );

    expect(afterFirstAttempt.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs);
    expect(beforeNextAttempt).toBe(afterFirstAttempt);
    expect(afterNextAttempt.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs * 2);
    expect(afterNextAttempt.trees).toEqual(game.trees);
  });

  it("waits another five minutes after an attempt without valid candidates", () => {
    const game = createGameWithoutTreeCandidates();
    const random = vi.fn(() => 0);

    const afterFirstAttempt = normalizeTime(game, treeGenerationIntervalMs, random);
    const beforeNextAttempt = normalizeTime(
      afterFirstAttempt,
      treeGenerationIntervalMs * 2 - 1,
      random,
    );
    const afterNextAttempt = normalizeTime(afterFirstAttempt, treeGenerationIntervalMs * 2, random);

    expect(afterFirstAttempt.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs);
    expect(afterFirstAttempt.trees).toEqual(game.trees);
    expect(beforeNextAttempt).toBe(afterFirstAttempt);
    expect(afterNextAttempt.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs * 2);
    expect(afterNextAttempt.trees).toEqual(game.trees);
    expect(random).not.toHaveBeenCalled();
  });

  it("records a failed attempt when every grass parcel is diagonal to soil and waits another interval", () => {
    const game = createGameWithOnlyDiagonalGrassToSoil();
    const random = vi.fn(() => 0);

    const afterFirstAttempt = normalizeTime(game, treeGenerationIntervalMs, random);
    const beforeNextAttempt = normalizeTime(
      afterFirstAttempt,
      treeGenerationIntervalMs * 2 - 1,
      random,
    );

    expect(afterFirstAttempt.trees).toEqual([]);
    expect(afterFirstAttempt.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs);
    expect(beforeNextAttempt).toBe(afterFirstAttempt);
    expect(random).not.toHaveBeenCalled();
  });

  it("processes every elapsed generation interval in chronological order", () => {
    const game = createNewGame(() => 0, 0);
    const random = vi.fn(() => 0);

    const normalizedGame = normalizeTime(game, treeGenerationIntervalMs * 3, random);

    expect(normalizedGame.lastTreeGenerationAttemptAt).toBe(treeGenerationIntervalMs * 3);
    expect(normalizedGame.trees).toHaveLength(5);
    expect(random).toHaveBeenCalledTimes(3);
  });

  it("keeps a reduced tree before five minutes have elapsed", () => {
    const reducedAt = 1_000;
    const game = {
      ...createNewGame(() => 0),
      trees: [
        {
          id: "tree-1",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt,
        },
      ],
    };

    const normalizedGame = normalizeTime(game, reducedAt + 5 * 60 * 1_000 - 1);

    expect(normalizedGame).toBe(game);
    expect(normalizedGame.trees).toEqual(game.trees);
  });

  it("removes a reduced tree at exactly five minutes after its reduction", () => {
    const reducedAt = 1_000;
    const game = {
      ...createNewGame(() => 0),
      trees: [
        {
          id: "tree-1",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt,
        },
        { id: "tree-2", position: { x: 5, y: 4 }, status: "available" as const },
      ],
    };

    const normalizedGame = normalizeTime(game, reducedAt + 5 * 60 * 1_000);

    expect(normalizedGame.trees).toEqual([
      { id: "tree-2", position: { x: 5, y: 4 }, status: "available" },
    ]);
  });

  it("removes a reduced tree after five minutes have elapsed", () => {
    const reducedAt = 1_000;
    const game = {
      ...createNewGame(() => 0),
      trees: [
        {
          id: "tree-1",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt,
        },
      ],
    };

    const normalizedGame = normalizeTime(game, reducedAt + 5 * 60 * 1_000 + 1);

    expect(normalizedGame.trees).toEqual([]);
  });
});

describe("canWaterCrop", () => {
  it.each([1, 2, 3] as const)("allows a stage %i crop that has never been watered", (stage) => {
    expect(canWaterCrop({ id: `crop-${stage}`, position: { x: 1, y: 1 }, stage }, 10_000)).toBe(
      true,
    );
  });

  it("blocks a crop with a pending growth wait", () => {
    const growthReadyAt = 70_000;

    expect(
      canWaterCrop(
        { id: "crop-1", position: { x: 1, y: 1 }, stage: 2, growthReadyAt },
        growthReadyAt,
      ),
    ).toBe(false);
  });

  it("never allows a stage four crop to be watered", () => {
    expect(canWaterCrop({ id: "crop-1", position: { x: 1, y: 1 }, stage: 4 }, 10_000)).toBe(false);
  });
});
