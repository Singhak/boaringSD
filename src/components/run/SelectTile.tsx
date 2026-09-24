"use client";

import React from "react";
import { Check, X } from "lucide-react";

/**
 * idle / selected while choosing; right / wrong after grading;
 * dim for options that were not picked and did not matter.
 */
export type TileState = "idle" | "selected" | "right" | "wrong" | "dim";

const FRAME: Record<TileState, string> = {
  idle: "",
  selected: "!border-cyan-300/60 !bg-cyan-300/[0.07] !text-white",
  right: "!border-emerald-400/60 !bg-emerald-400/[0.08] !text-white",
  wrong: "!border-rose-400/60 !bg-rose-400/[0.07] !text-white",
  dim: "opacity-45",
};

const BOX: Record<TileState, string> = {
  idle: "border-[var(--line-strong)]",
  selected: "border-cyan-300/60 bg-cyan-300/80 text-[#04161a]",
  right: "border-emerald-400/60 bg-emerald-400/20 text-emerald-200",
  wrong: "border-rose-400/60 bg-rose-400/20 text-rose-200",
  dim: "border-[var(--line)]",
};

/** A multi-select option rendered as a `.choice` row with a checkbox. */
export default function SelectTile({
  state,
  pressed,
  disabled,
  onClick,
  children,
  className = "",
}: {
  state: TileState;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`choice !items-start ${FRAME[state]} ${className}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <span aria-hidden className={`w-4 h-4 mt-0.5 shrink-0 rounded grid place-items-center border ${BOX[state]}`}>
        {state === "wrong" ? <X className="w-3 h-3" /> : pressed ? <Check className="w-3 h-3" strokeWidth={3} /> : null}
      </span>
      {state === "right" && <span className="sr-only"> (correct)</span>}
      {state === "wrong" && <span className="sr-only"> (not needed)</span>}
    </button>
  );
}
