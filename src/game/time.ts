import type { Crop, GameState } from "./model";
import { generateTree } from "./world";

export const reducedTreeDurationMs = 5 * 60 * 1_000;
export const wateringCooldownMs = 60 * 1_000;
export const treeGenerationIntervalMs = 5 * 60 * 1_000;

export function canWaterCrop(crop: Crop, now: number): boolean {
  return (
    crop.stage < 4 &&
    (crop.lastWateredAt === undefined || now >= crop.lastWateredAt + wateringCooldownMs)
  );
}

export function normalizeTime(
  game: GameState,
  now: number,
  random: () => number = Math.random,
): GameState {
  const trees = game.trees.filter(
    (tree) => tree.status !== "reduced" || now < tree.reducedAt + reducedTreeDurationMs,
  );
  let normalizedGame = trees.length === game.trees.length ? game : { ...game, trees };

  while (now >= normalizedGame.lastTreeGenerationAttemptAt + treeGenerationIntervalMs) {
    const attemptedAt = normalizedGame.lastTreeGenerationAttemptAt + treeGenerationIntervalMs;
    const generatedGame = generateTree(normalizedGame, random);

    normalizedGame = {
      ...generatedGame,
      lastTreeGenerationAttemptAt: attemptedAt,
    };
  }

  return normalizedGame;
}
