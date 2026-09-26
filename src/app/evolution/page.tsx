"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import { StatStrip, Topology } from "@/components/run/RunVisuals";
import type { Health, Tier, Tone } from "@/components/run/RunVisuals";
import { EVOLUTION_STAGES } from "@/data/evolution";
import { playBlipSound, playSuccessSound } from "@/lib/sound";
import type { ArchitectureNodeType, EvolutionStage } from "@/types";

// Left-to-right order of the request path; storage shares the last column.
const TIER_OF: Record<ArchitectureNodeType, number> = {
  client: 0,
  cdn: 1,
  load_balancer: 2,
  server: 3,
  queue: 4,
  cache: 5,
  database: 5,
  replica: 5,
};

const STAGE_CHIP: Record<EvolutionStage["status"], string> = { healthy: "chip-ok", warning: "chip-warn", danger: "chip-bad" };
const STAGE_DOT: Record<EvolutionStage["status"], string> = {
  healthy: "text-emerald-400",
  warning: "text-amber-300",
  danger: "text-rose-400",
};

const stripEmoji = (s: string) => s.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim();
const stageTitle = (s: EvolutionStage) => s.title.replace(/^Level \d+:\s*/, "");

function toTiers(stage: EvolutionStage, prev?: EvolutionStage): Tier[] {
  const prevTypes = new Set(prev?.components.map((c) => c.type));
  const tiers: Tier[] = [[], [], [], [], [], []];
  for (const c of stage.components) {
    const health: Health =
      c.status === "overloaded" ? "hot" : c.status === "warning" ? "warn" : prev && !prevTypes.has(c.type) ? "new" : "ok";
    const note = [c.subtitle, c.cpu !== undefined ? `${c.cpu}% CPU` : undefined].filter(Boolean).join(" · ");
    tiers[TIER_OF[c.type]].push({ label: c.label, health, note: note || undefined });
  }
  return tiers;
}

const tone = (v: number, warn: number, bad: number): Tone => (v > bad ? "bad" : v > warn ? "warn" : "ok");

export default function EvolutionPage() {
  const [idx, setIdx] = useState(0);
  const stage = EVOLUTION_STAGES[idx];
  const prev = EVOLUTION_STAGES[idx - 1];
  const last = EVOLUTION_STAGES.length - 1;

  const go = (i: number) => {
    if (i < 0 || i > last || i === idx) return;
    if (i === last) playSuccessSound();
    else playBlipSound();
    setIdx(i);
  };

  const m = stage.metrics;
  const was = (v: string | undefined) => (prev && v !== undefined ? `was ${v}` : undefined);

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
            {idx > 0 && (
              <button onClick={() => go(0)} className="btn btn-ghost text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                Start over
              </button>
            )}
            <Link href="/builder" className="btn btn-secondary text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Open sandbox
            </Link>
          </div>
        </div>

        <header className="space-y-2 max-w-3xl">
          <span className="eyebrow text-cyan-300/80">Lab · Architecture evolution</span>
          <h1 className="text-3xl sm:text-4xl display">One system, from 100 to 5 million users</h1>
          <p className="text-[15px] text-slate-400 leading-relaxed">
            Nobody starts with fifty services and a cache cluster. Step through each growth stage to see what broke and the
            smallest change that fixed it.
          </p>
        </header>

        {/* Stage timeline */}
        <nav aria-label="Growth stages">
          <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {EVOLUTION_STAGES.map((s, i) => {
              const active = i === idx;
              const past = i < idx;
              return (
                <li key={s.stage}>
                  <button
                    onClick={() => go(i)}
                    aria-current={active ? "step" : undefined}
                    className={`w-full text-left rounded-lg p-2.5 sm:p-3 border transition-colors ${
                      active
                        ? "border-cyan-300/50 bg-cyan-300/[0.06]"
                        : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden className={`dot ${past || active ? STAGE_DOT[s.status] : "text-slate-600"}`} />
                      <span className="eyebrow !text-[11px]">Stage {s.stage}</span>
                    </div>
                    <div className={`num text-[12px] sm:text-[13px] mt-1 truncate ${active ? "text-white" : "text-slate-400"}`}>
                      {s.userCountLabel.replace(" Users", "")}
                      <span className="hidden sm:inline text-slate-500"> users</span>
                    </div>
                    <span className="sr-only">, {stripEmoji(s.statusBadge)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <StatStrip
          stats={[
            { label: "Traffic", value: m.requestsPerSec.toLocaleString(), unit: "req/s", sub: stage.userCountLabel },
            {
              label: "Peak CPU",
              value: m.cpuUsage,
              unit: "%",
              tone: tone(m.cpuUsage, 50, 80),
              sub: was(prev && `${prev.metrics.cpuUsage}%`) ?? "target < 50%",
            },
            {
              label: "Latency",
              value: m.latencyMs.toLocaleString(),
              unit: "ms",
              tone: tone(m.latencyMs, 400, 1000),
              sub: was(prev && `${prev.metrics.latencyMs.toLocaleString()} ms`) ?? "target < 200 ms",
            },
            {
              label: "Errors",
              value: m.errorRate,
              unit: "%",
              tone: m.errorRate > 0 ? "bad" : "ok",
              sub: was(prev && `${prev.metrics.errorRate}%`),
            },
          ]}
        />

        <div key={stage.stage} className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 animate-fadeIn">
          <div className="space-y-4 min-w-0">
            <Topology
              tiers={toTiers(stage, prev)}
              caption={
                <>
                  <span className="eyebrow">
                    Stage {stage.stage} · {stage.userCountLabel}
                  </span>
                  <span className={`chip ${STAGE_CHIP[stage.status]} !py-0`}>
                    <span className="dot" aria-hidden />
                    {stripEmoji(stage.statusBadge)}
                  </span>
                </>
              }
            />
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => go(idx - 1)} disabled={idx === 0} className="btn btn-secondary">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous stage</span>
                <span className="sm:hidden">Back</span>
              </button>
              <span className="num text-xs text-slate-500">
                {idx + 1} / {EVOLUTION_STAGES.length}
              </span>
              {idx < last ? (
                <button onClick={() => go(idx + 1)} className="btn btn-primary">
                  Grow to {EVOLUTION_STAGES[idx + 1].userCountLabel.replace(" Users", "")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link href="/builder" className="btn btn-primary">
                  Build it yourself
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          <article className="surface p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <h2 className="text-xl display">{stageTitle(stage)}</h2>
              <p className="text-[13px] text-slate-400 leading-relaxed">{stage.description}</p>
            </div>

            {stage.painPoint && (
              <div className="space-y-1.5 pl-3 border-l-2 border-rose-400/50">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
                  What breaks
                </p>
                <p className="text-[13px] text-slate-300 leading-relaxed">{stage.painPoint}</p>
              </div>
            )}

            <div className="space-y-1.5 pl-3 border-l-2 border-cyan-300/50">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
                <Lightbulb className="w-3.5 h-3.5" aria-hidden />
                {stage.painPoint ? "The fix" : "Why it works"}
              </p>
              <p className="text-[13px] text-slate-300 leading-relaxed">{stage.solutionNarrative}</p>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
