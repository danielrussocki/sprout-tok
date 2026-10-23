import type {
  Coordinate,
  CropStage,
  GameMap,
  GameState,
  GrassParcel,
  InteractionTarget,
  Parcel,
} from "./model";

const mapWidth = 8;
const mapHeight = 6;

const soilPositions = new Set(["1,1", "2,1", "1,2", "2,2"]);
const adjacentOffsets: readonly Coordinate[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
const treeSoilExclusionOffsets: readonly Coordinate[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

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

export function createNewGame(
  random: () => number = Math.random,
  now: number = Date.now(),
): GameState {
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
      {
        id: "crop-1",
        position: { x: 1, y: 1 },
        stage: getInitialCropStage(random),
        growthReadyAt: null,
      },
      {
        id: "crop-2",
        position: { x: 2, y: 1 },
        stage: getInitialCropStage(random),
        growthReadyAt: null,
      },
    ],
    inventory: { crop: 0, log: 0 },
    lastTreeGenerationAttemptAt: now,
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

function getCoordinateKey(position: Coordinate): string {
  return `${position.x},${position.y}`;
}

function getReachableWalkablePositions(
  game: GameState,
  start: Coordinate,
  blockedPosition?: Coordinate,
): Set<string> {
  const reachablePositions = new Set<string>();
  const pendingPositions = [start];

  for (let index = 0; index < pendingPositions.length; index += 1) {
    const current = pendingPositions[index];
    const currentKey = getCoordinateKey(current);

    if (
      reachablePositions.has(currentKey) ||
      (blockedPosition !== undefined && hasPosition(current, blockedPosition)) ||
      !isWalkable(game, current)
    ) {
      continue;
    }

    reachablePositions.add(currentKey);

    for (const offset of adjacentOffsets) {
      pendingPositions.push({ x: current.x + offset.x, y: current.y + offset.y });
    }
  }

  return reachablePositions;
}

export function doesTreePlacementPreserveWalkableConnections(
  game: GameState,
  position: Coordinate,
): boolean {
  const walkablePositions = game.map.tiles
    .map((parcel) => parcel.position)
    .filter((parcelPosition) => isWalkable(game, parcelPosition));

  for (const start of walkablePositions) {
    if (hasPosition(start, position)) {
      continue;
    }

    const reachableBeforePlacement = getReachableWalkablePositions(game, start);
    const reachableAfterPlacement = getReachableWalkablePositions(game, start, position);

    for (const reachablePosition of reachableBeforePlacement) {
      if (
        reachablePosition !== getCoordinateKey(position) &&
        !reachableAfterPlacement.has(reachablePosition)
      ) {
        return false;
      }
    }
  }

  return true;
}

export function getGrassParcelsWithoutAdjacentSoil(game: GameState): GrassParcel[] {
  return game.map.tiles.filter(
    (parcel): parcel is GrassParcel =>
      parcel.kind === "grass" &&
      !treeSoilExclusionOffsets.some(
        (offset) =>
          getParcelAt(game, {
            x: parcel.position.x + offset.x,
            y: parcel.position.y + offset.y,
          })?.kind === "soil",
      ),
  );
}

export function generateTree(game: GameState, random: () => number): GameState {
  if (game.trees.length >= 5) {
    return game;
  }

  const candidates = getGrassParcelsWithoutAdjacentSoil(game).filter(
    (parcel) =>
      isWalkable(game, parcel.position) &&
      doesTreePlacementPreserveWalkableConnections(game, parcel.position),
  );

  if (candidates.length === 0) {
    return game;
  }

  const position = candidates[Math.floor(random() * candidates.length)].position;
  const tree = {
    id: `tree-${game.trees.length + 1}`,
    position,
    status: "available" as const,
  };

  return { ...game, trees: [...game.trees, tree] };
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
