"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Lock, RotateCcw, Swords } from "lucide-react";
import { getAllPatterns, getPatternById } from "@/data/patterns";
import {
  MASTERY_LABELS,
  describeEvidence,
  getEvidence,
  getEvidenceChecklist,
  getMasteryState,
  getNextWeakness,
  isPatternCleared,
  isPatternUnlocked,
} from "@/lib/progression";
import type { MasteryState, UserStats } from "@/types";

const STATE_CHIP: Record<MasteryState, string> = {
  unseen: "chip",
  introduced: "chip",
  applied_once: "chip chip-accent",
  passed_transfer: "chip chip-accent",
  needs_review: "chip chip-warn",
  reliable: "chip chip-ok",
};

/**
 * The cumulative level map. Each level shows what it inherits, what it adds,
 * honest evidence (never a single % complete), and one next step.
 */
export default function PatternMap({
  stats,
  highlightId,
  detailed = false,
}: {
  stats: UserStats;
  highlightId?: string;
  detailed?: boolean;
}) {
  const now = new Date();
  const patterns = getAllPatterns();

  return (
    <ol className={`grid grid-cols-1 sm:grid-cols-2 ${detailed ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-6"} gap-3`}>
      {patterns.map((p) => {
        const evidence = getEvidence(stats, p.id);
        const state = getMasteryState(evidence, now);
        const unlocked = isPatternUnlocked(stats, p);
        const cleared = isPatternCleared(stats, p);
        const weakness = getNextWeakness(evidence, now);
        const isNext = p.id === highlightId;
        const checklist = getEvidenceChecklist(evidence);
        const missing = p.prerequisites.map((id) => getPatternById(id)).filter((x) => x && !isPatternCleared(stats, x));

        return (
          <li
            key={p.id}
            className={`relative p-4 rounded-xl border flex flex-col justify-between gap-4 transition-colors ${
              isNext
                ? "border-cyan-300/40 bg-cyan-300/[0.04] shadow-[0_0_0_1px_rgba(56,214,232,0.15),0_12px_32px_-16px_rgba(56,214,232,0.45)]"
                : unlocked
                ? "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
                : "border-dashed border-[var(--line)] bg-transparent"
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`num text-[11px] ${unlocked ? "text-slate-400" : "text-slate-600"}`}>
                  {String(p.levelNumber).padStart(2, "0")}
                </span>
                {unlocked ? (
                  <span className={`${STATE_CHIP[state]} !text-[10px] !py-0`}>{MASTERY_LABELS[state]}</span>
                ) : (
                  <span className="text-[10px] text-slate-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" aria-hidden /> Locked
                  </span>
                )}
              </div>

              <div>
                <h3 className={`text-[15px] font-semibold leading-snug tracking-tight ${unlocked ? "text-white" : "text-slate-500"}`}>
                  {p.levelGoal}
                </h3>
                <p className={`text-xs mt-0.5 ${unlocked ? "text-cyan-300/80" : "text-slate-600"}`}>{p.title}</p>
              </div>

              {detailed && (
                <div className="space-y-1.5 text-[12px] text-slate-400 leading-relaxed">
                  <p>{p.newConstraint}</p>
                  {p.inherits.length > 0 && (
                    <p className="text-slate-500">Keeps: {p.inherits.map((id) => getPatternById(id)?.title).join(", ")}</p>
                  )}
                  <p className="text-slate-600">
                    {p.difficulty} · ~{p.estimatedMinutes} min
                  </p>
                </div>
              )}

              {unlocked && state !== "unseen" && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-3 gap-1" aria-hidden>
                    {checklist.map((c) => (
                      <span key={c.id} className={`h-1 rounded-full ${c.done ? "bg-emerald-400/80" : "bg-white/[0.08]"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">{describeEvidence(evidence, now)}</p>
                  <ul className="sr-only">
                    {checklist.map((c) => (
                      <li key={c.id}>
                        {c.label}: {c.done ? "done" : "not yet"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!unlocked && missing[0] && <p className="text-[11px] text-slate-600">Clear {missing[0].title} first.</p>}
            </div>

            {unlocked && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium">
                {state === "needs_review" ? (
                  <Link href={`/campaign/${p.chapterId}?mode=review`} className="text-amber-300 hover:text-amber-200 flex items-center gap-1">
                    Review <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : cleared && evidence.builderPasses === 0 ? (
                  <Link href={`/builder?scenario=${p.builderScenarioId}`} className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                    <Swords className="w-3 h-3" /> Builder boss
                  </Link>
                ) : (
                  <Link
                    href={`/campaign/${p.chapterId}`}
                    className={`flex items-center gap-1 ${isNext ? "text-cyan-300 hover:text-cyan-200" : "text-slate-300 hover:text-white"}`}
                  >
                    {cleared ? (
                      <>
                        <RotateCcw className="w-3 h-3" /> Replay
                      </>
                    ) : (
                      <>
                        Start <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </Link>
                )}
                {detailed && p.lessonId && (
                  <Link href={`/learn/${p.lessonId}`} className="text-slate-500 hover:text-slate-300 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Lesson
                  </Link>
                )}
                {detailed && weakness && <span className="text-slate-600 font-normal">Next: {weakness}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
