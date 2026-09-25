"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  Swords,
} from "lucide-react";
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
import type { MasteryState, SystemDesignPattern, UserStats } from "@/types";

const STATE_CHIP: Record<MasteryState, string> = {
  unseen: "chip",
  introduced: "chip",
  applied_once: "chip chip-accent",
  passed_transfer: "chip chip-accent",
  needs_review: "chip chip-warn",
  reliable: "chip chip-ok",
};

const ITEMS_PER_PAGE = 6;

/**
 * Single Pattern Card: displays status, goal, tags, evidence progress, and action links.
 */
function PatternCard({
  pattern: p,
  stats,
  now,
  highlightId,
  detailed,
}: {
  pattern: SystemDesignPattern;
  stats: UserStats;
  now: Date;
  highlightId?: string;
  detailed: boolean;
}) {
  const evidence = getEvidence(stats, p.id);
  const state = getMasteryState(evidence, now);
  const unlocked = isPatternUnlocked(stats, p);
  const cleared = isPatternCleared(stats, p);
  const weakness = getNextWeakness(evidence, now);
  const isNext = p.id === highlightId;
  const checklist = getEvidenceChecklist(evidence);
  const missing = p.prerequisites
    .map((id) => getPatternById(id))
    .filter((x) => x && !isPatternCleared(stats, x));

  return (
    <li
      className={`relative p-4 rounded-xl border flex flex-col justify-between gap-4 transition-colors min-h-[220px] ${
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
          <h3
            className={`text-[15px] font-semibold leading-snug tracking-tight ${
              unlocked ? "text-white" : "text-slate-500"
            }`}
          >
            {p.levelGoal}
          </h3>
          <p className={`text-xs mt-0.5 ${unlocked ? "text-cyan-300/80" : "text-slate-600"}`}>
            {p.title}
          </p>
        </div>

        {detailed && (
          <div className="space-y-1.5 text-[12px] text-slate-400 leading-relaxed">
            <p>{p.newConstraint}</p>
            {p.inherits.length > 0 && (
              <p className="text-slate-500">
                Keeps: {p.inherits.map((id) => getPatternById(id)?.title).join(", ")}
              </p>
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
                <span
                  key={c.id}
                  className={`h-1 rounded-full ${c.done ? "bg-emerald-400/80" : "bg-white/[0.08]"}`}
                />
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
        {!unlocked && missing[0] && (
          <p className="text-[11px] text-slate-600">Clear {missing[0].title} first.</p>
        )}
      </div>

      {unlocked && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium">
          {state === "needs_review" ? (
            <Link
              href={`/campaign/${p.chapterId}?mode=review`}
              className="text-amber-300 hover:text-amber-200 flex items-center gap-1"
            >
              Review <ArrowRight className="w-3 h-3" />
            </Link>
          ) : cleared && evidence.builderPasses === 0 ? (
            <Link
              href={`/builder?scenario=${p.builderScenarioId}`}
              className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
            >
              <Swords className="w-3 h-3" /> Builder boss
            </Link>
          ) : (
            <Link
              href={`/campaign/${p.chapterId}`}
              className={`flex items-center gap-1 ${
                isNext ? "text-cyan-300 hover:text-cyan-200" : "text-slate-300 hover:text-white"
              }`}
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
            <Link
              href={`/learn/${p.lessonId}`}
              className="text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3" /> Lesson
            </Link>
          )}
          {detailed && weakness && <span className="text-slate-600 font-normal">Next: {weakness}</span>}
        </div>
      )}
    </li>
  );
}

/**
 * 2-Row × 3-Column Carousel Level Map:
 * Displays up to 6 levels per slide (2 rows of 3 columns) with carousel navigation controls.
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
  const now = useMemo(() => new Date(), []);
  const patterns = getAllPatterns();

  const totalPages = Math.ceil(patterns.length / ITEMS_PER_PAGE);

  // Group patterns into pages of 6 (2 rows × 3 columns)
  const pages = useMemo(() => {
    const chunks: SystemDesignPattern[][] = [];
    for (let i = 0; i < patterns.length; i += ITEMS_PER_PAGE) {
      chunks.push(patterns.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [patterns]);

  // If a pattern is highlighted, default to the page that contains it
  const initialPage = useMemo(() => {
    if (!highlightId) return 0;
    const idx = patterns.findIndex((p) => p.id === highlightId);
    return idx >= 0 ? Math.floor(idx / ITEMS_PER_PAGE) : 0;
  }, [highlightId, patterns]);

  const [page, setPage] = useState(initialPage);
  const [prevInitialPage, setPrevInitialPage] = useState(initialPage);
  if (prevInitialPage !== initialPage) {
    setPrevInitialPage(initialPage);
    setPage(initialPage);
  }

  const currentStart = page * ITEMS_PER_PAGE + 1;
  const currentEnd = Math.min((page + 1) * ITEMS_PER_PAGE, patterns.length);

  return (
    <div className="space-y-4">
      {/* Carousel Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        {/* Tier jump pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {pages.map((group, pageIdx) => {
            const start = pageIdx * ITEMS_PER_PAGE + 1;
            const end = Math.min((pageIdx + 1) * ITEMS_PER_PAGE, patterns.length);
            const isActive = page === pageIdx;
            return (
              <button
                key={pageIdx}
                type="button"
                onClick={() => setPage(pageIdx)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
                  isActive
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_12px_rgba(56,214,232,0.2)]"
                    : "border-[var(--line)] bg-[var(--surface-2)] text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                Levels {String(start).padStart(2, "0")}–{String(end).padStart(2, "0")}
              </button>
            );
          })}
        </div>

        {/* Page status & arrow controls */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-slate-400">
            Showing <span className="text-slate-200 font-semibold">{currentStart}–{currentEnd}</span> of {patterns.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0}
              aria-label="Previous 6 levels"
              className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-slate-300 hover:bg-[var(--surface)] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={page === totalPages - 1}
              aria-label="Next 6 levels"
              className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-slate-300 hover:bg-[var(--surface)] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Track: 2 rows × 3 columns per page */}
      <div className="overflow-hidden">
        <div
          className="flex items-start transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((group, pageIdx) => (
            <div key={pageIdx} className="w-full flex-shrink-0 px-0.5">
              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {group.map((p) => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    stats={stats}
                    now={now}
                    highlightId={highlightId}
                    detailed={detailed}
                  />
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {pages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setPage(idx)}
            aria-label={`Go to levels page ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              page === idx ? "w-6 bg-cyan-400" : "w-1.5 bg-slate-700 hover:bg-slate-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
