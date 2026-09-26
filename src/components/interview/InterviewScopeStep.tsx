"use client";

import React, { useState } from "react";
import { ArrowRight, Check, CheckCircle2, HelpCircle, Info, Sparkles, X, XCircle } from "lucide-react";
import { playBlipSound, playErrorSound, playSuccessSound } from "@/lib/sound";
import { deterministicShuffle } from "@/lib/shuffle";
import type { InterviewProblem, InterviewScopeItem } from "@/types";

interface InterviewScopeStepProps {
  problem: InterviewProblem;
  onComplete: (score: number, items: Record<string, "core" | "out_of_scope">) => void;
}

export default function InterviewScopeStep({ problem, onComplete }: InterviewScopeStepProps) {
  const scopeItems = deterministicShuffle(problem.scopeItems ?? [], `${problem.id}|scope`);
  const [decisions, setDecisions] = useState<Record<string, "core" | "out_of_scope">>({});
  const [submitted, setSubmitted] = useState(false);

  const handleClassify = (itemId: string, classification: "core" | "out_of_scope") => {
    if (submitted) return;
    playBlipSound();
    setDecisions((prev) => ({ ...prev, [itemId]: classification }));
  };

  const allClassified = scopeItems.length > 0 && scopeItems.every((item) => decisions[item.id]);

  const handleSubmitScope = () => {
    if (!allClassified) return;
    setSubmitted(true);

    // Calculate score: +20 points per correct classification (up to 100)
    let correctCount = 0;
    scopeItems.forEach((item) => {
      const userChoice = decisions[item.id];
      const isCorrect = (item.isCore && userChoice === "core") || (!item.isCore && userChoice === "out_of_scope");
      if (isCorrect) correctCount++;
    });

    const calculatedScore = Math.round((correctCount / Math.max(scopeItems.length, 1)) * 100);
    if (calculatedScore >= 80) {
      playSuccessSound();
    } else {
      playErrorSound();
    }
  };

  const handleProceed = () => {
    let correctCount = 0;
    scopeItems.forEach((item) => {
      const userChoice = decisions[item.id];
      const isCorrect = (item.isCore && userChoice === "core") || (!item.isCore && userChoice === "out_of_scope");
      if (isCorrect) correctCount++;
    });
    const calculatedScore = Math.round((correctCount / Math.max(scopeItems.length, 1)) * 100);
    onComplete(calculatedScore, decisions);
  };

  return (
    <section className="surface p-6 sm:p-8 space-y-6 animate-fadeIn" aria-label="Scope and clarification stage">
      <header className="space-y-2 border-b border-[var(--line)] pb-5">
        <div className="flex items-center gap-2">
          <span className="chip chip-accent text-[11px]">Stage 1 of 4 · Scope & Requirements</span>
          <span className="chip">FAANG Standard</span>
        </div>
        <h2 className="text-2xl display">Define Requirements & Identify Scope Creep</h2>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          In senior FAANG interviews, candidates who immediately start drawing boxes fail. Top candidates first clarify functional requirements, define non-functional SLOs, and explicitly reject out-of-scope distractor traps.
        </p>
      </header>

      {/* Scope Card Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
          <span>Candidate Checklist: Classify each item below</span>
          <span className="num">
            {Object.keys(decisions).length} / {scopeItems.length} classified
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {scopeItems.map((item) => {
            const currentChoice = decisions[item.id];
            const isCorrect =
              submitted &&
              ((item.isCore && currentChoice === "core") ||
                (!item.isCore && currentChoice === "out_of_scope"));

            return (
              <article
                key={item.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  submitted
                    ? isCorrect
                      ? "bg-emerald-500/[0.04] border-emerald-500/30"
                      : "bg-rose-500/[0.04] border-rose-500/30"
                    : currentChoice
                    ? "surface-2 border-[var(--line-strong)]"
                    : "surface-2 border-[var(--line)]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={`chip !text-[11px] ${
                          item.category === "functional"
                            ? "chip-accent"
                            : item.category === "non_functional"
                            ? "chip-warn"
                            : "chip-bad"
                        }`}
                      >
                        {item.category === "functional"
                          ? "Functional"
                          : item.category === "non_functional"
                          ? "Non-Functional SLO"
                          : "Distractor Candidate"}
                      </span>
                    </div>
                    <p className="text-[14px] text-white font-medium leading-relaxed">{item.label}</p>
                  </div>

                  {/* Decision Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={submitted}
                      onClick={() => handleClassify(item.id, "core")}
                      className={`btn !py-1.5 !px-3 text-xs transition-all ${
                        currentChoice === "core"
                          ? "btn-primary !border-cyan-400"
                          : "btn-secondary opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      In Scope (Core)
                    </button>

                    <button
                      type="button"
                      disabled={submitted}
                      onClick={() => handleClassify(item.id, "out_of_scope")}
                      className={`btn !py-1.5 !px-3 text-xs transition-all ${
                        currentChoice === "out_of_scope"
                          ? "!bg-rose-500/20 !border-rose-400 !text-rose-200"
                          : "btn-secondary opacity-70 hover:opacity-100"
                      }`}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Out of Scope
                    </button>
                  </div>
                </div>

                {/* Explanation feedback shown upon submission */}
                {submitted && (
                  <div
                    className={`mt-3 pt-3 border-t text-xs flex items-start gap-2 animate-fadeIn ${
                      isCorrect
                        ? "border-emerald-500/20 text-emerald-300"
                        : "border-rose-500/20 text-rose-300"
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold mr-1.5">
                        {isCorrect ? "Correct Scoping:" : "Scoping Error:"}
                      </span>
                      {item.explanation}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Stage Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
        <span className="text-xs text-slate-500">
          Tip: Interviewers award Staff points for actively disqualifying features that belong in separate services.
        </span>

        {!submitted ? (
          <button
            type="button"
            disabled={!allClassified}
            onClick={handleSubmitScope}
            className="btn btn-primary"
          >
            Lock Scope & Verify
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleProceed} className="btn btn-primary animate-pulse-glow">
            Proceed to Capacity Estimation
            <Sparkles className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  );
}
