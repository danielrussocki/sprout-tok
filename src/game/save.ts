import type {
  Character,
  Coordinate,
  Crop,
  CropStage,
  GameMap,
  GameState,
  Inventory,
  Parcel,
  Tree,
} from "./model";
import { resultMessages, setResultMessage } from "./messages";
import { normalizeTime } from "./time";
import { createNewGame } from "./world";

export const saveVersion = 3;
export const saveStorageKey = `sprout-tok:save:v${saveVersion}`;

export interface SaveData {
  version: typeof saveVersion;
  savedAt: number;
  lastTreeGenerationAttemptAt: number;
  map: GameMap;
  character: Character;
  trees: Tree[];
  crops: Crop[];
  inventory: Inventory;
}

export function createSaveData(game: GameState, savedAt: number): SaveData {
  return {
    version: saveVersion,
    savedAt,
    lastTreeGenerationAttemptAt: game.lastTreeGenerationAttemptAt,
    map: {
      ...game.map,
      tiles: game.map.tiles.map(copyParcel),
    },
    character: {
      ...game.character,
      position: { ...game.character.position },
    },
    trees: game.trees.map(copyTree),
    crops: game.crops.map(copyCrop),
    inventory: { ...game.inventory },
  };
}

export function serializeGame(game: GameState, savedAt: number): string {
  return JSON.stringify(createSaveData(game, savedAt));
}

export function parseSaveData(serialized: string | null): SaveData | undefined {
  if (serialized === null) {
    return undefined;
  }

  try {
    return parseSaveValue(JSON.parse(serialized));
  } catch {
    return undefined;
  }
}

export function restoreGame(
  serialized: string | null,
  now: number,
  random: () => number = Math.random,
): GameState {
  const saveData = parseSaveData(serialized);

  if (saveData === undefined) {
    return setResultMessage(createNewGame(random, now), resultMessages.invalidSave);
  }

  return normalizeTime(
    {
      ...saveData,
      character: { ...saveData.character, state: "idle" },
      lastTreeGenerationAttemptAt: saveData.lastTreeGenerationAttemptAt,
    },
    now,
    random,
  );
}

function parseSaveValue(value: unknown): SaveData | undefined {
  if (
    !isRecord(value) ||
    value.version !== saveVersion ||
    !isTimestamp(value.savedAt) ||
    !isTimestamp(value.lastTreeGenerationAttemptAt)
  ) {
    return undefined;
  }

  const map = parseMap(value.map);

  if (map === undefined) {
    return undefined;
  }

  const character = parseCharacter(value.character, map);
  const trees = parseTrees(value.trees, map);
  const crops = parseCrops(value.crops, map);
  const inventory = parseInventory(value.inventory);

  if (
    character === undefined ||
    trees === undefined ||
    crops === undefined ||
    inventory === undefined
  ) {
    return undefined;
  }

  return {
    version: saveVersion,
    savedAt: value.savedAt,
    lastTreeGenerationAttemptAt: value.lastTreeGenerationAttemptAt,
    map,
    character,
    trees,
    crops,
    inventory,
  };
}

function parseMap(value: unknown): GameMap | undefined {
  if (!isRecord(value) || !isPositiveInteger(value.width) || !isPositiveInteger(value.height)) {
    return undefined;
  }

  if (!Array.isArray(value.tiles) || value.tiles.length !== value.width * value.height) {
    return undefined;
  }

  const parsedTiles = parseArray(value.tiles, parseParcel);

  if (parsedTiles === undefined) {
    return undefined;
  }

  const map = { width: value.width, height: value.height, tiles: parsedTiles };
  const positions = new Set<string>();

  for (const tile of parsedTiles) {
    if (!isPositionInMap(tile.position, map) || positions.has(positionKey(tile.position))) {
      return undefined;
    }

    positions.add(positionKey(tile.position));
  }

  return map;
}

function parseParcel(value: unknown): Parcel | undefined {
  if (!isRecord(value) || !isCoordinate(value.position) || value.walkable !== true) {
    return undefined;
  }

  if (value.kind === "grass") {
    return { position: { ...value.position }, kind: "grass", walkable: true };
  }

  if (value.kind === "soil" && typeof value.tilled === "boolean") {
    return { position: { ...value.position }, kind: "soil", walkable: true, tilled: value.tilled };
  }

  return undefined;
}

function parseCharacter(value: unknown, map: GameMap): Character | undefined {
  if (!isRecord(value) || !isCoordinate(value.position) || !isPositionInMap(value.position, map)) {
    return undefined;
  }

  if (
    !isDirection(value.facing) ||
    (value.state !== "idle" &&
      value.state !== "walking" &&
      value.state !== "tilling dirt" &&
      value.state !== "chopping" &&
      value.state !== "watering")
  ) {
    return undefined;
  }

  return { position: { ...value.position }, facing: value.facing, state: value.state };
}

function parseTrees(value: unknown, map: GameMap): Tree[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return parseArray(value, (tree) => parseTree(tree, map));
}

function parseTree(value: unknown, map: GameMap): Tree | undefined {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !isCoordinate(value.position) ||
    !isPositionInMap(value.position, map)
  ) {
    return undefined;
  }

  if (value.status === "available") {
    return { id: value.id, position: { ...value.position }, status: "available" };
  }

  if (value.status === "reduced" && isTimestamp(value.reducedAt)) {
    return {
      id: value.id,
      position: { ...value.position },
      status: "reduced",
      reducedAt: value.reducedAt,
    };
  }

  return undefined;
}

function parseCrops(value: unknown, map: GameMap): Crop[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return parseArray(value, (crop) => parseCrop(crop, map));
}

function parseCrop(value: unknown, map: GameMap): Crop | undefined {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !isCoordinate(value.position) ||
    !isPositionInMap(value.position, map) ||
    !isCropStage(value.stage) ||
    (value.growthReadyAt !== null && !isTimestamp(value.growthReadyAt)) ||
    (value.lastWateredAt !== undefined && !isTimestamp(value.lastWateredAt))
  ) {
    return undefined;
  }

  return value.lastWateredAt === undefined
    ? {
        id: value.id,
        position: { ...value.position },
        stage: value.stage,
        growthReadyAt: value.growthReadyAt,
      }
    : {
        id: value.id,
        position: { ...value.position },
        stage: value.stage,
        growthReadyAt: value.growthReadyAt,
        lastWateredAt: value.lastWateredAt,
      };
}

function parseInventory(value: unknown): Inventory | undefined {
  return isRecord(value) && isNonNegativeInteger(value.crop) && isNonNegativeInteger(value.log)
    ? { crop: value.crop, log: value.log }
    : undefined;
}

function copyParcel(parcel: Parcel): Parcel {
  return { ...parcel, position: { ...parcel.position } };
}

function copyTree(tree: Tree): Tree {
  return { ...tree, position: { ...tree.position } };
}

function copyCrop(crop: Crop): Crop {
  return { ...crop, position: { ...crop.position } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArray<T>(
  value: unknown[],
  parseValue: (item: unknown) => T | undefined,
): T[] | undefined {
  const parsedValues: T[] = [];

  for (const item of value) {
    const parsedValue = parseValue(item);

    if (parsedValue === undefined) {
      return undefined;
    }

    parsedValues.push(parsedValue);
  }

  return parsedValues;
}

function isCoordinate(value: unknown): value is Coordinate {
  return isRecord(value) && isNonNegativeInteger(value.x) && isNonNegativeInteger(value.y);
}

function isPositionInMap(position: Coordinate, map: GameMap): boolean {
  return position.x < map.width && position.y < map.height;
}

function isDirection(value: unknown): value is Character["facing"] {
  return value === "north" || value === "east" || value === "south" || value === "west";
}

function isCropStage(value: unknown): value is CropStage {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positionKey(position: Coordinate): string {
  return `${position.x},${position.y}`;
}
