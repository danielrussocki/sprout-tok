import type { ContinuousPosition, GameState } from "../game/model";

export function getCharacterVisualPosition(game: GameState): ContinuousPosition {
  if (game.character.state !== "walking" || game.movement === undefined) {
    return game.character.position;
  }

  return game.movement.continuousPosition;
}
