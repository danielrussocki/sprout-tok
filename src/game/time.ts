import type { Crop, CropStage, GameState } from "./model";
import { generateTree } from "./world";

export const reducedTreeDurationMs = 5 * 60 * 1_000;
export const wateringCooldownMs = 60 * 1_000;
export const treeGenerationIntervalMs = 5 * 60 * 1_000;

export function canWaterCrop(crop: Crop, _now: number): boolean {
  return crop.stage < 4 && crop.growthReadyAt == null;
}

export function normalizeTime(
  game: GameState,
  now: number,
  random: () => number = Math.random,
): GameState {
  const crops = game.crops.map((crop) => {
    if (crop.growthReadyAt == null || crop.growthReadyAt > now || crop.stage === 4) {
      return crop;
    }

    return {
      ...crop,
      stage: (crop.stage + 1) as CropStage,
      growthReadyAt: null,
    };
  });
  const hasGrownCrop = crops.some((crop, index) => crop !== game.crops[index]);
  const trees = game.trees.filter(
    (tree) => tree.status !== "reduced" || now < tree.reducedAt + reducedTreeDurationMs,
  );
  let normalizedGame =
    hasGrownCrop || trees.length !== game.trees.length
      ? { ...game, crops: hasGrownCrop ? crops : game.crops, trees }
      : game;

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
