"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  ChevronDown,
  Compass,
  Flame,
  GitBranch,
  Home,
  Layers,
  Lock,
  LogOut,
  Menu,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { saveUserStats, loginUser, logoutUser, getFeatureUnlockStatus } from "@/lib/storage";
import { DEFAULT_STATS, getCurrentStreak, getEvidence } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";
import { getAllPatterns } from "@/data/patterns";
import { playSuccessSound, playBlipSound } from "@/lib/sound";

export default function Navbar() {
  const pathname = usePathname();
  const stats = useUserStats() ?? DEFAULT_STATS;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [labsOpen, setLabsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
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
  const unlockStatus = getFeatureUnlockStatus(stats);
  const streak = getCurrentStreak(stats, new Date());
  const allPatterns = getAllPatterns();
  const levelsCleared = allPatterns.filter((p) => getEvidence(stats, p.id).runsCleared > 0).length;
  const xpProgressPercent = Math.min(100, Math.round(((stats.currentXp % 150) / 150) * 100));

  const coreNavLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Levels", href: "/campaign", icon: Layers },
    { name: "Progress", href: "/dashboard", icon: BarChart3 },
  ];

  const labs = [
    {
      name: "Architecture Sandbox",
      hint: "Build and break anything",
      href: "/builder",
      icon: Sparkles,
      unlocked: unlockStatus.builder.unlocked,
      unlockHint: "Unlocks at Level 2",
    },
    {
      name: "Interview Arena",
      hint: "Timed design practice",
      href: "/interview",
      icon: Award,
      unlocked: unlockStatus.interview.unlocked,
      unlockHint: "Unlocks at Level 2",
    },
    {
      name: "Challenge Lab",
      hint: "Requirements → APIs → design",
      href: "/guided",
      icon: Compass,
      unlocked: unlockStatus.challengeLab.unlocked,
      unlockHint: "Unlocks at Level 3",
    },
    {
      name: "Architecture Evolution",
      hint: "How systems grow",
      href: "/evolution",
      icon: GitBranch,
      unlocked: true,
      unlockHint: "",
    },
  ];
  const labActive = labs.some((l) => pathname.startsWith(l.href));

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const handleGoogleLogin = () => {
    playSuccessSound();
    loginUser("alex.chen@systemdesignquest.io", "Alex Chen");
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    playBlipSound();
    logoutUser();
  };

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

          {stats.isLoggedIn ? (
            <div className="flex items-center gap-1.5 pl-1 pr-1 h-8 rounded-full border border-[var(--line)]">
              <span className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-cyan-200 grid place-items-center text-[11px] font-semibold">
                {stats.userName ? stats.userName.charAt(0) : "A"}
              </span>
              <span className="text-xs text-slate-300 max-w-[88px] truncate hidden lg:block">{stats.userName || "Alex"}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="w-6 h-6 grid place-items-center rounded-full text-slate-500 hover:text-rose-300"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowLoginModal(true)} className="btn btn-secondary !py-1.5 !px-3 !rounded-full text-xs">
              <User className="w-3.5 h-3.5" />
              Sign in
            </button>
          )}
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
            {stats.isLoggedIn ? (
              <button type="button" onClick={handleLogout} className="btn btn-secondary flex-1">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            ) : (
              <button type="button" onClick={() => setShowLoginModal(true)} className="btn btn-secondary flex-1">
                <User className="w-4 h-4" /> Sign in
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sign-in modal (demo) */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-title"
        >
          <div className="w-full max-w-sm p-6 surface space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="eyebrow">Demo</span>
                <h3 id="signin-title" className="text-lg display">
                  Sign in
                </h3>
              </div>
              <button type="button" onClick={() => setShowLoginModal(false)} className="btn btn-ghost !p-1.5" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Sign-in is a demo. Your progress is saved in this browser only; syncing across devices is not available yet.
            </p>

            <div className="space-y-2">
              <button type="button" onClick={handleGoogleLogin} className="btn btn-lg w-full bg-white text-slate-900 hover:bg-slate-100">
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="btn btn-secondary w-full">
                Keep playing as guest
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
