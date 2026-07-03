import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";

const COUNTER_STORAGE_KEY = "darts-counter-gamestate";

function hydrateGame(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { startingScore, players, currentPlayerIndex, winner } = raw;
  if (startingScore !== 301 && startingScore !== 501) return null;
  if (!Array.isArray(players) || players.length < 2 || players.length > 6) return null;
  for (const p of players) {
    if (!p || typeof p.name !== "string" || !p.name.trim()) return null;
    if (!Number.isInteger(p.score) || p.score < 0 || p.score > startingScore) return null;
    if (!Array.isArray(p.history)) return null;
  }
  if (
    !Number.isInteger(currentPlayerIndex) ||
    currentPlayerIndex < 0 ||
    currentPlayerIndex >= players.length
  ) return null;
  if (winner !== null && winner !== undefined && typeof winner !== "string") return null;
  return {
    startingScore,
    players: players.map((p) => ({
      name: p.name,
      score: p.score,
      history: p.history.map((h) => ({ value: Number(h?.value) || 0, bust: !!h?.bust })),
    })),
    currentPlayerIndex,
    winner: winner ?? null,
    lastSnapshot: null,
  };
}

function validateSetup(names, t) {
  const trimmed = names.map((n) => n.trim());
  if (!trimmed.every((n) => n.length > 0)) {
    return { valid: false, error: t("counter.validation.emptyName") };
  }
  if (new Set(trimmed).size !== trimmed.length) {
    return { valid: false, error: t("counter.validation.duplicateNames") };
  }
  return { valid: true, error: "" };
}

export default function DartCounterPage({ onNavigate }) {
  const { t } = useTranslation();
  const scoreInputRef = useRef(null);

  const [playerNames, setPlayerNames] = useState(["", ""]);
  const [startingScore, setStartingScore] = useState(501);

  const [game, setGame] = useState(() => {
    try {
      const saved = window.localStorage.getItem(COUNTER_STORAGE_KEY);
      if (!saved) return null;
      return hydrateGame(JSON.parse(saved));
    } catch {
      return null;
    }
  });

  const [scoreInput, setScoreInput] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    try {
      if (game) {
        window.localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(game));
      } else {
        window.localStorage.removeItem(COUNTER_STORAGE_KEY);
      }
    } catch {
      // ignore storage write failures
    }
  }, [game]);

  useEffect(() => {
    if (game && !game.winner) {
      scoreInputRef.current?.focus();
    }
  }, [game?.currentPlayerIndex, game?.winner]);

  const setupValidation = validateSetup(playerNames, t);
  const anyNameEntered = playerNames.some((n) => n.trim().length > 0);

  const parsedScore = parseInt(scoreInput, 10);
  const scoreValid = !isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 180;

  function handleStartGame() {
    if (!setupValidation.valid) return;
    setGame({
      startingScore,
      players: playerNames.map((name) => ({
        name: name.trim(),
        score: startingScore,
        history: [],
      })),
      currentPlayerIndex: 0,
      winner: null,
      lastSnapshot: null,
    });
    setScoreInput("");
  }

  function handleSubmitScore() {
    if (!game || game.winner || !scoreValid) return;

    const idx = game.currentPlayerIndex;
    const player = game.players[idx];
    const newScore = player.score - parsedScore;
    const isBust = newScore < 0;
    const isWin = newScore === 0;

    const updatedPlayer = {
      ...player,
      score: isBust ? player.score : newScore,
      history: [...player.history, { value: parsedScore, bust: isBust }],
    };

    setGame({
      ...game,
      players: game.players.map((p, i) => (i === idx ? updatedPlayer : p)),
      currentPlayerIndex: isWin ? idx : (idx + 1) % game.players.length,
      winner: isWin ? player.name : null,
      lastSnapshot: { ...game, lastSnapshot: null },
    });
    setScoreInput("");
  }

  function handleUndo() {
    if (!game?.lastSnapshot) return;
    setGame(game.lastSnapshot);
    setScoreInput("");
  }

  function goToSetup() {
    if (game) {
      setPlayerNames(game.players.map((p) => p.name));
      setStartingScore(game.startingScore);
    }
    setGame(null);
    setScoreInput("");
    setResetConfirmOpen(false);
  }

  function handlePlayAgain() {
    if (!game) return;
    setGame({
      startingScore: game.startingScore,
      players: game.players.map((p) => ({
        name: p.name,
        score: game.startingScore,
        history: [],
      })),
      currentPlayerIndex: 0,
      winner: null,
      lastSnapshot: null,
    });
    setScoreInput("");
  }

  // Setup screen
  if (!game) {
    return (
      <main className="mx-auto max-w-lg px-4 py-4 md:py-5">
        <div className="mb-5">
          <div className="mb-4 flex items-center">
            <button
              onClick={() => onNavigate("home")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              ← {t("nav.back")}
            </button>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{t("counter.title")}</h1>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="mb-5">
            <label className="mb-2 block text-sm text-slate-300">
              {t("counter.setup.startingScore")}
            </label>
            <div className="flex gap-2">
              {[301, 501].map((score) => (
                <button
                  key={score}
                  onClick={() => setStartingScore(score)}
                  className={[
                    "flex-1 rounded-xl border px-4 py-3 font-semibold transition",
                    startingScore === score
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700",
                  ].join(" ")}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {playerNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[i] = e.target.value;
                    setPlayerNames(next);
                  }}
                  enterKeyHint="next"
                  placeholder={t("counter.setup.playerPlaceholder", { n: i + 1 })}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
                {i >= 2 && (
                  <button
                    onClick={() => setPlayerNames((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove player"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {playerNames.length < 6 && (
            <button
              onClick={() => setPlayerNames((prev) => [...prev, ""])}
              className="mt-3 w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-300"
            >
              + {t("counter.setup.addPlayer")}
            </button>
          )}

          {anyNameEntered && setupValidation.error && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {setupValidation.error}
            </div>
          )}

          <button
            onClick={handleStartGame}
            disabled={!setupValidation.valid}
            className={[
              "mt-6 w-full rounded-xl px-4 py-3 font-semibold transition",
              setupValidation.valid
                ? "bg-cyan-400 text-slate-950 hover:opacity-90"
                : "cursor-not-allowed bg-slate-700 text-slate-400",
            ].join(" ")}
          >
            {t("counter.setup.startGame")}
          </button>
        </div>
      </main>
    );
  }

  // Game screen
  const canUndo = !!game.lastSnapshot;

  return (
    <>
      <div className={resetConfirmOpen ? "pointer-events-none select-none blur-sm" : ""}>
        <main className="mx-auto max-w-xl px-4 py-4 md:py-5">
          <div className="mb-5 w-full">
            <div className="mb-4 flex items-center">
              <button
                onClick={() => onNavigate("home")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                ← {t("nav.back")}
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight">{t("counter.title")}</h1>
            </div>
          </div>

          <div className="space-y-3">
            {game.players.map((player, i) => {
              const isActive = i === game.currentPlayerIndex && !game.winner;
              const recentHistory = player.history.slice(-3);
              const lastEntry = player.history[player.history.length - 1];
              const showBustBadge = lastEntry?.bust && !isActive;

              return (
                <div
                  key={player.name}
                  className={[
                    "rounded-2xl border p-4 transition",
                    isActive
                      ? "border-cyan-500/60 bg-cyan-500/5"
                      : "border-slate-700 bg-slate-900",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-400">{player.name}</div>
                      <div className="text-4xl font-black text-white">{player.score}</div>
                      {recentHistory.length > 0 && (
                        <div className="mt-1 flex gap-3">
                          {recentHistory.map((entry, j) => (
                            <span
                              key={j}
                              className={
                                entry.bust ? "text-sm text-amber-400" : "text-sm text-slate-400"
                              }
                            >
                              {entry.bust ? t("counter.game.bust") : entry.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {showBustBadge && (
                      <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                        {t("counter.game.bust")}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-4 flex gap-2">
                      <input
                        ref={scoreInputRef}
                        type="number"
                        min="0"
                        max="180"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitScore()}
                        placeholder={t("counter.game.enterScore")}
                        enterKeyHint="done"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg outline-none transition focus:border-cyan-400"
                      />
                      <button
                        onClick={handleSubmitScore}
                        disabled={!scoreValid}
                        className={[
                          "rounded-xl px-5 py-3 font-semibold transition",
                          scoreValid
                            ? "bg-cyan-400 text-slate-950 hover:opacity-90"
                            : "cursor-not-allowed bg-slate-700 text-slate-400",
                        ].join(" ")}
                      >
                        {t("counter.game.submit")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={[
                "rounded-xl px-4 py-2 font-medium transition",
                canUndo
                  ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                  : "cursor-not-allowed bg-slate-800 text-slate-500",
              ].join(" ")}
            >
              {t("counter.game.undo")}
            </button>

            <button
              onClick={() => setResetConfirmOpen(true)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-medium text-amber-200 transition hover:bg-amber-500/20"
            >
              {t("counter.game.reset")}
            </button>
          </div>
        </main>
      </div>

      {game.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="text-4xl font-black text-emerald-300">
              {t("counter.win.title", { name: game.winner })}
            </div>
            <div className="mt-8 grid gap-3">
              <button
                onClick={handlePlayAgain}
                className="rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90"
              >
                {t("counter.win.playAgain")}
              </button>
              <button
                onClick={goToSetup}
                className="rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
              >
                {t("counter.win.newGame")}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <ConfirmModal
          title={t("counter.reset.title")}
          description={t("counter.reset.description")}
          confirmLabel={t("counter.reset.confirm")}
          confirmClassName="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-medium text-rose-200 transition hover:bg-rose-500/20"
          onConfirm={goToSetup}
          onCancel={() => setResetConfirmOpen(false)}
        />
      )}
    </>
  );
}
