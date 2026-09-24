"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Zap,
  Flame,
  CheckCircle2,
  Lock,
  ArrowRight,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  Crown,
  Server,
  Database,
  Globe,
  Compass,
  GitMerge,
  Award,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getAllCampaignChapters } from "@/data/campaign";
import { BADGES } from "@/lib/lessons";
import { getUserStats, getFeatureUnlockStatus } from "@/lib/storage";
import { UserStats } from "@/types";

export default function DashboardPage() {
  const chapters = getAllCampaignChapters();
  const [stats, setStats] = useState<UserStats>({
    level: 1,
    currentXp: 0,
    nextLevelXp: 150,
    streakDays: 1,
    completedLessons: [],
    completedChallenges: [],
    completedGuided: [],
    completedInterviews: [],
    completedMissions: [],
    completedChapters: [],
    systemsSaved: 0,
    incidentsSolved: 0,
    isLoggedIn: false,
    userEmail: null,
    userName: null,
    totalScore: 0,
    soundEnabled: true,
    unlockedBadges: [],
  });

  useEffect(() => {
    setStats(getUserStats());
    const handleUpdate = () => setStats(getUserStats());
    window.addEventListener("sd_quest_stats_updated", handleUpdate);
    return () => window.removeEventListener("sd_quest_stats_updated", handleUpdate);
  }, []);

  const completedChapters = stats.completedChapters || [];
  const completedMissions = stats.completedMissions || [];
  const completedChapterCount = completedChapters.length;
  const progressPercent = Math.min(100, Math.round((completedChapterCount / chapters.length) * 100));

  // Determine Next Mission (The Golden Rule)
  // If user hasn't saved Twitter in Pushpa Mode: First Mission is Save Twitter!
  // Otherwise next unfinished Chapter!
  const hasSavedTwitter = completedMissions.includes("mission-1") && completedMissions.includes("mission-2");

  const nextChapter = chapters.find((c) => !completedChapters.includes(c.id)) || chapters[chapters.length - 1];

  const currentMission = !hasSavedTwitter
    ? {
        type: "incident",
        title: "Incident 001: Twitter Feed Is Down",
        tagline: "Stabilize 100,000 req/sec Spike in Pushpa Mode",
        description: "Twitter feeds are failing worldwide. Server 1 CPU is redlining at 96% and database is exhausted. Deploy load balancing and in-memory caching to save the platform.",
        xpReward: 150,
        href: "/mission",
        ctaLabel: "▶ Continue Mission: Save Twitter",
        badge: "🚨 High Severity Crisis",
      }
    : {
        type: "chapter",
        title: `Chapter ${nextChapter.chapterNumber}: ${nextChapter.title}`,
        tagline: nextChapter.tagline,
        description: nextChapter.description,
        xpReward: nextChapter.xpReward,
        href: `/campaign/${nextChapter.id}`,
        ctaLabel: `▶ Continue Mission: Chapter ${nextChapter.chapterNumber}`,
        badge: `Chapter ${nextChapter.chapterNumber} Target`,
      };

  const getRankTitle = (lvl: number) => {
    if (lvl <= 1) return "Novice Architect";
    if (lvl === 2) return "Cloud Apprentice";
    if (lvl === 3) return "Distributed Systems Engineer";
    return "Principal Infrastructure Lead";
  };

  const unlockStatus = getFeatureUnlockStatus(stats);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ================= HERO: CURRENT MISSION (GOLDEN RULE) ================= */}
        {/* "Users should never ask: 'What should I do?' The app should always answer: 'This is your next mission.'" */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#0d1424] via-[#09101d] to-[#070b13] border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/15 via-emerald-500/5 to-transparent pointer-events-none" />

          {/* Mission Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Next Mission Assigned</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                {currentMission.badge}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                +{currentMission.xpReward} XP Bounty
              </span>
            </div>
          </div>

          {/* Mission Details */}
          <div className="max-w-3xl space-y-3 relative z-10">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {currentMission.title}
            </h1>
            <p className="text-base sm:text-lg font-bold text-cyan-400">
              {currentMission.tagline}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {currentMission.description}
            </p>
          </div>

          {/* Primary CTA Button (Golden Rule) */}
          <div className="pt-2 relative z-10 flex flex-wrap items-center gap-4">
            <Link
              href={currentMission.href}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-base sm:text-lg flex items-center gap-3 shadow-xl shadow-cyan-500/30 transition-all transform hover:scale-105 uppercase tracking-wide cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>{currentMission.ctaLabel}</span>
            </Link>

            <Link
              href="/campaign"
              className="px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-sm border border-slate-800 transition-colors"
            >
              Browse All Chapters
            </Link>
          </div>
        </section>

        {/* ================= TELEMETRY & PLAYER STATUS ================= */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Rank & Level</span>
            <div className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Lvl {stats.level}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {getRankTitle(stats.level)}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round(((stats.currentXp % 150) / 150) * 100))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block pt-0.5">
              {stats.nextLevelXp - stats.currentXp} XP to Level {stats.level + 1}
            </span>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Experience (XP)</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-center gap-1.5">
              <Zap className="w-5 h-5 fill-amber-400" />
              <span>{stats.currentXp}</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold">Total Accumulated</span>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Systems Saved</span>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5" />
              <span>{stats.systemsSaved || 0}</span>
            </div>
            <span className="text-[11px] text-slate-400">{stats.incidentsSolved || 0} Incidents Mitigated</span>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Daily Streak</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1.5">
              <Flame className="w-5 h-5 fill-amber-500 animate-bounce" />
              <span>{stats.streakDays} Day</span>
            </div>
            <span className="text-[11px] text-slate-400">Keep momentum alive</span>
          </div>
        </section>

        {/* ================= CHAPTER PROGRESSION TRACK ================= */}
        <section className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-black text-white tracking-tight">
                  Campaign Chapter Progress
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Completed {completedChapterCount} of {chapters.length} core distributed scaling chapters ({progressPercent}%)
              </p>
            </div>

            <Link
              href="/campaign"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>View Full Campaign View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 6 Step Progress Roadmap */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {chapters.map((ch, idx) => {
              const isCompleted = completedChapters.includes(ch.id);
              const isCurrent = !isCompleted && (idx === 0 || completedChapters.includes(chapters[idx - 1].id));
              const isLocked = !isCompleted && !isCurrent && stats.level < ch.unlockLevel;

              return (
                <Link
                  key={ch.id}
                  href={`/campaign/${ch.id}`}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 text-left relative overflow-hidden ${
                    isCompleted
                      ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400"
                      : isCurrent
                      ? "bg-cyan-950/30 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10"
                      : "bg-slate-900/40 border-slate-800 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Ch {ch.chapterNumber}
                      </span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1">{ch.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ch.concept}</div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-amber-400 font-semibold">+{ch.xpReward} XP</span>
                    <span className="font-bold text-cyan-400">
                      {isCompleted ? "Cleared" : isCurrent ? "Active" : "Locked"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ================= UNLOCKED ENGINEERING LABS (PROGRESSIVE DISCLOSURE) ================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Advanced Engineering Labs
              </h2>
              <p className="text-xs text-slate-400">
                Unlocked as you level up and clear campaign milestones
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Architecture Sandbox */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                unlockStatus.builder.unlocked
                  ? "glass-card border-cyan-500/30 hover:border-cyan-400 group"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black uppercase">
                    Interactive Canvas
                  </span>
                  {unlockStatus.builder.unlocked ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Level 2
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                  Architecture Sandbox
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Drag & drop servers, load balancers, and caches on a freeform canvas. Run chaos traffic stress tests.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80">
                {unlockStatus.builder.unlocked ? (
                  <Link
                    href="/builder"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Launch Sandbox</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">Unlocks at Level 2 (Clear Chapter 1)</span>
                )}
              </div>
            </div>

            {/* Technical Interview Arena */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                unlockStatus.interview.unlocked
                  ? "glass-card border-amber-500/30 hover:border-amber-400 group"
                  : "bg-slate-900/40 border-slate-800 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black uppercase">
                    10-Min Timer
                  </span>
                  {unlockStatus.interview.unlocked ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      UNLOCKED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Level 2
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                  Interview Arena
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Design TinyURL under interview conditions. Receive automated grading for Single Points of Failure.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80">
                {unlockStatus.interview.unlocked ? (
                  <Link
                    href="/interview"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform"
                  >
                    <span>Enter Arena</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">Unlocks at Level 2</span>
                )}
              </div>
            </div>

            {/* Guided Thinking Mode */}
            <Link
              href="/guided"
              className="p-5 rounded-2xl glass-card border border-purple-500/30 hover:border-purple-400 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-black uppercase">
                    4-Step Framework
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    UNLOCKED
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
                  Guided Thinking Wizard
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Step-by-step thinking: Requirements → Core Entities → REST APIs → High-Level Architecture.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-purple-400">
                <span>Start Framework</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Architecture Evolution Mode */}
            <Link
              href="/evolution"
              className="p-5 rounded-2xl glass-card border border-emerald-500/30 hover:border-emerald-400 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black uppercase">
                    5-Stage Timeline
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    UNLOCKED
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Architecture Evolution
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Interactive timeline demonstrating how architecture naturally morphs as user base explodes.
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Watch Growth</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>

        {/* ================= ACHIEVEMENTS BADGES ================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-tight">
              Engineering Badges & Achievements
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {BADGES.map((badge) => {
              const isUnlocked = stats.unlockedBadges.includes(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    isUnlocked
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-slate-900/40 border-slate-800 text-slate-500 opacity-50"
                  }`}
                >
                  <div className="w-9 h-9 mx-auto rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
                    <Trophy
                      className={`w-4 h-4 ${
                        isUnlocked ? "text-amber-400 animate-pulse" : "text-slate-600"
                      }`}
                    />
                  </div>
                  <div className="text-xs font-bold text-white mb-0.5 line-clamp-1">{badge.title}</div>
                  <div className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                    {badge.description}
                  </div>
                  {isUnlocked && (
                    <span className="inline-block mt-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Unlocked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
