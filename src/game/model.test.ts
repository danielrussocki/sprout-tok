import { describe, expectTypeOf, it } from "vitest";

import type {
  ActiveAction,
  Character,
  ContinuousPosition,
  Coordinate,
  Crop,
  Direction,
  GameState,
  Inventory,
  Movement,
  MovementSegment,
  Parcel,
  Tree,
} from "./model";

describe("game domain model", () => {
  it("represents the game state without UI data", () => {
    expectTypeOf<Coordinate>().toEqualTypeOf<{ x: number; y: number }>();
    expectTypeOf<ContinuousPosition>().toEqualTypeOf<{ x: number; y: number }>();
    expectTypeOf<Direction>().toEqualTypeOf<"north" | "east" | "south" | "west">();

    expectTypeOf<Character>().toMatchTypeOf<{
      position: Coordinate;
      facing: Direction;
      state: "idle" | "walking" | "tilling dirt" | "chopping" | "watering";
    }>();
    expectTypeOf<Parcel>().toMatchTypeOf<{
      position: Coordinate;
      kind: "grass" | "soil";
      walkable: true;
    }>();
    expectTypeOf<Tree>().toMatchTypeOf<{
      id: string;
      position: Coordinate;
      status: "available" | "reduced";
    }>();
    expectTypeOf<Crop>().toMatchTypeOf<{
      id: string;
      position: Coordinate;
      stage: 1 | 2 | 3 | 4;
      growthReadyAt?: number | null;
    }>();
    expectTypeOf<Inventory>().toEqualTypeOf<{ crop: number }>();
    expectTypeOf<ActiveAction>().toMatchTypeOf<{
      id: string;
      kind: "tilling dirt" | "chopping" | "watering";
      target: Coordinate;
      completesAt: number;
    }>();
    expectTypeOf<MovementSegment>().toEqualTypeOf<{
      start: ContinuousPosition;
      end: Coordinate;
    }>();
    expectTypeOf<Movement>().toEqualTypeOf<{
      continuousPosition: ContinuousPosition;
      activeSegment: MovementSegment;
      remainingRoute: Coordinate[];
      lastAdvancedAt: number;
    }>();
    expectTypeOf<GameState>().toMatchTypeOf<{
      character: Character;
      trees: Tree[];
      crops: Crop[];
      inventory: Inventory;
      lastTreeGenerationAttemptAt: number;
      movement?: Movement;
      activeAction?: ActiveAction;
    }>();
  });
});
