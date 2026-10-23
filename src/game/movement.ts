import type { Coordinate, Direction, GameState, InteractionTarget } from "./model";
import { getWalkableRoute } from "./navigation";

export const movementDurationPerTileMs = 350;

function getDirectionTowards(origin: Coordinate, target: Coordinate): Direction | undefined {
  if (target.x === origin.x && target.y === origin.y - 1) {
    return "north";
  }

  if (target.x === origin.x + 1 && target.y === origin.y) {
    return "east";
  }

  if (target.x === origin.x && target.y === origin.y + 1) {
    return "south";
  }

  if (target.x === origin.x - 1 && target.y === origin.y) {
    return "west";
  }

  return undefined;
}

export function assignDestination(
  game: GameState,
  destination: Coordinate,
  pendingTarget?: InteractionTarget,
  now = 0,
): GameState {
  const activeMovement = game.character.state === "walking" ? game.movement : undefined;
  const routeOrigin = activeMovement?.continuousPosition ?? game.character.position;
  const routeStart = activeMovement?.activeSegment.end ?? game.character.position;
  const routeFromStart = getWalkableRoute(game, routeStart, destination) ?? [];
  const route =
    activeMovement === undefined ? routeFromStart : [{ ...routeStart }, ...routeFromStart];
  const updatedGame: GameState = {
    ...game,
    character: { ...game.character, state: "walking" },
    destination: { ...destination },
    route,
  };

  const firstRoutePosition = route[0];

  if (firstRoutePosition === undefined) {
    delete updatedGame.movement;
  } else {
    updatedGame.movement = {
      continuousPosition: { ...routeOrigin },
      activeSegment: {
        start: { ...routeOrigin },
        end: { ...firstRoutePosition },
      },
      remainingRoute: route.slice(1).map((position) => ({ ...position })),
      lastAdvancedAt: now,
    };
  }

  if (pendingTarget === undefined) {
    delete updatedGame.pendingTarget;
  } else {
    updatedGame.pendingTarget = pendingTarget;
  }

  return updatedGame;
}

export function advanceMovementUntil(game: GameState, now: number): GameState {
  if (game.movement === undefined || game.character.state !== "walking") {
    return game;
  }

  let updatedGame = game;

  while (updatedGame.movement !== undefined && updatedGame.character.state === "walking") {
    const { movement } = updatedGame;
    const segmentDuration = getSegmentDuration(
      movement.activeSegment.start,
      movement.activeSegment.end,
    );
    const elapsed = now - movement.lastAdvancedAt;

    if (elapsed <= 0 || elapsed < segmentDuration) {
      return {
        ...updatedGame,
        movement: {
          ...movement,
          activeSegment: {
            start: getPositionAlongSegment(
              movement.activeSegment.start,
              movement.activeSegment.end,
              Math.max(0, elapsed / segmentDuration),
            ),
            end: { ...movement.activeSegment.end },
          },
          continuousPosition: getPositionAlongSegment(
            movement.activeSegment.start,
            movement.activeSegment.end,
            Math.max(0, elapsed / segmentDuration),
          ),
          lastAdvancedAt: now,
        },
      };
    }

    updatedGame = confirmSegmentArrival(updatedGame, movement.lastAdvancedAt + segmentDuration);
  }

  return updatedGame;
}

export function arriveAtDestination(game: GameState): GameState {
  if (game.destination === undefined) {
    return { ...game, character: { ...game.character, state: "idle" } };
  }

  const position = { ...(game.route?.[0] ?? game.destination) };
  const remainingRoute = game.route?.slice(1) ?? [];

  if (remainingRoute.length > 0) {
    const nextPosition = remainingRoute[0];

    return {
      ...game,
      character: { ...game.character, position, state: "walking" },
      route: remainingRoute,
      movement:
        nextPosition === undefined
          ? undefined
          : {
              continuousPosition: { ...position },
              activeSegment: { start: { ...position }, end: { ...nextPosition } },
              remainingRoute: remainingRoute
                .slice(1)
                .map((routePosition) => ({ ...routePosition })),
              lastAdvancedAt: game.movement?.lastAdvancedAt ?? 0,
            },
    };
  }

  const facing =
    game.pendingTarget === undefined
      ? game.character.facing
      : (getDirectionTowards(position, game.pendingTarget.position) ?? game.character.facing);

  return {
    ...game,
    character: { position, facing, state: "idle" },
    destination: undefined,
    route: undefined,
    movement: undefined,
  };
}

function confirmSegmentArrival(game: GameState, arrivedAt: number): GameState {
  const movement = game.movement;

  if (movement === undefined) {
    return game;
  }

  const position = { ...movement.activeSegment.end };
  const nextPosition = movement.remainingRoute[0];

  if (nextPosition === undefined) {
    const facing =
      game.pendingTarget === undefined
        ? game.character.facing
        : (getDirectionTowards(position, game.pendingTarget.position) ?? game.character.facing);

    return {
      ...game,
      character: { position, facing, state: "idle" },
      destination: undefined,
      route: undefined,
      movement: undefined,
    };
  }

  const remainingRoute = movement.remainingRoute.map((routePosition) => ({ ...routePosition }));

  return {
    ...game,
    character: { ...game.character, position, state: "walking" },
    route: remainingRoute,
    movement: {
      continuousPosition: { ...position },
      activeSegment: { start: { ...position }, end: { ...nextPosition } },
      remainingRoute: remainingRoute.slice(1),
      lastAdvancedAt: arrivedAt,
    },
  };
}

function getSegmentDuration(start: Coordinate, end: Coordinate): number {
  return Math.hypot(end.x - start.x, end.y - start.y) * movementDurationPerTileMs;
}

function getPositionAlongSegment(start: Coordinate, end: Coordinate, progress: number): Coordinate {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}
