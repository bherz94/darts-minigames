import { randomUniqueCheckoutNumbers } from "./checkouts.js";

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const STORAGE_KEY = "darts-tictactoe-gamestate";
export const LANGUAGE_STORAGE_KEY = "darts-tictactoe-language";

export function getWinner(claims) {
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

export function validateRange(min, max, t) {
  const minNum = Number(min);
  const maxNum = Number(max);

  const validMin = Number.isInteger(minNum) && minNum >= 2 && minNum <= 167;
  const validMax = Number.isInteger(maxNum) && maxNum > minNum && maxNum <= 170;

  return {
    valid: validMin && validMax,
    errors: {
      min: validMin ? "" : t("validation.minRange"),
      max: validMax
        ? ""
        : t("validation.maxRange", { min: min || t("common.minLowercase") }),
    },
  };
}

export function validateBestOf(bestOf, t) {
  const value = Number(bestOf);
  const valid =
    Number.isInteger(value) && value >= 0 && (value === 0 || value % 2 === 1);

  return {
    valid,
    error: valid ? "" : t("validation.bestOf"),
  };
}

export function validateSetup(setup, t) {
  const validPlayers =
    setup.player1.trim().length > 0 &&
    setup.player2.trim().length > 0 &&
    setup.player1.trim() !== setup.player2.trim();

  const bestOfValidation = validateBestOf(setup.bestOf, t);

  if (!setup.separateBoards) {
    const rangeValidation = validateRange(setup.min, setup.max, t);

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
        players: validPlayers ? "" : t("validation.players"),
      },
    };
  }

  const player1RangeValidation = validateRange(
    setup.player1Min,
    setup.player1Max,
    t,
  );
  const player2RangeValidation = validateRange(
    setup.player2Min,
    setup.player2Max,
    t,
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
      players: validPlayers ? "" : t("validation.players"),
    },
  };
}

export function getWinsNeeded(bestOf) {
  const value = Number(bestOf);
  return value === 0 ? null : Math.ceil(value / 2);
}

export function buildStoredSetup(setup) {
  return {
    separateBoards: !!setup.separateBoards,
    bestOf: String(setup.bestOf ?? "3"),
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

export function createBoard(min, max, symbol) {
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

export function buildNewGame(setup) {
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
      roundNumber: 1,
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
    roundNumber: 1,
  };
}

export function recomputeSharedGameState(baseGame, nextClaims) {
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

export function recomputeSeparateBoardState(board) {
  const winner = getWinner(board.claims);
  const isDraw = !winner && board.claims.every(Boolean);

  return {
    ...board,
    winner: winner ? winner.symbol : null,
    winningLine: winner ? winner.line : [],
    isDraw,
  };
}

export function resetSharedRound(game) {
  return {
    ...game,
    roundNumber: (game.roundNumber ?? 1) + 1,
    boardNumbers: randomUniqueCheckoutNumbers(game.min, game.max, 9),
    claims: Array(9).fill(null),
    winner: null,
    winningLine: [],
    isDraw: false,
  };
}

export function resetSeparateRound(game) {
  return {
    ...game,
    roundNumber: (game.roundNumber ?? 1) + 1,
    boards: {
      X: createBoard(game.boards.X.min, game.boards.X.max, "X"),
      O: createBoard(game.boards.O.min, game.boards.O.max, "O"),
    },
  };
}

export function applyRoundWinToMatch(game, roundWinner) {
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

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidClaim(value) {
  return value === null || value === "X" || value === "O";
}

function normalizeClaims(claims) {
  if (!Array.isArray(claims) || claims.length !== 9) return null;
  if (!claims.every(isValidClaim)) return null;
  return claims;
}

function normalizeWinningLine(line) {
  if (!Array.isArray(line)) return [];
  return line.filter(
    (value) => Number.isInteger(value) && value >= 0 && value <= 8,
  );
}

function sanitizeBoard(rawBoard, fallbackOwner) {
  if (!isPlainObject(rawBoard)) return null;

  const min = Number(rawBoard.min);
  const max = Number(rawBoard.max);

  const validMin = Number.isInteger(min) && min >= 2 && min <= 167;
  const validMax = Number.isInteger(max) && max > min && max <= 170;
  if (!validMin || !validMax) return null;

  const claims = normalizeClaims(rawBoard.claims);
  if (!claims) return null;

  const boardNumbers =
    Array.isArray(rawBoard.boardNumbers) &&
    rawBoard.boardNumbers.length === 9 &&
    rawBoard.boardNumbers.every((n) => Number.isInteger(n))
      ? rawBoard.boardNumbers
      : randomUniqueCheckoutNumbers(min, max, 9);

  const recomputedBoard = recomputeSeparateBoardState({
    min,
    max,
    boardNumbers,
    claims,
    winner: null,
    winningLine: [],
    isDraw: false,
    owner: fallbackOwner,
  });

  return {
    ...recomputedBoard,
    owner: fallbackOwner,
  };
}

export function hydrateLoadedGame(savedGame) {
  if (!isPlainObject(savedGame)) {
    return null;
  }

  const mode = savedGame.mode;
  if (mode !== "shared" && mode !== "separate") {
    return null;
  }

  const playerX = String(savedGame.players?.X ?? "").trim();
  const playerO = String(savedGame.players?.O ?? "").trim();

  if (!playerX || !playerO || playerX === playerO) {
    return null;
  }

  const bestOf = Number(savedGame.bestOf ?? 3);
  const validBestOf =
    Number.isInteger(bestOf) &&
    bestOf >= 0 &&
    (bestOf === 0 || bestOf % 2 === 1);

  if (!validBestOf) {
    return null;
  }

  const setupValues = buildStoredSetup({
    separateBoards:
      savedGame.setupValues?.separateBoards ?? mode === "separate",
    bestOf: savedGame.setupValues?.bestOf ?? String(bestOf),
    min:
      savedGame.setupValues?.min ??
      (mode === "shared" ? String(savedGame.min ?? "") : ""),
    max:
      savedGame.setupValues?.max ??
      (mode === "shared" ? String(savedGame.max ?? "") : ""),
    player1Min:
      savedGame.setupValues?.player1Min ??
      (mode === "separate" ? String(savedGame.boards?.X?.min ?? "") : ""),
    player1Max:
      savedGame.setupValues?.player1Max ??
      (mode === "separate" ? String(savedGame.boards?.X?.max ?? "") : ""),
    player2Min:
      savedGame.setupValues?.player2Min ??
      (mode === "separate" ? String(savedGame.boards?.O?.min ?? "") : ""),
    player2Max:
      savedGame.setupValues?.player2Max ??
      (mode === "separate" ? String(savedGame.boards?.O?.max ?? "") : ""),
    player1: savedGame.setupValues?.player1 ?? playerX,
    player2: savedGame.setupValues?.player2 ?? playerO,
  });

  const winsNeeded = getWinsNeeded(bestOf);
  const matchWins = {
    X: Number.isInteger(savedGame.matchWins?.X) ? savedGame.matchWins.X : 0,
    O: Number.isInteger(savedGame.matchWins?.O) ? savedGame.matchWins.O : 0,
  };

  const rawMatchWinner = savedGame.matchWinner;
  const matchWinner =
    rawMatchWinner === "X" || rawMatchWinner === "O" ? rawMatchWinner : null;

  const baseGame = {
    mode,
    setupValues,
    bestOf,
    winsNeeded,
    matchWins,
    matchWinner,
    matchFinished: Boolean(savedGame.matchFinished),
    players: {
      X: playerX,
      O: playerO,
    },
    roundNumber:
      Number.isInteger(savedGame.roundNumber) && savedGame.roundNumber >= 1
        ? savedGame.roundNumber
        : matchWins.X + matchWins.O + 1,
  };

  if (mode === "shared") {
    const min = Number(savedGame.min);
    const max = Number(savedGame.max);

    const validMin = Number.isInteger(min) && min >= 2 && min <= 167;
    const validMax = Number.isInteger(max) && max > min && max <= 170;
    if (!validMin || !validMax) {
      return null;
    }

    const claims = normalizeClaims(savedGame.claims);
    if (!claims) {
      return null;
    }

    const boardNumbers =
      Array.isArray(savedGame.boardNumbers) &&
      savedGame.boardNumbers.length === 9 &&
      savedGame.boardNumbers.every((n) => Number.isInteger(n))
        ? savedGame.boardNumbers
        : randomUniqueCheckoutNumbers(min, max, 9);

    const recomputedGame = recomputeSharedGameState(
      {
        ...baseGame,
        min,
        max,
        boardNumbers,
        claims: Array(9).fill(null),
        winner: null,
        winningLine: [],
        isDraw: false,
      },
      claims,
    );

    return {
      ...recomputedGame,
      winningLine: normalizeWinningLine(recomputedGame.winningLine),
    };
  }

  const boardX = sanitizeBoard(savedGame.boards?.X, "X");
  const boardO = sanitizeBoard(savedGame.boards?.O, "O");

  if (!boardX || !boardO) {
    return null;
  }

  return {
    ...baseGame,
    boards: {
      X: {
        ...boardX,
        winningLine: normalizeWinningLine(boardX.winningLine),
      },
      O: {
        ...boardO,
        winningLine: normalizeWinningLine(boardO.winningLine),
      },
    },
  };
}

export function boardHasProgress(board) {
  return board.claims.some(Boolean) || !!board.winner || board.isDraw;
}

export function isMatchOngoing(game) {
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

export function getSeparateRoundState(game) {
  if (!game || game.mode !== "separate") return null;

  if (game.boards.X.winner) {
    return { finished: true, type: "win", winnerSymbol: "X" };
  }

  if (game.boards.O.winner) {
    return { finished: true, type: "win", winnerSymbol: "O" };
  }

  if (game.boards.X.isDraw && game.boards.O.isDraw) {
    return { finished: true, type: "draw", winnerSymbol: null };
  }

  return { finished: false, type: null, winnerSymbol: null };
}

export function getPlayerBoardHeading(playerName, t) {
  const name = playerName.trim();
  return name
    ? t("setup.playerBoardNamed", { name })
    : t("setup.playerBoardFallback");
}
