"use client";

import React from "react";
import {
  Users,
  Server,
  Database,
  Layers,
  Zap,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Flame,
  CheckCircle2,
  HardDrive,
} from "lucide-react";
import { SimulationState } from "@/types";

interface InteractiveStageProps {
  lessonId: string;
  state: SimulationState;
  onDeployComponent: (type: string) => void;
}

export default function InteractiveStage({
  lessonId,
  state,
  onDeployComponent,
}: InteractiveStageProps) {
  const isLbLesson = lessonId === "load-balancer";
  const isCacheLesson = lessonId === "cache";
  const isDbLesson = lessonId === "database-scaling";

  return (
    <div className="relative w-full h-[520px] rounded-2xl bg-[#090d16]/95 border border-white/10 p-6 flex flex-col justify-between overflow-hidden shadow-2xl">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />

      {/* Stage Header Info */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Live Architecture Stage
          </span>
        </div>

        {/* Live Status Tag */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
            state.metrics.cpuUsage > 80 || state.metrics.databaseHits > 5000
              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {state.metrics.cpuUsage > 80 || state.metrics.databaseHits > 5000 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bottleneck Detected</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Optimal Distributed State</span>
            </>
          )}
        </div>
      </div>

      {/* Main Interactive Diagram Visualizer */}
      <div className="relative z-10 my-auto w-full flex items-center justify-around py-4">
        {/* Node 1: Incoming Users / Clients */}
        <div className="flex flex-col items-center group">
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border-2 border-cyan-500/50 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/10 transition-transform group-hover:scale-105">
            <Users className="w-8 h-8 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-300 mt-1">
              {state.userCount.toLocaleString()} Users
            </span>

            {/* Glowing ring */}
            <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur -z-10 animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-slate-400 mt-2">Clients</span>
        </div>

        {/* Animated Connector 1 */}
        <div className="flex-1 max-w-[100px] flex items-center justify-center relative px-2">
          <div className="w-full h-0.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 relative">
            {/* Animated Packet Pulse */}
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-md shadow-cyan-400 animate-[ping_1.5s_infinite]" />
          </div>
        </div>

        {/* ================= LOAD BALANCER LESSON STAGE ================= */}
        {isLbLesson && (
          <>
            {/* Middle Node: Load Balancer or Direct Line */}
            {state.hasLoadBalancer ? (
              <div className="flex flex-col items-center animate-fadeIn">
                <div className="relative w-20 h-20 rounded-2xl bg-emerald-950/80 border-2 border-emerald-400 flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Layers className="w-8 h-8 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-300 mt-1 text-center">
                    Round Robin
                  </span>
                  <div className="absolute -top-2 px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-black text-slate-950 uppercase">
                    Active
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-400 mt-2">
                  Load Balancer
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center border border-dashed border-slate-700 rounded-xl p-3 bg-slate-900/40">
                <span className="text-[11px] text-slate-500 font-mono mb-2">No Proxy</span>
                <button
                  onClick={() => onDeployComponent("load-balancer")}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 transition-all flex items-center gap-1 shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  + Add LB
                </button>
              </div>
            )}

            {/* Connector 2 */}
            <div className="flex-1 max-w-[100px] flex items-center justify-center relative px-2">
              <div className="w-full h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-400" />
            </div>

            {/* Server Fleet (Single vs Multi) */}
            <div className="flex flex-col gap-3">
              {Array.from({ length: state.serverCount }).map((_, idx) => {
                const isOverloaded = state.serverCount === 1 && state.metrics.cpuUsage > 80;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isOverloaded
                        ? "bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-500/20 animate-pulse"
                        : "bg-slate-900/80 border-slate-700/80 hover:border-emerald-500/40"
                    }`}
                  >
                    <Server
                      className={`w-6 h-6 ${
                        isOverloaded ? "text-rose-400" : "text-emerald-400"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          Server {idx + 1}
                        </span>
                        {isOverloaded && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-400 text-[10px] font-bold">
                            <Flame className="w-3 h-3 fill-rose-500" /> 95% CPU
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {state.hasLoadBalancer
                          ? `${Math.round(state.userCount / state.serverCount)} req/s`
                          : "1,000 req/s (100% Load)"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================= CACHE LESSON STAGE ================= */}
        {isCacheLesson && (
          <>
            {/* App Server */}
            <div className="flex flex-col items-center">
              <div className="w-18 h-18 rounded-2xl bg-slate-900 border-2 border-slate-700 flex flex-col items-center justify-center p-2">
                <Server className="w-7 h-7 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-300 mt-1">App API</span>
              </div>
              <span className="text-xs text-slate-400 mt-2 font-medium">Node Backend</span>
            </div>

            {/* Middle: Redis Cache Branch */}
            <div className="flex flex-col items-center px-4">
              {state.hasCache ? (
                <div className="flex flex-col items-center animate-fadeIn">
                  <div className="relative w-22 h-20 rounded-2xl bg-amber-950/70 border-2 border-amber-400 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-7 h-7 text-amber-400" />
                    <span className="text-[11px] font-black text-amber-300 mt-0.5">
                      Redis RAM
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400">
                      99% Hit Ratio
                    </span>
                    <div className="absolute -top-2 px-1.5 py-0.5 rounded bg-amber-500 text-[9px] font-black text-slate-950 uppercase">
                      &lt; 1ms Latency
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-400 mt-2">
                    In-Memory Cache
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center border border-dashed border-slate-700 rounded-xl p-3 bg-slate-900/40">
                  <span className="text-[11px] text-slate-500 font-mono mb-2">No Cache</span>
                  <button
                    onClick={() => onDeployComponent("cache")}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    + Add Redis
                  </button>
                </div>
              )}
            </div>

            {/* Target: PostgreSQL Database */}
            <div className="flex flex-col items-center">
              <div
                className={`relative w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all ${
                  !state.hasCache
                    ? "bg-rose-950/50 border-rose-500 shadow-xl shadow-rose-500/30 animate-pulse"
                    : "bg-emerald-950/40 border-emerald-500/70"
                }`}
              >
                <Database
                  className={`w-8 h-8 ${!state.hasCache ? "text-rose-400" : "text-emerald-400"}`}
                />
                <span className="text-[11px] font-black text-white mt-1">PostgreSQL</span>
                <span
                  className={`text-[10px] font-bold ${
                    !state.hasCache ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {state.hasCache ? "100 DB Hits" : "10,000 DB Hits ⚠️"}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400 mt-2">Relational DB</span>
            </div>
          </>
        )}

        {/* ================= DATABASE SCALING LESSON STAGE ================= */}
        {isDbLesson && (
          <>
            {/* App Fleet */}
            <div className="flex flex-col items-center">
              <div className="w-18 h-18 rounded-2xl bg-slate-900 border-2 border-slate-700 flex flex-col items-center justify-center p-2">
                <Server className="w-7 h-7 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-300 mt-1">App Fleet</span>
              </div>
              <span className="text-xs text-slate-400 mt-2 font-medium">Read/Write API</span>
            </div>

            {/* DB Architecture (Primary vs Replicas) */}
            <div className="flex flex-col gap-4">
              {/* Primary DB (Writes) */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/40">
                <Database className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Primary (Leader)</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                      Writes Only
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Handles INSERT / UPDATE / DELETE</span>
                </div>
              </div>

              {/* Read Replicas */}
              {state.hasReadReplica ? (
                <div className="flex flex-col gap-2 animate-fadeIn">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-300">Read Replica 1</span>
                      <p className="text-[10px] text-slate-400">Serves 50% SELECT Traffic</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-300">Read Replica 2</span>
                      <p className="text-[10px] text-slate-400">Serves 50% SELECT Traffic</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-700 rounded-xl p-3 bg-slate-900/40 flex flex-col items-center">
                  <span className="text-[11px] text-rose-400 font-medium mb-2">
                    Single DB Bottleneck (92% CPU)
                  </span>
                  <button
                    onClick={() => onDeployComponent("replica")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    + Deploy Read Replicas
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stage Bottom Interactive Control Bar */}
      <div className="relative z-10 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            Latency:{" "}
            <span
              className={`font-bold ${
                state.metrics.latencyMs > 1000 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {state.metrics.latencyMs}ms
            </span>
          </div>
          <div>
            CPU Load:{" "}
            <span
              className={`font-bold ${
                state.metrics.cpuUsage > 70 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {state.metrics.cpuUsage}%
            </span>
          </div>
          <div>
            Error Rate:{" "}
            <span
              className={`font-bold ${
                state.metrics.errorRate > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {state.metrics.errorRate}%
            </span>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-2">
          {isLbLesson && !state.hasLoadBalancer && (
            <button
              onClick={() => onDeployComponent("load-balancer")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Layers className="w-4 h-4" />
              Deploy Load Balancer
            </button>
          )}

          {isLbLesson && state.hasLoadBalancer && state.serverCount < 3 && (
            <button
              onClick={() => onDeployComponent("server")}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Server className="w-4 h-4" />
              + Add Server 3
            </button>
          )}

          {isCacheLesson && !state.hasCache && (
            <button
              onClick={() => onDeployComponent("cache")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Zap className="w-4 h-4" />
              Deploy Redis Cache
            </button>
          )}

          {isDbLesson && !state.hasReadReplica && (
            <button
              onClick={() => onDeployComponent("replica")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <HardDrive className="w-4 h-4" />
              Deploy Read Replicas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
