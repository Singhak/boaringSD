"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Zap,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
  Cpu,
  Trophy,
  Menu,
  X,
  Compass,
  Award,
  Lock,
  User,
  LogOut,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { getUserStats, saveUserStats, loginUser, logoutUser, getFeatureUnlockStatus } from "@/lib/storage";
import { UserStats } from "@/types";
import { playSuccessSound, playBlipSound } from "@/lib/sound";

export default function Navbar() {
  const pathname = usePathname();
  const [stats, setStats] = useState<UserStats>({
    level: 1,
    currentXp: 0,
    nextLevelXp: 150,
    streakDays: 1,
    completedLessons: [],
    completedChallenges: [],
    completedGuided: [],
    completedInterviews: [],
    completedMissions: [],
    completedChapters: [],
    systemsSaved: 0,
    incidentsSolved: 0,
    isLoggedIn: false,
    userEmail: null,
    userName: null,
    totalScore: 0,
    soundEnabled: true,
    unlockedBadges: [],
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setStats(getUserStats());

    const handleUpdate = () => {
      setStats(getUserStats());
    };

    window.addEventListener("sd_quest_stats_updated", handleUpdate);
    return () => window.removeEventListener("sd_quest_stats_updated", handleUpdate);
  }, []);

  const toggleSound = () => {
    const updated = { ...stats, soundEnabled: !stats.soundEnabled };
    setStats(updated);
    saveUserStats(updated);
  };

  const unlockStatus = getFeatureUnlockStatus(stats);

  const xpProgressPercent = Math.min(
    100,
    Math.round(((stats.currentXp % 150) / 150) * 100)
  );

  // Pushpa Mode Navigation:
  // Only show Home, Campaign, Profile by default.
  // Unlock later: Interview Arena, Architecture Sandbox, Challenge Lab
  const coreNavLinks = [
    { name: "Home", href: "/", icon: Cpu },
    { name: "Campaign", href: "/campaign", icon: Layers },
    { name: "Mission Hub", href: "/dashboard", icon: Trophy },
  ];

  const unlockedLabs = [
    {
      name: "Arch Sandbox",
      href: "/builder",
      icon: Sparkles,
      unlocked: unlockStatus.builder.unlocked,
      unlockHint: "Unlocks at Level 2",
    },
    {
      name: "Interview Arena",
      href: "/interview",
      icon: Award,
      unlocked: unlockStatus.interview.unlocked,
      unlockHint: "Unlocks at Level 2",
    },
    {
      name: "Challenge Lab",
      href: "/guided",
      icon: Compass,
      unlocked: unlockStatus.challengeLab.unlocked,
      unlockHint: "Unlocks at Level 3",
    },
  ];

  const handleGoogleLogin = () => {
    playSuccessSound();
    const user = loginUser("alex.chen@systemdesignquest.io", "Alex Chen");
    setStats(user);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    playBlipSound();
    const user = logoutUser();
    setStats(user);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090d16]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-[#090d16] rounded-xl flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              SystemDesign<span className="text-white">Quest</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded">
              Pushpa Mode
            </span>
          </div>
        </Link>

        {/* Desktop Navigation (Pushpa Mode: Home, Campaign, Profile + Unlocked Labs) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {/* Core Nav Links */}
          {coreNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {/* Unlocked Labs (Progressive Disclosure) */}
          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {unlockedLabs.map((lab) => {
            const Icon = lab.icon;
            const isActive = pathname.startsWith(lab.href);

            if (!lab.unlocked) {
              return (
                <div
                  key={lab.name}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-500 cursor-not-allowed group relative"
                  title={`${lab.name}: ${lab.unlockHint}`}
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>{lab.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={lab.name}
                href={lab.href}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lab.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Stats & Profile Controls */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Daily Streak */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold"
            title="Daily Learning Streak"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
            <span>{stats.streakDays}d</span>
          </div>

          {/* XP & Level Progress */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1 text-cyan-400 font-bold text-xs">
              <Zap className="w-3.5 h-3.5 fill-cyan-400" />
              <span>{stats.currentXp} XP</span>
            </div>

            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${xpProgressPercent}%` }}
              />
            </div>

            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Lvl {stats.level}
            </span>
          </div>

          {/* User Account / Save Status Button */}
          {stats.isLoggedIn ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-[10px]">
                {stats.userName ? stats.userName.charAt(0) : "A"}
              </div>
              <span className="font-semibold text-slate-200 text-xs line-clamp-1 max-w-[80px]">
                {stats.userName || "Alex"}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-rose-400 p-0.5 ml-1 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Save Progress</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80 transition-colors"
            title={stats.soundEnabled ? "Mute Sound FX" : "Enable Sound FX"}
            aria-label="Toggle Sound"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#090d16] px-4 pt-2 pb-4 space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <Flame className="w-4 h-4 fill-amber-400" />
              {stats.streakDays} Day Streak
            </div>
            <div className="text-xs text-cyan-400 font-bold">
              Level {stats.level} • {stats.currentXp} XP
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-3 block">Navigation</span>
            {coreNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? "bg-cyan-500/10 text-cyan-400" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-3 block">Unlocked Labs</span>
            {unlockedLabs.map((lab) => {
              const Icon = lab.icon;
              if (!lab.unlocked) return null;
              return (
                <Link
                  key={lab.name}
                  href={lab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{lab.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Progress / Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0d1424] border border-cyan-500/40 shadow-2xl space-y-5 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                  Pushpa Mode Principle
                </span>
                <h3 className="text-xl font-black text-white">Save Your Progress</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              We never ask for signup before showing value. Now that you&apos;ve earned XP and ranked up, save your progress across devices!
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Login with Google</span>
              </button>

              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition-colors"
              >
                Continue as Guest (Auto-Saved Locally)
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
