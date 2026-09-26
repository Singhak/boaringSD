"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Lightbulb,
  MessageSquareQuote,
  Scale,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { ConceptIntel } from "@/types";
import { getConceptIntel } from "@/data/conceptIntel";

interface ConceptIntelDrawerProps {
  intelId: string | null;
  onClose: () => void;
}

export default function ConceptIntelDrawer({ intelId, onClose }: ConceptIntelDrawerProps) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!intelId) return null;
  const intel: ConceptIntel | undefined = getConceptIntel(intelId);
  if (!intel) return null;

  const handleCopyInterview = () => {
    navigator.clipboard.writeText(intel.interviewPlaybook.sampleDialogue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto surface !rounded-2xl border border-cyan-400/30 p-6 sm:p-8 space-y-6 shadow-[0_25px_80px_-20px_rgba(34,211,238,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="chip chip-accent !text-[11px] !py-0.5">
                <Lightbulb className="w-3 h-3 text-cyan-300" />
                Just-In-Time Concept Intel
              </span>
              <span className="chip !text-[11px] !py-0.5 uppercase tracking-wider font-mono text-slate-400">
                {intel.category}
              </span>
            </div>
            <h2 id="intel-title" className="text-2xl sm:text-3xl display text-white">
              {intel.name}
            </h2>
            <p className="text-sm text-cyan-200/90 leading-relaxed">{intel.oneLiner}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
            aria-label="Close intel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 30-Second ELI5 Analogy */}
        <section className="p-4 sm:p-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.04] space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>30-Second ELI5 Analogy: {intel.eli5Analogy.title}</span>
          </div>
          <p className="text-sm text-amber-100/90 leading-relaxed italic">
            &ldquo;{intel.eli5Analogy.story}&rdquo;
          </p>
        </section>

        {/* Visual Dataflow */}
        <section className="space-y-2">
          <span className="eyebrow text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Visual Architecture & Dataflow
          </span>
          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.06] font-mono text-xs sm:text-sm text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
            {intel.visualFlow}
          </div>
        </section>

        {/* Why it works */}
        <section className="space-y-2">
          <span className="eyebrow text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-300" />
            Under The Hood: Why It Works
          </span>
          <p className="text-sm text-slate-300 leading-relaxed bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--line)]">
            {intel.whyItWorks}
          </p>
        </section>

        {/* Tradeoffs */}
        <section className="space-y-3">
          <span className="eyebrow text-slate-400 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-slate-300" />
            Architectural Trade-Off Ledger
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.03] space-y-2">
              <span className="font-semibold text-emerald-300 block">Advantages</span>
              <ul className="space-y-1.5 text-slate-300">
                {intel.tradeoffs.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-xl border border-rose-400/20 bg-rose-400/[0.03] space-y-2">
              <span className="font-semibold text-rose-300 block">Engineering Costs & Traps</span>
              <ul className="space-y-1.5 text-slate-300">
                {intel.tradeoffs.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAANG Interview Playbook */}
        <section className="p-4 sm:p-5 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.04] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
              <MessageSquareQuote className="w-4 h-4 text-cyan-400" />
              <span>FAANG Interview Talking Point</span>
            </div>
            <button
              onClick={handleCopyInterview}
              className="btn btn-ghost !py-1 !px-2.5 !text-xs flex items-center gap-1.5 border border-cyan-400/20"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy script</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            <span className="text-cyan-200 font-medium">When to bring up: </span>
            {intel.interviewPlaybook.whenToUse}
          </p>
          <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] text-xs sm:text-sm text-cyan-100 font-mono italic">
            &ldquo;{intel.interviewPlaybook.sampleDialogue}&rdquo;
          </div>
        </section>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn btn-primary btn-md">
            Got it, back to the flight deck
          </button>
        </div>
      </div>
    </div>
  );
}
