"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Lightbulb,
  ChevronDown,
  Activity,
  Flame,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import { getChallengeById, LESSONS } from "@/lib/lessons";
import { completeChallenge } from "@/lib/storage";
import { playSuccessSound, playErrorSound, playBlipSound } from "@/lib/sound";

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = (params?.challengeId as string) || "challenge-lb-1";
  const challenge = getChallengeById(challengeId) || LESSONS[0].challenge;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number>(0);

  const hintsList = challenge.hints || [
    "Identify where traffic is concentrating into a single point.",
    "Consider horizontal distribution across multiple nodes.",
    "Think about the primary role of the component in high-scale systems.",
  ];

  const handleRevealHint = () => {
    if (revealedHints < hintsList.length) {
      playBlipSound();
      setRevealedHints((prev) => prev + 1);
    }
  };

  const selectedOption = challenge.options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOption?.isCorrect ?? false;

  const handleSubmit = () => {
    if (!selectedOptionId) return;
    setIsSubmitted(true);

    if (isCorrect) {
      playSuccessSound();
      completeChallenge(challenge.id, challenge.rewardXp);
      setTimeout(() => {
        setShowCelebration(true);
      }, 700);
    } else {
      playErrorSound();
    }
  };

  const handleRetry = () => {
    setSelectedOptionId(null);
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Breadcrumb & Challenge Navigator */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Quick Challenge Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {LESSONS.map((l, index) => (
              <Link
                key={l.challenge.id}
                href={`/challenge/${l.challenge.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  l.challenge.id === challenge.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Lvl {index + 1}
              </Link>
            ))}
          </div>
        </div>

        {/* Live Crash Status Telemetry (Crash-First Learning) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 font-mono text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-rose-300/70 uppercase">Telemetry Status</span>
            <span className="text-rose-400 font-bold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              💥 SYSTEM CRASHED
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">Incoming Traffic</span>
            <span className="text-white font-bold mt-0.5">10,000 req/sec</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">Compute CPU Load</span>
            <span className="text-rose-400 font-bold mt-0.5">99.8% (Redline)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">Error Rate</span>
            <span className="text-rose-400 font-bold mt-0.5">42.4% Drop</span>
          </div>
        </div>

        {/* Incident Alert Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-[#090d16] border border-rose-500/30 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
              <AlertOctagon className="w-7 h-7 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 font-mono text-[10px] font-black uppercase tracking-wider">
                  Incident Triage
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> +{challenge.rewardXp} XP
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {challenge.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed font-mono bg-black/40 p-3 rounded-xl border border-white/5">
                {challenge.scenario}
              </p>
            </div>
          </div>
        </div>

        {/* Progressive Hint Drawer (Enhancement 6) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Progressive Hint System</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({revealedHints}/{hintsList.length} unlocked)
              </span>
            </div>

            {revealedHints < hintsList.length && (
              <button
                onClick={handleRevealHint}
                className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
              >
                Reveal Hint {revealedHints + 1}
              </button>
            )}
          </div>

          {revealedHints > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              {hintsList.slice(0, revealedHints).map((hint, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2 animate-fadeIn"
                >
                  <span className="font-bold text-amber-400 shrink-0">#{idx + 1}:</span>
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question & Options Card */}
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-white/10 space-y-6">
          <h2 className="text-lg font-bold text-white leading-snug">
            {challenge.question}
          </h2>

          <div className="space-y-3">
            {challenge.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedOptionId === option.id;

              let style = "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300";

              if (isSelected && !isSubmitted) {
                style = "bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10";
              }

              if (isSubmitted) {
                if (option.isCorrect) {
                  style = "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20";
                } else if (isSelected && !option.isCorrect) {
                  style = "bg-rose-500/20 border-rose-500 text-rose-300";
                } else {
                  style = "bg-slate-900/30 border-slate-800/50 text-slate-500 opacity-50";
                }
              }

              return (
                <button
                  key={option.id}
                  disabled={isSubmitted}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-4 transition-all duration-200 ${style}`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                      isSelected
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {letter}
                  </span>
                  <div className="flex-1 pt-1">
                    <span className="text-sm font-semibold">{option.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation Output Box */}
          {isSubmitted && selectedOption && (
            <div
              className={`p-4 rounded-xl border animate-fadeIn ${
                isCorrect
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2 font-black text-base mb-1">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Correct Architecture Decision!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span>Incorrect Choice - System Degraded</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                {selectedOption.explanation}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-800">
            {isSubmitted && !isCorrect ? (
              <button
                onClick={handleRetry}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Question
              </button>
            ) : (
              <div />
            )}

            {!isSubmitted ? (
              <button
                disabled={!selectedOptionId}
                onClick={handleSubmit}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                  selectedOptionId
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <span>Submit Decision</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : isCorrect ? (
              <Link
                href="/builder"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Open Arch Builder Playground</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </main>

      {/* Celebration Modal */}
      <LevelUpModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Challenge Mastered! 🎯"
        subtitle="You resolved the system crisis and applied real-world distributed systems best practices."
        xpEarned={challenge.rewardXp}
        badgeEarned="Outage Hero"
        nextLabel="Try Freeform Builder"
        onNext={() => router.push("/builder")}
      />
    </div>
  );
}
