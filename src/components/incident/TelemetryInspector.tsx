"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Layers,
  Network,
  RefreshCw,
  Server,
  Sliders,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { NodeTelemetry, OperationalKnob, TelemetryLogEntry } from "@/types";
import { playBlipSound, playDeploySound } from "@/lib/sound";

interface TelemetryInspectorProps {
  telemetry: NodeTelemetry | null;
  onClose: () => void;
  onKnobChange?: (knobId: string, value: any) => void;
}

export default function TelemetryInspector({
  telemetry,
  onClose,
  onKnobChange,
}: TelemetryInspectorProps) {
  const [activeTab, setActiveTab] = useState<"logs" | "vitals" | "knobs">("logs");
  const [knobValues, setKnobValues] = useState<Record<string, any>>({});
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Synchronize local knob values when telemetry node changes
  useEffect(() => {
    if (telemetry) {
      const initial: Record<string, any> = {};
      telemetry.knobs.forEach((k) => {
        initial[k.id] = k.value;
      });
      setKnobValues(initial);
      setSavedFeedback(null);
    }
  }, [telemetry]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!telemetry) return null;

  const handleKnobUpdate = (knobId: string, val: any) => {
    setKnobValues((prev) => ({ ...prev, [knobId]: val }));
    playBlipSound();
    if (onKnobChange) {
      onKnobChange(knobId, val);
    }
    setSavedFeedback(`Applied ${knobId} = ${val}`);
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  const getStatusChip = (status: NodeTelemetry["status"]) => {
    switch (status) {
      case "CRITICAL":
        return (
          <span className="chip chip-bad font-mono text-[11px] animate-pulse">
            <span className="dot animate-pulse-glow" /> CRITICAL SATURATION
          </span>
        );
      case "DEGRADED":
        return (
          <span className="chip chip-warn font-mono text-[11px]">
            <span className="dot" /> DEGRADED
          </span>
        );
      case "HEALTHY":
        return (
          <span className="chip chip-ok font-mono text-[11px]">
            <span className="dot" /> HEALTHY
          </span>
        );
      default:
        return <span className="chip font-mono text-[11px]">IDLE</span>;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="telemetry-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] overflow-hidden surface !rounded-2xl border border-cyan-400/40 flex flex-col shadow-[0_30px_90px_-20px_rgba(34,211,238,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-400/10 border border-cyan-400/30 grid place-items-center text-cyan-300">
              {telemetry.role === "server" ? (
                <Server className="w-5 h-5" />
              ) : telemetry.role === "lb" ? (
                <Layers className="w-5 h-5" />
              ) : telemetry.role === "cache" ? (
                <Zap className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="telemetry-title" className="text-lg font-semibold text-white font-mono">
                  {telemetry.nodeName}
                </h2>
                {getStatusChip(telemetry.status)}
              </div>
              <p className="text-xs text-slate-400 font-mono">Node ID: {telemetry.nodeId} · Live Telemetry Inspector</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Close telemetry"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[var(--line)] bg-[var(--surface-2)] px-6">
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`py-3 px-4 text-xs font-mono font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "logs"
                ? "border-cyan-400 text-cyan-300 bg-cyan-400/[0.04]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Live Logs & Traces ({telemetry.logs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vitals")}
            className={`py-3 px-4 text-xs font-mono font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "vitals"
                ? "border-cyan-400 text-cyan-300 bg-cyan-400/[0.04]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            Resource Vitals
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("knobs")}
            className={`py-3 px-4 text-xs font-mono font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "knobs"
                ? "border-cyan-400 text-cyan-300 bg-cyan-400/[0.04]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Live Operational Knobs ({telemetry.knobs.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: LOGS & TRACES */}
          {activeTab === "logs" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Active Telemetry Stream (pg_stat / systemd / access.log)</span>
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="dot animate-pulse-glow" /> REALTIME
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/80 font-mono text-xs overflow-hidden shadow-inner divide-y divide-white/5">
                {telemetry.logs.map((log, i) => {
                  const isErr = log.level === "ERROR" || log.level === "FATAL";
                  const isWarn = log.level === "WARN";

                  return (
                    <div
                      key={i}
                      className={`p-3 flex items-start gap-3 transition-colors ${
                        log.highlight
                          ? isErr
                            ? "bg-rose-950/30 border-l-4 border-l-rose-500"
                            : "bg-amber-950/30 border-l-4 border-l-amber-500"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className="text-slate-500 shrink-0 select-none text-[11px] pt-0.5">
                        {log.timestamp}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                          isErr
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : isWarn
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-slate-400 shrink-0 text-[11px] font-semibold">
                        [{log.source}]
                      </span>
                      <p className={`flex-1 leading-relaxed ${isErr ? "text-rose-200 font-medium" : isWarn ? "text-amber-100" : "text-slate-300"}`}>
                        {log.message}
                      </p>
                      {log.durationMs && (
                        <span className="num text-[11px] text-rose-400 shrink-0 font-semibold bg-black/40 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {log.durationMs}ms
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RESOURCE VITALS */}
          {activeTab === "vitals" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                  <span className="text-slate-400 font-mono block text-[11px]">CPU Usage</span>
                  <div className={`num text-2xl font-bold ${telemetry.cpuUsage > 80 ? "text-rose-400" : "text-emerald-400"}`}>
                    {telemetry.cpuUsage}%
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden mt-2">
                    <div
                      className={`h-full ${telemetry.cpuUsage > 80 ? "bg-rose-500" : "bg-emerald-400"}`}
                      style={{ width: `${telemetry.cpuUsage}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                  <span className="text-slate-400 font-mono block text-[11px]">Memory Used</span>
                  <div className="num text-2xl font-bold text-cyan-300">
                    {(telemetry.memoryUsedMb / 1024).toFixed(1)} GB
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    of {(telemetry.memoryTotalMb / 1024).toFixed(0)} GB Total
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                  <span className="text-slate-400 font-mono block text-[11px]">Active Sockets</span>
                  <div className="num text-2xl font-bold text-slate-100">
                    {telemetry.activeConnections.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Limit: {telemetry.maxConnections.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1">
                  <span className="text-slate-400 font-mono block text-[11px]">Thread Saturation</span>
                  <div className={`num text-2xl font-bold ${telemetry.workerThreadsUsed >= telemetry.workerThreadsTotal ? "text-rose-400" : "text-emerald-300"}`}>
                    {telemetry.workerThreadsUsed} / {telemetry.workerThreadsTotal}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {telemetry.workerThreadsUsed >= telemetry.workerThreadsTotal ? "POOLS EXHAUSTED" : "NOMINAL"}
                  </span>
                </div>
              </div>

              {/* Latency & Error Breakdown */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-3">
                <span className="eyebrow text-slate-400">Downstream Telemetry & Latency Profile</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">p99 Response Latency:</span>
                    <span className={`num font-semibold ${telemetry.p99LatencyMs > 500 ? "text-rose-400" : "text-emerald-400"}`}>
                      {telemetry.p99LatencyMs} ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-slate-400">TCP Handshake Drop Rate:</span>
                    <span className={`num font-semibold ${telemetry.errorRate > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {telemetry.errorRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPERATIONAL KNOBS */}
          {activeTab === "knobs" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="eyebrow text-cyan-300">Live Architectural Knobs</span>
                  <p className="text-xs text-slate-400">
                    Adjust operational parameters in real time to alter runtime behavior.
                  </p>
                </div>
                {savedFeedback && (
                  <span className="chip chip-ok !text-[11px] animate-fadeIn">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    {savedFeedback}
                  </span>
                )}
              </div>

              {telemetry.knobs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-white/10 rounded-xl">
                  No tunable operational knobs configured for this node.
                </div>
              ) : (
                <div className="space-y-4">
                  {telemetry.knobs.map((knob) => {
                    const currentVal = knobValues[knob.id] ?? knob.value;

                    return (
                      <div
                        key={knob.id}
                        className="p-4 rounded-xl border border-white/10 bg-black/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-sm text-white block">
                              {knob.label}
                            </span>
                            <span className="text-xs text-slate-400 leading-normal">
                              {knob.description}
                            </span>
                          </div>
                          <span className="num text-sm font-bold text-cyan-300 font-mono bg-black/50 px-2.5 py-1 rounded border border-white/10">
                            {String(currentVal)} {knob.unit ?? ""}
                          </span>
                        </div>

                        {knob.type === "slider" && (
                          <div className="space-y-1">
                            <input
                              type="range"
                              min={knob.min}
                              max={knob.max}
                              step={knob.step ?? 1}
                              value={Number(currentVal)}
                              onChange={(e) =>
                                handleKnobUpdate(knob.id, Number(e.target.value))
                              }
                              className="w-full accent-cyan-400 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                              <span>{knob.min} {knob.unit}</span>
                              <span>{knob.max} {knob.unit}</span>
                            </div>
                          </div>
                        )}

                        {knob.type === "toggle" && (
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => handleKnobUpdate(knob.id, !currentVal)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                                currentVal
                                  ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40"
                                  : "bg-slate-800 text-slate-400 border border-white/10"
                              }`}
                            >
                              {currentVal ? "ENABLED (ON)" : "DISABLED (OFF)"}
                            </button>
                          </div>
                        )}

                        {knob.type === "select" && knob.options && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {knob.options.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleKnobUpdate(knob.id, opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                  currentVal === opt.value
                                    ? "bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 font-semibold"
                                    : "bg-black/40 text-slate-400 border border-white/10 hover:border-slate-500"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-[var(--line)] bg-black/40 flex justify-end">
          <button onClick={onClose} className="btn btn-primary btn-md">
            Done Inspecting
          </button>
        </footer>
      </div>
    </div>
  );
}
