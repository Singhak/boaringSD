"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Users, Server, Layers, Zap, Database, HardDrive, Globe, Trash2, ListFilter } from "lucide-react";
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

  return (
    <div
      className={`min-w-[150px] rounded-xl border bg-[#0e1420] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] transition-all ${
        overloaded
          ? "border-rose-400/70 shadow-[0_0_0_3px_rgba(251,113,133,0.12),0_0_28px_-6px_rgba(251,113,133,0.55)]"
          : warning
          ? "border-amber-300/50"
          : "border-[rgba(148,163,184,0.2)]"
      } ${selected ? "ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-[#080b12]" : ""} ${data.down ? "opacity-50 border-dashed grayscale" : ""}`}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] grid place-items-center shrink-0">
            <Icon className={`w-3.5 h-3.5 ${iconColor[data.type]}`} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-100 leading-tight truncate">{data.label}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{typeLabel[data.type]}</div>
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
        <div className="px-3 pb-2.5 space-y-1">
          {data.down ? (
            <div className="text-[10px] font-medium text-rose-300">Down · failure injected</div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[10px]">
                <span className={overloaded ? "text-rose-300 font-medium" : warning ? "text-amber-200" : "text-slate-500"}>
                  {overloaded ? "Overloaded" : warning ? "Under pressure" : "Load"}
                </span>
                <span className="font-mono tabular-nums text-slate-300">{cpu}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    overloaded ? "bg-rose-400" : warning ? "bg-amber-300" : "bg-emerald-400/80"
                  }`}
                  style={{ width: `${Math.min(100, cpu)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
