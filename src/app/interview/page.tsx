"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Lightbulb, Minus, Plus, RotateCcw, Timer, X, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import ScenarioTabs from "@/components/run/ScenarioTabs";
import SelectTile from "@/components/run/SelectTile";
import { T, Topology } from "@/components/run/RunVisuals";
import type { Tier } from "@/components/run/RunVisuals";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { completeInterview } from "@/lib/storage";
import { playBlipSound, playErrorSound, playLevelUpSound } from "@/lib/sound";

const TIME_LIMIT = 10 * 60;
const MAX_SERVERS = 4;

interface Design {
  hasLB: boolean;
  serverCount: number;
  hasCache: boolean;
  hasDatabase: boolean;
  hasReplica: boolean;
}

const EMPTY_DESIGN: Design = { hasLB: false, serverCount: 1, hasCache: false, hasDatabase: true, hasReplica: false };

type Toggle = "hasLB" | "hasCache" | "hasDatabase" | "hasReplica";
const TOGGLES: { key: Toggle; label: string; on: string; off: string }[] = [
  { key: "hasLB", label: "Load balancer", on: "Spreading traffic", off: "Clients hit servers directly" },
  { key: "hasCache", label: "Redis cache", on: "Hot reads from RAM", off: "Every read hits the database" },
  { key: "hasDatabase", label: "PostgreSQL primary", on: "Durable writes", off: "Nowhere to store data" },
  { key: "hasReplica", label: "Read replica", on: "Reads split from writes", off: "One database does everything" },
];

const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

function evaluate(problemId: string, d: Design) {
  const isTwitter = problemId === "interview-twitter-timeline";
  const criteria = [
    {
      passed: d.hasLB,
      penalty: 25,
      strength: "Load balancer spreads traffic across stateless servers.",
      issue: "No load balancer: peak traffic has nothing to distribute it across servers.",
    },
    {
      passed: d.serverCount > 1,
      penalty: 25,
      strength: `Horizontally scaled: ${d.serverCount} stateless app servers.`,
      issue: "Single point of failure: there is still only one app server.",
    },
    {
      passed: d.hasCache,
      penalty: isTwitter ? 30 : 25,
      strength: isTwitter
        ? "Timeline cache: precomputed feeds avoid expensive follow-graph queries."
        : "In-memory cache shields the database from read bursts.",
      issue: isTwitter
        ? "No timeline cache: every feed read re-runs expensive joins at extreme QPS."
        : "No cache: high-volume reads will exhaust the database connection pool.",
    },
    {
      passed: d.hasDatabase,
      penalty: 25,
      strength: "Durable storage for system records.",
      issue: "No persistent storage: nothing is durably saved.",
    },
  ];
  if (isTwitter) {
    criteria.push({
      passed: d.hasReplica,
      penalty: 15,
      strength: "Read replica separates feed reads from tweet writes.",
      issue: "No read/write split: feed reads and tweet writes compete for one database.",
    });
  }
  const score = Math.max(0, criteria.reduce((t, c) => (c.passed ? t : t - c.penalty), 100));
  return {
    score,
    passed: score >= 70,
    strengths: criteria.filter((c) => c.passed).map((c) => c.strength),
    issues: criteria.filter((c) => !c.passed).map((c) => c.issue),
  };
}

function toTiers(d: Design): Tier[] {
  const servers = Array.from({ length: d.serverCount }, (_, i) =>
    T(d.serverCount === 1 ? "App server" : `App server ${i + 1}`, d.serverCount === 1 ? "warn" : "ok", d.serverCount === 1 ? "single point of failure" : undefined)
  );
  return [
    [T("Clients")],
    d.hasLB ? [T("Load balancer")] : [],
    servers,
    [
      ...(d.hasCache ? [T("Redis cache")] : []),
      d.hasDatabase ? T("Primary DB") : T("No database", "hot", "data is lost"),
      ...(d.hasReplica ? [T("Read replica", "ok", "async")] : []),
    ],
  ];
}

export default function InterviewPage() {
  const router = useRouter();
  const [problemId, setProblemId] = useState(INTERVIEW_PROBLEMS[0].id);
  const problem = INTERVIEW_PROBLEMS.find((p) => p.id === problemId) ?? INTERVIEW_PROBLEMS[0];

  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT);
  const [hintsShown, setHintsShown] = useState(0);
  const [design, setDesign] = useState<Design>(EMPTY_DESIGN);
  const [submitted, setSubmitted] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (submitted || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted, secondsLeft]);

  const reset = (id?: string) => {
    if (id) setProblemId(id);
    setSecondsLeft(TIME_LIMIT);
    setHintsShown(0);
    setDesign(EMPTY_DESIGN);
    setSubmitted(false);
  };

  const edit = (fn: (d: Design) => Design) => {
    if (submitted) return;
    playBlipSound();
    setDesign(fn);
  };

  const evaluation = evaluate(problem.id, design);

  const submit = () => {
    setSubmitted(true);
    if (evaluation.passed) {
      playLevelUpSound();
      completeInterview(problem.id, problem.rewardXp);
      setTimeout(() => setCelebrate(true), 700);
    } else {
      playErrorSound();
    }
  };

  const low = secondsLeft < 120;
  const timeUp = secondsLeft === 0;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="btn btn-ghost !px-1 text-xs">
            <ArrowLeft className="w-4 h-4" />
            Progress
          </Link>
          <ScenarioTabs
            items={INTERVIEW_PROBLEMS.map((p) => ({ id: p.id, label: p.title.replace(/^Mini Interview:\s*Design\s*/i, "") }))}
            activeId={problem.id}
            onSelect={(id) => id !== problem.id && reset(id)}
          />
        </div>

        <header className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-start">
          <div className="space-y-2 max-w-3xl">
            <span className="eyebrow text-cyan-300/80">Lab · Mock interview · {problem.difficulty}</span>
            <h1 className="text-3xl sm:text-4xl display">{problem.title.replace(/^Mini Interview:\s*/i, "")}</h1>
            <p className="text-[15px] text-slate-400 leading-relaxed">{problem.scenario}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="chip chip-warn">
                <Zap className="w-3 h-3" /> <span className="num">+{problem.rewardXp} XP</span>
              </span>
              <span className="chip">Pass at 70/100</span>
            </div>
          </div>

          <div
            className={`surface !rounded-xl px-5 py-4 min-w-[168px] ${low && !submitted ? "!border-rose-400/40" : ""}`}
            role="timer"
            aria-live={low ? "polite" : "off"}
            aria-label={`Time left ${formatTime(secondsLeft)}`}
          >
            <span className="eyebrow flex items-center gap-1.5">
              <Timer className="w-3 h-3" aria-hidden />
              {submitted ? "Submitted" : timeUp ? "Time's up" : "Time left"}
            </span>
            <div className={`num text-3xl mt-1 ${submitted ? "text-slate-500" : low ? "text-rose-300" : "text-white"}`}>
              {formatTime(secondsLeft)}
            </div>
          </div>
        </header>

        <dl className="surface grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] overflow-hidden !rounded-xl">
          {[
            ["Traffic", problem.trafficScale],
            ["Latency target", problem.latencyConstraint],
            ["Storage", problem.storageScale],
          ].map(([k, v]) => (
            <div key={k} className="p-4 space-y-1">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-[13px] text-slate-200 leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
          {/* Design */}
          <section className="surface p-5 sm:p-6 space-y-5" aria-label="Your design">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg display">Your design</h2>
                <p className="text-[13px] text-slate-500">Add the parts you&apos;d defend in front of an interviewer.</p>
              </div>
              <button onClick={() => reset()} className="btn btn-ghost !py-1 text-xs shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOGGLES.map((t) => {
                const on = design[t.key];
                return (
                  <SelectTile
                    key={t.key}
                    state={on ? "selected" : "idle"}
                    pressed={on}
                    disabled={submitted}
                    onClick={() => edit((d) => ({ ...d, [t.key]: !d[t.key] }))}
                  >
                    <span className="block text-[13px] font-semibold text-white">{t.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{on ? t.on : t.off}</span>
                  </SelectTile>
                );
              })}

              <div className="choice !cursor-default sm:col-span-2 !items-center" role="group" aria-label="App servers">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-white">App servers</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {design.serverCount === 1 ? "One instance: if it dies, everything does" : "A stateless fleet"}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="btn btn-secondary !p-1.5"
                    aria-label="Remove a server"
                    disabled={submitted || design.serverCount <= 1}
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
                    disabled={submitted || design.serverCount >= MAX_SERVERS}
                    onClick={() => edit((d) => ({ ...d, serverCount: d.serverCount + 1 }))}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>

            <Topology tiers={toTiers(design)} caption={<span className="eyebrow">Request path</span>} />

            {!submitted && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">You can adjust and resubmit after feedback.</span>
                <button onClick={submit} className="btn btn-primary">
                  Submit for review
                </button>
              </div>
            )}
          </section>

          {/* Interviewer */}
          <aside className="space-y-4" aria-label="Interviewer">
            {submitted ? (
              <section className="surface overflow-hidden animate-fadeIn" role="status" aria-live="polite">
                <header className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
                  <div>
                    <span className="eyebrow">Interviewer score</span>
                    <div className="num text-3xl text-white mt-1">
                      {evaluation.score}
                      <span className="text-sm text-slate-500"> / 100</span>
                    </div>
                  </div>
                  <span className={`chip ${evaluation.passed ? "chip-ok" : "chip-bad"}`}>
                    {evaluation.passed ? "Hire signal" : "Needs revision"}
                  </span>
                </header>
                <div className="p-5 space-y-4 text-[13px] leading-relaxed">
                  {evaluation.issues.length > 0 && (
                    <ul className="space-y-2" aria-label="Issues">
                      {evaluation.issues.map((t) => (
                        <li key={t} className="flex gap-2 text-slate-300">
                          <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden />
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  {evaluation.strengths.length > 0 && (
                    <ul className="space-y-2" aria-label="Strengths">
                      {evaluation.strengths.map((t) => (
                        <li key={t} className="flex gap-2 text-slate-400">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pl-3 border-l-2 border-cyan-300/50 space-y-1">
                    <p className="text-xs font-semibold text-cyan-200">Reference answer</p>
                    <p className="text-slate-300">{problem.benchmarkArchitecture.summary}</p>
                  </div>
                  <button onClick={() => setSubmitted(false)} className="btn btn-secondary w-full">
                    Adjust design
                  </button>
                </div>
              </section>
            ) : null}

            <section className="surface p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-300/80" aria-hidden />
                  Ask the interviewer
                </h2>
                <span className="num text-xs text-slate-500">
                  {hintsShown}/{problem.hints.length}
                </span>
              </div>
              {hintsShown === 0 && (
                <p className="text-[13px] text-slate-500">Stuck? Interviewers expect questions. Each nudge narrows it down.</p>
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
                  {hintsShown === 0 ? "Ask for a hint" : "Ask for another"}
                </button>
              )}
            </section>
          </aside>
        </div>
      </main>

      <LevelUpModal
        isOpen={celebrate}
        onClose={() => setCelebrate(false)}
        title="Interview passed"
        subtitle={`You scored ${evaluation.score}/100 on ${problem.title.replace(/^Mini Interview:\s*/i, "")}.`}
        xpEarned={problem.rewardXp}
        badgeEarned="Interview Ready"
        nextLabel="Try the Challenge Lab"
        onNext={() => router.push("/guided")}
      />
    </div>
  );
}
