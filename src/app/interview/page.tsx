"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calculator,
  Check,
  FileCheck,
  Layers,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import FeatureGate from "@/components/FeatureGate";
import LevelUpModal from "@/components/LevelUpModal";
import ScenarioTabs from "@/components/run/ScenarioTabs";
import ArchitectureCanvas, { makeArchNode } from "@/components/builder/ArchitectureCanvas";
import type { Edge, Node } from "@xyflow/react";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import InterviewScopeStep from "@/components/interview/InterviewScopeStep";
import InterviewMathStep from "@/components/interview/InterviewMathStep";
import { completeInterview, saveInterviewResult } from "@/lib/storage";
import { deterministicShuffle } from "@/lib/shuffle";
import ReasoningCard from "@/components/run/ReasoningCard";
import { getInterviewReasoningPrompt } from "@/data/reasoningPrompts";
import { playBlipSound, playErrorSound, playLevelUpSound } from "@/lib/sound";
import { designFromGraph, evaluateArchitecture, unwiredNodeIds, type Design } from "@/lib/interviewDesign";

/** Every interview starts from users and a database; the candidate draws the rest. */
const START_NODES: Node[] = [
  makeArchNode("users", "client", "Users", 0, 120),
  makeArchNode("primary-db", "database", "Primary DB", 720, 120),
];
const START_GRAPH: { nodes: Node[]; edges: Edge[] } = { nodes: START_NODES, edges: [] };

const READOUT: { label: string; on: (d: Design) => boolean }[] = [
  { label: "CDN", on: (d) => d.hasCDN },
  { label: "Load balancer", on: (d) => d.hasLB },
  { label: "Cache", on: (d) => d.hasCache },
  { label: "Queue", on: (d) => d.hasQueue },
  { label: "Database", on: (d) => d.hasDatabase },
  { label: "Replicas", on: (d) => d.hasReplica },
];

const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

type InterviewStage = "scope" | "math" | "design" | "followup" | "scorecard";

const STAGES: { key: InterviewStage; label: string; icon: React.ElementType }[] = [
  { key: "scope", label: "1. Scope & Constraints", icon: FileCheck },
  { key: "math", label: "2. Capacity Math", icon: Calculator },
  { key: "design", label: "3. Topology Design", icon: Layers },
  { key: "followup", label: "4. Staff Deep Dive", icon: MessageSquare },
  { key: "scorecard", label: "Scorecard", icon: Award },
];

/** Points deducted from the final score when the pager countdown hits zero. */
const OVERTIME_PENALTY = 10;

function InterviewPageContent() {
  const [problemId, setProblemId] = useState(INTERVIEW_PROBLEMS[0].id);
  const problem = INTERVIEW_PROBLEMS.find((p) => p.id === problemId) ?? INTERVIEW_PROBLEMS[0];

  const [secondsLeft, setSecondsLeft] = useState(problem.durationMinutes * 60);
  const [hintsShown, setHintsShown] = useState(0);
  // The drawn topology survives stage switches; the graded Design is derived from its wiring.
  const [graph, setGraph] = useState(START_GRAPH);
  const design: Design = useMemo(() => designFromGraph(graph.nodes, graph.edges), [graph]);
  const unwired = useMemo(() => unwiredNodeIds(graph.nodes, graph.edges).length, [graph]);
  // Bumped on reset so the canvas remounts from the starting graph.
  const [canvasKey, setCanvasKey] = useState(0);
  const [stage, setStage] = useState<InterviewStage>(
    problem.scopeItems && problem.scopeItems.length > 0 ? "scope" : "design"
  );

  // 4 Pillar Scores
  const [scopeScore, setScopeScore] = useState<number>(100);
  const [mathScore, setMathScore] = useState<number>(100);
  const [followUpScore, setFollowUpScore] = useState<number>(100);

  const [selectedFollowUps, setSelectedFollowUps] = useState<Record<string, string>>({});
  const [followUpErrors, setFollowUpErrors] = useState<Record<string, string>>({});
  // Follow-ups are scored on the first submission; after that the learner sees feedback and can finish.
  const [followUpsGraded, setFollowUpsGraded] = useState(false);
  const [defenseDone, setDefenseDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Countdown timer runs until final scorecard or time expires
  useEffect(() => {
    if (stage === "scorecard" || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [stage, secondsLeft]);

  const reset = (id?: string) => {
    const target = id ? INTERVIEW_PROBLEMS.find((p) => p.id === id) ?? INTERVIEW_PROBLEMS[0] : problem;
    if (id) setProblemId(id);
    setSecondsLeft(target.durationMinutes * 60);
    setHintsShown(0);
    setGraph(START_GRAPH);
    setCanvasKey((k) => k + 1);
    setStage(target.scopeItems && target.scopeItems.length > 0 ? "scope" : "design");
    setScopeScore(100);
    setMathScore(100);
    setFollowUpScore(100);
    setSelectedFollowUps({});
    setFollowUpErrors({});
    setFollowUpsGraded(false);
    setDefenseDone(false);
    setCelebrate(false);
  };

  const onGraphChange = (nodes: Node[], edges: Edge[]) => setGraph({ nodes, edges });

  const archEvaluation = evaluateArchitecture(problem, design);

  // Stage 1 -> Stage 2
  const handleScopeComplete = (score: number) => {
    setScopeScore(score);
    if (problem.estimationTargets && problem.estimationTargets.length > 0) {
      setStage("math");
    } else {
      setStage("design");
    }
  };

  // Stage 2 -> Stage 3
  const handleMathComplete = (score: number) => {
    setMathScore(score);
    setStage("design");
  };

  // Stage 3 -> Stage 4
  const handleProceedToFollowUps = () => {
    if (problem.followUpQuestions && problem.followUpQuestions.length > 0) {
      playBlipSound();
      setStage("followup");
    } else {
      finishInterview(100);
    }
  };

  const handleFollowUpSelect = (questionId: string, optionId: string) => {
    playBlipSound();
    setSelectedFollowUps((prev) => ({ ...prev, [questionId]: optionId }));
    setFollowUpErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const submitFollowUps = () => {
    const followUps = problem.followUpQuestions ?? [];

    // Second click after feedback: finish with the first-attempt score.
    if (followUpsGraded) {
      finishInterview(followUpScore);
      return;
    }

    const unanswered = followUps.filter((q) => !selectedFollowUps[q.id]);
    if (unanswered.length > 0) {
      const newErrors: Record<string, string> = {};
      unanswered.forEach((q) => {
        newErrors[q.id] = "Pick an answer to defend your design.";
      });
      playErrorSound();
      setFollowUpErrors(newErrors);
      return;
    }

    let correctCount = 0;
    const newErrors: Record<string, string> = {};
    followUps.forEach((q) => {
      const opt = q.options.find((o) => o.id === selectedFollowUps[q.id]);
      if (opt?.isCorrect) correctCount++;
      else newErrors[q.id] = opt?.feedback || "Not quite right. Reconsider the engineering tradeoffs.";
    });

    const firstAttemptScore = Math.round((correctCount / Math.max(followUps.length, 1)) * 100);
    setFollowUpScore(firstAttemptScore);

    if (Object.keys(newErrors).length > 0) {
      // Show why, and let them finish; the score keeps what they got right first time.
      playErrorSound();
      setFollowUpErrors(newErrors);
      setFollowUpsGraded(true);
      return;
    }
    finishInterview(firstAttemptScore);
  };

  // Overall Score calculation: 25% scope, 25% math, 25% architecture, 25% follow-up defense
  const hasScope = !!(problem.scopeItems && problem.scopeItems.length > 0);
  const hasMath = !!(problem.estimationTargets && problem.estimationTargets.length > 0);
  const hasFollowUp = !!(problem.followUpQuestions && problem.followUpQuestions.length > 0);

  let activeWeightsSum = 25; // architecture is always present
  if (hasScope) activeWeightsSum += 25;
  if (hasMath) activeWeightsSum += 25;
  if (hasFollowUp) activeWeightsSum += 25;

  const totalPoints =
    (hasScope ? scopeScore * 0.25 : 0) +
    (hasMath ? mathScore * 0.25 : 0) +
    archEvaluation.score * 0.25 +
    (hasFollowUp ? followUpScore * 0.25 : 0);

  // Pager countdown: running out of time costs points but never blocks finishing.
  const overtimePenalty = secondsLeft === 0 ? OVERTIME_PENALTY : 0;
  const finalWeightedScore = Math.max(0, Math.round((totalPoints / activeWeightsSum) * 100) - overtimePenalty);

  const finishInterview = (currentFollowUpScore?: number) => {
    setStage("scorecard");
    const deepDive = currentFollowUpScore ?? followUpScore;
    const evaluatedFinalScore = Math.max(
      0,
      Math.round(
        (((hasScope ? scopeScore * 0.25 : 0) +
          (hasMath ? mathScore * 0.25 : 0) +
          archEvaluation.score * 0.25 +
          (hasFollowUp ? deepDive * 0.25 : 0)) /
          activeWeightsSum) *
          100
      ) - overtimePenalty
    );

    saveInterviewResult(problem.id, {
      ...(hasScope ? { scope: scopeScore } : {}),
      ...(hasMath ? { math: mathScore } : {}),
      design: archEvaluation.score,
      ...(hasFollowUp ? { deepDive } : {}),
      total: evaluatedFinalScore,
    });

    if (evaluatedFinalScore >= 70 && archEvaluation.passed) {
      playLevelUpSound();
      completeInterview(problem.id, problem.rewardXp);
      setTimeout(() => setCelebrate(true), 700);
    } else {
      playErrorSound();
    }
  };

  const interviewPrompt = getInterviewReasoningPrompt(problem.id);
  const lowTime = secondsLeft < 120;
  const timeUp = secondsLeft === 0;

  // Determine candidate recommendation level based on 4-pillar final score
  const hireRecommendation =
    finalWeightedScore >= 90
      ? { label: "Interview-ready on this problem", color: "chip-ok", desc: "Tight scope, sound estimates, no single points of failure, and a confident tradeoff defense. Try a harder problem next." }
      : finalWeightedScore >= 75
      ? { label: "Solid practice run", color: "chip-ok", desc: "The core design holds. Your weakest pillar below is the fastest way to a higher score." }
      : { label: "Needs another pass", color: "chip-bad", desc: "Something important slipped: a capacity bottleneck, scope creep, or an unhandled single point of failure. Check the pillars below." };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* Navigation & Problem Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="btn btn-ghost !px-1 text-xs">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <ScenarioTabs
            items={INTERVIEW_PROBLEMS.map((p) => ({
              id: p.id,
              label: p.title.replace(/^Design\s*/i, "").replace(/\(.*?\)/g, "").trim(),
            }))}
            activeId={problem.id}
            onSelect={(id) => id !== problem.id && reset(id)}
          />
        </div>

        {/* 4-Stage Stepper Bar */}
        <nav aria-label="Interview Progress" className="surface p-2.5 rounded-xl border border-[var(--line)]">
          <div className="flex items-center justify-between overflow-x-auto gap-2 text-xs">
            {STAGES.map((s, idx) => {
              const Icon = s.icon;
              const isCurrent = stage === s.key;
              const stageOrder = ["scope", "math", "design", "followup", "scorecard"];
              const currentIndex = stageOrder.indexOf(stage);
              const stepIndex = stageOrder.indexOf(s.key);
              const isCompleted = stepIndex < currentIndex;

              return (
                <div key={s.key} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isCurrent
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_-4px_rgba(6,182,212,0.4)]"
                        : isCompleted
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-slate-500"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                    {isCompleted && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  {idx < STAGES.length - 1 && <span className="text-slate-700">──►</span>}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Problem Header */}
        <header className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-start">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow text-cyan-300/80">FAANG Mock Interview Arena · {problem.tier}</span>
              <span className="chip text-[11px] font-medium">{problem.difficulty}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl display">{problem.title}</h1>
            <p className="text-[15px] text-slate-400 leading-relaxed">{problem.scenario}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="chip chip-warn">
                <Zap className="w-3 h-3" /> <span className="num">+{problem.rewardXp} XP</span>
              </span>
              <span className="chip">Pass Benchmark: 70/100</span>
              <span className="chip chip-accent">
                Stage: {stage.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Countdown Clock */}
          <div
            className={`surface !rounded-xl px-5 py-4 min-w-[170px] ${lowTime && stage !== "scorecard" ? "!border-rose-400/40" : ""}`}
            role="timer"
            aria-live={lowTime ? "polite" : "off"}
            aria-label={`Time left ${formatTime(secondsLeft)}`}
          >
            <span className="eyebrow flex items-center gap-1.5">
              <Timer className="w-3 h-3" aria-hidden />
              {stage === "scorecard" ? "Interview Finished" : timeUp ? `Time's up · −${OVERTIME_PENALTY} pts` : "Time Remaining"}
            </span>
            <div className={`num text-3xl mt-1 ${stage === "scorecard" ? "text-slate-500" : lowTime ? "text-rose-300" : "text-white"}`}>
              {formatTime(secondsLeft)}
            </div>
            {stage !== "scorecard" && (
              <div className="pt-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  Target: {problem.durationMinutes}m Session
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Specifications strip */}
        <dl className="surface grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] overflow-hidden !rounded-xl">
          {[
            ["Traffic Scale", problem.trafficScale],
            ["Latency Target", problem.latencyConstraint],
            ["Data Scale", problem.storageScale],
          ].map(([k, v]) => (
            <div key={k} className="p-4 space-y-1">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-[13px] text-slate-200 leading-relaxed font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        {/* ========================================================================= */}
        {/* STAGE 1: Scope & Clarification */}
        {/* ========================================================================= */}
        {stage === "scope" && (
          <InterviewScopeStep problem={problem} onComplete={handleScopeComplete} />
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: Capacity Estimation */}
        {/* ========================================================================= */}
        {stage === "math" && (
          <InterviewMathStep
            problem={problem}
            onBack={() => setStage("scope")}
            onComplete={handleMathComplete}
          />
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: High-Level Architecture Design */}
        {/* ========================================================================= */}
        {stage === "design" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start animate-fadeIn">
            {/* Design Builder */}
            <section className="surface p-5 sm:p-6 space-y-5" aria-label="Your design">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="chip text-[11px]">Step 3 of 4</span>
                    <h2 className="text-lg display">Assemble Your Architecture</h2>
                  </div>
                  <p className="text-[13px] text-slate-500">
                    Draw the topology you will defend. Only components wired into the path from Users count.
                  </p>
                </div>
                <button onClick={() => reset()} className="btn btn-ghost !py-1 text-xs shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              <ArchitectureCanvas key={`${problem.id}-${canvasKey}`} initialNodes={graph.nodes} initialEdges={graph.edges} onChange={onGraphChange} />

              {/* What the panel grades: only components wired into the request path */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]" aria-live="polite">
                <span className="eyebrow mr-1">Panel sees</span>
                <span className={`chip ${design.serverCount >= 2 ? "chip-ok" : design.serverCount === 1 ? "chip-warn" : ""}`}>
                  <span className="num">{design.serverCount}</span> server{design.serverCount === 1 ? "" : "s"}
                </span>
                {READOUT.map((r) => (
                  <span key={r.label} className={`chip ${r.on(design) ? "chip-ok" : "opacity-50"}`}>
                    {r.on(design) ? <Check className="w-3 h-3" aria-hidden /> : <X className="w-3 h-3" aria-hidden />}
                    {r.label}
                  </span>
                ))}
                {unwired > 0 && (
                  <span className="chip chip-warn">
                    {unwired} unwired component{unwired === 1 ? "" : "s"} earn nothing
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setStage(hasMath ? "math" : "scope")}
                  className="btn btn-ghost text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Math
                </button>
                <button onClick={handleProceedToFollowUps} className="btn btn-primary">
                  Submit Architecture & Defend
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* Sidebar: Interviewer Hints & Checklist */}
            <aside className="space-y-4" aria-label="Interviewer guidelines">
              <section className="surface p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-300" aria-hidden />
                    Interview Rubric
                  </h2>
                  <span className="text-xs text-slate-500">{problem.checklist.length} evaluation points</span>
                </div>
                <ul className="space-y-2.5">
                  {problem.checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="surface p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-300/80" aria-hidden />
                    Interviewer Hints
                  </h2>
                  <span className="num text-xs text-slate-500">
                    {hintsShown}/{problem.hints.length}
                  </span>
                </div>
                {hintsShown === 0 && (
                  <p className="text-[13px] text-slate-500">Interviewers expect proactive questions. Reveal a hint if you need guidance.</p>
                )}
                <ol className="space-y-2">
                  {problem.hints.slice(0, hintsShown).map((h, i) => (
                    <li key={i} className="text-[13px] text-slate-300 leading-relaxed animate-fadeIn">
                      <span className="num text-slate-500 mr-1.5">{i + 1}.</span>
                      {h}
                    </li>
                  ))}
                </ol>
                {hintsShown < problem.hints.length && (
                  <button
                    onClick={() => {
                      playBlipSound();
                      setHintsShown((n) => n + 1);
                    }}
                    className="btn btn-ghost !px-0 text-xs"
                  >
                    {hintsShown === 0 ? "Ask for a hint" : "Ask another hint"}
                  </button>
                )}
              </section>
            </aside>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: Deep-Dive Follow-Up Questions from Interviewer */}
        {/* ========================================================================= */}
        {stage === "followup" && (
          <section className="surface p-6 sm:p-8 space-y-6 animate-fadeIn" aria-label="Follow up round">
            <header className="space-y-2 border-b border-[var(--line)] pb-5">
              <div className="flex items-center gap-2">
                <span className="chip chip-warn text-[11px]">Stage 4 of 4 · Staff Defense</span>
                <span className="chip">Failure Modes & Concurrency</span>
              </div>
              <h2 className="text-2xl display">Interviewer Deep-Dive Questions</h2>
              <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
                The interviewer looks over your preliminary architecture. Now they probe your understanding of failure modes, race conditions, and scaling bottlenecks. Choose the optimal engineering rationale for each challenge.
              </p>
            </header>

            <div className="space-y-7">
              {problem.followUpQuestions?.map((q, idx) => {
                const picked = selectedFollowUps[q.id];
                const error = followUpErrors[q.id];
                return (
                  <article key={q.id} className="surface-2 p-5 rounded-xl space-y-4 border border-[var(--line)]">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-400/10 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        Q{idx + 1}
                      </div>
                      <p className="text-sm sm:text-[15px] text-white font-medium leading-relaxed">
                        {q.interviewerPrompt}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 pl-0 sm:pl-10">
                      {deterministicShuffle(q.options, q.id).map((opt) => {
                        const isSelected = picked === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleFollowUpSelect(q.id, opt.id)}
                            className={`p-3.5 rounded-lg text-left text-xs sm:text-[13px] leading-relaxed transition-all flex items-start gap-3 ${
                              isSelected
                                ? "bg-cyan-500/15 border border-cyan-400/60 text-white shadow-[0_0_15px_-4px_rgba(6,182,212,0.4)]"
                                : "bg-[var(--surface-3)] border border-[var(--line)] text-slate-300 hover:border-slate-500 hover:text-white"
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

                    {error && (
                      <p className="text-xs text-rose-300 pl-0 sm:pl-10 flex items-center gap-1.5 animate-fadeIn">
                        <X className="w-3.5 h-3.5 shrink-0" />
                        {error}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
              <button onClick={() => setStage("design")} className="btn btn-ghost">
                <ArrowLeft className="w-4 h-4" />
                Back to Architecture
              </button>
              <button onClick={submitFollowUps} className="btn btn-primary">
                {followUpsGraded ? "Finish with this score" : "Finalize & Generate Scorecard"}
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* STAGE 5: Comprehensive 4-Pillar Interview Scorecard */}
        {/* ========================================================================= */}
        {stage === "scorecard" && (
          <section className="space-y-6 animate-fadeIn" aria-label="Interview scorecard">
            <article className="surface p-6 sm:p-8 rounded-2xl space-y-6 border border-cyan-400/30 shadow-[0_20px_60px_-20px_rgba(6,182,212,0.2)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-6">
                <div className="space-y-2">
                  <span className="eyebrow text-cyan-300">FAANG Hiring Committee Evaluation Report</span>
                  <h2 className="text-2xl sm:text-3xl display">{problem.title}</h2>
                  <p className="text-sm text-slate-400 max-w-xl">{hireRecommendation.desc}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="eyebrow">Overall Score</span>
                    <div className="num text-4xl text-white font-bold mt-1">
                      {finalWeightedScore}
                      <span className="text-sm text-slate-500 font-normal"> / 100</span>
                    </div>
                  </div>
                  <span className={`chip ${hireRecommendation.color} text-sm px-3 py-1.5 font-semibold`}>
                    {hireRecommendation.label}
                  </span>
                </div>
              </div>

              {/* 4-Pillar Competency Breakdown */}
              <div className="space-y-3">
                <h3 className="eyebrow text-slate-300">4-Pillar Evaluation Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "1. Scoping Discipline", score: scopeScore, desc: "Clarified constraints & rejected distractor scope" },
                    { label: "2. Capacity Estimation", score: mathScore, desc: "QPS, 5-yr storage & RAM cache sizing" },
                    { label: "3. Architecture & SPOF", score: archEvaluation.score, desc: "Redundancy, stateless fleet & cache protection" },
                    { label: "4. Staff Deep Dive", score: followUpScore, desc: "Tradeoff defenses, race conditions & scaling" },
                  ].map((pillar) => (
                    <div key={pillar.label} className="p-4 rounded-xl surface-2 border border-[var(--line)] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{pillar.label}</span>
                        <span className="num font-bold text-cyan-300">{pillar.score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pillar.score >= 80 ? "bg-emerald-400" : pillar.score >= 60 ? "bg-cyan-400" : "bg-rose-400"
                          }`}
                          style={{ width: `${pillar.score}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{pillar.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-[13px] leading-relaxed">
                {/* Strengths */}
                <div className="space-y-3 p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                  <h3 className="font-semibold text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Key Architectural Strengths
                  </h3>
                  {archEvaluation.strengths.length > 0 ? (
                    <ul className="space-y-2 text-slate-300">
                      {archEvaluation.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 shrink-0">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">No major strengths identified in initial topology.</p>
                  )}
                </div>

                {/* Areas for Improvement */}
                <div className="space-y-3 p-4 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
                  <h3 className="font-semibold text-rose-300 flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-400" />
                    Bottlenecks & Single Points of Failure
                  </h3>
                  {archEvaluation.issues.length > 0 ? (
                    <ul className="space-y-2 text-slate-300">
                      {archEvaluation.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-400 shrink-0">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-emerald-300 font-medium">
                      Zero critical bottlenecks identified! Your design meets all scale and availability targets.
                    </p>
                  )}
                </div>
              </div>

              {/* Canonical Staff Architecture Reference */}
              <div className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-400/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-cyan-400" />
                    Canonical Staff Benchmark Architecture
                  </h3>
                  <span className="text-[11px] text-slate-500">FAANG System Design Standard</span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                  {problem.benchmarkArchitecture.summary}
                </p>
              </div>

              {/* Optional: defend the key tradeoff in your own words (bonus XP, feeds Tradeoff Defense) */}
              {interviewPrompt && !defenseDone && (
                <div className="pt-4 border-t border-[var(--line)] space-y-2">
                  <span className="eyebrow text-cyan-300/90">Bonus round · Defend your design</span>
                  <ReasoningCard key={interviewPrompt.id} prompt={interviewPrompt} onDone={() => setDefenseDone(true)} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
                <button onClick={() => reset()} className="btn btn-secondary">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Redesign & Retake Interview
                </button>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard" className="btn btn-ghost">
                    Back to Dashboard
                  </Link>
                  <Link href="/builder" className="btn btn-primary">
                    Build Topology in Sandbox
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </article>
          </section>
        )}
      </main>

      {/* Level Up Celebration Modal */}
      <LevelUpModal
        isOpen={celebrate}
        onClose={() => setCelebrate(false)}
        title="Mock Interview Cleared!"
        subtitle={`You earned a ${hireRecommendation.label} rating on ${problem.title}.`}
        xpEarned={problem.rewardXp}
        badgeEarned="System Design Candidate"
        nextLabel="Try Another Interview"
        onNext={() => setCelebrate(false)}
      />
    </div>
  );
}

export default function InterviewPage() {
  return (
    <FeatureGate lab="interview">
      <InterviewPageContent />
    </FeatureGate>
  );
}
