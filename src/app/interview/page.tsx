"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import ScenarioTabs from "@/components/run/ScenarioTabs";
import SelectTile from "@/components/run/SelectTile";
import { T, Topology } from "@/components/run/RunVisuals";
import type { Tier } from "@/components/run/RunVisuals";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { completeInterview } from "@/lib/storage";
import { playBlipSound, playErrorSound, playLevelUpSound, playSuccessSound } from "@/lib/sound";
import type { InterviewFollowUp, InterviewProblem } from "@/types";

const MAX_SERVERS = 4;

interface Design {
  hasCDN: boolean;
  hasLB: boolean;
  serverCount: number;
  hasCache: boolean;
  hasQueue: boolean;
  hasDatabase: boolean;
  hasReplica: boolean;
}

const EMPTY_DESIGN: Design = {
  hasCDN: false,
  hasLB: false,
  serverCount: 1,
  hasCache: false,
  hasQueue: false,
  hasDatabase: true,
  hasReplica: false,
};

type Toggle = "hasCDN" | "hasLB" | "hasCache" | "hasQueue" | "hasDatabase" | "hasReplica";

const TOGGLES: { key: Toggle; label: string; on: string; off: string }[] = [
  { key: "hasCDN", label: "Edge CDN", on: "Caches media and assets close to users", off: "All requests cross internet to origin" },
  { key: "hasLB", label: "Load balancer", on: "Spreading traffic across stateless fleet", off: "Direct connections: single point of failure" },
  { key: "hasCache", label: "In-memory cache", on: "Hot keys served from RAM (<5ms)", off: "Every read hits persistent database" },
  { key: "hasQueue", label: "Message queue", on: "Asynchronous decoupling & worker fan-out", off: "Synchronous blocking request threads" },
  { key: "hasDatabase", label: "Primary database", on: "Durable ACID storage of truth", off: "No durable persistence layer" },
  { key: "hasReplica", label: "Read replicas", on: "Reads split horizontally from writes", off: "Single database handles all read & write IOPS" },
];

const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

function evaluateArchitecture(problem: InterviewProblem, d: Design) {
  const req = problem.requiredDesign ?? {};
  const criteria: { passed: boolean; penalty: number; strength: string; issue: string }[] = [];

  // Database check
  criteria.push({
    passed: d.hasDatabase,
    penalty: 30,
    strength: "Durable persistent database stores system records securely.",
    issue: "Critical failure: No primary database selected. All user data is volatile and lost on crash.",
  });

  // Load Balancer check
  if (req.needsLB) {
    criteria.push({
      passed: d.hasLB,
      penalty: 20,
      strength: "Reverse proxy load balancer distributes ingress across the server fleet.",
      issue: "No load balancer: incoming traffic concentrates onto a single listener without failover.",
    });
  }

  // Server scaling check
  const minSrv = req.minServers ?? 2;
  criteria.push({
    passed: d.serverCount >= minSrv,
    penalty: 20,
    strength: `Horizontal autoscaling: ${d.serverCount} stateless application server instances.`,
    issue: `Insufficient compute: only ${d.serverCount} server(s). Needs at least ${minSrv} to survive peak load and prevent SPOF.`,
  });

  // Cache check
  if (req.needsCache) {
    criteria.push({
      passed: d.hasCache,
      penalty: 20,
      strength: "In-memory RAM cache shields the database from read storms.",
      issue: "No cache: high-frequency reads will saturate database connection pools and disk IOPS.",
    });
  }

  // CDN check
  if (req.needsCDN) {
    criteria.push({
      passed: d.hasCDN,
      penalty: 15,
      strength: "Edge CDN terminates SSL and serves media/static chunks worldwide.",
      issue: "No CDN: origin servers must serve static files and media across international links, violating latency SLOs.",
    });
  }

  // Queue check
  if (req.needsQueue) {
    criteria.push({
      passed: d.hasQueue,
      penalty: 15,
      strength: "Distributed queue decouples heavy asynchronous background processing.",
      issue: "No message queue: synchronous processing risks connection timeouts under heavy write spikes.",
    });
  }

  // Replica check
  if (req.needsReplica) {
    criteria.push({
      passed: d.hasReplica,
      penalty: 15,
      strength: "Read replicas offload query volume from primary database.",
      issue: "No read replicas: read queries compete with write transactions on the primary node.",
    });
  }

  const score = Math.max(0, criteria.reduce((tot, c) => (c.passed ? tot : tot - c.penalty), 100));

  return {
    score,
    passed: score >= 70,
    strengths: criteria.filter((c) => c.passed).map((c) => c.strength),
    issues: criteria.filter((c) => !c.passed).map((c) => c.issue),
  };
}

function toTiers(d: Design): Tier[] {
  const tiers: Tier[] = [[T("Global Users")]];

  if (d.hasCDN) {
    tiers.push([T("Edge CDN", "new", "global POPs")]);
  }

  if (d.hasLB) {
    tiers.push([T("Load Balancer", "ok", "traffic distribution")]);
  }

  const servers = Array.from({ length: d.serverCount }, (_, i) =>
    T(
      d.serverCount === 1 ? "App server" : `App server ${i + 1}`,
      d.serverCount === 1 ? "warn" : "ok",
      d.serverCount === 1 ? "single point of failure" : "stateless"
    )
  );
  tiers.push(servers);

  const middleTier = [];
  if (d.hasCache) middleTier.push(T("Redis Cluster", "new", "RAM cache"));
  if (d.hasQueue) middleTier.push(T("Message Queue", "new", "async buffer"));
  if (middleTier.length > 0) tiers.push(middleTier);

  const storageTier = [d.hasDatabase ? T("Primary Database", "ok", "ACID writes") : T("No database", "hot", "data lost")];
  if (d.hasReplica) storageTier.push(T("Read Replicas", "new", "read pool"));
  tiers.push(storageTier);

  return tiers;
}

export default function InterviewPage() {
  const router = useRouter();
  const [problemId, setProblemId] = useState(INTERVIEW_PROBLEMS[0].id);
  const problem = INTERVIEW_PROBLEMS.find((p) => p.id === problemId) ?? INTERVIEW_PROBLEMS[0];

  const [secondsLeft, setSecondsLeft] = useState(problem.durationMinutes * 60);
  const [hintsShown, setHintsShown] = useState(0);
  const [design, setDesign] = useState<Design>(EMPTY_DESIGN);
  const [stage, setStage] = useState<"design" | "followup" | "scorecard">("design");
  const [selectedFollowUps, setSelectedFollowUps] = useState<Record<string, string>>({});
  const [followUpErrors, setFollowUpErrors] = useState<Record<string, string>>({});
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
    setDesign(EMPTY_DESIGN);
    setStage("design");
    setSelectedFollowUps({});
    setFollowUpErrors({});
  };

  const edit = (fn: (d: Design) => Design) => {
    if (stage !== "design") return;
    playBlipSound();
    setDesign(fn);
  };

  const archEvaluation = evaluateArchitecture(problem, design);

  // Handle Architecture Submission -> proceeds to follow-up interview questions or direct scorecard
  const handleProceedToFollowUps = () => {
    if (problem.followUpQuestions && problem.followUpQuestions.length > 0) {
      playBlipSound();
      setStage("followup");
    } else {
      finishInterview();
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
    let hasError = false;
    const newErrors: Record<string, string> = {};

    followUps.forEach((q) => {
      const picked = selectedFollowUps[q.id];
      if (!picked) {
        newErrors[q.id] = "Please select an answer to demonstrate your architectural reasoning.";
        hasError = true;
      } else {
        const opt = q.options.find((o) => o.id === picked);
        if (!opt?.isCorrect) {
          newErrors[q.id] = opt?.feedback || "Not quite right. Reconsider the engineering tradeoffs.";
          hasError = true;
        }
      }
    });

    if (hasError) {
      playErrorSound();
      setFollowUpErrors(newErrors);
      return;
    }

    finishInterview();
  };

  const finishInterview = () => {
    setStage("scorecard");
    if (archEvaluation.passed) {
      playLevelUpSound();
      completeInterview(problem.id, problem.rewardXp);
      setTimeout(() => setCelebrate(true), 700);
    } else {
      playErrorSound();
    }
  };

  const lowTime = secondsLeft < 120;
  const timeUp = secondsLeft === 0;

  // Determine candidate recommendation level
  const finalScore = archEvaluation.score;
  const hireRecommendation =
    finalScore >= 90
      ? { label: "Strong Hire · Staff Engineer", color: "chip-ok", desc: "Exemplary architectural breadth, zero single points of failure, and proactive edge-case defense." }
      : finalScore >= 75
      ? { label: "Hire · Senior Systems Engineer", color: "chip-ok", desc: "Solid production-grade design satisfying all core availability and latency constraints." }
      : { label: "Needs Improvement", color: "chip-bad", desc: "Design contains critical bottlenecks or unaddressed single points of failure under peak load." };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* Navigation & Problem Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="btn btn-ghost !px-1 text-xs">
            <ArrowLeft className="w-4 h-4" />
            Progress
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

        {/* Problem Header */}
        <header className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-start">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow text-cyan-300/80">Interview Arena · {problem.tier}</span>
              <span className="chip text-[11px] font-medium">{problem.difficulty}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl display">{problem.title}</h1>
            <p className="text-[15px] text-slate-400 leading-relaxed">{problem.scenario}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="chip chip-warn">
                <Zap className="w-3 h-3" /> <span className="num">+{problem.rewardXp} XP</span>
              </span>
              <span className="chip">Pass Benchmark: 70/100</span>
              <span className="chip">
                Stage: {stage === "design" ? "1. High-Level Design" : stage === "followup" ? "2. Deep-Dive Follow-ups" : "3. Evaluation Scorecard"}
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
              {stage === "scorecard" ? "Interview Finished" : timeUp ? "Time Expired" : "Time Remaining"}
            </span>
            <div className={`num text-3xl mt-1 ${stage === "scorecard" ? "text-slate-500" : lowTime ? "text-rose-300" : "text-white"}`}>
              {formatTime(secondsLeft)}
            </div>
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
        {/* STAGE 1: High-Level Architecture Design */}
        {/* ========================================================================= */}
        {stage === "design" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start animate-fadeIn">
            {/* Design Builder */}
            <section className="surface p-5 sm:p-6 space-y-5" aria-label="Your design">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="chip text-[11px]">Step 1 of 2</span>
                    <h2 className="text-lg display">Assemble Your Architecture</h2>
                  </div>
                  <p className="text-[13px] text-slate-500">
                    Add the components you will defend in front of the interview panel.
                  </p>
                </div>
                <button onClick={() => reset()} className="btn btn-ghost !py-1 text-xs shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              {/* Component Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOGGLES.map((t) => {
                  const on = design[t.key];
                  return (
                    <SelectTile
                      key={t.key}
                      state={on ? "selected" : "idle"}
                      pressed={on}
                      onClick={() => edit((d) => ({ ...d, [t.key]: !d[t.key] }))}
                    >
                      <span className="block text-[13px] font-semibold text-white">{t.label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{on ? t.on : t.off}</span>
                    </SelectTile>
                  );
                })}

                {/* Server Fleet Stepper */}
                <div className="choice !cursor-default sm:col-span-2 !items-center" role="group" aria-label="App servers">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-white">App servers</span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {design.serverCount === 1 ? "1 server: single point of failure" : `${design.serverCount} stateless worker instances`}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="btn btn-secondary !p-1.5"
                      aria-label="Remove a server"
                      disabled={design.serverCount <= 1}
                      onClick={() => edit((d) => ({ ...d, serverCount: d.serverCount - 1 }))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="num text-sm text-white w-6 text-center" aria-live="polite">
                      {design.serverCount}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary !p-1.5"
                      aria-label="Add a server"
                      disabled={design.serverCount >= MAX_SERVERS}
                      onClick={() => edit((d) => ({ ...d, serverCount: d.serverCount + 1 }))}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              </div>

              {/* Live Topology Diagram */}
              <Topology tiers={toTiers(design)} caption={<span className="eyebrow">Your architectural topology</span>} />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--line)]">
                <span className="text-xs text-slate-500">
                  Ready to defend? Next: Deep-dive follow-up questions from the interviewer.
                </span>
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
        {/* STAGE 2: Deep-Dive Follow-Up Questions from Interviewer */}
        {/* ========================================================================= */}
        {stage === "followup" && (
          <section className="surface p-6 sm:p-8 space-y-6 animate-fadeIn" aria-label="Follow up round">
            <header className="space-y-2 border-b border-[var(--line)] pb-5">
              <div className="flex items-center gap-2">
                <span className="chip chip-warn text-[11px]">Step 2 of 2 · Interactive Interview Round</span>
                <span className="chip">Interviewer Probing</span>
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
                      {q.options.map((opt) => {
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
                                isSelected ? "border-cyan-400 bg-cyan-400 text-slate-950 font-bold text-[10px]" : "border-slate-500"
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
                Finalize & Generate Scorecard
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: Comprehensive Interview Scorecard & Feedback Report */}
        {/* ========================================================================= */}
        {stage === "scorecard" && (
          <section className="space-y-6 animate-fadeIn" aria-label="Interview scorecard">
            {/* Scorecard Hero */}
            <article className="surface p-6 sm:p-8 rounded-2xl space-y-6 border border-cyan-400/30 shadow-[0_20px_60px_-20px_rgba(6,182,212,0.2)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-6">
                <div className="space-y-2">
                  <span className="eyebrow text-cyan-300">Interview Evaluation Report</span>
                  <h2 className="text-2xl sm:text-3xl display">{problem.title}</h2>
                  <p className="text-sm text-slate-400 max-w-xl">{hireRecommendation.desc}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="eyebrow">Overall Score</span>
                    <div className="num text-4xl text-white font-bold mt-1">
                      {finalScore}
                      <span className="text-sm text-slate-500 font-normal"> / 100</span>
                    </div>
                  </div>
                  <span className={`chip ${hireRecommendation.color} text-sm px-3 py-1.5 font-semibold`}>
                    {hireRecommendation.label}
                  </span>
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

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
                <button onClick={() => setStage("design")} className="btn btn-secondary">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Redesign & Retake Interview
                </button>
                <div className="flex items-center gap-2">
                  <Link href="/guided" className="btn btn-ghost">
                    Try Guided Challenges
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
