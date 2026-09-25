"use client";

import React from "react";

/** Segmented control for switching between a lab's scenarios. */
export default function ScenarioTabs({
  items,
  activeId,
  onSelect,
}: {
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Scenario"
      className="flex items-center gap-1.5 p-1 rounded-xl surface-2 overflow-x-auto max-w-full scrollbar-none"
    >
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(it.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              active
                ? "bg-[var(--surface-3)] text-white shadow-[inset_0_0_0_1px_var(--line-strong)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
