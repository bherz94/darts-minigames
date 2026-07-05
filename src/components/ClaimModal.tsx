import { useTranslation } from "../hooks/useTranslation";
import { type Claim, type PlayerSymbol } from "../utils/gameLogic";

interface ClaimModalProps {
  number: number;
  currentClaim: Claim;
  players: { X: string; O: string };
  onClaim: (symbol: PlayerSymbol) => void;
  onUnclaim: () => void;
  onClose: () => void;
}

export default function ClaimModal({
  number,
  currentClaim,
  players,
  onClaim,
  onUnclaim,
  onClose,
}: ClaimModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold">
          {t("claim.numberTitle", { number })}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {!currentClaim
            ? t("claim.selectWhoCheckedOut")
            : t("claim.currentlyClaimedBy", {
                name: currentClaim === "X" ? players.X : players.O,
              })}
        </p>
        <div className="mt-6 grid gap-3">
          <button
            onClick={() => onClaim("X")}
            className={[
              "rounded-xl border px-4 py-4 text-left transition",
              currentClaim === "X"
                ? "border-cyan-400 bg-cyan-500/20"
                : "border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20",
            ].join(" ")}
          >
            <div className="text-sm text-cyan-300">X</div>
            <div className="text-lg font-semibold text-white">{players.X}</div>
          </button>
          <button
            onClick={() => onClaim("O")}
            className={[
              "rounded-xl border px-4 py-4 text-left transition",
              currentClaim === "O"
                ? "border-pink-400 bg-pink-500/20"
                : "border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20",
            ].join(" ")}
          >
            <div className="text-sm text-pink-300">O</div>
            <div className="text-lg font-semibold text-white">{players.O}</div>
          </button>
        </div>
        {currentClaim && (
          <button
            onClick={onUnclaim}
            className="mt-4 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-medium text-amber-200 transition hover:bg-amber-500/20"
          >
            {t("actions.unclaimNumber")}
          </button>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
        >
          {t("actions.cancel")}
        </button>
      </div>
    </div>
  );
}
