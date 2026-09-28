"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { knobZone } from "@/lib/knob";
import type { KnobSpec } from "@/types";

/**
 * Tune the knob: the metrics strip previews each position live; Apply deploys it.
 * A wrong apply costs error budget like any bad deploy.
 */
export default function KnobPanel({
  knob,
  value,
  onChange,
  onApply,
  disabled,
  lastResult,
}: {
  knob: KnobSpec;
  value: number;
  onChange: (v: number) => void;
  onApply: () => void;
  disabled: boolean;
  /** Feedback for the last wrong apply, if any. */
  lastResult: { title: string; body: string } | null;
}) {
  const zone = knobZone(knob, value);
  return (
    <div className="space-y-3 flex-1 min-h-0">
      <div className="surface !rounded-xl p-3 space-y-2.5">
        <label className="flex items-center justify-between gap-2 text-xs text-slate-300" htmlFor="incident-knob">
          <span className="flex items-center gap-1.5 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-300" aria-hidden /> {knob.label}
          </span>
          <span
            className={`num text-sm font-semibold ${zone === "good" ? "text-emerald-300" : "text-amber-200"}`}
            aria-live="polite"
          >
            {value.toLocaleString()}
            {knob.unit ? ` ${knob.unit}` : ""}
          </span>
        </label>
        <input
          id="incident-knob"
          type="range"
          min={knob.min}
          max={knob.max}
          step={knob.step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
        <div className="flex justify-between num text-[11px] text-slate-500">
          <span>{knob.min.toLocaleString()}</span>
          <span>{knob.max.toLocaleString()}</span>
        </div>
        <p className="text-[11px] text-slate-400">Watch the metrics strip: it previews this setting live.</p>
      </div>
      {lastResult && (
        <div role="status" className="p-2.5 rounded-xl border border-rose-400/30 bg-rose-400/[0.06] space-y-1 animate-fadeIn">
          <p className="text-xs font-semibold text-rose-300">{lastResult.title}</p>
          <p className="text-xs text-slate-300 leading-relaxed">{lastResult.body}</p>
        </div>
      )}
      <button type="button" onClick={onApply} disabled={disabled} className="btn btn-primary btn-sm w-full justify-center">
        Apply {value.toLocaleString()}
        {knob.unit ? ` ${knob.unit}` : ""}
      </button>
    </div>
  );
}
