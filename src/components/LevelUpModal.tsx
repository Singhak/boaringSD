"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Zap, ArrowRight, X } from "lucide-react";
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
  nextLabel = "Continue Quest",
}: LevelUpModalProps) {
  useEffect(() => {
    if (isOpen) {
      playSuccessSound();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6"],
        });
      } catch {
        // Safe fallback
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#131d31] to-[#090d16] border border-cyan-500/40 shadow-2xl shadow-cyan-500/10 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] mb-5">
          <div className="w-full h-full bg-[#090d16] rounded-2xl flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
          </div>
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">{subtitle}</p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2 text-cyan-300 font-bold text-sm">
            <Zap className="w-4 h-4 fill-cyan-400 text-cyan-400" />
            <span>+{xpEarned} XP Earned</span>
          </div>

          {badgeEarned && (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-sm">
              🏆 {badgeEarned}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
          >
            Review Architecture
          </button>
          {onNext && (
            <button
              onClick={() => {
                onClose();
                onNext();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <span>{nextLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
