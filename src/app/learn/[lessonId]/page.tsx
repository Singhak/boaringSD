"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Lightbulb, RotateCcw, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import InteractiveStage from "@/components/simulation/InteractiveStage";
import LevelUpModal from "@/components/LevelUpModal";
import { StatStrip } from "@/components/run/RunVisuals";
import type { Tone } from "@/components/run/RunVisuals";
import { getConceptReveal, getLessonById, LESSONS } from "@/lib/lessons";
import { completeLesson } from "@/lib/storage";
import { playAlarmSound, playDeploySound, playLevelUpSound } from "@/lib/sound";
import type { Lesson, SimulationState } from "@/types";

const BADGE_BY_LESSON: Record<string, string> = {
  "load-balancer": "Traffic Controller",
  cache: "Speed Demon",
  "database-scaling": "Cluster Engineer",
};

function freshSim(lesson: Lesson): SimulationState {
  return {
    hasLoadBalancer: false,
    hasCache: false,
    hasReadReplica: false,
    serverCount: 1,
    userCount: lesson.initialMetrics.requestsPerSec,
    isSimulating: true,
    metrics: { ...lesson.initialMetrics },
  };
}

/** What each deploy action does to the running system. */
function applyAction(prev: SimulationState, action: Lesson["steps"][number]["actionType"]): SimulationState {
  switch (action) {
    case "add_load_balancer":
      return { ...prev, hasLoadBalancer: true, serverCount: 2, metrics: { ...prev.metrics, cpuUsage: 40, latencyMs: 300, errorRate: 0 } };
    case "scale_servers":
      return {
        ...prev,
        serverCount: Math.min(3, prev.serverCount + 1),
        metrics: { ...prev.metrics, cpuUsage: 25, latencyMs: 180, errorRate: 0 },
      };
    case "add_cache":
      return {
        ...prev,
        hasCache: true,
        metrics: { ...prev.metrics, cpuUsage: 22, latencyMs: 15, databaseHits: 100, cacheHitRate: 99, errorRate: 0 },
      };
    case "add_replica":
      return {
        ...prev,
        hasReadReplica: true,
        metrics: { ...prev.metrics, cpuUsage: 35, latencyMs: 120, databaseHits: 5000, cacheHitRate: 80, errorRate: 0 },
      };
  }
}

const tone = (v: number, warn: number, bad: number): Tone => (v > bad ? "bad" : v > warn ? "warn" : "ok");

export default function LessonPage() {
  const params = useParams();
  const lessonId = params?.lessonId as string;
  const lesson = getLessonById(lessonId) || LESSONS[0];
  // Remount on lesson change so all run state starts fresh.
  return <LessonRun key={lesson.id} lesson={lesson} />;
}

function LessonRun({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const [sim, setSim] = useState<SimulationState>(() => freshSim(lesson));
  const [stepIdx, setStepIdx] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const completed = stepIdx >= lesson.steps.length;
  const concept = getConceptReveal(lesson.id);
  const start = lesson.initialMetrics;
  const m = sim.metrics;
  const changed = stepIdx > 1;

  const runStep = () => {
    if (completed) return;
    // Every lesson opens with "watch it fail": no deploy, just acknowledge the bottleneck.
    if (stepIdx === 0) {
      playAlarmSound();
    } else {
      playDeploySound();
      setSim((prev) => applyAction(prev, lesson.steps[stepIdx].actionType));
    }
    const next = stepIdx + 1;
    setStepIdx(next);
    if (next >= lesson.steps.length) {
      setTimeout(() => {
        completeLesson(lesson.id, lesson.xpReward);
        playLevelUpSound();
        setShowCelebration(true);
      }, 600);
    }
  };

  const reset = () => {
    setSim(freshSim(lesson));
    setStepIdx(0);
  };

  const was = (v: string) => (changed ? `was ${v}` : undefined);

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="btn btn-ghost !px-1 text-xs">
            <ArrowLeft className="w-4 h-4" />
            Progress
          </Link>
          <div className="flex items-center gap-1">
            {stepIdx > 0 && (
              <button onClick={reset} className="btn btn-ghost text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <Link href={`/challenge/${lesson.challenge.id}`} className="btn btn-secondary text-xs">
              Take the quiz
            </Link>
          </div>
        </div>

        <header className="space-y-4">
          <div className="space-y-2 max-w-3xl">
            <span className="eyebrow text-cyan-300/80">
              Lesson {lesson.level} · {lesson.concept}
            </span>
            <h1 className="text-3xl sm:text-4xl display">{lesson.title}</h1>
            <p className="text-[15px] text-slate-400 leading-relaxed">{lesson.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              <Clock className="w-3 h-3" /> ~{lesson.estimatedMinutes} min
            </span>
            <span className="chip chip-warn">
              <Zap className="w-3 h-3" /> <span className="num">+{lesson.xpReward} XP</span>
            </span>
            {completed && (
              <span className="chip chip-ok">
                <Check className="w-3 h-3" /> Fixed
              </span>
            )}
          </div>
        </header>

        <StatStrip
          stats={[
            { label: "CPU", value: m.cpuUsage, unit: "%", tone: tone(m.cpuUsage, 50, 80), sub: was(`${start.cpuUsage}%`) ?? "target < 50%" },
            {
              label: "Latency",
              value: m.latencyMs.toLocaleString(),
              unit: "ms",
              tone: tone(m.latencyMs, 400, 1000),
              sub: was(`${start.latencyMs.toLocaleString()} ms`) ?? "target < 400 ms",
            },
            {
              label: "DB queries",
              value: m.databaseHits.toLocaleString(),
              unit: "/s",
              tone: m.databaseHits > 5000 ? "warn" : "ok",
              sub: was(start.databaseHits.toLocaleString()),
            },
            { label: "Errors", value: m.errorRate, unit: "%", tone: m.errorRate > 0 ? "bad" : "ok", sub: was(`${start.errorRate}%`) },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4 items-start">
          {/* Steps */}
          <section className="surface p-5 sm:p-6 space-y-5" aria-label="Steps">
            <h2 className="eyebrow">Steps</h2>
            <ol className="space-y-4">
              {lesson.steps.map((step, i) => {
                const done = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <li key={i} aria-current={active ? "step" : undefined} className={`flex gap-3 ${!done && !active ? "opacity-50" : ""}`}>
                    <span
                      className={`w-6 h-6 rounded-full grid place-items-center shrink-0 border text-[10px] num ${
                        done
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                          : active
                          ? "border-cyan-300/60 text-cyan-100"
                          : "border-[var(--line-strong)] text-slate-500"
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" aria-label="done" /> : i + 1}
                    </span>
                    <div className="space-y-2 min-w-0 flex-1">
                      <p className={`text-[14px] font-medium ${active ? "text-white" : "text-slate-300"}`}>{step.title}</p>
                      {(active || done) && <p className="text-[13px] text-slate-500 leading-relaxed">{step.description}</p>}
                      {active && (
                        <button onClick={runStep} className="btn btn-primary">
                          {step.actionLabel}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {completed ? (
              <Link href={`/challenge/${lesson.challenge.id}`} className="btn btn-primary w-full">
                Take the challenge · <span className="num">+{lesson.challenge.rewardXp} XP</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="pt-4 border-t border-[var(--line)] space-y-2">
                <h3 className="eyebrow">You&apos;ll learn</h3>
                <ul className="space-y-1.5">
                  {lesson.learningObjectives.map((o) => (
                    <li key={o} className="flex gap-2 text-[13px] text-slate-400 leading-relaxed">
                      <span aria-hidden className="dot text-slate-600 mt-2" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* System + concept */}
          <div className="space-y-4 min-w-0">
            <InteractiveStage lessonId={lesson.id} state={sim} />

            {completed && (
              <article className="surface-accent p-5 sm:p-6 space-y-4 animate-fadeIn">
                <div className="space-y-2">
                  <span className="eyebrow text-cyan-300/80">What you just did has a name</span>
                  <h2 className="text-xl display">{concept.title}</h2>
                  <p className="text-[14px] text-slate-300 leading-relaxed">{concept.principle}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="pl-3 border-l-2 border-amber-300/50 space-y-1">
                    <p className="text-xs font-semibold text-amber-200">The tradeoff</p>
                    <p className="text-[13px] text-slate-400 leading-relaxed">{concept.tradeoff}</p>
                  </div>
                  <div className="pl-3 border-l-2 border-emerald-400/50 space-y-1">
                    <p className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" aria-hidden /> Takeaway
                    </p>
                    <p className="text-[13px] text-slate-400 leading-relaxed">{concept.takeaway}</p>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      </main>

      <LevelUpModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Bottleneck fixed"
        subtitle={`You solved the ${lesson.title} bottleneck and brought latency back down.`}
        xpEarned={lesson.xpReward}
        badgeEarned={BADGE_BY_LESSON[lesson.id] ?? "Cluster Engineer"}
        nextLabel="Take the challenge"
        onNext={() => router.push(`/challenge/${lesson.challenge.id}`)}
      />
    </div>
  );
}
