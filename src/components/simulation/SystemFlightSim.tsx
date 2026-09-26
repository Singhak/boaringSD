"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Flame,
  Globe,
  Layers,
  Lightbulb,
  Maximize2,
  Play,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import ConceptIntelDrawer from "@/components/incident/ConceptIntelDrawer";
import TelemetryInspector from "@/components/incident/TelemetryInspector";
import { getMockTelemetryForNode } from "@/data/telemetryData";
import {
  playAlarmSound,
  playBlipSound,
  playDeploySound,
  playErrorSound,
  playSuccessSound,
} from "@/lib/sound";
import { recordMissionComplete } from "@/lib/storage";

import { ComponentKind } from "@/types";

interface SystemFlightSimProps {
  initialIncidentId?: "hs-01" | "lb-01";
  onClose?: () => void;
  /** firstTry is false if the player used a band-aid, an overkill fix, or let the system go down. */
  onAllCompleted?: (result: { firstTry: boolean }) => void;
}

interface SimNode {
  id: string;
  label: string;
  role: ComponentKind;
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  cpu: number; // 0 to 100
  rps: number;
  queueDepth: number; // 0 to 5
  maxQueue: number;
  healthy: boolean;
  statusText: string;
  icon: React.ElementType;
}

interface SimParticle {
  id: number;
  pathIndex: number; // which path index
  progress: number; // 0 to 1
  speed: number;
  isError: boolean;
  isResolved: boolean;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  label: string;
  opacity: number;
  scale: number;
}

export default function SystemFlightSim({
  initialIncidentId = "hs-01",
  onClose,
  onAllCompleted,
}: SystemFlightSimProps) {
  // Current active incident ("hs-01" -> "lb-01")
  const [incidentId, setIncidentId] = useState<"hs-01" | "lb-01">(initialIncidentId);

  // SLA Error Budget (100% down to 0%)
  const [errorBudget, setErrorBudget] = useState(100);
  const [isSystemDown, setIsSystemDown] = useState(false);

  // Deployed tactical fixes
  const [appliedFix, setAppliedFix] = useState<string | null>(null);

  // Stabilization state (hold green for 5.0 seconds)
  const [stabilizeProgress, setStabilizeProgress] = useState(0); // 0 to 5
  const [isResolved, setIsResolved] = useState(false);
  const [mistakes, setMistakes] = useState(0);

  // Drawer & Inspector
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<SimParticle[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const nextParticleId = useRef(1);
  const nextExplosionId = useRef(1);
  const animFrameId = useRef<number | null>(null);

  // Mirrors of the loop-driven values so the game loop can detect thresholds
  // in its own tick instead of in follow-up effects.
  const errorBudgetRef = useRef(100);
  const stabilizeRef = useRef(0);

  const resetBudget = () => {
    errorBudgetRef.current = 100;
    setErrorBudget(100);
  };
  const resetStabilize = () => {
    stabilizeRef.current = 0;
    setStabilizeProgress(0);
  };

  // Sound the alarm when an incident opens
  useEffect(() => {
    playAlarmSound();
  }, [incidentId]);

  // Determine dynamic system state based on incident & fix
  const isHs = incidentId === "hs-01";
  const isLb = incidentId === "lb-01";

  // System metrics calculations
  const trafficRps = 100000;
  const server1Cpu = isHs ? (appliedFix === "scale_out" ? 45 : 98) : (appliedFix === "deploy_lb" ? 42 : 98);
  const server2Cpu = isHs
    ? (appliedFix === "scale_out" ? 45 : 0)
    : (appliedFix === "deploy_lb" ? 42 : appliedFix === "upgrade_core" ? 38 : 0);
  const errorRate = appliedFix ? 0 : isHs ? 48 : 50;
  const p95Latency = appliedFix ? (isHs ? 38 : 34) : 4200;
  const hasLb = isLb && appliedFix === "deploy_lb";
  const hasServer2 = (isHs && appliedFix === "scale_out") || isLb;

  // Nodes model
  const nodes: SimNode[] = [
    {
      id: "users",
      label: "Global Traffic",
      role: "users",
      x: 0.12,
      y: 0.5,
      cpu: 100,
      rps: trafficRps,
      queueDepth: 0,
      maxQueue: 5,
      healthy: true,
      statusText: "100k req/s ingress",
      icon: Users,
    },
  ];

  if (hasLb) {
    nodes.push({
      id: "lb",
      label: "Nginx LB (Proxy)",
      role: "lb",
      x: 0.42,
      y: 0.5,
      cpu: 28,
      rps: trafficRps,
      queueDepth: 0,
      maxQueue: 5,
      healthy: true,
      statusText: "Round Robin 50/50",
      icon: Layers,
    });
  }

  // Server 1
  nodes.push({
    id: "server-1",
    label: "App Server 1",
    role: "server",
    x: hasLb ? 0.72 : hasServer2 ? 0.65 : 0.65,
    y: hasServer2 ? 0.28 : 0.5,
    cpu: server1Cpu,
    rps: isHs
      ? appliedFix === "scale_out" ? 50000 : 100000
      : isLb
      ? appliedFix === "deploy_lb" ? 50000 : 100000
      : 50000,
    queueDepth: server1Cpu > 80 ? 5 : 1,
    maxQueue: 5,
    healthy: server1Cpu < 80,
    statusText: server1Cpu > 80 ? "Saturated 98% CPU" : "Stable 45% CPU",
    icon: Server,
  });

  // Server 2
  if (hasServer2) {
    nodes.push({
      id: "server-2",
      label: "App Server 2",
      role: "server",
      x: hasLb ? 0.72 : 0.65,
      y: 0.72,
      cpu: server2Cpu,
      rps: isHs
        ? appliedFix === "scale_out" ? 50000 : 0
        : isLb
        ? appliedFix === "deploy_lb" ? 50000 : 0
        : 0,
      queueDepth: server2Cpu > 80 ? 5 : server2Cpu > 0 ? 1 : 0,
      maxQueue: 5,
      healthy: server2Cpu > 0 && server2Cpu < 80,
      statusText: server2Cpu === 0 ? "Idle (0 req/s)" : "Stable 45% CPU",
      icon: Server,
    });
  }

  // Target database
  nodes.push({
    id: "db",
    label: "Postgres Primary",
    role: "db",
    x: 0.92,
    y: 0.5,
    cpu: appliedFix ? 40 : 25,
    rps: appliedFix ? 45000 : 25000,
    queueDepth: 1,
    maxQueue: 5,
    healthy: true,
    statusText: "Healthy ACID Storage",
    icon: Database,
  });

  // Wires / Paths
  interface Path {
    from: string;
    to: string;
    weight: number;
    active: boolean;
  }

  const paths: Path[] = [];
  if (isHs) {
    if (appliedFix === "scale_out") {
      paths.push({ from: "users", to: "server-1", weight: 0.5, active: true });
      paths.push({ from: "users", to: "server-2", weight: 0.5, active: true });
      paths.push({ from: "server-1", to: "db", weight: 0.5, active: true });
      paths.push({ from: "server-2", to: "db", weight: 0.5, active: true });
    } else {
      paths.push({ from: "users", to: "server-1", weight: 1.0, active: true });
      paths.push({ from: "server-1", to: "db", weight: 0.5, active: true });
    }
  } else if (isLb) {
    if (appliedFix === "deploy_lb") {
      paths.push({ from: "users", to: "lb", weight: 1.0, active: true });
      paths.push({ from: "lb", to: "server-1", weight: 0.5, active: true });
      paths.push({ from: "lb", to: "server-2", weight: 0.5, active: true });
      paths.push({ from: "server-1", to: "db", weight: 0.5, active: true });
      paths.push({ from: "server-2", to: "db", weight: 0.5, active: true });
    } else {
      // Skew: 100% to server-1, 0% to server-2
      paths.push({ from: "users", to: "server-1", weight: 1.0, active: true });
      paths.push({ from: "server-1", to: "db", weight: 0.5, active: true });
    }
  }

  // Simulation Game Loop
  useEffect(() => {
    if (isResolved || isSystemDown) return;

    const interval = setInterval(() => {
      if (!appliedFix) {
        // Error budget burn down
        if (errorBudgetRef.current <= 0) return;
        const next = Math.max(0, errorBudgetRef.current - 1.2);
        errorBudgetRef.current = next;
        setErrorBudget(next);
        if (next <= 0) {
          setIsSystemDown(true);
          setMistakes((m) => m + 1);
          playErrorSound();
        }
      } else {
        // Stabilization countdown
        if (stabilizeRef.current >= 5.0) return;
        const next = Math.min(5.0, stabilizeRef.current + 0.5);
        stabilizeRef.current = next;
        setStabilizeProgress(next);
        if (next >= 5.0) {
          setIsResolved(true);
          playSuccessSound();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          recordMissionComplete(incidentId, 150);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [appliedFix, isResolved, isSystemDown, incidentId]);

  // Particle Generation & Animation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      // Clear with dark tech gradient
      ctx.clearRect(0, 0, width, height);

      // Helper to get coordinates
      const getNodePos = (id: string) => {
        const n = nodes.find((node) => node.id === id);
        if (!n) return { x: 0, y: 0 };
        return { x: n.x * width, y: n.y * height };
      };

      // Draw curved network wire traces
      paths.forEach((path) => {
        const from = getNodePos(path.from);
        const to = getNodePos(path.to);

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        const cpX = (from.x + to.x) / 2;
        ctx.bezierCurveTo(cpX, from.y, cpX, to.y, to.x, to.y);

        ctx.lineWidth = 2.5;
        if (appliedFix) {
          ctx.strokeStyle = "rgba(52, 211, 153, 0.35)"; // green stable
        } else if (path.from === "users" && !appliedFix) {
          ctx.strokeStyle = "rgba(244, 63, 94, 0.4)"; // red overloaded
        } else {
          ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
        }
        ctx.stroke();
      });

      // Spawn new particles periodically
      if (Math.random() < 0.35 && paths.length > 0) {
        const pathIdx = Math.floor(Math.random() * paths.length);
        const p = paths[pathIdx];
        const isErr = !appliedFix && (p.to === "server-1" || p.from === "server-1");

        particlesRef.current.push({
          id: nextParticleId.current++,
          pathIndex: pathIdx,
          progress: 0,
          speed: 0.012 + Math.random() * 0.008,
          isError: isErr && Math.random() < 0.6,
          isResolved: !!appliedFix,
        });
      }

      // Update & Render Particles
      const activeParticles: SimParticle[] = [];
      particlesRef.current.forEach((particle) => {
        particle.progress += particle.speed;

        if (particle.progress < 1) {
          const path = paths[particle.pathIndex];
          if (path) {
            const from = getNodePos(path.from);
            const to = getNodePos(path.to);
            const cpX = (from.x + to.x) / 2;

            // Compute point on cubic bezier curve
            const t = particle.progress;
            const px =
              Math.pow(1 - t, 3) * from.x +
              3 * Math.pow(1 - t, 2) * t * cpX +
              3 * (1 - t) * Math.pow(t, 2) * cpX +
              Math.pow(t, 3) * to.x;
            const py =
              Math.pow(1 - t, 3) * from.y +
              3 * Math.pow(1 - t, 2) * t * from.y +
              3 * (1 - t) * Math.pow(t, 2) * to.y +
              Math.pow(t, 3) * to.y;

            // Draw particle glow
            ctx.beginPath();
            ctx.arc(px, py, particle.isError ? 4.5 : 3.5, 0, Math.PI * 2);

            if (particle.isError) {
              ctx.fillStyle = "#fb7185"; // rose
              ctx.shadowColor = "#f43f5e";
              ctx.shadowBlur = 10;
            } else if (particle.isResolved) {
              ctx.fillStyle = "#34d399"; // emerald
              ctx.shadowColor = "#10b981";
              ctx.shadowBlur = 8;
            } else {
              ctx.fillStyle = "#38bdf8"; // cyan/sky
              ctx.shadowColor = "#0284c7";
              ctx.shadowBlur = 6;
            }
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          }
          activeParticles.push(particle);
        } else {
          // Packet reached destination: If error, spawn a 504 explosion!
          const path = paths[particle.pathIndex];
          if (path && particle.isError) {
            const to = getNodePos(path.to);
            explosionsRef.current.push({
              id: nextExplosionId.current++,
              x: to.x + (Math.random() * 30 - 15),
              y: to.y + (Math.random() * 30 - 15),
              label: "504",
              opacity: 1.0,
              scale: 0.8,
            });
          }
        }
      });
      particlesRef.current = activeParticles;

      // Update & Render 504 Explosions
      const activeExplosions: Explosion[] = [];
      explosionsRef.current.forEach((exp) => {
        exp.y -= 0.6; // float up
        exp.opacity -= 0.025;
        exp.scale += 0.015;

        if (exp.opacity > 0) {
          ctx.save();
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = `rgba(244, 63, 94, ${exp.opacity})`;
          ctx.shadowColor = "rgba(244, 63, 94, 0.8)";
          ctx.shadowBlur = 8;
          ctx.fillText(`⚡ ${exp.label} TIMEOUT`, exp.x, exp.y);
          ctx.restore();
          activeExplosions.push(exp);
        }
      });
      explosionsRef.current = activeExplosions;

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [paths, nodes, appliedFix]);

  // Tactical Actions
  const handleDeployFix = (fixKey: string) => {
    if (fixKey === "upgrade_core") setMistakes((m) => m + 1);
    playDeploySound();
    setAppliedFix(fixKey);
    resetStabilize();
    setTimeout(() => {
      if (soundEnabled) playBlipSound();
    }, 300);
  };

  const handleRollback = () => {
    playBlipSound();
    setAppliedFix(null);
    resetStabilize();
    resetBudget();
    setIsSystemDown(false);
  };

  const handleNextIncident = () => {
    if (incidentId === "hs-01") {
      setIncidentId("lb-01");
      resetBudget();
      resetStabilize();
      setIsSystemDown(false);
      setAppliedFix(null);
      setIsResolved(false);
    } else {
      if (onAllCompleted) {
        onAllCompleted({ firstTry: mistakes === 0 });
      } else if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div className="surface !rounded-2xl border border-rose-400/30 overflow-hidden shadow-[0_20px_80px_-20px_rgba(244,63,94,0.35)] flex flex-col h-full max-h-full w-full relative animate-fadeIn">
      {/* Simulation Cockpit Header */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line)] bg-rose-400/[0.04]">
        <div className="flex items-center gap-3">
          <span className="chip chip-bad font-mono text-[11px]">
            <span className="dot animate-pulse-glow" aria-hidden /> P0 · Live Outage
          </span>
          <span className="num text-xs text-slate-400">
            {isHs ? "INC-001 · Horizontal Scaling Crisis" : "INC-002 · Traffic Skew Bottleneck"}
          </span>
        </div>

        {/* SLA Error Budget Meter */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="eyebrow !text-[11px] text-slate-400 hidden sm:inline">SLA Error Budget:</span>
            <div className="w-24 sm:w-36 h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden relative">
              <div
                className={`h-full transition-all duration-300 ${
                  errorBudget > 60
                    ? "bg-emerald-400"
                    : errorBudget > 25
                    ? "bg-amber-400"
                    : "bg-rose-500 animate-pulse"
                }`}
                style={{ width: `${errorBudget}%` }}
              />
            </div>
            <span
              className={`num text-xs font-semibold ${
                errorBudget > 60
                  ? "text-emerald-300"
                  : errorBudget > 25
                  ? "text-amber-300"
                  : "text-rose-400"
              }`}
            >
              {errorBudget.toFixed(0)}%
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
              aria-label="Close war room"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Live System Metrics Bar */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 border-b border-[var(--line)] bg-black/20 divide-x divide-[var(--line)] text-xs">
        <div className="p-2 sm:px-5 sm:py-2.5">
          <span className="eyebrow !text-[11px] text-slate-400 block">Ingress Traffic</span>
          <div className="num text-sm sm:text-base font-medium text-cyan-300 mt-0.5">
            {trafficRps.toLocaleString()} <span className="text-[11px] sm:text-[11px] text-slate-500">req/s</span>
          </div>
        </div>
        <div className="p-2 sm:px-5 sm:py-2.5">
          <span className="eyebrow !text-[11px] text-slate-400 block">App CPU Saturation</span>
          <div
            className={`num text-sm sm:text-base font-semibold mt-0.5 ${
              server1Cpu > 80 ? "text-rose-400 animate-pulse" : "text-emerald-400"
            }`}
          >
            {server1Cpu}%{" "}
            <span className="text-[11px] sm:text-[11px] text-slate-500">{server1Cpu > 80 ? "(Limit)" : "(Optimal)"}</span>
          </div>
        </div>
        <div className="p-2 sm:px-5 sm:py-2.5">
          <span className="eyebrow !text-[11px] text-slate-400 block">p95 Latency</span>
          <div
            className={`num text-sm sm:text-base font-medium mt-0.5 ${
              p95Latency > 500 ? "text-rose-400" : "text-emerald-300"
            }`}
          >
            {p95Latency} <span className="text-[11px] sm:text-[11px] text-slate-500">ms</span>
          </div>
        </div>
        <div className="p-2 sm:px-5 sm:py-2.5">
          <span className="eyebrow !text-[11px] text-slate-400 block">5xx Error Rate</span>
          <div
            className={`num text-sm sm:text-base font-semibold mt-0.5 ${
              errorRate > 0 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {errorRate}% <span className="text-[11px] sm:text-[11px] text-slate-500">{errorRate > 0 ? "(504s)" : "(All Clear)"}</span>
          </div>
        </div>
      </div>

      {/* Main Simulation Viewport (Interactive Circuit Canvas) */}
      <div className="relative flex-1 min-h-[220px] bg-gradient-to-b from-[#0b101b] via-[#090d16] to-[#06080e] overflow-hidden">
        {/* Dynamic Canvas with Particles */}
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none z-0" />
        <p className="sr-only" aria-live="polite">
          {`Error budget ${Math.round(errorBudget)}%. ${nodes.map((n) => `${n.label}: ${n.statusText}`).join(". ")}.`}
        </p>

        {/* DOM Topology Nodes Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {nodes.map((node) => {
            const Icon = node.icon;
            const isOverloaded = node.cpu > 80;
            const isIdle = node.cpu === 0;

            return (
              <div
                key={node.id}
                onClick={() => setInspectedNodeId(node.id)}
                style={{
                  left: `${node.x * 100}%`,
                  top: `${node.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className={`absolute pointer-events-auto cursor-pointer p-3 sm:p-4 rounded-xl border transition-all duration-500 select-none group min-w-[130px] sm:min-w-[155px] ${
                  isOverloaded
                    ? "bg-rose-950/80 border-rose-500/80 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.45)] animate-shake"
                    : isIdle
                    ? "bg-slate-900/60 border-dashed border-slate-700 text-slate-400 opacity-60"
                    : "bg-slate-900/85 border-cyan-400/40 text-slate-100 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-400"
                }`}
              >
                {/* Node Header */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isOverloaded
                          ? "text-rose-400 animate-pulse"
                          : isIdle
                          ? "text-slate-500"
                          : "text-cyan-300"
                      }`}
                    />
                    <span className="text-xs font-semibold tracking-tight">{node.label}</span>
                  </div>
                  {isOverloaded && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </div>

                {/* Live CPU Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>CPU: {node.cpu}%</span>
                    <span>{node.rps > 0 ? `${(node.rps / 1000).toFixed(0)}k RPS` : "0 RPS"}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverloaded ? "bg-rose-500" : isIdle ? "bg-slate-700" : "bg-emerald-400"
                      }`}
                      style={{ width: `${node.cpu}%` }}
                    />
                  </div>
                </div>

                {/* Node Buffer Queue dots */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
                  <span>Buffer Queue:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((slot) => (
                      <span
                        key={slot}
                        className={`w-1.5 h-1.5 rounded-full ${
                          slot <= node.queueDepth
                            ? isOverloaded
                              ? "bg-rose-400 shadow-[0_0_5px_#f43f5e]"
                              : "bg-cyan-400"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Hover hint */}
                <div className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/10 text-[11px] text-slate-300 font-mono whitespace-nowrap z-20">
                  Click to inspect telemetry
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Stabilization Overlay (when fix is applied and stabilizing) */}
        {appliedFix && !isResolved && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 surface !rounded-full px-5 py-2 border border-emerald-400/40 bg-black/80 backdrop-blur-md flex items-center gap-3 shadow-[0_0_30px_rgba(52,211,153,0.3)] animate-fadeIn">
            <span className="dot animate-pulse-glow text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium font-mono">
              System Recovering... Stabilizing SLA ({stabilizeProgress.toFixed(1)}s / 5.0s)
            </span>
            <div className="w-24 h-1.5 rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${(stabilizeProgress / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* System Down / Outage Alert (if error budget hit 0) */}
        {isSystemDown && !appliedFix && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 grid place-items-center text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.5)]">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-2xl font-bold text-white">Total Outage: SLA Depleted</h3>
              <p className="text-sm text-slate-300">
                Incoming traffic completely overwhelmed the single node before you intervened. 504 errors burned through your error budget.
              </p>
            </div>
            <button onClick={handleRollback} className="btn btn-primary btn-md flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset & Try Remediation
            </button>
          </div>
        )}

        {/* Victory Screen (Incident Resolved) */}
        {isResolved && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-400/20 border border-emerald-400/40 grid place-items-center text-emerald-300 shadow-[0_0_50px_rgba(52,211,153,0.5)]">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <div className="space-y-2 max-w-md">
              <div className="flex items-center justify-center gap-1.5 text-amber-300">
                <Star className="w-5 h-5 fill-amber-300" />
                <Star className="w-5 h-5 fill-amber-300" />
                <Star className="w-5 h-5 fill-amber-300" />
              </div>
              <h3 className="text-3xl display text-white">Incident Resolved!</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isHs
                  ? "Horizontal Scaling distributed the 100k req/s load evenly across 2 stateless app servers. CPU dropped from 98% to 45%."
                  : "Deploying an Nginx Reverse Proxy balanced traffic 50/50, eliminating the severe traffic skew on Server 1."}
              </p>
            </div>

            {/* Scorecard Strip */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-md surface p-3.5 rounded-xl border border-emerald-400/30 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">SLA Preserved</span>
                <span className="num font-semibold text-emerald-300 text-sm">
                  {errorBudget.toFixed(0)}% Budget
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">p95 Latency</span>
                <span className="num font-semibold text-cyan-300 text-sm">{p95Latency}ms</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Reward</span>
                <span className="num font-semibold text-amber-300 text-sm">+150 XP</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSelectedIntelId(isHs ? "horizontal-scaling" : "load-balancing")}
                className="btn btn-ghost border border-white/10 text-xs flex items-center gap-1.5"
              >
                <Lightbulb className="w-3.5 h-3.5 text-cyan-300" />
                Read ELI5 Analogy & Tradeoffs
              </button>

              <button onClick={handleNextIncident} className="btn btn-primary btn-lg flex items-center gap-2">
                <span>
                  {isHs ? "Advance to INC-002: Load Balancing" : "Inspect Post-Mortem & View Levels"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tactical Engineering Command Tray (Bottom Panel) */}
      <footer className="shrink-0 p-2.5 sm:p-3.5 border-t border-[var(--line)] bg-[var(--surface-2)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-cyan-300 flex items-center gap-1.5 !text-[11px] sm:!text-[11px]">
              <Zap className="w-3 h-3 text-cyan-400" /> Tactical Command Tray
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              — Deploy architectural components directly into the live circuit
            </span>
          </div>

          <button
            onClick={() => setSelectedIntelId(isHs ? "horizontal-scaling" : "load-balancing")}
            className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 underline underline-offset-4 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Concept Intel (ELI5)
          </button>
        </div>

        {/* Action Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {isHs ? (
            <>
              {/* Scale Out Fix (Optimal) */}
              <button
                type="button"
                onClick={() => handleDeployFix("scale_out")}
                disabled={appliedFix === "scale_out"}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 group cursor-pointer ${
                  appliedFix === "scale_out"
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
                    : "border-[var(--line)] bg-black/25 hover:border-cyan-400/60 hover:bg-white/[0.04] text-slate-200"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-400/20 grid place-items-center shrink-0 text-emerald-300 mt-0.5">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs sm:text-sm truncate">Scale Out: Deploy App Server 2</span>
                    <span className="chip chip-ok !text-[11px] !py-0 shrink-0">Optimal</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Forks incoming traffic across 2 parallel nodes. Cuts CPU saturation in half (+ $120/mo).
                  </p>
                </div>
              </button>

              {/* Fragile Fix (Anti-Pattern / Band-aid) */}
              <button
                type="button"
                onClick={() => {
                  playErrorSound();
                  setMistakes((m) => m + 1);
                  setAppliedFix("restart");
                  setTimeout(() => setAppliedFix(null), 2000);
                }}
                className="p-2.5 sm:p-3 rounded-xl border border-[var(--line)] bg-black/25 hover:border-rose-400/60 hover:bg-white/[0.04] text-left transition-all flex items-start gap-2.5 group cursor-pointer text-slate-300"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-400/20 grid place-items-center shrink-0 text-rose-300 mt-0.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs sm:text-sm truncate">Reboot Overloaded Node</span>
                    <span className="chip chip-bad !text-[11px] !py-0 shrink-0">Band-Aid</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Clears memory momentarily, but 100k req/s instantly slams the server back to 98% CPU.
                  </p>
                </div>
              </button>
            </>
          ) : (
            <>
              {/* Deploy Load Balancer Fix (Optimal) */}
              <button
                type="button"
                onClick={() => handleDeployFix("deploy_lb")}
                disabled={appliedFix === "deploy_lb"}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 group cursor-pointer ${
                  appliedFix === "deploy_lb"
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
                    : "border-[var(--line)] bg-black/25 hover:border-cyan-400/60 hover:bg-white/[0.04] text-slate-200"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-400/20 grid place-items-center shrink-0 text-emerald-300 mt-0.5">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs sm:text-sm truncate">Deploy Nginx Load Balancer</span>
                    <span className="chip chip-ok !text-[11px] !py-0 shrink-0">Optimal</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Places reverse proxy between Users & Fleet. Uses round-robin to balance load 50/50.
                  </p>
                </div>
              </button>

              {/* Vertical Scale Fix (Overkill / Tradeoff) */}
              <button
                type="button"
                onClick={() => handleDeployFix("upgrade_core")}
                disabled={appliedFix === "upgrade_core"}
                className="p-2.5 sm:p-3 rounded-xl border border-[var(--line)] bg-black/25 hover:border-amber-400/60 hover:bg-white/[0.04] text-left transition-all flex items-start gap-2.5 group cursor-pointer text-slate-300"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 grid place-items-center shrink-0 text-amber-300 mt-0.5">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs sm:text-sm truncate">Upgrade Server 1 to 64 Cores</span>
                    <span className="chip chip-warn !text-[11px] !py-0 shrink-0">Overkill</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Absorbs spike vertically, but leaves Server 1 as Single Point of Failure (+$800/mo).
                  </p>
                </div>
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Just-In-Time Concept Intel Drawer */}
      <ConceptIntelDrawer intelId={selectedIntelId} onClose={() => setSelectedIntelId(null)} />

      {/* Node Telemetry Inspector */}
      {inspectedNodeId && (() => {
        const inspectedNode = nodes.find((n) => n.id === inspectedNodeId);
        const telemetry = inspectedNode
          ? getMockTelemetryForNode(
              inspectedNode.id,
              inspectedNode.role,
              inspectedNode.cpu > 80,
              {
                cpuUsage: inspectedNode.cpu,
                p99LatencyMs: p95Latency,
                errorRate: errorRate,
              }
            )
          : null;

        return (
          <TelemetryInspector
            telemetry={telemetry}
            onClose={() => setInspectedNodeId(null)}
            onKnobChange={(knobId, val) => {
              if (knobId === "lb_algorithm" && val === "round_robin" && isLb) {
                handleDeployFix("deploy_lb");
              }
            }}
          />
        );
      })()}
    </div>
  );
}
