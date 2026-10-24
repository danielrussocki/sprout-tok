import type { Crop, CropStage, GameState } from "./model";
import { maximumStamina, recoverStamina } from "./stamina";
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
  const staminaNormalizedGame = normalizeStaminaTime(game, now);
  const crops = staminaNormalizedGame.crops.map((crop) => {
    if (crop.growthReadyAt == null || crop.growthReadyAt > now || crop.stage === 4) {
      return crop;
    }

    return {
      ...crop,
      stage: (crop.stage + 1) as CropStage,
      growthReadyAt: null,
    };
  });
  const hasGrownCrop = crops.some((crop, index) => crop !== staminaNormalizedGame.crops[index]);
  const trees = staminaNormalizedGame.trees.filter(
    (tree) => tree.status !== "reduced" || now < tree.reducedAt + reducedTreeDurationMs,
  );
  let normalizedGame =
    hasGrownCrop || trees.length !== staminaNormalizedGame.trees.length
      ? {
          ...staminaNormalizedGame,
          crops: hasGrownCrop ? crops : staminaNormalizedGame.crops,
          trees,
        }
      : staminaNormalizedGame;

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

function normalizeStaminaTime(game: GameState, now: number): GameState {
  const stamina = game.stamina;
  const lastStaminaAdvancedAt = game.lastStaminaAdvancedAt ?? now;

  if (stamina?.value === maximumStamina && stamina.recoveryProgressMs === 0) {
    return game;
  }

  if (stamina === undefined || now <= lastStaminaAdvancedAt) {
    return game.lastStaminaAdvancedAt === lastStaminaAdvancedAt
      ? game
      : { ...game, lastStaminaAdvancedAt };
  }

  return {
    ...game,
    stamina: recoverStamina(stamina, now - lastStaminaAdvancedAt, game.character.state),
    lastStaminaAdvancedAt: now,
  };
}
