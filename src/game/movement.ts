import type { Coordinate, Direction, GameState, InteractionTarget } from "./model";
import { getWalkableRoute } from "./navigation";
import { consumeRunningStamina, recoverStamina, runningConsumptionIntervalMs } from "./stamina";

export const movementDurationPerTileMs = 350;
export const runningSpeedMultiplier = 2;

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
  const activeMovement =
    game.character.state === "walking" || game.character.state === "running"
      ? game.movement
      : undefined;
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
    activeReference:
      pendingTarget === undefined
        ? { kind: "destination", position: { ...destination } }
        : {
            kind: "interaction",
            target: { ...pendingTarget, position: { ...pendingTarget.position } },
          },
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
  if (
    game.movement === undefined ||
    (game.character.state !== "walking" && game.character.state !== "running")
  ) {
    return game;
  }

  let updatedGame = game;

  while (
    updatedGame.movement !== undefined &&
    (updatedGame.character.state === "walking" || updatedGame.character.state === "running")
  ) {
    const { movement } = updatedGame;
    const characterState = updatedGame.character.state;
    const segmentDuration = getSegmentDuration(
      movement.activeSegment.start,
      movement.activeSegment.end,
      characterState,
    );
    const elapsed = now - movement.lastAdvancedAt;

    if (elapsed <= 0) {
      return updatedGame;
    }

    const runningDurationUntilConsumption =
      characterState === "running" && updatedGame.stamina !== undefined
        ? runningConsumptionIntervalMs - updatedGame.stamina.runningProgressMs
        : Number.POSITIVE_INFINITY;
    const advancedDuration = Math.min(elapsed, segmentDuration, runningDurationUntilConsumption);
    const advancedAt = movement.lastAdvancedAt + advancedDuration;
    const reachedSegmentEnd = advancedDuration === segmentDuration;

    updatedGame = advanceWithinSegment(updatedGame, advancedAt);

    if (characterState === "running" && updatedGame.stamina !== undefined) {
      const stamina = consumeRunningStamina(updatedGame.stamina, advancedDuration);

      updatedGame = {
        ...updatedGame,
        stamina,
        lastStaminaAdvancedAt: Math.max(updatedGame.lastStaminaAdvancedAt ?? 0, advancedAt),
        character:
          stamina.value < 13
            ? { ...updatedGame.character, state: "walking" }
            : updatedGame.character,
      };
    } else if (characterState === "walking" && updatedGame.stamina !== undefined) {
      const staminaRecoveryStartedAt = Math.max(
        updatedGame.lastStaminaAdvancedAt ?? movement.lastAdvancedAt,
        movement.lastAdvancedAt,
      );

      updatedGame = {
        ...updatedGame,
        stamina: recoverStamina(
          updatedGame.stamina,
          Math.max(0, advancedAt - staminaRecoveryStartedAt),
          "walking",
        ),
        lastStaminaAdvancedAt: Math.max(updatedGame.lastStaminaAdvancedAt ?? 0, advancedAt),
      };
    }

    if (reachedSegmentEnd) {
      updatedGame = confirmSegmentArrival(updatedGame, advancedAt);
    }
  }

  return updatedGame;
}

function advanceWithinSegment(game: GameState, advancedAt: number): GameState {
  const movement = game.movement;

  if (movement === undefined) {
    return game;
  }

  const segmentDuration = getSegmentDuration(
    movement.activeSegment.start,
    movement.activeSegment.end,
    game.character.state === "running" ? "running" : "walking",
  );
  const elapsed = Math.max(0, advancedAt - movement.lastAdvancedAt);
  const position = getPositionAlongSegment(
    movement.activeSegment.start,
    movement.activeSegment.end,
    elapsed / segmentDuration,
  );

  return {
    ...game,
    movement: {
      ...movement,
      continuousPosition: position,
      activeSegment: { start: position, end: { ...movement.activeSegment.end } },
      lastAdvancedAt: advancedAt,
    },
  };
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
    character: { ...game.character, position },
    route: remainingRoute,
    movement: {
      continuousPosition: { ...position },
      activeSegment: { start: { ...position }, end: { ...nextPosition } },
      remainingRoute: remainingRoute.slice(1),
      lastAdvancedAt: arrivedAt,
    },
  };
}

function getSegmentDuration(
  start: Coordinate,
  end: Coordinate,
  characterState: "walking" | "running",
): number {
  const speedMultiplier = characterState === "running" ? runningSpeedMultiplier : 1;

  return (
    (Math.hypot(end.x - start.x, end.y - start.y) * movementDurationPerTileMs) / speedMultiplier
  );
}

function getPositionAlongSegment(start: Coordinate, end: Coordinate, progress: number): Coordinate {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}
