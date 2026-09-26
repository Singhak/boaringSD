"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Users, Server, Layers, Zap, Database, HardDrive, Globe, Trash2, ListFilter, Flame, AlertTriangle } from "lucide-react";
import { CustomNodeData } from "@/types";

const iconMap = {
  client: Users,
  load_balancer: Layers,
  server: Server,
  cache: Zap,
  database: Database,
  replica: HardDrive,
  cdn: Globe,
  queue: ListFilter,
};

const iconColor = {
  client: "text-cyan-300",
  load_balancer: "text-emerald-300",
  server: "text-sky-300",
  cache: "text-amber-300",
  database: "text-violet-300",
  replica: "text-teal-300",
  cdn: "text-sky-300",
  queue: "text-indigo-300",
};

const typeLabel = {
  client: "Users",
  load_balancer: "Load balancer",
  server: "App server",
  cache: "Cache",
  database: "Primary DB",
  replica: "Read replica",
  cdn: "CDN",
  queue: "Queue",
};

export const ArchNode = memo(function ArchNode({ data, selected }: NodeProps & { data: CustomNodeData }) {
  const Icon = iconMap[data.type] || Server;
  const overloaded = data.status === "overloaded" && !data.down;
  const warning = data.status === "warning" && !data.down;
  const cpu = data.cpu ?? 0;
  const queueDepth = data.queueDepth ?? 0;

  return (
    <div
      className={`min-w-[155px] rounded-xl border bg-[#0e1420] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] transition-all overflow-hidden ${
        overloaded
          ? "border-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.3),0_0_32px_rgba(244,63,94,0.65)] animate-node-shake"
          : warning
          ? "border-amber-400/60 shadow-[0_0_20px_-4px_rgba(251,191,36,0.35)]"
          : "border-[rgba(148,163,184,0.2)]"
      } ${selected ? "ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-[#080b12]" : ""} ${data.down ? "opacity-50 border-dashed grayscale" : ""}`}
    >
      <Handle type="target" position={Position.Left} />

      {overloaded && (
        <div className="bg-rose-500/25 border-b border-rose-500/40 px-3 py-1 flex items-center justify-between text-[11px] text-rose-300 font-mono font-bold animate-pulse">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-flame" /> MELTDOWN
          </span>
          <span className="text-[11px] bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">504 DROPS</span>
        </div>
      )}

      {warning && (
        <div className="bg-amber-500/15 border-b border-amber-500/25 px-3 py-0.5 flex items-center justify-between text-[11px] text-amber-300 font-mono">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> HEATING UP
          </span>
          <span className="text-[11px] text-amber-200/80">QUEUE RISING</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-7 h-7 rounded-lg border grid place-items-center shrink-0 transition-colors ${
            overloaded
              ? "bg-rose-500/20 border-rose-500/50"
              : warning
              ? "bg-amber-500/15 border-amber-500/30"
              : "bg-white/[0.04] border-white/[0.06]"
          }`}>
            <Icon className={`w-3.5 h-3.5 ${overloaded ? "text-rose-400 animate-flame" : iconColor[data.type]}`} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-100 leading-tight truncate">{data.label}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{typeLabel[data.type]}</div>
          </div>
        </div>
        {data.onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onRemove?.();
            }}
            className="p-1 rounded-md text-slate-600 hover:text-rose-300 hover:bg-rose-400/10 transition-colors"
            aria-label={`Remove ${data.label}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {(data.down || data.cpu !== undefined) && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {data.down ? (
            <div className="text-[11px] font-medium text-rose-300">Down · failure injected</div>
          ) : (
            <>
              {/* CPU Core Utilization */}
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={overloaded ? "text-rose-300 font-bold" : warning ? "text-amber-200" : "text-slate-500"}>
                    {overloaded ? "CPU Saturated" : warning ? "Under pressure" : "CPU Load"}
                  </span>
                  <span className={`font-mono tabular-nums text-[11px] ${
                    overloaded ? "text-rose-300 font-bold" : warning ? "text-amber-200" : "text-slate-300"
                  }`}>
                    {cpu}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      overloaded ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]" : warning ? "bg-amber-300" : "bg-emerald-400/80"
                    }`}
                    style={{ width: `${Math.min(100, cpu)}%` }}
                  />
                </div>
              </div>

              {/* Queue Depth Buffer Liquid Level */}
              {queueDepth > 0 && (
                <div className="pt-1 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={queueDepth > 75 ? "text-rose-400 font-medium" : queueDepth > 25 ? "text-amber-300" : "text-slate-400"}>
                      Queue Tank
                    </span>
                    <span className={`font-mono text-[11px] ${queueDepth > 75 ? "text-rose-300 font-bold" : "text-slate-400"}`}>
                      {queueDepth > 85 ? "OVERFLOW" : `${queueDepth}%`}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        queueDepth > 75
                          ? "bg-rose-400 animate-pulse"
                          : queueDepth > 25
                          ? "bg-amber-400"
                          : "bg-cyan-400/70"
                      }`}
                      style={{ width: `${Math.min(100, queueDepth)}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
