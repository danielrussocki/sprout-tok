export interface Coordinate {
  x: number;
  y: number;
}

export interface ContinuousPosition {
  x: number;
  y: number;
}

export type Direction = "north" | "east" | "south" | "west";

export type CharacterState = "idle" | "walking" | "tilling dirt" | "chopping" | "watering";

export interface Character {
  position: Coordinate;
  facing: Direction;
  state: CharacterState;
}

export interface GrassParcel {
  position: Coordinate;
  kind: "grass";
  walkable: true;
}

export interface SoilParcel {
  position: Coordinate;
  kind: "soil";
  walkable: true;
  tilled: boolean;
}

export type Parcel = GrassParcel | SoilParcel;

export interface GameMap {
  width: number;
  height: number;
  tiles: Parcel[];
}

export interface AvailableTree {
  id: string;
  position: Coordinate;
  status: "available";
}

export interface ReducedTree {
  id: string;
  position: Coordinate;
  status: "reduced";
  reducedAt: number;
}

export type Tree = AvailableTree | ReducedTree;

export type CropStage = 1 | 2 | 3 | 4;

export interface Crop {
  id: string;
  position: Coordinate;
  stage: CropStage;
  lastWateredAt?: number;
}

export interface Inventory {
  crop: number;
}

export type ActionKind = "tilling dirt" | "chopping" | "watering";

export interface ActiveAction {
  id: string;
  kind: ActionKind;
  target: Coordinate;
  completesAt: number;
}

export interface MovementSegment {
  start: ContinuousPosition;
  end: Coordinate;
}

export interface Movement {
  continuousPosition: ContinuousPosition;
  activeSegment: MovementSegment;
  remainingRoute: Coordinate[];
  lastAdvancedAt: number;
}

export type InteractionTarget =
  | { kind: "parcel"; position: Coordinate }
  | { kind: "tree"; position: Coordinate }
  | { kind: "crop"; position: Coordinate };

export interface GameState {
  map: GameMap;
  character: Character;
  trees: Tree[];
  crops: Crop[];
  inventory: Inventory;
  destination?: Coordinate;
  route?: Coordinate[];
  movement?: Movement;
  pendingTarget?: InteractionTarget;
  activeAction?: ActiveAction;
  message?: string;
}
