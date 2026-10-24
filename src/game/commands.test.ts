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

  it("keeps the selected empty tile or contextual target as the active reference", () => {
    const game = createNewGame(() => 0);

    const emptyDestinationGame = selectPosition(game, { x: 0, y: 1 }, 1_000);
    const contextualTargetGame = selectPosition(game, { x: 4, y: 1 }, 1_000);

    expect(emptyDestinationGame.activeReference).toEqual({
      kind: "destination",
      position: { x: 0, y: 1 },
    });
    expect(contextualTargetGame.activeReference).toEqual({
      kind: "interaction",
      target: { kind: "tree", position: { x: 4, y: 1 } },
    });
  });

  it("starts running when repeating the active reference while walking with 13 stamina", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );
    const gameWithMinimumRunningStamina = {
      ...walkingGame,
      stamina: { ...walkingGame.stamina!, value: 13 },
    };

    const runningGame = selectPosition(gameWithMinimumRunningStamina, { x: 2, y: 0 }, 1_000);

    expect(runningGame).toEqual({
      ...gameWithMinimumRunningStamina,
      character: { ...gameWithMinimumRunningStamina.character, state: "running" },
    });
  });

  it("starts running when repeating an active contextual target with 13 stamina", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 4, y: 1 },
      1_000,
    );
    const gameWithMinimumRunningStamina = {
      ...walkingGame,
      stamina: { ...walkingGame.stamina!, value: 13 },
    };

    const runningGame = selectPosition(gameWithMinimumRunningStamina, { x: 4, y: 1 }, 1_000);

    expect(runningGame.character.state).toBe("running");
    expect(runningGame.activeReference).toEqual({
      kind: "interaction",
      target: { kind: "tree", position: { x: 4, y: 1 } },
    });
    expect(runningGame.movement).toEqual(gameWithMinimumRunningStamina.movement);
  });

  it("keeps walking when repeating the active reference with fewer than 13 stamina", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );
    const gameWithInsufficientStamina = {
      ...walkingGame,
      stamina: { ...walkingGame.stamina!, value: 12 },
    };

    const updatedGame = selectPosition(gameWithInsufficientStamina, { x: 2, y: 0 }, 1_000);

    expect(updatedGame).toEqual(gameWithInsufficientStamina);
  });

  it("keeps running unchanged when repeating the active reference", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );
    const runningGame = selectPosition(walkingGame, { x: 2, y: 0 }, 1_000);

    const updatedGame = selectPosition(runningGame, { x: 2, y: 0 }, 1_000);

    expect(updatedGame).toEqual(runningGame);
  });

  it("redirects from a continuous running position and resumes walking", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );
    const runningGame = selectPosition(walkingGame, { x: 2, y: 0 }, 1_000);

    const redirectedGame = selectPosition(runningGame, { x: 0, y: 2 }, 1_087.5);

    expect(redirectedGame.character.state).toBe("walking");
    expect(redirectedGame.activeReference).toEqual({
      kind: "destination",
      position: { x: 0, y: 2 },
    });
    expect(redirectedGame.movement).toEqual({
      continuousPosition: { x: 0.5, y: 0 },
      activeSegment: { start: { x: 0.5, y: 0 }, end: { x: 1, y: 0 } },
      remainingRoute: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ],
      lastAdvancedAt: 1_087.5,
    });
  });

  it("cancels the active order when a new destination has no valid route", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 2, y: 0 },
      1_000,
    );

    const cancelledGame = selectPosition(walkingGame, { x: -1, y: 0 }, 1_000);

    expect(cancelledGame.character.state).toBe("idle");
    expect(cancelledGame.destination).toBeUndefined();
    expect(cancelledGame.route).toBeUndefined();
    expect(cancelledGame.movement).toBeUndefined();
    expect(cancelledGame.activeReference).toBeUndefined();
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
      character: { position: { x: 1, y: 0 }, facing: "west" as const, state: "idle" as const },
    };

    const updatedGame = selectPosition(game, { x: 1, y: 1 }, 1_000);

    expect(updatedGame.character).toMatchObject({ facing: "south", state: "watering" });
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

  it("reports an unavailable watering action immediately during a growth wait", () => {
    const game = {
      ...createNewGame(() => 0),
      character: { position: { x: 1, y: 0 }, facing: "south" as const, state: "idle" as const },
      crops: [{ id: "crop-1", position: { x: 1, y: 1 }, stage: 1 as const, growthReadyAt: 61_000 }],
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

  it("completes a running route without acting when its contextual target becomes unavailable", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 4, y: 1 },
      1_000,
    );
    const runningGame = selectPosition(walkingGame, { x: 4, y: 1 }, 1_000);
    const gameWithReducedTarget = {
      ...runningGame,
      trees: runningGame.trees.map((tree) =>
        tree.id === "tree-1" ? { ...tree, status: "reduced" as const, reducedAt: 1_100 } : tree,
      ),
    };

    const updatedGame = advanceMovement(gameWithReducedTarget, 1_700, "chop-tree");

    expect(updatedGame.character).toEqual({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "idle",
    });
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.route).toBeUndefined();
    expect(updatedGame.movement).toBeUndefined();
    expect(updatedGame.activeReference).toBeUndefined();
    expect(updatedGame.pendingTarget).toBeUndefined();
    expect(updatedGame.activeAction).toBeUndefined();
    expect(updatedGame.message).toBeUndefined();
  });

  it("completes a running route without starting an action when its target is removed", () => {
    const walkingGame = selectPosition(
      createNewGame(() => 0),
      { x: 4, y: 1 },
      1_000,
    );
    const runningGame = selectPosition(walkingGame, { x: 4, y: 1 }, 1_000);
    const gameWithRemovedTarget = {
      ...runningGame,
      trees: runningGame.trees.filter((tree) => tree.id !== "tree-1"),
    };

    const updatedGame = advanceMovement(gameWithRemovedTarget, 1_700, "chop-tree");

    expect(updatedGame.character).toEqual({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "idle",
    });
    expect(updatedGame.destination).toBeUndefined();
    expect(updatedGame.activeReference).toBeUndefined();
    expect(updatedGame.pendingTarget).toBeUndefined();
    expect(updatedGame.activeAction).toBeUndefined();
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

  it("cancels an active action without effect and ignores a new order", () => {
    const game = createNewGame(() => 0);
    const choppingGame = arriveAtFinalDestination(
      selectPosition(game, { x: 4, y: 1 }, 1_000),
      1_500,
      "chop-tree",
    );

    const latestOrderGame = selectPosition(choppingGame, { x: 0, y: 1 }, 2_000);
    const obsoleteCompletionGame = completeAction(latestOrderGame, "chop-tree", 4_500);

    expect(latestOrderGame.activeAction).toBeUndefined();
    expect(latestOrderGame.character.state).toBe("idle");
    expect(latestOrderGame.destination).toBeUndefined();
    expect(latestOrderGame.route).toBeUndefined();
    expect(latestOrderGame.pendingTarget).toBeUndefined();
    expect(obsoleteCompletionGame.trees).toEqual(game.trees);
    expect(obsoleteCompletionGame.character).toMatchObject({
      position: { x: 4, y: 0 },
      state: "idle",
    });
  });

  it.each([
    { position: { x: 4, y: 0 }, facing: "south" },
    { position: { x: 5, y: 1 }, facing: "west" },
    { position: { x: 4, y: 2 }, facing: "north" },
    { position: { x: 3, y: 1 }, facing: "east" },
  ] as const)("faces $facing when chopping from an adjacent parcel", ({ position, facing }) => {
    const game = {
      ...createNewGame(() => 0),
      character: { position, facing: "north" as const, state: "idle" as const },
    };

    const updatedGame = selectPosition(game, { x: 4, y: 1 }, 1_000);

    expect(updatedGame.character).toMatchObject({ facing, state: "chopping" });
    expect(updatedGame.activeAction).toMatchObject({
      kind: "chopping",
      target: { x: 4, y: 1 },
    });
  });

  it.each([
    {
      name: "tilling",
      characterPosition: { x: 0, y: 2 },
      target: { x: 1, y: 2 },
      actionId: "till-soil",
    },
    {
      name: "chopping",
      characterPosition: { x: 4, y: 0 },
      target: { x: 4, y: 1 },
      actionId: "chop-tree",
    },
    {
      name: "watering",
      characterPosition: { x: 1, y: 0 },
      target: { x: 1, y: 1 },
      actionId: "water-crop",
    },
  ] as const)(
    "cancels $name without applying its pending effect or accepting the new order",
    ({ characterPosition, target, actionId }) => {
      const game = {
        ...createNewGame(() => 0),
        character: {
          position: characterPosition,
          facing: "north" as const,
          state: "idle" as const,
        },
      };
      const actingGame = selectPosition(game, target, 1_000);
      const cancelledGame = selectPosition(actingGame, { x: 0, y: 1 }, 2_000);
      const completedGame = completeAction(cancelledGame, actionId, 4_000);

      expect(cancelledGame.character.state).toBe("idle");
      expect(cancelledGame.activeAction).toBeUndefined();
      expect(cancelledGame.destination).toBeUndefined();
      expect(cancelledGame.route).toBeUndefined();
      expect(cancelledGame.movement).toBeUndefined();
      expect(cancelledGame.pendingTarget).toBeUndefined();
      expect(completedGame.map).toEqual(game.map);
      expect(completedGame.trees).toEqual(game.trees);
      expect(completedGame.crops).toEqual(game.crops);
    },
  );

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

    expect(plantedGame.crops).toContainEqual({
      id: "crop-3",
      position: target,
      stage: 1,
      growthReadyAt: null,
    });
    expect(harvestedGame.crops).not.toContainEqual({ id: "crop-3", position: target, stage: 4 });
    expect(harvestedGame.inventory.crop).toBe(1);
  });
});
