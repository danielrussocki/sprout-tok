import { describe, expectTypeOf, it } from "vitest";

import type {
  ActiveReference,
  ActiveAction,
  Character,
  ContinuousPosition,
  Coordinate,
  Crop,
  Direction,
  GameState,
  Inventory,
  InteractionTarget,
  Movement,
  MovementSegment,
  Parcel,
  Stamina,
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
      state: "idle" | "walking" | "running" | "tilling dirt" | "chopping" | "watering";
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
    expectTypeOf<Inventory>().toEqualTypeOf<{ crop: number; log: number }>();
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
    expectTypeOf<Stamina>().toEqualTypeOf<{
      value: number;
      recoveryProgressMs: number;
      runningProgressMs: number;
    }>();
    expectTypeOf<Extract<ActiveReference, { kind: "destination" }>>().toEqualTypeOf<{
      kind: "destination";
      position: Coordinate;
    }>();
    expectTypeOf<Extract<ActiveReference, { kind: "interaction" }>>().toEqualTypeOf<{
      kind: "interaction";
      target: InteractionTarget;
    }>();
    expectTypeOf<GameState>().toMatchTypeOf<{
      character: Character;
      stamina?: Stamina;
      trees: Tree[];
      crops: Crop[];
      inventory: Inventory;
      lastTreeGenerationAttemptAt: number;
      movement?: Movement;
      activeReference?: ActiveReference;
      activeAction?: ActiveAction;
    }>();
  });
});
