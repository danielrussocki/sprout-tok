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
  const route = getWalkableRoute(game, start, destination);

  return route?.length;
}

export function getWalkableRoute(
  game: GameState,
  start: Coordinate,
  destination: Coordinate,
): Coordinate[] | undefined {
  const pendingPositions = [start];
  const visitedPositions = new Set([getCoordinateKey(start)]);
  const previousPositions = new Map<string, Coordinate>();

  for (let index = 0; index < pendingPositions.length; index += 1) {
    const current = pendingPositions[index];

    if (current.x === destination.x && current.y === destination.y) {
      const route: Coordinate[] = [];
      let routePosition = current;

      while (routePosition.x !== start.x || routePosition.y !== start.y) {
        route.unshift({ ...routePosition });
        const previousPosition = previousPositions.get(getCoordinateKey(routePosition));

        if (previousPosition === undefined) {
          return undefined;
        }

        routePosition = previousPosition;
      }

      return route;
    }

    for (const offset of adjacentOffsets) {
      const nextPosition = {
        x: current.x + offset.x,
        y: current.y + offset.y,
      };
      const key = getCoordinateKey(nextPosition);

      if (!visitedPositions.has(key) && isWalkable(game, nextPosition)) {
        visitedPositions.add(key);
        previousPositions.set(key, current);
        pendingPositions.push(nextPosition);
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
