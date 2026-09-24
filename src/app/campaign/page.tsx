"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Server,
  Database,
  Globe,
  Crown,
  Play,
  Flame,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getAllCampaignChapters } from "@/data/campaign";
import { getUserStats } from "@/lib/storage";
import { UserStats, CampaignChapter } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  Server,
  Scale: Layers,
  Database,
  Zap,
  Globe,
  Crown,
};

export default function CampaignPage() {
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
  const completedCount = completedChapters.length;
  const progressPercent = Math.min(100, Math.round((completedCount / chapters.length) * 100));

  // Determine active next chapter
  const currentChapter = chapters.find((ch) => !completedChapters.includes(ch.id)) || chapters[chapters.length - 1];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Campaign Banner */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 via-emerald-500/5 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Campaign Mode</span>
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  {stats.streakDays} Day Streak
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Distributed Systems Campaign
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Progress through 6 consecutive engineering chapters. Build, break, and scale an infrastructure stack from a fragile single server to 1,000,000 users.
              </p>

              {/* Next Mission CTA Box */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href={`/campaign/${currentChapter.id}`}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Continue Mission: Chapter {currentChapter.chapterNumber} — {currentChapter.title}</span>
                </Link>

                <Link
                  href="/mission"
                  className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5"
                >
                  <span>🚨 Replay Twitter Crisis</span>
                </Link>
              </div>
            </div>

            {/* Campaign Progress Gauge */}
            <div className="md:col-span-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider">Campaign Mastery</span>
                <span className="font-mono font-bold text-cyan-400">{completedCount} of {chapters.length} Chapters</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/60">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {progressPercent}% Completed
                </span>
                <span className="font-bold text-amber-400">
                  {stats.currentXp} XP Total
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Chapters List / Node Map */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Campaign Chapters Roadmap
              </h2>
              <p className="text-xs text-slate-400">
                Each chapter introduces realistic production constraints and a hands-on architectural decision
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((ch, idx) => {
              const Icon = iconMap[ch.iconName] || Layers;
              const isCompleted = completedChapters.includes(ch.id);
              // Chapter is unlocked if it's chapter 1, or previous is completed, or level requirement met
              const isPrevCompleted = idx === 0 || completedChapters.includes(chapters[idx - 1].id);
              const isLocked = !isPrevCompleted && stats.level < ch.unlockLevel;
              const isCurrent = !isCompleted && !isLocked;

              return (
                <div
                  key={ch.id}
                  className={`p-6 rounded-2xl border backdrop-blur-md flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                    isCompleted
                      ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5"
                      : isCurrent
                      ? "glass-card border-cyan-400 shadow-2xl shadow-cyan-500/10 ring-2 ring-cyan-500/30"
                      : "bg-slate-900/40 border-slate-800/80 opacity-60"
                  }`}
                >
                  <div>
                    {/* Top status line */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : isCurrent
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          Chapter {ch.chapterNumber}
                        </span>
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <Zap className="w-3 h-3 fill-amber-400" /> +{ch.xpReward} XP
                        </span>
                      </div>

                      {isCompleted ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Cleared</span>
                        </div>
                      ) : isLocked ? (
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lvl {ch.unlockLevel}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-cyan-400 animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          Current Mission
                        </span>
                      )}
                    </div>

                    {/* Chapter Icon */}
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-md">
                      <Icon
                        className={`w-6 h-6 ${
                          isCompleted
                            ? "text-emerald-400"
                            : isCurrent
                            ? "text-cyan-400"
                            : "text-slate-500"
                        }`}
                      />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{ch.title}</h3>
                    <p className="text-xs font-semibold text-cyan-400/90 mb-2">{ch.tagline}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{ch.description}</p>
                  </div>

                  {/* Bottom Action */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">~{ch.estimatedMinutes} mins</span>

                    {isLocked ? (
                      <span className="text-xs text-slate-500 font-bold px-3 py-1.5 rounded-lg bg-slate-800/50">
                        Locked
                      </span>
                    ) : (
                      <Link
                        href={`/campaign/${ch.id}`}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isCompleted
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                        }`}
                      >
                        <span>{isCompleted ? "Replay Simulation" : "Start Chapter"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
