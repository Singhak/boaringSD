"use client";

import React, { useState } from "react";
import { ArrowRight, Check, HelpCircle, Lightbulb, RotateCcw, X } from "lucide-react";
import type { PatternQuestion, QuizOption } from "@/types";
import { playBlipSound, playErrorSound, playSuccessSound } from "@/lib/sound";

interface QuestionCardProps {
  eyebrow: string;
  title?: string;
  context?: string;
  question: PatternQuestion;
  submitLabel?: string;
  continueLabel?: string;
  hints?: string[];
  onHint?: () => void;
  /** Called on every submission with the 1-based attempt number. */
  onAnswer?: (option: QuizOption, attempt: number) => void;
  onContinue?: () => void;
  /** Extra content shown after a correct answer, above the continue button. */
  afterCorrect?: React.ReactNode;
}

const LETTERS = ["A", "B", "C", "D", "E"];

export default function QuestionCard({
  eyebrow,
  title,
  context,
  question,
  submitLabel = "Submit answer",
  continueLabel = "Continue",
  hints = [],
  onHint,
  onAnswer,
  onContinue,
  afterCorrect,
}: QuestionCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [hintsShown, setHintsShown] = useState(0);

  const selected = question.options.find((o) => o.id === selectedId);
  const correct = submitted && selected?.isCorrect === true;

  const submit = () => {
    if (!selected || submitted) return;
    const attempt = attempts + 1;
    setAttempts(attempt);
    setSubmitted(true);
    if (selected.isCorrect) {
      playSuccessSound();
    } else {
      playErrorSound();
      setWrongIds((ids) => [...ids, selected.id]);
    }
    onAnswer?.(selected, attempt);
  };

  const retry = () => {
    setSubmitted(false);
    setSelectedId(null);
  };

  const showHint = () => {
    setHintsShown((n) => Math.min(hints.length, n + 1));
    onHint?.();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="eyebrow text-cyan-300/80 !text-[10px]">{eyebrow}</span>
        {title && <h3 className="text-base font-bold display">{title}</h3>}
        {context && (
          <p className="text-xs text-slate-300 leading-snug pl-2.5 border-l-2 border-[var(--line-strong)]">{context}</p>
        )}
      </div>

      <fieldset className="space-y-1.5" disabled={correct}>
        <legend className="text-sm font-medium text-white leading-snug mb-1.5">{question.question}</legend>
        {question.options.map((opt, i) => {
          const isSelected = selectedId === opt.id;
          const ruledOut = wrongIds.includes(opt.id) && !isSelected;
          const state =
            isSelected && submitted ? (opt.isCorrect ? "right" : "wrong") : isSelected ? "selected" : ruledOut ? "ruled" : "idle";
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              disabled={submitted}
              onClick={() => {
                setSelectedId(opt.id);
                playBlipSound();
              }}
              className={`choice !py-2 !px-2.5 !text-xs ${
                state === "right"
                  ? "!border-emerald-400/60 !bg-emerald-400/[0.08] !text-white"
                  : state === "wrong"
                  ? "!border-rose-400/60 !bg-rose-400/[0.07] !text-white"
                  : state === "selected"
                  ? "!border-cyan-300/60 !bg-cyan-300/[0.07] !text-white"
                  : state === "ruled"
                  ? "opacity-45 line-through"
                  : ""
              }`}
            >
              <span className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`num w-5 h-5 shrink-0 rounded-md grid place-items-center text-[10px] border ${
                    state === "right"
                      ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-200"
                      : state === "wrong"
                      ? "border-rose-400/60 bg-rose-400/20 text-rose-200"
                      : state === "selected"
                      ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                      : "border-[var(--line-strong)] text-slate-500"
                  }`}
                >
                  {state === "right" ? <Check className="w-3 h-3" /> : state === "wrong" ? <X className="w-3 h-3" /> : LETTERS[i]}
                </span>
                <span>{opt.label}</span>
              </span>
            </button>
          );
        })}
      </fieldset>

      {hints.length > 0 && !correct && (
        <div className="space-y-2">
          {hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="flex gap-2 text-[13px] text-slate-300 animate-fadeIn">
              <Lightbulb className="w-4 h-4 text-amber-300/80 shrink-0 mt-0.5" aria-hidden />
              <span>
                <span className="text-slate-500">Hint {i + 1}. </span>
                {hint}
              </span>
            </p>
          ))}
          {hintsShown < hints.length && (
            <button type="button" onClick={showHint} className="btn btn-ghost !px-0 text-xs">
              <HelpCircle className="w-3.5 h-3.5" />
              {hintsShown === 0 ? "Need a hint?" : "Another hint"}
            </button>
          )}
        </div>
      )}

      {!submitted && (
        <button type="button" onClick={submit} disabled={!selected} className="btn btn-primary">
          {submitLabel}
        </button>
      )}

      {submitted && selected && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl p-4 space-y-3 text-[13px] leading-relaxed animate-fadeIn border ${
            correct ? "bg-emerald-400/[0.06] border-emerald-400/25" : "bg-rose-400/[0.06] border-rose-400/25"
          }`}
        >
          <p className={`font-semibold flex items-center gap-2 ${correct ? "text-emerald-300" : "text-rose-300"}`}>
            {correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {correct ? "Correct" : "Not this one"}
          </p>
          <p className="text-slate-300">{selected.explanation}</p>

          {correct ? (
            <>
              {afterCorrect}
              {onContinue && (
                <button type="button" onClick={onContinue} className="btn btn-primary">
                  {continueLabel}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={retry} className="btn btn-secondary">
              <RotateCcw className="w-3.5 h-3.5" />
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
