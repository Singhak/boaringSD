"use client";

import React, { useState } from "react";
import { Check, MessageSquare, Send, SkipForward, Sparkles, X } from "lucide-react";
import { playBlipSound, playErrorSound, playSuccessSound } from "@/lib/sound";
import { saveReasoningResult } from "@/lib/storage";
import { MAX_ANSWER_CHARS, rubricScore, type GradeResponse, type ReasoningPrompt, type RubricVerdict } from "@/lib/grading/types";

/** Bonus XP for a solid (≥60) answer, paid once per prompt. */
export const SHARP_CALL_XP = 30;

interface ReasoningCardProps {
  prompt: ReasoningPrompt;
  /** Called when the learner finishes or skips; score is null when skipped. */
  onDone: (score: number | null) => void;
}

type Phase =
  | { kind: "writing" }
  | { kind: "grading" }
  | { kind: "graded"; score: number; items: RubricVerdict[]; feedback: string; xp: number }
  | { kind: "self-assess"; reason: string; ticked: string[] }
  | { kind: "self-scored"; score: number; xp: number };

/**
 * "Defend your call": a teammate pings you in chat and you answer in ≤280
 * characters. Graded against a rubric by the LLM grader, or self-assessed
 * against the model answer when no grader is available. Always skippable.
 */
export default function ReasoningCard({ prompt, onDone }: ReasoningCardProps) {
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "writing" });
  const [error, setError] = useState<string | null>(null);

  const record = (score: number, selfAssessed: boolean) =>
    saveReasoningResult(prompt.id, { score, selfAssessed, patternId: prompt.patternId }, SHARP_CALL_XP).xpAwarded;

  const submit = async () => {
    const text = answer.trim();
    if (!text) return;
    playBlipSound();
    setError(null);
    setPhase({ kind: "grading" });
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: prompt.id, answer: text }),
      });
      const body = (await res.json()) as GradeResponse | { error: string };
      if ("error" in body) {
        setError(body.error);
        setPhase({ kind: "writing" });
        return;
      }
      if (body.mode === "self-assess") {
        setPhase({ kind: "self-assess", reason: body.reason, ticked: [] });
        return;
      }
      const { score, items, feedback } = body.result;
      const xp = record(score, false);
      if (score >= 60) playSuccessSound();
      else playErrorSound();
      setPhase({ kind: "graded", score, items, feedback, xp });
    } catch {
      setPhase({ kind: "self-assess", reason: "The grader couldn't be reached", ticked: [] });
    }
  };

  const scoreSelf = (ticked: string[]) => {
    const score = rubricScore(prompt.rubric, ticked);
    const xp = record(score, true);
    if (score >= 60) playSuccessSound();
    setPhase({ kind: "self-scored", score, xp });
  };

  const finalScore = phase.kind === "graded" || phase.kind === "self-scored" ? phase.score : null;

  return (
    <section className="max-w-2xl mx-auto space-y-3 animate-fadeIn" aria-label="Defend your call">
      {/* Incoming chat ping */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-cyan-400/15 text-cyan-200 grid place-items-center shrink-0" aria-hidden>
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-cyan-400/25 bg-cyan-400/[0.06] px-4 py-3 space-y-1">
          <p className="text-[11px] font-semibold text-cyan-200">{prompt.askedBy}</p>
          <p className="text-sm text-slate-100 leading-snug">{prompt.prompt}</p>
        </div>
      </div>

      {(phase.kind === "writing" || phase.kind === "grading") && (
        <div className="space-y-2 pl-11">
          <div className="flex flex-wrap gap-1.5">
            {prompt.starters.map((s) => (
              <button
                key={s}
                type="button"
                className="chip hover:border-cyan-300/50 cursor-pointer"
                onClick={() => setAnswer((a) => (a ? `${a} ${s}` : s).slice(0, MAX_ANSWER_CHARS))}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor={`reason-${prompt.id}`}>
            Your reply
          </label>
          <textarea
            id={`reason-${prompt.id}`}
            value={answer}
            maxLength={MAX_ANSWER_CHARS}
            rows={3}
            disabled={phase.kind === "grading"}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Reply in a sentence or two…"
            className="w-full rounded-xl bg-black/40 border border-[var(--line-strong)] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none resize-none"
          />
          {error && (
            <p role="alert" className="text-xs text-rose-300">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="num text-[11px] text-slate-500">
              {answer.length}/{MAX_ANSWER_CHARS}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onDone(null)} className="btn btn-ghost text-xs">
                <SkipForward className="w-3.5 h-3.5" /> Skip (no bonus)
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!answer.trim() || phase.kind === "grading"}
                className="btn btn-primary text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {phase.kind === "grading" ? "Reading your reply…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase.kind === "graded" && (
        <RubricReveal items={phase.items} prompt={prompt} score={phase.score} feedback={phase.feedback} xp={phase.xp} />
      )}

      {phase.kind === "self-assess" && (
        <div className="pl-11 space-y-2">
          <p className="text-xs text-slate-400">
            {phase.reason}, so grade yourself. Compare with a strong answer and tick what yours covered.
          </p>
          <blockquote className="text-sm text-slate-200 border-l-2 border-emerald-400/50 pl-3">{prompt.modelAnswer}</blockquote>
          <ul className="space-y-1">
            {prompt.rubric.map((r) => {
              const on = phase.ticked.includes(r.id);
              return (
                <li key={r.id}>
                  <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPhase({
                          ...phase,
                          ticked: on ? phase.ticked.filter((t) => t !== r.id) : [...phase.ticked, r.id],
                        })
                      }
                      className="mt-0.5"
                    />
                    {r.criterion}
                  </label>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => scoreSelf(phase.ticked)} className="btn btn-primary text-xs">
            <Check className="w-3.5 h-3.5" /> Score my reply
          </button>
        </div>
      )}

      {phase.kind === "self-scored" && (
        <p className="pl-11 text-sm text-slate-200">
          Self-assessed {phase.score}%. {phase.xp > 0 ? `+${phase.xp} XP Sharp Call bonus.` : ""}
        </p>
      )}

      {finalScore !== null && (
        <div className="pl-11">
          <button type="button" onClick={() => onDone(finalScore)} className="btn btn-primary text-xs">
            Continue
          </button>
        </div>
      )}
    </section>
  );
}

function RubricReveal({
  prompt,
  items,
  score,
  feedback,
  xp,
}: {
  prompt: ReasoningPrompt;
  items: RubricVerdict[];
  score: number;
  feedback: string;
  xp: number;
}) {
  const sharp = score >= 60;
  return (
    <div className="pl-11 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`chip ${sharp ? "chip-ok" : "chip-warn"}`}>
          {sharp && <Sparkles className="w-3 h-3" aria-hidden />} {sharp ? "Sharp call" : "Almost"} · {score}%
        </span>
        {xp > 0 && <span className="num text-xs text-amber-200">+{xp} XP</span>}
      </div>
      <ul className="space-y-1">
        {prompt.rubric.map((r, i) => {
          const v = items.find((x) => x.id === r.id);
          return (
            <li
              key={r.id}
              className="flex items-start gap-2 text-xs animate-fadeIn"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
            >
              {v?.met ? (
                <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" aria-label="Met" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5" aria-label="Missed" />
              )}
              <span className="text-slate-300">
                {r.criterion}
                {v?.note && <span className="text-slate-500"> · {v.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {feedback && <p className="text-xs text-slate-300">{feedback}</p>}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer">See a strong reply</summary>
        <p className="mt-1 text-slate-200 border-l-2 border-emerald-400/50 pl-3">{prompt.modelAnswer}</p>
      </details>
    </div>
  );
}
