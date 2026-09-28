"use client";

import React from "react";
import { Flame, Wallet } from "lucide-react";
import { comboMultiplier, overBudget, type RunEconomy } from "@/lib/runEconomy";

/**
 * Stakes at a glance: the SLA error budget burning down, the cloud-credit
 * wallet, and the combo streak. `comboEvent` bumps on every change so the
 * chip replays its pop or crack animation.
 */
export default function RunHud({
  economy,
  combo,
  comboEvent,
}: {
  economy: RunEconomy;
  combo: number;
  comboEvent: { kind: "up" | "break"; n: number } | null;
}) {
  const budget = economy.budget;
  const tone = budget > 60 ? "emerald" : budget > 25 ? "amber" : "rose";
  const over = overBudget(economy);
  const multiplier = comboMultiplier(combo);

  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0" aria-label="Run stakes">
      <div className="flex items-center gap-1.5" title="SLA error budget: burns while the outage is live and on bad deploys">
        <span className="hidden md:inline text-[11px] text-slate-400 font-mono">SLA</span>
        <div
          className="w-16 sm:w-24 h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden"
          role="meter"
          aria-label="SLA error budget"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(budget)}
        >
          <div
            className={`h-full transition-all duration-500 ${
              tone === "emerald" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : "bg-rose-500 animate-pulse"
            }`}
            style={{ width: `${budget}%` }}
          />
        </div>
        <span
          className={`num text-[11px] font-semibold ${
            tone === "emerald" ? "text-emerald-300" : tone === "amber" ? "text-amber-300" : "text-rose-400"
          }`}
        >
          {Math.round(budget)}%
        </span>
      </div>

      <span
        className={`hidden sm:flex items-center gap-1 num text-[11px] px-1.5 py-0.5 rounded border ${
          over ? "border-rose-400/40 text-rose-300 bg-rose-400/10" : "border-white/10 text-slate-300"
        }`}
        title="Cloud credit spent this run vs. the level's budget; overspending costs a star"
      >
        <Wallet className="w-3 h-3" aria-hidden />${economy.spent}/${economy.creditBudget}
      </span>

      {(combo > 0 || comboEvent?.kind === "break") && (
        <span
          key={comboEvent ? `${comboEvent.kind}-${comboEvent.n}` : "combo"}
          className={`flex items-center gap-1 num text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
            comboEvent?.kind === "break" && combo === 0
              ? "border-rose-400/50 text-rose-300 bg-rose-400/10 animate-combo-break"
              : "border-amber-300/50 text-amber-200 bg-amber-300/10 animate-combo-pop"
          }`}
          aria-live="polite"
          title="First-try, hint-free fixes in a row multiply XP"
        >
          <Flame className="w-3 h-3" aria-hidden />
          {combo === 0 ? "Combo broken" : `Combo ${combo} · ×${multiplier} XP`}
        </span>
      )}
    </div>
  );
}
