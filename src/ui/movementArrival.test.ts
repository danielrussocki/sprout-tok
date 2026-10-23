import { describe, expect, it } from "vitest";

import { assignDestination, arriveAtDestination } from "../game/movement";
import { createNewGame } from "../game/world";
import { getNextArrivalDelay, movementDurationPerTileMs } from "./movementArrival";

describe("movement arrival scheduling", () => {
  it("schedules one arrival for each route segment", () => {
    const game = assignDestination(
      createNewGame(() => 0),
      { x: 2, y: 0 },
    );

    expect(getNextArrivalDelay(game)).toBe(movementDurationPerTileMs);

    const afterFirstArrival = arriveAtDestination(game);

    expect(getNextArrivalDelay(afterFirstArrival)).toBe(movementDurationPerTileMs);
  });

  it("does not schedule an arrival after the final route segment", () => {
    const game = assignDestination(
      createNewGame(() => 0),
      { x: 1, y: 0 },
    );
    const arrivedGame = arriveAtDestination(game);

    expect(getNextArrivalDelay(arrivedGame)).toBeUndefined();
  });
});
