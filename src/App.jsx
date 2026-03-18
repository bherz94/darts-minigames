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

function randomUniqueNumbers(min, max, count = 9) {
  const pool = [];

  for (let i = min; i <= max; i += 1) {
    pool.push(i);
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
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

function validateSetup(min, max, player1, player2) {
  const minNum = Number(min);
  const maxNum = Number(max);

  const validMin = Number.isInteger(minNum) && minNum > 2 && minNum < 167;
  const validMax = Number.isInteger(maxNum) && maxNum > minNum && maxNum <= 170;
  const validPlayers =
    player1.trim().length > 0 &&
    player2.trim().length > 0 &&
    player1.trim() !== player2.trim();

  const enoughNumbers = validMin && validMax && maxNum - minNum + 1 >= 9;

  return {
    valid: validMin && validMax && validPlayers && enoughNumbers,
    errors: {
      min: validMin ? "" : "Min must be > 2 and < 167",
      max: validMax ? "" : "Max must be > min and <= 170",
      players: validPlayers
        ? ""
        : "Both names are required and must be different",
      range: enoughNumbers
        ? ""
        : "Range must contain at least 9 distinct numbers",
    },
  };
}

function buildNewGame(min, max, player1, player2) {
  return {
    min: Number(min),
    max: Number(max),
    players: {
      X: player1.trim(),
      O: player2.trim(),
    },
    boardNumbers: randomUniqueNumbers(Number(min), Number(max), 9),
    claims: Array(9).fill(null),
    winner: null,
    winningLine: [],
    isDraw: false,
  };
}

function recomputeGameState(baseGame, nextClaims) {
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

export default function App() {
  const [setup, setSetup] = useState({
    min: "",
    max: "",
    player1: "",
    player2: "",
  });

  const [game, setGame] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
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

  useEffect(() => {
    if (game) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [game]);

  const validation = useMemo(() => {
    return validateSetup(setup.min, setup.max, setup.player1, setup.player2);
  }, [setup]);

  const setupModalOpen = !game;
  const claimModalOpen =
    selectedTileIndex !== null && !!game && !game.winner && !game.isDraw;

  const selectedNumber =
    game && selectedTileIndex !== null
      ? game.boardNumbers[selectedTileIndex]
      : null;

  const selectedClaim =
    game && selectedTileIndex !== null ? game.claims[selectedTileIndex] : null;

  const winnerName = game?.winner ? game.players[game.winner] : "";

  function handleStartGame() {
    if (!validation.valid) return;

    setGame(buildNewGame(setup.min, setup.max, setup.player1, setup.player2));
  }

  function handleTileClick(index) {
    if (!game) return;
    if (game.winner || game.isDraw) return;

    setSelectedTileIndex(index);
  }

  function handleClaimTile(symbol) {
    if (!game || selectedTileIndex === null) return;

    const nextClaims = [...game.claims];
    nextClaims[selectedTileIndex] = symbol;

    setGame(recomputeGameState(game, nextClaims));
    setSelectedTileIndex(null);
  }

  function handleUnclaimTile() {
    if (!game || selectedTileIndex === null) return;

    const nextClaims = [...game.claims];
    nextClaims[selectedTileIndex] = null;

    setGame(recomputeGameState(game, nextClaims));
    setSelectedTileIndex(null);
  }

  function handleCloseClaimModal() {
    setSelectedTileIndex(null);
  }

  function handleResetBoard() {
    if (!game) return;

    setSelectedTileIndex(null);

    setGame({
      ...game,
      boardNumbers: randomUniqueNumbers(game.min, game.max, 9),
      claims: Array(9).fill(null),
      winner: null,
      winningLine: [],
      isDraw: false,
    });
  }

  function handleNewSetup() {
    setSelectedTileIndex(null);
    setGame(null);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div
        className={
          setupModalOpen || claimModalOpen
            ? "pointer-events-none select-none blur-sm"
            : ""
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
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                {game.winner && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-xl font-semibold text-emerald-300">
                    {winnerName} wins!
                  </div>
                )}

                {!game.winner && game.isDraw && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-xl font-semibold text-amber-300">
                    Draw game
                  </div>
                )}

                {!game.winner && !game.isDraw && (
                  <div className="rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-lg text-slate-200">
                    Tap any square to claim, change, or unclaim it
                  </div>
                )}

                <div className="text-sm text-slate-400">
                  Range: {game.min} - {game.max} · X = {game.players.X} · O ={" "}
                  {game.players.O}
                </div>
              </div>

              <div className="grid w-full max-w-4xl grid-cols-3 gap-4">
                {game.boardNumbers.map((number, index) => {
                  const claim = game.claims[index];
                  const isWinningTile = game.winningLine.includes(index);

                  return (
                    <button
                      key={`${number}-${index}`}
                      onClick={() => handleTileClick(index)}
                      disabled={!!game.winner || game.isDraw}
                      className={[
                        "relative aspect-square overflow-hidden rounded-2xl border transition",
                        "flex items-center justify-center",
                        "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800",
                        game.winner || game.isDraw
                          ? "cursor-default"
                          : "cursor-pointer",
                        isWinningTile ? "ring-4 ring-emerald-400" : "",
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
                  onClick={handleResetBoard}
                  className="rounded-xl bg-white px-4 py-2 font-medium text-slate-900 transition hover:opacity-90"
                >
                  New Round
                </button>

                <button
                  onClick={handleNewSetup}
                  className="rounded-xl border border-slate-600 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
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
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">Start new game</h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter the checkout range and both player names.
            </p>

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

            {(validation.errors.players || validation.errors.range) && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {validation.errors.players && (
                  <div>{validation.errors.players}</div>
                )}
                {validation.errors.range && (
                  <div>{validation.errors.range}</div>
                )}
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={!validation.valid}
              className={[
                "mt-6 w-full rounded-xl px-4 py-3 font-semibold transition",
                validation.valid
                  ? "bg-cyan-400 text-slate-950 hover:opacity-90"
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
                  "rounded-xl border px-4 py-4 text-left transition",
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
                  "rounded-xl border px-4 py-4 text-left transition",
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
                className="mt-4 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 font-medium text-amber-200 transition hover:bg-amber-500/20"
              >
                Unclaim number
              </button>
            )}

            <button
              onClick={handleCloseClaimModal}
              className="mt-4 w-full rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
