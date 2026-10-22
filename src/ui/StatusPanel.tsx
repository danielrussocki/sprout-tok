import type { GameState } from "../game/model";

interface StatusPanelProps {
  game: GameState;
}

const stateLabels: Record<GameState["character"]["state"], string> = {
  idle: "En espera",
  walking: "Caminando",
  "tilling dirt": "Labrando",
  chopping: "Talando",
  watering: "Regando",
};

export function StatusPanel({ game }: StatusPanelProps) {
  return (
    <aside className="w-full max-w-md rounded-xl bg-lime-900 p-5 text-lime-50 shadow-lg">
      <h1 className="text-2xl font-bold">Sprout Tok</h1>
      <dl className="mt-4 grid gap-3 text-lg">
        <div className="flex justify-between gap-4">
          <dt>Inventario</dt>
          <dd>{game.inventory.crop} cultivos</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Estado</dt>
          <dd>{stateLabels[game.character.state]}</dd>
        </div>
      </dl>
      {game.message === undefined ? null : (
        <p className="mt-4 rounded-lg bg-lime-800 p-3" role="status">
          {game.message}
        </p>
      )}
    </aside>
  );
}
