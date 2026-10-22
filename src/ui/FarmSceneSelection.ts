import type { Coordinate, GameMap } from "../game/model";

const cellSize = 72;
const mapPadding = 16;

export interface SelectionPointerEvent {
  global: Coordinate;
  pointerType?: string;
}

export function selectAtPointerPosition(
  map: Pick<GameMap, "width" | "height">,
  event: SelectionPointerEvent,
  onSelect: (position: Coordinate) => void,
) {
  const position = {
    x: Math.floor((event.global.x - mapPadding) / cellSize),
    y: Math.floor((event.global.y - mapPadding) / cellSize),
  };

  if (position.x < 0 || position.x >= map.width || position.y < 0 || position.y >= map.height) {
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
