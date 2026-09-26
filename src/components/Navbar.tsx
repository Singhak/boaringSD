"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  Flame,
  Home,
  Layers,
  Lock,
  Menu,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { saveUserStats } from "@/lib/storage";
import { getPracticeLabs } from "@/lib/labs";
import { DEFAULT_STATS, getCurrentStreak, getEvidence } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";
import { getAllPatterns } from "@/data/patterns";

export default function Navbar() {
  const pathname = usePathname();
  const stats = useUserStats() ?? DEFAULT_STATS;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [labsOpen, setLabsOpen] = useState(false);
  const labsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labsOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !labsRef.current?.contains(e.target as Node)) {
        setLabsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [labsOpen]);

  const toggleSound = () => saveUserStats({ ...stats, soundEnabled: !stats.soundEnabled });
  const streak = getCurrentStreak(stats, new Date());
  const allPatterns = getAllPatterns();
  const levelsCleared = allPatterns.filter((p) => getEvidence(stats, p.id).runsCleared > 0).length;
  const xpProgressPercent = Math.min(100, Math.round(((stats.currentXp % 150) / 150) * 100));

  const coreNavLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Levels", href: "/campaign", icon: Layers },
    { name: "Progress", href: "/dashboard", icon: BarChart3 },
  ];

  const labs = getPracticeLabs(stats);
  const labActive = labs.some((l) => pathname.startsWith(l.href));

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[#07090f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="System Design Quest home">
          <span className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-cyan-400/30 grid place-items-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
              <path d="M6.5 10v2h11v-2M12 12v2" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            System Design <span className="text-slate-400 font-normal">Quest</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-0.5" aria-label="Main">
          {coreNavLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                isActive(link.href) ? "text-white bg-white/[0.06]" : "text-slate-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}

          <div className="relative" ref={labsRef}>
            <button
              type="button"
              onClick={() => setLabsOpen((o) => !o)}
              aria-expanded={labsOpen}
              aria-haspopup="menu"
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium flex items-center gap-1 transition-colors ${
                labActive || labsOpen ? "text-white bg-white/[0.06]" : "text-slate-400 hover:text-white"
              }`}
            >
              Labs <ChevronDown className={`w-3.5 h-3.5 transition-transform ${labsOpen ? "rotate-180" : ""}`} />
            </button>
            {labsOpen && (
              <div role="menu" className="absolute left-0 top-full mt-2 w-72 p-1.5 surface shadow-2xl animate-fadeIn">
                {labs.map((lab) => {
                  const Icon = lab.icon;
                  const content = (
                    <>
                      <span className="w-8 h-8 rounded-lg surface-2 grid place-items-center shrink-0">
                        {lab.unlocked ? <Icon className="w-4 h-4 text-slate-300" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium">{lab.name}</span>
                        <span className="block text-[11px] text-slate-500">{lab.unlocked ? lab.hint : lab.unlockHint}</span>
                      </span>
                    </>
                  );
                  return lab.unlocked ? (
                    <Link
                      key={lab.name}
                      href={lab.href}
                      role="menuitem"
                      onClick={() => setLabsOpen(false)}
                      className="flex items-center gap-3 p-2 rounded-lg text-slate-200 hover:bg-white/[0.05]"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={lab.name} role="menuitem" aria-disabled className="flex items-center gap-3 p-2 rounded-lg text-slate-500 cursor-not-allowed">
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Status + account */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 pl-3 pr-2.5 h-8 rounded-full border border-[var(--line)] bg-white/[0.02] hover:border-[var(--line-strong)] transition-colors"
            title={`Level ${stats.level} · ${stats.currentXp} XP · ${levelsCleared} of ${allPatterns.length} levels cleared · ${streak}-day streak`}
          >
            <span className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-white">Lv {stats.level}</span>
              <span className="w-12 h-1 rounded-full bg-white/10 overflow-hidden hidden lg:block">
                <span className="block h-full bg-[var(--accent)]" style={{ width: `${xpProgressPercent}%` }} />
              </span>
              <span className="num text-[11px] text-slate-400">{stats.currentXp} XP</span>
            </span>
            <span className="w-px h-3.5 bg-white/10" aria-hidden />
            <span className={`flex items-center gap-1 text-[11px] font-medium ${streak > 0 ? "text-amber-300" : "text-slate-500"}`}>
              <Flame className="w-3.5 h-3.5" aria-hidden />
              <span className="num">{streak}</span>
              <span className="sr-only">day streak</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleSound}
            className="w-8 h-8 grid place-items-center rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label={stats.soundEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-9 h-9 grid place-items-center rounded-lg text-slate-300 hover:bg-white/[0.06]"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--line)] bg-[#07090f] px-4 pt-3 pb-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Lv {stats.level} · <span className="num">{stats.currentXp}</span> XP · {levelsCleared}/{allPatterns.length} levels
            </span>
            <span className="text-amber-300 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {streak}-day streak
            </span>
          </div>
          <div className="space-y-0.5">
            {coreNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                    isActive(link.href) ? "bg-white/[0.06] text-white" : "text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {link.name}
                </Link>
              );
            })}
          </div>
          <div className="space-y-0.5">
            <span className="eyebrow px-3 block pb-1">Labs</span>
            {labs.map((lab) => {
              const Icon = lab.icon;
              return lab.unlocked ? (
                <Link
                  key={lab.name}
                  href={lab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {lab.name}
                </Link>
              ) : (
                <div key={lab.name} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600">
                  <Lock className="w-4 h-4" />
                  {lab.name} <span className="text-[11px]">· {lab.unlockHint}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={toggleSound} className="btn btn-secondary flex-1">
              {stats.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Sound {stats.soundEnabled ? "on" : "off"}
            </button>
          </div>
        </div>
      )}

    </header>
  );
}
