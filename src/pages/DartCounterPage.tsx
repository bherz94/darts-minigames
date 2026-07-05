import { useEffect, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import DartCounterStats from "../components/DartCounterStats";
import { setBackInterceptor } from "../components/Header";
import {
  CounterGame,
  CounterPlayer,
  HistoryEntry,
  LegHistory,
  MatchFormat,
} from "../utils/dartCounterTypes";

const COUNTER_STORAGE_KEY = "darts-counter-gamestate";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hydrateEntry(raw: unknown): HistoryEntry {
  const e = isObj(raw) ? raw : {};
  return {
    value: typeof e.value === "number" ? e.value : 0,
    bust: !!e.bust,
    noScore: !!e.noScore,
    dartsThrown: typeof e.dartsThrown === "number" ? e.dartsThrown : 0,
    remainingAfter: typeof e.remainingAfter === "number" ? e.remainingAfter : 0,
    doubleAttempted: !!e.doubleAttempted,
    doubleHit: !!e.doubleHit,
    finishingDart: e.finishingDart === 1 || e.finishingDart === 2 || e.finishingDart === 3 ? e.finishingDart : undefined,
  };
}

function hydrateLeg(raw: unknown): LegHistory | null {
  if (!isObj(raw)) return null;
  if (!Array.isArray(raw.history)) return null;
  return {
    history: raw.history.map(hydrateEntry),
    setNum: typeof raw.setNum === "number" ? raw.setNum : 1,
    legNum: typeof raw.legNum === "number" ? raw.legNum : 1,
    won: !!raw.won,
  };
}

function hydrateGame(raw: unknown): CounterGame | null {
  if (!isObj(raw)) return null;

  const { startingScore, players, currentPlayerIndex, winner } = raw;

  if (startingScore !== 301 && startingScore !== 501) return null;
  if (!Array.isArray(players) || players.length < 2 || players.length > 6) return null;

  let matchFormat: MatchFormat = {
    bestOfSets: 1,
    bestOfLegs: 1,
    doubleIn: false,
    doubleOut: false,
  };
  if (isObj(raw.matchFormat)) {
    const mf = raw.matchFormat;
    matchFormat = {
      bestOfSets: typeof mf.bestOfSets === "number" && mf.bestOfSets >= 1 ? mf.bestOfSets : 1,
      bestOfLegs: typeof mf.bestOfLegs === "number" && mf.bestOfLegs >= 1 ? mf.bestOfLegs : 1,
      doubleIn: !!mf.doubleIn,
      doubleOut: !!mf.doubleOut,
    };
  }

  for (const p of players) {
    if (!isObj(p)) return null;
    if (typeof p.name !== "string" || !p.name.trim()) return null;
    if (typeof p.score !== "number" || !Number.isInteger(p.score)) return null;
    if (p.score < 0 || p.score > startingScore) return null;
    if (!Array.isArray(p.history)) return null;
  }

  if (
    typeof currentPlayerIndex !== "number" ||
    !Number.isInteger(currentPlayerIndex) ||
    currentPlayerIndex < 0 ||
    currentPlayerIndex >= players.length
  )
    return null;

  if (winner !== null && winner !== undefined && typeof winner !== "string") return null;

  const currentSet = typeof raw.currentSet === "number" && raw.currentSet >= 1 ? raw.currentSet : 1;
  const currentLeg = typeof raw.currentLeg === "number" && raw.currentLeg >= 1 ? raw.currentLeg : 1;

  return {
    startingScore,
    matchFormat,
    players: players.map((p) => {
      const player = p as Record<string, unknown>;
      const completedLegsRaw = Array.isArray(player.completedLegs) ? player.completedLegs : [];
      return {
        name: player.name as string,
        score: player.score as number,
        history: (Array.isArray(player.history) ? player.history : []).map(hydrateEntry),
        legsWon: typeof player.legsWon === "number" ? player.legsWon : 0,
        setsWon: typeof player.setsWon === "number" ? player.setsWon : 0,
        hasOpenedScoring:
          typeof player.hasOpenedScoring === "boolean"
            ? player.hasOpenedScoring
            : !matchFormat.doubleIn,
        completedLegs: completedLegsRaw
          .map(hydrateLeg)
          .filter((l): l is LegHistory => l !== null),
      };
    }),
    currentPlayerIndex,
    currentSet,
    currentLeg,
    legWinner: typeof raw.legWinner === "string" ? raw.legWinner : null,
    legWinnerWonSet: !!raw.legWinnerWonSet,
    winner: winner != null ? String(winner) : null,
    inProgress: !!raw.inProgress,
    lastSnapshot: null,
  };
}

function loadSavedGame(): CounterGame | null {
  try {
    const saved = window.localStorage.getItem(COUNTER_STORAGE_KEY);
    if (!saved) return null;
    const hydrated = hydrateGame(JSON.parse(saved));
    if (!hydrated || !hydrated.inProgress) {
      window.localStorage.removeItem(COUNTER_STORAGE_KEY);
      return null;
    }
    return hydrated;
  } catch {
    return null;
  }
}

function validateSetup(
  names: string[],
  bestOfLegs: string,
  bestOfSets: string,
  t: (key: string) => string,
): { valid: boolean; error: string } {
  const trimmed = names.map((n) => n.trim());
  if (!trimmed.every((n) => n.length > 0)) {
    return { valid: false, error: t("counter.validation.emptyName") };
  }
  if (new Set(trimmed).size !== trimmed.length) {
    return { valid: false, error: t("counter.validation.duplicateNames") };
  }
  const legs = parseInt(bestOfLegs, 10);
  if (!Number.isInteger(legs) || legs < 1) {
    return { valid: false, error: t("counter.validation.invalidLegs") };
  }
  const sets = parseInt(bestOfSets, 10);
  if (!Number.isInteger(sets) || sets < 1) {
    return { valid: false, error: t("counter.validation.invalidSets") };
  }
  return { valid: true, error: "" };
}

function applyLegWin(updatedGame: CounterGame, winnerIdx: number): CounterGame {
  const { matchFormat } = updatedGame;
  const player = updatedGame.players[winnerIdx];
  const newLegsWon = player.legsWon + 1;
  const winsNeededForSet = Math.ceil(matchFormat.bestOfLegs / 2);
  const wonSet = newLegsWon >= winsNeededForSet;

  if (wonSet) {
    const newSetsWon = player.setsWon + 1;
    const winsNeededForMatch = Math.ceil(matchFormat.bestOfSets / 2);
    const wonMatch = newSetsWon >= winsNeededForMatch;

    const newPlayers = updatedGame.players.map((p, i) =>
      i === winnerIdx ? { ...p, legsWon: 0, setsWon: newSetsWon } : { ...p, legsWon: 0 },
    );

    if (wonMatch) {
      return {
        ...updatedGame,
        players: newPlayers,
        winner: player.name,
        inProgress: false,
        legWinner: null,
        legWinnerWonSet: false,
      };
    }

    return { ...updatedGame, players: newPlayers, legWinner: player.name, legWinnerWonSet: true };
  }

  const newPlayers = updatedGame.players.map((p, i) =>
    i === winnerIdx ? { ...p, legsWon: newLegsWon } : p,
  );
  return { ...updatedGame, players: newPlayers, legWinner: player.name, legWinnerWonSet: false };
}

export default function DartCounterPage() {
  const { t } = useTranslation();

  const [savedGame] = useState<CounterGame | null>(loadSavedGame);

  const [playerNames, setPlayerNames] = useState<string[]>(() =>
    savedGame ? savedGame.players.map((p) => p.name) : ["", ""],
  );
  const [startingScore, setStartingScore] = useState<301 | 501>(() =>
    savedGame ? savedGame.startingScore : 501,
  );
  const [bestOfLegs, setBestOfLegs] = useState(() =>
    savedGame ? String(savedGame.matchFormat.bestOfLegs) : "1",
  );
  const [bestOfSets, setBestOfSets] = useState(() =>
    savedGame ? String(savedGame.matchFormat.bestOfSets) : "1",
  );
  const [doubleIn, setDoubleIn] = useState(() => (savedGame ? savedGame.matchFormat.doubleIn : false));
  const [doubleOut, setDoubleOut] = useState(() =>
    savedGame ? savedGame.matchFormat.doubleOut : false,
  );

  const [game, setGame] = useState<CounterGame | null>(null);
  const [numpadInput, setNumpadInput] = useState("");
  const [doubleInHit, setDoubleInHit] = useState(false);
  const [doubleOutConfirm, setDoubleOutConfirm] = useState<{
    idx: number;
    effectiveScore: number;
    opensScoring: boolean;
  } | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(!!savedGame);
  const [historyPopupPlayer, setHistoryPopupPlayer] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (game) {
        window.localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(game));
      }
    } catch {
      // ignore storage write failures
    }
  }, [game]);

  const gameInProgress = !!(game && !game.winner);
  const anyModalOpen = !!(doubleOutConfirm || (game && game.legWinner) || leaveModalOpen || historyPopupPlayer !== null);

  useEffect(() => {
    if (gameInProgress) {
      setBackInterceptor(() => setLeaveModalOpen(true));
    } else {
      setBackInterceptor(null);
    }
    return () => setBackInterceptor(null);
  }, [gameInProgress]);

  const setupValidation = validateSetup(playerNames, bestOfLegs, bestOfSets, t);
  const anyNameEntered = playerNames.some((n) => n.trim().length > 0);

  const numpadValue = numpadInput === "" ? null : parseInt(numpadInput, 10);
  const numpadScoreValid = numpadValue !== null && numpadValue >= 0 && numpadValue <= 180;

  useEffect(() => {
    if (!gameInProgress || anyModalOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        const d = parseInt(e.key, 10);
        setNumpadInput((prev) => {
          if (prev === "0") return prev;
          const next = prev + String(d);
          return parseInt(next, 10) > 9999 ? prev : next;
        });
      } else if (e.key === "Backspace") {
        setNumpadInput((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter" && numpadScoreValid && numpadValue !== null) {
        handleSubmitScore(numpadValue);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  // handleSubmitScore closes over game which is captured transitively via gameInProgress
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameInProgress, anyModalOpen, numpadValue, numpadScoreValid]);

  function handleStartGame() {
    if (!setupValidation.valid) return;
    const legs = parseInt(bestOfLegs, 10);
    const sets = parseInt(bestOfSets, 10);
    const fmt: MatchFormat = { bestOfSets: sets, bestOfLegs: legs, doubleIn, doubleOut };
    setGame({
      startingScore,
      matchFormat: fmt,
      players: playerNames.map((name) => ({
        name: name.trim(),
        score: startingScore,
        history: [],
        legsWon: 0,
        setsWon: 0,
        hasOpenedScoring: !doubleIn,
        completedLegs: [],
      })),
      currentPlayerIndex: 0,
      currentSet: 1,
      currentLeg: 1,
      legWinner: null,
      legWinnerWonSet: false,
      winner: null,
      inProgress: true,
      lastSnapshot: null,
    });
    setNumpadInput("");
    setDoubleInHit(false);
  }

  function commitThrow(
    idx: number,
    effectiveScore: number,
    isBust: boolean,
    opensScoring: boolean,
    extras: { noScore?: boolean; doubleHit?: boolean; finishingDart?: 1 | 2 | 3 } = {},
  ) {
    if (!game) return;
    const player = game.players[idx];
    const prevDarts =
      player.history.length > 0 ? player.history[player.history.length - 1].dartsThrown : 0;
    const dartsThrown = prevDarts + (extras.finishingDart ?? 3);
    const newScore = isBust ? player.score : player.score - effectiveScore;
    const isWin = !isBust && newScore === 0;

    const entry: HistoryEntry = {
      value: effectiveScore,
      bust: isBust,
      noScore: extras.noScore ?? false,
      dartsThrown,
      remainingAfter: newScore,
      doubleAttempted: game.matchFormat.doubleOut && player.score <= 170,
      doubleHit: extras.doubleHit ?? false,
      finishingDart: extras.finishingDart,
    };

    const updatedPlayer: CounterPlayer = {
      ...player,
      score: newScore,
      history: [...player.history, entry],
      hasOpenedScoring: player.hasOpenedScoring || opensScoring,
    };

    const snapshot = game;
    let nextGame: CounterGame = {
      ...game,
      players: game.players.map((p, i) => (i === idx ? updatedPlayer : p)),
      currentPlayerIndex: isWin ? idx : (idx + 1) % game.players.length,
      lastSnapshot: snapshot,
    };

    if (isWin) {
      nextGame = applyLegWin(nextGame, idx);
    }

    setGame(nextGame);
    setDoubleInHit(false);
    setNumpadInput("");
  }

  function handleSubmitScore(score: number, extras: { noScore?: boolean } = {}) {
    if (!game || game.winner || game.legWinner) return;
    if (score < 0 || score > 180) return;

    const idx = game.currentPlayerIndex;
    const player = game.players[idx];
    const { matchFormat } = game;

    const notOpened = matchFormat.doubleIn && !player.hasOpenedScoring;
    let effectiveScore = score;
    let opensScoring = false;

    if (notOpened) {
      if (doubleInHit) {
        opensScoring = true;
      } else {
        effectiveScore = 0;
      }
    }

    const newScore = player.score - effectiveScore;
    const isBust = newScore < 0 || (matchFormat.doubleOut && newScore === 1);

    if (!isBust && newScore === 0 && matchFormat.doubleOut) {
      setDoubleOutConfirm({ idx, effectiveScore, opensScoring });
      return;
    }

    commitThrow(idx, effectiveScore, isBust, opensScoring, extras);
  }

  function confirmDoubleOut(dartNumber: 1 | 2 | 3) {
    if (!doubleOutConfirm) return;
    const { idx, effectiveScore, opensScoring } = doubleOutConfirm;
    setDoubleOutConfirm(null);
    commitThrow(idx, effectiveScore, false, opensScoring, { doubleHit: true, finishingDart: dartNumber });
  }

  function handleNextLeg() {
    if (!game?.legWinner) return;
    setGame({
      ...game,
      players: game.players.map((p) => {
        const legEntry: LegHistory = {
          history: p.history,
          setNum: game.currentSet,
          legNum: game.currentLeg,
          won: p.name === game.legWinner,
        };
        return {
          ...p,
          score: game.startingScore,
          history: [],
          hasOpenedScoring: !game.matchFormat.doubleIn,
          completedLegs: [...p.completedLegs, legEntry],
        };
      }),
      currentPlayerIndex: 0,
      currentLeg: game.legWinnerWonSet ? 1 : game.currentLeg + 1,
      currentSet: game.legWinnerWonSet ? game.currentSet + 1 : game.currentSet,
      legWinner: null,
      legWinnerWonSet: false,
      lastSnapshot: null,
    });
    setNumpadInput("");
    setDoubleInHit(false);
  }

  function handleUndo() {
    if (!game?.lastSnapshot) return;
    setGame(game.lastSnapshot);
    setNumpadInput("");
    setDoubleInHit(false);
    setDoubleOutConfirm(null);
  }

  function goToSetup() {
    if (game) {
      setPlayerNames(game.players.map((p) => p.name));
      setStartingScore(game.startingScore);
      setBestOfLegs(String(game.matchFormat.bestOfLegs));
      setBestOfSets(String(game.matchFormat.bestOfSets));
      setDoubleIn(game.matchFormat.doubleIn);
      setDoubleOut(game.matchFormat.doubleOut);
    }
    window.localStorage.removeItem(COUNTER_STORAGE_KEY);
    setGame(null);
    setNumpadInput("");
    setDoubleInHit(false);
    setDoubleOutConfirm(null);
    setLeaveModalOpen(false);
    setHistoryPopupPlayer(null);
  }

  function handlePlayAgain() {
    if (!game) return;
    setGame({
      ...game,
      players: game.players.map((p) => ({
        name: p.name,
        score: game.startingScore,
        history: [],
        legsWon: 0,
        setsWon: 0,
        hasOpenedScoring: !game.matchFormat.doubleIn,
        completedLegs: [],
      })),
      currentPlayerIndex: 0,
      currentSet: 1,
      currentLeg: 1,
      legWinner: null,
      legWinnerWonSet: false,
      winner: null,
      inProgress: true,
      lastSnapshot: null,
    });
    setNumpadInput("");
    setDoubleInHit(false);
  }

  function pressDigit(d: number) {
    if (numpadInput === "0") return;
    const newInput = numpadInput + String(d);
    if (parseInt(newInput, 10) > 9999) return;
    setNumpadInput(newInput);
  }

  function pressRest() {
    if (!game) return;
    const remaining = game.players[game.currentPlayerIndex].score;
    const typed = numpadValue ?? 0;
    handleSubmitScore(remaining - typed);
  }

  function pressNoScore() {
    handleSubmitScore(0, { noScore: true });
  }

  // Setup screen
  if (!game) {
    return (
      <>
        <main className="mx-auto max-w-lg px-4 py-4 md:py-5">
          <div className="mb-5">
            <h1 className="text-4xl font-bold tracking-tight">{t("counter.title")}</h1>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="mb-5">
              <label className="mb-2 block text-sm text-slate-300">
                {t("counter.setup.startingScore")}
              </label>
              <div className="flex gap-2">
                {([301, 501] as const).map((score) => (
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

            <div className="mb-5 space-y-2">
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
                      onClick={() => setPlayerNames((prev) => prev.filter((_, j) => j !== i))}
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
                className="mb-5 w-full rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-300"
              >
                + {t("counter.setup.addPlayer")}
              </button>
            )}

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t("counter.setup.bestOfLegs")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={bestOfLegs}
                  onChange={(e) => setBestOfLegs(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  {t("counter.setup.bestOfSets")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={bestOfSets}
                  onChange={(e) => setBestOfSets(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="mb-5 space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{t("counter.setup.doubleIn")}</span>
                <button
                  type="button"
                  onClick={() => setDoubleIn((v) => !v)}
                  className={[
                    "relative flex h-6 w-11 items-center rounded-full transition-colors",
                    doubleIn ? "bg-cyan-500" : "bg-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute h-4 w-4 rounded-full bg-white transition-transform",
                      doubleIn ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{t("counter.setup.doubleOut")}</span>
                <button
                  type="button"
                  onClick={() => setDoubleOut((v) => !v)}
                  className={[
                    "relative flex h-6 w-11 items-center rounded-full transition-colors",
                    doubleOut ? "bg-cyan-500" : "bg-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute h-4 w-4 rounded-full bg-white transition-transform",
                      doubleOut ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>
            </div>

            {anyNameEntered && setupValidation.error && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {setupValidation.error}
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={!setupValidation.valid}
              className={[
                "w-full rounded-xl px-4 py-3 font-semibold transition",
                setupValidation.valid
                  ? "bg-cyan-400 text-slate-950 hover:opacity-90"
                  : "cursor-not-allowed bg-slate-700 text-slate-400",
              ].join(" ")}
            >
              {t("counter.setup.startGame")}
            </button>
          </div>
        </main>

        {showResumeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold">{t("counter.resume.title")}</h2>
              <p className="mt-2 text-sm text-slate-400">{t("counter.resume.description")}</p>
              <div className="mt-6 grid gap-3">
                <button
                  onClick={() => {
                    if (savedGame) setGame(savedGame);
                    setShowResumeModal(false);
                  }}
                  className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90"
                >
                  {t("counter.resume.continue")}
                </button>
                <button
                  onClick={() => {
                    window.localStorage.removeItem(COUNTER_STORAGE_KEY);
                    setShowResumeModal(false);
                  }}
                  className="rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
                >
                  {t("counter.resume.newGame")}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Stats screen (match over)
  if (game.winner) {
    return <DartCounterStats game={game} onPlayAgain={handlePlayAgain} onNewGame={goToSetup} />;
  }

  // Game screen
  const canUndo = !!game.lastSnapshot;
  const { matchFormat } = game;
  const showSets = matchFormat.bestOfSets > 1;
  const showLegs = matchFormat.bestOfLegs > 1;
  const hasMatchFormat = showSets || showLegs;
  const currentPlayer = game.players[game.currentPlayerIndex];
  const restValue = numpadValue !== null ? currentPlayer.score - numpadValue : null;

  return (
    <>
      <div className={anyModalOpen ? "pointer-events-none select-none blur-sm" : ""}>
        <main className="mx-auto max-w-xl px-4 py-4 pb-80 md:py-5 md:pb-80">
          <div className="mb-5 w-full text-center">
            <h1 className="text-4xl font-bold tracking-tight">{t("counter.title")}</h1>
            {hasMatchFormat && (
              <div className="mt-1 text-sm text-slate-400">
                {showSets && t("counter.game.set", { n: game.currentSet })}
                {showSets && showLegs && " · "}
                {showLegs && t("counter.game.leg", { n: game.currentLeg })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {game.players.map((player, i) => {
              const isActive = i === game.currentPlayerIndex && !game.legWinner;
              const recentHistory = player.history.slice(-3);
              const lastEntry = player.history[player.history.length - 1];
              const showBustBadge = lastEntry?.bust && !isActive;
              const notOpened = matchFormat.doubleIn && !player.hasOpenedScoring;

              const legVisits = player.history.length;
              const legAvg =
                legVisits > 0
                  ? (game.startingScore - player.score) / legVisits
                  : 0;

              const allVisits =
                player.completedLegs.reduce((n, l) => n + l.history.length, 0) + legVisits;
              const allScored =
                player.completedLegs.reduce((sum, leg) => {
                  const last = leg.history[leg.history.length - 1];
                  return sum + (last ? game.startingScore - last.remainingAfter : 0);
                }, 0) +
                (game.startingScore - player.score);
              const overallAvg = allVisits > 0 ? allScored / allVisits : 0;

              const dAttempted = player.history.filter((e) => e.doubleAttempted).length;
              const dHit = player.history.filter((e) => e.doubleHit).length;
              const dPercent = dAttempted > 0 ? Math.round((dHit / dAttempted) * 100) : 0;

              return (
                <div
                  key={player.name}
                  onClick={() => setHistoryPopupPlayer(i)}
                  className={[
                    "cursor-pointer rounded-2xl border p-4 transition",
                    isActive
                      ? "border-cyan-500/60 bg-cyan-500/5"
                      : "border-slate-700 bg-slate-900",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">{player.name}</span>
                        {(showLegs || showSets) && (
                          <span className="text-xs text-slate-500">
                            {showLegs && `${player.legsWon}L`}
                            {showLegs && showSets && " "}
                            {showSets && `${player.setsWon}S`}
                          </span>
                        )}
                        {matchFormat.doubleIn && player.hasOpenedScoring && (
                          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs text-cyan-400">
                            DI ✓
                          </span>
                        )}
                      </div>
                      <div className="text-4xl font-black text-white">{player.score}</div>
                      <div className="mt-1 flex gap-3 text-xs text-slate-500">
                        <span>
                          Avg: {legAvg > 0 ? legAvg.toFixed(1) : "—"} /{" "}
                          {overallAvg > 0 ? overallAvg.toFixed(1) : "—"}
                        </span>
                        {matchFormat.doubleOut && (
                          <span>D%: {dAttempted > 0 ? `${dPercent}%` : "—"}</span>
                        )}
                        <span>Darts: {legVisits * 3}</span>
                      </div>
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

                  {isActive && notOpened && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2"
                    >
                      <span className="text-xs text-slate-400">
                        {t("counter.game.doubleInRequired")}
                      </span>
                      <button
                        onClick={() => setDoubleInHit((v) => !v)}
                        className={[
                          "rounded-lg px-3 py-1 text-xs font-medium transition",
                          doubleInHit
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600",
                        ].join(" ")}
                      >
                        {t("counter.game.doubledIn")}
                        {doubleInHit ? " ✓" : ""}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Fixed-bottom numpad */}
      {!anyModalOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700 bg-slate-900">
          <div className="mx-auto max-w-xl px-3 py-3">
            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={[
                  "h-11 rounded-xl px-2 text-sm font-medium transition",
                  canUndo
                    ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                    : "bg-slate-800 text-slate-600",
                ].join(" ")}
              >
                {t("counter.game.undo")}
              </button>
              <button
                onClick={() => numpadScoreValid && handleSubmitScore(numpadValue!)}
                className={[
                  "col-span-3 h-11 rounded-xl text-xl font-black tracking-wide transition",
                  numpadScoreValid
                    ? "bg-cyan-400 text-slate-950 hover:opacity-90"
                    : "bg-slate-800 text-slate-400",
                ].join(" ")}
              >
                {numpadInput === "" ? "–" : numpadInput}
              </button>
              <button
                onClick={pressRest}
                disabled={restValue === null || restValue < 0 || restValue > 180}
                className={[
                  "h-11 rounded-xl text-sm font-medium transition",
                  restValue !== null && restValue >= 0 && restValue <= 180
                    ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                    : "bg-slate-800 text-slate-600",
                ].join(" ")}
              >
                {t("counter.game.rest")}
              </button>

              <button
                onClick={() => handleSubmitScore(26)}
                className="h-11 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                26
              </button>
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  className="h-11 rounded-xl bg-slate-700 text-lg font-semibold text-white transition hover:bg-slate-600"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleSubmitScore(60)}
                className="h-11 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                60
              </button>

              <button
                onClick={() => handleSubmitScore(41)}
                className="h-11 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                41
              </button>
              {[4, 5, 6].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  className="h-11 rounded-xl bg-slate-700 text-lg font-semibold text-white transition hover:bg-slate-600"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleSubmitScore(85)}
                className="h-11 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                85
              </button>

              <button
                onClick={() => handleSubmitScore(45)}
                className="h-11 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                45
              </button>
              {[7, 8, 9].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  className="h-11 rounded-xl bg-slate-700 text-lg font-semibold text-white transition hover:bg-slate-600"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleSubmitScore(100)}
                className="h-11 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                100
              </button>

              <button
                onClick={() => setNumpadInput("")}
                className="h-11 rounded-xl border border-rose-500/40 bg-rose-500/10 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                {t("counter.game.clear")}
              </button>
              <button
                onClick={() => pressDigit(0)}
                className="col-span-2 h-11 rounded-xl bg-slate-700 text-lg font-semibold text-white transition hover:bg-slate-600"
              >
                0
              </button>
              <button
                onClick={numpadInput === "" ? pressNoScore : () => numpadScoreValid && handleSubmitScore(numpadValue!)}
                className={[
                  "col-span-2 h-11 rounded-xl text-sm font-semibold transition",
                  numpadInput === ""
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : numpadScoreValid
                      ? "bg-cyan-400 text-slate-950 hover:opacity-90"
                      : "bg-slate-800 text-slate-600",
                ].join(" ")}
              >
                {numpadInput === "" ? t("counter.game.noScore") : t("counter.game.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score history popup */}
      {historyPopupPlayer !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 px-4 pb-4"
          onClick={() => setHistoryPopupPlayer(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const p = game.players[historyPopupPlayer];
              const entries = [...p.history].reverse();
              return (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-200">
                      {t("counter.history.title", { name: p.name })}
                    </h3>
                    <button
                      onClick={() => setHistoryPopupPlayer(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("counter.history.empty")}</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {entries.map((e, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
                        >
                          <span className={e.bust ? "text-amber-400" : "text-slate-200"}>
                            {e.bust
                              ? `${t("counter.game.bust")} (${e.value})`
                              : e.noScore
                                ? t("counter.game.noScore")
                                : e.value}
                          </span>
                          <span className="text-xs text-slate-500">{e.dartsThrown} darts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Leg/Set winner overlay */}
      {game.legWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="text-4xl font-black text-cyan-300">
              {game.legWinnerWonSet
                ? t("counter.game.setWin", { name: game.legWinner })
                : t("counter.game.legWin", { name: game.legWinner })}
            </div>
            {canUndo && (
              <button
                onClick={handleUndo}
                className="mt-4 text-sm text-slate-400 underline transition hover:text-slate-200"
              >
                {t("counter.game.undo")}
              </button>
            )}
            <div className="mt-6">
              <button
                onClick={handleNextLeg}
                className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90"
              >
                {game.legWinnerWonSet ? t("counter.game.nextSet") : t("counter.game.nextLeg")}
              </button>
            </div>
          </div>
        </div>
      )}

      {doubleOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold">{t("counter.game.finishDartTitle")}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("counter.game.finishDartDescription")}</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => confirmDoubleOut(n)}
                  className="rounded-xl bg-emerald-500/20 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
                >
                  {t(`counter.game.dart${n}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">{t("counter.leave.title")}</h2>
            <p className="mt-2 text-sm text-slate-400">{t("counter.leave.description")}</p>
            <div className="mt-6 grid gap-3">
              <button
                onClick={() => {
                  window.localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(game));
                  window.location.hash = "/";
                }}
                className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90"
              >
                {t("counter.leave.save")}
              </button>
              <button
                onClick={() => {
                  window.localStorage.removeItem(COUNTER_STORAGE_KEY);
                  window.location.hash = "/";
                }}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-medium text-rose-200 transition hover:bg-rose-500/20"
              >
                {t("counter.leave.stop")}
              </button>
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
              >
                {t("actions.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
