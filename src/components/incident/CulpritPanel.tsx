"use client";

import React, { useState } from "react";
import { Check, Crosshair, FileText, X } from "lucide-react";
import { playBlipSound } from "@/lib/sound";
import type { CulpritSpec, IncidentNode } from "@/types";

/**
 * Find the culprit: read each node's logs and flag the one really causing the
 * outage before any fix is offered. The loudest node is often just the victim.
 */
export default function CulpritPanel({
  nodes,
  logs,
  culprit,
  wrongFlags,
  onFlag,
}: {
  nodes: IncidentNode[];
  logs: Record<string, string[]>;
  culprit: CulpritSpec;
  /** Nodes already flagged wrongly this incident. */
  wrongFlags: string[];
  onFlag: (nodeId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const lastWrong = wrongFlags[wrongFlags.length - 1];

  return (
    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-0.5">
      <p className="text-[11px] text-slate-400 leading-snug">
        Open the logs, then flag the node that is <em>causing</em> this. The red box is not always the culprit.
      </p>
      <ul className="space-y-1.5">
        {nodes.map((n) => {
          const open = openId === n.id;
          const ruledOut = wrongFlags.includes(n.id);
          return (
            <li
              key={n.id}
              className={`rounded-xl border p-2 transition-colors ${
                ruledOut ? "border-rose-400/30 bg-rose-400/[0.05] opacity-60" : "border-[var(--line)] bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-medium text-slate-100 min-w-0 truncate">
                  {n.label}
                  <span className="text-[11px] text-slate-500 font-mono ml-1.5">
                    {n.kind}
                    {typeof n.cpu === "number" ? ` · ${n.cpu}% CPU` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playBlipSound();
                      setOpenId(open ? null : n.id);
                    }}
                    aria-expanded={open}
                    className="btn btn-ghost !py-0.5 !px-2 !text-[11px] border border-white/10"
                  >
                    <FileText className="w-3 h-3" aria-hidden /> Logs
                  </button>
                  <button
                    type="button"
                    disabled={ruledOut}
                    onClick={() => onFlag(n.id)}
                    className="btn btn-ghost !py-0.5 !px-2 !text-[11px] border border-amber-400/30 text-amber-200 disabled:opacity-40"
                  >
                    {ruledOut ? <X className="w-3 h-3" aria-hidden /> : <Crosshair className="w-3 h-3" aria-hidden />} Flag
                  </button>
                </span>
              </div>
              {open && (
                <pre className="mt-1.5 text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap bg-black/40 rounded-lg p-2 border border-white/[0.05] animate-fadeIn">
                  {(logs[n.id] ?? ["(no log lines)"]).join("\n")}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
      {lastWrong && (
        <p role="status" className="text-[11px] text-rose-200 flex items-start gap-1.5 animate-fadeIn">
          <X className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          {culprit.wrongNodeFeedback?.[lastWrong] ??
            "That node is reacting to the problem, not causing it. -10% error budget."}
        </p>
      )}
    </div>
  );
}

/** Shown once the culprit is flagged, above the fix choices. */
export function CulpritFound({ label, explanation }: { label: string; explanation: string }) {
  return (
    <div className="shrink-0 p-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] text-[11px] text-emerald-100 flex items-start gap-1.5 animate-fadeIn">
      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" aria-hidden />
      <span>
        <span className="font-semibold">Culprit: {label}.</span> {explanation}
      </span>
    </div>
  );
}
