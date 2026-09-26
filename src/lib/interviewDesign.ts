import type { InterviewProblem } from "@/types";

/** Topology picked in the interview design stage. */
export interface Design {
  hasCDN: boolean;
  hasLB: boolean;
  serverCount: number;
  hasCache: boolean;
  hasQueue: boolean;
  hasDatabase: boolean;
  hasReplica: boolean;
}

export const EMPTY_DESIGN: Design = {
  hasCDN: false,
  hasLB: false,
  serverCount: 1,
  hasCache: false,
  hasQueue: false,
  hasDatabase: true,
  hasReplica: false,
};

/** Points lost for each component or server that no requirement justifies. */
export const OVERBUILD_PENALTY = 10;

/**
 * Grades the interview topology: required components must be present, and
 * unjustified extras cost points, so switching everything on never wins.
 */
export function evaluateArchitecture(problem: InterviewProblem, d: Design) {
  const req = problem.requiredDesign ?? {};
  const criteria: { passed: boolean; penalty: number; strength: string; issue: string }[] = [];

  // Database check
  criteria.push({
    passed: d.hasDatabase,
    penalty: 30,
    strength: "Durable persistent database stores system records securely.",
    issue: "Critical failure: No primary database selected. All user data is volatile and lost on crash.",
  });

  // Load Balancer check
  if (req.needsLB) {
    criteria.push({
      passed: d.hasLB,
      penalty: 20,
      strength: "Reverse proxy load balancer distributes ingress across the server fleet.",
      issue: "No load balancer: incoming traffic concentrates onto a single listener without failover.",
    });
  }

  // Server scaling check
  const minSrv = req.minServers ?? 2;
  criteria.push({
    passed: d.serverCount >= minSrv,
    penalty: 20,
    strength: `Horizontal autoscaling: ${d.serverCount} stateless application server instances.`,
    issue: `Insufficient compute: only ${d.serverCount} server(s). Needs at least ${minSrv} to survive peak load and prevent SPOF.`,
  });

  // Cache check
  if (req.needsCache) {
    criteria.push({
      passed: d.hasCache,
      penalty: 20,
      strength: "In-memory RAM cache shields the database from read storms.",
      issue: "No cache: high-frequency reads will saturate database connection pools and disk IOPS.",
    });
  }

  // CDN check
  if (req.needsCDN) {
    criteria.push({
      passed: d.hasCDN,
      penalty: 15,
      strength: "Edge CDN terminates SSL and serves media/static chunks worldwide.",
      issue: "No CDN: origin servers must serve static files and media across international links, violating latency SLOs.",
    });
  }

  // Queue check
  if (req.needsQueue) {
    criteria.push({
      passed: d.hasQueue,
      penalty: 15,
      strength: "Distributed queue decouples heavy asynchronous background processing.",
      issue: "No message queue: synchronous processing risks connection timeouts under heavy write spikes.",
    });
  }

  // Replica check
  if (req.needsReplica) {
    criteria.push({
      passed: d.hasReplica,
      penalty: 15,
      strength: "Read replicas offload query volume from primary database.",
      issue: "No read replicas: read queries compete with write transactions on the primary node.",
    });
  }

  // Over-engineering: interviewers probe every box you draw. A component no
  // requirement calls for costs points instead of earning them.
  const unjustified: { on: boolean; needed?: boolean; label: string }[] = [
    { on: d.hasCDN, needed: req.needsCDN, label: "an edge CDN" },
    { on: d.hasCache, needed: req.needsCache, label: "a cache" },
    { on: d.hasQueue, needed: req.needsQueue, label: "a message queue" },
    { on: d.hasReplica, needed: req.needsReplica, label: "read replicas" },
  ];
  unjustified
    .filter((c) => c.on && !c.needed)
    .forEach((c) =>
      criteria.push({
        passed: false,
        penalty: OVERBUILD_PENALTY,
        strength: "",
        issue: `Over-engineering: ${c.label} adds cost and operational load, but no requirement here calls for it.`,
      })
    );
  if (d.serverCount > minSrv + 1) {
    criteria.push({
      passed: false,
      penalty: OVERBUILD_PENALTY,
      strength: "",
      issue: `Over-provisioned: ${d.serverCount} servers where ${minSrv} with one spare covers the load you estimated.`,
    });
  }

  const score = Math.max(0, criteria.reduce((tot, c) => (c.passed ? tot : tot - c.penalty), 100));

  return {
    score,
    passed: score >= 70,
    strengths: criteria.filter((c) => c.passed).map((c) => c.strength),
    issues: criteria.filter((c) => !c.passed).map((c) => c.issue),
  };
}
