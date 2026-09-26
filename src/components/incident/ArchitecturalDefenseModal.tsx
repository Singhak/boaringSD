"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, X, XCircle } from "lucide-react";
import { playBlipSound, playErrorSound, playSuccessSound } from "@/lib/sound";
import { deterministicShuffle } from "@/lib/shuffle";
import type { TradeoffCardOption } from "@/types";

interface ArchitecturalDefenseModalProps {
  isOpen: boolean;
  option: TradeoffCardOption;
  /** firstTry: both answers were right on the first submission. */
  onSuccess: (firstTry: boolean) => void;
  onClose: () => void;
}

export default function ArchitecturalDefenseModal({
  isOpen,
  option,
  onSuccess,
  onClose,
}: ArchitecturalDefenseModalProps) {
  const [q1Selected, setQ1Selected] = useState<string | null>(null);
  const [q2Selected, setQ2Selected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [q1Error, setQ1Error] = useState<string | null>(null);
  const [q2Error, setQ2Error] = useState<string | null>(null);
  // null until the first submission; the score keeps the first attempt.
  const [firstTry, setFirstTry] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q1 = option.tradeoffDefenseQuestion;
  const q2 = option.stressTest10xQuestion;

  const handleVerify = () => {
    playBlipSound();
    let hasError = false;

    if (!q1Selected) {
      setQ1Error("Please select a justification for this architectural pattern.");
      hasError = true;
    } else {
      const opt = q1.options.find((o) => o.id === q1Selected);
      if (!opt?.isCorrect) {
        setQ1Error(opt?.feedback || "Suboptimal justification.");
        hasError = true;
      } else {
        setQ1Error(null);
      }
    }

    if (!q2Selected) {
      setQ2Error("Please select how this system behaves under 10x stress.");
      hasError = true;
    } else {
      const opt = q2.options.find((o) => o.id === q2Selected);
      if (!opt?.isCorrect) {
        setQ2Error(opt?.feedback || "Incorrect failure mode analysis.");
        hasError = true;
      } else {
        setQ2Error(null);
      }
    }

    const wasFirstTry = firstTry ?? !hasError;
    if (firstTry === null) setFirstTry(!hasError);

    if (hasError) {
      playErrorSound();
      setSubmitted(true);
      return;
    }

    playSuccessSound();
    setSubmitted(true);
    setTimeout(() => {
      onSuccess(wasFirstTry);
    }, 700);
  };

  // After a wrong first attempt the learner has seen the feedback and can deploy anyway;
  // the defense just doesn't count as first-try.
  const canContinueAfterFeedback = firstTry === false && !!(q1Error || q2Error);

  const isVerified =
    submitted &&
    q1Selected &&
    q2Selected &&
    !q1Error &&
    !q2Error;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="defense-title"
        className="surface max-w-2xl w-full p-6 sm:p-8 rounded-2xl border border-cyan-400/40 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.3)] space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="chip chip-warn text-[11px] flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> SRE Architectural Defense Gate
              </span>
              <span className="chip text-[11px]">Staff Verification</span>
            </div>
            <h2 id="defense-title" className="text-xl sm:text-2xl display text-white">
              Defend Your Deployment Choice
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed">
              In production, senior engineers must justify why a pattern was chosen over alternatives and anticipate the next failure mode under 10x traffic.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost !p-2 text-slate-400 hover:text-white shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Option Capsule */}
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-400/20 text-xs flex items-center justify-between gap-3">
          <div>
            <span className="eyebrow !text-[11px] text-cyan-300">Selected Intervention:</span>
            <div className="text-[13px] font-semibold text-white mt-0.5">{option.title}</div>
          </div>
          <span className="chip chip-accent text-[11px]">
            +${option.costEstimateDeltaUsd}/mo · {option.latencyProfileMs}ms
          </span>
        </div>

        <div className="space-y-6 text-xs sm:text-[13px]">
          {/* Question 1: Why this over alternatives */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-md bg-cyan-400/10 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </span>
              <p className="font-medium text-white leading-relaxed">{q1.question}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 pl-0 sm:pl-8">
              {deterministicShuffle(q1.options, `${option.id}|q1`).map((opt) => {
                const isSelected = q1Selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playBlipSound();
                      setQ1Selected(opt.id);
                      setQ1Error(null);
                    }}
                    className={`p-3 rounded-lg text-left leading-relaxed transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-cyan-500/15 border border-cyan-400 text-white"
                        : "surface-2 border border-[var(--line)] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                        isSelected ? "border-cyan-400 bg-cyan-400 text-slate-950 font-bold text-[11px]" : "border-slate-500"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {q1Error && (
              <p className="text-xs text-rose-300 pl-0 sm:pl-8 flex items-center gap-1.5 animate-fadeIn">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {q1Error}
              </p>
            )}
          </div>

          {/* Question 2: 10x Stress Test */}
          <div className="space-y-3 pt-2 border-t border-[var(--line)]">
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-md bg-amber-400/10 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </span>
              <p className="font-medium text-white leading-relaxed">{q2.question}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 pl-0 sm:pl-8">
              {deterministicShuffle(q2.options, `${option.id}|q2`).map((opt) => {
                const isSelected = q2Selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playBlipSound();
                      setQ2Selected(opt.id);
                      setQ2Error(null);
                    }}
                    className={`p-3 rounded-lg text-left leading-relaxed transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-cyan-500/15 border border-cyan-400 text-white"
                        : "surface-2 border border-[var(--line)] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                        isSelected ? "border-cyan-400 bg-cyan-400 text-slate-950 font-bold text-[11px]" : "border-slate-500"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {q2Error && (
              <p className="text-xs text-rose-300 pl-0 sm:pl-8 flex items-center gap-1.5 animate-fadeIn">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {q2Error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost text-xs">
              Cancel
            </button>
            {canContinueAfterFeedback && (
              <button type="button" onClick={() => onSuccess(false)} className="btn btn-ghost text-xs text-amber-200">
                Deploy anyway (no defense bonus)
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!q1Selected || !q2Selected}
            onClick={handleVerify}
            className={`btn btn-primary ${isVerified ? "animate-pulse-glow" : ""}`}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Defense Approved! Stabilizing...
              </>
            ) : (
              <>
                Submit Architectural Defense
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
