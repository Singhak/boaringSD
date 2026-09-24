"use client";

import React from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";

export function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onRemove = (data as { onRemove?: (id: string) => void } | undefined)?.onRemove;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? "#38bdf8" : "#0284c7",
          ...(style || {}),
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              onRemove?.(id);
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              selected
                ? "bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 scale-110"
                : "bg-slate-900/90 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-500 shadow-md"
            }`}
            title="Click to remove connection"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
