import { describe, expect, it, vi } from "vitest";

import { createSaveData, parseSaveData, restoreGame, saveVersion, serializeGame } from "./save";
import { resultMessages } from "./messages";
import {
  canWaterCrop,
  reducedTreeDurationMs,
  treeGenerationIntervalMs,
  wateringCooldownMs,
} from "./time";
import { createNewGame } from "./world";

describe("versioned game saves", () => {
  it("serializes and parses a version 4 save with stamina progress, a pending crop growth wait, and logs", () => {
    const savedAt = 1_767_225_600_000;
    const growthReadyAt = savedAt + wateringCooldownMs;
    const game = {
      ...createNewGame(() => 0),
      stamina: {
        value: 12,
        recoveryProgressMs: 9_000,
        runningProgressMs: 450,
      },
      inventory: { crop: 2, log: 4 },
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt,
        },
      ],
    };

    const saveData = createSaveData(game, savedAt);

    expect(saveVersion).toBe(4);
    expect(saveData).toMatchObject({
      version: 4,
      stamina: {
        value: 12,
        recoveryProgressMs: 9_000,
        runningProgressMs: 450,
      },
      crops: [{ id: "crop-1", stage: 2, growthReadyAt }],
      inventory: { crop: 2, log: 4 },
    });
    expect(parseSaveData(JSON.stringify(saveData))).toEqual(saveData);
  });

  it("restores logs obtained before closing the game", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0, savedAt),
      inventory: { crop: 2, log: 3 },
    };

    const restored = restoreGame(serializeGame(game, savedAt), savedAt, () => 0.99);

    expect(restored.inventory).toEqual({ crop: 2, log: 3 });
  });

  it.each([
    "invalid save",
    JSON.stringify({
      ...createSaveData(
        createNewGame(() => 0),
        1_767_225_600_000,
      ),
      version: saveVersion - 1,
    }),
  ])("starts a new game with a Spanish message for invalid or incompatible saves", (serialized) => {
    const restored = restoreGame(serialized, 1_767_225_600_000, () => 0.99);

    expect(restored).toMatchObject({
      character: { state: "idle" },
      inventory: { crop: 0, log: 0 },
      message: resultMessages.invalidSave,
    });
  });

  it.each([
    (saveData: ReturnType<typeof createSaveData>) => {
      const { log: _, ...inventoryWithoutLogs } = saveData.inventory;

      return { ...saveData, inventory: inventoryWithoutLogs };
    },
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      inventory: { ...saveData.inventory, log: -1 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      inventory: { ...saveData.inventory, log: 1.5 },
    }),
  ])("safely discards version 3 saves without a valid log count", (createInvalidSave) => {
    const savedAt = 1_767_225_600_000;
    const serialized = JSON.stringify(
      createInvalidSave(
        createSaveData(
          createNewGame(() => 0),
          savedAt,
        ),
      ),
    );

    expect(parseSaveData(serialized)).toBeUndefined();
    expect(restoreGame(serialized, savedAt, () => 0.99).message).toBe(resultMessages.invalidSave);
  });

  it.each([
    (saveData: ReturnType<typeof createSaveData>) => {
      const { stamina: _, ...saveWithoutStamina } = saveData;

      return saveWithoutStamina;
    },
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { ...saveData.stamina, value: 12.5 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { ...saveData.stamina, value: 37 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { ...saveData.stamina, recoveryProgressMs: 1.5 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { ...saveData.stamina, recoveryProgressMs: 30_000 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { ...saveData.stamina, runningProgressMs: -1 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { ...saveData.stamina, runningProgressMs: 1_000 },
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      stamina: { value: 36, recoveryProgressMs: 1, runningProgressMs: 0 },
    }),
  ])(
    "safely discards saves with missing, invalid, out-of-range, or incompatible stamina",
    (createInvalidSave) => {
      const savedAt = 1_767_225_600_000;
      const serialized = JSON.stringify(
        createInvalidSave(
          createSaveData(
            createNewGame(() => 0),
            savedAt,
          ),
        ),
      );
      const restored = restoreGame(serialized, savedAt, () => 0.99);

      expect(parseSaveData(serialized)).toBeUndefined();
      expect(restored).toMatchObject({
        stamina: { value: 36, recoveryProgressMs: 0, runningProgressMs: 0 },
        message: resultMessages.invalidSave,
      });
    },
  );

  it.each([
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      crops: saveData.crops.map((crop) => {
        const cropWithoutGrowthWait = { ...crop };
        delete cropWithoutGrowthWait.growthReadyAt;

        return cropWithoutGrowthWait;
      }),
    }),
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      crops: saveData.crops.map((crop) => ({ ...crop, growthReadyAt: -1 })),
    }),
  ])("safely discards version 2 saves without valid crop growth waits", (createInvalidSave) => {
    const savedAt = 1_767_225_600_000;
    const serialized = JSON.stringify(
      createInvalidSave(
        createSaveData(
          createNewGame(() => 0),
          savedAt,
        ),
      ),
    );

    expect(parseSaveData(serialized)).toBeUndefined();
    expect(restoreGame(serialized, savedAt, () => 0.99).message).toBe(resultMessages.invalidSave);
  });

  it("serializes versioned persistent game data, including time markers", () => {
    const game = {
      ...createNewGame(() => 0),
      map: {
        ...createNewGame(() => 0).map,
        tiles: createNewGame(() => 0).map.tiles.map((parcel) =>
          parcel.kind === "soil" && parcel.position.x === 1 && parcel.position.y === 2
            ? { ...parcel, tilled: true }
            : parcel,
        ),
      },
      character: {
        position: { x: 3, y: 2 },
        facing: "south" as const,
        state: "walking" as const,
      },
      trees: [
        {
          id: "tree-1",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt: 1_767_225_300_000,
        },
      ],
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt: null,
          lastWateredAt: 1_767_225_540_000,
        },
      ],
      inventory: { crop: 3, log: 0 },
      destination: { x: 3, y: 3 },
      movement: {
        continuousPosition: { x: 2.5, y: 2 },
        activeSegment: { start: { x: 2, y: 2 }, end: { x: 3, y: 2 } },
        remainingRoute: [{ x: 4, y: 2 }],
        lastAdvancedAt: 1_767_225_599_500,
      },
      pendingTarget: { kind: "tree" as const, position: { x: 4, y: 1 } },
      activeAction: {
        id: "action-1",
        kind: "chopping" as const,
        target: { x: 4, y: 1 },
        completesAt: 1_767_225_543_000,
      },
      message: "Esta acción no está disponible.",
    };

    const savedAt = 1_767_225_600_000;
    const saveData = createSaveData(game, savedAt);

    expect(saveData).toEqual({
      version: saveVersion,
      savedAt,
      lastTreeGenerationAttemptAt: game.lastTreeGenerationAttemptAt,
      map: game.map,
      character: game.character,
      stamina: game.stamina,
      trees: game.trees,
      crops: game.crops,
      inventory: game.inventory,
    });
    expect(JSON.parse(serializeGame(game, savedAt))).toEqual(saveData);
  });

  it("loads a valid versioned save without losing map, inventory, or time markers", () => {
    const game = {
      ...createNewGame(() => 0),
      trees: [
        {
          id: "tree-1",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt: 1_767_225_300_000,
        },
      ],
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 3 as const,
          growthReadyAt: null,
          lastWateredAt: 1_767_225_540_000,
        },
      ],
      inventory: { crop: 12, log: 0 },
    };
    const saveData = createSaveData(game, 1_767_225_600_000);

    expect(parseSaveData(JSON.stringify(saveData))).toEqual(saveData);
  });

  it("persists and restores the last tree generation attempt marker", () => {
    const savedAt = 1_767_225_600_000;
    const lastTreeGenerationAttemptAt = savedAt - 120_000;
    const game = {
      ...createNewGame(() => 0),
      lastTreeGenerationAttemptAt,
    };
    const saveData = createSaveData(game, savedAt);

    expect(saveData).toMatchObject({ lastTreeGenerationAttemptAt });
    expect(parseSaveData(JSON.stringify(saveData))).toMatchObject({
      lastTreeGenerationAttemptAt,
    });
    expect(restoreGame(JSON.stringify(saveData), savedAt).lastTreeGenerationAttemptAt).toBe(
      lastTreeGenerationAttemptAt,
    );
  });

  it.each([
    (saveData: ReturnType<typeof createSaveData>) => {
      const { lastTreeGenerationAttemptAt: _, ...saveWithoutMarker } = saveData;

      return saveWithoutMarker;
    },
    (saveData: ReturnType<typeof createSaveData>) => ({
      ...saveData,
      lastTreeGenerationAttemptAt: -1,
    }),
  ])(
    "safely discards saves without a valid tree generation attempt marker",
    (createInvalidSave) => {
      const savedAt = 1_767_225_600_000;
      const serialized = JSON.stringify(
        createInvalidSave(
          createSaveData(
            createNewGame(() => 0),
            savedAt,
          ),
        ),
      );
      const restored = restoreGame(serialized, savedAt, () => 0.99);

      expect(parseSaveData(serialized)).toBeUndefined();
      expect(restored.message).toBe(resultMessages.invalidSave);
    },
  );

  it("restores valid persistent data while discarding transient character work", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0),
      map: {
        ...createNewGame(() => 0).map,
        tiles: createNewGame(() => 0).map.tiles.map((parcel) =>
          parcel.kind === "soil" && parcel.position.x === 1 && parcel.position.y === 2
            ? { ...parcel, tilled: true }
            : parcel,
        ),
      },
      character: {
        position: { x: 3, y: 2 },
        facing: "south" as const,
        state: "chopping" as const,
      },
      trees: [{ id: "tree-1", position: { x: 4, y: 1 }, status: "available" as const }],
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt: null,
          lastWateredAt: savedAt - 30_000,
        },
      ],
      inventory: { crop: 7, log: 0 },
      destination: { x: 4, y: 2 },
      pendingTarget: { kind: "tree" as const, position: { x: 4, y: 1 } },
      activeAction: {
        id: "action-1",
        kind: "chopping" as const,
        target: { x: 4, y: 1 },
        completesAt: savedAt + 3_000,
      },
    };

    const restored = restoreGame(serializeGame(game, savedAt), savedAt + 1_000);

    expect(restored).toMatchObject({
      map: game.map,
      character: { position: { x: 3, y: 2 }, facing: "south", state: "idle" },
      trees: game.trees,
      crops: game.crops,
      inventory: { crop: 7, log: 0 },
    });
    expect(restored.destination).toBeUndefined();
    expect(restored.pendingTarget).toBeUndefined();
    expect(restored.activeAction).toBeUndefined();
  });

  it("recovers stamina with the idle cadence while the game is closed", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0, savedAt),
      character: {
        position: { x: 3, y: 2 },
        facing: "south" as const,
        state: "walking" as const,
      },
      stamina: {
        value: 12,
        recoveryProgressMs: 9_000,
        runningProgressMs: 450,
      },
    };

    const restored = restoreGame(serializeGame(game, savedAt), savedAt + 6_000);

    expect(restored.character.state).toBe("idle");
    expect(restored.stamina).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 450,
    });
  });

  it("discards remaining closed-time recovery progress on reaching maximum stamina", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0, savedAt),
      stamina: {
        value: 35,
        recoveryProgressMs: 14_000,
        runningProgressMs: 450,
      },
    };

    const restored = restoreGame(serializeGame(game, savedAt), savedAt + 31_000);

    expect(restored.stamina).toEqual({
      value: 36,
      recoveryProgressMs: 0,
      runningProgressMs: 450,
    });
  });

  it("persists an active run as idle when restoring", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0, savedAt),
      character: {
        position: { x: 3, y: 2 },
        facing: "south" as const,
        state: "running" as const,
      },
    };

    const restored = restoreGame(serializeGame(game, savedAt), savedAt);

    expect(restored.character).toMatchObject({
      position: { x: 3, y: 2 },
      facing: "south",
      state: "idle",
    });
  });

  it.each([
    null,
    "not json",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ version: saveVersion + 1 }),
    JSON.stringify({ version: saveVersion, savedAt: 1_767_225_600_000 }),
  ])("rejects unavailable, malformed, incompatible, and incomplete save data", (serialized) => {
    expect(parseSaveData(serialized)).toBeUndefined();
  });

  it("restores persistent data at idle and resolves elapsed real-time timers", () => {
    const now = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0),
      character: {
        position: { x: 3, y: 2 },
        facing: "south" as const,
        state: "walking" as const,
      },
      trees: [
        {
          id: "expired-tree",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt: now - reducedTreeDurationMs,
        },
      ],
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt: null,
          lastWateredAt: now - wateringCooldownMs,
        },
      ],
      inventory: { crop: 3, log: 0 },
    };

    const restored = restoreGame(serializeGame(game, now - 1), now, () => 0.99);

    expect(restored).toMatchObject({
      character: { position: { x: 3, y: 2 }, facing: "south", state: "idle" },
      trees: [],
      inventory: { crop: 3, log: 0 },
    });
    expect(restored.destination).toBeUndefined();
    expect(restored.pendingTarget).toBeUndefined();
    expect(restored.activeAction).toBeUndefined();
    expect(canWaterCrop(restored.crops[0], now)).toBe(true);
  });

  it("preserves the remaining time of a pending crop growth wait when restoring", () => {
    const savedAt = 1_767_225_600_000;
    const growthReadyAt = savedAt + wateringCooldownMs;
    const game = {
      ...createNewGame(() => 0, savedAt),
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt,
        },
      ],
    };

    const restored = restoreGame(serializeGame(game, savedAt), growthReadyAt - 1);

    expect(restored.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 2, growthReadyAt },
    ]);
  });

  it("grows a crop by one stage when its pending wait expires while the game is closed", () => {
    const savedAt = 1_767_225_600_000;
    const growthReadyAt = savedAt + wateringCooldownMs;
    const game = {
      ...createNewGame(() => 0, savedAt),
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt,
        },
      ],
    };

    const restored = restoreGame(serializeGame(game, savedAt), growthReadyAt + 1);

    expect(restored.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 3, growthReadyAt: null },
    ]);
  });

  it("processes every elapsed tree generation interval when restoring", () => {
    const savedAt = 0;
    const elapsedIntervals = 3;
    const random = vi.fn(() => 0);
    const serialized = serializeGame(
      createNewGame(() => 0, savedAt),
      savedAt,
    );

    const restored = restoreGame(
      serialized,
      savedAt + treeGenerationIntervalMs * elapsedIntervals,
      random,
    );

    expect(restored.lastTreeGenerationAttemptAt).toBe(
      savedAt + treeGenerationIntervalMs * elapsedIntervals,
    );
    expect(restored.trees).toHaveLength(5);
    expect(restored.trees.slice(-3)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "available" }),
        expect.objectContaining({ status: "available" }),
        expect.objectContaining({ status: "available" }),
      ]),
    );
    expect(random).toHaveBeenCalledTimes(elapsedIntervals);
  });

  it("keeps the reduced-tree timer progressing while the game is closed", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0),
      lastTreeGenerationAttemptAt: savedAt,
      trees: [
        {
          id: "reduced-tree",
          position: { x: 4, y: 1 },
          status: "reduced" as const,
          reducedAt: savedAt,
        },
      ],
      crops: [
        {
          id: "crop-1",
          position: { x: 1, y: 1 },
          stage: 2 as const,
          growthReadyAt: null,
          lastWateredAt: savedAt,
        },
      ],
    };
    const serialized = serializeGame(game, savedAt);

    const beforeTreeRemoval = restoreGame(serialized, savedAt + reducedTreeDurationMs - 1);
    const atTreeRemoval = restoreGame(serialized, savedAt + reducedTreeDurationMs);

    expect(beforeTreeRemoval.trees).toHaveLength(1);
    expect(atTreeRemoval.trees).toEqual([expect.objectContaining({ status: "available" })]);
  });

  it("starts a new game with a Spanish message when the save is invalid", () => {
    const restored = restoreGame("invalid save", 1_767_225_600_000, () => 0.99);

    expect(restored.character.state).toBe("idle");
    expect(restored.message).toBe(resultMessages.invalidSave);
    expect(restored.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 4, growthReadyAt: null },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: 4, growthReadyAt: null },
    ]);
  });

  it("safely discards an incompatible save when restoring", () => {
    const incompatible = JSON.stringify({
      ...createSaveData(
        createNewGame(() => 0),
        1_767_225_600_000,
      ),
      version: saveVersion + 1,
    });

    const restored = restoreGame(incompatible, 1_767_225_600_000, () => 0.99);

    expect(restored.character.state).toBe("idle");
    expect(restored.message).toBe(resultMessages.invalidSave);
    expect(restored.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 4, growthReadyAt: null },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: 4, growthReadyAt: null },
    ]);
  });
});
