import { useTranslation } from "../hooks/useTranslation";
import { type Game } from "../utils/gameLogic";

interface MatchScoreboardProps {
  game: Game;
}

export default function MatchScoreboard({ game }: MatchScoreboardProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-center">
      <div className="text-sm uppercase tracking-wide text-slate-400">
        {game.bestOf === 0
          ? t("match.infiniteMatch")
          : t("match.bestOf", { count: game.bestOf })}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">
        {game.players.X} {game.matchWins.X} - {game.matchWins.O}{" "}
        {game.players.O}
      </div>
      <div className="mt-1 text-sm text-slate-400">
        {game.winsNeeded === null
          ? t("match.infiniteDescription")
          : t("match.firstToWins", {
              count: game.winsNeeded,
              suffix: game.winsNeeded === 1 ? "" : t("match.roundsSuffix"),
            })}
      </div>
    </div>
  );
}
