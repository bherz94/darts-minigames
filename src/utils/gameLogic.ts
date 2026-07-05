import { randomUniqueCheckoutNumbers } from "./checkouts";

export const WIN_LINES: [number, number, number][] = [
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

export type PlayerSymbol = "X" | "O";
export type Claim = PlayerSymbol | null;

export interface Board {
  min: number;
  max: number;
  boardNumbers: number[];
  claims: Claim[];
  winner: PlayerSymbol | null;
  winningLine: number[];
  isDraw: boolean;
  owner: PlayerSymbol;
}

export interface Setup {
  separateBoards: boolean;
  bestOf: string;
  min: string;
  max: string;
  player1Min: string;
  player1Max: string;
  player2Min: string;
  player2Max: string;
  player1: string;
  player2: string;
}

interface BaseGame {
  setupValues: Setup;
  bestOf: number;
  winsNeeded: number | null;
  matchWins: { X: number; O: number };
  matchWinner: PlayerSymbol | null;
  matchFinished: boolean;
  players: { X: string; O: string };
  roundNumber: number;
}

export interface SharedGame extends BaseGame {
  mode: "shared";
  min: number;
  max: number;
  boardNumbers: number[];
  claims: Claim[];
  winner: PlayerSymbol | null;
  winningLine: number[];
  isDraw: boolean;
}

export interface SeparateGame extends BaseGame {
  mode: "separate";
  boards: { X: Board; O: Board };
}

export type Game = SharedGame | SeparateGame;

export interface ValidationResult {
  valid: boolean;
  errors: {
    min: string;
    max: string;
    player1Min: string;
    player1Max: string;
    player2Min: string;
    player2Max: string;
    bestOf: string;
    players: string;
  };
}

export interface SeparateRoundState {
  finished: boolean;
  type: "win" | "draw" | null;
  winnerSymbol: PlayerSymbol | null;
}

type TFunction = (key: string, vars?: Record<string, string | number>) => string;

interface WinnerResult {
  symbol: PlayerSymbol;
  line: number[];
}

export function getWinner(claims: Claim[]): WinnerResult | null {
  for (const [a, b, c] of WIN_LINES) {
    if (claims[a] && claims[a] === claims[b] && claims[a] === claims[c]) {
      return {
        symbol: claims[a] as PlayerSymbol,
        line: [a, b, c],
      };
    }
  }
  return null;
}

export function validateRange(
  min: string,
  max: string,
  t: TFunction,
): { valid: boolean; errors: { min: string; max: string } } {
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

export function validateBestOf(
  bestOf: string,
  t: TFunction,
): { valid: boolean; error: string } {
  const value = Number(bestOf);
  const valid =
    Number.isInteger(value) && value >= 0 && (value === 0 || value % 2 === 1);

  return {
    valid,
    error: valid ? "" : t("validation.bestOf"),
  };
}

export function validateSetup(setup: Setup, t: TFunction): ValidationResult {
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

export function getWinsNeeded(bestOf: number): number | null {
  return bestOf === 0 ? null : Math.ceil(bestOf / 2);
}

export function buildStoredSetup(setup: Setup): Setup {
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

export function createBoard(min: string | number, max: string | number, symbol: PlayerSymbol): Board {
  return {
    min: Number(min),
    max: Number(max),
    boardNumbers: randomUniqueCheckoutNumbers(Number(min), Number(max), 9),
    claims: Array(9).fill(null) as Claim[],
    winner: null,
    winningLine: [],
    isDraw: false,
    owner: symbol,
  };
}

export function buildNewGame(setup: Setup): Game {
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
      players: { X: player1, O: player2 },
      min: Number(setup.min),
      max: Number(setup.max),
      boardNumbers: randomUniqueCheckoutNumbers(Number(setup.min), Number(setup.max), 9),
      claims: Array(9).fill(null) as Claim[],
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
    players: { X: player1, O: player2 },
    boards: {
      X: createBoard(setup.player1Min, setup.player1Max, "X"),
      O: createBoard(setup.player2Min, setup.player2Max, "O"),
    },
    roundNumber: 1,
  };
}

export function recomputeSharedGameState(baseGame: SharedGame, nextClaims: Claim[]): SharedGame {
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

export function recomputeSeparateBoardState(board: Board): Board {
  const winner = getWinner(board.claims);
  const isDraw = !winner && board.claims.every(Boolean);

  return {
    ...board,
    winner: winner ? winner.symbol : null,
    winningLine: winner ? winner.line : [],
    isDraw,
  };
}

export function resetSharedRound(game: SharedGame): SharedGame {
  return {
    ...game,
    roundNumber: (game.roundNumber ?? 1) + 1,
    boardNumbers: randomUniqueCheckoutNumbers(game.min, game.max, 9),
    claims: Array(9).fill(null) as Claim[],
    winner: null,
    winningLine: [],
    isDraw: false,
  };
}

export function resetSeparateRound(game: SeparateGame): SeparateGame {
  return {
    ...game,
    roundNumber: (game.roundNumber ?? 1) + 1,
    boards: {
      X: createBoard(game.boards.X.min, game.boards.X.max, "X"),
      O: createBoard(game.boards.O.min, game.boards.O.max, "O"),
    },
  };
}

export function applyRoundWinToMatch(game: Game, roundWinner: PlayerSymbol): Game {
  if (game.matchWinner) {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidClaim(value: unknown): value is Claim {
  return value === null || value === "X" || value === "O";
}

function normalizeClaims(claims: unknown): Claim[] | null {
  if (!Array.isArray(claims) || claims.length !== 9) return null;
  if (!claims.every(isValidClaim)) return null;
  return claims;
}

function normalizeWinningLine(line: unknown): number[] {
  if (!Array.isArray(line)) return [];
  return line.filter(
    (value) => Number.isInteger(value) && value >= 0 && value <= 8,
  );
}

function sanitizeBoard(rawBoard: unknown, fallbackOwner: PlayerSymbol): Board | null {
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
      ? (rawBoard.boardNumbers as number[])
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

export function hydrateLoadedGame(savedGame: unknown): Game | null {
  if (!isPlainObject(savedGame)) return null;

  const mode = savedGame.mode;
  if (mode !== "shared" && mode !== "separate") return null;

  const playersRaw = savedGame.players;
  const playerX = isPlainObject(playersRaw) ? String(playersRaw.X ?? "").trim() : "";
  const playerO = isPlainObject(playersRaw) ? String(playersRaw.O ?? "").trim() : "";

  if (!playerX || !playerO || playerX === playerO) return null;

  const bestOf = Number(savedGame.bestOf ?? 3);
  const validBestOf =
    Number.isInteger(bestOf) &&
    bestOf >= 0 &&
    (bestOf === 0 || bestOf % 2 === 1);
  if (!validBestOf) return null;

  const sv = isPlainObject(savedGame.setupValues) ? savedGame.setupValues : null;
  const boardsRaw = isPlainObject(savedGame.boards) ? savedGame.boards : null;
  const boardXRaw = isPlainObject(boardsRaw?.X) ? boardsRaw.X : null;
  const boardORaw = isPlainObject(boardsRaw?.O) ? boardsRaw.O : null;

  const setupValues = buildStoredSetup({
    separateBoards: sv != null ? Boolean(sv.separateBoards) : mode === "separate",
    bestOf: sv?.bestOf != null ? String(sv.bestOf) : String(bestOf),
    min: sv?.min != null ? String(sv.min) : (mode === "shared" ? String(savedGame.min ?? "") : ""),
    max: sv?.max != null ? String(sv.max) : (mode === "shared" ? String(savedGame.max ?? "") : ""),
    player1Min: sv?.player1Min != null ? String(sv.player1Min) : (boardXRaw != null ? String(boardXRaw.min ?? "") : ""),
    player1Max: sv?.player1Max != null ? String(sv.player1Max) : (boardXRaw != null ? String(boardXRaw.max ?? "") : ""),
    player2Min: sv?.player2Min != null ? String(sv.player2Min) : (boardORaw != null ? String(boardORaw.min ?? "") : ""),
    player2Max: sv?.player2Max != null ? String(sv.player2Max) : (boardORaw != null ? String(boardORaw.max ?? "") : ""),
    player1: sv?.player1 != null ? String(sv.player1) : playerX,
    player2: sv?.player2 != null ? String(sv.player2) : playerO,
  });

  const winsNeeded = getWinsNeeded(bestOf);
  const matchWinsRaw = isPlainObject(savedGame.matchWins) ? savedGame.matchWins : null;
  const mwX = matchWinsRaw?.X;
  const mwO = matchWinsRaw?.O;
  const matchWins = {
    X: typeof mwX === "number" && Number.isInteger(mwX) ? mwX : 0,
    O: typeof mwO === "number" && Number.isInteger(mwO) ? mwO : 0,
  };

  const rawMatchWinner = savedGame.matchWinner;
  const matchWinner: PlayerSymbol | null =
    rawMatchWinner === "X" || rawMatchWinner === "O" ? rawMatchWinner : null;

  const savedRoundNumber = savedGame.roundNumber;
  const baseGame: Omit<SharedGame, "mode" | "min" | "max" | "boardNumbers" | "claims" | "winner" | "winningLine" | "isDraw"> &
                  Omit<SeparateGame, "mode" | "boards"> = {
    setupValues,
    bestOf,
    winsNeeded,
    matchWins,
    matchWinner,
    matchFinished: Boolean(savedGame.matchFinished),
    players: { X: playerX, O: playerO },
    roundNumber:
      typeof savedRoundNumber === "number" && Number.isInteger(savedRoundNumber) && savedRoundNumber >= 1
        ? savedRoundNumber
        : matchWins.X + matchWins.O + 1,
  };

  if (mode === "shared") {
    const min = Number(savedGame.min);
    const max = Number(savedGame.max);

    const validMin = Number.isInteger(min) && min >= 2 && min <= 167;
    const validMax = Number.isInteger(max) && max > min && max <= 170;
    if (!validMin || !validMax) return null;

    const claims = normalizeClaims(savedGame.claims);
    if (!claims) return null;

    const rawBoardNumbers = savedGame.boardNumbers;
    const boardNumbers =
      Array.isArray(rawBoardNumbers) &&
      rawBoardNumbers.length === 9 &&
      rawBoardNumbers.every((n) => Number.isInteger(n))
        ? (rawBoardNumbers as number[])
        : randomUniqueCheckoutNumbers(min, max, 9);

    const recomputedGame = recomputeSharedGameState(
      {
        ...baseGame,
        mode: "shared",
        min,
        max,
        boardNumbers,
        claims: Array(9).fill(null) as Claim[],
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

  const boardX = sanitizeBoard(savedGame.boards ? (savedGame.boards as Record<string, unknown>).X : null, "X");
  const boardO = sanitizeBoard(savedGame.boards ? (savedGame.boards as Record<string, unknown>).O : null, "O");

  if (!boardX || !boardO) return null;

  return {
    ...baseGame,
    mode: "separate",
    boards: {
      X: { ...boardX, winningLine: normalizeWinningLine(boardX.winningLine) },
      O: { ...boardO, winningLine: normalizeWinningLine(boardO.winningLine) },
    },
  };
}

export function boardHasProgress(board: Board): boolean {
  return board.claims.some(Boolean) || !!board.winner || board.isDraw;
}

export function isMatchOngoing(game: Game | null): boolean {
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

export function getSeparateRoundState(game: Game | null): SeparateRoundState | null {
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

export function getPlayerBoardHeading(playerName: string, t: TFunction): string {
  const name = playerName.trim();
  return name
    ? t("setup.playerBoardNamed", { name })
    : t("setup.playerBoardFallback");
}
