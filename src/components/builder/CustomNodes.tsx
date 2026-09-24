"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Users,
  Server,
  Layers,
  Zap,
  Database,
  HardDrive,
  Globe,
  Trash2,
  Cpu,
  ListFilter,
} from "lucide-react";
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

const colorMap = {
  client: "border-cyan-500/50 bg-cyan-950/30 text-cyan-400",
  load_balancer: "border-emerald-500/50 bg-emerald-950/30 text-emerald-400",
  server: "border-blue-500/50 bg-blue-950/30 text-blue-400",
  cache: "border-amber-500/50 bg-amber-950/30 text-amber-400",
  database: "border-purple-500/50 bg-purple-950/30 text-purple-400",
  replica: "border-teal-500/50 bg-teal-950/30 text-teal-400",
  cdn: "border-sky-500/50 bg-sky-950/30 text-sky-400",
  queue: "border-indigo-500/50 bg-indigo-950/30 text-indigo-400",
};

export const ArchNode = memo(function ArchNode({
  data,
  selected,
}: NodeProps & { data: CustomNodeData }) {
  const Icon = iconMap[data.type] || Server;
  const colorClass = colorMap[data.type] || "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <div
      className={`min-w-[140px] px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${colorClass} ${
        selected ? "ring-2 ring-cyan-400 scale-105" : ""
      } ${data.status === "overloaded" ? "animate-pulse border-rose-500 text-rose-400" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-400 !w-2.5 !h-2.5"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-black/40">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">{data.label}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">
              {data.type.replace("_", " ")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {data.status === "overloaded" && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}

          {data.onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onRemove?.();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="Remove this node"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {data.cpu !== undefined && (
        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">Load:</span>
          <span
            className={
              data.cpu > 80
                ? "text-rose-400 font-bold"
                : data.cpu > 50
                ? "text-amber-400"
                : "text-emerald-400"
            }
          >
            {data.cpu}%
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-400 !w-2.5 !h-2.5"
      />
    </div>
  );
});
