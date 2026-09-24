"use client";

import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, Trophy, X, Zap } from "lucide-react";
import { playSuccessSound } from "@/lib/sound";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  xpEarned: number;
  badgeEarned?: string;
  onNext?: () => void;
  nextLabel?: string;
}

export default function LevelUpModal({
  isOpen,
  onClose,
  title,
  subtitle,
  xpEarned,
  badgeEarned,
  onNext,
  nextLabel = "Continue",
}: LevelUpModalProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  // Callers pass inline closures; keep the latest without re-running the celebration.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    playSuccessSound();
    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ["#38d6e8", "#34d399", "#fbbf24"] });
    } catch {
      // Canvas unavailable
    }
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(7,9,15,0.8)] backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
        className="surface-accent relative w-full max-w-md p-6 sm:p-8 space-y-6"
      >
        <button onClick={onClose} className="btn btn-ghost !p-1.5 absolute top-3 right-3" aria-label="Close">
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-3">
          <span className="w-11 h-11 rounded-xl border border-amber-300/40 bg-amber-300/[0.08] grid place-items-center">
            <Trophy className="w-5 h-5 text-amber-300" aria-hidden />
          </span>
          <h2 id="levelup-title" className="text-2xl display pr-6">
            {title}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-warn">
            <Zap className="w-3 h-3" aria-hidden />
            <span className="num">+{xpEarned} XP</span>
          </span>
          {badgeEarned && (
            <span className="chip chip-ok">
              <Trophy className="w-3 h-3" aria-hidden />
              {badgeEarned}
            </span>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Stay here
          </button>
          {onNext && (
            <button
              ref={primaryRef}
              onClick={() => {
                onClose();
                onNext();
              }}
              className="btn btn-primary flex-1"
            >
              {nextLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
