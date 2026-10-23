import type { Coordinate, GameState } from "../game/model";

export interface MovementInterpolation {
  game: GameState | undefined;
  segmentKey: string | undefined;
  progress: number;
}

export function getMovementSegmentKey(game: GameState): string | undefined {
  const nextPosition = game.route?.[0];

  return game.character.state === "walking" && nextPosition !== undefined
    ? `${game.character.position.x},${game.character.position.y}-${nextPosition.x},${nextPosition.y}`
    : undefined;
}

export function getMovementInterpolationProgress(
  interpolation: MovementInterpolation,
  game: GameState,
): number {
  const segmentKey = getMovementSegmentKey(game);

  return interpolation.game === game &&
    segmentKey !== undefined &&
    interpolation.segmentKey === segmentKey
    ? interpolation.progress
    : 0;
}

export function getCharacterVisualPosition(game: GameState, progress: number): Coordinate {
  const nextPosition = game.route?.[0];

  if (game.character.state !== "walking" || nextPosition === undefined) {
    return game.character.position;
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return {
    x: game.character.position.x + (nextPosition.x - game.character.position.x) * clampedProgress,
    y: game.character.position.y + (nextPosition.y - game.character.position.y) * clampedProgress,
  };
}
