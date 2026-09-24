"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Server,
  Layers,
  Database,
  Globe,
  Crown,
  HelpCircle,
  ShieldCheck,
  Flame,
} from "lucide-react";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import { getCampaignChapterById, getAllCampaignChapters } from "@/data/campaign";
import { recordChapterComplete, getUserStats } from "@/lib/storage";
import {
  playSuccessSound,
  playErrorSound,
  playLevelUpSound,
  playDeploySound,
  playBlipSound,
} from "@/lib/sound";

export default function CampaignChapterPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const resolvedParams = use(params);
  const chapter = getCampaignChapterById(resolvedParams.chapterId);

  if (!chapter) {
    notFound();
  }

  const allChapters = getAllCampaignChapters();
  const nextChapter = allChapters.find((c) => c.chapterNumber === chapter.chapterNumber + 1);

  // Simulation State
  const [isSimulated, setIsSimulated] = useState(false);
  const [metrics, setMetrics] = useState(chapter.initialMetrics);

  // Challenge State
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; totalXp: number } | null>(null);

  useEffect(() => {
    const stats = getUserStats();
    if (stats.completedChapters?.includes(chapter.id)) {
      setIsSimulated(true);
      setMetrics(chapter.targetMetrics);
      setSelectedOptionId(chapter.challenge.options.find((o) => o.isCorrect)?.id || null);
      setChallengeSubmitted(true);
      setIsCorrect(true);
    }
  }, [chapter]);

  // Execute architectural fix
  const handleDeployFix = () => {
    setIsSimulated(true);
    setMetrics(chapter.targetMetrics);
    playDeploySound();
    setTimeout(() => playSuccessSound(), 250);
  };

  const handleResetSimulation = () => {
    setIsSimulated(false);
    setMetrics(chapter.initialMetrics);
    playBlipSound();
  };

  // Submit challenge answer
  const handleSubmitChallenge = () => {
    if (!selectedOptionId) return;
    const selected = chapter.challenge.options.find((o) => o.id === selectedOptionId);
    setChallengeSubmitted(true);

    if (selected?.isCorrect) {
      setIsCorrect(true);
      playSuccessSound();
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22d3ee", "#10b981", "#f59e0b"],
        });
      } catch {
        // Fallback
      }

      const { stats, leveledUp } = recordChapterComplete(chapter.id, chapter.xpReward);
      if (leveledUp) {
        setTimeout(() => {
          setLevelUpData({ newLevel: stats.level, totalXp: stats.currentXp });
          playLevelUpSound();
        }, 500);
      }
    } else {
      setIsCorrect(false);
      playErrorSound();
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/campaign"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campaign Roadmap</span>
          </Link>

          <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-800/60">
            Chapter {chapter.chapterNumber} of {allChapters.length}
          </span>
        </div>

        {/* Chapter Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/30 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30">
              Concept: {chapter.concept}
            </span>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Zap className="w-4 h-4 fill-amber-400" />
              Bounty: +{chapter.xpReward} XP
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {chapter.title}
          </h1>
          <p className="text-sm font-semibold text-cyan-400 mt-1">{chapter.tagline}</p>
          <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            {chapter.description}
          </p>

          <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Active Production Problem: </strong>
              <span>{chapter.scenario}</span>
            </div>
          </div>
        </div>

        {/* ================= INTERACTIVE SIMULATION CANVAS ================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Live Architecture Simulation
              </h2>
              <p className="text-xs text-slate-400">
                Observe the system crash under unmitigated load, then deploy the architectural solution.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSimulation}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-colors"
                title="Reset simulation to initial state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Inbound RPS
              </span>
              <div className="text-xl font-black text-cyan-400 mt-1">
                {metrics.requestsPerSec.toLocaleString()} req/s
              </div>
              <span className="text-[10px] text-slate-500">Live Traffic</span>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                metrics.cpuUsage > 80
                  ? "bg-rose-950/40 border-rose-500/50 text-rose-300 animate-pulse"
                  : "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                CPU Utilization
              </span>
              <div className="text-xl font-black mt-1 flex items-center gap-1">
                {metrics.cpuUsage > 80 && <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />}
                <span>{metrics.cpuUsage}%</span>
              </div>
              <span className="text-[10px]">
                {metrics.cpuUsage > 80 ? "Critical Bottleneck" : "Optimal Operating Range"}
              </span>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                metrics.latencyMs > 1000
                  ? "bg-slate-900/90 border-slate-800 text-rose-400"
                  : "bg-slate-900/90 border-slate-800 text-emerald-400"
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Response Latency
              </span>
              <div className="text-xl font-black mt-1">{metrics.latencyMs} ms</div>
              <span className="text-[10px] text-slate-500">Round-Trip Time</span>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all ${
                metrics.errorRate > 0
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-400"
                  : "bg-slate-900/90 border-slate-800 text-emerald-400"
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Error Rate
              </span>
              <div className="text-xl font-black mt-1">{metrics.errorRate}%</div>
              <span className="text-[10px]">
                {metrics.errorRate > 0 ? "Dropping Packets" : "Zero Dropouts"}
              </span>
            </div>
          </div>

          {/* Interactive Topology Display */}
          <div className="p-8 rounded-3xl bg-[#0b101c] border border-cyan-500/20 text-center space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-around gap-6">
              {/* Clients */}
              <div className="space-y-1">
                <div className="w-20 h-20 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex flex-col items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
                  <Globe className="w-6 h-6 text-cyan-400" />
                  <span className="text-xs font-black text-cyan-300 mt-1">Clients</span>
                </div>
                <span className="text-[11px] text-slate-400">{metrics.requestsPerSec.toLocaleString()} RPS</span>
              </div>

              <div className="text-cyan-400 font-black text-lg">➔</div>

              {/* Middle Component or LB */}
              {isSimulated ? (
                <div className="space-y-1 animate-fadeIn">
                  <div className="w-28 h-20 rounded-2xl bg-emerald-950/80 border-2 border-emerald-400 flex flex-col items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/20">
                    <Layers className="w-6 h-6 text-emerald-400 animate-bounce" />
                    <span className="text-[11px] font-black text-emerald-300 mt-1">
                      Architectural Fix
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Deployed & Active</span>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold animate-pulse">
                  ⚠ Bottleneck Active
                </div>
              )}

              <div className="text-cyan-400 font-black text-lg">➔</div>

              {/* Data / Backend Tier */}
              <div className="space-y-1">
                <div
                  className={`w-24 h-20 rounded-2xl border flex flex-col items-center justify-center mx-auto transition-all ${
                    isSimulated
                      ? "bg-slate-900 border-emerald-500/60 text-emerald-400"
                      : "bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse"
                  }`}
                >
                  <Server className="w-6 h-6" />
                  <span className="text-[11px] font-bold mt-1 text-white">Compute Cluster</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {isSimulated ? "Stabilized" : "Overheating"}
                </span>
              </div>
            </div>

            {/* Action Deployment Button */}
            <div className="pt-4 flex flex-col items-center gap-3">
              {!isSimulated ? (
                <button
                  onClick={handleDeployFix}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Deploy Fix: {chapter.solutionNarrative}</span>
                </button>
              ) : (
                <div className="p-3 px-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Fix Deployed Successfully! Metrics Stabilized. Now complete the boss challenge below.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= BOSS CHALLENGE ================= */}
        <section className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Chapter Boss Challenge
              </span>
              <h3 className="text-xl font-black text-white">{chapter.challenge.title}</h3>
            </div>
            <span className="text-xs font-bold text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              +{chapter.challenge.rewardXp} XP
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <strong className="text-white block mb-1">Scenario:</strong>
            {chapter.challenge.scenario}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">{chapter.challenge.question}</h4>

            <div className="space-y-2">
              {chapter.challenge.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!challengeSubmitted || !isCorrect) {
                        setSelectedOptionId(opt.id);
                        playBlipSound();
                      }
                    }}
                    className={`w-full p-4 rounded-xl border text-left text-xs transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400 text-white font-semibold"
                        : "bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                        isSelected ? "border-cyan-400 bg-cyan-400" : "border-slate-600"
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hint Trigger */}
          {chapter.challenge.hints && chapter.challenge.hints.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-xs font-semibold text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? "Hide Hint" : "Need a hint?"}</span>
              </button>
              {showHint && (
                <div className="mt-2 p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 animate-fadeIn">
                  💡 {chapter.challenge.hints[0]}
                </div>
              )}
            </div>
          )}

          {/* Submit Button & Feedback */}
          <div className="pt-2 space-y-4">
            {!challengeSubmitted || !isCorrect ? (
              <button
                onClick={handleSubmitChallenge}
                disabled={!selectedOptionId}
                className={`px-8 py-3.5 rounded-xl font-black text-xs transition-all ${
                  selectedOptionId
                    ? "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                Submit Chapter Triage Decision
              </button>
            ) : null}

            {challengeSubmitted && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                  isCorrect
                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-300">Chapter Cleared!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span className="text-rose-300">Incorrect Choice</span>
                    </>
                  )}
                </div>

                <p>
                  {
                    chapter.challenge.options.find((o) => o.id === selectedOptionId)?.explanation
                  }
                </p>

                {isCorrect && nextChapter && (
                  <div className="pt-3">
                    <Link
                      href={`/campaign/${nextChapter.id}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
                    >
                      <span>▶ Next Mission: Chapter {nextChapter.chapterNumber} — {nextChapter.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Level Up Modal */}
      {levelUpData && (
        <LevelUpModal
          isOpen={true}
          title={`Rank Promoted to Level ${levelUpData.newLevel}!`}
          subtitle={`You passed the Chapter Boss Challenge and accrued ${levelUpData.totalXp} XP.`}
          xpEarned={chapter.xpReward}
          onClose={() => setLevelUpData(null)}
          onNext={() => {
            setLevelUpData(null);
            if (nextChapter) {
              window.location.href = `/campaign/${nextChapter.id}`;
            }
          }}
          nextLabel={nextChapter ? `Next: Chapter ${nextChapter.chapterNumber}` : "Campaign Hub"}
        />
      )}
    </div>
  );
}
