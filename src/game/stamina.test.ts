import { describe, expect, it } from "vitest";

import {
  consumeRunningStamina,
  normalizeStamina,
  recoverIdleStamina,
  recoverStamina,
  recoverWalkingStamina,
} from "./stamina";

describe("normalizeStamina", () => {
  it.each([
    [0, 0],
    [36, 36],
    [-1, 0],
    [37, 36],
  ])("returns %i for a stamina value of %i", (value, expectedValue) => {
    expect(normalizeStamina(value)).toBe(expectedValue);
  });
});

describe("consumeRunningStamina", () => {
  it("consumes one point for each complete running second", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    expect(consumeRunningStamina(stamina, 2_000)).toEqual({
      value: 10,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("preserves the remaining running fraction without consuming stamina", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 250,
    };

    expect(consumeRunningStamina(stamina, 500)).toEqual({
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 750,
    });
  });

  it("does not consume stamina when a run arrives before the next complete second", () => {
    const stamina = {
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 700,
    };

    expect(consumeRunningStamina(stamina, 299)).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 999,
    });
  });

  it("carries a partial running second into a later run", () => {
    const stamina = {
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    const afterFirstRun = consumeRunningStamina(stamina, 600);
    const afterSecondRun = consumeRunningStamina(afterFirstRun, 400);

    expect(afterFirstRun).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 600,
    });
    expect(afterSecondRun).toEqual({
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("keeps stamina at zero when complete running seconds exceed the remaining value", () => {
    const stamina = {
      value: 1,
      recoveryProgressMs: 0,
      runningProgressMs: 600,
    };

    expect(consumeRunningStamina(stamina, 2_500)).toEqual({
      value: 0,
      recoveryProgressMs: 0,
      runningProgressMs: 100,
    });
  });
});

describe("recoverIdleStamina", () => {
  it("recovers exactly one point after 15 complete seconds", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    expect(recoverIdleStamina(stamina, 15_000)).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("does not recover beyond the maximum stamina", () => {
    const stamina = {
      value: 35,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    expect(recoverIdleStamina(stamina, 15_000)).toMatchObject({ value: 36 });
  });

  it("recovers once for each complete interval in a single pulse", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    expect(recoverIdleStamina(stamina, 45_000)).toEqual({
      value: 15,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("resets recovery progress and discards excess intervals upon reaching maximum stamina", () => {
    const stamina = {
      value: 35,
      recoveryProgressMs: 14_000,
      runningProgressMs: 0,
    };

    expect(recoverIdleStamina(stamina, 31_000)).toEqual({
      value: 36,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });
});

describe("recoverWalkingStamina", () => {
  it("recovers exactly one point after 30 complete seconds", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    expect(recoverWalkingStamina(stamina, 30_000)).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("preserves partial recovery progress when alternating between idle and walking", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    const afterIdle = recoverIdleStamina(stamina, 10_000);
    const afterWalking = recoverWalkingStamina(afterIdle, 20_000);

    expect(afterWalking).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("applies the walking cadence after an exact state change", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 14_999,
      runningProgressMs: 0,
    };

    const afterIdle = recoverIdleStamina(stamina, 0);
    const afterWalking = recoverWalkingStamina(afterIdle, 15_001);

    expect(afterWalking).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });

  it("recovers once for each complete walking interval in a single pulse", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    };

    expect(recoverWalkingStamina(stamina, 90_000)).toEqual({
      value: 15,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });
});

describe("recoverStamina", () => {
  it("preserves partial recovery progress while running", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 10_000,
      runningProgressMs: 0,
    };

    expect(recoverStamina(stamina, 30_000, "running")).toEqual(stamina);
  });

  it.each(["tilling dirt", "chopping", "watering"] as const)(
    "preserves partial recovery progress during %s",
    (state) => {
      const stamina = {
        value: 12,
        recoveryProgressMs: 10_000,
        runningProgressMs: 0,
      };

      expect(recoverStamina(stamina, 30_000, state)).toEqual(stamina);
    },
  );

  it("resumes recovery when returning to idle", () => {
    const stamina = {
      value: 12,
      recoveryProgressMs: 10_000,
      runningProgressMs: 0,
    };

    const afterRunning = recoverStamina(stamina, 30_000, "running");

    expect(recoverStamina(afterRunning, 5_000, "idle")).toEqual({
      value: 13,
      recoveryProgressMs: 0,
      runningProgressMs: 0,
    });
  });
});
