import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.jsx";
import {
  STORAGE_KEY,
  applyRoundWinToMatch,
  buildNewGame,
  getSeparateRoundState,
  hydrateLoadedGame,
  isMatchOngoing,
  recomputeSeparateBoardState,
  recomputeSharedGameState,
  resetSeparateRound,
  resetSharedRound,
  validateSetup,
} from "../utils/gameLogic.js";
import BoardTabs from "../components/BoardTabs.jsx";
import ClaimModal from "../components/ClaimModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import GameBoard from "../components/GameBoard.jsx";
import MatchScoreboard from "../components/MatchScoreboard.jsx";
import RoundOutcome from "../components/RoundOutcome.jsx";
import SetupModal from "../components/SetupModal.jsx";

export default function TicTacToePage({ onNavigate }) {
  const { t } = useTranslation();

  const [setup, setSetup] = useState({
    separateBoards: false,
    bestOf: "3",
    min: "",
    max: "",
    player1Min: "",
    player1Max: "",
    player2Min: "",
    player2Max: "",
    player1: "",
    player2: "",
  });

  const [game, setGame] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const hydrated = hydrateLoadedGame(parsed);

      if (!hydrated) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return hydrated;
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return null;
    }
  });

  const [selectedTileIndex, setSelectedTileIndex] = useState(null);
  const [activeBoard, setActiveBoard] = useState("X");
  const [history, setHistory] = useState([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [changeSetupConfirmOpen, setChangeSetupConfirmOpen] = useState(false);

  useEffect(() => {
    try {
      if (game) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage write failures
    }
  }, [game]);

  const validation = useMemo(() => validateSetup(setup, t), [setup, t]);

  const setupModalOpen = !game;
  const isSeparateMode = game?.mode === "separate";
  const currentBoard = isSeparateMode && game ? game.boards[activeBoard] : null;
  const separateRoundState = isSeparateMode ? getSeparateRoundState(game) : null;

  const claimModalOpen =
    !isSeparateMode &&
    selectedTileIndex !== null &&
    !!game &&
    !game.winner &&
    !game.isDraw &&
    !game.matchWinner &&
    !game.matchFinished;

  const roundWinnerSymbol =
    game?.mode === "shared"
      ? (game?.winner ?? null)
      : (separateRoundState?.winnerSymbol ?? null);

  const roundWinnerName =
    roundWinnerSymbol && game ? game.players[roundWinnerSymbol] : "";

  const roundIsDraw =
    !!game &&
    (game.mode === "shared"
      ? game.isDraw && !game.winner
      : separateRoundState?.type === "draw");

  const anyOverlayOpen =
    setupModalOpen || claimModalOpen || resetConfirmOpen || changeSetupConfirmOpen;

  const selectedNumber =
    game && selectedTileIndex !== null
      ? game.mode === "shared"
        ? game.boardNumbers[selectedTileIndex]
        : game.boards[activeBoard].boardNumbers[selectedTileIndex]
      : null;

  const selectedClaim =
    game && selectedTileIndex !== null
      ? game.mode === "shared"
        ? game.claims[selectedTileIndex]
        : game.boards[activeBoard].claims[selectedTileIndex]
      : null;

  const matchWinnerName = game?.matchWinner ? game.players[game.matchWinner] : "";
  const canUndo = !!game && history.length > 0;

  const isFinalRoundWin =
    !!game &&
    !!roundWinnerSymbol &&
    game.winsNeeded !== null &&
    game.matchWinner === roundWinnerSymbol &&
    !game.matchFinished;

  const showRoundOutcomePanel =
    !!game && !game.matchFinished && (!!roundWinnerSymbol || roundIsDraw);

  const separateRoundFinished =
    game?.mode === "separate" && !!separateRoundState?.finished;

  const roundNumber = game?.roundNumber ?? 1;

  const boardNumbers = isSeparateMode
    ? currentBoard.boardNumbers
    : (game?.boardNumbers ?? []);

  const boardClaims = isSeparateMode
    ? currentBoard.claims
    : (game?.claims ?? []);

  const boardWinningLine = isSeparateMode
    ? currentBoard.winningLine
    : (game?.winningLine ?? []);

  const boardDisabled = game
    ? game.mode === "shared"
      ? !!game.winner || game.isDraw || !!game.matchWinner || !!game.matchFinished
      : separateRoundFinished ||
        !!currentBoard?.winner ||
        !!currentBoard?.isDraw ||
        !!game.matchWinner ||
        !!game.matchFinished
    : true;

  const showGameHint = isMatchOngoing(game) && !game?.matchFinished;

  function saveHistorySnapshot() {
    if (!game) return;
    setHistory((prev) => [...prev, structuredClone(game)]);
  }

  function handleSubmitSetup(e) {
    e.preventDefault();
    handleStartGame();
  }

  function handleStartGame() {
    if (!validation.valid) return;

    const nextGame = buildNewGame(setup);
    setGame(nextGame);
    setSelectedTileIndex(null);
    setActiveBoard("X");
    setHistory([]);
    setResetConfirmOpen(false);
    setChangeSetupConfirmOpen(false);
  }

  function handleTileClick(index) {
    if (!game) return;

    if (game.mode === "shared") {
      if (game.winner || game.isDraw || game.matchWinner || game.matchFinished) {
        return;
      }
      setSelectedTileIndex(index);
      return;
    }

    const board = game.boards[activeBoard];
    if (
      separateRoundFinished ||
      board.winner ||
      board.isDraw ||
      game.matchWinner ||
      game.matchFinished
    ) {
      return;
    }

    saveHistorySnapshot();

    const nextClaims = [...board.claims];
    nextClaims[index] = nextClaims[index] ? null : activeBoard;

    const nextBoard = recomputeSeparateBoardState({ ...board, claims: nextClaims });

    let nextGame = {
      ...game,
      boards: { ...game.boards, [activeBoard]: nextBoard },
    };

    if (nextBoard.winner) {
      nextGame = applyRoundWinToMatch(nextGame, activeBoard);
    }

    setGame(nextGame);
  }

  function handleClaimTile(symbol) {
    if (!game || game.mode !== "shared" || selectedTileIndex === null) return;
    if (game.matchWinner || game.matchFinished) return;

    saveHistorySnapshot();

    const nextClaims = [...game.claims];
    nextClaims[selectedTileIndex] = symbol;

    const updatedRound = recomputeSharedGameState(game, nextClaims);
    const updatedGame = updatedRound.winner
      ? applyRoundWinToMatch(updatedRound, updatedRound.winner)
      : updatedRound;

    setGame(updatedGame);
    setSelectedTileIndex(null);
  }

  function handleUnclaimTile() {
    if (!game || game.mode !== "shared" || selectedTileIndex === null) return;
    if (game.matchWinner || game.matchFinished) return;

    saveHistorySnapshot();

    const nextClaims = [...game.claims];
    nextClaims[selectedTileIndex] = null;

    setGame(recomputeSharedGameState(game, nextClaims));
    setSelectedTileIndex(null);
  }

  function handleCloseClaimModal() {
    setSelectedTileIndex(null);
  }

  function handleNextRound() {
    if (!game) return;
    setSelectedTileIndex(null);
    if (game.mode === "shared") {
      setGame(resetSharedRound(game));
      return;
    }
    setGame(resetSeparateRound(game));
  }

  function handleFinishGame() {
    if (!game) return;
    setSelectedTileIndex(null);
    setGame({ ...game, matchFinished: true });
  }

  function performResetMatch() {
    if (!game) return;

    saveHistorySnapshot();
    setSelectedTileIndex(null);
    setResetConfirmOpen(false);

    if (game.mode === "shared") {
      setGame({
        ...resetSharedRound(game),
        roundNumber: 1,
        matchWins: { X: 0, O: 0 },
        matchWinner: null,
        matchFinished: false,
      });
      return;
    }

    setGame({
      ...resetSeparateRound(game),
      roundNumber: 1,
      matchWins: { X: 0, O: 0 },
      matchWinner: null,
      matchFinished: false,
    });
  }

  function handleResetMatch() {
    if (!game) return;

    if (isMatchOngoing(game) && !game.matchFinished) {
      setResetConfirmOpen(true);
      return;
    }

    performResetMatch();
  }

  function handleUndoLastAction() {
    if (!canUndo) return;

    setSelectedTileIndex(null);
    setResetConfirmOpen(false);
    setChangeSetupConfirmOpen(false);

    setHistory((prev) => {
      const nextHistory = [...prev];
      const previousGame = nextHistory.pop();
      if (previousGame) {
        setGame(previousGame);
      }
      return nextHistory;
    });
  }

  function performOpenNewSetup() {
    if (game?.setupValues) {
      setSetup(game.setupValues);
    }
    setSelectedTileIndex(null);
    setActiveBoard("X");
    setResetConfirmOpen(false);
    setChangeSetupConfirmOpen(false);
    setGame(null);
    setHistory([]);
  }

  function handleNewSetup() {
    if (!game) {
      performOpenNewSetup();
      return;
    }

    if (isMatchOngoing(game) && !game.matchFinished) {
      setChangeSetupConfirmOpen(true);
      return;
    }

    performOpenNewSetup();
  }

  return (
    <>
      <div className={anyOverlayOpen ? "pointer-events-none select-none blur-sm" : ""}>
        <main className="mx-auto flex flex-col items-center max-w-7xl px-4 py-4 md:py-5">
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
              <h1 className="text-4xl font-bold tracking-tight">
                {t("app.title")}
              </h1>
            </div>
          </div>

          {game && (
            <>
              <MatchScoreboard game={game} />

              <div className="mb-5 flex flex-col items-center gap-3 text-center">
                {game.matchWinner && game.matchFinished && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-xl font-semibold text-emerald-300">
                    {t("match.playerWinsMatch", { name: matchWinnerName })}
                  </div>
                )}

                {!showRoundOutcomePanel &&
                  game.mode === "shared" &&
                  !showGameHint &&
                  !game.matchWinner &&
                  !game.winner &&
                  !game.isDraw && (
                    <div className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-lg text-slate-200">
                      {t("board.sharedHint")}
                    </div>
                  )}

                {!showRoundOutcomePanel &&
                  game.mode === "separate" &&
                  !showGameHint &&
                  !game.matchWinner &&
                  !game.boards.X.winner &&
                  !game.boards.O.winner &&
                  !(game.boards.X.isDraw && game.boards.O.isDraw) && (
                    <div className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-lg text-slate-200">
                      {t("board.separateHint")}
                    </div>
                  )}

                {showRoundOutcomePanel && (
                  <RoundOutcome
                    roundWinnerName={roundWinnerName}
                    roundIsDraw={roundIsDraw}
                    roundNumber={roundNumber}
                    isFinalRoundWin={isFinalRoundWin}
                    canUndo={canUndo}
                    onNextRound={handleNextRound}
                    onFinishGame={handleFinishGame}
                    onUndo={handleUndoLastAction}
                  />
                )}

                {game.mode === "shared" && (
                  <div className="text-sm text-slate-400">
                    {t("board.sharedRangeInfo", {
                      min: game.min,
                      max: game.max,
                      playerX: game.players.X,
                      playerO: game.players.O,
                    })}
                  </div>
                )}

                {game.mode === "separate" && (
                  <div className="text-sm text-slate-400">
                    {t("board.separateRangeInfo", {
                      playerX: game.players.X,
                      minX: game.boards.X.min,
                      maxX: game.boards.X.max,
                      playerO: game.players.O,
                      minO: game.boards.O.min,
                      maxO: game.boards.O.max,
                    })}
                  </div>
                )}
              </div>

              {isSeparateMode && (
                <BoardTabs
                  players={game.players}
                  activeBoard={activeBoard}
                  onChange={setActiveBoard}
                />
              )}

              <GameBoard
                boardNumbers={boardNumbers}
                claims={boardClaims}
                winningLine={boardWinningLine}
                onTileClick={handleTileClick}
                disabled={boardDisabled}
              />

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleResetMatch}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  {t("actions.resetMatch")}
                </button>

                <button
                  onClick={handleNewSetup}
                  className="rounded-xl border border-slate-600 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
                >
                  {t("actions.changePlayersRange")}
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {setupModalOpen && (
        <SetupModal
          setup={setup}
          onChange={setSetup}
          onSubmit={handleSubmitSetup}
          validation={validation}
        />
      )}

      {claimModalOpen && (
        <ClaimModal
          number={selectedNumber}
          currentClaim={selectedClaim}
          players={game.players}
          onClaim={handleClaimTile}
          onUnclaim={handleUnclaimTile}
          onClose={handleCloseClaimModal}
        />
      )}

      {resetConfirmOpen && (
        <ConfirmModal
          title={t("reset.title")}
          description={t("reset.description")}
          confirmLabel={t("actions.confirmResetMatch")}
          confirmClassName="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-medium text-rose-200 transition hover:bg-rose-500/20"
          onConfirm={performResetMatch}
          onCancel={() => setResetConfirmOpen(false)}
        />
      )}

      {changeSetupConfirmOpen && (
        <ConfirmModal
          title={t("changeSetup.title")}
          description={t("changeSetup.description")}
          confirmLabel={t("actions.continueToSetup")}
          confirmClassName="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-medium text-amber-200 transition hover:bg-amber-500/20"
          onConfirm={performOpenNewSetup}
          onCancel={() => setChangeSetupConfirmOpen(false)}
        />
      )}
    </>
  );
}
