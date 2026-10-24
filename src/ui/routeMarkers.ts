import type { Coordinate, GameState } from "../game/model";

export function getPendingRouteMarkers(game: GameState): Coordinate[] {
  const movement = game.movement;

  if (movement === undefined) {
    return [];
  }

  return [movement.activeSegment.end, ...movement.remainingRoute];
}
