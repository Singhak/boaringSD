"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Flame, Share2, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import IncidentWarRoom, { type WarRoomRunSummary } from "@/components/incident/IncidentWarRoom";
import {
  generateDailyShareCard,
  getDailyChallenge,
  getDailyResult,
  msUntilNextDaily,
  recordDailyCompletion,
} from "@/lib/daily";
import { getCurrentStreak, hasFinishedOnboarding } from "@/lib/progression";
import { getUserStats, saveUserStats } from "@/lib/storage";
import { useUserStats } from "@/lib/useUserStats";
import { track } from "@/lib/events";
import type { DailyResult, UserStats } from "@/types";

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Ticks once a minute so the countdown stays live and the page rolls over at 00:00 UTC. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function DailyOutage() {
  const stats = useUserStats();
  const now = useNow();
  const [playing, setPlaying] = useState(false);
  const [lastXp, setLastXp] = useState<number | null>(null);

  if (stats === null) {
    return (
      <Shell>
        <div className="surface p-10 h-72 animate-pulse" aria-busy="true" />
      </Shell>
    );
  }

  if (!hasFinishedOnboarding(stats)) {
    return (
      <Shell>
        <section className="surface p-10 text-center space-y-4 max-w-xl mx-auto">
          <CalendarClock className="w-8 h-8 text-cyan-300 mx-auto" aria-hidden />
          <h1 className="text-2xl display">Take your first incident first</h1>
          <p className="text-sm text-slate-400">The daily outage unlocks once you have fixed the tutorial incident. It takes about two minutes.</p>
          <Link href="/" className="btn btn-primary">
            Take the incident <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </Shell>
    );
  }

  return (
    <DailyForDate
      key={now.toISOString().slice(0, 10)}
      stats={stats}
      now={now}
      playing={playing}
      setPlaying={setPlaying}
      lastXp={lastXp}
      setLastXp={setLastXp}
    />
  );
}

function DailyForDate({
  stats,
  now,
  playing,
  setPlaying,
  lastXp,
  setLastXp,
}: {
  stats: UserStats;
  now: Date;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  lastXp: number | null;
  setLastXp: (xp: number | null) => void;
}) {
  // Recomputed only when the UTC day changes (the parent keys this component by date).
  const [today] = useState(() => now);
  const daily = useMemo(() => getDailyChallenge(today), [today]);
  const result = getDailyResult(stats, today);

  const handleSolved = (summary: WarRoomRunSummary) => {
    const outcome = recordDailyCompletion(getUserStats(), summary, new Date());
    saveUserStats(outcome.stats);
    track("daily_complete", { incidentId: summary.incidentId, stars: summary.stars, variant: daily.variantIndex !== undefined });
    setLastXp(outcome.xpAwarded);
  };

  if (playing && !result) {
    return (
      <div className="min-h-dvh lg:h-screen lg:max-h-screen lg:overflow-hidden text-slate-100 flex flex-col bg-[#080d19]">
        <Navbar />
        <div className="shrink-0 flex items-center gap-2.5 px-4 sm:px-6 py-1.5 border-b border-[var(--line)] bg-[#0b1020]/90">
          <span className="font-mono text-cyan-300 font-semibold tracking-wide text-xs truncate">
            DAILY OUTAGE · {daily.dateKey} · {daily.packTitle.toUpperCase()}
          </span>
          <span className="chip chip-warn !text-[11px] !py-0 !px-1.5 shrink-0">+{daily.bonusXp} XP bonus</span>
        </div>
        <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-3 flex flex-col lg:overflow-hidden">
          <IncidentWarRoom
            initialIncidentId={daily.incident.id}
            skinSeed={daily.seed}
            variantIndex={daily.variantIndex}
            onRunSolved={handleSolved}
            onClose={() => setPlaying(false)}
          />
        </main>
      </div>
    );
  }

  const msLeft = msUntilNextDaily(now);

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="eyebrow">Daily outage · {daily.dateKey}</span>
        <span className="num flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5" aria-hidden /> Next in {formatCountdown(msLeft)}
        </span>
      </div>

      {result ? (
        <DailyResultCard daily={daily} result={result} stats={stats} xpAwarded={lastXp} />
      ) : (
        <article className="surface overflow-hidden !border-rose-400/25">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 py-3 border-b border-[var(--line)] bg-rose-400/[0.04]">
            <span className="chip chip-bad">
              <span className="dot animate-pulse-glow" aria-hidden /> {daily.incident.severity} · {daily.skin.occasion}
            </span>
            <span className="num text-[11px] text-slate-500">
              Level {daily.level} · {daily.phase} · {daily.skin.region}
            </span>
          </header>
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <p className="eyebrow">{daily.packTitle}</p>
              <h1 className="text-3xl sm:text-4xl display">{daily.incident.title}</h1>
              <p className="text-[15px] text-slate-400 leading-relaxed">{daily.incident.brief}</p>
            </div>
            <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-4 py-3 text-sm text-amber-100/90">
              <span className="font-semibold text-amber-200">Today&apos;s constraint: </span>
              {daily.incident.constraint}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  track("daily_start", { incidentId: daily.incident.id });
                  setPlaying(true);
                }}
                className="btn btn-primary btn-lg"
              >
                Take today&apos;s outage <ArrowRight className="w-4 h-4" />
              </button>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {["Same outage for everyone", "About 3 minutes", `+${daily.bonusXp} XP bonus`].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400/80" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      )}
    </Shell>
  );
}

function DailyResultCard({
  daily,
  result,
  stats,
  xpAwarded,
}: {
  daily: ReturnType<typeof getDailyChallenge>;
  result: DailyResult;
  stats: UserStats;
  xpAwarded: number | null;
}) {
  const [copied, setCopied] = useState(false);
  const streak = getCurrentStreak(stats, new Date());
  const card = generateDailyShareCard({
    dateKey: daily.dateKey,
    patternTitle: daily.packTitle,
    stars: result.stars,
    budgetRemainingPercent: result.budgetLeft,
    streak,
    hintsUsed: result.hintsUsed,
    url: typeof window !== "undefined" ? `${window.location.origin}/daily` : undefined,
  });

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: card });
        return;
      }
      await navigator.clipboard.writeText(card);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The user closed the share sheet, or the clipboard is blocked: nothing to do.
    }
  };

  return (
    <article className="surface-accent p-7 sm:p-9 space-y-6">
      <div className="space-y-2">
        <span className="chip chip-ok">
          <Check className="w-3.5 h-3.5" aria-hidden /> Outage resolved
        </span>
        <h1 className="text-3xl display">{daily.incident.title}</h1>
        <p className="text-sm text-slate-400">{daily.packTitle} · {daily.dateKey}</p>
      </div>

      <div className="flex items-center gap-1.5" aria-label={`${result.stars} of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={`w-8 h-8 ${i < result.stars ? "text-amber-300 fill-amber-300" : "text-slate-700"}`}
            aria-hidden
          />
        ))}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="SLA budget left" value={`${result.budgetLeft}%`} />
        <Stat label="Wrong deploys" value={String(result.wrongDeploys)} />
        <Stat label="Hints" value={String(result.hintsUsed)} />
        <Stat
          label="Streak"
          value={
            <span className="flex items-center gap-1 text-amber-300">
              <Flame className="w-4 h-4" aria-hidden /> {streak}
            </span>
          }
        />
      </dl>

      {xpAwarded !== null && xpAwarded > 0 && <p className="num text-sm text-amber-200/90">+{xpAwarded} XP daily bonus</p>}

      <pre className="rounded-lg border border-[var(--line)] bg-black/30 p-4 text-xs text-slate-300 whitespace-pre-wrap font-mono">{card}</pre>

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={share} className="btn btn-primary">
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? "Copied" : "Share result"}
        </button>
        <Link href="/" className="btn btn-ghost">
          Back to your next mission <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-black/20 p-3">
      <dt className="eyebrow !text-[11px]">{label}</dt>
      <dd className="num text-xl mt-1 text-white">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-5 animate-fadeIn">{children}</main>
    </div>
  );
}
