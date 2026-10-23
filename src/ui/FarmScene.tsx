import { extend } from "@pixi/react";
import { Graphics } from "pixi.js";
import { useCallback } from "react";
import type { CharacterState, Coordinate, GameState } from "../game/model";
import { selectAtPointerPosition, type SelectionPointerEvent } from "./FarmSceneSelection";
import { characterVisuals, cropVisuals, tileVisuals, treeVisuals } from "./FarmSceneVisuals";
import { getCharacterVisualPosition } from "./movementInterpolation";

extend({ Graphics });

const cellSize = 72;
const mapPadding = 16;

function getCellPosition(x: number, y: number) {
  return { x: mapPadding + x * cellSize, y: mapPadding + y * cellSize };
}

function drawCharacterMarker(
  graphics: Graphics,
  state: CharacterState,
  centerX: number,
  centerY: number,
) {
  const markerColor = 0xffffff;

  if (state === "idle") {
    graphics.circle(centerX, centerY, 19).stroke({ color: markerColor, width: 2 });
  } else if (state === "walking") {
    graphics
      .moveTo(centerX - 13, centerY + 16)
      .lineTo(centerX + 14, centerY - 16)
      .stroke({
        color: markerColor,
        width: 3,
      });
  } else if (state === "tilling dirt") {
    graphics
      .moveTo(centerX - 14, centerY + 12)
      .lineTo(centerX + 14, centerY + 12)
      .stroke({
        color: markerColor,
        width: 3,
      });
    graphics
      .moveTo(centerX, centerY - 14)
      .lineTo(centerX, centerY + 12)
      .stroke({
        color: markerColor,
        width: 3,
      });
  } else if (state === "chopping") {
    graphics
      .moveTo(centerX - 13, centerY + 13)
      .lineTo(centerX + 13, centerY - 13)
      .stroke({
        color: markerColor,
        width: 4,
      });
    graphics
      .moveTo(centerX + 2, centerY - 13)
      .lineTo(centerX + 15, centerY - 13)
      .stroke({
        color: markerColor,
        width: 4,
      });
  } else {
    graphics.circle(centerX - 8, centerY + 10, 3).fill(markerColor);
    graphics.circle(centerX, centerY + 15, 4).fill(markerColor);
    graphics.circle(centerX + 9, centerY + 10, 3).fill(markerColor);
  }
}

function drawScene(graphics: Graphics, game: GameState) {
  graphics.clear();

  for (const tile of game.map.tiles) {
    const position = getCellPosition(tile.position.x, tile.position.y);
    const visual =
      tile.kind === "grass"
        ? tileVisuals.grass
        : tile.tilled
          ? tileVisuals.tilledSoil
          : tileVisuals.soil;

    graphics.rect(position.x, position.y, cellSize, cellSize).fill(visual.color).stroke({
      color: 0x527844,
      width: 1,
    });

    if (tile.kind === "soil" && tile.tilled) {
      for (const offset of [16, 32, 48]) {
        graphics
          .moveTo(position.x + 10, position.y + offset)
          .lineTo(position.x + cellSize - 10, position.y + offset)
          .stroke({
            color: 0xb27a51,
            width: 2,
          });
      }
    }
  }

  for (const tree of game.trees) {
    const position = getCellPosition(tree.position.x, tree.position.y);
    const centerX = position.x + cellSize / 2;
    const centerY = position.y + cellSize / 2;
    const visual = treeVisuals[tree.status];

    graphics.rect(centerX - 6, centerY - 2, 12, 25).fill(visual.trunkColor);

    if (tree.status === "available") {
      graphics
        .circle(centerX, centerY - 10, visual.canopyRadius)
        .fill(visual.canopyColor)
        .stroke({
          color: 0x24552d,
          width: 2,
        });
    } else {
      graphics
        .circle(centerX, centerY + 19, visual.stumpRadius)
        .fill(visual.trunkColor)
        .stroke({
          color: 0x4f301e,
          width: 2,
        });
    }
  }

  for (const crop of game.crops) {
    const position = getCellPosition(crop.position.x, crop.position.y);
    const centerX = position.x + cellSize / 2;
    const groundY = position.y + cellSize - 14;
    const visual = cropVisuals[crop.stage];

    graphics
      .moveTo(centerX, groundY)
      .lineTo(centerX, groundY - visual.height)
      .stroke({
        color: visual.color,
        width: 5,
      });
    graphics
      .circle(centerX - visual.leafRadius, groundY - visual.height / 2, visual.leafRadius)
      .fill(visual.color);
    graphics
      .circle(centerX + visual.leafRadius, groundY - visual.height / 2, visual.leafRadius)
      .fill(visual.color);

    if (crop.stage === 4) {
      graphics.circle(centerX, groundY - visual.height, 8).fill(0xf2cf5b);
    }
  }

  const visualPosition = getCharacterVisualPosition(game);
  const characterPosition = getCellPosition(visualPosition.x, visualPosition.y);
  const centerX = characterPosition.x + cellSize / 2;
  const centerY = characterPosition.y + cellSize / 2;
  const characterVisual = characterVisuals[game.character.state];

  graphics
    .circle(centerX, centerY, 16)
    .fill(characterVisual.color)
    .stroke({ color: 0xffffff, width: 2 });
  drawCharacterMarker(graphics, game.character.state, centerX, centerY);
}

interface FarmSceneProps {
  game: GameState;
  onSelect?: (position: Coordinate) => void;
}

export function FarmScene({ game, onSelect }: FarmSceneProps) {
  const draw = useCallback((graphics: Graphics) => drawScene(graphics, game), [game]);
  const select = useCallback(
    (event: SelectionPointerEvent) => {
      if (onSelect !== undefined) {
        selectAtPointerPosition(game.map, event, onSelect);
      }
    },
    [game.map, onSelect],
  );

  return <pixiGraphics cursor="pointer" draw={draw} eventMode="static" onPointerTap={select} />;
}
