import { describe, expect, it } from "vitest";

import { arriveForInteraction, selectPosition } from "./commands";
import { createNewGame } from "./world";

describe("game commands", () => {
  it("assigns a valid empty destination", () => {
    const game = createNewGame(() => 0);

    const updatedGame = selectPosition(game, { x: 0, y: 1 }, 1_000);

    expect(updatedGame.character.state).toBe("walking");
    expect(updatedGame.destination).toEqual({ x: 0, y: 1 });
  });

  it("walks to an adjacent parcel before starting a contextual action", () => {
    const game = createNewGame(() => 0);

    const selectedGame = selectPosition(game, { x: 4, y: 1 }, 1_000);
    const arrivedGame = arriveForInteraction(selectedGame, 1_350);

    expect(selectedGame.destination).toEqual({ x: 4, y: 0 });
    expect(arrivedGame.character).toMatchObject({
      position: { x: 4, y: 0 },
      facing: "south",
      state: "chopping",
    });
    expect(arrivedGame.activeAction).toMatchObject({
      kind: "chopping",
      target: { x: 4, y: 1 },
      completesAt: 4_350,
    });
  });

  it("plants and harvests immediately after reaching the selected target", () => {
    const game = createNewGame(() => 0);
    const target = { x: 1, y: 2 };
    const tilledGame = {
      ...game,
      map: {
        ...game.map,
        tiles: game.map.tiles.map((tile) =>
          tile.position.x === target.x && tile.position.y === target.y
            ? { ...tile, tilled: true }
            : tile,
        ),
      },
      character: { ...game.character, position: { x: 1, y: 3 }, facing: "north" as const },
    };

    const plantedGame = arriveForInteraction(selectPosition(tilledGame, target, 1_000), 1_000);
    const harvestableGame = {
      ...plantedGame,
      crops: plantedGame.crops.map((crop) =>
        crop.position.x === target.x && crop.position.y === target.y
          ? { ...crop, stage: 4 as const }
          : crop,
      ),
    };
    const harvestedGame = arriveForInteraction(
      selectPosition(harvestableGame, target, 2_000),
      2_000,
    );

    expect(plantedGame.crops).toContainEqual({ id: "crop-3", position: target, stage: 1 });
    expect(harvestedGame.crops).not.toContainEqual({ id: "crop-3", position: target, stage: 4 });
    expect(harvestedGame.inventory.crop).toBe(1);
  });
});
