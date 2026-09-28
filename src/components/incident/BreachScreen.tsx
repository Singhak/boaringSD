"use client";

import React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import type { BreachPostMortem } from "@/lib/runEconomy";

/** SEV-0: the error budget hit 0. A three-line post-mortem, no stars, and a one-click restart. */
export default function BreachScreen({ postMortem, onRestart }: { postMortem: BreachPostMortem; onRestart: () => void }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto grid place-items-center p-4 animate-fadeIn" role="alert">
      <div className="max-w-lg w-full space-y-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 grid place-items-center text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.5)]">
          <AlertOctagon className="w-8 h-8" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="chip chip-bad mx-auto">SEV-0 · SLA breach</p>
          <h2 className="text-2xl display text-white">The error budget ran out</h2>
        </div>
        <ol className="text-left space-y-2 surface !rounded-xl p-4 text-[13px] leading-relaxed">
          <li>
            <span className="eyebrow !text-[11px] text-rose-300 block">What you deployed</span>
            <span className="text-slate-200">{postMortem.deployed}</span>
          </li>
          <li>
            <span className="eyebrow !text-[11px] text-rose-300 block">Why it made things worse</span>
            <span className="text-slate-200">{postMortem.worse}</span>
          </li>
          <li>
            <span className="eyebrow !text-[11px] text-amber-300 block">The signal you missed</span>
            <span className="text-slate-200">{postMortem.missed}</span>
          </li>
        </ol>
        <p className="text-xs text-slate-400">No stars this time. The incident restarts with a full budget.</p>
        <button type="button" onClick={onRestart} className="btn btn-primary btn-lg mx-auto">
          <RotateCcw className="w-4 h-4" aria-hidden /> Restart incident
        </button>
      </div>
    </div>
  );
}
