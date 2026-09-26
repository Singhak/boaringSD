"use client";

import React, { useState } from "react";
import { Award, Compass, Sparkles, TrendingUp, Zap } from "lucide-react";
import type { CompetencyArea, UserSkillRadar } from "@/types";

interface SkillRadarChartProps {
  radar: UserSkillRadar;
}

const AXIS_ORDER: CompetencyArea[] = [
  "bottleneck_diagnosis",
  "pattern_selection",
  "tradeoff_defense",
  "capacity_estimation",
  "end_to_end_design",
  "resilience_recovery",
];

export default function SkillRadarChart({ radar }: SkillRadarChartProps) {
  const [activeArea, setActiveArea] = useState<CompetencyArea | null>(null);

  const size = 320;
  const center = size / 2;
  const radius = center - 42;
  const numAxes = AXIS_ORDER.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Convert (value, axisIndex) to (x, y) coordinates
  const getCoordinates = (valuePercent: number, axisIndex: number) => {
    const r = (valuePercent / 100) * radius;
    // Rotate by -Math.PI / 2 so the first axis points straight UP
    const angle = axisIndex * angleStep - Math.PI / 2;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Concentric grid polygon rings at 20%, 40%, 60%, 80%, 100%
  const gridRings = [20, 40, 60, 80, 100].map((ringPercent) => {
    const points = AXIS_ORDER.map((_, i) => {
      const { x, y } = getCoordinates(ringPercent, i);
      return `${x},${y}`;
    }).join(" ");
    return { ringPercent, points };
  });

  // Calculate polygon points for user's actual scores
  const userPolygonPoints = AXIS_ORDER.map((area, i) => {
    const score = Math.max(10, radar.scores[area]?.score ?? 10);
    const { x, y } = getCoordinates(score, i);
    return `${x},${y}`;
  }).join(" ");

  const activeScore = activeArea ? radar.scores[activeArea] : null;

  return (
    <article
      className="surface p-5 sm:p-6 rounded-2xl border border-[var(--line)] space-y-5"
      aria-label="Engineering Competency Radar"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-cyan-300">Staff Architecture Mastery</span>
            <span className="chip !text-[11px] font-semibold">{radar.scores[radar.strongestArea]?.tier}</span>
          </div>
          <h2 className="text-xl sm:text-2xl display text-white">6-Axis Engineering Competency</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="eyebrow !text-[11px]">Mastery Index</span>
            <div className="num text-2xl text-white font-bold">
              {radar.overallIndex}
              <span className="text-xs text-slate-500 font-normal"> / 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Radar Graphic & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-center">
        {/* SVG Radar Chart */}
        <div className="relative flex justify-center py-2">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[320px] aspect-square overflow-visible"
            role="img"
            aria-label="Skill Radar Chart"
          >
            {/* Concentric Grid Rings */}
            {gridRings.map((ring) => (
              <polygon
                key={ring.ringPercent}
                points={ring.points}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-white/[0.07]"
              />
            ))}

            {/* Radial Spokes from Center */}
            {AXIS_ORDER.map((_, i) => {
              const { x, y } = getCoordinates(100, i);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-white/[0.1]"
                />
              );
            })}

            {/* User Competency Polygon with Gradient Fill */}
            <defs>
              <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
              </linearGradient>
              <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <polygon
              points={userPolygonPoints}
              fill="url(#radarFill)"
              stroke="#06b6d4"
              strokeWidth="2.5"
              filter="url(#radarGlow)"
              className="transition-all duration-700"
            />

            {/* Vertices & Axis Labels */}
            {AXIS_ORDER.map((area, i) => {
              const score = Math.max(10, radar.scores[area]?.score ?? 10);
              const { x: vx, y: vy } = getCoordinates(score, i);
              const { x: lx, y: ly } = getCoordinates(118, i);
              const isHovered = activeArea === area;

              return (
                <g key={area} className="cursor-pointer" onClick={() => setActiveArea(area)}>
                  {/* Vertex Dot */}
                  <circle
                    cx={vx}
                    cy={vy}
                    r={isHovered ? "6" : "4"}
                    className={`transition-all ${
                      isHovered ? "fill-cyan-300 stroke-white stroke-2" : "fill-cyan-400 stroke-slate-900 stroke-1"
                    }`}
                  />

                  {/* Axis Label */}
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-[9.5px] font-mono select-none transition-all ${
                      isHovered ? "fill-cyan-300 font-bold" : "fill-slate-400"
                    }`}
                  >
                    {radar.scores[area]?.label.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Competency Drilldown List */}
        <div className="space-y-2.5">
          {AXIS_ORDER.map((area) => {
            const item = radar.scores[area];
            const isSelected = activeArea === area;
            return (
              <div
                key={area}
                onClick={() => setActiveArea(area)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveArea(area)}
                className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500/10 border-cyan-400 shadow-[0_0_15px_-4px_rgba(6,182,212,0.3)]"
                    : "surface-2 border-[var(--line)] hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white truncate">{item.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.hasEnoughData ? (
                      <>
                        <span className="chip !text-[11px] !py-0" title={`Measured from ${item.evidencesCount} attempts`}>
                          {item.tier}
                        </span>
                        <span className="num font-bold text-cyan-300 w-8 text-right">{item.score}%</span>
                      </>
                    ) : (
                      <span className="chip chip-warn !text-[11px] !py-0" title={item.highlightTip}>
                        Scouting
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.score >= 80 ? "bg-emerald-400" : item.score >= 50 ? "bg-cyan-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Recommendation Capsule */}
      <footer className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5 max-w-xl">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Targeted Growth Recommendation:</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {activeScore
              ? activeScore.hasEnoughData
                ? `${activeScore.label} is at ${activeScore.score}% (${activeScore.tier}), measured from ${activeScore.evidencesCount} attempts. ${activeScore.highlightTip}.`
                : `${activeScore.label}: ${activeScore.highlightTip}.`
              : radar.scores[radar.growthArea]?.hasEnoughData
              ? `Your biggest opportunity is ${radar.scores[radar.growthArea]?.label} (${radar.scores[radar.growthArea]?.score}%). ${radar.scores[radar.growthArea]?.highlightTip}.`
              : `Next quest for ${radar.scores[radar.growthArea]?.label}: ${radar.scores[radar.growthArea]?.highlightTip.replace(/^Scouting: /, "")}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="chip chip-accent !text-[11px]">
            Strongest: {radar.scores[radar.strongestArea]?.label}
          </span>
        </div>
      </footer>
    </article>
  );
}
