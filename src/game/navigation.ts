import type { Coordinate, GameState } from "./model";
import { isWalkable } from "./world";

const adjacentOffsets: readonly Coordinate[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function getCoordinateKey(position: Coordinate): string {
  return `${position.x},${position.y}`;
}

export function getWalkableRouteDistance(
  game: GameState,
  start: Coordinate,
  destination: Coordinate,
): number | undefined {
  const pendingPositions = [{ position: start, distance: 0 }];
  const visitedPositions = new Set([getCoordinateKey(start)]);

  for (let index = 0; index < pendingPositions.length; index += 1) {
    const current = pendingPositions[index];

    if (current.position.x === destination.x && current.position.y === destination.y) {
      return current.distance;
    }

    for (const offset of adjacentOffsets) {
      const nextPosition = {
        x: current.position.x + offset.x,
        y: current.position.y + offset.y,
      };
      const key = getCoordinateKey(nextPosition);

      if (!visitedPositions.has(key) && isWalkable(game, nextPosition)) {
        visitedPositions.add(key);
        pendingPositions.push({ position: nextPosition, distance: current.distance + 1 });
      }
    }
  }

  return undefined;
}

export function isValidDestination(game: GameState, destination: Coordinate): boolean {
  return isWalkable(game, destination);
}

export function findClosestWalkableAdjacentParcel(
  game: GameState,
  target: Coordinate,
): Coordinate | undefined {
  let closestParcel: Coordinate | undefined;
  let shortestRouteDistance = Number.POSITIVE_INFINITY;

  for (const offset of adjacentOffsets) {
    const parcel = { x: target.x + offset.x, y: target.y + offset.y };

    if (!isWalkable(game, parcel)) {
      continue;
    }

    const routeDistance = getWalkableRouteDistance(game, game.character.position, parcel);

    if (routeDistance !== undefined && routeDistance < shortestRouteDistance) {
      closestParcel = parcel;
      shortestRouteDistance = routeDistance;
    }
  }

  return closestParcel;
}
