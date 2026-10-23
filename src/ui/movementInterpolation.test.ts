import { describe, expect, it } from "vitest";

import type { GameState } from "../game/model";
import {
  getCharacterVisualPosition,
  getMovementInterpolationProgress,
} from "./movementInterpolation";

const walkingGame: GameState = {
  map: { width: 2, height: 1, tiles: [] },
  character: { position: { x: 0, y: 0 }, facing: "east", state: "walking" },
  trees: [],
  crops: [],
  inventory: { crop: 0 },
  route: [{ x: 1, y: 0 }],
};

describe("character movement interpolation", () => {
  it("renders the character between its logical parcel and the next route parcel", () => {
    expect(getCharacterVisualPosition(walkingGame, 0.5)).toEqual({ x: 0.5, y: 0 });
  });

  it("keeps the character at its logical position when it is not walking", () => {
    const idleGame: GameState = {
      ...walkingGame,
      character: { ...walkingGame.character, state: "idle" },
    };

    expect(getCharacterVisualPosition(idleGame, 0.5)).toEqual({ x: 0, y: 0 });
  });

  it("restarts interpolation when a new selection replaces the current order", () => {
    const replacementGame: GameState = {
      ...walkingGame,
      route: [{ x: 1, y: 0 }],
    };

    expect(
      getMovementInterpolationProgress(
        { game: walkingGame, segmentKey: "0,0-1,0", progress: 0.5 },
        replacementGame,
      ),
    ).toBe(0);
  });

  it("resets interpolation when movement ends in an action or idle state", () => {
    const actionGame: GameState = {
      ...walkingGame,
      character: { ...walkingGame.character, state: "watering" },
      route: undefined,
    };
    const idleGame: GameState = {
      ...walkingGame,
      character: { ...walkingGame.character, state: "idle" },
      route: undefined,
    };
    const interpolation = { game: walkingGame, segmentKey: "0,0-1,0", progress: 0.5 };

    expect(getMovementInterpolationProgress(interpolation, actionGame)).toBe(0);
    expect(getMovementInterpolationProgress(interpolation, idleGame)).toBe(0);
  });
});
