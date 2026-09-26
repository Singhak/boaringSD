"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Flame, Lock, Play, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import PatternMap from "@/components/PatternMap";
import SkillRadarChart from "@/components/dashboard/SkillRadarChart";
import { BADGES } from "@/lib/lessons";
import { getAllRunProgress } from "@/lib/storage";
import { getPracticeLabs } from "@/lib/labs";
import { getAllPatterns } from "@/data/patterns";
import { NextActionKind, calculateSkillRadar, getDailyObjective, getEvidence, getMasteryState } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";

const KIND_LABELS: Record<NextActionKind, string> = {
  onboarding: "Start here",
  resume: "Resume",
  review: "Review due",
  "builder-boss": "Builder boss",
  "pattern-run": "Next level",
  practice: "Practice",
};

const getRankTitle = (lvl: number) => {
  if (lvl <= 1) return "Novice Architect";
  if (lvl === 2) return "Cloud Apprentice";
  if (lvl === 3) return "Distributed Systems Engineer";
  return "Principal Infrastructure Lead";
};

export default function DashboardPage() {
  const stats = useUserStats();

  if (!stats) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col">
        <Navbar />
        <p role="status" className="text-sm text-slate-500 py-24 text-center">
          Loading your progress…
        </p>
      </div>
    );
  }

  const now = new Date();
  const daily = getDailyObjective(stats, now, getAllRunProgress());
  const action = daily.action;
  const patterns = getAllPatterns();
  const states = patterns.map((p) => getMasteryState(getEvidence(stats, p.id), now));
  const reliableCount = states.filter((s) => s === "reliable").length;
  const clearedCount = patterns.filter((p) => getEvidence(stats, p.id).runsCleared > 0).length;
  const reviewsDue = states.filter((s) => s === "needs_review").length;
  const xpIntoLevel = stats.currentXp % 150;
  const radar = calculateSkillRadar(stats);

  const labs = getPracticeLabs(stats);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {/* ================= NEXT ACTION + TODAY ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
          <div className="surface-accent p-6 sm:p-8 flex flex-col justify-between gap-8 animate-fadeIn">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-accent">
                  <span className="dot animate-pulse-glow" aria-hidden />
                  {KIND_LABELS[action.kind]}
                </span>
                <span className="chip">{action.badge}</span>
              </div>
              <div className="space-y-2 max-w-2xl">
                <h1 className="text-3xl sm:text-[2.6rem] display">{action.title}</h1>
                <p className="text-[15px] text-slate-400 leading-relaxed">{action.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={action.href} className="btn btn-primary btn-lg">
                <Play className="w-4 h-4" />
                {action.ctaLabel}
              </Link>
              <span className="num text-sm text-amber-200/80">+{action.xpReward} XP</span>
            </div>
          </div>

          <div className="surface p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow">Today</h2>
              <span className={`chip ${daily.streak > 0 ? "chip-warn" : ""}`}>
                <Flame className="w-3 h-3" aria-hidden />
                <span className="num">{daily.streak}-day streak</span>
              </span>
            </div>

            <div className="flex items-start gap-3">
              <span
                className={`w-9 h-9 rounded-full grid place-items-center shrink-0 border ${
                  daily.completedToday ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-[var(--line-strong)] text-slate-500"
                }`}
              >
                {daily.completedToday ? <Check className="w-4 h-4" /> : <span className="num text-xs">1</span>}
              </span>
              <div>
                <p className="text-[15px] font-medium text-white">
                  {daily.completedToday ? "Practiced today" : "One meaningful run"}
                </p>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  {daily.completedToday
                    ? "Your streak is safe. Extra runs still add evidence."
                    : "Clear a level, pass a builder boss, or finish a due review. Opening pages doesn't count."}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 mt-auto rounded-lg overflow-hidden border border-[var(--line)] divide-x divide-[var(--line)]">
              {[
                { k: "Cleared", v: `${clearedCount}/${patterns.length}`, tone: "text-white" },
                { k: "Reliable", v: reliableCount, tone: reliableCount > 0 ? "text-emerald-300" : "text-white" },
                { k: "Reviews due", v: reviewsDue, tone: reviewsDue > 0 ? "text-amber-300" : "text-white" },
              ].map((s) => (
                <div key={s.k} className="p-3">
                  <dt className="eyebrow !text-[11px]">{s.k}</dt>
                  <dd className={`num text-xl mt-1 ${s.tone}`}>{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================= 6-AXIS SKILL RADAR ================= */}
        <section className="space-y-4">
          <SkillRadarChart radar={radar} />
        </section>

        {/* ================= LEVEL MAP ================= */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl display">Your system, level by level</h2>
              <p className="text-[13px] text-slate-500">
                Bars show evidence: transfer question, builder boss, and a review a day later.
              </p>
            </div>
            <Link href="/campaign" className="btn btn-ghost text-xs">
              Level details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <PatternMap stats={stats} highlightId={action.patternId} />
        </section>

        {/* ================= PLAYER STATUS ================= */}
        <section className="surface grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--line)] overflow-hidden">
          <div className="p-5 space-y-2">
            <span className="eyebrow">Rank</span>
            <div className="num text-2xl text-white">Lv {stats.level}</div>
            <p className="text-xs text-slate-400">{getRankTitle(stats.level)}</p>
          </div>
          <div className="p-5 space-y-2">
            <span className="eyebrow">Experience</span>
            <div className="num text-2xl text-white">
              {stats.currentXp}
              <span className="text-sm text-slate-500 ml-1">XP</span>
            </div>
            <div className="space-y-1">
              <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.round((xpIntoLevel / 150) * 100)}%` }} />
              </div>
              <p className="num text-[11px] text-slate-500">
                {stats.nextLevelXp - stats.currentXp} XP to Lv {stats.level + 1}
              </p>
            </div>
          </div>
          <div className="p-5 space-y-2">
            <span className="eyebrow">Incidents resolved</span>
            <div className="num text-2xl text-white">{stats.incidentsSolved || 0}</div>
            <p className="text-xs text-slate-400">{stats.systemsSaved || 0} systems saved</p>
          </div>
          <div className="p-5 space-y-2">
            <span className="eyebrow">Practice days</span>
            <div className="num text-2xl text-white">{stats.practiceDays?.length ?? 0}</div>
            <p className="text-xs text-slate-400">Short daily runs beat long sessions</p>
          </div>
        </section>

        {/* ================= LABS ================= */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl display">Labs</h2>
            <p className="text-[13px] text-slate-500">Open practice outside the level path.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {labs.map((lab) => {
              const Icon = lab.icon;
              const body = (
                <>
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-lg surface-2 grid place-items-center">
                      <Icon className={`w-4 h-4 ${lab.unlocked ? "text-cyan-300" : "text-slate-600"}`} />
                    </span>
                    {!lab.unlocked && (
                      <span className="chip !text-[11px]">
                        <Lock className="w-3 h-3" /> {lab.unlockHint}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className={`text-[15px] font-semibold ${lab.unlocked ? "text-white" : "text-slate-500"}`}>{lab.name}</h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">{lab.desc}</p>
                  </div>
                  {lab.unlocked && (
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white flex items-center gap-1 mt-auto">
                      Open <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </>
              );
              return lab.unlocked ? (
                <Link key={lab.name} href={lab.href} className="group surface p-5 flex flex-col gap-4 hover:!border-[var(--line-strong)] transition-colors">
                  {body}
                </Link>
              ) : (
                <div key={lab.name} className="p-5 flex flex-col gap-4 rounded-2xl border border-dashed border-[var(--line)]">
                  {body}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= BADGES ================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl display">Badges</h2>
            <span className="num text-xs text-slate-500">
              {stats.unlockedBadges.length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {BADGES.map((badge) => {
              const isUnlocked = stats.unlockedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border text-center space-y-2 ${
                    isUnlocked ? "border-amber-300/25 bg-amber-300/[0.04]" : "border-[var(--line)] opacity-50"
                  }`}
                  title={badge.description}
                >
                  <span
                    className={`w-9 h-9 mx-auto rounded-full grid place-items-center border ${
                      isUnlocked ? "border-amber-300/40 text-amber-300" : "border-[var(--line-strong)] text-slate-600"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                  </span>
                  <div className="text-xs font-medium text-white leading-tight">{badge.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug line-clamp-2">{badge.description}</div>
                  <span className="sr-only">{isUnlocked ? "Unlocked" : "Locked"}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
