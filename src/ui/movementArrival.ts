import type { GameState } from "../game/model";

export const movementDurationPerTileMs = 350;

export function getNextArrivalDelay(game: GameState): number | undefined {
  return game.character.state === "walking" && game.route?.length
    ? movementDurationPerTileMs
    : undefined;
}
