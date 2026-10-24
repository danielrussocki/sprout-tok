import { describe, expect, it } from "vitest";
import { selectPosition } from "../game/commands";
import type { Crop, Tree } from "../game/model";
import { createNewGame } from "../game/world";
import { drawTrees } from "./FarmSceneTrees";
import {
  clearPointerVisualState,
  createPointerVisualState,
  getCanvasCursor,
  createSelectionHandler,
} from "./FarmSceneSelection";
import {
  characterVisuals,
  cropVisuals,
  getCropIndicatorPosition,
  getStaminaLabel,
  shouldShowCropIndicator,
  tileVisuals,
  treeVisuals,
} from "./FarmSceneVisuals";

function createRecordingGraphics() {
  const circles: Array<[number, number, number]> = [];
  const graphics = {
    clear() {
      return graphics;
    },
    rect() {
      return graphics;
    },
    circle(x: number, y: number, radius: number) {
      circles.push([x, y, radius]);
      return graphics;
    },
    moveTo() {
      return graphics;
    },
    lineTo() {
      return graphics;
    },
    fill() {
      return graphics;
    },
    stroke() {
      return graphics;
    },
  };

  return { graphics, circles };
}

describe("FarmScene visual vocabulary", () => {
  it("derives the canvas stamina label from the current state value", () => {
    expect(getStaminaLabel(36)).toBe("Energía: 36");
    expect(getStaminaLabel(12)).toBe("Energía: 12");
    expect(getStaminaLabel(13)).toBe("Energía: 13");
  });

  it("distinguishes grass, untilled soil, and tilled soil", () => {
    expect(tileVisuals.grass.color).not.toBe(tileVisuals.soil.color);
    expect(tileVisuals.soil.color).not.toBe(tileVisuals.tilledSoil.color);
    expect(tileVisuals.tilledSoil.furrows).toBe(true);
  });

  it("distinguishes available and reduced trees", () => {
    expect(treeVisuals.available.canopyRadius).toBeGreaterThan(0);
    expect(treeVisuals.reduced.canopyRadius).toBe(0);
    expect(treeVisuals.reduced.stumpRadius).toBeGreaterThan(0);
  });

  it("gives each crop stage a distinct visual size", () => {
    expect(Object.values(cropVisuals).map((crop) => crop.height)).toEqual([12, 19, 26, 33]);
  });

  it.each([1, 2, 3, 4] as const)(
    "shows the green indicator for an eligible stage %i crop",
    (stage) => {
      const crop: Crop = {
        id: "crop-1",
        position: { x: 1, y: 1 },
        stage,
        growthReadyAt: null,
      };

      expect(shouldShowCropIndicator(crop)).toBe(true);
    },
  );

  it("hides the green indicator while a crop is waiting to grow", () => {
    const crop: Crop = {
      id: "crop-1",
      position: { x: 1, y: 1 },
      stage: 2,
      growthReadyAt: 61_000,
    };

    expect(shouldShowCropIndicator(crop)).toBe(false);
  });

  it("aligns eligible crop indicators at a fixed height above every crop stage", () => {
    expect(getCropIndicatorPosition({ x: 0, y: 0 })).toEqual({ x: 52, y: 30 });
    expect(getCropIndicatorPosition({ x: 1, y: 0 })).toEqual({ x: 124, y: 30 });
  });

  it("gives every character state a distinct visual marker", () => {
    const markers = Object.values(characterVisuals).map((character) => character.marker);

    expect(new Set(markers)).toHaveLength(5);
    expect(characterVisuals["tilling dirt"].label).toBe("labrando");
    expect(characterVisuals.chopping.label).toBe("talando");
    expect(characterVisuals.watering.label).toBe("regando");
  });
});

describe("FarmScene selection", () => {
  it("sends the same selection intent for mouse and touch at the same coordinate", () => {
    const selections: { x: number; y: number }[] = [];
    const select = createSelectionHandler({ width: 8, height: 6 }, (position) =>
      selections.push(position),
    );

    select({ global: { x: 160, y: 232 }, pointerType: "mouse" });
    select({ global: { x: 160, y: 232 }, pointerType: "touch" });

    expect(selections).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 3 },
    ]);
  });

  it("keeps hover feedback local and sends equivalent running selections for mouse and touch", () => {
    const map = { width: 8, height: 6 };
    const initialGame = createNewGame(() => 0, 0);
    let mouseGame = initialGame;
    let touchGame = initialGame;
    const mouseSelect = createSelectionHandler(map, (position) => {
      mouseGame = selectPosition(mouseGame, position, 1_000);
    });
    const touchSelect = createSelectionHandler(map, (position) => {
      touchGame = selectPosition(touchGame, position, 1_000);
    });

    expect(
      createPointerVisualState(map, { global: { x: 160, y: 16 }, pointerType: "mouse" }),
    ).toEqual({
      position: { x: 160, y: 16 },
      hoveredTile: { x: 2, y: 0 },
    });
    expect(mouseGame).toEqual(initialGame);

    mouseSelect({ global: { x: 160, y: 16 }, pointerType: "mouse" });
    mouseSelect({ global: { x: 160, y: 16 }, pointerType: "mouse" });
    touchSelect({ global: { x: 160, y: 16 }, pointerType: "touch" });
    touchSelect({ global: { x: 160, y: 16 }, pointerType: "touch" });

    expect(mouseGame).toEqual(touchGame);
    expect(mouseGame.character.state).toBe("running");
  });

  it("sends equivalent redirection selections for mouse and touch", () => {
    const map = { width: 8, height: 6 };
    const initialGame = createNewGame(() => 0, 0);
    let mouseGame = initialGame;
    let touchGame = initialGame;
    const mouseSelect = createSelectionHandler(map, (position) => {
      mouseGame = selectPosition(mouseGame, position, 1_000);
    });
    const touchSelect = createSelectionHandler(map, (position) => {
      touchGame = selectPosition(touchGame, position, 1_000);
    });

    mouseSelect({ global: { x: 160, y: 16 }, pointerType: "mouse" });
    mouseSelect({ global: { x: 16, y: 160 }, pointerType: "mouse" });
    touchSelect({ global: { x: 160, y: 16 }, pointerType: "touch" });
    touchSelect({ global: { x: 16, y: 160 }, pointerType: "touch" });

    expect(mouseGame).toEqual(touchGame);
    expect(mouseGame.character.state).toBe("walking");
    expect(mouseGame.activeReference).toEqual({
      kind: "destination",
      position: { x: 0, y: 2 },
    });
  });

  it("does not send a selection outside the map", () => {
    const selections: { x: number; y: number }[] = [];
    const onSelect = (position: { x: number; y: number }) => selections.push(position);
    const select = createSelectionHandler({ width: 8, height: 6 }, onSelect);

    select({ global: { x: 15, y: 16 }, pointerType: "mouse" });

    expect(selections).toEqual([]);
  });

  it("derives local pointer position and the hovered tile for mouse and pen input", () => {
    const map = { width: 8, height: 6 };

    expect(
      createPointerVisualState(map, { global: { x: 160, y: 232 }, pointerType: "mouse" }),
    ).toEqual({
      position: { x: 160, y: 232 },
      hoveredTile: { x: 2, y: 3 },
    });
    expect(createPointerVisualState(map, { global: { x: 15, y: 16 }, pointerType: "pen" })).toEqual(
      {
        position: { x: 15, y: 16 },
        hoveredTile: undefined,
      },
    );
  });

  it("does not create pointer visual state for touch input", () => {
    expect(
      createPointerVisualState(
        { width: 8, height: 6 },
        { global: { x: 160, y: 232 }, pointerType: "touch" },
      ),
    ).toBeUndefined();
  });

  it("clears pointer feedback on touch input and canvas exit", () => {
    const visualState = createPointerVisualState(
      { width: 8, height: 6 },
      { global: { x: 160, y: 232 }, pointerType: "mouse" },
    );

    expect(visualState).toBeDefined();
    expect(
      createPointerVisualState(
        { width: 8, height: 6 },
        { global: { x: 160, y: 232 }, pointerType: "touch" },
      ),
    ).toBeUndefined();
    expect(clearPointerVisualState()).toBeUndefined();
  });

  it("uses the usual cursor when custom pointer feedback is hidden", () => {
    const visualState = createPointerVisualState(
      { width: 8, height: 6 },
      { global: { x: 160, y: 232 }, pointerType: "pen" },
    );

    expect(getCanvasCursor(visualState)).toBe("none");
    expect(getCanvasCursor(undefined)).toBe("auto");
  });
});

describe("FarmScene trees", () => {
  it("draws a generated available tree on its grass parcel and removes it with the state", () => {
    const generatedTree: Tree = {
      id: "tree-generated-1",
      position: { x: 3, y: 1 },
      status: "available",
    };
    const withTree = createRecordingGraphics();
    const withoutTree = createRecordingGraphics();

    drawTrees(withTree.graphics, [generatedTree], (x, y) => ({ x: 16 + x * 72, y: 16 + y * 72 }));
    drawTrees(withoutTree.graphics, [], (x, y) => ({ x: 16 + x * 72, y: 16 + y * 72 }));

    expect(withTree.circles).toContainEqual([268, 114, treeVisuals.available.canopyRadius]);
    expect(withoutTree.circles).not.toContainEqual([268, 114, treeVisuals.available.canopyRadius]);
  });
});
