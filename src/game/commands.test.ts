import { describe, expect, it } from "vitest";

import { completeAction } from "./actions";
import { advanceMovement, arriveForInteraction, selectPosition } from "./commands";
import type { GameState } from "./model";
import { createNewGame } from "./world";

function arriveAtFinalDestination(game: GameState, now: number, actionId?: string): GameState {
  let updatedGame = game;

  while (updatedGame.destination !== undefined) {
    updatedGame = arriveForInteraction(updatedGame, now, actionId);
  }

  return updatedGame;
}

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
    const arrivedGame = arriveAtFinalDestination(selectedGame, 1_350);

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

  it("starts watering immediately when already adjacent to an eligible crop", () => {
    const game = {
      ...createNewGame(() => 0),
      character: { position: { x: 1, y: 0 }, facing: "south" as const, state: "idle" as const },
    };

    const updatedGame = selectPosition(game, { x: 1, y: 1 }, 1_000);

    expect(updatedGame.character.state).toBe("watering");
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.route).toBeUndefined();
    expect(updatedGame.pendingTarget).toBeUndefined();
    expect(updatedGame.activeAction).toEqual({
      id: "action-1000",
      kind: "watering",
      target: { x: 1, y: 1 },
      completesAt: 4_000,
    });
  });

  it("reports an unavailable watering action immediately when already adjacent", () => {
    const game = {
      ...createNewGame(() => 0),
      character: { position: { x: 1, y: 0 }, facing: "south" as const, state: "idle" as const },
      crops: [{ id: "crop-1", position: { x: 1, y: 1 }, stage: 1 as const, lastWateredAt: 1_000 }],
    };

    const updatedGame = selectPosition(game, { x: 1, y: 1 }, 60_999);

    expect(updatedGame.character.state).toBe("idle");
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.route).toBeUndefined();
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.message).toBe("Esta acción no está disponible.");
  });

  it("resolves a pending interaction only after the final route parcel", () => {
    const selectedGame = selectPosition(
      createNewGame(() => 0),
      { x: 4, y: 1 },
      1_000,
    );

    const afterFirstArrival = arriveForInteraction(selectedGame, 1_100, "chop-tree");
    const afterSecondArrival = arriveForInteraction(afterFirstArrival, 1_200, "chop-tree");
    const afterThirdArrival = arriveForInteraction(afterSecondArrival, 1_300, "chop-tree");
    const afterFinalArrival = arriveForInteraction(afterThirdArrival, 1_400, "chop-tree");

    for (const game of [afterFirstArrival, afterSecondArrival, afterThirdArrival]) {
      expect(game.character.state).toBe("walking");
      expect(game.pendingTarget).toEqual({ kind: "tree", position: { x: 4, y: 1 } });
      expect(game.activeAction).toBeUndefined();
    }

    expect(afterFinalArrival.character).toMatchObject({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "chopping",
    });
    expect(afterFinalArrival.destination).toBeUndefined();
    expect(afterFinalArrival.pendingTarget).toBeUndefined();
    expect(afterFinalArrival.activeAction).toMatchObject({
      id: "chop-tree",
      kind: "chopping",
      target: { x: 4, y: 1 },
    });
  });

  it("starts the pending interaction when a movement advance completes its route", () => {
    const selectedGame = selectPosition(
      createNewGame(() => 0),
      { x: 4, y: 1 },
      1_000,
    );

    const updatedGame = advanceMovement(selectedGame, 2_400, "chop-tree");

    expect(updatedGame.character).toMatchObject({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "chopping",
    });
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.pendingTarget).toBeUndefined();
    expect(updatedGame.movement).toBeUndefined();
    expect(updatedGame.activeAction).toMatchObject({
      id: "chop-tree",
      kind: "chopping",
      target: { x: 4, y: 1 },
      completesAt: 5_400,
    });
  });

  it("accepts cultivable soil through the contextual tilling flow", () => {
    const game = createNewGame(() => 0);
    const target = { x: 1, y: 2 };

    const selectedGame = selectPosition(game, target, 1_000);
    const arrivedGame = arriveAtFinalDestination(selectedGame, 1_500, "till-soil");

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
    const choppingGame = arriveAtFinalDestination(
      selectPosition(game, { x: 4, y: 1 }, 1_000),
      1_500,
      "chop-tree",
    );

    const latestOrderGame = selectPosition(choppingGame, { x: 0, y: 1 }, 2_000);
    const obsoleteCompletionGame = completeAction(latestOrderGame, "chop-tree", 4_500);
    const arrivedGame = arriveAtFinalDestination(obsoleteCompletionGame, 4_500);

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

  it("advances walking movement to the selection time before replacing its order", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );

    const redirectedGame = selectPosition(walkingGame, { x: 0, y: 2 }, 1_175);

    expect(redirectedGame.character.position).toEqual({ x: 0, y: 0 });
    expect(redirectedGame.movement).toEqual({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
      remainingRoute: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ],
      lastAdvancedAt: 1_175,
    });
  });

  it("redirects to an empty destination without a diagonal from the continuous position", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );

    const redirectedGame = selectPosition(walkingGame, { x: 0, y: 2 }, 1_175);

    expect(redirectedGame.character.position).toEqual({ x: 0, y: 0 });
    expect(redirectedGame.movement).toMatchObject({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
    });
    expect(redirectedGame.movement?.activeSegment.start).not.toEqual(
      redirectedGame.character.position,
    );
  });

  it("redirects to an interaction target from the continuous position reached mid-segment", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );

    const redirectedGame = selectPosition(walkingGame, { x: 4, y: 1 }, 1_175);

    expect(redirectedGame.character.position).toEqual({ x: 0, y: 0 });
    expect(redirectedGame.destination).toEqual({ x: 4, y: 0 });
    expect(redirectedGame.pendingTarget).toEqual({ kind: "tree", position: { x: 4, y: 1 } });
    expect(redirectedGame.activeAction).toBeUndefined();
    expect(redirectedGame.movement).toMatchObject({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
    });
  });

  it("keeps the exact continuous position when repeatedly selecting the same destination", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );
    const firstSelection = selectPosition(walkingGame, { x: 2, y: 0 }, 1_175);
    const repeatedSelection = selectPosition(firstSelection, { x: 2, y: 0 }, 1_225);

    expect(repeatedSelection.character.position).toEqual({ x: 0, y: 0 });
    expect(repeatedSelection.destination).toEqual({ x: 2, y: 0 });
    expect(repeatedSelection.movement?.continuousPosition.x).toBeCloseTo(0.6428571428571429);
    expect(repeatedSelection.movement).toMatchObject({
      activeSegment: {
        end: { x: 1, y: 0 },
      },
      lastAdvancedAt: 1_225,
    });
    expect(repeatedSelection.movement?.activeSegment.start.x).toBeCloseTo(0.6428571428571429);
    expect(repeatedSelection.movement?.activeSegment.start.y).toBe(0);
    expect(repeatedSelection.movement?.activeSegment.start).not.toEqual(
      repeatedSelection.character.position,
    );
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
