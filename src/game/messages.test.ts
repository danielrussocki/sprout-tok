import { describe, expect, it } from "vitest";

import { harvestCrop, startAction } from "./actions";
import {
  reportInvalidDestination,
  reportUnreachableTarget,
  resultMessages,
  setResultMessage,
} from "./messages";
import { createNewGame } from "./world";

describe("result messages", () => {
  it("defines the required player-facing results in Spanish", () => {
    expect(resultMessages).toEqual({
      invalidDestination: "El destino no es válido.",
      unreachableTarget: "No se puede alcanzar el objetivo.",
      unavailableAction: "Esta acción no está disponible.",
      invalidSave: "El guardado no es válido. Se inició una partida nueva.",
    });
  });

  it("stores a result message without mutating the previous game state", () => {
    const game = createNewGame(() => 0);

    const updatedGame = setResultMessage(game, resultMessages.unavailableAction);

    expect(updatedGame).toEqual({ ...game, message: "Esta acción no está disponible." });
    expect(game.message).toBeUndefined();
  });

  it("reports invalid destinations and unreachable targets in Spanish", () => {
    const game = createNewGame(() => 0);

    expect(reportInvalidDestination(game)).toEqual({
      ...game,
      message: resultMessages.invalidDestination,
    });
    expect(reportUnreachableTarget(game)).toEqual({
      ...game,
      message: resultMessages.unreachableTarget,
    });
  });

  it("reports an unavailable action when chopping a reduced tree", () => {
    const target = { x: 4, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      trees: [{ id: "tree-1", position: target, status: "reduced" as const, reducedAt: 1_000 }],
    };

    const updatedGame = startAction(game, "action-1", "chopping", target, 2_000);

    expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
  });

  it("reports an unavailable action when watering during its cooldown", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 1 as const, lastWateredAt: 1_000 }],
    };

    const updatedGame = startAction(game, "action-1", "watering", target, 60_999);

    expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
  });

  it("reports an unavailable action when harvesting a crop before stage four", () => {
    const target = { x: 1, y: 1 };
    const game = {
      ...createNewGame(() => 0),
      crops: [{ id: "crop-1", position: target, stage: 3 as const }],
    };

    const updatedGame = harvestCrop(game, target);

    expect(updatedGame).toEqual({ ...game, message: resultMessages.unavailableAction });
  });
});
