"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Zap,
  Activity,
  Server,
  Database,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  Lock,
  Globe,
  Award,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  playSuccessSound,
  playErrorSound,
  playLevelUpSound,
  playAlarmSound,
  playDeploySound,
  playBlipSound,
} from "@/lib/sound";
import { recordMissionComplete, loginUser, getUserStats } from "@/lib/storage";

interface PushpaMissionWarRoomProps {
  onClose?: () => void;
  isStandalonePage?: boolean;
}

export default function PushpaMissionWarRoom({
  onClose,
  isStandalonePage = false,
}: PushpaMissionWarRoomProps) {
  const router = useRouter();

  // Step 1: Mission 1 (Traffic Overload)
  // Step 2: Mission 2 (Database Meltdown)
  // Step 3: Mission Complete & Save Progress
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Solved states
  const [m1Solved, setM1Solved] = useState(false);
  const [m1SelectedChoice, setM1SelectedChoice] = useState<string | null>(null);
  const [m1Feedback, setM1Feedback] = useState<string | null>(null);

  const [m2Solved, setM2Solved] = useState(false);
  const [m2SelectedChoice, setM2SelectedChoice] = useState<string | null>(null);
  const [m2Feedback, setM2Feedback] = useState<string | null>(null);

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auth / Save state
  const [isSaved, setIsSaved] = useState(false);
  const [savedUser, setSavedUser] = useState<{ name: string; email: string } | null>(null);

  // Initial trigger for alarm sound
  useEffect(() => {
    const stats = getUserStats();
    setSoundEnabled(stats.soundEnabled);
    if (stats.soundEnabled) {
      playAlarmSound();
    }
  }, []);

  // Trigger confetti upon reaching completion
  useEffect(() => {
    if (currentStep === 3) {
      if (soundEnabled) playLevelUpSound();
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#22d3ee", "#10b981", "#f59e0b", "#a855f7"],
        });
      } catch {
        // Fallback
      }
    }
  }, [currentStep, soundEnabled]);

  // Handle Mission 1 choice
  const handleM1Choice = (choice: "cache" | "lb" | "cdn") => {
    setM1SelectedChoice(choice);
    if (choice === "lb") {
      setM1Solved(true);
      setM1Feedback("System Stabilized! The Load Balancer deployed and divided 100k RPS between 2 worker nodes.");
      if (soundEnabled) {
        playDeploySound();
        setTimeout(() => playSuccessSound(), 200);
      }
      recordMissionComplete("mission-1", 50);
    } else if (choice === "cache") {
      if (soundEnabled) playErrorSound();
      setM1Feedback("Incorrect: Caching reduces database hits, but here Server 1 compute CPU is 96% overwhelmed by raw incoming connection handling!");
    } else {
      if (soundEnabled) playErrorSound();
      setM1Feedback("Incorrect: CDN handles static assets, but Twitter's dynamic feed requests require application compute scaling!");
    }
  };

  // Handle Mission 2 choice
  const handleM2Choice = (choice: "cache" | "cdn" | "dns") => {
    setM2SelectedChoice(choice);
    if (choice === "cache") {
      setM2Solved(true);
      setM2Feedback("Database Rescued! Redis in-memory cache intercepts 95%+ of feed queries before hitting PostgreSQL!");
      if (soundEnabled) {
        playDeploySound();
        setTimeout(() => playSuccessSound(), 200);
      }
      recordMissionComplete("mission-2", 100);
    } else if (choice === "cdn") {
      if (soundEnabled) playErrorSound();
      setM2Feedback("Incorrect: CDN caches static files at the edge, not personalized dynamic user feed queries!");
    } else {
      if (soundEnabled) playErrorSound();
      setM2Feedback("Incorrect: DNS only maps domain names to IP addresses; it does not reduce database CPU usage!");
    }
  };

  // Handle Google Login Mock
  const handleGoogleLogin = () => {
    if (soundEnabled) playSuccessSound();
    const user = loginUser("alex.chen@systemdesignquest.io", "Alex Chen");
    setSavedUser({ name: user.userName || "Alex Chen", email: user.userEmail || "alex.chen@systemdesignquest.io" });
    setIsSaved(true);
  };

  const handleGuestContinue = () => {
    if (soundEnabled) playBlipSound();
    setIsSaved(true);
  };

  return (
    <div className="w-full bg-[#080c14] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden relative text-slate-100 flex flex-col">
      {/* Top Incident Status Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-b border-rose-500/30 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400">
                🚨 Critical Production Incident
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                P0 OUTAGE
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Twitter Feed Outage: 100,000 req/sec Spike
            </h2>
          </div>
        </div>

        {/* Step Indicator & Controls */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg ${
                currentStep === 1
                  ? "bg-cyan-500 text-slate-950 font-black"
                  : m1Solved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              1. Overload
            </span>
            <span className="text-slate-600">➔</span>
            <span
              className={`px-2.5 py-1 rounded-lg ${
                currentStep === 2
                  ? "bg-cyan-500 text-slate-950 font-black"
                  : m2Solved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              2. DB Meltdown
            </span>
            <span className="text-slate-600">➔</span>
            <span
              className={`px-2.5 py-1 rounded-lg ${
                currentStep === 3
                  ? "bg-amber-500 text-slate-950 font-black"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              3. Progress
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title={soundEnabled ? "Mute War Room Audio" : "Enable Audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Exit War Room
            </button>
          )}
        </div>
      </div>

      {/* Main War Room Content */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* ================= STEP 1: MISSION 1 (TRAFFIC OVERLOAD) ================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Telemetry Gauge Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Inbound Traffic
                </span>
                <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>100,000 req/s</span>
                </div>
                <span className="text-[10px] text-rose-400 font-bold">10x Normal Capacity</span>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  m1Solved
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-400 animate-pulse"
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Server CPU
                </span>
                <div className="text-xl sm:text-2xl font-black mt-1">
                  {m1Solved ? "38%" : "96% 🔥"}
                </div>
                <span className="text-[10px] font-bold">
                  {m1Solved ? "Healthy Under Multi-Node" : "CPU Redlining"}
                </span>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  m1Solved
                    ? "bg-slate-900/90 border-slate-800 text-emerald-400"
                    : "bg-slate-900/90 border-slate-800 text-rose-400"
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Feed Latency
                </span>
                <div className="text-xl sm:text-2xl font-black mt-1">
                  {m1Solved ? "195 ms" : "4.2s ⚠️"}
                </div>
                <span className="text-[10px] text-slate-400">
                  {m1Solved ? "Optimal response" : "Users cannot refresh feed"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Incident Bounty
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 flex items-center gap-1">
                  <Zap className="w-4 h-4 fill-amber-400" />
                  <span>+50 XP</span>
                </div>
                <span className="text-[10px] text-slate-400">Instant Experience</span>
              </div>
            </div>

            {/* Architecture Visual Topology Box */}
            <div className="p-6 rounded-2xl bg-[#0b101c] border border-cyan-500/20 relative overflow-hidden">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Live Infrastructure Topology</span>
                <span className="text-cyan-400 font-mono">
                  {m1Solved ? "Cluster: 2 Active Nodes" : "Cluster: 1 Single Monolith"}
                </span>
              </div>

              {/* Topology SVG / Diagram */}
              <div className="py-6 flex flex-col md:flex-row items-center justify-around gap-6 text-center">
                {/* Users Node */}
                <div className="space-y-1">
                  <div className="w-20 h-20 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex flex-col items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
                    <Globe className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-black text-cyan-300 mt-1">100k Users</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Global Clients</span>
                </div>

                <div className="text-cyan-400 font-black text-lg">➔</div>

                {/* Load Balancer or Direct Hit */}
                {m1Solved ? (
                  <div className="space-y-1 animate-fadeIn">
                    <div className="w-24 h-20 rounded-2xl bg-emerald-950/80 border-2 border-emerald-400 flex flex-col items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/20">
                      <Layers className="w-7 h-7 text-emerald-400 animate-bounce" />
                      <span className="text-[11px] font-black text-emerald-300 mt-1">
                        Load Balancer
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">Round-Robin Active</span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold animate-pulse">
                    ⚠ Single Point of Failure
                  </div>
                )}

                <div className="text-cyan-400 font-black text-lg">➔</div>

                {/* Server Instances */}
                <div className="flex flex-col gap-2.5">
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      m1Solved
                        ? "bg-slate-900 border-emerald-500/50 text-emerald-400"
                        : "bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse"
                    }`}
                  >
                    <Server className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Application Server 1</div>
                      <div className="text-[10px]">{m1Solved ? "CPU 38% • Healthy" : "CPU 96% • Overheating"}</div>
                    </div>
                    {!m1Solved && <Flame className="w-4 h-4 fill-rose-500 text-rose-500 shrink-0" />}
                  </div>

                  {m1Solved && (
                    <div className="p-3 rounded-xl border bg-slate-900 border-emerald-500/50 text-emerald-400 flex items-center gap-3 animate-fadeIn">
                      <Server className="w-5 h-5 shrink-0" />
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">Application Server 2</div>
                        <div className="text-[10px]">CPU 37% • Healthy</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Alert Bar */}
              {m1Feedback && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    m1Solved
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  }`}
                >
                  {m1Solved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{m1Feedback}</span>
                </div>
              )}
            </div>

            {/* Incident Question & Action Selection */}
            {!m1Solved ? (
              <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Emergency Action Required
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Traffic overload detected. What should we add?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select the architectural component to rescue Server 1 before total crash:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleM1Choice("cache")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      m1SelectedChoice === "cache"
                        ? "bg-rose-500/10 border-rose-500 text-rose-300"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>Cache</span>
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">In-Memory Redis Layer</p>
                  </button>

                  <button
                    onClick={() => handleM1Choice("lb")}
                    className={`p-4 rounded-xl border text-left transition-all group ${
                      m1SelectedChoice === "lb"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-slate-900/80 hover:bg-slate-800 border-cyan-500/40 hover:border-cyan-400 text-white"
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span className="text-cyan-300 group-hover:text-cyan-200">Load Balancer</span>
                      <Layers className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Reverse Proxy + Multi-Node</p>
                  </button>

                  <button
                    onClick={() => handleM1Choice("cdn")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      m1SelectedChoice === "cdn"
                        ? "bg-rose-500/10 border-rose-500 text-rose-300"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>CDN</span>
                      <Globe className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Edge Content Delivery</p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-black text-white">Mission 1 Completed • System Stabilized</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    You earned <strong className="text-amber-400">+50 XP</strong>. But watch out: the database is starting to overheat!
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCurrentStep(2);
                    if (soundEnabled) playBlipSound();
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105"
                >
                  <span>Respond to Mission 2: DB Meltdown</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: MISSION 2 (DATABASE OVERLOAD) ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Telemetry Gauge Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Web Tier Status
                </span>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                  Healthy (2 Nodes)
                </div>
                <span className="text-[10px] text-slate-400">Load Balancer Active</span>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  m2Solved
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-400 animate-pulse"
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Database CPU
                </span>
                <div className="text-xl sm:text-2xl font-black mt-1">
                  {m2Solved ? "18%" : "99% 🔥"}
                </div>
                <span className="text-[10px] font-bold">
                  {m2Solved ? "Read Load Offloaded" : "Connections Full (1000/1000)"}
                </span>
              </div>

              <div
                className={`p-4 rounded-xl border transition-all ${
                  m2Solved
                    ? "bg-slate-900/90 border-slate-800 text-emerald-400"
                    : "bg-slate-900/90 border-slate-800 text-rose-400"
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Response Time
                </span>
                <div className="text-xl sm:text-2xl font-black mt-1">
                  {m2Solved ? "42 ms" : "7.0 Seconds ⚠️"}
                </div>
                <span className="text-[10px] text-slate-400">
                  {m2Solved ? "Sub-second lightning speed" : "Severe query lockups"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Mission Bounty
                </span>
                <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 flex items-center gap-1">
                  <Zap className="w-4 h-4 fill-amber-400" />
                  <span>+100 XP</span>
                </div>
                <span className="text-[10px] text-slate-400">Level Up Milestone</span>
              </div>
            </div>

            {/* Architecture Visual Topology Box */}
            <div className="p-6 rounded-2xl bg-[#0b101c] border border-cyan-500/20 relative overflow-hidden">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Database Tier Topology</span>
                <span className="text-amber-400 font-mono">
                  {m2Solved ? "Redis Cache Hit Rate: 96%" : "Direct DB Disk Reads: 100%"}
                </span>
              </div>

              {/* Topology SVG / Diagram */}
              <div className="py-6 flex flex-col md:flex-row items-center justify-around gap-6 text-center">
                {/* Web Servers */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 flex items-center gap-3">
                  <Server className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">App Servers Fleet</div>
                    <div className="text-[10px]">Processing 100k RPS</div>
                  </div>
                </div>

                <div className="text-cyan-400 font-black text-lg">➔</div>

                {/* Cache Node */}
                {m2Solved ? (
                  <div className="space-y-1 animate-fadeIn">
                    <div className="w-24 h-20 rounded-2xl bg-amber-950/80 border-2 border-amber-400 flex flex-col items-center justify-center mx-auto shadow-xl shadow-amber-500/20 ring-4 ring-amber-500/20">
                      <Zap className="w-7 h-7 text-amber-400 animate-pulse fill-amber-400" />
                      <span className="text-[11px] font-black text-amber-300 mt-1">
                        Redis Cache
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">96% Hit Rate</span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold animate-pulse">
                    ⚠ All Reads Hit Raw Disk
                  </div>
                )}

                <div className="text-cyan-400 font-black text-lg">➔</div>

                {/* Primary DB */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    m2Solved
                      ? "bg-slate-900 border-emerald-500/50 text-emerald-400"
                      : "bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse"
                  }`}
                >
                  <Database className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">PostgreSQL Primary</div>
                  <div className="text-[10px]">{m2Solved ? "CPU 18% • Fast Writes" : "CPU 99% • Connections Full"}</div>
                </div>
              </div>

              {/* Feedback Alert Bar */}
              {m2Feedback && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    m2Solved
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  }`}
                >
                  {m2Solved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{m2Feedback}</span>
                </div>
              )}
            </div>

            {/* Incident Question & Action Selection */}
            {!m2Solved ? (
              <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Database Emergency
                  </span>
                  <h3 className="text-lg font-black text-white">
                    Database Overload: CPU 99%, Connections Full. How would you fix it?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Users cannot refresh feed because 10,000 read queries per second are choking disk I/O:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleM2Choice("cache")}
                    className={`p-4 rounded-xl border text-left transition-all group ${
                      m2SelectedChoice === "cache"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-slate-900/80 hover:bg-slate-800 border-amber-500/40 hover:border-amber-400 text-white"
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span className="text-amber-300 group-hover:text-amber-200">Cache</span>
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">In-Memory Redis Buffer</p>
                  </button>

                  <button
                    onClick={() => handleM2Choice("cdn")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      m2SelectedChoice === "cdn"
                        ? "bg-rose-500/10 border-rose-500 text-rose-300"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>CDN</span>
                      <Globe className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Edge Static Caching</p>
                  </button>

                  <button
                    onClick={() => handleM2Choice("dns")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      m2SelectedChoice === "dns"
                        ? "bg-rose-500/10 border-rose-500 text-rose-300"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>DNS</span>
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Domain Name Resolution</p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-black text-white">Twitter Saved! All Outages Mitigated</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    You earned <strong className="text-amber-400">+100 XP</strong> (150 XP Total). You unlocked Level 2!
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCurrentStep(3);
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform hover:scale-105"
                >
                  <span>Claim 150 XP & Save Progress</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 3: MISSION COMPLETE & SAVE PROGRESS ================= */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn text-center max-w-2xl mx-auto py-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-500/40">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Mission Accomplished</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Congratulations, Systems Hero!
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                You stabilized Twitter under real production pressure with zero prior signup. Here are your combat results:
              </p>
            </div>

            {/* Scoreboard Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 block">XP Earned</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 flex items-center justify-center gap-1">
                  <Zap className="w-5 h-5 fill-amber-400" />
                  <span>150</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">Level 2 Unlocked</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 block">Systems Saved</span>
                <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-5 h-5" />
                  <span>2</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">100% Uptime</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-xs text-slate-400 block">Incidents Solved</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>2</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">0 Dropouts</span>
              </div>
            </div>

            {/* Save Progress Card */}
            <div className="p-6 rounded-2xl glass-panel border border-cyan-500/30 text-left space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Save Your Progress</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Lock in your 150 XP and Level 2 rank across devices, or continue seamlessly as a guest.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                  Zero Friction
                </span>
              </div>

              {isSaved ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white">Progress Saved Successfully!</div>
                    <div className="text-[11px] text-emerald-200/90">
                      {savedUser ? `Synced as ${savedUser.name} (${savedUser.email})` : "Saved to local browser storage."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Google Login Mock */}
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
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
                    <span>Login With Google</span>
                  </button>

                  {/* Guest Continue */}
                  <button
                    onClick={handleGuestContinue}
                    className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
                  >
                    <span>⚡ Continue as Guest</span>
                  </button>
                </div>
              )}
            </div>

            {/* Next Destination Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/campaign"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105"
              >
                <span>▶ Enter Campaign Mode (Chapter 1)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm border border-slate-800 transition-colors text-center"
              >
                Go to Mission Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
