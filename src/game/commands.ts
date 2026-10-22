import { cancelActiveAction, harvestCrop, plantCrop, startAction } from "./actions";
import {
  reportInvalidDestination,
  reportUnreachableTarget,
  resultMessages,
  setResultMessage,
} from "./messages";
import { arriveAtDestination, assignDestination } from "./movement";
import { findClosestWalkableAdjacentParcel, isValidDestination } from "./navigation";
import { normalizeTime } from "./time";
import type { Coordinate, GameState, InteractionTarget } from "./model";
import { getInteractionTargetAt } from "./world";

function clearPendingInteraction(game: GameState): GameState {
  return { ...game, pendingTarget: undefined };
}

function setIdle(game: GameState): GameState {
  return {
    ...game,
    character: { ...game.character, state: "idle" },
    destination: undefined,
    pendingTarget: undefined,
  };
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
  if (target.kind === "parcel") {
    const parcel = game.map.tiles.find(
      (tile) => tile.position.x === target.position.x && tile.position.y === target.position.y,
    );

    if (parcel?.kind === "soil" && parcel.tilled) {
      return plantCrop(clearPendingInteraction(game), target.position);
    }

    return startAction(
      clearPendingInteraction(game),
      actionId,
      "tilling dirt",
      target.position,
      now,
    );
  }

  if (target.kind === "tree") {
    const tree = game.trees.find(
      (candidate) =>
        candidate.position.x === target.position.x && candidate.position.y === target.position.y,
    );

    return tree?.status === "available"
      ? startAction(clearPendingInteraction(game), actionId, "chopping", target.position, now)
      : setResultMessage(setIdle(game), resultMessages.unavailableAction);
  }

  const crop = game.crops.find(
    (candidate) =>
      candidate.position.x === target.position.x && candidate.position.y === target.position.y,
  );

  if (crop?.stage === 4) {
    return harvestCrop(clearPendingInteraction(game), target.position);
  }

  return startAction(clearPendingInteraction(game), actionId, "watering", target.position, now);
}

export function selectPosition(game: GameState, position: Coordinate, now: number): GameState {
  const normalizedGame = normalizeTime(cancelActiveAction(game), now);
  const target = getInteractionTargetAt(normalizedGame, position);

  if (target === undefined) {
    return isValidDestination(normalizedGame, position)
      ? assignDestination(normalizedGame, position)
      : reportInvalidDestination(setIdle(normalizedGame));
  }

  if (!isSoilTarget(normalizedGame, target) && target.kind === "parcel") {
    return assignDestination(normalizedGame, position);
  }

  if (target.kind === "tree") {
    const tree = normalizedGame.trees.find(
      (candidate) => candidate.position.x === position.x && candidate.position.y === position.y,
    );

    if (tree?.status !== "available") {
      return setResultMessage(setIdle(normalizedGame), resultMessages.unavailableAction);
    }
  }

  const adjacentParcel = findClosestWalkableAdjacentParcel(normalizedGame, position);

  return adjacentParcel === undefined
    ? reportUnreachableTarget(setIdle(normalizedGame))
    : assignDestination(normalizedGame, adjacentParcel, target);
}

export function arriveForInteraction(
  game: GameState,
  now: number,
  actionId = `action-${now}`,
): GameState {
  const arrivedGame = arriveAtDestination(game);
  const target = arrivedGame.pendingTarget;

  return target === undefined ? arrivedGame : beginInteraction(arrivedGame, target, now, actionId);
}
