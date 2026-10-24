import { cancelActiveAction, harvestCrop, plantCrop, startAction } from "./actions";
import {
  reportInvalidDestination,
  reportUnreachableTarget,
  resultMessages,
  setResultMessage,
} from "./messages";
import { advanceMovementUntil, arriveAtDestination, assignDestination } from "./movement";
import { findClosestWalkableAdjacentParcel, isValidDestination } from "./navigation";
import { canWaterCrop, normalizeTime } from "./time";
import type { Coordinate, Direction, GameState, InteractionTarget } from "./model";
import { getInteractionTargetAt, isOccupied } from "./world";

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
    activeReference: undefined,
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

function isInteractionTargetAvailable(
  game: GameState,
  target: InteractionTarget,
  now: number,
): boolean {
  if (target.kind === "tree") {
    return game.trees.some(
      (tree) =>
        tree.status === "available" &&
        tree.position.x === target.position.x &&
        tree.position.y === target.position.y,
    );
  }

  if (target.kind === "crop") {
    return game.crops.some(
      (crop) =>
        crop.position.x === target.position.x &&
        crop.position.y === target.position.y &&
        (crop.stage === 4 || canWaterCrop(crop, now)),
    );
  }

  const parcel = game.map.tiles.find(
    (tile) => tile.position.x === target.position.x && tile.position.y === target.position.y,
  );

  return parcel?.kind === "soil" && (!parcel.tilled || !isOccupied(game, target.position));
}

function hasSamePosition(first: Coordinate, second: Coordinate): boolean {
  return first.x === second.x && first.y === second.y;
}

function isActiveReferenceSelected(game: GameState, position: Coordinate): boolean {
  const activeReference = game.activeReference;

  if (activeReference === undefined) {
    return false;
  }

  const target = getInteractionTargetAt(game, position);

  if (target === undefined || (target.kind === "parcel" && !isSoilTarget(game, target))) {
    return (
      activeReference.kind === "destination" && hasSamePosition(activeReference.position, position)
    );
  }

  return (
    activeReference.kind === "interaction" &&
    activeReference.target.kind === target.kind &&
    hasSamePosition(activeReference.target.position, target.position)
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

  if (
    normalizedGame.character.state === "walking" &&
    isActiveReferenceSelected(normalizedGame, position)
  ) {
    return normalizedGame.stamina?.value !== undefined && normalizedGame.stamina.value >= 13
      ? { ...normalizedGame, character: { ...normalizedGame.character, state: "running" } }
      : normalizedGame;
  }

  if (
    normalizedGame.character.state === "running" &&
    isActiveReferenceSelected(normalizedGame, position)
  ) {
    return normalizedGame;
  }

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
  const normalizedGame = normalizeTime(movedGame, now);
  const target = normalizedGame.pendingTarget;

  if (target === undefined || normalizedGame.destination !== undefined) {
    return normalizedGame;
  }

  return isInteractionTargetAvailable(normalizedGame, target, now)
    ? beginInteraction(normalizedGame, target, now, actionId)
    : setIdle(normalizedGame);
}

export function arriveForInteraction(
  game: GameState,
  now: number,
  actionId = `action-${now}`,
): GameState {
  const arrivedGame = arriveAtDestination(game);
  const target = arrivedGame.pendingTarget;

  if (target === undefined || arrivedGame.destination !== undefined) {
    return arrivedGame;
  }

  return isInteractionTargetAvailable(arrivedGame, target, now)
    ? beginInteraction(arrivedGame, target, now, actionId)
    : setIdle(arrivedGame);
}
