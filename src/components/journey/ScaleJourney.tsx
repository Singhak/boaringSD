"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Edge, Node } from "@xyflow/react";
import { ArrowRight, Check, CircleAlert, Flag, Lightbulb, Lock, Trophy, TriangleAlert, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import ArchitectureCanvas, { makeArchNode } from "@/components/builder/ArchitectureCanvas";
import { JOURNEY_STAGES, isoWeekKey, stageSpec, twistForWeek } from "@/data/scaleJourney";
import { evaluateScenario, type ScenarioEvaluation } from "@/lib/builderScore";
import { track } from "@/lib/events";
import {
  JOURNEY_BONUS_XP,
  JOURNEY_STAGE_COUNT,
  JOURNEY_UNLOCK_LEVELS,
  journeyStagesCleared,
  recordJourneyStage,
} from "@/lib/scaleJourney";
import { playErrorSound, playLevelUpSound, playSuccessSound } from "@/lib/sound";
import { getFeatureUnlockStatus, getUserStats, saveUserStats } from "@/lib/storage";
import { useUserStats } from "@/lib/useUserStats";
import type { UserStats } from "@/types";

const DESIGN_KEY = "sd_quest_journey_design_v1";

/** Every journey starts as a single server in front of a database. */
function startGraph(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      makeArchNode("users", "client", "Users", 0, 140),
      makeArchNode("server-1", "server", "App Server 1", 280, 140),
      makeArchNode("primary-db", "database", "Primary DB", 560, 140),
    ],
    edges: [
      { id: "e-users-server", source: "users", target: "server-1", type: "removableEdge", animated: true },
      { id: "e-server-db", source: "server-1", target: "primary-db", type: "removableEdge", animated: true },
    ],
  };
}

/** The design carries over between stages and survives a reload within the same week. */
function loadDesign(weekKey: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(DESIGN_KEY);
    const saved = raw ? (JSON.parse(raw) as { week: string; nodes: Node[]; edges: Edge[] }) : null;
    if (saved?.week === weekKey && Array.isArray(saved.nodes)) return { nodes: saved.nodes, edges: saved.edges ?? [] };
  } catch {
    // Unreadable save: start over.
  }
  return startGraph();
}

function saveDesign(weekKey: string, graph: { nodes: Node[]; edges: Edge[] }) {
  try {
    localStorage.setItem(DESIGN_KEY, JSON.stringify({ week: weekKey, ...graph }));
  } catch {
    // Storage full or blocked: the design lives in memory for this visit.
  }
}

export default function ScaleJourney() {
  const stats = useUserStats();
  if (stats === null) {
    return (
      <Shell>
        <div className="surface p-10 h-80 animate-pulse" aria-busy="true" />
      </Shell>
    );
  }
  const levelsCleared = (stats.completedChapters ?? []).length;
  if (!getFeatureUnlockStatus(stats).journey.unlocked) {
    return (
      <Shell>
        <section className="surface p-10 text-center space-y-4 max-w-xl mx-auto">
          <Lock className="w-8 h-8 text-slate-500 mx-auto" aria-hidden />
          <h1 className="text-2xl display">The Scale Journey unlocks after Level {JOURNEY_UNLOCK_LEVELS}</h1>
          <p className="text-sm text-slate-400">
            Each week you grow one system from a front-page spike to ten million users. You need the Foundation tier first:{" "}
            {levelsCleared}/{JOURNEY_UNLOCK_LEVELS} levels cleared.
          </p>
          <Link href="/campaign" className="btn btn-primary">
            Back to the levels <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </Shell>
    );
  }
  return <Journey stats={stats} weekKey={isoWeekKey(new Date())} />;
}

function Journey({ stats, weekKey }: { stats: UserStats; weekKey: string }) {
  const twist = twistForWeek(weekKey);
  const cleared = journeyStagesCleared(stats, weekKey);
  const done = cleared >= JOURNEY_STAGE_COUNT;
  const stageIndex = Math.min(cleared, JOURNEY_STAGE_COUNT - 1);
  const stage = JOURNEY_STAGES[stageIndex];
  const spec = useMemo(() => stageSpec(stageIndex, twist), [stageIndex, twist]);

  const [graph, setGraph] = useState(() => loadDesign(weekKey));
  const [version, setVersion] = useState(0);
  const [tested, setTested] = useState<{ version: number; stage: number; evaluation: ScenarioEvaluation } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [bonus, setBonus] = useState<number | null>(null);
  const fresh = tested && tested.version === version && tested.stage === stageIndex ? tested.evaluation : null;

  useEffect(() => saveDesign(weekKey, graph), [weekKey, graph]);

  const onChange = (nodes: Node[], edges: Edge[]) => {
    setGraph({ nodes, edges });
    setVersion((v) => v + 1);
  };

  const stressTest = () => {
    const evaluation = evaluateScenario(graph.nodes, graph.edges, spec);
    setTested({ version, stage: stageIndex, evaluation });
    if (!evaluation.canPass) {
      playErrorSound();
      return;
    }
    const out = recordJourneyStage(getUserStats(), weekKey, stageIndex, new Date());
    saveUserStats(out.stats);
    setShowHint(false);
    if (out.completed) {
      track("journey_complete", { weekKey, twist: twist.id });
      setBonus(out.xpAwarded);
      playLevelUpSound();
    } else {
      playSuccessSound();
    }
  };

  return (
    <Shell wide>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-accent">
            <Flag className="w-3.5 h-3.5" aria-hidden /> Weekly boss · {weekKey}
          </span>
          <span className="chip chip-warn">{twist.label}</span>
          <span className="chip num">+{JOURNEY_BONUS_XP} XP for all {JOURNEY_STAGE_COUNT} stages</span>
        </div>
        <h1 className="text-3xl sm:text-4xl display">Scale Journey</h1>
        <p className="text-[15px] text-slate-400 max-w-3xl">
          Grow one system from a front-page spike to ten million users. Your design carries over, so every shortcut is paid
          for later. <span className="text-amber-200/90">{twist.brief}</span>
        </p>
      </header>

      <ol className="grid grid-cols-5 gap-1.5" aria-label="Stages">
        {JOURNEY_STAGES.map((s, i) => {
          const state = i < cleared ? "cleared" : i === cleared ? "current" : "locked";
          return (
            <li
              key={s.id}
              aria-current={state === "current" ? "step" : undefined}
              className={`rounded-lg border px-2 py-2 text-center ${
                state === "cleared"
                  ? "border-emerald-400/30 bg-emerald-400/[0.06]"
                  : state === "current"
                    ? "border-cyan-400/40 bg-cyan-400/[0.06]"
                    : "border-[var(--line)] opacity-60"
              }`}
            >
              <span className="block num text-[11px] text-slate-500">{s.users}</span>
              <span className="block text-xs font-medium text-white truncate">
                {state === "cleared" && <Check className="inline w-3 h-3 mr-1 text-emerald-300" aria-hidden />}
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>

      {done ? (
        <section className="surface-accent p-7 space-y-4 text-center">
          <Trophy className="w-10 h-10 text-amber-300 mx-auto" aria-hidden />
          <h2 className="text-2xl display">Ten million users, and it held.</h2>
          <p className="text-sm text-slate-400">
            {bonus !== null && bonus > 0
              ? `+${bonus} XP weekly bonus. `
              : "This week's journey is done. "}
            A new twist arrives on Monday (UTC).
          </p>
          <Link href="/" className="btn btn-primary">
            Back to your next mission <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-4">
          <div className="surface p-2">
            <ArchitectureCanvas key={weekKey} initialNodes={graph.nodes} initialEdges={graph.edges} onChange={onChange} />
          </div>

          <aside className="space-y-3">
            <section className="surface p-5 space-y-3">
              <p className="eyebrow">
                Stage {stageIndex + 1} of {JOURNEY_STAGE_COUNT} · {stage.users}
              </p>
              <h2 className="text-xl display">{stage.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{stage.story}</p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-[var(--line)] p-2">
                  <dt className="eyebrow !text-[10px]">Traffic</dt>
                  <dd className="num text-white">{spec.trafficRps.toLocaleString()} req/s</dd>
                </div>
                <div className="rounded-md border border-[var(--line)] p-2">
                  <dt className="eyebrow !text-[10px]">Budget</dt>
                  <dd className="num text-white">${spec.budget?.toLocaleString()}/mo</dd>
                </div>
              </dl>
              <p className="text-[13px] text-cyan-100/90">
                <span className="font-semibold">Goal: </span>
                {stage.goal}
              </p>
              {showHint ? (
                <p className="text-[13px] text-amber-100/90 flex gap-2">
                  <Lightbulb className="w-4 h-4 shrink-0 text-amber-300" aria-hidden /> {stage.hint}
                </p>
              ) : (
                <button type="button" onClick={() => setShowHint(true)} className="btn btn-ghost !px-0 text-xs">
                  <Lightbulb className="w-3.5 h-3.5" /> Show a hint
                </button>
              )}
              <button type="button" onClick={stressTest} className="btn btn-primary w-full">
                <Zap className="w-4 h-4" /> Run the stress test
              </button>
            </section>

            {fresh && (
              <section className="surface p-4 space-y-2" aria-live="polite">
                <p className={`text-sm font-semibold ${fresh.canPass ? "text-emerald-300" : "text-rose-300"}`}>
                  {fresh.canPass ? "Stage cleared: the design carries on to the next one." : "It buckled. Fix the red checks and test again."}
                </p>
                <ul className="space-y-1.5">
                  {fresh.checks.map((c) => (
                    <li key={c.id} className="flex gap-2 text-xs text-slate-300">
                      {c.status === "pass" ? (
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-300" aria-label="pass" />
                      ) : c.status === "warn" ? (
                        <TriangleAlert className="w-3.5 h-3.5 shrink-0 text-amber-300" aria-label="warning" />
                      ) : (
                        <CircleAlert className="w-3.5 h-3.5 shrink-0 text-rose-300" aria-label="fail" />
                      )}
                      <span>{c.message.replace(/^(Pass|Fail|Warning): /, "")}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />
      <main className={`flex-1 w-full mx-auto px-4 py-8 space-y-5 animate-fadeIn ${wide ? "max-w-7xl" : "max-w-2xl"}`}>{children}</main>
    </div>
  );
}
