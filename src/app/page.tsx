"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Zap,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  VolumeX,
  Layers,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Play,
  Award,
} from "lucide-react";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";
import { getAllCampaignChapters } from "@/data/campaign";
import { playAlarmSound, playBlipSound } from "@/lib/sound";
import { getUserStats } from "@/lib/storage";
import { UserStats } from "@/types";

const INITIAL_FALLBACK_STATS: UserStats = {
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
};

export default function RootPage() {
  const [stats, setStats] = useState<UserStats>(INITIAL_FALLBACK_STATS);
  const [inFixMode, setInFixMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const initialStats = getUserStats();
    setStats(initialStats);
    setSoundEnabled(initialStats.soundEnabled);

    const handleUpdate = () => {
      const updated = getUserStats();
      setStats(updated);
      setSoundEnabled(updated.soundEnabled);
    };

    window.addEventListener("sd_quest_stats_updated", handleUpdate);
    return () => window.removeEventListener("sd_quest_stats_updated", handleUpdate);
  }, []);

  const chapters = getAllCampaignChapters();
  const completedMissions = stats.completedMissions || [];
  const completedChapters = stats.completedChapters || [];

  // Completed both onboarding incidents
  const hasSavedTwitter =
    completedMissions.includes("mission-1") && completedMissions.includes("mission-2");

  // Determine next unfinished chapter
  const nextChapter =
    chapters.find((c) => !completedChapters.includes(c.id)) || chapters[chapters.length - 1];

  const handleStartFix = () => {
    try {
      if (soundEnabled) playAlarmSound();
    } catch {
      // Audio fallback
    }
    setInFixMode(true);
  };

  // =========================================================================
  // CASE 1: FIRST SCREEN (NEW USER / INCIDENT UNRESOLVED)
  // NO Dashboard • NO Navigation • NO Login • NO Signup
  // Golden Rule: Action Before Authentication
  // =========================================================================
  if (!hasSavedTwitter) {
    return (
      <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-rose-500 selection:text-white">
        {/* Ambient Crisis Lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[450px] bg-gradient-to-tr from-rose-600/20 via-amber-500/10 to-transparent blur-[140px] pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none -z-10" />

        <div className="w-full max-w-4xl mx-auto space-y-6">
          {inFixMode ? (
            /* Interactive Fix War Room (In-Place Solution) */
            <div className="animate-fadeIn w-full">
              <PushpaMissionWarRoom onClose={() => setInFixMode(false)} />
            </div>
          ) : (
            /* Pristine First Screen Briefing Card */
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#111728] via-[#0d1320] to-[#080c14] border-2 border-rose-500/50 shadow-2xl shadow-rose-950/60 text-center space-y-8 relative overflow-hidden animate-fadeIn">
              {/* Emergency Status Beacon */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-black tracking-widest uppercase animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>🚨 LIVE P0 PRODUCTION OUTAGE</span>
              </div>

              {/* Incident Header */}
              <div className="space-y-3 max-w-2xl mx-auto">
                <span className="text-xs sm:text-sm font-black tracking-widest text-slate-400 uppercase font-mono block">
                  INCIDENT #1
                </span>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.05]">
                  Twitter Feed Is Down
                </h1>
                <p className="text-base sm:text-lg font-bold text-slate-300">
                  A massive traffic wave just breached capacity limits. The monolithic server is overheating and users cannot refresh feeds.
                </p>
              </div>

              {/* Incident Telemetry Metrics Grid (Strictly as specified in NO_THINKING_UX_PRINCIPLES.md) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-3xl mx-auto text-left">
                {/* Traffic Metric */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Traffic
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-cyan-400 my-1">
                    100,000
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Requests Per Second</span>
                </div>

                {/* Database CPU Metric */}
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    Database CPU
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-rose-400 my-1 flex items-center gap-1">
                    <Flame className="w-5 h-5 fill-rose-500 shrink-0" />
                    <span>98%</span>
                  </div>
                  <span className="text-[10px] text-rose-300/80 font-mono">Connections Maxed</span>
                </div>

                {/* Impact Metric */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    User Impact
                  </span>
                  <div className="text-base sm:text-lg font-black text-rose-400 my-1 leading-snug">
                    Can&apos;t Load Feed
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">HTTP 504 Gateway</span>
                </div>

                {/* Reward Metric */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Reward
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 my-1 flex items-center gap-1">
                    <Zap className="w-5 h-5 fill-amber-400" />
                    <span>+50 XP</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">Unlocks Level 2</span>
                </div>
              </div>

              {/* Single Unambiguous Action CTA */}
              <div className="pt-2 flex flex-col items-center justify-center gap-4">
                <button
                  onClick={handleStartFix}
                  className="px-10 py-5 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 hover:from-rose-400 hover:to-emerald-300 text-slate-950 font-black text-xl sm:text-2xl flex items-center gap-3 shadow-2xl shadow-rose-500/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider group"
                >
                  <span>🚨 FIX INCIDENT NOW</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </button>

                {/* Zero Friction Guarantees */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    No Login Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    No Signup Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Play First, Authenticate Later
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASE 2: RETURNING USER / SAVED TRIAL
  // Philosophy: "Users should never think: What should I do now?"
  // Directive: "This is your next mission."
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Minimal Top Command Bar */}
      <header className="border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-slate-200 uppercase">
              System Design Quest
            </div>
            <div className="text-[10px] text-cyan-400 font-mono">
              Level {stats.level} • {stats.currentXp} XP Total
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <Link
            href="/campaign"
            className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Campaign Map</span>
          </Link>

          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-cyan-400 transition-colors hidden sm:block"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Single-Action Directive Arena */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 max-w-4xl mx-auto w-full space-y-8">
        {inFixMode ? (
          <div className="w-full animate-fadeIn">
            <PushpaMissionWarRoom onClose={() => setInFixMode(false)} />
          </div>
        ) : (
          <div className="w-full space-y-8 animate-fadeIn">
            {/* Mission Directive Banner */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active Objective • No Decision Fatigue</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                This Is Your Next Mission
              </h1>

              <p className="text-base text-slate-300 max-w-xl mx-auto">
                No browsing through menus. Follow the scaling storyline from single monolith to 1,000,000 active users.
              </p>
            </div>

            {/* Next Mission Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#111827] to-[#0a0f1d] border-2 border-cyan-500/40 shadow-2xl shadow-cyan-950/40 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-black border border-cyan-500/40">
                  Chapter {nextChapter.chapterNumber} Target
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-400/10 px-3 py-1 rounded-lg border border-amber-400/30">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" />
                  <span>+{nextChapter.xpReward} XP Bounty</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-4xl font-black text-white">
                  {nextChapter.title}
                </h2>
                <p className="text-sm sm:text-base font-bold text-cyan-400">
                  {nextChapter.tagline}
                </p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                  {nextChapter.description}
                </p>
              </div>

              {/* The Single Unambiguous CTA */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href={`/campaign/${nextChapter.id}`}
                  className="w-full sm:w-auto flex-1 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-102"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>▶ CONTINUE MISSION (CHAPTER {nextChapter.chapterNumber})</span>
                </Link>

                <button
                  onClick={handleStartFix}
                  className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700/80 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Replay Incident #1 War Room</span>
                </button>
              </div>
            </div>

            {/* Core Law Quote */}
            <div className="text-center pt-2">
              <p className="text-xs font-mono text-slate-500">
                &ldquo;Users should never think: What should I do now? The application should always tell the user: This is your next mission.&rdquo;
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
