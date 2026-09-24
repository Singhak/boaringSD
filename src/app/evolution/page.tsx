"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GitMerge,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Users,
  Server,
  Layers,
  Database,
  Cpu,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import MetricCard from "@/components/MetricCard";
import { EVOLUTION_STAGES } from "@/data/evolution";
import { playBlipSound, playSuccessSound } from "@/lib/sound";

export default function EvolutionPage() {
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const stage = EVOLUTION_STAGES[currentStageIdx];

  const handleNext = () => {
    if (currentStageIdx < EVOLUTION_STAGES.length - 1) {
      playBlipSound();
      setCurrentStageIdx((prev) => prev + 1);
    } else {
      playSuccessSound();
    }
  };

  const handlePrev = () => {
    if (currentStageIdx > 0) {
      playBlipSound();
      setCurrentStageIdx((prev) => prev - 1);
    }
  };

  const selectStage = (idx: number) => {
    playBlipSound();
    setCurrentStageIdx(idx);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => selectStage(0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Level 1
            </button>
            <Link
              href="/builder"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Open Arch Sandbox
            </Link>
          </div>
        </div>

        {/* Hero Header */}
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-white/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 via-purple-500/5 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1">
                <GitMerge className="w-3.5 h-3.5" /> Architecture Evolution Mode
              </span>
              <span className="text-xs text-slate-400 font-mono">
                100 Users → 5,000,000 Users Journey
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Watch How Systems Grow
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real systems aren't designed on day one with 50 microservices and distributed caches.
              They evolve through pain points, bottlenecks, and pragmatic engineering upgrades.
            </p>
          </div>

          {/* Interactive Timeline Stepper */}
          <div className="grid grid-cols-5 gap-2 pt-6 mt-6 border-t border-slate-800">
            {EVOLUTION_STAGES.map((s, idx) => {
              const isActive = idx === currentStageIdx;
              const isPast = idx < currentStageIdx;

              let badgeStyle = "bg-slate-900/60 border-slate-800 text-slate-400";
              if (isActive) {
                badgeStyle =
                  s.status === "danger"
                    ? "bg-rose-500/15 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/10"
                    : s.status === "warning"
                    ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10"
                    : "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10";
              } else if (isPast) {
                badgeStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
              }

              return (
                <button
                  key={s.stage}
                  onClick={() => selectStage(idx)}
                  className={`p-3 rounded-xl border text-left transition-all ${badgeStyle}`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Lvl {s.stage}
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">
                    {s.userCountLabel}
                  </div>
                  <div className="text-[10px] font-mono mt-1 text-slate-400">
                    {s.statusBadge}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Status and Telemetry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="CPU Load"
            value={`${stage.metrics.cpuUsage}%`}
            unit="Peak"
            icon={Cpu}
            status={
              stage.metrics.cpuUsage > 80
                ? "danger"
                : stage.metrics.cpuUsage > 50
                ? "warning"
                : "healthy"
            }
            subtext="Target: < 50%"
          />
          <MetricCard
            label="Response Latency"
            value={stage.metrics.latencyMs}
            unit="ms"
            icon={Clock}
            status={
              stage.metrics.latencyMs > 1000
                ? "danger"
                : stage.metrics.latencyMs > 400
                ? "warning"
                : "healthy"
            }
            subtext="Target: < 200ms"
          />
          <MetricCard
            label="Throughput"
            value={stage.metrics.requestsPerSec.toLocaleString()}
            unit="req/s"
            icon={Zap}
            status="healthy"
            subtext="Handled Traffic"
          />
          <MetricCard
            label="Error / Failure Rate"
            value={`${stage.metrics.errorRate}%`}
            icon={Flame}
            status={stage.metrics.errorRate > 0 ? "danger" : "healthy"}
            subtext={stage.metrics.errorRate > 0 ? "Outage Warning" : "Zero Drops"}
          />
        </div>

        {/* Main Stage Interactive Visualizer & Story */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Diagram Stage */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-[#090d16]/95 border border-white/10 flex flex-col justify-between min-h-[460px] relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-cyber-grid opacity-25 pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-300">
                  {stage.title} • {stage.userCountLabel}
                </span>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  stage.status === "danger"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : stage.status === "warning"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {stage.statusBadge}
              </span>
            </div>

            {/* Dynamic Architecture Diagram Visualizer */}
            <div className="my-auto py-8 relative z-10 flex flex-wrap items-center justify-center gap-6">
              {stage.components.map((comp) => {
                let nodeBorder = "border-slate-700 bg-slate-900/80";
                let textCol = "text-slate-300";

                if (comp.status === "overloaded") {
                  nodeBorder = "border-rose-500 bg-rose-950/50 animate-pulse shadow-lg shadow-rose-500/20";
                  textCol = "text-rose-300";
                } else if (comp.status === "warning") {
                  nodeBorder = "border-amber-500 bg-amber-950/40 shadow-lg shadow-amber-500/20";
                  textCol = "text-amber-300";
                } else if (comp.type === "load_balancer") {
                  nodeBorder = "border-emerald-500/60 bg-emerald-950/30";
                  textCol = "text-emerald-300";
                } else if (comp.type === "cache") {
                  nodeBorder = "border-amber-400/60 bg-amber-950/30";
                  textCol = "text-amber-300";
                } else if (comp.type === "replica") {
                  nodeBorder = "border-teal-400/60 bg-teal-950/30";
                  textCol = "text-teal-300";
                }

                return (
                  <div
                    key={comp.id}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center min-w-[130px] transition-all transform hover:scale-105 ${nodeBorder}`}
                  >
                    {comp.type === "client" && <Users className="w-7 h-7 text-cyan-400 mb-1" />}
                    {comp.type === "load_balancer" && <Layers className="w-7 h-7 text-emerald-400 mb-1" />}
                    {comp.type === "server" && (
                      <Server
                        className={`w-7 h-7 mb-1 ${
                          comp.status === "overloaded" ? "text-rose-400" : "text-cyan-400"
                        }`}
                      />
                    )}
                    {comp.type === "cache" && <Zap className="w-7 h-7 text-amber-400 mb-1" />}
                    {comp.type === "database" && (
                      <Database
                        className={`w-7 h-7 mb-1 ${
                          comp.status === "overloaded" ? "text-rose-400" : "text-emerald-400"
                        }`}
                      />
                    )}
                    {comp.type === "replica" && <Database className="w-7 h-7 text-teal-400 mb-1" />}

                    <span className={`text-xs font-bold text-center ${textCol}`}>{comp.label}</span>
                    {comp.subtitle && (
                      <span className="text-[10px] text-slate-400 mt-0.5">{comp.subtitle}</span>
                    )}
                    {comp.cpu !== undefined && (
                      <span
                        className={`text-[10px] font-mono mt-1 px-1.5 py-0.5 rounded ${
                          comp.cpu > 80
                            ? "bg-rose-500/30 text-rose-300 font-bold"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {comp.cpu}% CPU
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stepper Controller Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between relative z-10">
              <button
                disabled={currentStageIdx === 0}
                onClick={handlePrev}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  currentStageIdx === 0
                    ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Level
              </button>

              <span className="text-xs text-slate-400 font-mono">
                Stage {currentStageIdx + 1} of {EVOLUTION_STAGES.length}
              </span>

              <button
                disabled={currentStageIdx === EVOLUTION_STAGES.length - 1}
                onClick={handleNext}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  currentStageIdx === EVOLUTION_STAGES.length - 1
                    ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                }`}
              >
                <span>Scale to Next Level</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Architecture Story, Pain Points & Resolution */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Evolutionary Narrative
              </span>
              <h3 className="text-lg font-bold text-white">{stage.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{stage.description}</p>

              {stage.painPoint && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 space-y-1">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Bottleneck Alert
                  </span>
                  <p>{stage.painPoint}</p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                <span className="font-bold text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Architectural Lesson
                </span>
                <p>{stage.solutionNarrative}</p>
              </div>
            </div>

            {/* Quick Link to Sandbox Builder */}
            <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Want to build this yourself?
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test your own topologies with custom traffic loads and chaos failure tests in the Freeform Builder.
              </p>
              <Link
                href="/builder"
                className="block w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs text-center shadow-lg shadow-emerald-500/10 hover:opacity-95 transition-all"
              >
                Launch Live Builder
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
