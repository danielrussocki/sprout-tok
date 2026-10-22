import { describe, expect, it } from "vitest";
import { createSelectionHandler } from "./FarmSceneSelection";
import { characterVisuals, cropVisuals, tileVisuals, treeVisuals } from "./FarmSceneVisuals";

describe("FarmScene visual vocabulary", () => {
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

  it("does not send a selection outside the map", () => {
    const selections: { x: number; y: number }[] = [];
    const onSelect = (position: { x: number; y: number }) => selections.push(position);
    const select = createSelectionHandler({ width: 8, height: 6 }, onSelect);

    select({ global: { x: 15, y: 16 }, pointerType: "mouse" });

    expect(selections).toEqual([]);
  });
});
