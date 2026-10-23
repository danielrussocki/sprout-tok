import type { ActionKind, Coordinate, GameState } from "./model";
import { resultMessages, setResultMessage } from "./messages";
import { canWaterCrop, wateringCooldownMs } from "./time";
import { isOccupied } from "./world";

export const actionDurationMs = 3_000;

function getNextCropId(game: GameState): string {
  const cropIds = new Set(game.crops.map((crop) => crop.id));
  let sequence = game.crops.length + 1;
  let cropId = `crop-${sequence}`;

  while (cropIds.has(cropId)) {
    sequence += 1;
    cropId = `crop-${sequence}`;
  }

  return cropId;
}

export function plantCrop(game: GameState, target: Coordinate): GameState {
  const parcel = game.map.tiles.find(
    (tile) => tile.position.x === target.x && tile.position.y === target.y,
  );

  if (parcel?.kind !== "soil" || !parcel.tilled || isOccupied(game, target)) {
    return setResultMessage(game, resultMessages.unavailableAction);
  }

  return {
    ...game,
    crops: [
      ...game.crops,
      { id: getNextCropId(game), position: { ...target }, stage: 1, growthReadyAt: null },
    ],
  };
}

export function harvestCrop(game: GameState, target: Coordinate): GameState {
  const crop = game.crops.find(
    (candidate) =>
      candidate.position.x === target.x &&
      candidate.position.y === target.y &&
      candidate.stage === 4,
  );

  if (crop === undefined) {
    return setResultMessage(game, resultMessages.unavailableAction);
  }

  return {
    ...game,
    crops: game.crops.filter((candidate) => candidate.id !== crop.id),
    inventory: { ...game.inventory, crop: game.inventory.crop + 1 },
  };
}

export function startAction(
  game: GameState,
  actionId: string,
  kind: ActionKind,
  target: Coordinate,
  now: number,
): GameState {
  if (
    game.activeAction !== undefined ||
    (kind === "chopping" &&
      !game.trees.some(
        (tree) =>
          tree.status === "available" &&
          tree.position.x === target.x &&
          tree.position.y === target.y,
      )) ||
    (kind === "watering" &&
      !game.crops.some(
        (crop) =>
          crop.position.x === target.x && crop.position.y === target.y && canWaterCrop(crop, now),
      ))
  ) {
    return setResultMessage(game, resultMessages.unavailableAction);
  }

  return {
    ...game,
    character: { ...game.character, state: kind },
    activeAction: {
      id: actionId,
      kind,
      target: { ...target },
      completesAt: now + actionDurationMs,
    },
  };
}

export function cancelActiveAction(game: GameState): GameState {
  if (game.activeAction === undefined) {
    return game;
  }

  const updatedGame: GameState = {
    ...game,
    character: { ...game.character, state: "idle" },
  };

  delete updatedGame.activeAction;

  return updatedGame;
}

export function completeAction(game: GameState, actionId: string, now: number): GameState {
  const activeAction = game.activeAction;

  if (
    activeAction === undefined ||
    activeAction.id !== actionId ||
    now < activeAction.completesAt
  ) {
    return game;
  }

  if (activeAction.kind === "tilling dirt") {
    const updatedTiles = game.map.tiles.map((parcel) => {
      const isTarget =
        parcel.position.x === activeAction.target.x && parcel.position.y === activeAction.target.y;

      return parcel.kind === "soil" && !parcel.tilled && isTarget
        ? { ...parcel, tilled: true }
        : parcel;
    });

    return cancelActiveAction({ ...game, map: { ...game.map, tiles: updatedTiles } });
  }

  if (activeAction.kind === "chopping") {
    const updatedTrees = game.trees.map((tree) => {
      const isTarget =
        tree.position.x === activeAction.target.x && tree.position.y === activeAction.target.y;

      return tree.status === "available" && isTarget
        ? { ...tree, status: "reduced" as const, reducedAt: now }
        : tree;
    });

    return cancelActiveAction({ ...game, trees: updatedTrees });
  }

  const updatedCrops = game.crops.map((crop) => {
    const isTarget =
      crop.position.x === activeAction.target.x && crop.position.y === activeAction.target.y;

    if (!isTarget || !canWaterCrop(crop, now)) {
      return crop;
    }

    return {
      ...crop,
      growthReadyAt: now + wateringCooldownMs,
      lastWateredAt: now,
    };
  });

  return cancelActiveAction({ ...game, crops: updatedCrops });
}
