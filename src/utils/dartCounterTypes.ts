export interface MatchFormat {
  bestOfSets: number;
  bestOfLegs: number;
  doubleIn: boolean;
  doubleOut: boolean;
}

export interface HistoryEntry {
  value: number;
  bust: boolean;
  noScore: boolean;
  dartsThrown: number;
  remainingAfter: number;
  doubleAttempted: boolean;
  doubleHit: boolean;
  finishingDart?: 1 | 2 | 3;
}

export interface LegHistory {
  history: HistoryEntry[];
  setNum: number;
  legNum: number;
  won: boolean;
}

export interface CounterPlayer {
  name: string;
  score: number;
  history: HistoryEntry[];
  legsWon: number;
  setsWon: number;
  hasOpenedScoring: boolean;
  completedLegs: LegHistory[];
}

export interface CounterGame {
  startingScore: 301 | 501;
  matchFormat: MatchFormat;
  players: CounterPlayer[];
  currentPlayerIndex: number;
  legStartPlayerIndex: number | null; // null = bull not yet decided
  currentSet: number;
  currentLeg: number;
  legWinner: string | null;
  legWinnerWonSet: boolean;
  winner: string | null;
  inProgress: boolean;
  lastSnapshot: CounterGame | null;
}

export interface PlayerStats {
  legsPlayed: number;
  legsWon: number;
  totalDarts: number;
  avgOverall: number;
  avgFirst9: number;
  avgFirst12: number;
  avgFirst15: number;
  avgUntil100: number;
  avgUntil170: number;
  checkoutAvg: number;
  highestCheckout: number;
  doublesHit: number;
  doublesAttempted: number;
  bestLegDarts: number | null;
  bestLegAvg: number | null;
  highscore: number | null;
  buckets: number[];
}

export function getPlayerLegs(player: CounterPlayer, game: CounterGame): LegHistory[] {
  return [
    ...player.completedLegs,
    {
      history: player.history,
      setNum: game.currentSet,
      legNum: game.currentLeg,
      won: player.name === game.winner,
    },
  ];
}

export function remainingBefore(entry: HistoryEntry): number {
  return entry.bust ? entry.remainingAfter : entry.remainingAfter + entry.value;
}

function visitAvg(entries: HistoryEntry[]): number {
  if (entries.length === 0) return 0;
  return entries.reduce((sum, e) => sum + (e.bust ? 0 : e.value), 0) / entries.length;
}

function oneLegAvg(leg: LegHistory, startingScore: number): number {
  if (leg.history.length === 0) return 0;
  const last = leg.history[leg.history.length - 1];
  return (startingScore - last.remainingAfter) / leg.history.length;
}

export function computePlayerStats(legs: LegHistory[], startingScore: number): PlayerStats {
  const allEntries = legs.flatMap((l) => l.history);

  const legsPlayed = legs.length;
  const wonLegs = legs.filter((l) => l.won);
  const legsWon = wonLegs.length;
  const totalDarts = legs.reduce((sum, leg) => {
    const last = leg.history[leg.history.length - 1];
    return sum + (last ? last.dartsThrown : 0);
  }, 0);

  const totalScored = legs.reduce((sum, leg) => {
    const last = leg.history[leg.history.length - 1];
    return sum + (last ? startingScore - last.remainingAfter : 0);
  }, 0);
  const avgOverall = allEntries.length > 0 ? totalScored / allEntries.length : 0;

  const avgFirst9 = visitAvg(legs.flatMap((l) => l.history.slice(0, 3)));
  const avgFirst12 = visitAvg(legs.flatMap((l) => l.history.slice(0, 4)));
  const avgFirst15 = visitAvg(legs.flatMap((l) => l.history.slice(0, 5)));

  const avgUntil100 = visitAvg(allEntries.filter((e) => remainingBefore(e) > 100));
  const avgUntil170 = visitAvg(allEntries.filter((e) => remainingBefore(e) > 170));

  const checkouts = wonLegs
    .map((l) => l.history[l.history.length - 1])
    .filter((e): e is HistoryEntry => !!e && !e.bust)
    .map((e) => e.value);
  const checkoutAvg =
    checkouts.length > 0 ? checkouts.reduce((a, b) => a + b, 0) / checkouts.length : 0;
  const highestCheckout = checkouts.length > 0 ? Math.max(...checkouts) : 0;

  const doublesAttempted = allEntries.filter((e) => e.doubleAttempted).length;
  const doublesHit = allEntries.filter((e) => e.doubleHit).length;

  const wonLegStats = wonLegs
    .filter((l) => l.history.length > 0)
    .map((l) => ({ darts: l.history[l.history.length - 1].dartsThrown, avg: oneLegAvg(l, startingScore) }));

  let bestLegDarts: number | null = null;
  let bestLegAvg: number | null = null;
  if (wonLegStats.length > 0) {
    const best = wonLegStats.reduce((prev, curr) => (curr.darts < prev.darts ? curr : prev));
    bestLegDarts = best.darts;
    bestLegAvg = best.avg;
  }

  const scoringValues = allEntries.filter((e) => !e.bust && e.value > 0).map((e) => e.value);
  const highscore = scoringValues.length > 0 ? Math.max(...scoringValues) : null;

  const buckets = new Array(11).fill(0);
  for (const e of allEntries) {
    const v = e.bust ? 0 : e.value;
    if (v === 0) buckets[0]++;
    else if (v <= 19) buckets[1]++;
    else if (v <= 39) buckets[2]++;
    else if (v <= 59) buckets[3]++;
    else if (v <= 79) buckets[4]++;
    else if (v <= 99) buckets[5]++;
    else if (v <= 119) buckets[6]++;
    else if (v <= 139) buckets[7]++;
    else if (v <= 159) buckets[8]++;
    else if (v <= 179) buckets[9]++;
    else buckets[10]++;
  }

  return {
    legsPlayed,
    legsWon,
    totalDarts,
    avgOverall,
    avgFirst9,
    avgFirst12,
    avgFirst15,
    avgUntil100,
    avgUntil170,
    checkoutAvg,
    highestCheckout,
    doublesHit,
    doublesAttempted,
    bestLegDarts,
    bestLegAvg,
    highscore,
    buckets,
  };
}
