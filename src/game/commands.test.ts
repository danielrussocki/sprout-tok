import { describe, expect, it } from "vitest";

import { completeAction } from "./actions";
import { arriveForInteraction, selectPosition } from "./commands";
import { createNewGame } from "./world";

describe("game commands", () => {
  it("assigns a valid empty destination", () => {
    const game = createNewGame(() => 0);

    const updatedGame = selectPosition(game, { x: 0, y: 1 }, 1_000);

    expect(updatedGame.character.state).toBe("walking");
    expect(updatedGame.destination).toEqual({ x: 0, y: 1 });
  });

  it("walks to an adjacent parcel before starting a contextual action", () => {
    const game = createNewGame(() => 0);

    const selectedGame = selectPosition(game, { x: 4, y: 1 }, 1_000);
    const arrivedGame = arriveForInteraction(selectedGame, 1_350);

    expect(selectedGame.destination).toEqual({ x: 4, y: 0 });
    expect(arrivedGame.character).toMatchObject({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "chopping",
    });
    expect(arrivedGame.activeAction).toMatchObject({
      kind: "chopping",
      target: { x: 4, y: 1 },
      completesAt: 4_350,
    });
  });

  it("accepts cultivable soil through the contextual tilling flow", () => {
    const game = createNewGame(() => 0);
    const target = { x: 1, y: 2 };

    const selectedGame = selectPosition(game, target, 1_000);
    const arrivedGame = arriveForInteraction(selectedGame, 1_500, "till-soil");

    expect(selectedGame.destination).toEqual({ x: 0, y: 2 });
    expect(selectedGame.pendingTarget).toEqual({ kind: "parcel", position: target });
    expect(arrivedGame.character).toMatchObject({
      position: { x: 0, y: 2 },
      facing: "east",
      state: "tilling dirt",
    });
    expect(arrivedGame.activeAction).toMatchObject({
      id: "till-soil",
      kind: "tilling dirt",
      target,
    });
  });

  it("cancels an active action without effect and processes only the latest order", () => {
    const game = createNewGame(() => 0);
    const choppingGame = arriveForInteraction(
      selectPosition(game, { x: 4, y: 1 }, 1_000),
      1_500,
      "chop-tree",
    );

    const latestOrderGame = selectPosition(choppingGame, { x: 0, y: 1 }, 2_000);
    const obsoleteCompletionGame = completeAction(latestOrderGame, "chop-tree", 4_500);
    const arrivedGame = arriveForInteraction(obsoleteCompletionGame, 4_500);

    expect(latestOrderGame.activeAction).toBeUndefined();
    expect(latestOrderGame.destination).toEqual({ x: 0, y: 1 });
    expect(latestOrderGame.pendingTarget).toBeUndefined();
    expect(obsoleteCompletionGame.trees).toEqual(game.trees);
    expect(arrivedGame.character).toMatchObject({
      position: { x: 0, y: 1 },
      state: "idle",
    });
    expect(arrivedGame.activeAction).toBeUndefined();
  });

  it("reports an unreachable target in Spanish when it has no walkable adjacent parcel", () => {
    const game = createNewGame(() => 0);
    const unreachableGame = {
      ...game,
      trees: [
        ...game.trees,
        { id: "block-north", position: { x: 4, y: 0 }, status: "available" as const },
        { id: "block-east", position: { x: 5, y: 1 }, status: "available" as const },
        { id: "block-south", position: { x: 4, y: 2 }, status: "available" as const },
        { id: "block-west", position: { x: 3, y: 1 }, status: "available" as const },
      ],
    };

    const updatedGame = selectPosition(unreachableGame, { x: 4, y: 1 }, 1_000);

    expect(updatedGame.character.state).toBe("idle");
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.pendingTarget).toBeUndefined();
    expect(updatedGame.message).toBe("No se puede alcanzar el objetivo.");
  });

  it("does not start chopping or alter the map when selecting a tree removed by time normalization", () => {
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

    const updatedGame = selectPosition(game, { x: 4, y: 1 }, reducedAt + 5 * 60 * 1_000);

    expect(updatedGame.trees).toEqual([]);
    expect(updatedGame.map).toBe(game.map);
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.character.state).not.toBe("chopping");
  });

  it("plants and harvests immediately after reaching the selected target", () => {
    const game = createNewGame(() => 0);
    const target = { x: 1, y: 2 };
    const tilledGame = {
      ...game,
      map: {
        ...game.map,
        tiles: game.map.tiles.map((tile) =>
          tile.position.x === target.x && tile.position.y === target.y
            ? { ...tile, tilled: true }
            : tile,
        ),
      },
      character: { ...game.character, position: { x: 1, y: 3 }, facing: "north" as const },
    };

    const plantedGame = arriveForInteraction(selectPosition(tilledGame, target, 1_000), 1_000);
    const harvestableGame = {
      ...plantedGame,
      crops: plantedGame.crops.map((crop) =>
        crop.position.x === target.x && crop.position.y === target.y
          ? { ...crop, stage: 4 as const }
          : crop,
      ),
    };
    const harvestedGame = arriveForInteraction(
      selectPosition(harvestableGame, target, 2_000),
      2_000,
    );

    expect(plantedGame.crops).toContainEqual({ id: "crop-3", position: target, stage: 1 });
    expect(harvestedGame.crops).not.toContainEqual({ id: "crop-3", position: target, stage: 4 });
    expect(harvestedGame.inventory.crop).toBe(1);
  });
});
