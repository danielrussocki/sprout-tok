import { describe, expect, it } from "vitest";

import type { GameState } from "../game/model";
import { getCharacterVisualPosition } from "./movementInterpolation";

const walkingGame: GameState = {
  map: { width: 2, height: 1, tiles: [] },
  character: { position: { x: 0, y: 0 }, facing: "east", state: "walking" },
  trees: [],
  crops: [],
  inventory: { crop: 0 },
  route: [{ x: 1, y: 0 }],
  movement: {
    continuousPosition: { x: 0.5, y: 0 },
    activeSegment: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
    remainingRoute: [],
    lastAdvancedAt: 175,
  },
};

describe("character movement interpolation", () => {
  it("renders the continuous position calculated by the game logic", () => {
    expect(getCharacterVisualPosition(walkingGame)).toEqual({ x: 0.5, y: 0 });
  });

  it("keeps the character at its logical position when it is not walking", () => {
    const idleGame: GameState = {
      ...walkingGame,
      character: { ...walkingGame.character, state: "idle" },
    };

    expect(getCharacterVisualPosition(idleGame)).toEqual({ x: 0, y: 0 });
  });

  it("keeps the continuous position when a new selection replaces the current order", () => {
    const replacementGame: GameState = {
      ...walkingGame,
      route: [{ x: 0, y: 1 }],
      movement: {
        continuousPosition: { x: 0.6428571428571429, y: 0 },
        activeSegment: {
          start: { x: 0.6428571428571429, y: 0 },
          end: { x: 0, y: 1 },
        },
        remainingRoute: [],
        lastAdvancedAt: 225,
      },
    };

    expect(getCharacterVisualPosition(replacementGame)).toEqual({
      x: 0.6428571428571429,
      y: 0,
    });
  });
});
