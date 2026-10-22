import type { Coordinate, Direction, GameState, InteractionTarget } from "./model";

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
): GameState {
  const updatedGame: GameState = {
    ...game,
    character: { ...game.character, state: "walking" },
    destination: { ...destination },
  };

  if (pendingTarget === undefined) {
    delete updatedGame.pendingTarget;
  } else {
    updatedGame.pendingTarget = pendingTarget;
  }

  return updatedGame;
}

export function arriveAtDestination(game: GameState): GameState {
  if (game.destination === undefined) {
    return { ...game, character: { ...game.character, state: "idle" } };
  }

  const position = { ...game.destination };
  const facing =
    game.pendingTarget === undefined
      ? game.character.facing
      : (getDirectionTowards(position, game.pendingTarget.position) ?? game.character.facing);

  return {
    ...game,
    character: { position, facing, state: "idle" },
    destination: undefined,
  };
}
