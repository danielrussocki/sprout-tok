import { cancelActiveAction, harvestCrop, plantCrop, startAction } from "./actions";
import {
  reportInvalidDestination,
  reportUnreachableTarget,
  resultMessages,
  setResultMessage,
} from "./messages";
import { advanceMovementUntil, arriveAtDestination, assignDestination } from "./movement";
import { findClosestWalkableAdjacentParcel, isValidDestination } from "./navigation";
import { normalizeTime } from "./time";
import type { Coordinate, Direction, GameState, InteractionTarget } from "./model";
import { getInteractionTargetAt } from "./world";

function clearPendingInteraction(game: GameState): GameState {
  return { ...game, pendingTarget: undefined };
}

function setIdle(game: GameState): GameState {
  return {
    ...game,
    character: { ...game.character, state: "idle" },
    destination: undefined,
    route: undefined,
    movement: undefined,
    pendingTarget: undefined,
  };
}

function getDirectionTowards(origin: Coordinate, target: Coordinate): Direction | undefined {
  if (target.x === origin.x && target.y === origin.y - 1) {
    return "north";
  }

  if (target.x === origin.x + 1 && target.y === origin.y) {
    return "east";
  }

  if (target.x === origin.x && target.y === origin.y + 1) {
    return "south";
  }

  if (target.x === origin.x - 1 && target.y === origin.y) {
    return "west";
  }

  return undefined;
}

function isSoilTarget(game: GameState, target: InteractionTarget): boolean {
  return (
    target.kind === "parcel" &&
    game.map.tiles.some(
      (tile) =>
        tile.kind === "soil" &&
        tile.position.x === target.position.x &&
        tile.position.y === target.position.y,
    )
  );
}

function beginInteraction(
  game: GameState,
  target: InteractionTarget,
  now: number,
  actionId: string,
): GameState {
  const orientedGame = {
    ...game,
    character: {
      ...game.character,
      facing:
        getDirectionTowards(game.character.position, target.position) ?? game.character.facing,
    },
  };

  if (target.kind === "parcel") {
    const parcel = orientedGame.map.tiles.find(
      (tile) => tile.position.x === target.position.x && tile.position.y === target.position.y,
    );

    if (parcel?.kind === "soil" && parcel.tilled) {
      return plantCrop(clearPendingInteraction(orientedGame), target.position);
    }

    return startAction(
      clearPendingInteraction(orientedGame),
      actionId,
      "tilling dirt",
      target.position,
      now,
    );
  }

  if (target.kind === "tree") {
    const tree = orientedGame.trees.find(
      (candidate) =>
        candidate.position.x === target.position.x && candidate.position.y === target.position.y,
    );

    return tree?.status === "available"
      ? startAction(
          clearPendingInteraction(orientedGame),
          actionId,
          "chopping",
          target.position,
          now,
        )
      : setResultMessage(setIdle(orientedGame), resultMessages.unavailableAction);
  }

  const crop = orientedGame.crops.find(
    (candidate) =>
      candidate.position.x === target.position.x && candidate.position.y === target.position.y,
  );

  if (crop?.stage === 4) {
    return harvestCrop(clearPendingInteraction(orientedGame), target.position);
  }

  return startAction(
    clearPendingInteraction(orientedGame),
    actionId,
    "watering",
    target.position,
    now,
  );
}

export function selectPosition(game: GameState, position: Coordinate, now: number): GameState {
  const movedGame = advanceMovementUntil(game, now);
  const normalizedGame = normalizeTime(movedGame, now);

  if (normalizedGame.activeAction !== undefined) {
    return setIdle(cancelActiveAction(normalizedGame));
  }

  const cancelledGame = cancelActiveAction(normalizedGame);
  const target = getInteractionTargetAt(cancelledGame, position);

  if (target === undefined) {
    return isValidDestination(cancelledGame, position)
      ? assignDestination(cancelledGame, position, undefined, now)
      : reportInvalidDestination(setIdle(cancelledGame));
  }

  if (!isSoilTarget(cancelledGame, target) && target.kind === "parcel") {
    return assignDestination(cancelledGame, position, undefined, now);
  }

  if (target.kind === "tree") {
    const tree = cancelledGame.trees.find(
      (candidate) => candidate.position.x === position.x && candidate.position.y === position.y,
    );

    if (tree?.status !== "available") {
      return setResultMessage(setIdle(cancelledGame), resultMessages.unavailableAction);
    }
  }

  const adjacentParcel = findClosestWalkableAdjacentParcel(cancelledGame, position);

  if (adjacentParcel === undefined) {
    return reportUnreachableTarget(setIdle(cancelledGame));
  }

  if (
    adjacentParcel.x === cancelledGame.character.position.x &&
    adjacentParcel.y === cancelledGame.character.position.y
  ) {
    return beginInteraction(cancelledGame, target, now, `action-${now}`);
  }

  return assignDestination(cancelledGame, adjacentParcel, target, now);
}

export function advanceMovement(
  game: GameState,
  now: number,
  actionId = `action-${now}`,
): GameState {
  const movedGame = advanceMovementUntil(game, now);
  const target = movedGame.pendingTarget;

  return target === undefined || movedGame.destination !== undefined
    ? movedGame
    : beginInteraction(movedGame, target, now, actionId);
}

export function arriveForInteraction(
  game: GameState,
  now: number,
  actionId = `action-${now}`,
): GameState {
  const arrivedGame = arriveAtDestination(game);
  const target = arrivedGame.pendingTarget;

  return target === undefined || arrivedGame.destination !== undefined
    ? arrivedGame
    : beginInteraction(arrivedGame, target, now, actionId);
}
