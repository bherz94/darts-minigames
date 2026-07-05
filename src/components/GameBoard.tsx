import { type Claim } from "../utils/gameLogic";

interface GameBoardProps {
  boardNumbers: number[];
  claims: Claim[];
  winningLine: number[];
  onTileClick: (index: number) => void;
  disabled: boolean;
}

export default function GameBoard({
  boardNumbers,
  claims,
  winningLine,
  onTileClick,
  disabled,
}: GameBoardProps) {
  return (
    <div className="grid w-full max-w-[min(92vw,42rem)] grid-cols-3 gap-3 md:max-w-[min(78vw,34rem)] lg:max-w-[min(70vw,32rem)]">
      {boardNumbers.map((number, index) => {
        const claim = claims[index];
        const isWinningTile = winningLine.includes(index);

        return (
          <button
            key={`${number}-${index}`}
            onClick={() => onTileClick(index)}
            disabled={disabled}
            className={[
              "relative aspect-square overflow-hidden rounded-2xl border transition",
              "flex items-center justify-center",
              "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800",
              isWinningTile ? "ring-4 ring-emerald-400" : "",
              disabled ? "cursor-default" : "cursor-pointer",
            ].join(" ")}
          >
            {!claim && (
              <span className="flex h-full w-full items-center justify-center text-5xl font-black text-slate-100 sm:text-6xl md:text-6xl lg:text-7xl">
                {number}
              </span>
            )}
            {claim && (
              <>
                <span className="absolute left-3 top-3 text-sm font-medium text-slate-400">
                  {number}
                </span>
                <span
                  className={[
                    "text-5xl font-black sm:text-6xl md:text-6xl lg:text-7xl",
                    claim === "X" ? "text-cyan-400" : "",
                    claim === "O" ? "text-pink-400" : "",
                  ].join(" ")}
                >
                  {claim}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
