import type { CharacterState, Stamina } from "./model";

export const minimumStamina = 0;
export const maximumStamina = 36;
export const idleRecoveryIntervalMs = 15_000;
export const walkingRecoveryIntervalMs = 30_000;
export const runningConsumptionIntervalMs = 1_000;

export function normalizeStamina(value: number): number {
  return Math.min(maximumStamina, Math.max(minimumStamina, value));
}

export function consumeRunningStamina(stamina: Stamina, elapsedMs: number): Stamina {
  const accumulatedRunningProgressMs = stamina.runningProgressMs + elapsedMs;
  const consumedPoints = Math.floor(accumulatedRunningProgressMs / runningConsumptionIntervalMs);

  if (consumedPoints === 0) {
    return { ...stamina, runningProgressMs: accumulatedRunningProgressMs };
  }

  return {
    ...stamina,
    value: normalizeStamina(stamina.value - consumedPoints),
    runningProgressMs: accumulatedRunningProgressMs % runningConsumptionIntervalMs,
  };
}

export function recoverIdleStamina(stamina: Stamina, elapsedMs: number): Stamina {
  return recoverWithInterval(stamina, elapsedMs, idleRecoveryIntervalMs);
}

export function recoverWalkingStamina(stamina: Stamina, elapsedMs: number): Stamina {
  return recoverWithInterval(stamina, elapsedMs, walkingRecoveryIntervalMs);
}

export function recoverStamina(
  stamina: Stamina,
  elapsedMs: number,
  characterState: CharacterState,
): Stamina {
  if (characterState === "idle") {
    return recoverIdleStamina(stamina, elapsedMs);
  }

  if (characterState === "walking") {
    return recoverWalkingStamina(stamina, elapsedMs);
  }

  return stamina;
}

function recoverWithInterval(
  stamina: Stamina,
  elapsedMs: number,
  recoveryIntervalMs: number,
): Stamina {
  const value = normalizeStamina(stamina.value);

  if (value === maximumStamina) {
    return { ...stamina, value, recoveryProgressMs: 0 };
  }

  const recoveryProgressMs = stamina.recoveryProgressMs + elapsedMs;

  if (recoveryProgressMs < recoveryIntervalMs) {
    return { ...stamina, value, recoveryProgressMs };
  }

  const recoveredPoints = Math.floor(recoveryProgressMs / recoveryIntervalMs);
  const recoveredValue = normalizeStamina(value + recoveredPoints);

  if (recoveredValue === maximumStamina) {
    return { ...stamina, value: recoveredValue, recoveryProgressMs: 0 };
  }

  return {
    ...stamina,
    value: recoveredValue,
    recoveryProgressMs: recoveryProgressMs % recoveryIntervalMs,
  };
}
