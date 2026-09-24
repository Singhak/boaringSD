"use client";

import React from "react";
import { T, Topology } from "@/components/run/RunVisuals";
import type { Tier } from "@/components/run/RunVisuals";
import { SimulationState } from "@/types";

interface InteractiveStageProps {
  lessonId: string;
  state: SimulationState;
}

function tiersFor(lessonId: string, s: SimulationState): Tier[] {
  const users = [T("Users", "ok", `${s.userCount.toLocaleString()} req/s`)];
  const m = s.metrics;

  if (lessonId === "load-balancer") {
    const servers = Array.from({ length: s.serverCount }, (_, i) =>
      s.serverCount === 1 && m.cpuUsage > 80
        ? T("Server 1", "hot", `${m.cpuUsage}% CPU`)
        : T(`Server ${i + 1}`, i === 0 ? "ok" : "new", `${Math.round(s.userCount / s.serverCount).toLocaleString()} req/s`)
    );
    return [users, s.hasLoadBalancer ? [T("Load Balancer", "new", "round robin")] : [], servers, [T("Database")]];
  }

  if (lessonId === "cache") {
    return [
      users,
      [T("App API")],
      [
        ...(s.hasCache ? [T("Redis Cache", "new", `${m.cacheHitRate}% hits`)] : []),
        T("PostgreSQL", s.hasCache ? "ok" : "hot", `${m.databaseHits.toLocaleString()} queries/s`),
      ],
    ];
  }

  // database-scaling
  return [
    users,
    [T("App Fleet")],
    [
      s.hasReadReplica ? T("Primary", "ok", "writes only") : T("Primary", "hot", `${m.cpuUsage}% · reads + writes`),
      ...(s.hasReadReplica ? [T("Read Replica 1", "new", "reads"), T("Read Replica 2", "new", "reads")] : []),
    ],
  ];
}

/** The lesson's live system diagram. Actions live in the step list beside it. */
export default function InteractiveStage({ lessonId, state }: InteractiveStageProps) {
  const unhealthy = state.metrics.cpuUsage > 80 || state.metrics.databaseHits > 5000;
  return (
    <Topology
      tiers={tiersFor(lessonId, state)}
      caption={
        <>
          <span className="eyebrow">Live system</span>
          {unhealthy ? (
            <span className="chip chip-bad !py-0">
              <span className="dot animate-pulse-glow" aria-hidden /> Bottleneck
            </span>
          ) : (
            <span className="chip chip-ok !py-0">
              <span className="dot" aria-hidden /> Healthy
            </span>
          )}
        </>
      }
    />
  );
}
