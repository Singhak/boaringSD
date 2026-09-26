"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, Lightbulb, Sparkles, XCircle } from "lucide-react";
import { playBlipSound, playErrorSound, playSuccessSound } from "@/lib/sound";
import { parseEstimate, scoreEstimate } from "@/lib/estimation";
import type { InterviewEstimationTarget, InterviewProblem } from "@/types";

interface InterviewMathStepProps {
  problem: InterviewProblem;
  onBack: () => void;
  onComplete: (score: number, answers: Record<string, number>) => void;
}

interface EvaluatedAnswer {
  userValue: number;
  percentageError: number;
  isAcceptable: boolean;
  isPerfect: boolean;
  score: number;
  feedback: string;
}

export default function InterviewMathStep({ problem, onBack, onComplete }: InterviewMathStepProps) {
  const targets = problem.estimationTargets ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluated, setEvaluated] = useState<Record<string, EvaluatedAnswer>>({});
  const [showDerivations, setShowDerivations] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (targetId: string, val: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [targetId]: val }));
  };

  const handleEvaluateMath = () => {
    playBlipSound();
    const results: Record<string, EvaluatedAnswer> = {};
    let totalScore = 0;

    targets.forEach((target) => {
      const rawNum = parseEstimate(answers[target.id] ?? "");
      const canonical = target.canonicalAnswer;
      const { score, grade, factor, percentageError } = scoreEstimate(rawNum, canonical, target.tolerancePercent);
      const isPerfect = grade === "perfect";
      const isAcceptable = isPerfect || grade === "acceptable";

      let feedback: string;
      if (!Number.isFinite(rawNum) || rawNum <= 0) {
        feedback = "Please enter a positive estimate (shorthand like 12k or 1.5M works).";
      } else if (isPerfect) {
        feedback = `Masterful estimate! ${rawNum.toLocaleString()} ${target.magnitudeLabel} is within ${percentageError}% of canonical ${canonical.toLocaleString()} ${target.magnitudeLabel}.`;
      } else if (isAcceptable) {
        feedback = `Solid back-of-the-envelope calculation (${rawNum.toLocaleString()} vs canonical ${canonical.toLocaleString()} ${target.magnitudeLabel}).`;
      } else if (grade === "order_of_magnitude") {
        feedback = `Right ballpark, but ${factor.toFixed(1)}x off. Review the derivation shortcuts.`;
      } else {
        feedback = `Off by ${Number.isFinite(factor) ? `${factor.toFixed(0)}x` : "a lot"}. Review the conversion shortcuts below.`;
      }

      totalScore += score;
      results[target.id] = {
        userValue: Number.isFinite(rawNum) ? rawNum : 0,
        percentageError,
        isAcceptable,
        isPerfect,
        score,
        feedback,
      };
    });

    setEvaluated(results);
    setSubmitted(true);

    const avgScore = Math.round(totalScore / Math.max(targets.length, 1));
    if (avgScore >= 70) {
      playSuccessSound();
    } else {
      playErrorSound();
    }
  };

  const handleProceed = () => {
    let totalScore = 0;
    const finalAnswers: Record<string, number> = {};
    targets.forEach((target) => {
      const evalRes = evaluated[target.id];
      if (evalRes) {
        finalAnswers[target.id] = evalRes.userValue;
        // Same score the learner was shown.
        totalScore += evalRes.score;
      }
    });
    const avgScore = Math.round(totalScore / Math.max(targets.length, 1));
    onComplete(avgScore, finalAnswers);
  };

  const toggleDerivation = (targetId: string) => {
    playBlipSound();
    setShowDerivations((prev) => ({ ...prev, [targetId]: !prev[targetId] }));
  };

  const allFilled = targets.length > 0 && targets.every((t) => answers[t.id]?.trim());

  return (
    <section className="surface p-6 sm:p-8 space-y-6 animate-fadeIn" aria-label="Capacity estimation stage">
      <header className="space-y-2 border-b border-[var(--line)] pb-5">
        <div className="flex items-center gap-2">
          <span className="chip chip-warn text-[11px]">Stage 2 of 4 · Capacity Estimation</span>
          <span className="chip">Back-of-the-Envelope Math</span>
        </div>
        <h2 className="text-2xl display">Preflight Capacity & Storage Sizing</h2>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          System design architecture is grounded in numbers. Calculate traffic throughput, storage volume, and RAM cache working sets before choosing database engines or provisioning clusters.
        </p>
      </header>

      {/* Math Problem Targets */}
      <div className="space-y-5">
        {targets.map((target, idx) => {
          const evalRes = evaluated[target.id];
          const isExpanded = showDerivations[target.id] || submitted;

          return (
            <article
              key={target.id}
              className={`surface-2 p-5 sm:p-6 rounded-xl border transition-all ${
                evalRes
                  ? evalRes.isPerfect
                    ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                    : evalRes.isAcceptable
                    ? "border-cyan-400/30 bg-cyan-400/[0.03]"
                    : "border-amber-400/30 bg-amber-400/[0.03]"
                  : "border-[var(--line)]"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-cyan-400/10 text-cyan-300 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <h3 className="text-[15px] font-semibold text-white">{target.prompt}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-mono bg-black/30 p-2.5 rounded-lg border border-[var(--line)]">
                    {target.parameterContext}
                  </p>
                </div>

                {/* Input Workspace */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="off"
                      disabled={submitted}
                      value={answers[target.id] || ""}
                      onChange={(e) => handleInputChange(target.id, e.target.value)}
                      placeholder="e.g. 40k"
                      className="bg-black/50 border border-[var(--line-strong)] rounded-lg px-3.5 py-2 text-sm text-white font-mono w-36 sm:w-44 focus:border-cyan-400 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono pointer-events-none">
                      {target.unit}
                    </span>
                  </div>

                  {evalRes && (
                    <span
                      className={`chip ${
                        evalRes.isPerfect
                          ? "chip-ok"
                          : evalRes.isAcceptable
                          ? "chip-accent"
                          : "chip-warn"
                      }`}
                    >
                      {evalRes.isPerfect
                        ? "Perfect"
                        : evalRes.isAcceptable
                        ? "Acceptable"
                        : `Off (${evalRes.percentageError}%)`}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback text */}
              {evalRes && (
                <div
                  className={`mt-4 pt-3 border-t text-xs flex items-start gap-2 ${
                    evalRes.isPerfect
                      ? "border-emerald-500/20 text-emerald-300"
                      : evalRes.isAcceptable
                      ? "border-cyan-400/20 text-cyan-300"
                      : "border-amber-400/20 text-amber-300"
                  }`}
                >
                  {evalRes.isPerfect ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : evalRes.isAcceptable ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold mr-1.5">{evalRes.feedback}</span>
                  </div>
                </div>
              )}

              {/* Collapsible Derivation Walkthrough */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => toggleDerivation(target.id)}
                  className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-mono transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {isExpanded ? "Hide Derivation & Rules of Thumb" : "View Step-by-Step Derivation"}
                </button>

                {isExpanded && (
                  <div className="mt-3 p-4 rounded-xl bg-black/40 border border-cyan-400/20 space-y-2.5 text-xs text-slate-300 animate-fadeIn">
                    <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-300" />
                      Canonical Derivation:
                    </div>
                    <ul className="space-y-1.5 pl-5 list-disc text-slate-300 font-mono">
                      {target.stepByStepDerivation.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-white/[0.08] text-[11px] text-amber-200/90 font-medium">
                      💡 {target.ruleOfThumbTip}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
        <button type="button" onClick={onBack} className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back to Scope
        </button>

        {!submitted ? (
          <button
            type="button"
            disabled={!allFilled}
            onClick={handleEvaluateMath}
            className="btn btn-primary"
          >
            Verify Capacity Math
            <Calculator className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleProceed} className="btn btn-primary animate-pulse-glow">
            Proceed to Topology Design
            <Sparkles className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  );
}
