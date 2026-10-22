import type { GameState } from "./model";

export const resultMessages = {
  invalidDestination: "El destino no es válido.",
  unreachableTarget: "No se puede alcanzar el objetivo.",
  unavailableAction: "Esta acción no está disponible.",
  invalidSave: "El guardado no es válido. Se inició una partida nueva.",
} as const;

export type ResultMessage = (typeof resultMessages)[keyof typeof resultMessages];

export function setResultMessage(game: GameState, message: ResultMessage): GameState {
  return { ...game, message };
}

export function reportInvalidDestination(game: GameState): GameState {
  return setResultMessage(game, resultMessages.invalidDestination);
}

export function reportUnreachableTarget(game: GameState): GameState {
  return setResultMessage(game, resultMessages.unreachableTarget);
}
