"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { BookOpen, Sparkles, X } from "lucide-react";
import { findGlossaryMatches, GlossaryEntry } from "@/data/glossary";
import { isGlossaryTermSeen, markGlossaryTermSeen } from "@/lib/glossarySeen";

interface GlossaryTextProps {
  text: string;
  className?: string;
}

const emptySubscribe = () => () => {};

export default function GlossaryText({ text, className = "" }: GlossaryTextProps) {
  const [activeEntry, setActiveEntry] = useState<{ entry: GlossaryEntry; x: number; y: number } | null>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close tooltip on outside click or escape
  useEffect(() => {
    if (!activeEntry) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveEntry(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveEntry(null);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEntry]);

  const matches = findGlossaryMatches(text);
  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Slice text into segments
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((m, idx) => {
    if (m.start > lastIndex) {
      segments.push(text.slice(lastIndex, m.start));
    }

    const seen = mounted ? isGlossaryTermSeen(m.entry.term) : true;
    const isFirstTime = !seen;

    segments.push(
      <span
        key={`glossary-${idx}`}
        role="button"
        tabIndex={0}
        aria-label={`Definition for ${m.matchedText}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setActiveEntry({
            entry: m.entry,
            x: rect.left,
            y: rect.bottom + window.scrollY,
          });
          markGlossaryTermSeen(m.entry.term);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setActiveEntry({
              entry: m.entry,
              x: rect.left,
              y: rect.bottom + window.scrollY,
            });
            markGlossaryTermSeen(m.entry.term);
          }
        }}
        className={`cursor-help transition-all inline-block ${
          isFirstTime
            ? "border-b-2 border-amber-400 text-amber-200 bg-amber-400/10 px-1 py-0.5 rounded font-medium shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse"
            : "border-b border-dotted border-cyan-400/70 hover:text-cyan-200 hover:border-cyan-300"
        }`}
        title="Tap for 1-sentence definition (free)"
      >
        {m.matchedText}
        {isFirstTime && (
          <Sparkles className="w-2.5 h-2.5 inline ml-0.5 text-amber-400 align-baseline" aria-hidden />
        )}
      </span>
    );

    lastIndex = m.end;
  });

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return (
    <span className={`relative ${className}`}>
      {segments}

      {/* Floating Glossary Tooltip Popover */}
      {activeEntry && (
        <div
          ref={popoverRef}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 max-w-xs sm:max-w-sm p-3.5 rounded-xl border border-cyan-400/40 bg-slate-900/95 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md animate-fadeIn space-y-2"
          style={{
            top: Math.min(window.innerHeight - 180, Math.max(20, activeEntry.y + 8)),
            left: Math.min(window.innerWidth - 320, Math.max(20, activeEntry.x)),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              Glossary: {activeEntry.entry.term}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEntry(null);
              }}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              aria-label="Close definition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            {activeEntry.entry.definition}
          </p>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-white/5">
            <span className="italic text-cyan-400/80">Tap-to-define · 0 budget cost</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEntry(null);
              }}
              className="text-cyan-300 hover:text-cyan-200 font-medium cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
