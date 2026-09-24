"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface PostMortemData {
  incidentId: string;
  title: string;
  impact: string;
  rootCause: string;
  fix: string;
  followUp: string;
  before: { latencyMs: number; errorRate: number; cpu: number };
  after: { latencyMs: number; errorRate: number; cpu: number };
}

function toText(d: PostMortemData): string {
  return [
    `Post-mortem ${d.incidentId}: ${d.title}`,
    `Impact: ${d.impact}`,
    `Root cause: ${d.rootCause}`,
    `Fix: ${d.fix}`,
    `Latency: ${d.before.latencyMs.toLocaleString()}ms → ${d.after.latencyMs.toLocaleString()}ms`,
    `Error rate: ${d.before.errorRate}% → ${d.after.errorRate}%`,
    `Peak CPU: ${d.before.cpu}% → ${d.after.cpu}%`,
    `Follow-up risk: ${d.followUp}`,
  ].join("\n");
}

/** A post-mortem built from the scenario's real numbers, with a copyable summary. */
export default function PostMortemCard({ data }: { data: PostMortemData }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const rows = [
    { label: "p95 latency", before: data.before.latencyMs, after: data.after.latencyMs, unit: "ms" },
    { label: "Error rate", before: data.before.errorRate, after: data.after.errorRate, unit: "%" },
    { label: "Peak CPU", before: data.before.cpu, after: data.after.cpu, unit: "%" },
  ];

  return (
    <article className="surface overflow-hidden" aria-label="Incident post-mortem">
      <header className="px-5 py-3.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="eyebrow">Post-mortem · {data.incidentId}</span>
          <span className="chip chip-ok !py-0">
            <span className="dot" aria-hidden /> Resolved
          </span>
        </div>
        <button type="button" onClick={copy} className="btn btn-ghost !py-1 text-xs">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy summary"}
        </button>
      </header>

      <div className="p-5 space-y-5">
        <h4 className="text-base display">{data.title}</h4>

        <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden bg-[var(--line)]">
          {rows.map((r) => (
            <div key={r.label} className="bg-[var(--surface)] p-3">
              <div className="eyebrow !text-[10px]">{r.label}</div>
              <div className="num text-lg text-emerald-300 mt-1">
                {r.after.toLocaleString()}
                <span className="text-xs text-slate-500 ml-0.5">{r.unit}</span>
              </div>
              <div className="num text-[11px] text-rose-300/70 line-through decoration-rose-300/40">
                {r.before.toLocaleString()}
                {r.unit}
              </div>
            </div>
          ))}
        </div>

        <dl className="space-y-3 text-[13px] leading-relaxed">
          {[
            ["Impact", data.impact],
            ["Root cause", data.rootCause],
            ["Fix", data.fix],
            ["Follow-up risk", data.followUp],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[96px_1fr] gap-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-300">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
