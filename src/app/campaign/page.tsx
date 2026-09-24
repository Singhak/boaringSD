"use client";

import React from "react";
import Link from "next/link";
import { Flame, Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import PatternMap from "@/components/PatternMap";
import { getAllRunProgress } from "@/lib/storage";
import { getCurrentStreak, selectNextAction } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";
import { getAllPatterns } from "@/data/patterns";

export default function CampaignPage() {
  const stats = useUserStats();
  const action = stats ? selectNextAction(stats, new Date(), getAllRunProgress()) : null;
  const patterns = getAllPatterns();

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div className="space-y-4">
            <span className="eyebrow text-cyan-300/80">Level map</span>
            <h1 className="text-4xl sm:text-5xl display">One system, six levels.</h1>
            <p className="text-[15px] text-slate-400 max-w-2xl leading-relaxed">
              You grow one architecture from a single overloaded server to a global system. Each level adds one pattern and one new
              constraint, and everything you built before has to keep working.
            </p>
            {action && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={action.href} className="btn btn-primary btn-lg">
                  <Play className="w-4 h-4" />
                  {action.ctaLabel}
                </Link>
                <Link href="/mission" className="btn btn-secondary btn-lg">
                  Replay tutorial incident
                </Link>
                <span className="chip chip-warn">
                  <Flame className="w-3 h-3" /> <span className="num">{getCurrentStreak(stats!, new Date())}-day streak</span>
                </span>
              </div>
            )}
          </div>

          {/* The growth path at a glance */}
          <ol className="surface p-5 space-y-0" aria-label="Level progression">
            {patterns.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-1.5">
                <span className="num text-[11px] text-slate-500 w-5">{String(i + 1).padStart(2, "0")}</span>
                <span className={`dot ${p.id === action?.patternId ? "text-cyan-300 animate-pulse-glow" : "text-slate-600"}`} aria-hidden />
                <span className={`text-[13px] ${p.id === action?.patternId ? "text-white font-medium" : "text-slate-400"}`}>{p.levelGoal}</span>
                <span className="text-[11px] text-slate-600 ml-auto">{p.title}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl display">Levels</h2>
            <p className="text-[13px] text-slate-500">
              Progress is evidence, not a percentage: a run with a transfer question, a builder boss, and a later review.
            </p>
          </div>
          {stats ? (
            <PatternMap stats={stats} detailed highlightId={action?.patternId} />
          ) : (
            <p role="status" className="text-sm text-slate-500 py-10 text-center">
              Loading your progress…
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
