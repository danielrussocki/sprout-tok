import { extend } from "@pixi/react";
import { Graphics, Text } from "pixi.js";
import { useCallback, useState } from "react";
import type { CharacterState, Coordinate, GameState } from "../game/model";
import {
  clearPointerVisualState,
  createPointerVisualState,
  createSelectionHandler,
  getCanvasCursor,
  type PointerVisualState,
  type SelectionPointerEvent,
} from "./FarmSceneSelection";
import {
  characterVisuals,
  cropIndicatorVisual,
  cropVisuals,
  getCropIndicatorPosition,
  getStaminaLabel,
  routeMarkerVisual,
  shouldShowCropIndicator,
  staminaVisual,
  tileVisuals,
} from "./FarmSceneVisuals";
import { drawTrees } from "./FarmSceneTrees";
import { getCharacterVisualPosition } from "./movementInterpolation";
import { getPendingRouteMarkers } from "./routeMarkers";

extend({ Graphics, Text });

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

function drawScene(
  graphics: Graphics,
  game: GameState,
  pointerVisualState: PointerVisualState | undefined,
) {
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

  for (const marker of getPendingRouteMarkers(game)) {
    const position = getCellPosition(marker.x, marker.y);

    graphics
      .circle(position.x + cellSize / 2, position.y + cellSize / 2, routeMarkerVisual.radius)
      .stroke({ color: routeMarkerVisual.color, width: routeMarkerVisual.width });
  }

  drawTrees(graphics, game.trees, getCellPosition);

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

    if (shouldShowCropIndicator(crop)) {
      const indicatorPosition = getCropIndicatorPosition(crop.position);

      graphics
        .circle(indicatorPosition.x, indicatorPosition.y, cropIndicatorVisual.radius)
        .fill(cropIndicatorVisual.color);
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

  if (pointerVisualState?.hoveredTile !== undefined) {
    const position = getCellPosition(
      pointerVisualState.hoveredTile.x,
      pointerVisualState.hoveredTile.y,
    );

    graphics.rect(position.x, position.y, cellSize, cellSize).stroke({
      color: 0xd9f6ff,
      width: 3,
    });
  }

  if (pointerVisualState !== undefined) {
    const { x, y } = pointerVisualState.position;

    graphics
      .moveTo(x, y)
      .lineTo(x, y + 22)
      .lineTo(x + 6, y + 16)
      .lineTo(x + 12, y + 24)
      .lineTo(x + 16, y + 20)
      .lineTo(x + 10, y + 12)
      .lineTo(x + 18, y + 12)
      .closePath()
      .fill(0x1d3a28)
      .stroke({ color: 0xffffff, width: 2 });
  }
}

interface FarmSceneProps {
  game: GameState;
  onSelect?: (position: Coordinate) => void;
}

export function FarmScene({ game, onSelect }: FarmSceneProps) {
  const staminaLabel = game.stamina === undefined ? undefined : getStaminaLabel(game.stamina.value);
  const [pointerVisualState, setPointerVisualState] = useState<PointerVisualState>();
  const draw = useCallback(
    (graphics: Graphics) => drawScene(graphics, game, pointerVisualState),
    [game, pointerVisualState],
  );
  const select = useCallback(
    (event: SelectionPointerEvent) => {
      if (onSelect !== undefined) {
        createSelectionHandler(game.map, onSelect)(event);
      }
    },
    [game.map, onSelect],
  );
  const updatePointerVisualState = useCallback(
    (event: SelectionPointerEvent) => {
      setPointerVisualState(createPointerVisualState(game.map, event));
    },
    [game.map],
  );
  const clearPointerFeedback = useCallback(() => {
    setPointerVisualState(clearPointerVisualState());
  }, []);

  return (
    <>
      <pixiGraphics
        cursor={getCanvasCursor(pointerVisualState)}
        draw={draw}
        eventMode="static"
        onPointerEnter={updatePointerVisualState}
        onPointerLeave={clearPointerFeedback}
        onPointerMove={updatePointerVisualState}
        onPointerTap={select}
      />
      {staminaLabel === undefined ? null : (
        <pixiText
          text={staminaLabel}
          x={staminaVisual.x}
          y={staminaVisual.y}
          style={staminaVisual.style}
        />
      )}
    </>
  );
}
