import type { Crop, GameState } from "./model";

export const reducedTreeDurationMs = 5 * 60 * 1_000;
export const wateringCooldownMs = 60 * 1_000;

export function canWaterCrop(crop: Crop, now: number): boolean {
  return (
    crop.stage < 4 &&
    (crop.lastWateredAt === undefined || now >= crop.lastWateredAt + wateringCooldownMs)
  );
}

export function normalizeTime(game: GameState, now: number): GameState {
  const trees = game.trees.filter(
    (tree) => tree.status !== "reduced" || now < tree.reducedAt + reducedTreeDurationMs,
  );

  return trees.length === game.trees.length ? game : { ...game, trees };
}
