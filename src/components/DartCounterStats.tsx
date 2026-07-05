import { useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import {
  CounterGame,
  CounterPlayer,
  LegHistory,
  PlayerStats,
  computePlayerStats,
  getPlayerLegs,
} from "../utils/dartCounterTypes";

interface DartCounterStatsProps {
  game: CounterGame;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

function fmt(n: number): string {
  return n.toFixed(1);
}

function dash(n: number | null): string {
  return n === null || n === 0 ? "—" : String(n);
}

function dashAvg(n: number): string {
  return n === 0 ? "—" : fmt(n);
}

function getAllLegTabs(game: CounterGame): { setNum: number; legNum: number; key: string }[] {
  const seen = new Set<string>();
  const legs: { setNum: number; legNum: number; key: string }[] = [];

  for (const player of game.players) {
    for (const leg of player.completedLegs) {
      const key = `${leg.setNum}-${leg.legNum}`;
      if (!seen.has(key)) {
        seen.add(key);
        legs.push({ setNum: leg.setNum, legNum: leg.legNum, key });
      }
    }
  }

  const finalKey = `${game.currentSet}-${game.currentLeg}`;
  if (!seen.has(finalKey)) {
    legs.push({ setNum: game.currentSet, legNum: game.currentLeg, key: finalKey });
  }

  return legs.sort((a, b) => (a.setNum !== b.setNum ? a.setNum - b.setNum : a.legNum - b.legNum));
}

function getLegsForTab(
  player: CounterPlayer,
  game: CounterGame,
  tabKey: string | null,
): LegHistory[] {
  const allLegs = getPlayerLegs(player, game);
  if (!tabKey) return allLegs;
  const [s, l] = tabKey.split("-").map(Number);
  return allLegs.filter((leg) => leg.setNum === s && leg.legNum === l);
}

function SectionHeader({ label, cols }: { label: string; cols: number }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="bg-emerald-900/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-400"
      >
        {label}
      </td>
    </tr>
  );
}

function StatRow({
  label,
  values,
  winnerIdx,
}: {
  label: string;
  values: string[];
  winnerIdx: number;
}) {
  return (
    <tr className="border-b border-slate-800/60">
      <td className="px-3 py-2 text-sm text-slate-400">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={["px-3 py-2 text-right text-sm", i === winnerIdx ? "text-cyan-400" : "text-slate-300"].join(" ")}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

export default function DartCounterStats({ game, onPlayAgain, onNewGame }: DartCounterStatsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("game");

  const allLegTabs = getAllLegTabs(game);
  const showSets = game.matchFormat.bestOfSets > 1;
  const showDoubleRows = game.matchFormat.doubleOut;
  const winnerIdx = game.players.findIndex((p) => p.name === game.winner);
  const cols = 1 + game.players.length;

  const tabLegKey = activeTab === "game" ? null : activeTab;
  const statsPerPlayer: PlayerStats[] = game.players.map((p) =>
    computePlayerStats(getLegsForTab(p, game, tabLegKey), game.startingScore),
  );

  const BUCKETS = [
    t("counter.stats.noScore"),
    "1–19",
    "20+",
    "40+",
    "60+",
    "80+",
    "100+",
    "120+",
    "140+",
    "160+",
    "180",
  ];

  function tabLabel(leg: { setNum: number; legNum: number }): string {
    if (showSets) {
      return `${t("counter.stats.set", { n: leg.setNum })} ${t("counter.stats.leg", { n: leg.legNum })}`;
    }
    return t("counter.stats.leg", { n: leg.legNum });
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-4 md:py-5">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("counter.stats.title")}</h1>
        {game.winner && (
          <p className="mt-1 text-sm text-emerald-400">
            {t("counter.win.title", { name: game.winner })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("game")}
          className={[
            "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
            activeTab === "game"
              ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700",
          ].join(" ")}
        >
          {t("counter.stats.game")}
        </button>
        {allLegTabs.map((leg) => (
          <button
            key={leg.key}
            onClick={() => setActiveTab(leg.key)}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              activeTab === leg.key
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700",
            ].join(" ")}
          >
            {tabLabel(leg)}
          </button>
        ))}
      </div>

      {/* Stats table */}
      <div className="overflow-hidden rounded-2xl border border-slate-700">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500" />
              {game.players.map((p, i) => (
                <th
                  key={p.name}
                  className={[
                    "px-3 py-2.5 text-right text-sm font-semibold",
                    i === winnerIdx ? "text-emerald-400" : "text-slate-200",
                  ].join(" ")}
                >
                  {p.name} {i === winnerIdx && "🏆"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 bg-slate-900">
            {/* Summary */}
            <SectionHeader label={t("counter.stats.summary")} cols={cols} />
            <StatRow
              label={t("counter.stats.legs")}
              values={statsPerPlayer.map((s) => `${s.legsWon}/${s.legsPlayed}`)}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.darts")}
              values={statsPerPlayer.map((s) => String(s.totalDarts))}
              winnerIdx={winnerIdx}
            />

            {/* 3-Dart Average */}
            <SectionHeader label={t("counter.stats.avg3dart")} cols={cols} />
            <StatRow
              label={t("counter.stats.avgOverall")}
              values={statsPerPlayer.map((s) => dashAvg(s.avgOverall))}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.avgFirst9")}
              values={statsPerPlayer.map((s) => dashAvg(s.avgFirst9))}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.avgFirst12")}
              values={statsPerPlayer.map((s) => dashAvg(s.avgFirst12))}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.avgFirst15")}
              values={statsPerPlayer.map((s) => dashAvg(s.avgFirst15))}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.avgUntil100")}
              values={statsPerPlayer.map((s) => dashAvg(s.avgUntil100))}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.avgUntil170")}
              values={statsPerPlayer.map((s) => dashAvg(s.avgUntil170))}
              winnerIdx={winnerIdx}
            />

            {/* Checkout */}
            <SectionHeader label={t("counter.stats.checkout")} cols={cols} />
            <StatRow
              label={t("counter.stats.coAvg")}
              values={statsPerPlayer.map((s) => dashAvg(s.checkoutAvg))}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.highestCO")}
              values={statsPerPlayer.map((s) => dash(s.highestCheckout))}
              winnerIdx={winnerIdx}
            />
            {showDoubleRows && (
              <>
                <StatRow
                  label={t("counter.stats.doubles")}
                  values={statsPerPlayer.map((s) => `${s.doublesHit}/${s.doublesAttempted}`)}
                  winnerIdx={winnerIdx}
                />
                <StatRow
                  label={t("counter.stats.doublePercent")}
                  values={statsPerPlayer.map((s) =>
                    s.doublesAttempted > 0
                      ? `${Math.round((s.doublesHit / s.doublesAttempted) * 100)}%`
                      : "—",
                  )}
                  winnerIdx={winnerIdx}
                />
              </>
            )}

            {/* Best */}
            <SectionHeader label={t("counter.stats.best")} cols={cols} />
            <StatRow
              label={t("counter.stats.bestLeg")}
              values={statsPerPlayer.map((s) =>
                s.bestLegDarts !== null ? String(s.bestLegDarts) : "—",
              )}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.bestLegAvg")}
              values={statsPerPlayer.map((s) =>
                s.bestLegAvg !== null ? fmt(s.bestLegAvg) : "—",
              )}
              winnerIdx={winnerIdx}
            />
            <StatRow
              label={t("counter.stats.highscore")}
              values={statsPerPlayer.map((s) => dash(s.highscore))}
              winnerIdx={winnerIdx}
            />

            {/* Visit breakdown */}
            <SectionHeader label={t("counter.stats.visits")} cols={cols} />
            {BUCKETS.map((bucketLabel, bi) => (
              <StatRow
                key={bi}
                label={bucketLabel}
                values={statsPerPlayer.map((s) => String(s.buckets[bi]))}
                winnerIdx={winnerIdx}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          onClick={onPlayAgain}
          className="rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90"
        >
          {t("counter.win.playAgain")}
        </button>
        <button
          onClick={onNewGame}
          className="rounded-xl border border-slate-600 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
        >
          {t("counter.win.newGame")}
        </button>
      </div>
    </main>
  );
}
