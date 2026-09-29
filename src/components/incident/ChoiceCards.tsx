"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { visibleChoiceChips, type ChipTone } from "@/lib/choiceChips";
import GlossaryText from "@/components/common/GlossaryText";
import type { IncidentChoice } from "@/types";

const CARD_CHIP_CLASS: Record<ChipTone, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/25",
  bad: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  neutral: "bg-black/30 text-slate-400 border-white/[0.04]",
};

/**
 * Deployable choice cards. Trade-off chips always show; the approach rating
 * waits until that card is deployed. `holding` marks a band-aid that looks fine for now.
 */
export default function ChoiceCards({
  choices,
  selectedId,
  submitted,
  locked,
  holding = false,
  actionLabel = "Deploy",
  onDeploy,
}: {
  choices: IncidentChoice[];
  selectedId: string | null;
  submitted: boolean;
  /** Disables every card (solved, or a band-aid is holding). */
  locked: boolean;
  holding?: boolean;
  /** The button word: "Deploy", or "Revert" / "Cut it" for the PR and budget formats. */
  actionLabel?: string;
  onDeploy: (choice: IncidentChoice) => void;
}) {
  return (
    <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
      {choices.map((choice) => {
        const isSelected = selectedId === choice.id;
        const deployed = isSelected && submitted;
        // A holding band-aid must not reveal its rating: it is supposed to look fine for now.
        const chips = visibleChoiceChips(choice, deployed && !holding, choices);
        const stateClass = !deployed
          ? "border-[var(--line)] bg-[var(--surface-2)] text-slate-200 hover:border-slate-500 hover:bg-white/[0.04]"
          : holding
          ? "border-amber-400/70 bg-amber-400/10 text-amber-50"
          : choice.correct
          ? "border-emerald-400/80 bg-emerald-400/10 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
          : "border-rose-400/80 bg-rose-400/10 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]";

        return (
          <button
            key={choice.id}
            type="button"
            disabled={locked}
            onClick={() => onDeploy(choice)}
            className={`w-full p-2.5 rounded-xl border text-left transition-all duration-300 flex flex-col gap-1 group cursor-pointer disabled:cursor-default ${stateClass}`}
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-5 h-5 rounded-full border grid place-items-center text-[11px] font-mono shrink-0 mt-0.5 ${
                    deployed
                      ? holding
                        ? "border-amber-400 bg-amber-400/20 text-amber-200"
                        : choice.correct
                        ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                        : "border-rose-400 bg-rose-400/20 text-rose-300"
                      : "border-[var(--line)] text-slate-400 group-hover:border-slate-400"
                  }`}
                >
                  {deployed && !holding ? (
                    choice.correct ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />
                  ) : (
                    "▶"
                  )}
                </span>
                <span className="text-xs sm:text-sm font-medium leading-snug break-words">
                  <GlossaryText text={choice.label} />
                </span>
              </div>
              <span className="text-[11px] text-slate-500 group-hover:text-cyan-300 transition-colors shrink-0 mt-0.5">
                {actionLabel}
              </span>
            </div>

            {choice.diff && (
              <pre className="ml-7 overflow-x-auto rounded-lg border border-[var(--line)] bg-black/40 p-2 text-[11px] leading-snug font-mono text-slate-300">
                {choice.diff.split(/\r?\n/).map((line, i) => (
                  <span
                    key={i}
                    className={`block ${line.startsWith("+") ? "text-emerald-300" : line.startsWith("-") ? "text-rose-300" : ""}`}
                  >
                    {line || " "}
                  </span>
                ))}
              </pre>
            )}

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-7 text-[11px]">
                {chips.map((chip) => (
                  <span
                    key={chip.kind}
                    className={`px-1.5 py-0.5 rounded font-mono border ${CARD_CHIP_CLASS[chip.tone]} ${
                      chip.kind === "consistency" ? "capitalize" : ""
                    }`}
                  >
                    {chip.kind === "approach" ? `Senior engineer's rating: ${chip.label}` : chip.label}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
