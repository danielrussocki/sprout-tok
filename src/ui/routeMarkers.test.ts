import { describe, expect, it } from "vitest";

import type { GameState } from "../game/model";
import { getPendingRouteMarkers } from "./routeMarkers";

const movingGame: GameState = {
  map: { width: 4, height: 1, tiles: [] },
  character: { position: { x: 0, y: 0 }, facing: "east", state: "walking" },
  trees: [],
  crops: [],
  inventory: { crop: 0, log: 0 },
  lastTreeGenerationAttemptAt: 0,
  route: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  movement: {
    continuousPosition: { x: 0.5, y: 0 },
    activeSegment: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
    remainingRoute: [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
    lastAdvancedAt: 175,
  },
};

describe("pending route markers", () => {
  it("derives one marker for every pending tile, including the active segment end", () => {
    expect(getPendingRouteMarkers(movingGame)).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("removes the reached tile when movement advances to the next segment", () => {
    const afterArrival: GameState = {
      ...movingGame,
      character: { ...movingGame.character, position: { x: 1, y: 0 } },
      route: [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      movement: {
        ...movingGame.movement!,
        continuousPosition: { x: 1, y: 0 },
        activeSegment: { start: { x: 1, y: 0 }, end: { x: 2, y: 0 } },
        remainingRoute: [{ x: 3, y: 0 }],
      },
    };

    expect(getPendingRouteMarkers(afterArrival)).toEqual([
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("uses only the replacement route after a redirection", () => {
    const redirectedGame: GameState = {
      ...movingGame,
      route: [{ x: 0, y: 1 }],
      movement: {
        ...movingGame.movement!,
        activeSegment: {
          start: { x: 0.5, y: 0 },
          end: { x: 0, y: 1 },
        },
        remainingRoute: [],
      },
    };

    expect(getPendingRouteMarkers(redirectedGame)).toEqual([{ x: 0, y: 1 }]);
  });

  it("does not expose markers without active movement", () => {
    expect(
      getPendingRouteMarkers({ ...movingGame, movement: undefined, route: undefined }),
    ).toEqual([]);
  });
});
