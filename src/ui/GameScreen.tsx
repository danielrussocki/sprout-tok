import { Application } from "@pixi/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { completeAction } from "../game/actions";
import { advanceMovement, selectPosition } from "../game/commands";
import type { Coordinate } from "../game/model";
import { restoreGame, saveStorageKey, serializeGame } from "../game/save";
import { FarmScene } from "./FarmScene";
import { farmSceneSize } from "./FarmSceneVisuals";
import { StatusPanel } from "./StatusPanel";
import { advanceTimePulse, shouldRequestTimePulse, startTimePulse } from "./timePulse";

function loadGame() {
  return restoreGame(localStorage.getItem(saveStorageKey), Date.now(), Math.random);
}

export function GameScreen() {
  const [game, setGame] = useState(loadGame);
  const actionSequence = useRef(0);
  const requestsTimePulse = shouldRequestTimePulse(game);

  useEffect(() => {
    localStorage.setItem(saveStorageKey, serializeGame(game, Date.now()));
  }, [game]);

  useEffect(() => {
    if (!requestsTimePulse) {
      return;
    }

    return startTimePulse((now, random) => {
      setGame((currentGame) => {
        if (!shouldRequestTimePulse(currentGame)) {
          return currentGame;
        }

        if (currentGame.movement === undefined) {
          return advanceTimePulse(currentGame, now, random);
        }

        actionSequence.current += 1;
        return advanceMovement(currentGame, now, `action-${actionSequence.current}`);
      });
    });
  }, [requestsTimePulse]);

  useEffect(() => {
    if (game.activeAction === undefined) {
      return;
    }

    const { id, completesAt } = game.activeAction;
    const timeoutId = window.setTimeout(
      () => setGame((currentGame) => completeAction(currentGame, id, Date.now())),
      Math.max(0, completesAt - Date.now()),
    );

    return () => window.clearTimeout(timeoutId);
  }, [game.activeAction]);

  const select = useCallback((position: Coordinate) => {
    setGame((currentGame) => selectPosition(currentGame, position, Date.now()));
  }, []);

  return (
    <main className="min-h-screen bg-lime-950 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
        <Application
          antialias
          background={0x1d3a28}
          height={farmSceneSize.height}
          width={farmSceneSize.width}
        >
          <FarmScene game={game} onSelect={select} />
        </Application>
        <StatusPanel game={game} />
      </div>
    </main>
  );
}
