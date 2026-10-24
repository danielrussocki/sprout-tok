import type { Coordinate, GameMap } from "../game/model";

const cellSize = 72;
const mapPadding = 16;

export interface SelectionPointerEvent {
  global: Coordinate;
  pointerType?: string;
}

export interface PointerVisualState {
  position: Coordinate;
  hoveredTile?: Coordinate;
}

export function clearPointerVisualState(): undefined {
  return undefined;
}

export function getCanvasCursor(pointerVisualState: PointerVisualState | undefined) {
  return pointerVisualState === undefined ? "auto" : "none";
}

function getTileAtPointerPosition(
  map: Pick<GameMap, "width" | "height">,
  pointerPosition: Coordinate,
): Coordinate | undefined {
  const position = {
    x: Math.floor((pointerPosition.x - mapPadding) / cellSize),
    y: Math.floor((pointerPosition.y - mapPadding) / cellSize),
  };

  if (position.x < 0 || position.x >= map.width || position.y < 0 || position.y >= map.height) {
    return undefined;
  }

  return position;
}

export function createPointerVisualState(
  map: Pick<GameMap, "width" | "height">,
  event: SelectionPointerEvent,
): PointerVisualState | undefined {
  if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
    return undefined;
  }

  return {
    position: { ...event.global },
    hoveredTile: getTileAtPointerPosition(map, event.global),
  };
}

export function selectAtPointerPosition(
  map: Pick<GameMap, "width" | "height">,
  event: SelectionPointerEvent,
  onSelect: (position: Coordinate) => void,
) {
  const position = getTileAtPointerPosition(map, event.global);

  if (position === undefined) {
    return;
  }

  onSelect(position);
}

export function createSelectionHandler(
  map: Pick<GameMap, "width" | "height">,
  onSelect: (position: Coordinate) => void,
) {
  return (event: SelectionPointerEvent) => selectAtPointerPosition(map, event, onSelect);
}
