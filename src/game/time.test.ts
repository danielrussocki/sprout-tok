import { describe, expect, it, vi } from "vitest";

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

describe("normalizeTime", () => {
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

  it("blocks a crop before one minute has elapsed since its last valid watering", () => {
    const lastWateredAt = 10_000;

    expect(
      canWaterCrop(
        { id: "crop-1", position: { x: 1, y: 1 }, stage: 2, lastWateredAt },
        lastWateredAt + 60_000 - 1,
      ),
    ).toBe(false);
  });

  it("allows a crop at exactly one minute since its last valid watering", () => {
    const lastWateredAt = 10_000;

    expect(
      canWaterCrop(
        { id: "crop-1", position: { x: 1, y: 1 }, stage: 3, lastWateredAt },
        lastWateredAt + 60_000,
      ),
    ).toBe(true);
  });

  it("never allows a stage four crop to be watered", () => {
    expect(canWaterCrop({ id: "crop-1", position: { x: 1, y: 1 }, stage: 4 }, 10_000)).toBe(false);
  });
});
