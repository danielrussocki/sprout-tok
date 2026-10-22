import { describe, expect, it } from "vitest";

import { createSaveData, parseSaveData, restoreGame, saveVersion, serializeGame } from "./save";
import { resultMessages } from "./messages";
import { canWaterCrop, reducedTreeDurationMs, wateringCooldownMs } from "./time";
import { createNewGame } from "./world";

describe("versioned game saves", () => {
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
          lastWateredAt: 1_767_225_540_000,
        },
      ],
      inventory: { crop: 3 },
      destination: { x: 3, y: 3 },
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
      map: game.map,
      character: game.character,
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
          lastWateredAt: 1_767_225_540_000,
        },
      ],
      inventory: { crop: 12 },
    };
    const saveData = createSaveData(game, 1_767_225_600_000);

    expect(parseSaveData(JSON.stringify(saveData))).toEqual(saveData);
  });

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
          lastWateredAt: savedAt - 30_000,
        },
      ],
      inventory: { crop: 7 },
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
      inventory: { crop: 7 },
    });
    expect(restored.destination).toBeUndefined();
    expect(restored.pendingTarget).toBeUndefined();
    expect(restored.activeAction).toBeUndefined();
  });

  it.each([
    null,
    "not json",
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
          lastWateredAt: now - wateringCooldownMs,
        },
      ],
      inventory: { crop: 3 },
    };

    const restored = restoreGame(serializeGame(game, now - 1), now, () => 0.99);

    expect(restored).toMatchObject({
      character: { position: { x: 3, y: 2 }, facing: "south", state: "idle" },
      trees: [],
      inventory: { crop: 3 },
    });
    expect(restored.destination).toBeUndefined();
    expect(restored.pendingTarget).toBeUndefined();
    expect(restored.activeAction).toBeUndefined();
    expect(canWaterCrop(restored.crops[0], now)).toBe(true);
  });

  it("keeps timers progressing while the game is closed", () => {
    const savedAt = 1_767_225_600_000;
    const game = {
      ...createNewGame(() => 0),
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
          lastWateredAt: savedAt,
        },
      ],
    };
    const serialized = serializeGame(game, savedAt);

    const beforeCooldown = restoreGame(serialized, savedAt + wateringCooldownMs - 1);
    const atCooldown = restoreGame(serialized, savedAt + wateringCooldownMs);
    const beforeTreeRemoval = restoreGame(serialized, savedAt + reducedTreeDurationMs - 1);
    const atTreeRemoval = restoreGame(serialized, savedAt + reducedTreeDurationMs);

    expect(canWaterCrop(beforeCooldown.crops[0], savedAt + wateringCooldownMs - 1)).toBe(false);
    expect(canWaterCrop(atCooldown.crops[0], savedAt + wateringCooldownMs)).toBe(true);
    expect(beforeTreeRemoval.trees).toHaveLength(1);
    expect(atTreeRemoval.trees).toEqual([]);
  });

  it("starts a new game with a Spanish message when the save is invalid", () => {
    const restored = restoreGame("invalid save", 1_767_225_600_000, () => 0.99);

    expect(restored.character.state).toBe("idle");
    expect(restored.message).toBe(resultMessages.invalidSave);
    expect(restored.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 4 },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: 4 },
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
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 4 },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: 4 },
    ]);
  });
});
