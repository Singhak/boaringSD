"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Flame,
  Grid3X3,
  Layers,
  ListOrdered,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PatternMap from "@/components/PatternMap";
import { getAllRunProgress } from "@/lib/storage";
import { getCurrentStreak, isPatternCleared, isPatternUnlocked, selectNextAction } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";
import { getAllPatterns } from "@/data/patterns";

const TIERS = [
  {
    id: 1,
    name: "Foundation",
    range: "01–05",
    tagline: "Core Scale & Edge",
    subtitle: "Compute, traffic distribution, read replicas, caching & CDN delivery.",
    start: 0,
    end: 5,
    accentBorder: "border-cyan-500/30",
    badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  },
  {
    id: 2,
    name: "Resilience",
    range: "06–10",
    tagline: "Isolation & Protection",
    subtitle: "Async queues, sharding, consistency, rate limiting & circuit breakers.",
    start: 5,
    end: 10,
    accentBorder: "border-amber-500/30",
    badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  },
  {
    id: 3,
    name: "Mastery",
    range: "11–15",
    tagline: "Global Fault Tolerance",
    subtitle: "Pools, backpressure, idempotency, multi-region DR & health eviction.",
    start: 10,
    end: 15,
    accentBorder: "border-emerald-500/30",
    badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  },
];

export default function CampaignPage() {
  const stats = useUserStats();
  const action = stats ? selectNextAction(stats, new Date(), getAllRunProgress()) : null;
  const patterns = getAllPatterns();

  const clearedCount = useMemo(() => {
    if (!stats) return 0;
    return patterns.filter((p) => isPatternCleared(stats, p)).length;
  }, [stats, patterns]);

  // Determine which tier contains the next active pattern
  const activeIndex = useMemo(() => {
    if (!action?.patternId) return 0;
    const idx = patterns.findIndex((p) => p.id === action.patternId);
    return idx >= 0 ? idx : 0;
  }, [action, patterns]);

  const [activeTier, setActiveTier] = useState(() => Math.floor(activeIndex / 5));
  const [viewMode, setViewMode] = useState<"tiers" | "matrix">("tiers");
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>(() => patterns[activeIndex]?.id || patterns[0]?.id);

  useEffect(() => {
    const tierIdx = Math.floor(activeIndex / 5);
    setActiveTier(tierIdx);
    if (patterns[activeIndex]) {
      setSelectedMatrixId(patterns[activeIndex].id);
    }
  }, [activeIndex, patterns]);

  const currentTier = TIERS[activeTier] || TIERS[0];
  const tierPatterns = patterns.slice(currentTier.start, currentTier.end);
  const percentComplete = Math.round((clearedCount / patterns.length) * 100);
  const streak = stats ? getCurrentStreak(stats, new Date()) : 0;

  const inspectedPattern = useMemo(() => {
    return patterns.find((p) => p.id === selectedMatrixId) || patterns[0];
  }, [selectedMatrixId, patterns]);

  const inspectedCleared = stats ? isPatternCleared(stats, inspectedPattern) : false;
  const inspectedUnlocked = stats ? isPatternUnlocked(stats, inspectedPattern) : false;
  const isInspectedCurrent = inspectedPattern?.id === action?.patternId;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* ================= HERO SECTION ================= */}
        <section className="relative rounded-3xl p-6 sm:p-10 border border-[var(--line)] bg-gradient-to-b from-slate-900/60 via-slate-950/70 to-black/80 overflow-hidden shadow-2xl shadow-black/40">
          {/* Ambient Lighting Backdrop */}
          <div
            aria-hidden
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/[0.08] blur-[120px] pointer-events-none -z-10"
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/[0.06] blur-[120px] pointer-events-none -z-10"
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 items-center">
            {/* Left Column: Heading, Primary CTA & Metrics Deck */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-[11px] font-mono font-medium tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  LEVEL MAP · 15 ARCHITECTURAL TIERS
                </div>

                <h1 className="text-4xl sm:text-5xl display leading-[1.1]">
                  One system,{" "}
                  <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                    {patterns.length} levels
                  </span>
                  .
                </h1>

                <p className="text-[15px] text-slate-400 max-w-xl leading-relaxed">
                  You grow one architecture from a single overloaded server to a resilient, globally distributed system.
                  Each level introduces a real constraint, and your previous patterns must hold under load.
                </p>
              </div>

              {/* Action Buttons */}
              {action ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={action.href} className="btn btn-primary btn-lg shadow-lg shadow-cyan-500/20 group">
                      <Play className="w-4 h-4 transition-transform group-hover:scale-110" />
                      {action.ctaLabel}
                      <ArrowRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link href="/mission" className="btn btn-secondary btn-lg">
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Replay tutorial
                    </Link>
                    <span className="chip chip-warn py-2 px-3">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="num font-semibold text-amber-200">{streak}-day streak</span>
                    </span>
                  </div>

                  {/* 4 Metric Quick-Stats Deck */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        Stabilized
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="num text-xl font-bold text-white">{clearedCount}</span>
                        <span className="text-xs text-slate-500">/ {patterns.length}</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                          style={{ width: `${percentComplete}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        Current Tier
                      </span>
                      <span className="text-sm font-semibold text-cyan-300 block truncate">
                        {currentTier.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Tier {activeTier + 1} of 3
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        Architect Rank
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="num text-xl font-bold text-amber-300">
                          Lv {stats?.level ?? 1}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {stats?.currentXp ?? 0} XP
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                        Reliability
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="num text-xl font-bold text-emerald-400">
                          {percentComplete}%
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-400/70 font-mono">
                        System health
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm text-slate-500">Loading your profile…</span>
                </div>
              )}
            </div>

            {/* Right Column: Interactive Architecture Roadmap HUD */}
            <div className="surface p-5 sm:p-6 rounded-2xl border border-[var(--line-strong)] space-y-4 shadow-xl shadow-black/30 backdrop-blur-sm">
              {/* Card Header & View Switcher */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase font-mono">
                      System Evolution Matrix
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {viewMode === "tiers" ? "Grouped into 3 architectural phases" : "Full 15-node topology flow"}
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center p-0.5 bg-[var(--surface-2)] rounded-lg border border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setViewMode("tiers")}
                    title="Tier list view"
                    className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                      viewMode === "tiers"
                        ? "bg-cyan-400/20 text-cyan-300 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("matrix")}
                    title="15-Node Circuit Matrix"
                    className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                      viewMode === "matrix"
                        ? "bg-cyan-400/20 text-cyan-300 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Milestone Markers */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Overall Progression</span>
                  <span className="text-cyan-300 font-mono font-medium">
                    {clearedCount}/{patterns.length} ({percentComplete}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>

              {/* View 1: Tabbed Tier View */}
              {viewMode === "tiers" && (
                <div className="space-y-3">
                  {/* Tier Switcher Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--line)]">
                    {TIERS.map((t, idx) => {
                      const isSelected = activeTier === idx;
                      const tierSlice = patterns.slice(t.start, t.end);
                      const tierCleared = stats ? tierSlice.filter((p) => isPatternCleared(stats, p)).length : 0;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTier(idx)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                            isSelected
                              ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(56,214,232,0.15)] font-semibold"
                              : "text-slate-400 hover:text-slate-200 border border-transparent"
                          }`}
                        >
                          <span className="block truncate">{t.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {tierCleared}/{tierSlice.length} · {t.range}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Levels in Current Tier */}
                  <ol className="space-y-1" aria-label={`Levels in ${currentTier.name}`}>
                    {tierPatterns.map((p) => {
                      const cleared = stats ? isPatternCleared(stats, p) : false;
                      const unlocked = stats ? isPatternUnlocked(stats, p) : false;
                      const isCurrent = p.id === action?.patternId;

                      const rowContent = (
                        <>
                          <span className="num text-[11px] text-slate-500 w-5 font-mono">
                            {String(p.levelNumber).padStart(2, "0")}
                          </span>

                          {/* Status Icon */}
                          <span className="w-4 h-4 flex items-center justify-center shrink-0">
                            {cleared ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : isCurrent ? (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(56,214,232,0.8)]" />
                            ) : unlocked ? (
                              <Play className="w-3 h-3 text-cyan-300/70" />
                            ) : (
                              <Lock className="w-3 h-3 text-slate-600" />
                            )}
                          </span>

                          <span
                            className={`text-[13px] truncate ${
                              isCurrent
                                ? "text-white font-medium"
                                : unlocked
                                ? "text-slate-300 group-hover:text-white"
                                : "text-slate-500"
                            }`}
                          >
                            {p.levelGoal}
                          </span>

                          <span
                            className={`text-[11px] ml-auto shrink-0 transition-colors ${
                              isCurrent
                                ? "text-cyan-300 font-medium"
                                : unlocked
                                ? "text-slate-500 group-hover:text-cyan-300/80"
                                : "text-slate-600"
                            }`}
                          >
                            {p.title}
                          </span>

                          {unlocked && (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-300 transition-colors" />
                          )}
                        </>
                      );

                      return (
                        <li key={p.id}>
                          {unlocked ? (
                            <Link
                              href={`/campaign/${p.chapterId}`}
                              className={`group flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all ${
                                isCurrent
                                  ? "bg-cyan-400/[0.08] border border-cyan-400/25 shadow-sm"
                                  : "hover:bg-white/[0.04] border border-transparent"
                              }`}
                            >
                              {rowContent}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg opacity-60">
                              {rowContent}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* View 2: Interactive 15-Node Circuit Matrix */}
              {viewMode === "matrix" && (
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    {TIERS.map((tier) => {
                      const tierSlice = patterns.slice(tier.start, tier.end);
                      return (
                        <div key={tier.id} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                            <span>Stage {tier.id}: {tier.name}</span>
                            <span>{tier.range}</span>
                          </div>

                          <div className="grid grid-cols-5 gap-1.5">
                            {tierSlice.map((p) => {
                              const cleared = stats ? isPatternCleared(stats, p) : false;
                              const unlocked = stats ? isPatternUnlocked(stats, p) : false;
                              const isCurrent = p.id === action?.patternId;
                              const isSelected = p.id === selectedMatrixId;

                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setSelectedMatrixId(p.id)}
                                  className={`relative py-2 px-1 rounded-lg text-center font-mono text-xs transition-all cursor-pointer border ${
                                    isSelected
                                      ? "ring-2 ring-cyan-400/60 border-cyan-400 bg-cyan-400/20 text-cyan-200 font-bold scale-[1.03]"
                                      : cleared
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                      : isCurrent
                                      ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 animate-pulse"
                                      : unlocked
                                      ? "bg-[var(--surface-2)] border-[var(--line)] text-slate-300 hover:border-slate-500"
                                      : "bg-black/20 border-dashed border-[var(--line)] text-slate-600 opacity-60"
                                  }`}
                                  title={`${p.title} - ${p.levelGoal}`}
                                >
                                  <span>{String(p.levelNumber).padStart(2, "0")}</span>
                                  {cleared && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  )}
                                  {isCurrent && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Node Inspector Preview */}
                  {inspectedPattern && (
                    <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/25 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-400/20 text-cyan-300 font-semibold">
                            LV {String(inspectedPattern.levelNumber).padStart(2, "0")}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {inspectedPattern.title}
                          </span>
                        </div>
                        {inspectedCleared ? (
                          <span className="chip chip-ok !text-[10px] !py-0">Stabilized</span>
                        ) : isInspectedCurrent ? (
                          <span className="chip chip-accent !text-[10px] !py-0">Next Up</span>
                        ) : inspectedUnlocked ? (
                          <span className="chip !text-[10px] !py-0">Unlocked</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300">
                        {inspectedPattern.levelGoal}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                        <span className="text-[11px] text-slate-500">
                          {inspectedPattern.difficulty} · ~{inspectedPattern.estimatedMinutes}m
                        </span>
                        {inspectedUnlocked ? (
                          <Link
                            href={`/campaign/${inspectedPattern.chapterId}`}
                            className="text-xs text-cyan-300 hover:text-cyan-200 font-medium inline-flex items-center gap-1"
                          >
                            Launch Level <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-500">Complete prerequisites to unlock</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Quick-Jump to Full Carousel */}
              <div className="pt-2 border-t border-[var(--line)] text-center">
                <a
                  href="#levels-carousel"
                  className="text-[11px] text-cyan-400/80 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                >
                  Explore 2×3 level carousel cards below <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ================= LEVEL CAROUSEL ================= */}
        <section id="levels-carousel" className="space-y-4 pt-4 border-t border-[var(--line)]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                Interactive Grid View
              </div>
              <h2 className="text-2xl display">All 15 Architectural Levels</h2>
              <p className="text-[13px] text-slate-400 max-w-xl">
                Browse every pattern, view architectural constraints, examine review weaknesses, or test your topology against builder bosses.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              6 levels / view · 3 carousel pages
            </div>
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
