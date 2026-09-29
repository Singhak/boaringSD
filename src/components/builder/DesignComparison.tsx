"use client";

import React, { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { PALETTE } from "@/components/builder/ArchitectureCanvas";
import { TIER_OF, closestReference, compareDesigns, type DesignTier } from "@/lib/designCompare";
import type { ArchitectureNodeType } from "@/types";

export interface ReferenceDesign {
  id: string;
  name: string;
  components: readonly ArchitectureNodeType[];
  summary?: string;
}

const TIERS: { id: DesignTier; label: string }[] = [
  { id: "edge", label: "Edge" },
  { id: "compute", label: "Compute" },
  { id: "data", label: "Data" },
  { id: "async", label: "Async & ops" },
];

const nameOf = (t: ArchitectureNodeType) => PALETTE.find((p) => p.type === t)?.name ?? t;

/**
 * "Your design vs a strong design": which kinds of components match, which are missing,
 * and which are extra, grouped by tier. When several designs are valid, it compares against
 * the one closest to the learner's and lets them switch.
 */
export default function DesignComparison({
  yours,
  references,
  title = "Your design vs a strong design",
}: {
  yours: readonly ArchitectureNodeType[];
  references: readonly ReferenceDesign[];
  title?: string;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const reference = references.find((r) => r.id === pickedId) ?? closestReference(yours, references);
  if (!reference) return null;
  const diff = compareDesigns(yours, reference.components);

  const chip = (t: ArchitectureNodeType, kind: "matched" | "missing" | "extra") => {
    const Icon = PALETTE.find((p) => p.type === t)?.icon;
    const style = {
      matched: "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-200",
      missing: "border-rose-400/40 bg-rose-400/[0.07] text-rose-200 border-dashed",
      extra: "border-amber-400/30 bg-amber-400/[0.07] text-amber-200",
    }[kind];
    const Mark = kind === "matched" ? Check : kind === "missing" ? Plus : Minus;
    return (
      <li key={`${kind}-${t}`} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${style}`}>
        {Icon && <Icon className="w-3.5 h-3.5 opacity-80" aria-hidden />}
        {nameOf(t)}
        <Mark className="w-3 h-3 opacity-70" aria-label={kind} />
      </li>
    );
  };

  return (
    <section className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-400/20 space-y-4" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">{title}</h3>
        <span className="num text-sm text-cyan-100">{diff.overlap}% overlap</span>
      </div>

      {references.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Compare against">
          {references.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPickedId(r.id)}
              aria-pressed={r.id === reference.id}
              className={`rounded-md px-2 py-0.5 text-[11px] border ${
                r.id === reference.id ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100" : "border-white/10 text-slate-400"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {TIERS.map((tier) => {
          const items = [
            ...diff.matched.filter((t) => TIER_OF[t] === tier.id).map((t) => chip(t, "matched")),
            ...diff.missing.filter((t) => TIER_OF[t] === tier.id).map((t) => chip(t, "missing")),
            ...diff.extra.filter((t) => TIER_OF[t] === tier.id).map((t) => chip(t, "extra")),
          ];
          if (items.length === 0) return null;
          return (
            <div key={tier.id} className="grid grid-cols-[5.5rem_1fr] items-start gap-2">
              <span className="eyebrow !text-[10px] pt-1.5">{tier.label}</span>
              <ul className="flex flex-wrap gap-1.5">{items}</ul>
            </div>
          );
        })}
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-300" aria-hidden /> in both</span>
        <span className="flex items-center gap-1"><Plus className="w-3 h-3 text-rose-300" aria-hidden /> missing from yours</span>
        <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-amber-300" aria-hidden /> extra in yours</span>
      </p>

      {reference.summary && <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">{reference.summary}</p>}
    </section>
  );
}
