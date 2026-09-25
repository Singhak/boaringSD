"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Flame, Play, RotateCcw } from "lucide-react";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";
import { getAllRunProgress } from "@/lib/storage";
import { DEFAULT_STATS, getCurrentStreak, hasFinishedOnboarding, selectNextAction } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";

const INCIDENT_METRICS = [
  { label: "Traffic", value: "100,000", unit: "req/s", tone: "text-white" },
  { label: "App server CPU", value: "98", unit: "%", tone: "text-rose-300", bad: true },
  { label: "p95 latency", value: "4,200", unit: "ms", tone: "text-rose-300", bad: true },
  { label: "User impact", value: "504", unit: "errors", tone: "text-rose-300", bad: true },
];

export default function RootPage() {
  const liveStats = useUserStats();
  const stats = liveStats ?? DEFAULT_STATS;
  const [inFixMode, setInFixMode] = useState(false);

  // Onboarding incidents first; afterwards the shared selector picks one next action.
  const hasSavedTwitter = hasFinishedOnboarding(stats);
  const action = liveStats ? selectNextAction(liveStats, new Date(), getAllRunProgress()) : null;

  // The incident screen sounds its own alarm when it opens.
  const handleStartFix = () => setInFixMode(true);

  // =========================================================================
  // First visit: act before anything else (no nav, no sign-up)
  // =========================================================================
  if (!hasSavedTwitter || !action) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[760px] h-[420px] rounded-full bg-rose-500/[0.07] blur-[120px] pointer-events-none -z-10"
        />

        <div className={`w-full mx-auto transition-[max-width] ${inFixMode ? "max-w-5xl" : "max-w-3xl"}`}>
          {inFixMode ? (
            <div className="animate-fadeIn w-full">
              <PushpaMissionWarRoom onClose={() => setInFixMode(false)} />
            </div>
          ) : (
            <div className="space-y-10 animate-fadeIn">
              <p className="text-center eyebrow">System Design Quest</p>

              <article className="surface overflow-hidden !border-rose-400/25 shadow-[0_30px_80px_-30px_rgba(251,113,133,0.35)]">
                {/* Pager header */}
                <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-[var(--line)] bg-rose-400/[0.04]">
                  <span className="chip chip-bad">
                    <span className="dot animate-pulse-glow" aria-hidden /> P0 · Live outage
                  </span>
                  <span className="num text-[11px] text-slate-500">INC-001 · paged just now</span>
                </header>

                <div className="p-6 sm:p-10 space-y-8">
                  <div className="space-y-3 max-w-xl">
                    <h1 className="text-4xl sm:text-5xl display">The feed is down.</h1>
                    <p className="text-[15px] sm:text-base text-slate-400 leading-relaxed">
                      A traffic spike just hit a single overloaded server. Users can&apos;t refresh their feeds. You&apos;re on call —
                      find the bottleneck and fix it.
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 rounded-xl overflow-hidden border border-[var(--line)] divide-x divide-y sm:divide-y-0 divide-[var(--line)]">
                    {INCIDENT_METRICS.map((m) => (
                      <div key={m.label} className="p-4 bg-black/10">
                        <dt className="flex items-center gap-1.5">
                          {m.bad && <span aria-hidden className="dot text-rose-400 animate-pulse-glow" />}
                          <span className="eyebrow !text-[10px]">{m.label}</span>
                        </dt>
                        <dd className={`num text-2xl mt-1.5 ${m.tone}`}>
                          {m.value}
                          <span className="text-xs text-slate-500 ml-1">{m.unit}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <button onClick={handleStartFix} className="btn btn-primary btn-lg group">
                      Take the incident
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {["No sign-up", "About 2 minutes", "+150 XP"].map((t) => (
                        <li key={t} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400/80" aria-hidden />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>

              <p className="text-center text-xs text-slate-600">
                Learn system design by fixing real bottlenecks — one living system, 15 levels.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Returning player: one clear next action
  // =========================================================================
  const streak = getCurrentStreak(stats, new Date());

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <header className="border-b border-[var(--line)] px-4 sm:px-8 h-14 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight text-white">
          System Design <span className="text-slate-400 font-normal">Quest</span>
        </span>
        <nav className="flex items-center gap-1 text-[13px]">
          <Link href="/campaign" className="btn btn-ghost">
            Levels
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            Progress
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        {inFixMode ? (
          <div className="w-full max-w-5xl animate-fadeIn">
            <PushpaMissionWarRoom onClose={() => setInFixMode(false)} />
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-8 animate-fadeIn">
            <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
              <span className="num">Lv {stats.level}</span>
              <span className="w-px h-3 bg-white/10" aria-hidden />
              <span className="num">{stats.currentXp} XP</span>
              <span className="w-px h-3 bg-white/10" aria-hidden />
              <span className={`flex items-center gap-1 ${streak > 0 ? "text-amber-300" : ""}`}>
                <Flame className="w-3.5 h-3.5" aria-hidden />
                <span className="num">{streak}-day streak</span>
              </span>
            </div>

            <article className="surface-accent p-7 sm:p-10 space-y-8">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip chip-accent">
                    <span className="dot animate-pulse-glow" aria-hidden /> Up next
                  </span>
                  <span className="chip">{action.badge}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl display">{action.title}</h1>
                <p className="text-[15px] text-slate-400 leading-relaxed">{action.description}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href={action.href} className="btn btn-primary btn-lg">
                  <Play className="w-4 h-4" />
                  {action.ctaLabel}
                </Link>
                <span className="num text-sm text-amber-200/80 sm:ml-1">+{action.xpReward} XP</span>
                <button onClick={handleStartFix} className="btn btn-ghost sm:ml-auto text-xs">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay tutorial incident
                </button>
              </div>
            </article>
          </div>
        )}
      </main>
    </div>
  );
}
