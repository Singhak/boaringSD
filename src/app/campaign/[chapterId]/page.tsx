"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import QuestionCard from "@/components/run/QuestionCard";
import PostMortemCard from "@/components/run/PostMortemCard";
import { MetricsStrip, RunStepper, RunTopology } from "@/components/run/RunVisuals";
import { getAllCampaignChapters, getCampaignChapterById } from "@/data/campaign";
import { getPatternByChapterId, getPatternById, getAllPatterns } from "@/data/patterns";
import { getPatternReplayVariant, getWarRoomIncident } from "@/data/scenarioPacks";
import IncidentWarRoom from "@/components/incident/IncidentWarRoom";
import SystemFlightSim from "@/components/simulation/SystemFlightSim";

import {
  clearRunProgress,
  completePatternRun,
  getRunProgress,
  markFixApplied,
  markRunStarted,
  markTransferMiss,
  nextShuffleSeed,
  readScenarioRotationState,
  saveRunProgress,
  saveScenarioRotationState,
  submitReview,
} from "@/lib/storage";
import {
  MASTERY_LABELS,
  ProgressionOutcome,
  describeEvidence,
  getEvidence,
  getEvidenceChecklist,
  getMasteryState,
  isPatternCleared,
  isPatternUnlocked,
  isReviewDue,
} from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";
import { playDeploySound, playLevelUpSound } from "@/lib/sound";
import type { CampaignChapter, PatternQuestion, RunProgress, SystemDesignPattern, UserStats } from "@/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function CampaignChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: SearchParams;
}) {
  const { chapterId } = use(params);
  const { mode } = use(searchParams);
  const chapter = getCampaignChapterById(chapterId);
  const pattern = getPatternByChapterId(chapterId);

  if (!chapter || !pattern) {
    notFound();
  }

  const stats = useUserStats();
  const total = getAllCampaignChapters().length;
  const [simMode, setSimMode] = useState<"warroom" | "flight">("warroom");

  if (stats !== null && isPatternUnlocked(stats, pattern) && mode !== "review") {
    const isGuided = mode === "study" || mode === "guided"; // "guided" kept for old links

    return (
      <div className="min-h-dvh lg:h-screen lg:max-h-screen lg:overflow-hidden text-slate-100 flex flex-col bg-[#080d19]">
        <Navbar />

        {/* Compact Navigation Bar */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-1.5 border-b border-[var(--line)] bg-[#0b1020]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/campaign"
              className="btn btn-ghost !py-1 !px-2 text-xs flex items-center gap-1.5 text-slate-400 hover:text-white shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Level map</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-cyan-300 font-semibold tracking-wide text-xs truncate">
              LEVEL {pattern.levelNumber} OF {total}: {pattern.title.toUpperCase()} {isGuided ? "(GUIDED STUDY)" : ""}
            </span>
            <span className="chip chip-warn !text-[11px] !py-0 !px-1.5 shrink-0 hidden sm:inline-flex">
              <Zap className="w-2.5 h-2.5 mr-0.5" /> {isPatternCleared(stats, pattern) ? `Replay +${pattern.rewards.replayXp} XP` : `+${pattern.rewards.firstClearXp} XP`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isGuided && pattern.levelNumber <= 2 && (
              <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setSimMode("flight")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    simMode === "flight"
                      ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ Kinetic Sim
                </button>
                <button
                  type="button"
                  onClick={() => setSimMode("warroom")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    simMode === "warroom"
                      ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🛡️ War Room
                </button>
              </div>
            )}
            {isGuided ? (
              <Link
                href={`/campaign/${chapter.id}`}
                className="btn btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span className="hidden sm:inline">Launch Live</span> War Room
              </Link>
            ) : (
              <Link
                href={`/campaign/${chapter.id}?mode=study`}
                className="btn btn-ghost !py-1 !px-2.5 text-xs text-slate-400 hover:text-white"
              >
                Switch to Guided Mode
              </Link>
            )}
          </div>
        </div>

        <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-3 flex flex-col lg:overflow-hidden">
          {isGuided ? (
            <PatternRun chapter={chapter} pattern={pattern} stats={stats} isCompactView={true} />
          ) : simMode === "flight" && pattern.levelNumber <= 2 ? (
            <SystemFlightSim
              initialIncidentId={pattern.levelNumber === 1 ? "hs-01" : "lb-01"}
              onAllCompleted={({ firstTry }) => {
                // The flight sim has no transfer question, so it earns no transfer evidence.
                completePatternRun(pattern, {
                  patternId: pattern.id,
                  diagnosisFirstTry: firstTry,
                  interventionFirstTry: firstTry,
                  transferFirstTry: null,
                  hintsUsed: 0,
                  failureReasons: firstTry ? [] : ["intervention"],
                });
              }}
            />
          ) : (
            <WarRoomLevel key={pattern.id} pattern={pattern} chapter={chapter} stats={stats} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/campaign"
            className="btn btn-ghost !px-1 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Level map</span>
          </Link>
          <span className="eyebrow">
            Level {pattern.levelNumber} of {total}
          </span>
        </div>

        {stats === null ? (
          <p role="status" className="text-sm text-slate-400 py-16 text-center">
            Loading your saved progress…
          </p>
        ) : !isPatternUnlocked(stats, pattern) ? (
          <LockedLevel pattern={pattern} />
        ) : mode === "review" ? (
          <ReviewRun chapter={chapter} pattern={pattern} stats={stats} />
        ) : (
          <div className="space-y-4">
            <div className="surface p-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="eyebrow !text-[11px] text-cyan-300">Guided Study Mode · Level {pattern.levelNumber}</span>
                <p className="text-xs text-slate-300">
                  Step-by-step conceptual walkthrough. Want real topology simulation and wrong-answer physics instead?
                </p>
              </div>
              <Link
                href={`/campaign/${chapter.id}`}
                className="btn btn-primary text-xs shrink-0 self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5" /> Launch Live Incident War Room
              </Link>
            </div>
            <PatternRun chapter={chapter} pattern={pattern} stats={stats} />
          </div>
        )}

      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// War Room: first clear plays the canonical incident, replays rotate
// ---------------------------------------------------------------------------

function WarRoomLevel({
  pattern,
  chapter,
  stats,
}: {
  pattern: SystemDesignPattern;
  chapter: CampaignChapter;
  stats: UserStats;
}) {
  const rotationKey = `warroom:${pattern.id}`;
  // Rendered only after stats load, so localStorage reads are safe here.
  const [runIndex, setRunIndex] = useState(() =>
    isPatternCleared(stats, pattern) ? (readScenarioRotationState()[rotationKey] ?? 0) + 1 : 0
  );

  useEffect(() => {
    saveScenarioRotationState(rotationKey, runIndex);
  }, [rotationKey, runIndex]);

  const incident = getWarRoomIncident(pattern.id, runIndex);

  return (
    <IncidentWarRoom
      key={`warroom-${pattern.id}-${runIndex}`}
      pattern={pattern}
      chapter={chapter}
      initialIncidentId={incident?.id || "hs-01"}
      skinSeed={runIndex > 0 ? `${pattern.id}#${runIndex}` : undefined}
      onNewRun={() => setRunIndex((i) => i + 1)}
    />
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function LevelHeader({
  chapter,
  pattern,
  reward,
}: {
  chapter: CampaignChapter;
  pattern: SystemDesignPattern;
  reward: string;
}) {
  const inherited = pattern.inherits.map((id) => getPatternById(id)?.title).filter(Boolean);
  return (
    <header className="space-y-4">
      <div className="space-y-2">
        <span className="eyebrow text-cyan-300/80">
          Level {pattern.levelNumber} · {pattern.title}
        </span>
        <h1 className="text-3xl sm:text-4xl display">{pattern.levelGoal}</h1>
        <p className="text-[15px] text-slate-400 max-w-3xl leading-relaxed">{chapter.scenario}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {inherited.length > 0 && <span className="chip">Keep working: {inherited.join(", ")}</span>}
        <span className="chip">
          <Clock className="w-3 h-3" /> ~{pattern.estimatedMinutes} min
        </span>
        <span className="chip chip-warn">
          <Zap className="w-3 h-3" /> {reward}
        </span>
      </div>
    </header>
  );
}

function LockedLevel({ pattern }: { pattern: SystemDesignPattern }) {
  const missing = pattern.prerequisites.map((id) => getPatternById(id)).filter(Boolean) as SystemDesignPattern[];
  return (
    <section className="surface p-10 text-center space-y-4 max-w-xl mx-auto">
      <span className="w-11 h-11 rounded-xl surface-2 grid place-items-center mx-auto"><Lock className="w-5 h-5 text-slate-400" /></span>
      <h1 className="text-2xl display">
        Level {pattern.levelNumber}: {pattern.levelGoal} is locked
      </h1>
      <p className="text-sm text-slate-400 max-w-lg mx-auto">
        This level builds on earlier patterns. Clear {missing.map((p) => `Level ${p.levelNumber} (${p.title})`).join(", ")} first so
        you have the architecture this level starts from.
      </p>
      {missing[0] && (
        <Link
          href={`/campaign/${missing[0].chapterId}`}
          className="btn btn-primary"
        >
          Go to Level {missing[0].levelNumber}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pattern run
// ---------------------------------------------------------------------------

function freshRun(chapterId: string): RunProgress {
  return {
    chapterId,
    stage: "observe",
    diagnosisAttempts: 0,
    interventionAttempts: 0,
    counterAttempts: 0,
    transferAttempts: 0,
    hintsUsed: 0,
    failureReasons: [],
    updatedAt: new Date().toISOString(),
  };
}

function toReplayQuestion(variant: ReturnType<typeof getPatternReplayVariant>): PatternQuestion {
  // Options come straight from the incident; QuestionCard shuffles their order.
  return {
    question: variant.question,
    options: variant.choices.map((c) => ({
      id: `${variant.id}-${c.id}`,
      label: c.label,
      isCorrect: c.correct,
      explanation: c.explanation,
    })),
  };
}

function celebrate() {
  try {
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ["#22d3ee", "#10b981", "#f59e0b"] });
  } catch {
    // Canvas unavailable
  }
}

function PatternRun({
  chapter,
  pattern,
  stats,
  isCompactView = false,
}: {
  chapter: CampaignChapter;
  pattern: SystemDesignPattern;
  stats: UserStats;
  isCompactView?: boolean;
}) {
  // Rendered only after stats load on the client, so reading localStorage here is safe.
  const [run, setRun] = useState<RunProgress>(() => {
    const saved = getRunProgress(chapter.id);
    return saved && saved.stage !== "result" ? saved : freshRun(chapter.id);
  });
  const [resumed, setResumed] = useState(() => run.stage !== "observe");
  const [fixDeployed, setFixDeployed] = useState(false);
  const [outcome, setOutcome] = useState<ProgressionOutcome | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [rotationOffset, setRotationOffset] = useState<number>(() => readScenarioRotationState()[`pattern:${pattern.id}`] ?? 0);
  const [shuffleSeed, setShuffleSeed] = useState(() => nextShuffleSeed(`run:${pattern.id}`));

  const cleared = isPatternCleared(stats, pattern);
  const reward = cleared ? `Replay: +${pattern.rewards.replayXp} XP (once a day)` : `+${pattern.rewards.firstClearXp} XP first clear`;
  const replayVariant = getPatternReplayVariant(pattern.id, rotationOffset);
  const replayQuestion = toReplayQuestion(replayVariant);

  useEffect(() => {
    saveScenarioRotationState(`pattern:${pattern.id}`, rotationOffset);
  }, [pattern.id, rotationOffset]);

  const update = (patch: Partial<RunProgress>) => {
    const next = { ...run, ...patch, updatedAt: new Date().toISOString() };
    setRun(next);
    if (next.stage === "result") clearRunProgress(chapter.id);
    else if (next.stage !== "observe") saveRunProgress(next);
  };

  const pastFix = run.stage === "counter" || run.stage === "transfer" || run.stage === "result";
  const fixed = pastFix || fixDeployed;
  const metrics = fixed ? chapter.targetMetrics : chapter.initialMetrics;

  const counterQuestion: PatternQuestion = {
    question: chapter.challenge.question,
    options: chapter.challenge.options,
  };

  const restart = () => {
    clearRunProgress(chapter.id);
    setResumed(false);
    setFixDeployed(false);
    setOutcome(null);
    setRotationOffset((current) => {
      const next = current + 1;
      saveScenarioRotationState(`pattern:${pattern.id}`, next);
      return next;
    });
    setShuffleSeed(nextShuffleSeed(`run:${pattern.id}`));
    setRun(freshRun(chapter.id));
  };

  const nextScenario = () => {
    setRotationOffset((current) => {
      const next = current + 1;
      saveScenarioRotationState(`pattern:${pattern.id}`, next);
      return next;
    });
  };

  const objective = pattern.objectives.find((o) => o.stage === run.stage);

  return (
    <div className={isCompactView ? "flex-1 min-h-0 flex flex-col justify-between overflow-hidden gap-2" : "space-y-6"}>
      {!isCompactView && <LevelHeader chapter={chapter} pattern={pattern} reward={reward} />}
      <div className="shrink-0">
        <RunStepper stage={run.stage} />
      </div>

      {resumed && run.stage !== "result" && (
        <p role="status" className="shrink-0 text-xs text-slate-300 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] animate-fadeIn">
          <span>Resumed where you left off. Earlier answers are saved.</span>
          <button type="button" onClick={restart} className="btn btn-ghost !py-0.5 !px-2 text-[11px]">
            <RotateCcw className="w-3 h-3 mr-1" /> Start over
          </button>
        </p>
      )}

      {run.stage === "result" && outcome ? (
        <div className={isCompactView ? "flex-1 min-h-0 overflow-y-auto pr-1" : ""}>
          <RunResult chapter={chapter} pattern={pattern} outcome={outcome} onReplay={restart} />
        </div>
      ) : (
        <div className={`grid grid-cols-1 lg:grid-cols-[1.1fr_1.25fr] gap-3 ${isCompactView ? "flex-1 min-h-0 items-stretch overflow-hidden" : "items-start gap-6"}`}>
          {/* Live system */}
          <section className={`space-y-3 ${isCompactView ? "flex flex-col justify-between min-h-0 space-y-2 overflow-y-auto lg:overflow-visible pr-1" : "lg:sticky lg:top-20"}`} aria-label="Live system">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="eyebrow flex items-center gap-1.5 !text-[11px]">
                <Sparkles className="w-3 h-3 text-cyan-300" /> Live system
              </h2>
              <span className={`chip !py-0 !text-[11px] ${fixed ? "chip-ok" : "chip-bad"}`}>
                <span className={`dot ${fixed ? "" : "animate-pulse-glow"}`} aria-hidden />
                {fixed ? "Stabilized" : "Degraded"}
              </span>
            </div>
            <div className="shrink-0">
              <MetricsStrip metrics={metrics} before={fixed ? chapter.initialMetrics : undefined} />
            </div>
            <div className={isCompactView ? "flex-1 min-h-0 flex flex-col justify-center" : ""}>
              <RunTopology patternId={pattern.id} fixed={fixed} />
            </div>
          </section>

          {/* Current stage */}
          <section className={`surface ${isCompactView ? "p-3 sm:p-4 flex flex-col justify-between min-h-0 overflow-y-auto rounded-xl border border-[var(--line)] space-y-2" : "p-5 sm:p-7 space-y-5"}`} aria-live="polite">
            {objective && (
              <p className="shrink-0 text-[11px] text-slate-500 pb-1 border-b border-[var(--line)]">
                Objective · <span className="text-slate-200">{objective.label}</span>
              </p>
            )}

            {run.stage === "observe" && (
              isCompactView ? (
                <div className="space-y-2 flex-1 min-h-0 flex flex-col justify-between">
                  <div className="space-y-0.5 shrink-0">
                    <span className="eyebrow text-cyan-300/80 !text-[11px]">Observe · New Constraint</span>
                    <h2 className="text-lg sm:text-xl display font-bold leading-tight text-white">{pattern.levelGoal}</h2>
                    <p className="text-[12px] sm:text-[13px] text-slate-300 leading-snug line-clamp-2">{chapter.scenario}</p>
                    <p className="text-[11px] text-slate-400">Constraint: <span className="text-slate-200">{pattern.newConstraint}</span></p>
                  </div>
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-2.5 space-y-1 flex-1 min-h-0 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow text-cyan-300/80 !text-[11px]">Fresh replay variant</p>
                      <button type="button" onClick={nextScenario} className="btn btn-ghost !px-1.5 !py-0.5 text-[11px]">
                        Next scenario
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-white leading-tight">{replayVariant.title}</h3>
                    <p className="text-xs text-slate-300 leading-snug line-clamp-2">{replayVariant.context}</p>
                  </div>
                  {cleared && (
                    <p className="shrink-0 text-[11px] text-emerald-200/90 px-2.5 py-1 rounded-lg bg-emerald-400/[0.06] border border-emerald-400/20">
                      Cleared before. Replaying pays +{pattern.rewards.replayXp} XP once a day.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      markRunStarted(pattern.id);
                      update({ stage: "diagnose" });
                    }}
                    className="btn btn-primary btn-md w-full justify-center shrink-0 !py-2 text-xs sm:text-sm font-medium"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start diagnosis
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="eyebrow text-cyan-300/80">Observe</span>
                  <p className="text-[15px] text-slate-200 leading-relaxed">
                    Look at the metrics and the system diagram. Something is failing. Before you touch anything, work out what.
                  </p>
                  <p className="text-[13px] text-slate-400">
                    New constraint this level: <span className="text-slate-200">{pattern.newConstraint}</span>
                  </p>
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="eyebrow text-cyan-300/80">Fresh replay variant</p>
                      <button type="button" onClick={nextScenario} className="btn btn-ghost !px-2 !py-1 text-[11px]">
                        Next scenario
                      </button>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-white">{replayVariant.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">{replayVariant.context}</p>
                    <p className="mt-2 text-[12px] text-slate-400">Constraint: {replayVariant.constraint}</p>
                  </div>
                  {cleared && (
                    <p className="text-[13px] text-emerald-200/90 px-3 py-2.5 rounded-lg bg-emerald-400/[0.06] border border-emerald-400/20">
                      You have cleared this level before. Replaying is good practice; it pays +{pattern.rewards.replayXp} XP once a day.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      markRunStarted(pattern.id);
                      update({ stage: "diagnose" });
                    }}
                    className="btn btn-primary btn-lg"
                  >
                    <Play className="w-4 h-4" />
                    Start diagnosis
                  </button>
                </div>
              )
            )}

            {run.stage === "diagnose" && (
              <div className={isCompactView ? "flex-1 min-h-0 overflow-y-auto pr-0.5" : ""}>
                <QuestionCard
                  key={`diagnose-${replayVariant.id}`}
                  shuffleSeed={shuffleSeed}
                  eyebrow={`Diagnose · Incident: ${replayVariant.title}`}
                  context={replayVariant.context}
                  question={replayQuestion}
                  submitLabel="Lock in diagnosis"
                  continueLabel="Choose a fix"
                  onAnswer={(opt, attempt) =>
                    update({
                      diagnosisAttempts: attempt,
                      failureReasons: opt.isCorrect ? run.failureReasons : [...run.failureReasons, "diagnosis"],
                    })
                  }
                  onContinue={() => update({ stage: "choose" })}
                />
              </div>
            )}

            {run.stage === "choose" && (
              <div className={isCompactView ? "flex-1 min-h-0 overflow-y-auto pr-0.5" : ""}>
                <QuestionCard
                  key="choose"
                  shuffleSeed={shuffleSeed}
                  eyebrow="Deploy a fix"
                  question={pattern.intervention}
                  submitLabel="Deploy this change"
                  continueLabel="Continue"
                  onAnswer={(opt, attempt) => {
                    update({
                      interventionAttempts: attempt,
                      failureReasons: opt.isCorrect ? run.failureReasons : [...run.failureReasons, "intervention"],
                    });
                    if (opt.isCorrect) {
                      playDeploySound();
                      setFixDeployed(true);
                      markFixApplied(pattern.id);
                    }
                  }}
                  afterCorrect={
                    <div className="p-2.5 rounded-lg bg-black/20 border border-[var(--line)] text-slate-300 text-xs space-y-1">
                      <p className="font-medium text-white">Verify: compare the metrics.</p>
                      <p>
                        CPU {chapter.initialMetrics.cpuUsage}% → {chapter.targetMetrics.cpuUsage}%, latency{" "}
                        {chapter.initialMetrics.latencyMs.toLocaleString()}ms → {chapter.targetMetrics.latencyMs.toLocaleString()}ms,
                        errors {chapter.initialMetrics.errorRate}% → {chapter.targetMetrics.errorRate}%.
                      </p>
                      <p className="text-amber-200/80">Hold on. Fixes have side effects.</p>
                    </div>
                  }
                  onContinue={() => update({ stage: "counter" })}
                />
              </div>
            )}

            {run.stage === "counter" && (
              <div className={isCompactView ? "flex-1 min-h-0 overflow-y-auto pr-0.5" : ""}>
                <QuestionCard
                  key="counter"
                  shuffleSeed={shuffleSeed}
                  eyebrow="Tradeoff counter-strike"
                  title={chapter.challenge.title}
                  context={chapter.challenge.scenario}
                  question={counterQuestion}
                  hints={chapter.challenge.hints}
                  onHint={() => update({ hintsUsed: run.hintsUsed + 1 })}
                  submitLabel="Submit decision"
                  continueLabel="One more: new situation"
                  onAnswer={(opt, attempt) =>
                    update({
                      counterAttempts: attempt,
                      failureReasons: opt.isCorrect ? run.failureReasons : [...run.failureReasons, "counter"],
                    })
                  }
                  onContinue={() => update({ stage: "transfer" })}
                />
              </div>
            )}

            {run.stage === "transfer" && (
              <div className={isCompactView ? "flex-1 min-h-0 overflow-y-auto pr-0.5" : ""}>
                <QuestionCard
                  key="transfer"
                  shuffleSeed={shuffleSeed}
                  eyebrow="Transfer: same pattern, different product"
                  question={pattern.transfer}
                  submitLabel="Check my answer"
                  continueLabel="See the result"
                  onAnswer={(opt, attempt) => {
                    if (!opt.isCorrect) {
                      markTransferMiss(pattern.id);
                      update({ transferAttempts: attempt, failureReasons: [...run.failureReasons, "transfer"] });
                      return;
                    }
                    const out = completePatternRun(pattern, {
                      patternId: pattern.id,
                      diagnosisFirstTry: run.diagnosisAttempts === 1,
                      interventionFirstTry: run.interventionAttempts === 1,
                      transferFirstTry: attempt === 1,
                      hintsUsed: run.hintsUsed,
                      failureReasons: run.failureReasons,
                    });
                    setOutcome(out);
                    clearRunProgress(chapter.id);
                    celebrate();
                    if (out.leveledUp) {
                      setTimeout(() => {
                        setLevelUp(out.stats.level);
                        playLevelUpSound();
                      }, 600);
                    }
                  }}
                  onContinue={() => update({ stage: "result" })}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {levelUp !== null && outcome && (
        <LevelUpModal
          isOpen={true}
          title={`Rank Promoted to Level ${levelUp}!`}
          subtitle={`You cleared Level ${pattern.levelNumber}: ${pattern.levelGoal}.`}
          xpEarned={outcome.xpAwarded}
          onClose={() => setLevelUp(null)}
          onNext={() => {
            setLevelUp(null);
            update({ stage: "result" });
          }}
          nextLabel="See the result"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result: post-mortem, what was learned, honest evidence, next step
// ---------------------------------------------------------------------------

function RunResult({
  chapter,
  pattern,
  outcome,
  onReplay,
}: {
  chapter: CampaignChapter;
  pattern: SystemDesignPattern;
  outcome: ProgressionOutcome;
  onReplay: () => void;
}) {
  const now = new Date();
  const stats = outcome.stats;
  const evidence = getEvidence(stats, pattern.id);
  const state = getMasteryState(evidence, now);
  const nextPattern = getAllPatterns().find((p) => p.levelNumber === pattern.levelNumber + 1);
  const nextUnlocked = nextPattern ? isPatternUnlocked(stats, nextPattern) : false;
  const builderDone = evidence.builderPasses > 0;

  return (
    <section className="space-y-6">
      <div className="surface p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 !border-emerald-400/25 animate-fadeIn" role="status">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-emerald-400/10 border border-emerald-400/30 grid place-items-center"><CheckCircle2 className="w-5 h-5 text-emerald-300" /></span>
          <div>
            <h2 className="text-xl display">Level {pattern.levelNumber} cleared</h2>
            <p className="text-[13px] text-slate-400 num">
              {outcome.xpAwarded > 0
                ? `+${outcome.xpAwarded} XP${outcome.firstClear ? " (first clear)" : " (replay)"}`
                : "No XP this time: replay XP is paid once a day. Your practice still counts."}
            </p>
          </div>
        </div>
        <span className="chip chip-accent">
          {MASTERY_LABELS[state]} · {describeEvidence(evidence, now)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <PostMortemCard
          data={{
            incidentId: `INC-${String(chapter.chapterNumber).padStart(3, "0")}`,
            title: chapter.title,
            impact: chapter.scenario,
            rootCause: pattern.tradeoff.whatFailed,
            fix: pattern.tradeoff.whyFixWorked,
            followUp: pattern.tradeoff.insufficientWhen,
            before: {
              latencyMs: chapter.initialMetrics.latencyMs,
              errorRate: chapter.initialMetrics.errorRate,
              cpu: chapter.initialMetrics.cpuUsage,
            },
            after: {
              latencyMs: chapter.targetMetrics.latencyMs,
              errorRate: chapter.targetMetrics.errorRate,
              cpu: chapter.targetMetrics.cpuUsage,
            },
          }}
        />

        <div className="space-y-4">
          <dl className="surface p-5 space-y-4 text-[13px] leading-relaxed">
            <div>
              <dt className="flex items-center gap-2 text-rose-300 font-medium"><span className="dot" aria-hidden />What failed?</dt>
              <dd className="text-slate-300 pl-3.5 mt-1">{pattern.tradeoff.whatFailed}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-emerald-300 font-medium"><span className="dot" aria-hidden />Why did the fix work?</dt>
              <dd className="text-slate-300 pl-3.5 mt-1">{pattern.tradeoff.whyFixWorked}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-amber-300 font-medium"><span className="dot" aria-hidden />When is it not enough?</dt>
              <dd className="text-slate-300 pl-3.5 mt-1">{pattern.tradeoff.insufficientWhen}</dd>
            </div>
          </dl>

          <div className="surface p-5 space-y-3">
            <h3 className="eyebrow">Evidence · {pattern.title}</h3>
            <ul className="space-y-2 text-[13px]">
              {getEvidenceChecklist(evidence).map((c) => (
                <li key={c.id} className={`flex items-center gap-2 ${c.done ? "text-emerald-300" : "text-slate-400"}`}>
                  {c.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                  {c.label}
                  <span className="sr-only">{c.done ? "done" : "not yet"}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500">
              A pattern becomes Reliable only after a builder pass and a successful review a day or more later.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-accent p-5 sm:p-6 space-y-4">
        <p className="text-[15px] text-slate-200">{pattern.nextHook}</p>
        <div className="flex flex-wrap items-center gap-3">
          {!builderDone ? (
            <Link
              href={`/builder?scenario=${pattern.builderScenarioId}`}
              className="btn btn-primary btn-lg"
            >
              <Swords className="w-4 h-4" />
              Prove it in the builder (+{pattern.rewards.builderXp} XP)
            </Link>
          ) : null}
          {nextPattern && nextUnlocked && (
            <Link
              href={`/campaign/${nextPattern.chapterId}`}
              className={`btn btn-lg ${builderDone ? "btn-primary" : "btn-secondary"}`}
            >
              Level {nextPattern.levelNumber}: {nextPattern.levelGoal}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={onReplay}
            className="btn btn-ghost"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay run
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Review (spaced recall)
// ---------------------------------------------------------------------------

function ReviewRun({
  chapter,
  pattern,
  stats,
}: {
  chapter: CampaignChapter;
  pattern: SystemDesignPattern;
  stats: UserStats;
}) {
  const rotationOffset = readScenarioRotationState()[`pattern:${pattern.id}`] ?? 0;
  const reviewVariant = getPatternReplayVariant(pattern.id, rotationOffset + 1);
  const reviewVariantQuestion = toReplayQuestion(reviewVariant);

  const questions: { eyebrow: string; q: PatternQuestion }[] = [
    { eyebrow: "Recall 1 of 2 · Core Principle", q: pattern.review },
    { eyebrow: `Recall 2 of 2 · Incident: ${reviewVariant.title}`, q: reviewVariantQuestion },
  ];
  const [index, setIndex] = useState(0);
  const [shuffleSeed] = useState(() => nextShuffleSeed(`review:${pattern.id}`));
  const [allFirstTry, setAllFirstTry] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof submitReview> | null>(null);
  const [passed, setPassed] = useState(false);

  const evidence = getEvidence(stats, pattern.id);
  const due = isReviewDue(evidence, new Date());

  if (!isPatternCleared(stats, pattern)) {
    return (
      <section className="surface p-10 text-center space-y-3 max-w-xl mx-auto">
        <h1 className="text-xl display">Nothing to review yet</h1>
        <p className="text-sm text-slate-400">Clear Level {pattern.levelNumber} first. Reviews check what you have already practiced.</p>
        <Link href={`/campaign/${chapter.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200">
          Start Level {pattern.levelNumber} <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    );
  }

  const finish = (firstTry: boolean) => {
    const ok = allFirstTry && firstTry;
    setPassed(ok);
    setResult(submitReview(pattern, ok));
  };

  return (
    <section className="max-w-2xl mx-auto space-y-5">
      <header className="space-y-1">
        <span className="eyebrow text-amber-300/80">Review · {pattern.title}</span>
        <h1 className="text-3xl display">What do you still remember?</h1>
        <p className="text-xs text-slate-400">
          {due
            ? "Answer both on the first try to pass. No hints: this checks recall."
            : "This review is not due yet. You can practice, but it will not count as recall."}
        </p>
      </header>

      {result ? (
        <div role="status" className="surface p-6 space-y-3 text-sm animate-fadeIn">
          {result.early ? (
            <p className="text-slate-300">Practice logged. Come back when the review is due for it to count toward Reliable.</p>
          ) : passed ? (
            <p className="text-emerald-300 font-bold">
              Recalled. {result.xpAwarded > 0 ? `+${result.xpAwarded} XP. ` : ""}
              {describeEvidence(getEvidence(result.stats, pattern.id), new Date())}.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-rose-300 font-bold">Not solid yet. The review stays due.</p>
              <p className="text-slate-400 text-xs">Recovery step: replay the level run, then try the review again.</p>
              <Link href={`/campaign/${chapter.id}`} className="inline-flex items-center gap-2 text-xs font-medium text-cyan-300 hover:text-cyan-200">
                Replay Level {pattern.levelNumber} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
          <Link href="/dashboard" className="btn btn-ghost !px-0 text-xs">
            Back to home <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="surface p-5 sm:p-7">
          <QuestionCard
            key={index}
            shuffleSeed={shuffleSeed}
            eyebrow={questions[index].eyebrow}
            question={questions[index].q}
            submitLabel="Submit"
            continueLabel={index < questions.length - 1 ? "Next question" : "Finish review"}
            onAnswer={(opt, attempt) => {
              if (attempt === 1 && !opt.isCorrect) setAllFirstTry(false);
            }}
            onContinue={() => {
              if (index < questions.length - 1) setIndex(index + 1);
              else finish(true);
            }}
          />
        </div>
      )}
    </section>
  );
}
