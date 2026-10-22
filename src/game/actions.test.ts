import { describe, expect, it } from "vitest";

import { cancelActiveAction, completeAction, harvestCrop, plantCrop, startAction } from "./actions";
import { resultMessages } from "./messages";
import { createNewGame } from "./world";

describe("action cycle", () => {
  it("does not start watering while the crop is in its one-minute cooldown", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 1 as const, lastWateredAt: 1_000 }],
    };

    const updatedGame = startAction(game, "action-1", "watering", target, 60_999);

    expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
  });

  it("starts watering at the exact end of a crop's cooldown", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 3 as const, lastWateredAt: 1_000 }],
    };

    const updatedGame = startAction(game, "action-1", "watering", target, 61_000);

    expect(updatedGame.activeAction).toEqual({
      id: "action-1",
      kind: "watering",
      target,
      completesAt: 64_000,
    });
    expect(updatedGame.character.state).toBe("watering");
  });

  it("does not start watering a stage four crop", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 4 as const }],
    };

    const updatedGame = startAction(game, "action-1", "watering", target, 1_000);

    expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
  });

  it("reduces an available tree only when its chopping action completes after three seconds", () => {
    const target = { x: 4, y: 1 };
    const game = createNewGame(() => 0);
    const startedGame = startAction(game, "action-1", "chopping", target, 1_000);

    const beforeCompletion = completeAction(startedGame, "action-1", 3_999);
    const completedGame = completeAction(startedGame, "action-1", 4_000);

    expect(beforeCompletion.trees).toEqual(game.trees);
    expect(completedGame.trees).toEqual([
      { id: "tree-1", position: target, status: "reduced", reducedAt: 4_000 },
      game.trees[1],
    ]);
    expect(completedGame.activeAction).toBeUndefined();
    expect(completedGame.character.state).toBe("idle");
  });

  it("does not start another chopping action for a reduced tree", () => {
    const target = { x: 4, y: 1 };
    const startedGame = startAction(
      createNewGame(() => 0),
      "action-1",
      "chopping",
      target,
      1_000,
    );
    const reducedGame = completeAction(startedGame, "action-1", 4_000);

    const updatedGame = startAction(reducedGame, "action-2", "chopping", target, 5_000);

    expect(updatedGame).toEqual({ ...reducedGame, message: resultMessages.unavailableAction });
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
  });

  it("tills an untilled soil parcel only when its valid action completes after three seconds", () => {
    const target = { x: 1, y: 2 };
    const game = createNewGame(() => 0);
    const startedGame = startAction(game, "action-1", "tilling dirt", target, 1_000);

    const beforeCompletion = completeAction(startedGame, "action-1", 3_999);
    const completedGame = completeAction(startedGame, "action-1", 4_000);

    expect(beforeCompletion.map).toEqual(game.map);
    expect(
      completedGame.map.tiles.find((parcel) => parcel.position.x === 1 && parcel.position.y === 2),
    ).toEqual({ position: target, kind: "soil", walkable: true, tilled: true });
    expect(completedGame.activeAction).toBeUndefined();
    expect(completedGame.character.state).toBe("idle");
  });

  it("keeps an action active without changing its target before three seconds", () => {
    const game = createNewGame(() => 0);
    const startedGame = startAction(game, "action-1", "tilling dirt", { x: 1, y: 2 }, 1_000);

    const updatedGame = completeAction(startedGame, "action-1", 3_999);

    expect(updatedGame).toEqual(startedGame);
    expect(updatedGame.activeAction).toEqual({
      id: "action-1",
      kind: "tilling dirt",
      target: { x: 1, y: 2 },
      completesAt: 4_000,
    });
    expect(updatedGame.character.state).toBe("tilling dirt");
    expect(updatedGame.map).toEqual(game.map);
  });

  it("cancels the active action and ignores its later completion", () => {
    const game = startAction(
      createNewGame(() => 0),
      "action-1",
      "chopping",
      { x: 4, y: 1 },
      1_000,
    );

    const cancelledGame = cancelActiveAction(game);
    const updatedGame = completeAction(cancelledGame, "action-1", 4_000);

    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
    expect(updatedGame.trees).toEqual(game.trees);
    expect(game.activeAction).toEqual({
      id: "action-1",
      kind: "chopping",
      target: { x: 4, y: 1 },
      completesAt: 4_000,
    });
  });

  it("finishes safely when the action target was removed before completion", () => {
    const startedGame = startAction(
      createNewGame(() => 0),
      "action-1",
      "chopping",
      { x: 4, y: 1 },
      1_000,
    );
    const gameWithRemovedTarget = {
      ...startedGame,
      trees: startedGame.trees.filter((tree) => tree.id !== "tree-1"),
    };

    const updatedGame = completeAction(gameWithRemovedTarget, "action-1", 4_000);

    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
    expect(updatedGame.trees).toEqual(gameWithRemovedTarget.trees);
  });

  it("ignores a completion with an obsolete action identifier", () => {
    const game = startAction(
      createNewGame(() => 0),
      "action-current",
      "watering",
      { x: 1, y: 1 },
      1_000,
    );

    const updatedGame = completeAction(game, "action-obsolete", 4_000);

    expect(updatedGame).toEqual(game);
    expect(updatedGame.activeAction?.id).toBe("action-current");
    expect(updatedGame.character.state).toBe("watering");
  });

  it("advances a watered crop by one stage and records the completion time", () => {
    const game = startAction(
      createNewGame(() => 0),
      "action-1",
      "watering",
      { x: 1, y: 1 },
      1_000,
    );

    const updatedGame = completeAction(game, "action-1", 4_000);

    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
    expect(updatedGame.crops).toEqual([
      { id: "crop-1", position: { x: 1, y: 1 }, stage: 2, lastWateredAt: 4_000 },
      game.crops[1],
    ]);
  });
});

describe("plantCrop", () => {
  it("immediately plants a stage one crop in an empty tilled soil parcel without consuming inventory", () => {
    const game = createNewGame(() => 0);
    const target = { x: 1, y: 2 };
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
      inventory: { crop: 7 },
    };

    const updatedGame = plantCrop(tilledGame, target);

    expect(updatedGame.crops).toContainEqual({
      id: "crop-3",
      position: target,
      stage: 1,
    });
    expect(updatedGame.inventory).toEqual({ crop: 7 });
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
  });

  it("rejects planting in an occupied tilled soil parcel", () => {
    const game = createNewGame(() => 0);
    const occupiedTarget = { x: 1, y: 1 };
    const tilledGame = {
      ...game,
      map: {
        ...game.map,
        tiles: game.map.tiles.map((parcel) =>
          parcel.position.x === occupiedTarget.x && parcel.position.y === occupiedTarget.y
            ? { ...parcel, tilled: true }
            : parcel,
        ),
      },
    };

    const updatedGame = plantCrop(tilledGame, occupiedTarget);

    expect(updatedGame).toEqual({ ...tilledGame, message: resultMessages.unavailableAction });
    expect(updatedGame.crops).toEqual(tilledGame.crops);
  });

  it("allows planting repeatedly without consuming inventory", () => {
    const game = createNewGame(() => 0);
    const targets = [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ];
    const tilledGame = {
      ...game,
      map: {
        ...game.map,
        tiles: game.map.tiles.map((parcel) =>
          targets.some((target) => parcel.position.x === target.x && parcel.position.y === target.y)
            ? { ...parcel, tilled: true }
            : parcel,
        ),
      },
    };

    const firstPlanting = plantCrop(tilledGame, targets[0]);
    const secondPlanting = plantCrop(firstPlanting, targets[1]);

    expect(secondPlanting.crops).toEqual([
      ...game.crops,
      { id: "crop-3", position: targets[0], stage: 1 },
      { id: "crop-4", position: targets[1], stage: 1 },
    ]);
    expect(secondPlanting.inventory).toEqual({ crop: 0 });
  });

  it("prevents a second crop from being planted on a newly occupied parcel", () => {
    const game = createNewGame(() => 0);
    const target = { x: 1, y: 2 };
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
    const updatedGame = plantCrop(plantedGame, target);

    expect(updatedGame).toEqual({ ...plantedGame, message: resultMessages.unavailableAction });
    expect(updatedGame.crops).toHaveLength(3);
    expect(
      updatedGame.crops.filter(
        (crop) => crop.position.x === target.x && crop.position.y === target.y,
      ),
    ).toEqual([{ id: "crop-3", position: target, stage: 1 }]);
  });
});

describe("harvestCrop", () => {
  it("immediately removes a stage four crop and adds one crop to the inventory", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 4 as const }],
      inventory: { crop: 7 },
    };

    const updatedGame = harvestCrop(game, target);

    expect(updatedGame.crops).toEqual([]);
    expect(updatedGame.inventory).toEqual({ crop: 8 });
  });

  it("leaves a crop before stage four unchanged", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 3 as const }],
    };

    const updatedGame = harvestCrop(game, target);

    expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
  });

  it("harvests a crop only once and increases an unbounded inventory by one", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 4 as const }],
      inventory: { crop: 10_000 },
    };

    const harvestedGame = harvestCrop(game, target);
    const harvestedAgainGame = harvestCrop(harvestedGame, target);

    expect(harvestedGame.crops).toEqual([]);
    expect(harvestedGame.inventory).toEqual({ crop: 10_001 });
    expect(harvestedAgainGame).toEqual({
      ...harvestedGame,
      message: resultMessages.unavailableAction,
    });
  });

  it.each([1, 2, 3] as const)(
    "does not change a non-harvestable stage %i crop or the inventory",
    (stage) => {
      const target = { x: 1, y: 1 };
      const game = {
        ...createNewGame(() => 0),
        crops: [{ id: "crop-1", position: target, stage }],
        inventory: { crop: 10_000 },
      };

      const updatedGame = harvestCrop(game, target);

      expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
      expect(updatedGame.crops).toEqual([{ id: "crop-1", position: target, stage }]);
      expect(updatedGame.inventory).toEqual({ crop: 10_000 });
    },
  );
});

describe("watering a planted crop", () => {
  it("allows three watering actions at each exact one-minute cooldown boundary until stage four", () => {
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

    const firstWatering = completeAction(
      startAction(plantedGame, "action-1", "watering", target, 1_000),
      "action-1",
      4_000,
    );
    const beforeSecondCooldown = startAction(firstWatering, "action-2", "watering", target, 63_999);
    const secondWatering = completeAction(
      startAction(firstWatering, "action-2", "watering", target, 64_000),
      "action-2",
      67_000,
    );
    const thirdWatering = completeAction(
      startAction(secondWatering, "action-3", "watering", target, 127_000),
      "action-3",
      130_000,
    );
    const afterHarvestableStage = startAction(
      thirdWatering,
      "action-4",
      "watering",
      target,
      190_000,
    );

    expect(beforeSecondCooldown).toEqual({
      ...firstWatering,
      message: resultMessages.unavailableAction,
    });
    expect(thirdWatering.crops).toContainEqual({
      id: "crop-3",
      position: target,
      stage: 4,
      lastWateredAt: 130_000,
    });
    expect(afterHarvestableStage).toEqual({
      ...thirdWatering,
      message: resultMessages.unavailableAction,
    });
    expect(afterHarvestableStage.activeAction).toBeUndefined();
  });
});
