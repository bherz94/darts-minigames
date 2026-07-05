import { useTranslation } from "../hooks/useTranslation";

interface RoundOutcomeProps {
  roundWinnerName: string;
  roundIsDraw: boolean;
  roundNumber: number;
  isFinalRoundWin: boolean;
  canUndo: boolean;
  onNextRound: () => void;
  onFinishGame: () => void;
  onUndo: () => void;
}

export default function RoundOutcome({
  roundWinnerName,
  roundIsDraw,
  roundNumber,
  isFinalRoundWin,
  canUndo,
  onNextRound,
  onFinishGame,
  onUndo,
}: RoundOutcomeProps) {
  const { t } = useTranslation();

  return (
    <>
      {roundIsDraw ? (
        <div className="text-2xl font-bold text-amber-300">
          {t("round.draw")}
        </div>
      ) : (
        <div className="text-2xl font-bold text-emerald-300">
          {t("round.playerWonRound", {
            name: roundWinnerName,
            round: roundNumber,
          })}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {roundIsDraw ? (
          <button
            onClick={onNextRound}
            className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:opacity-90"
          >
            {t("actions.nextRound")}
          </button>
        ) : isFinalRoundWin ? (
          <button
            onClick={onFinishGame}
            className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:opacity-90"
          >
            {t("actions.finishGame")}
          </button>
        ) : (
          <button
            onClick={onNextRound}
            className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:opacity-90"
          >
            {t("actions.nextRound")}
          </button>
        )}

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={[
            "rounded-xl px-4 py-3 font-medium transition",
            canUndo
              ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
              : "cursor-not-allowed bg-slate-700 text-slate-400",
          ].join(" ")}
        >
          {t("actions.undoLastAction")}
        </button>
      </div>
    </>
  );
}
