import { describe, expect, it } from "vitest";

import { canWaterCrop, normalizeTime } from "./time";
import { createNewGame } from "./world";

describe("normalizeTime", () => {
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
