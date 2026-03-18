import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "darts-tictactoe-gamestate";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getThreeDartCheckoutScores() {
  const singles = Array.from({ length: 20 }, (_, i) => i + 1);
  const doubles = Array.from({ length: 20 }, (_, i) => (i + 1) * 2);
  const trebles = Array.from({ length: 20 }, (_, i) => (i + 1) * 3);

  const allDartScores = [
    ...new Set([0, ...singles, ...doubles, ...trebles, 25, 50]),
  ];
  const finishingDarts = [...doubles, 50];

  const checkoutScores = new Set();

  for (const first of allDartScores) {
    for (const second of allDartScores) {
      for (const finish of finishingDarts) {
        const total = first + second + finish;
        if (total > 1 && total <= 170) {
          checkoutScores.add(total);
        }
      }
    }
  }

  return [...checkoutScores].sort((a, b) => a - b);
}

const THREE_DART_CHECKOUTS = getThreeDartCheckoutScores();

function randomUniqueCheckoutNumbers(min, max, count = 9) {
  const pool = THREE_DART_CHECKOUTS.filter(
    (score) => score >= min && score <= max,
  );

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const result = pool.slice(0, count);

  while (result.length < count && pool.length > 0) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    result.push(pool[randomIndex]);
  }

  return result;
}

function getWinner(claims) {
  for (const [a, b, c] of WIN_LINES) {
    if (claims[a] && claims[a] === claims[b] && claims[a] === claims[c]) {
      return {
        symbol: claims[a],
        line: [a, b, c],
      };
    }
  }

  return null;
}

function validateRange(min, max) {
  const minNum = Number(min);
  const maxNum = Number(max);

  const validMin = Number.isInteger(minNum) && minNum >= 2 && minNum <= 167;
  const validMax = Number.isInteger(maxNum) && maxNum > minNum && maxNum <= 170;

  return {
    valid: validMin && validMax,
    errors: {
      min: validMin ? "" : "Min must be >= 2 and <= 167",
      max: validMax ? "" : `Max must be > ${min || "min"} and <= 170`,
    },
  };
}

function validateBestOf(bestOf) {
  const value = Number(bestOf);
  const valid =
    Number.isInteger(value) && value >= 0 && (value === 0 || value % 2 === 1);

  return {
    valid,
    error: valid ? "" : "Best of must be 0 or an odd number >= 1",
  };
}

function validateSetup(setup) {
  const validPlayers =
    setup.player1.trim().length > 0 &&
    setup.player2.trim().length > 0 &&
    setup.player1.trim() !== setup.player2.trim();

  const bestOfValidation = validateBestOf(setup.bestOf);

  if (!setup.separateBoards) {
    const rangeValidation = validateRange(setup.min, setup.max);

    return {
      valid: rangeValidation.valid && validPlayers && bestOfValidation.valid,
      errors: {
        min: rangeValidation.errors.min,
        max: rangeValidation.errors.max,
        player1Min: "",
        player1Max: "",
        player2Min: "",
        player2Max: "",
        bestOf: bestOfValidation.error,
        players: validPlayers
          ? ""
          : "Both names are required and must be different",
      },
    };
  }

  const player1RangeValidation = validateRange(
    setup.player1Min,
    setup.player1Max,
  );
  const player2RangeValidation = validateRange(
    setup.player2Min,
    setup.player2Max,
  );

  return {
    valid:
      player1RangeValidation.valid &&
      player2RangeValidation.valid &&
      validPlayers &&
      bestOfValidation.valid,
    errors: {
      min: "",
      max: "",
      player1Min: player1RangeValidation.errors.min,
      player1Max: player1RangeValidation.errors.max,
      player2Min: player2RangeValidation.errors.min,
      player2Max: player2RangeValidation.errors.max,
      bestOf: bestOfValidation.error,
      players: validPlayers
        ? ""
        : "Both names are required and must be different",
    },
  };
}

function getWinsNeeded(bestOf) {
  const value = Number(bestOf);
  return value === 0 ? null : Math.ceil(value / 2);
}

function buildStoredSetup(setup) {
  return {
    separateBoards: !!setup.separateBoards,
    bestOf: String(setup.bestOf ?? "1"),
    min: setup.min ?? "",
    max: setup.max ?? "",
    player1Min: setup.player1Min ?? "",
    player1Max: setup.player1Max ?? "",
    player2Min: setup.player2Min ?? "",
    player2Max: setup.player2Max ?? "",
    player1: setup.player1 ?? "",
    player2: setup.player2 ?? "",
  };
}

function createBoard(min, max, symbol) {
  return {
    min: Number(min),
    max: Number(max),
    boardNumbers: randomUniqueCheckoutNumbers(Number(min), Number(max), 9),
    claims: Array(9).fill(null),
    winner: null,
    winningLine: [],
    isDraw: false,
    owner: symbol,
  };
}

function buildNewGame(setup) {
  const player1 = setup.player1.trim();
  const player2 = setup.player2.trim();
  const bestOf = Number(setup.bestOf);

  if (!setup.separateBoards) {
    return {
      mode: "shared",
      setupValues: buildStoredSetup(setup),
      bestOf,
      winsNeeded: getWinsNeeded(bestOf),
      matchWins: { X: 0, O: 0 },
      matchWinner: null,
      matchFinished: false,
      players: {
        X: player1,
        O: player2,
      },
      min: Number(setup.min),
      max: Number(setup.max),
      boardNumbers: randomUniqueCheckoutNumbers(
        Number(setup.min),
        Number(setup.max),
        9,
      ),
      claims: Array(9).fill(null),
      winner: null,
      winningLine: [],
      isDraw: false,
    };
  }

  return {
    mode: "separate",
    setupValues: buildStoredSetup(setup),
    bestOf,
    winsNeeded: getWinsNeeded(bestOf),
    matchWins: { X: 0, O: 0 },
    matchWinner: null,
    matchFinished: false,
    players: {
      X: player1,
      O: player2,
    },
    boards: {
      X: createBoard(setup.player1Min, setup.player1Max, "X"),
      O: createBoard(setup.player2Min, setup.player2Max, "O"),
    },
  };
}

function recomputeSharedGameState(baseGame, nextClaims) {
  const winner = getWinner(nextClaims);
  const isDraw = !winner && nextClaims.every(Boolean);

  return {
    ...baseGame,
    claims: nextClaims,
    winner: winner ? winner.symbol : null,
    winningLine: winner ? winner.line : [],
    isDraw,
  };
}

function recomputeSeparateBoardState(board) {
  const winner = getWinner(board.claims);
  const isDraw = !winner && board.claims.every(Boolean);

  return {
    ...board,
    winner: winner ? winner.symbol : null,
    winningLine: winner ? winner.line : [],
    isDraw,
  };
}

function resetSharedRound(game) {
  return {
    ...game,
    boardNumbers: randomUniqueCheckoutNumbers(game.min, game.max, 9),
    claims: Array(9).fill(null),
    winner: null,
    winningLine: [],
    isDraw: false,
  };
}

function resetSeparateRound(game) {
  return {
    ...game,
    boards: {
      X: createBoard(game.boards.X.min, game.boards.X.max, "X"),
      O: createBoard(game.boards.O.min, game.boards.O.max, "O"),
    },
  };
}

function applyRoundWinToMatch(game, roundWinner) {
  if (!roundWinner || game.matchWinner) {
    return game;
  }

  const nextMatchWins = {
    ...game.matchWins,
    [roundWinner]: game.matchWins[roundWinner] + 1,
  };

  const nextMatchWinner =
    game.winsNeeded !== null && nextMatchWins[roundWinner] >= game.winsNeeded
      ? roundWinner
      : null;

  return {
    ...game,
    matchWins: nextMatchWins,
    matchWinner: nextMatchWinner,
  };
}

function hydrateLoadedGame(savedGame) {
  if (!savedGame || typeof savedGame !== "object") {
    return null;
  }

  const normalizedSetupValues = buildStoredSetup({
    separateBoards:
      savedGame.setupValues?.separateBoards ?? savedGame.mode === "separate",
    bestOf: savedGame.setupValues?.bestOf ?? String(savedGame.bestOf ?? 1),
    min:
      savedGame.setupValues?.min ??
      (savedGame.mode === "shared" ? String(savedGame.min ?? "") : ""),
    max:
      savedGame.setupValues?.max ??
      (savedGame.mode === "shared" ? String(savedGame.max ?? "") : ""),
    player1Min:
      savedGame.setupValues?.player1Min ??
      (savedGame.mode === "separate"
        ? String(savedGame.boards?.X?.min ?? "")
        : ""),
    player1Max:
      savedGame.setupValues?.player1Max ??
      (savedGame.mode === "separate"
        ? String(savedGame.boards?.X?.max ?? "")
        : ""),
    player2Min:
      savedGame.setupValues?.player2Min ??
      (savedGame.mode === "separate"
        ? String(savedGame.boards?.O?.min ?? "")
        : ""),
    player2Max:
      savedGame.setupValues?.player2Max ??
      (savedGame.mode === "separate"
        ? String(savedGame.boards?.O?.max ?? "")
        : ""),
    player1: savedGame.setupValues?.player1 ?? savedGame.players?.X ?? "",
    player2: savedGame.setupValues?.player2 ?? savedGame.players?.O ?? "",
  });

  return {
    ...savedGame,
    bestOf: Number(savedGame.bestOf ?? 1),
    winsNeeded: getWinsNeeded(savedGame.bestOf ?? 1),
    matchWins: {
      X: Number(savedGame.matchWins?.X ?? 0),
      O: Number(savedGame.matchWins?.O ?? 0),
    },
    matchWinner: savedGame.matchWinner ?? null,
    matchFinished: Boolean(savedGame.matchFinished),
    setupValues: normalizedSetupValues,
  };
}

function getBoardHeading(fallbackLabel, playerName) {
  const name = playerName.trim();
  return name ? `${name}'s Board` : fallbackLabel;
}

function boardHasProgress(board) {
  return board.claims.some(Boolean) || !!board.winner || board.isDraw;
}

function isMatchOngoing(game) {
  if (!game) return false;

  const hasMatchScoreProgress = game.matchWins.X > 0 || game.matchWins.O > 0;

  if (game.mode === "shared") {
    return (
      hasMatchScoreProgress ||
      game.claims.some(Boolean) ||
      !!game.winner ||
      game.isDraw
    );
  }

  return (
    hasMatchScoreProgress ||
    boardHasProgress(game.boards.X) ||
    boardHasProgress(game.boards.O)
  );
}

export default function App() {
  const [setup, setSetup] = useState({
    separateBoards: false,
    bestOf: "1",
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
      return saved ? hydrateLoadedGame(JSON.parse(saved)) : null;
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
        return null;
      }
      return null;
    }
  });

  const [selectedTileIndex, setSelectedTileIndex] = useState(null);
  const [activeBoard, setActiveBoard] = useState("X");
  const [history, setHistory] = useState([]);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (game) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [game]);

  const validation = useMemo(() => validateSetup(setup), [setup]);

  const setupModalOpen = !game;
  const isSeparateMode = game?.mode === "separate";
  const currentBoard = isSeparateMode && game ? game.boards[activeBoard] : null;

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
      : game?.boards?.X?.winner
        ? "X"
        : game?.boards?.O?.winner
          ? "O"
          : null;

  const roundWinnerName =
    roundWinnerSymbol && game ? game.players[roundWinnerSymbol] : "";

  const roundWinModalOpen =
    !!game && !!roundWinnerSymbol && !game.matchFinished;

  const anyOverlayOpen =
    setupModalOpen || claimModalOpen || roundWinModalOpen || resetConfirmOpen;

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

  const matchWinnerName = game?.matchWinner
    ? game.players[game.matchWinner]
    : "";
  const canUndo = !!game && history.length > 0;

  const isFinalRoundWin =
    !!game &&
    !!roundWinnerSymbol &&
    game.winsNeeded !== null &&
    game.matchWinner === roundWinnerSymbol &&
    !game.matchFinished;

  function saveHistorySnapshot() {
    if (!game) return;
    setHistory((prev) => [...prev, structuredClone(game)]);
  }

  function handleStartGame() {
    if (!validation.valid) return;

    const nextGame = buildNewGame(setup);
    setGame(nextGame);
    setSelectedTileIndex(null);
    setActiveBoard("X");
    setHistory([]);
    setResetConfirmOpen(false);
  }

  function handleTileClick(index) {
    if (!game) return;

    if (game.mode === "shared") {
      if (
        game.winner ||
        game.isDraw ||
        game.matchWinner ||
        game.matchFinished
      ) {
        return;
      }
      setSelectedTileIndex(index);
      return;
    }

    const board = game.boards[activeBoard];
    if (
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

    const nextBoard = recomputeSeparateBoardState({
      ...board,
      claims: nextClaims,
    });

    let nextGame = {
      ...game,
      boards: {
        ...game.boards,
        [activeBoard]: nextBoard,
      },
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
    setGame({
      ...game,
      matchFinished: true,
    });
  }

  function performResetMatch() {
    if (!game) return;

    saveHistorySnapshot();
    setSelectedTileIndex(null);
    setResetConfirmOpen(false);

    if (game.mode === "shared") {
      setGame({
        ...resetSharedRound(game),
        matchWins: { X: 0, O: 0 },
        matchWinner: null,
        matchFinished: false,
      });
      return;
    }

    setGame({
      ...resetSeparateRound(game),
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

    setHistory((prev) => {
      const nextHistory = [...prev];
      const previousGame = nextHistory.pop();
      if (previousGame) {
        setGame(previousGame);
      }
      return nextHistory;
    });
  }

  function handleNewSetup() {
    if (game?.setupValues) {
      setSetup(game.setupValues);
    }

    setSelectedTileIndex(null);
    setActiveBoard("X");
    setResetConfirmOpen(false);
    setGame(null);
    setHistory([]);
  }

  const boardNumbers = isSeparateMode
    ? currentBoard.boardNumbers
    : (game?.boardNumbers ?? []);

  const boardClaims = isSeparateMode
    ? currentBoard.claims
    : (game?.claims ?? []);

  const boardWinningLine = isSeparateMode
    ? currentBoard.winningLine
    : (game?.winningLine ?? []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div
        className={
          anyOverlayOpen ? "pointer-events-none select-none blur-sm" : ""
        }
      >
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Darts Tic-Tac-Toe
            </h1>
            <p className="mt-2 text-slate-300">
              Click a number after it was checked in real life and assign it to
              the right player.
            </p>
          </div>

          {game && (
            <>
              <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-center">
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  {game.bestOf === 0
                    ? "Infinite Match"
                    : `Best of ${game.bestOf}`}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {game.players.X} {game.matchWins.X} - {game.matchWins.O}{" "}
                  {game.players.O}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {game.winsNeeded === null
                    ? "Play continues until the match is reset manually"
                    : `First to ${game.winsNeeded} round${
                        game.winsNeeded === 1 ? "" : "s"
                      } wins the match`}
                </div>
              </div>

              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                {game.mode === "shared" &&
                  game.matchWinner &&
                  game.matchFinished && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-xl font-semibold text-emerald-300">
                      {matchWinnerName} wins the match!
                    </div>
                  )}

                {game.mode === "shared" &&
                  !game.matchWinner &&
                  !game.winner &&
                  game.isDraw && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-xl font-semibold text-amber-300">
                      Draw game
                    </div>
                  )}

                {game.mode === "shared" &&
                  !game.matchWinner &&
                  !game.winner &&
                  !game.isDraw && (
                    <div className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-lg text-slate-200">
                      Tap any square to claim, change, or unclaim it
                    </div>
                  )}

                {game.mode === "separate" && (
                  <>
                    {game.matchWinner && game.matchFinished && (
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-xl font-semibold text-emerald-300">
                        {matchWinnerName} wins the match!
                      </div>
                    )}

                    {!game.matchWinner &&
                      !game.boards.X.winner &&
                      !game.boards.O.winner && (
                        <div className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-lg text-slate-200">
                          Tap a square to toggle it on or off for the selected
                          player
                        </div>
                      )}
                  </>
                )}

                {game.mode === "shared" && (
                  <div className="text-sm text-slate-400">
                    Range: {game.min} - {game.max} · X = {game.players.X} · O ={" "}
                    {game.players.O}
                  </div>
                )}

                {game.mode === "separate" && (
                  <div className="text-sm text-slate-400">
                    {game.players.X}: {game.boards.X.min} - {game.boards.X.max}{" "}
                    · {game.players.O}: {game.boards.O.min} -{" "}
                    {game.boards.O.max}
                  </div>
                )}
              </div>

              {game.mode === "separate" && (
                <div className="mb-6 flex rounded-2xl border border-slate-700 bg-slate-900 p-1">
                  <button
                    onClick={() => setActiveBoard("X")}
                    className={[
                      "rounded-xl px-5 py-3 font-semibold transition cursor-pointer",
                      activeBoard === "X"
                        ? "bg-cyan-400 text-slate-950"
                        : "text-cyan-300 hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {game.players.X}
                  </button>

                  <button
                    onClick={() => setActiveBoard("O")}
                    className={[
                      "rounded-xl px-5 py-3 font-semibold transition cursor-pointer",
                      activeBoard === "O"
                        ? "bg-pink-400 text-slate-950"
                        : "text-pink-300 hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {game.players.O}
                  </button>
                </div>
              )}

              <div className="grid w-full max-w-4xl grid-cols-3 gap-4">
                {boardNumbers.map((number, index) => {
                  const claim = boardClaims[index];
                  const isWinningTile = boardWinningLine.includes(index);

                  return (
                    <button
                      key={`${number}-${index}`}
                      onClick={() => handleTileClick(index)}
                      disabled={
                        game.mode === "shared"
                          ? !!game.winner ||
                            game.isDraw ||
                            !!game.matchWinner ||
                            !!game.matchFinished
                          : !!currentBoard.winner ||
                            currentBoard.isDraw ||
                            !!game.matchWinner ||
                            !!game.matchFinished
                      }
                      className={[
                        "relative aspect-square overflow-hidden rounded-2xl border transition",
                        "flex items-center justify-center",
                        "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800 cursor-pointer",
                        isWinningTile ? "ring-4 ring-emerald-400" : "",
                        game.mode === "shared"
                          ? game.winner ||
                            game.isDraw ||
                            game.matchWinner ||
                            game.matchFinished
                            ? "cursor-default"
                            : "cursor-pointer"
                          : currentBoard.winner ||
                              currentBoard.isDraw ||
                              game.matchWinner ||
                              game.matchFinished
                            ? "cursor-default"
                            : "cursor-pointer",
                      ].join(" ")}
                    >
                      {!claim && (
                        <span className="flex h-full w-full items-center justify-center text-6xl font-black text-slate-100 sm:text-7xl md:text-8xl">
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
                              "text-6xl font-black sm:text-7xl md:text-8xl",
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

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleResetMatch}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-medium text-amber-200 transition hover:bg-amber-500/20 cursor-pointer"
                >
                  Reset Match
                </button>

                <button
                  onClick={handleNewSetup}
                  className="rounded-xl border border-slate-600 px-4 py-2 font-medium text-white transition hover:bg-slate-800 cursor-pointer"
                >
                  Change Players / Range
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {setupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">Start new game</h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter the checkout range and both player names.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Player 1 (X)
                </label>
                <input
                  type="text"
                  value={setup.player1}
                  onChange={(e) =>
                    setSetup((prev) => ({ ...prev, player1: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                  placeholder="Player 1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Player 2 (O)
                </label>
                <input
                  type="text"
                  value={setup.player2}
                  onChange={(e) =>
                    setSetup((prev) => ({ ...prev, player2: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                  placeholder="Player 2"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={setup.separateBoards}
                  onChange={(e) =>
                    setSetup((prev) => ({
                      ...prev,
                      separateBoards: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                Separate Boards
              </label>
            </div>

            <div className="mt-6">
              <label className="mb-1 block text-sm text-slate-300">
                Best of
              </label>
              <input
                type="number"
                min="0"
                value={setup.bestOf}
                onChange={(e) =>
                  setSetup((prev) => ({ ...prev, bestOf: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                placeholder="e.g. 5 or 0 for infinite"
              />
              {validation.errors.bestOf && (
                <p className="mt-1 text-xs text-rose-400">
                  {validation.errors.bestOf}
                </p>
              )}
              {!validation.errors.bestOf && (
                <p className="mt-1 text-xs text-slate-400">
                  Use 0 for an infinite match until reset manually.
                </p>
              )}
            </div>

            {!setup.separateBoards && (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">
                    Min value
                  </label>
                  <input
                    type="number"
                    value={setup.min}
                    onChange={(e) =>
                      setSetup((prev) => ({ ...prev, min: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                    placeholder="e.g. 40"
                  />
                  {validation.errors.min && (
                    <p className="mt-1 text-xs text-rose-400">
                      {validation.errors.min}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">
                    Max value
                  </label>
                  <input
                    type="number"
                    value={setup.max}
                    onChange={(e) =>
                      setSetup((prev) => ({ ...prev, max: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                    placeholder="e.g. 100"
                  />
                  {validation.errors.max && (
                    <p className="mt-1 text-xs text-rose-400">
                      {validation.errors.max}
                    </p>
                  )}
                </div>
              </div>
            )}

            {setup.separateBoards && (
              <div className="mt-6 grid grid-cols-1 gap-6">
                <div className="rounded-2xl border border-cyan-500/20 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-cyan-300">
                    {getBoardHeading("Player 1 Board", setup.player1)}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Min value
                      </label>
                      <input
                        type="number"
                        value={setup.player1Min}
                        onChange={(e) =>
                          setSetup((prev) => ({
                            ...prev,
                            player1Min: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                        placeholder="e.g. 40"
                      />
                      {validation.errors.player1Min && (
                        <p className="mt-1 text-xs text-rose-400">
                          {validation.errors.player1Min}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Max value
                      </label>
                      <input
                        type="number"
                        value={setup.player1Max}
                        onChange={(e) =>
                          setSetup((prev) => ({
                            ...prev,
                            player1Max: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                        placeholder="e.g. 100"
                      />
                      {validation.errors.player1Max && (
                        <p className="mt-1 text-xs text-rose-400">
                          {validation.errors.player1Max}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-pink-500/20 p-4">
                  <h3 className="mb-4 text-lg font-semibold text-pink-300">
                    {getBoardHeading("Player 2 Board", setup.player2)}
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Min value
                      </label>
                      <input
                        type="number"
                        value={setup.player2Min}
                        onChange={(e) =>
                          setSetup((prev) => ({
                            ...prev,
                            player2Min: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                        placeholder="e.g. 40"
                      />
                      {validation.errors.player2Min && (
                        <p className="mt-1 text-xs text-rose-400">
                          {validation.errors.player2Min}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Max value
                      </label>
                      <input
                        type="number"
                        value={setup.player2Max}
                        onChange={(e) =>
                          setSetup((prev) => ({
                            ...prev,
                            player2Max: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                        placeholder="e.g. 100"
                      />
                      {validation.errors.player2Max && (
                        <p className="mt-1 text-xs text-rose-400">
                          {validation.errors.player2Max}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {validation.errors.players && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                <div>{validation.errors.players}</div>
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={!validation.valid}
              className={[
                "mt-6 w-full rounded-xl px-4 py-3 font-semibold transition",
                validation.valid
                  ? "bg-cyan-400 text-slate-950 hover:opacity-90 cursor-pointer"
                  : "cursor-not-allowed bg-slate-700 text-slate-400",
              ].join(" ")}
            >
              Start game
            </button>
          </div>
        </div>
      )}

      {claimModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">Number {selectedNumber}</h2>

            <p className="mt-2 text-sm text-slate-400">
              {!selectedClaim
                ? "Select who checked this out."
                : `Currently claimed by ${
                    selectedClaim === "X" ? game.players.X : game.players.O
                  }. You can change or remove it.`}
            </p>

            <div className="mt-6 grid gap-3">
              <button
                onClick={() => handleClaimTile("X")}
                className={[
                  "rounded-xl border px-4 py-4 text-left transition cursor-pointer",
                  selectedClaim === "X"
                    ? "border-cyan-400 bg-cyan-500/20"
                    : "border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20",
                ].join(" ")}
              >
                <div className="text-sm text-cyan-300">X</div>
                <div className="text-lg font-semibold text-white">
                  {game.players.X}
                </div>
              </button>

              <button
                onClick={() => handleClaimTile("O")}
                className={[
                  "rounded-xl border px-4 py-4 text-left transition cursor-pointer",
                  selectedClaim === "O"
                    ? "border-pink-400 bg-pink-500/20"
                    : "border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20",
                ].join(" ")}
              >
                <div className="text-sm text-pink-300">O</div>
                <div className="text-lg font-semibold text-white">
                  {game.players.O}
                </div>
              </button>
            </div>

            {selectedClaim && (
              <button
                onClick={handleUnclaimTile}
                className="mt-4 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-medium text-amber-200 transition hover:bg-amber-500/20 cursor-pointer"
              >
                Unclaim number
              </button>
            )}

            <button
              onClick={handleCloseClaimModal}
              className="mt-4 w-full rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {roundWinModalOpen && roundWinnerName && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">{roundWinnerName} won!</h2>

            <p className="mt-2 text-sm text-slate-400">
              {isFinalRoundWin
                ? "This was the deciding round. You can finish the game and keep the board visible, or undo the last action."
                : "Choose whether to continue to the next round or undo the last action."}
            </p>

            <div className="mt-6 grid gap-3">
              {isFinalRoundWin ? (
                <button
                  onClick={handleFinishGame}
                  className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:opacity-90 cursor-pointer"
                >
                  Finish Game
                </button>
              ) : (
                <button
                  onClick={handleNextRound}
                  className="rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:opacity-90 cursor-pointer"
                >
                  Next Round
                </button>
              )}

              <button
                onClick={handleUndoLastAction}
                disabled={!canUndo}
                className={[
                  "rounded-xl px-4 py-3 font-medium transition",
                  canUndo
                    ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 cursor-pointer"
                    : "cursor-not-allowed bg-slate-700 text-slate-400",
                ].join(" ")}
              >
                Undo Last Action
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">Reset match?</h2>

            <p className="mt-2 text-sm text-slate-400">
              This will clear the current round, reset the match score to 0 - 0,
              and remove the current progress.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                onClick={performResetMatch}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-medium text-rose-200 transition hover:bg-rose-500/20 cursor-pointer"
              >
                Yes, reset match
              </button>

              <button
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
