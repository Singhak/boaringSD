"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Layers,
  Flame,
  CheckCircle2,
  Server,
  Database,
  Cpu,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  Play,
  RotateCcw,
  Globe,
  Radio,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";
import { CAMPAIGN_CHAPTERS } from "@/data/campaign";
import { playAlarmSound } from "@/lib/sound";

export default function LandingPage() {
  const [showWarRoom, setShowWarRoom] = useState(false);

  const startPushpaMode = () => {
    setShowWarRoom(true);
    try {
      playAlarmSound();
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      <Navbar />

      <main className="flex-1">
        {/* ================= HERO SECTION (PUSHPA MODE) ================= */}
        <section className="relative pt-8 pb-16 md:pt-16 md:pb-24 overflow-hidden">
          {/* Ambient Lighting Background */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-rose-500/15 via-cyan-500/15 to-emerald-500/10 blur-[140px] pointer-events-none -z-10" />
          <div className="absolute inset-0 bg-cyber-grid opacity-25 pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* If War Room is launched in-hero */}
            {showWarRoom ? (
              <div className="max-w-4xl mx-auto animate-fadeIn">
                <PushpaMissionWarRoom onClose={() => setShowWarRoom(false)} />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Hero Incident Alert Card (Pushpa Mode Hero) */}
                <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#111726] to-[#0a0f1a] border-2 border-rose-500/50 shadow-2xl shadow-rose-950/40 relative overflow-hidden text-center space-y-6">
                  {/* Warning Beacon Orb */}
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black tracking-wider uppercase animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Live Outage In Progress • Pushpa Mode Active</span>
                  </div>

                  {/* Main Emergency Headline */}
                  <div className="space-y-3">
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.05]">
                      🚨 Twitter Feed Is Down
                    </h1>
                    <p className="text-base sm:text-xl font-bold text-slate-300">
                      Users worldwide cannot refresh feeds. The single server is redlining.
                    </p>
                  </div>

                  {/* Incident Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Traffic Surge
                      </span>
                      <div className="text-lg font-black text-cyan-400 mt-0.5">
                        100,000 req/s
                      </div>
                      <span className="text-[10px] text-slate-500">Unfiltered Load</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                        Database CPU
                      </span>
                      <div className="text-lg font-black mt-0.5 flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
                        <span>98% CPU</span>
                      </div>
                      <span className="text-[10px]">Connections Full</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        User Impact
                      </span>
                      <div className="text-sm font-black text-rose-400 mt-1 line-clamp-1">
                        Feed Refresh Fails
                      </div>
                      <span className="text-[10px] text-slate-500">HTTP 504 Gateway</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Bounty Reward
                      </span>
                      <div className="text-lg font-black text-amber-400 mt-0.5 flex items-center gap-1">
                        <Zap className="w-4 h-4 fill-amber-400" />
                        <span>+150 XP</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">Unlocks Level 2</span>
                    </div>
                  </div>

                  {/* Primary CTA (SAVE TWITTER) */}
                  <div className="pt-2 flex flex-col items-center justify-center gap-3">
                    <button
                      onClick={startPushpaMode}
                      className="px-10 py-5 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 hover:from-rose-400 hover:to-emerald-300 text-slate-950 font-black text-lg sm:text-xl flex items-center gap-3 shadow-2xl shadow-rose-500/30 transition-all transform hover:scale-105 cursor-pointer uppercase tracking-wide group"
                    >
                      <span>🚨 SAVE TWITTER</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                    </button>

                    {/* Pushpa Guarantees */}
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-400 pt-1">
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
                        One-Click Start
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtitle / Philosophy */}
                <div className="text-center space-y-2 max-w-2xl mx-auto">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-200">
                    Never memorize theory slides before touching real systems.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    System Design is an interactive engineering craft. You learn by diagnosing outages, placing load balancers, caching hot keys, and watching real-time metrics recover.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================= CAMPAIGN MODE SHOWCASE ================= */}
        <section className="py-16 border-t border-white/5 bg-[#090d16]/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>Structured Engineering Journey</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                The 6-Chapter Scaling Campaign
              </h2>
              <p className="text-slate-400 text-sm">
                Instead of disconnected theoretical lessons, progress through a continuous storyline from single-node MVP to 1,000,000 concurrent users.
              </p>
            </div>

            {/* 6 Chapters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CAMPAIGN_CHAPTERS.map((ch) => (
                <div
                  key={ch.id}
                  className="p-6 rounded-2xl glass-card border border-white/10 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                        Chapter {ch.chapterNumber}
                      </span>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-amber-400" /> +{ch.xpReward} XP
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {ch.title}
                    </h3>
                    <p className="text-xs font-semibold text-cyan-400/90 mt-1 mb-2">{ch.tagline}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{ch.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      ~{ch.estimatedMinutes} mins
                    </span>
                    <Link
                      href={`/campaign/${ch.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5"
                    >
                      <span>Start Chapter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-4">
              <Link
                href="/campaign"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-sm border border-cyan-500/30 shadow-lg hover:shadow-cyan-500/10 transition-all"
              >
                <span>View Full Campaign Roadmap & Progression</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================= GOLDEN RULE SECTION ================= */}
        <section className="py-16 border-t border-white/5 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              The Golden Principle
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              &quot;Never wonder what to do next.&quot;
            </h2>
            <p className="text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Traditional courses present 20 ambiguous options. Our mission engine always answers:{" "}
              <span className="text-cyan-400 font-bold">&quot;This is your next mission.&quot;</span>
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={startPushpaMode}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/20 transition-all"
              >
                <span>Start Pushpa Mission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm border border-slate-800 transition-colors"
              >
                Go To Command Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 bg-[#06090f] text-center text-xs text-slate-500">
        <p>© 2026 System Design Quest MVP • Pushpa Mode Onboarding Engine.</p>
      </footer>
    </div>
  );
}
