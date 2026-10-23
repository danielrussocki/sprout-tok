import type { CharacterState, Coordinate, Crop, CropStage } from "../game/model";

const cellSize = 72;
const mapPadding = 16;

export const farmSceneSize = {
  width: mapPadding * 2 + cellSize * 8,
  height: mapPadding * 2 + cellSize * 6,
} as const;

export const tileVisuals = {
  grass: { color: 0x8fbc66 },
  soil: { color: 0xa56a43 },
  tilledSoil: { color: 0x75452d, furrows: true },
} as const;

export const treeVisuals = {
  available: { trunkColor: 0x70452a, canopyColor: 0x3d7a3a, canopyRadius: 23, stumpRadius: 0 },
  reduced: { trunkColor: 0x70452a, canopyColor: 0x000000, canopyRadius: 0, stumpRadius: 15 },
} as const;

export const cropVisuals: Record<CropStage, { color: number; height: number; leafRadius: number }> =
  {
    1: { color: 0x6fba4a, height: 12, leafRadius: 4 },
    2: { color: 0x52a63c, height: 19, leafRadius: 6 },
    3: { color: 0x368a35, height: 26, leafRadius: 8 },
    4: { color: 0xe6b84a, height: 33, leafRadius: 10 },
  };

export const cropIndicatorVisual = {
  color: 0x39a845,
  radius: 6,
  topOffset: 14,
} as const;

export function getCropIndicatorPosition(position: Coordinate) {
  return {
    x: mapPadding + position.x * cellSize + cellSize / 2,
    y: mapPadding + position.y * cellSize + cropIndicatorVisual.topOffset,
  };
}

export function shouldShowCropIndicator(crop: Crop): boolean {
  return crop.growthReadyAt == null;
}

export const characterVisuals: Record<
  CharacterState,
  { color: number; marker: string; label: string }
> = {
  idle: { color: 0x2454a6, marker: "ring", label: "quieto" },
  walking: { color: 0x147fa8, marker: "stride", label: "caminando" },
  "tilling dirt": { color: 0x9a5a23, marker: "hoe", label: "labrando" },
  chopping: { color: 0xb93e32, marker: "axe", label: "talando" },
  watering: { color: 0x315fc0, marker: "drops", label: "regando" },
};
