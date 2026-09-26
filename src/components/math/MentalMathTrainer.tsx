"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calculator,
  Clock,
  Flame,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  ChevronRight,
  Brain,
  Zap,
  Volume2,
  VolumeX,
  Target,
  BarChart3,
  Layers,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  MATH_PROBLEMS,
  MathProblem,
  MathCategory,
  evaluateMathAnswer,
  MathEvaluationResult,
} from "@/data/mathProblems";
import { playBlipSound, playErrorSound, playSuccessSound, playLevelUpSound } from "@/lib/sound";
import { submitEstimate } from "@/lib/storage";
import { parseEstimate } from "@/lib/estimation";

interface MentalMathTrainerProps {
  onPreflightComplete?: (accuracyScore: number) => void;
  isPreflightMode?: boolean;
}

export default function MentalMathTrainer({
  onPreflightComplete,
  isPreflightMode = false,
}: MentalMathTrainerProps) {
  // Game Modes: 'blitz' (60s timer) vs 'practice' (untimed, in-depth)
  const [mode, setMode] = useState<"blitz" | "practice">(isPreflightMode ? "practice" : "practice");
  const [selectedCategory, setSelectedCategory] = useState<MathCategory | "all">("all");
  
  // Problem state
  const [problemIndex, setProblemIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [evaluation, setEvaluation] = useState<MathEvaluationResult | null>(null);
  const [showDerivation, setShowDerivation] = useState(false);
  
  // Blitz timer & streak state
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [blitzScore, setBlitzScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [solvedInSession, setSolvedInSession] = useState(0);
  const [blitzCompleted, setBlitzCompleted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Filter problems by category
  const filteredProblems = MATH_PROBLEMS.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );
  const currentProblem: MathProblem = filteredProblems[problemIndex % filteredProblems.length];

  // Timer tick for Blitz Mode; the round ends inside the tick that reaches 0
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (!isTimerActive) return;
    const interval = setInterval(() => {
      const next = Math.max(0, timeLeftRef.current - 1);
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (next === 0) {
        clearInterval(interval);
        setIsTimerActive(false);
        setBlitzCompleted(true);
        playLevelUpSound();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive]);

  // Clear the answer when the problem changes
  const problemKey = `${problemIndex}|${selectedCategory}`;
  const [answeredProblemKey, setAnsweredProblemKey] = useState(problemKey);
  if (problemKey !== answeredProblemKey) {
    setAnsweredProblemKey(problemKey);
    setInputValue("");
    setEvaluation(null);
    setShowDerivation(false);
  }

  // Focus input on problem change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [problemIndex, selectedCategory]);

  const handleStartBlitz = () => {
    setMode("blitz");
    setTimeLeft(60);
    setIsTimerActive(true);
    setBlitzScore(0);
    setCurrentStreak(0);
    setSolvedInSession(0);
    setBlitzCompleted(false);
    setProblemIndex(0);
    playBlipSound();
  };

  const handleResetBlitz = () => {
    setTimeLeft(60);
    setIsTimerActive(false);
    setBlitzScore(0);
    setCurrentStreak(0);
    setBlitzCompleted(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (evaluation) return; // one graded answer per problem; move on to try another
    const num = parseEstimate(inputValue);
    if (!Number.isFinite(num)) return;

    const result = evaluateMathAnswer(currentProblem, num);
    setEvaluation(result);
    setShowDerivation(true);
    // Every attempt counts as evidence; XP only for a passing estimate (once per problem, small daily replay).
    submitEstimate(currentProblem.id, result.score);

    if (result.score >= 85) {
      playSuccessSound();
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      
      const multiplier = newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1;
      setBlitzScore((prev) => prev + result.score * multiplier);
      setSolvedInSession((prev) => prev + 1);

      if (result.grade === "perfect") {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ["#22d3ee", "#34d399", "#a78bfa"],
          });
        } catch {}
      }
    } else {
      playErrorSound();
      setCurrentStreak(0);
    }
  };

  const handleNextProblem = () => {
    playBlipSound();
    setProblemIndex((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 surface !rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-slate-950/40 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Back-of-the-Envelope Math Gym
              </h1>
              <p className="text-xs text-slate-400">
                L5/L6 Capacity Estimation & Sanity Check Muscle Memory
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        {!isPreflightMode && (
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => {
                setMode("practice");
                setIsTimerActive(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === "practice"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Practice Mode
            </button>
            <button
              type="button"
              onClick={handleStartBlitz}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                mode === "blitz"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              60s Blitz Mode
            </button>
          </div>
        )}
      </div>

      {/* Stats Bar / Blitz Progress */}
      {mode === "blitz" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 surface !rounded-xl border border-amber-500/30 bg-amber-500/[0.03] space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Time Remaining
            </span>
            <div className={`num text-2xl font-bold ${timeLeft <= 10 ? "text-rose-400 animate-pulse" : "text-amber-300"}`}>
              {timeLeft}s
            </div>
          </div>

          <div className="p-3.5 surface !rounded-xl border border-cyan-500/30 bg-cyan-500/[0.03] space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Blitz Score
            </span>
            <div className="num text-2xl font-bold text-cyan-300">
              {blitzScore}
            </div>
          </div>

          <div className="p-3.5 surface !rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Current Streak
            </span>
            <div className="num text-2xl font-bold text-emerald-300 flex items-center gap-1.5">
              {currentStreak}
              {currentStreak >= 3 && (
                <span className="text-xs px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {currentStreak >= 5 ? "3× Multiplier" : "2× Multiplier"}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 surface !rounded-xl border border-purple-500/30 bg-purple-500/[0.03] space-y-1">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Solved
            </span>
            <div className="num text-2xl font-bold text-purple-300">
              {solvedInSession}
            </div>
          </div>
        </div>
      ) : (
        /* Category Filters in Practice Mode */
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {(
            [
              { id: "all", label: "All Categories" },
              { id: "qps", label: "Traffic & QPS" },
              { id: "cache_ram", label: "RAM & Caching" },
              { id: "storage", label: "Storage & IOPS" },
              { id: "bandwidth", label: "Bandwidth & CDN" },
              { id: "availability", label: "SLAs & Nines" },
              { id: "cost", label: "Cloud Cost ($/mo)" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setProblemIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                  : "bg-black/30 text-slate-400 hover:text-slate-200 border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Blitz Finished Summary Modal / Card */}
      {blitzCompleted ? (
        <div className="surface p-8 rounded-2xl border border-amber-400/40 text-center space-y-5 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 grid place-items-center text-amber-300 mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">60s Sprint Completed!</h2>
            <p className="text-slate-300 text-sm mt-1">
              You scored <span className="text-amber-300 font-bold font-mono">{blitzScore} points</span> with a peak streak of {bestStreak}.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleStartBlitz}
              className="btn btn-primary !py-2.5 !px-6 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
            <button
              type="button"
              onClick={() => setMode("practice")}
              className="btn btn-ghost !py-2.5 !px-6"
            >
              Switch to Practice
            </button>
          </div>
        </div>
      ) : (
        /* Problem Card */
        <div className="surface p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 relative overflow-hidden">
          {/* Difficulty & Category Badges */}
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="chip chip-ok !text-[11px] uppercase font-mono">
                {currentProblem.category.replace("_", " ")}
              </span>
              <span className={`chip !text-[11px] font-mono ${
                currentProblem.difficulty === "beginner"
                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                  : currentProblem.difficulty === "intermediate"
                  ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                  : "text-purple-300 bg-purple-500/10 border-purple-500/30"
              }`}>
                {currentProblem.difficulty}
              </span>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Problem {((problemIndex % filteredProblems.length) + 1)} of {filteredProblems.length}
            </span>
          </div>

          {/* Title & Scenario Prompt */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {currentProblem.title}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {currentProblem.prompt}
            </p>
            {currentProblem.scenarioContext && (
              <p className="text-xs text-cyan-300/80 font-mono flex items-center gap-1.5 pt-1">
                <Target className="w-3.5 h-3.5" /> Context: {currentProblem.scenarioContext}
              </p>
            )}
          </div>

          {/* Given Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-4 rounded-xl bg-black/40 border border-white/5">
            {currentProblem.parameters.map((param, idx) => (
              <div key={idx} className="space-y-0.5">
                <span className="text-[11px] text-slate-500 font-mono uppercase">{param.label}</span>
                <div className="font-semibold text-sm text-slate-200 font-mono">{param.value}</div>
              </div>
            ))}
          </div>

          {/* Interactive Calculation Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  placeholder="Your estimate (e.g. 24k, 1.5M or 50)..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-500/40 rounded-xl px-4 py-3.5 text-lg font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all pr-24"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-300/80 px-2 py-1 rounded bg-white/5 border border-white/10 pointer-events-none">
                  {currentProblem.magnitudeLabel}
                </span>
              </div>

              <button
                type="submit"
                disabled={!inputValue || evaluation !== null}
                className="btn btn-primary !py-3.5 !px-7 text-sm font-semibold flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Evaluate Estimate <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Magnitude Helper Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] font-mono mr-1">Quick Scale:</span>
              {[
                { label: "10¹ (Tens)", val: "10" },
                { label: "10² (Hundreds)", val: "100" },
                { label: "10³ (Thousands / K)", val: "1000" },
                { label: "10⁴ (10K)", val: "10000" },
                { label: "10⁶ (Millions / M)", val: "1000000" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setInputValue(chip.val)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-mono text-slate-300 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </form>

          {/* Feedback & Derivation Section */}
          {evaluation && (
            <div
              className={`p-5 rounded-xl border animate-fadeIn space-y-4 ${
                evaluation.score >= 85
                  ? "bg-emerald-500/[0.04] border-emerald-500/40"
                  : evaluation.score >= 50
                  ? "bg-amber-500/[0.04] border-amber-500/40"
                  : "bg-rose-500/[0.04] border-rose-500/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {evaluation.score >= 85 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-semibold text-sm text-white">
                    {evaluation.feedback}
                  </span>
                </div>

                <span
                  className={`chip shrink-0 !text-xs font-mono font-bold ${
                    evaluation.grade === "perfect"
                      ? "chip-ok"
                      : evaluation.grade === "acceptable"
                      ? "chip-warn"
                      : "chip-bad"
                  }`}
                >
                  {evaluation.grade === "perfect"
                    ? "100% PERFECT ACCURACY"
                    : evaluation.grade === "acceptable"
                    ? "85% ACCEPTABLE (PASSED)"
                    : evaluation.grade === "order_of_magnitude"
                    ? "50% ORDER OF MAGNITUDE"
                    : "DIMENSION ERROR (0%)"}
                </span>
              </div>

              {/* Whiteboard Derivation Steps */}
              {showDerivation && (
                <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-2 text-xs text-slate-300">
                  <span className="font-mono uppercase text-cyan-300 text-[11px] tracking-wider block font-bold">
                    Official Interview Whiteboard Derivation:
                  </span>
                  <ul className="space-y-1 font-mono list-disc list-inside text-slate-200">
                    {currentProblem.stepByStepDerivation.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 pt-2 border-t border-white/5 text-amber-300/90 font-mono text-[11px] flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>L5/L6 Rule of Thumb: {currentProblem.ruleOfThumbTip}</span>
                  </div>
                </div>
              )}

              {/* Next Problem Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextProblem}
                  className="btn btn-ghost !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 hover:text-cyan-300"
                >
                  Next Problem <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
