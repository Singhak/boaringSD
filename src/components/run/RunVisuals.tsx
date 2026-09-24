"use client";

import React from "react";
import { Check } from "lucide-react";
import type { PatternId, RunStage, SystemMetrics } from "@/types";

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

export const RUN_STAGES: { id: RunStage; label: string }[] = [
  { id: "observe", label: "Observe" },
  { id: "diagnose", label: "Diagnose" },
  { id: "choose", label: "Deploy" },
  { id: "counter", label: "Tradeoff" },
  { id: "transfer", label: "Transfer" },
  { id: "result", label: "Result" },
];

export function RunStepper({ stage }: { stage: RunStage }) {
  return <Stepper steps={RUN_STAGES} current={RUN_STAGES.findIndex((s) => s.id === stage)} label="Run progress" />;
}

/**
 * Segmented progress bar. Pass `onSelect` to let people jump back to steps
 * they have already reached; later steps stay inert.
 */
export function Stepper({
  steps,
  current,
  label = "Progress",
  onSelect,
}: {
  steps: { id: string; label: string }[];
  current: number;
  label?: string;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label={label}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const body = (
          <>
            <div
              className={`h-1 rounded-full transition-colors duration-500 ${
                done ? "bg-emerald-400/70" : active ? "bg-[var(--accent)]" : "bg-white/[0.07]"
              }`}
            />
            <div
              className={`flex items-center gap-1.5 text-[11px] font-medium truncate ${
                done ? "text-emerald-300/80" : active ? "text-white" : "text-slate-500"
              }`}
            >
              {done ? (
                <Check className="w-3 h-3 shrink-0" aria-hidden />
              ) : (
                <span className="num text-[10px] opacity-60" aria-hidden>
                  {i + 1}
                </span>
              )}
              <span className={`truncate ${active ? "" : "sr-only sm:not-sr-only"}`}>
                <span className="sr-only">Step {i + 1}: </span>
                {s.label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </div>
          </>
        );
        return (
          <li key={s.id} aria-current={active ? "step" : undefined} className="flex-1 min-w-0">
            {onSelect && i <= current ? (
              <button type="button" onClick={() => onSelect(i)} className="w-full text-left space-y-2 rounded-md hover:opacity-90">
                {body}
              </button>
            ) : (
              <div className="space-y-2">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type Tone = "ok" | "warn" | "bad" | "neutral";

export interface Stat {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: Tone;
  /** Small line under the value, e.g. "was 96%" or a target. */
  sub?: string;
}

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-emerald-300",
  warn: "text-amber-300",
  bad: "text-rose-300",
  neutral: "text-white",
};

const TONE_DOT: Record<Tone, string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-rose-400 animate-pulse-glow",
  neutral: "",
};

const TONE_SR: Record<Tone, string> = { ok: "", warn: " (warning)", bad: " (unhealthy)", neutral: "" };

/** A row of readouts sharing one frame. Colour only where it means something. */
export function StatStrip({ stats, label = "System metrics" }: { stats: Stat[]; label?: string }) {
  const cols = stats.length >= 4 ? "sm:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div
      className={`grid grid-cols-2 ${cols} surface overflow-hidden !rounded-xl divide-x divide-y sm:divide-y-0 divide-[var(--line)]`}
      role="group"
      aria-label={label}
    >
      {stats.map((m, i) => {
        const tone = m.tone ?? "neutral";
        // An odd count leaves a hole in the 2-column phone grid; let the last cell fill the row.
        const span = stats.length % 2 === 1 && i === stats.length - 1 ? "col-span-2 sm:col-span-1" : "";
        return (
          <div key={m.label} className={`p-3.5 space-y-1 min-w-0 ${span}`}>
            <div className="flex items-center gap-1.5">
              {tone !== "neutral" && <span aria-hidden className={`dot ${TONE_DOT[tone]}`} />}
              <span className="eyebrow truncate">{m.label}</span>
            </div>
            <div className={`num text-xl font-medium transition-colors duration-700 ${TONE_TEXT[tone]}`}>
              {m.value}
              {m.unit && <span className="text-xs text-slate-500 ml-1">{m.unit}</span>}
              {TONE_SR[tone] && <span className="sr-only">{TONE_SR[tone]}</span>}
            </div>
            <div className="num text-[11px] text-slate-500 h-4 truncate">{m.sub ?? ""}</div>
          </div>
        );
      })}
    </div>
  );
}

export function MetricsStrip({ metrics, before }: { metrics: SystemMetrics; before?: SystemMetrics }) {
  const was = (v: string | undefined) => (v ? `was ${v}` : undefined);
  return (
    <StatStrip
      stats={[
        { label: "Traffic", value: metrics.requestsPerSec.toLocaleString(), unit: "req/s" },
        {
          label: "CPU",
          value: metrics.cpuUsage,
          unit: "%",
          tone: metrics.cpuUsage > 80 ? "bad" : "ok",
          sub: was(before && `${before.cpuUsage}%`),
        },
        {
          label: "Latency",
          value: metrics.latencyMs.toLocaleString(),
          unit: "ms",
          tone: metrics.latencyMs > 1000 ? "bad" : "ok",
          sub: was(before && `${before.latencyMs.toLocaleString()} ms`),
        },
        {
          label: "Errors",
          value: metrics.errorRate,
          unit: "%",
          tone: metrics.errorRate > 0 ? "bad" : "ok",
          sub: was(before && `${before.errorRate}%`),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Topology (before/after for each pattern)
// ---------------------------------------------------------------------------

export type Health = "ok" | "hot" | "warn" | "idle" | "new";
export interface Box {
  label: string;
  health: Health;
  note?: string;
}
export type Tier = Box[];

export const T = (label: string, health: Health = "ok", note?: string): Box => ({ label, health, note });

const TOPOLOGIES: Record<PatternId, { before: Tier[]; after: Tier[] }> = {
  "horizontal-scaling": {
    before: [[T("Users")], [T("API Server", "hot", "96% CPU")], [T("Database")]],
    after: [[T("Users")], [T("API Server 1", "ok", "45%"), T("API Server 2", "new", "45%"), T("API Server 3", "new", "45%")], [T("Database")]],
  },
  "load-balancing": {
    before: [
      [T("Users")],
      [T("Server 1", "hot", "100% of traffic"), T("Server 2", "idle", "0%"), T("Server 3", "idle", "0%")],
      [T("Database")],
    ],
    after: [
      [T("Users")],
      [T("Load Balancer", "new")],
      [T("Server 1", "ok", "33%"), T("Server 2", "ok", "33%"), T("Server 3", "ok", "33%")],
      [T("Database")],
    ],
  },
  "read-replicas": {
    before: [[T("Users")], [T("Load Balancer")], [T("Servers ×3", "ok", "40%")], [T("Primary DB", "hot", "reads + writes, 99%")]],
    after: [
      [T("Users")],
      [T("Load Balancer")],
      [T("Servers ×3", "ok", "40%")],
      [T("Primary DB", "ok", "writes"), T("Replica 1", "new", "reads"), T("Replica 2", "new", "reads")],
    ],
  },
  caching: {
    before: [[T("Users")], [T("Load Balancer")], [T("Servers")], [T("Primary + Replicas", "hot", "same row ×50k/s")]],
    after: [[T("Users")], [T("Load Balancer")], [T("Servers")], [T("Cache", "new", "95% hits"), T("Primary + Replicas", "ok", "misses only")]],
  },
  "cdn-edge": {
    before: [[T("Users worldwide")], [T("Ocean crossing", "hot", "+300ms per trip")], [T("Origin stack")]],
    after: [[T("Users worldwide")], [T("CDN edge", "new", "static assets nearby")], [T("Origin stack", "ok", "dynamic only")]],
  },
  "async-queues": {
    before: [[T("Users")], [T("Servers", "hot", "threads blocked")], [T("Payment API", "hot", "slow"), T("Email API", "hot", "slow")]],
    after: [[T("Users")], [T("Servers", "ok", "respond fast")], [T("Queue", "new")], [T("Workers", "new"), T("Payment / Email")]],
  },
};

const HEALTH_STYLES: Record<Health, string> = {
  ok: "border-[var(--line-strong)] bg-[var(--surface-2)] text-slate-200",
  hot: "border-rose-400/60 bg-rose-400/[0.08] text-rose-100 shadow-[0_0_24px_-6px_rgba(251,113,133,0.5)]",
  warn: "border-amber-300/50 bg-amber-300/[0.06] text-amber-100",
  idle: "border-dashed border-[var(--line)] bg-transparent text-slate-500",
  new: "border-emerald-400/60 bg-emerald-400/[0.07] text-emerald-100 shadow-[0_0_24px_-8px_rgba(52,211,153,0.5)]",
};

const HEALTH_DOT: Record<Health, string> = {
  ok: "text-emerald-400",
  hot: "text-rose-400 animate-pulse-glow",
  warn: "text-amber-300",
  idle: "text-slate-600",
  new: "text-emerald-300",
};

const HEALTH_TEXT: Record<Health, string> = {
  ok: "healthy",
  hot: "overloaded",
  warn: "under strain",
  idle: "idle",
  new: "newly added",
};

export function RunTopology({ patternId, fixed }: { patternId: PatternId; fixed: boolean }) {
  return <Topology tiers={TOPOLOGIES[patternId][fixed ? "after" : "before"]} />;
}

/**
 * Left-to-right request path (stacks vertically on phones). Each tier is a
 * column of boxes and health drives colour. Empty tiers are skipped.
 */
export function Topology({ tiers, caption }: { tiers: Tier[]; caption?: React.ReactNode }) {
  const visible = tiers.filter((t) => t.length > 0);
  return (
    <div className="surface !rounded-xl p-5 sm:p-6 space-y-5">
      {caption && <div className="flex flex-wrap items-center justify-between gap-2">{caption}</div>}
      <div
        className="flex flex-col md:flex-row items-stretch md:items-center justify-center gap-2 md:gap-0 md:overflow-x-auto md:-mx-1 md:px-1 md:py-1"
        role="img"
        aria-label={visible.map((t) => t.map((b) => `${b.label} ${HEALTH_TEXT[b.health]}`).join(", ")).join(" → ")}
      >
        {visible.map((tier, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div aria-hidden className="flex md:flex-1 justify-center md:min-w-4 md:max-w-14">
                <span className="block w-px h-4 md:w-full md:h-px bg-gradient-to-b md:bg-gradient-to-r from-cyan-400/10 via-cyan-400/50 to-cyan-400/10" />
              </div>
            )}
            <div className="flex md:flex-col gap-2 justify-center flex-wrap md:flex-nowrap shrink-0">
              {tier.map((box) => (
                <div
                  key={box.label}
                  className={`px-2.5 py-2 rounded-lg border text-left md:min-w-[96px] transition-all duration-700 animate-fadeIn ${HEALTH_STYLES[box.health]}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                    <span aria-hidden className={`dot ${HEALTH_DOT[box.health]}`} />
                    {box.label}
                  </div>
                  {box.note && <div className="num text-[10px] opacity-70 mt-0.5 pl-3">{box.note}</div>}
                </div>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
