import { describe, expect, it } from "vitest";

import { cancelActiveAction, completeAction, harvestCrop, plantCrop, startAction } from "./actions";
import { resultMessages } from "./messages";
import { recoverStamina } from "./stamina";
import { createNewGame } from "./world";

describe("action cycle", () => {
  it("pauses recovery during an action and resumes its prior progress after completion", () => {
    const game = {
      ...createNewGame(() => 0),
      stamina: { value: 12, recoveryProgressMs: 10_000, runningProgressMs: 0 },
    };
    const startedGame = startAction(game, "action-1", "chopping", { x: 4, y: 1 }, 1_000);
    const pausedGame = {
      ...startedGame,
      stamina: recoverStamina(startedGame.stamina!, 30_000, startedGame.character.state),
    };
    const completedGame = completeAction(pausedGame, "action-1", 4_000);

    expect(pausedGame.stamina).toEqual(game.stamina);
    expect(completedGame.character.state).toBe("idle");
    expect(recoverStamina(completedGame.stamina!, 5_000, completedGame.character.state)).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("pauses recovery during an action and resumes its prior progress after cancellation", () => {
    const game = {
      ...createNewGame(() => 0),
      stamina: { value: 12, recoveryProgressMs: 10_000, runningProgressMs: 0 },
    };
    const startedGame = startAction(game, "action-1", "chopping", { x: 4, y: 1 }, 1_000);
    const pausedGame = {
      ...startedGame,
      stamina: recoverStamina(startedGame.stamina!, 30_000, startedGame.character.state),
    };
    const cancelledGame = cancelActiveAction(pausedGame);

    expect(pausedGame.stamina).toEqual(game.stamina);
    expect(cancelledGame.character.state).toBe("idle");
    expect(recoverStamina(cancelledGame.stamina!, 5_000, cancelledGame.character.state)).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("adds exactly one log only after a valid chopping action completes", () => {
    const target = { x: 4, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      inventory: { crop: 3, log: 7 },
    };
    const startedGame = startAction(game, "action-1", "chopping", target, 1_000);

    const beforeCompletion = completeAction(startedGame, "action-1", 3_999);
    const completedGame = completeAction(startedGame, "action-1", 4_000);
    const completedAgainGame = completeAction(completedGame, "action-1", 4_000);

    expect(beforeCompletion.inventory).toEqual({ crop: 3, log: 7 });
    expect(completedGame.inventory).toEqual({ crop: 3, log: 8 });
    expect(completedAgainGame.inventory).toEqual({ crop: 3, log: 8 });
  });

  it("does not add a log when a chopping action is cancelled", () => {
    const target = { x: 4, y: 1 };
    const startedGame = startAction(
      createNewGame(() => 0),
      "action-1",
      "chopping",
      target,
      1_000,
    );

    const cancelledGame = cancelActiveAction(startedGame);
    const completedGame = completeAction(cancelledGame, "action-1", 4_000);

    expect(cancelledGame.inventory).toEqual({ crop: 0, log: 0 });
    expect(completedGame.inventory).toEqual({ crop: 0, log: 0 });
  });

  it("does not add a log when chopping a reduced or missing tree is ignored", () => {
    const target = { x: 4, y: 1 };
    const reducedGame = {
      ...createNewGame(() => 0),
      trees: [
        {
          id: "tree-1",
          position: target,
          status: "reduced" as const,
          reducedAt: 1_000,
        },
      ],
    };
    const missingGame = { ...reducedGame, trees: [] };

    const afterReducedSelection = startAction(reducedGame, "action-1", "chopping", target, 2_000);
    const afterMissingSelection = startAction(missingGame, "action-2", "chopping", target, 2_000);

    expect(afterReducedSelection.inventory).toEqual({ crop: 0, log: 0 });
    expect(afterMissingSelection.inventory).toEqual({ crop: 0, log: 0 });
    expect(afterReducedSelection.activeAction).toBeUndefined();
    expect(afterMissingSelection.activeAction).toBeUndefined();
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

  it("does not replace an active action with a second action", () => {
    const game = startAction(
      createNewGame(() => 0),
      "action-1",
      "chopping",
      { x: 4, y: 1 },
      1_000,
    );

    const updatedGame = startAction(game, "action-2", "tilling dirt", { x: 1, y: 2 }, 1_500);

    expect(updatedGame.activeAction).toEqual({
      id: "action-1",
      kind: "chopping",
      target: { x: 4, y: 1 },
      completesAt: 4_000,
    });
    expect(updatedGame.character.state).toBe("chopping");
    expect(updatedGame.message).toBe(resultMessages.unavailableAction);
  });

  it("reduces an available tree only when its chopping action completes after three seconds", () => {
    const target = { x: 4, y: 1 };
    const game = createNewGame(() => 0);
    const startedGame = startAction(game, "action-1", "chopping", target, 1_000);

    const beforeCompletion = completeAction(startedGame, "action-1", 3_999);
    const completedGame = completeAction(startedGame, "action-1", 4_000);

    expect(beforeCompletion.trees).toEqual(game.trees);
    expect(beforeCompletion.inventory).toEqual({ crop: 0, log: 0 });
    expect(completedGame.trees).toEqual([
      { id: "tree-1", position: target, status: "reduced", reducedAt: 4_000 },
      game.trees[1],
    ]);
    expect(completedGame.inventory).toEqual({ crop: 0, log: 1 });
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

  it("starts a one-minute growth wait without advancing the watered crop", () => {
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
      {
        id: "crop-1",
        position: { x: 1, y: 1 },
        stage: 1,
        growthReadyAt: 64_000,
        lastWateredAt: 4_000,
      },
      game.crops[1],
    ]);
  });

  it("keeps the crop stage unchanged and records no growth wait before watering completes", () => {
    const target = { x: 1, y: 1 };
    const game = createNewGame(() => 0);
    const startedGame = startAction(game, "action-1", "watering", target, 1_000);

    const beforeCompletion = completeAction(startedGame, "action-1", 3_999);
    const completedGame = completeAction(startedGame, "action-1", 4_000);

    expect(startedGame.crops).toEqual(game.crops);
    expect(beforeCompletion.crops).toEqual(game.crops);
    expect(completedGame.crops[0]).toEqual({
      id: "crop-1",
      position: target,
      stage: 1,
      growthReadyAt: 64_000,
      lastWateredAt: 4_000,
    });
  });

  it("does not start another watering action while the crop has a pending growth wait", () => {
    const target = { x: 1, y: 1 };
    const wateringGame = startAction(
      createNewGame(() => 0),
      "action-1",
      "watering",
      target,
      1_000,
    );
    const waitingGame = completeAction(wateringGame, "action-1", 4_000);

    const updatedGame = startAction(waitingGame, "action-2", "watering", target, 65_000);

    expect(updatedGame).toEqual({ ...waitingGame, message: resultMessages.unavailableAction });
    expect(updatedGame.crops[0]).toMatchObject({
      stage: 1,
      growthReadyAt: 64_000,
    });
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).toBe("idle");
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
      inventory: { crop: 7, log: 0 },
    };

    const updatedGame = plantCrop(tilledGame, target);

    expect(updatedGame.crops).toContainEqual({
      id: "crop-3",
      position: target,
      stage: 1,
      growthReadyAt: null,
    });
    expect(updatedGame.inventory).toEqual({ crop: 7, log: 0 });
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
      { id: "crop-3", position: targets[0], stage: 1, growthReadyAt: null },
      { id: "crop-4", position: targets[1], stage: 1, growthReadyAt: null },
    ]);
    expect(secondPlanting.inventory).toEqual({ crop: 0, log: 0 });
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
    ).toEqual([{ id: "crop-3", position: target, stage: 1, growthReadyAt: null }]);
  });
});

describe("harvestCrop", () => {
  it("immediately removes a stage four crop and adds one crop to the inventory", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 4 as const }],
      inventory: { crop: 7, log: 0 },
    };

    const updatedGame = harvestCrop(game, target);

    expect(updatedGame.crops).toEqual([]);
    expect(updatedGame.inventory).toEqual({ crop: 8, log: 0 });
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
      inventory: { crop: 10_000, log: 0 },
    };

    const harvestedGame = harvestCrop(game, target);
    const harvestedAgainGame = harvestCrop(harvestedGame, target);

    expect(harvestedGame.crops).toEqual([]);
    expect(harvestedGame.inventory).toEqual({ crop: 10_001, log: 0 });
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
        inventory: { crop: 10_000, log: 0 },
      };

      const updatedGame = harvestCrop(game, target);

      expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
      expect(updatedGame.crops).toEqual([{ id: "crop-1", position: target, stage }]);
      expect(updatedGame.inventory).toEqual({ crop: 10_000, log: 0 });
    },
  );
});

describe("watering a planted crop", () => {
  it("starts its one-minute growth wait from the watering completion", () => {
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

    const wateredGame = completeAction(
      startAction(plantedGame, "action-1", "watering", target, 1_000),
      "action-1",
      4_000,
    );

    expect(wateredGame.crops).toContainEqual({
      id: "crop-3",
      position: target,
      stage: 1,
      growthReadyAt: 64_000,
      lastWateredAt: 4_000,
    });
  });
});

describe("watering initial crops", () => {
  it.each([
    { random: () => 0, initialStage: 1 },
    { random: () => 0.4, initialStage: 2 },
    { random: () => 0.7, initialStage: 3 },
  ] as const)(
    "starts a growth wait without advancing an initial stage $initialStage crop",
    ({ random, initialStage }) => {
      const target = { x: 1, y: 1 };
      const game = createNewGame(random);

      expect(game.crops[0]).toMatchObject({ stage: initialStage });

      const wateredGame = completeAction(
        startAction(game, "watering-1", "watering", target, 1_000),
        "watering-1",
        4_000,
      );

      expect(wateredGame.crops[0]).toEqual({
        id: "crop-1",
        position: target,
        stage: initialStage,
        growthReadyAt: 64_000,
        lastWateredAt: 4_000,
      });
    },
  );
});
