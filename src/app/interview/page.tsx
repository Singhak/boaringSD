"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Timer,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Users,
  Server,
  Layers,
  Database,
  Globe,
  Award,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { completeInterview } from "@/lib/storage";
import { playSuccessSound, playErrorSound, playBlipSound, playLevelUpSound } from "@/lib/sound";
import { ArchitectureNodeType } from "@/types";

const compIconMap: Record<string, React.ElementType> = {
  client: Users,
  load_balancer: Layers,
  server: Server,
  cache: Zap,
  database: Database,
  replica: Database,
  cdn: Globe,
};

export default function InterviewPage() {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(INTERVIEW_PROBLEMS[0].id);
  const problem =
    INTERVIEW_PROBLEMS.find((p) => p.id === selectedProblemId) || INTERVIEW_PROBLEMS[0];

  // 10-Minute Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Progressive hints
  const [revealedHints, setRevealedHints] = useState<number>(0);

  // User Architecture Components
  const [userComponents, setUserComponents] = useState<{
    hasLB: boolean;
    serverCount: number;
    hasCache: boolean;
    hasDatabase: boolean;
    hasReplica: boolean;
    hasCDN: boolean;
  }>({
    hasLB: false,
    serverCount: 1,
    hasCache: false,
    hasDatabase: true,
    hasReplica: false,
    hasCDN: false,
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Countdown timer effect
  useEffect(() => {
    if (!isTimerRunning || secondsRemaining <= 0 || isSubmitted) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, secondsRemaining, isSubmitted]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  const handleReset = (newProblemId?: string) => {
    if (newProblemId) setSelectedProblemId(newProblemId);
    setSecondsRemaining(10 * 60);
    setIsTimerRunning(true);
    setRevealedHints(0);
    setUserComponents({
      hasLB: false,
      serverCount: 1,
      hasCache: false,
      hasDatabase: true,
      hasReplica: false,
      hasCDN: false,
    });
    setIsSubmitted(false);
  };

  const handleRevealHint = () => {
    if (revealedHints < problem.hints.length) {
      playBlipSound();
      setRevealedHints((prev) => prev + 1);
    }
  };

  // Evaluation calculations
  const calculateEvaluation = () => {
    const issues: string[] = [];
    const strengths: string[] = [];
    const isTwitterInterview = problem.id === "interview-twitter-timeline";
    const criteria = [
      {
        passed: userComponents.hasLB,
        penalty: 25,
        strength: "Load Balancer deployed: Traffic is evenly distributed across stateless servers.",
        issue: "Missing Load Balancer: Peak timeline traffic has no reverse-proxy layer to distribute sessions.",
      },
      {
        passed: userComponents.serverCount > 1,
        penalty: 25,
        strength: `Horizontally scaled compute: ${userComponents.serverCount} stateless worker servers active.`,
        issue: "Single Point of Failure (SPOF): The selected architecture still has only one application server.",
      },
      {
        passed: userComponents.hasCache,
        penalty: isTwitterInterview ? 30 : 25,
        strength: isTwitterInterview
          ? "Timeline cache configured: Precomputed feed reads avoid expensive follow-graph queries."
          : "Sub-millisecond RAM caching configured: Protects persistent storage from read bursts.",
        issue: isTwitterInterview
          ? "Missing timeline cache: Feed reads would repeatedly execute expensive joins at extreme QPS."
          : "Missing in-memory cache: High-volume reads will saturate the database connection pool.",
      },
      {
        passed: userComponents.hasDatabase,
        penalty: 25,
        strength: "Durable persistent storage configured for system records.",
        issue: "Missing persistent storage: The architecture cannot durably store system records.",
      },
    ];

    if (isTwitterInterview) {
      criteria.push({
        passed: userComponents.hasReplica,
        penalty: 15,
        strength: "Read/write capacity is separated with a replica for high-volume feed reads.",
        issue: "Missing read/write separation: Feed reads and tweet writes still compete for one database tier.",
      });
    }

    const score = criteria.reduce((total, criterion) => {
      if (criterion.passed) {
        strengths.push(criterion.strength);
        return total;
      }
      issues.push(criterion.issue);
      return total - criterion.penalty;
    }, 100);

    return {
      score: Math.max(0, score),
      issues,
      strengths,
      passed: score >= 70,
    };
  };

  const evaluation = calculateEvaluation();

  const handleSubmit = () => {
    setIsSubmitted(true);
    setIsTimerRunning(false);

    if (evaluation.passed) {
      playLevelUpSound();
      completeInterview(problem.id, problem.rewardXp);
      setTimeout(() => {
        setShowCelebration(true);
      }, 700);
    } else {
      playErrorSound();
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb & Scenario Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Scenario tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {INTERVIEW_PROBLEMS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleReset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  p.id === problem.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {p.title.replace("Mini Interview: ", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Timed Interview Header Card */}
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-white/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-500/10 via-rose-500/5 to-transparent pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Mini Technical Interview
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> +{problem.rewardXp} XP
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {problem.difficulty} Difficulty
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {problem.title}
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl">{problem.scenario}</p>
            </div>

            {/* Countdown Timer Display */}
            <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 shadow-lg shadow-amber-500/5">
              <Timer
                className={`w-6 h-6 ${
                  secondsRemaining < 120 ? "text-rose-400 animate-pulse" : "text-amber-400"
                }`}
              />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Time Left</span>
                <div
                  className={`text-2xl font-mono font-black ${
                    secondsRemaining < 120 ? "text-rose-400 animate-bounce" : "text-amber-300"
                  }`}
                >
                  {formatTime(secondsRemaining)}
                </div>
              </div>
            </div>
          </div>

          {/* Scale constraints bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-800 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Traffic Scale</span>
              <div className="font-semibold text-slate-200 mt-0.5">{problem.trafficScale}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Latency SLA</span>
              <div className="font-semibold text-slate-200 mt-0.5">{problem.latencyConstraint}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Storage Scale</span>
              <div className="font-semibold text-slate-200 mt-0.5">{problem.storageScale}</div>
            </div>
          </div>
        </div>

        {/* Progressive Hint Drawer */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Interviewer Hints</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({revealedHints}/{problem.hints.length} unlocked)
              </span>
            </div>

            {revealedHints < problem.hints.length && (
              <button
                onClick={handleRevealHint}
                className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
              >
                Ask Interviewer For Hint {revealedHints + 1}
              </button>
            )}
          </div>

          {revealedHints > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              {problem.hints.slice(0, revealedHints).map((hint, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2"
                >
                  <span className="font-bold text-amber-400 shrink-0">Interviewer Nudge #{idx + 1}:</span>
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Architecture Construction Deck */}
        <div className="p-6 sm:p-8 rounded-2xl glass-card border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Your Proposed Architecture</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your system components to satisfy high-throughput redirect requirements.
              </p>
            </div>

            <button
              onClick={() => handleReset()}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          {/* Component Configuration Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Load Balancer Toggle */}
            <button
              disabled={isSubmitted}
              onClick={() => {
                playBlipSound();
                setUserComponents((p) => ({ ...p, hasLB: !p.hasLB }));
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                userComponents.hasLB
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              <Layers className="w-5 h-5 mb-2" />
              <div className="text-xs font-bold text-white">Load Balancer</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {userComponents.hasLB ? "Enabled (Proxy active)" : "Disabled"}
              </div>
            </button>

            {/* Server Count Scaler */}
            <button
              disabled={isSubmitted}
              onClick={() => {
                playBlipSound();
                setUserComponents((p) => ({
                  ...p,
                  serverCount: p.serverCount >= 3 ? 1 : p.serverCount + 1,
                }));
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                userComponents.serverCount > 1
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-300"
              }`}
            >
              <Server className="w-5 h-5 mb-2 text-cyan-400" />
              <div className="text-xs font-bold text-white">
                {userComponents.serverCount} App Server{userComponents.serverCount > 1 ? "s" : ""}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {userComponents.serverCount === 1 ? "Single Instance (SPOF)" : "Multi-node fleet"}
              </div>
            </button>

            {/* Cache Toggle */}
            <button
              disabled={isSubmitted}
              onClick={() => {
                playBlipSound();
                setUserComponents((p) => ({ ...p, hasCache: !p.hasCache }));
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                userComponents.hasCache
                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              <Zap className="w-5 h-5 mb-2" />
              <div className="text-xs font-bold text-white">Redis Cache</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {userComponents.hasCache ? "Enabled (<5ms reads)" : "Disabled"}
              </div>
            </button>

            {/* Database Toggle */}
            <button
              disabled={isSubmitted}
              onClick={() => {
                playBlipSound();
                setUserComponents((p) => ({ ...p, hasDatabase: !p.hasDatabase }));
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                userComponents.hasDatabase
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              <Database className="w-5 h-5 mb-2" />
              <div className="text-xs font-bold text-white">PostgreSQL DB</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {userComponents.hasDatabase ? "Primary ACID" : "None"}
              </div>
            </button>

            {/* Read Replica Toggle */}
            <button
              disabled={isSubmitted}
              onClick={() => {
                playBlipSound();
                setUserComponents((p) => ({ ...p, hasReplica: !p.hasReplica }));
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                userComponents.hasReplica
                  ? "bg-teal-500/20 border-teal-500 text-teal-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              <Database className="w-5 h-5 mb-2 text-teal-400" />
              <div className="text-xs font-bold text-white">Read Replica</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {userComponents.hasReplica ? "Async replication" : "Disabled"}
              </div>
            </button>
          </div>

          {/* Current Flow Visualization */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 font-mono text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Live Topology Visual
            </span>
            <div className="flex flex-wrap items-center gap-2 text-slate-300">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 font-bold">
                Clients
              </span>
              <span>→</span>
              <span
                className={`px-2.5 py-1 rounded border ${
                  userComponents.hasLB
                    ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-400"
                }`}
              >
                {userComponents.hasLB ? "Load Balancer" : "Direct Connection (No LB)"}
              </span>
              <span>→</span>
              <span
                className={`px-2.5 py-1 rounded border ${
                  userComponents.serverCount > 1
                    ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                    : "bg-amber-950/40 border-amber-500/50 text-amber-400"
                }`}
              >
                {userComponents.serverCount} App Server{userComponents.serverCount > 1 ? "s" : ""}
              </span>
              <span>→</span>
              {userComponents.hasCache && (
                <>
                  <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500 text-amber-300">
                    Redis Cache
                  </span>
                  <span>+</span>
                </>
              )}
              <span
                className={`px-2.5 py-1 rounded border ${
                  userComponents.hasDatabase
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-400"
                }`}
              >
                {userComponents.hasDatabase ? "Primary DB" : "No Database!"}
              </span>
              {userComponents.hasReplica && (
                <>
                  <span>+</span>
                  <span className="px-2.5 py-1 rounded bg-teal-950/60 border border-teal-500 text-teal-300">
                    Read Replica
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Submission / Evaluation Feedback Block */}
          {isSubmitted && (
            <div className="space-y-6 pt-4 border-t border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Interviewer Assessment Score
                  </span>
                  <div className="text-2xl font-black text-white flex items-center gap-2 mt-0.5">
                    <span>{evaluation.score} / 100</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        evaluation.passed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {evaluation.passed ? "Offer Recommended" : "Needs Revision"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsSubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
                >
                  Adjust Architecture
                </button>
              </div>

              {/* Feedback Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Issues Detected */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Vulnerabilities & Bottlenecks ({evaluation.issues.length})</span>
                  </div>
                  {evaluation.issues.length === 0 ? (
                    <p className="text-xs text-emerald-400">Zero critical architectural flaws detected!</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-rose-200/90 list-disc list-inside">
                      {evaluation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Strengths */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Architectural Strengths ({evaluation.strengths.length})</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-emerald-200/90 list-disc list-inside">
                    {evaluation.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Staff Benchmark Comparison */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2 text-xs">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Staff Engineer Benchmark Architecture
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {problem.benchmarkArchitecture.summary}
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          {!isSubmitted && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-500">
                Ready to defend your design in the interview?
              </span>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-teal-400 to-cyan-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all"
              >
                <span>Submit for Interview Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* LevelUpModal celebration */}
      <LevelUpModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Technical Interview Passed! 🎯"
        subtitle={`You scored ${evaluation.score}/100 and demonstrated fault-tolerant architecture intuition for ${problem.title}.`}
        xpEarned={problem.rewardXp}
        badgeEarned="Interview Ready"
        nextLabel="Try Guided Thinking"
        onNext={() => {
          setShowCelebration(false);
          window.location.href = "/guided";
        }}
      />
    </div>
  );
}
