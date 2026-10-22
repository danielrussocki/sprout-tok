import type { Coordinate, CropStage, GameMap, GameState, InteractionTarget, Parcel } from "./model";

const mapWidth = 8;
const mapHeight = 6;

const soilPositions = new Set(["1,1", "2,1", "1,2", "2,2"]);

function createMap(): GameMap {
  const tiles: Parcel[] = [];

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      if (soilPositions.has(`${x},${y}`)) {
        tiles.push({ position: { x, y }, kind: "soil", walkable: true, tilled: false });
      } else {
        tiles.push({ position: { x, y }, kind: "grass", walkable: true });
      }
    }
  }

  return { width: mapWidth, height: mapHeight, tiles };
}

export function getInitialCropStage(random: () => number): CropStage {
  const value = random();

  if (value < 0.4) {
    return 1;
  }

  if (value < 0.7) {
    return 2;
  }

  if (value < 0.9) {
    return 3;
  }

  return 4;
}

export function createNewGame(random: () => number = Math.random): GameState {
  return {
    map: createMap(),
    character: {
      position: { x: 0, y: 0 },
      facing: "east",
      state: "idle",
    },
    trees: [
      { id: "tree-1", position: { x: 4, y: 1 }, status: "available" },
      { id: "tree-2", position: { x: 5, y: 4 }, status: "available" },
    ],
    crops: [
      { id: "crop-1", position: { x: 1, y: 1 }, stage: getInitialCropStage(random) },
      { id: "crop-2", position: { x: 2, y: 1 }, stage: getInitialCropStage(random) },
    ],
    inventory: { crop: 0 },
  };
}

function hasPosition(position: Coordinate, target: Coordinate): boolean {
  return position.x === target.x && position.y === target.y;
}

function getParcelAt(game: GameState, position: Coordinate): Parcel | undefined {
  return game.map.tiles.find((parcel) => hasPosition(parcel.position, position));
}

export function isOccupied(game: GameState, position: Coordinate): boolean {
  return (
    game.trees.some((tree) => hasPosition(tree.position, position)) ||
    game.crops.some((crop) => hasPosition(crop.position, position))
  );
}

export function isWalkable(game: GameState, position: Coordinate): boolean {
  const parcel = getParcelAt(game, position);

  return parcel?.walkable === true && !isOccupied(game, position);
}

export function getInteractionTargetAt(
  game: GameState,
  position: Coordinate,
): InteractionTarget | undefined {
  if (game.trees.some((tree) => hasPosition(tree.position, position))) {
    return { kind: "tree", position };
  }

  if (game.crops.some((crop) => hasPosition(crop.position, position))) {
    return { kind: "crop", position };
  }

  if (getParcelAt(game, position) !== undefined) {
    return { kind: "parcel", position };
  }

  return undefined;
}
