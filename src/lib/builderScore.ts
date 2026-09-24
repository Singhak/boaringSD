import type { ArchitectureNodeType, BuilderScenario } from "@/types";

export interface BuilderScoreResult {
  score: number;
  grade: "F" | "D" | "C" | "B" | "A" | "S";
  summary: string;
  findings: string[];
  canPass: boolean;
}

interface BuilderNodeLike {
  id?: string;
  data?: {
    type?: string;
    label?: string;
    cpu?: number;
    status?: string;
    down?: boolean;
  };
}

interface BuilderEdgeLike {
  source: string;
  target: string;
}

/** Optional scenario context. Without it, cache/replica needs are inferred from traffic. */
export interface ScoreExpectations {
  cacheExpected?: boolean;
  replicaExpected?: boolean;
}

export function evaluateArchitectureScore(
  nodes: BuilderNodeLike[],
  trafficRps: number,
  expectations: ScoreExpectations = {}
): BuilderScoreResult {
  const cacheExpected = expectations.cacheExpected ?? trafficRps > 12000;
  const replicaExpected = expectations.replicaExpected ?? trafficRps > 25000;
  const serverNodes = nodes.filter((node) => node.data?.type === "server");
  const hasLB = nodes.some((node) => node.data?.type === "load_balancer");
  const hasCache = nodes.some((node) => node.data?.type === "cache");
  const hasDatabase = nodes.some((node) => node.data?.type === "database");
  const hasReplica = nodes.some((node) => node.data?.type === "replica");
  const hasCDN = nodes.some((node) => node.data?.type === "cdn");
  const overloadedNodes = nodes.filter((node) => (node.data?.status ?? "healthy") === "overloaded").length;
  const averageCpu = nodes.reduce((sum, node) => sum + (node.data?.cpu ?? 0), 0) / Math.max(nodes.length, 1);

  let score = 30;
  const findings: string[] = [];

  if (hasLB) {
    score += 22;
    findings.push("Traffic is distributed across multiple backends.");
  } else {
    score -= 20;
    findings.push("Missing a load balancer creates a single point of failure.");
  }

  if (serverNodes.length >= 2) {
    score += 14;
    findings.push("More than one application server improves redundancy.");
  } else {
    score -= 12;
    findings.push("A single app server is brittle under burst traffic.");
  }

  if (hasCache) {
    score += 18;
    findings.push("Caching reduces repeated database reads under high concurrency.");
  } else if (cacheExpected) {
    score -= 18;
    findings.push("No cache means repeated reads will hit the database too hard.");
  }

  if (hasDatabase) {
    score += 10;
    findings.push("A durable data layer is present.");
  } else {
    score -= 10;
    findings.push("No database tier means the architecture cannot persist state.");
  }

  if (hasReplica) {
    score += 8;
    findings.push("Read replicas improve query throughput for read-heavy workloads.");
  } else if (replicaExpected) {
    score -= 8;
    findings.push("Large read-heavy traffic should use replicas to keep the primary stable.");
  }

  if (hasCDN) {
    score += 6;
    findings.push("Edge delivery reduces load for static assets.");
  }

  if (averageCpu > 75) {
    score -= 18;
    findings.push("Node utilization is still too high for a healthy production system.");
  } else if (averageCpu < 60) {
    score += 8;
    findings.push("CPU utilization is below the danger threshold for a healthy balance.");
  }

  if (overloadedNodes > 0) {
    score -= overloadedNodes * 12;
    findings.push("At least one node is overloaded and needs a fix.");
  }

  if (!hasLB && !hasCache && serverNodes.length === 1) {
    findings.push("Monolith pattern: this design lacks horizontal scaling and cache protection.");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  let grade: BuilderScoreResult["grade"] = "F";
  if (clamped >= 90) grade = "S";
  else if (clamped >= 80) grade = "A";
  else if (clamped >= 70) grade = "B";
  else if (clamped >= 60) grade = "C";
  else if (clamped >= 45) grade = "D";

  const canPass = clamped >= 70 && hasLB && hasDatabase && (hasCache || !cacheExpected);

  const summary =
    clamped >= 90
      ? "Production-grade design with solid scaling and capacity planning."
      : clamped >= 75
      ? "Strong architecture, but a few bottlenecks remain before this is resilient at peak load."
      : clamped >= 60
      ? "Conceptually valid, but the design still needs stronger load distribution and cache protection."
      : "The stack is under-provisioned; the system would likely fail under realistic traffic spikes.";

  return {
    score: clamped,
    grade,
    summary,
    findings: findings.slice(0, 4),
    canPass,
  };
}

// ============================================================================
// Traffic simulation (shared by the sandbox and scenario bosses)
// ============================================================================

export type SimStatus = "idle" | "healthy" | "warning" | "overloaded";

export interface WorkloadProfile {
  rps: number;
  readRatio: number;
  cacheHitRate: number;
  staticAssetShare: number;
  globalUsers: boolean;
  slowDownstream: boolean;
  killOneServer: boolean;
}

export interface SimulationMetrics {
  maxServerCpu: number;
  maxDbCpu: number;
  primaryDbCpu: number;
  latencyMs: number;
  errorRate: number;
  aliveServers: number;
  dbReadsPerSec: number;
  serverShares: number[]; // % of origin traffic each server receives
}

export interface SimulationResult {
  nodeStates: Record<string, { cpu: number; status: SimStatus; down?: boolean }>;
  metrics: SimulationMetrics;
}

/** Requests/sec a single app server handles at 100% CPU. */
export const SERVER_CAPACITY_RPS = 12500;
/** Queries/sec a single database node handles at 100% CPU. */
export const DB_CAPACITY_QPS = 28000;

export function sandboxWorkload(rps: number): WorkloadProfile {
  return {
    rps,
    readRatio: 0.9,
    cacheHitRate: 0.9,
    staticAssetShare: 0.2,
    globalUsers: false,
    slowDownstream: false,
    killOneServer: false,
  };
}

export function scenarioWorkload(scenario: BuilderScenario): WorkloadProfile {
  return {
    rps: scenario.trafficRps,
    readRatio: scenario.readRatio,
    cacheHitRate: scenario.cacheHitRate,
    staticAssetShare: scenario.staticAssetShare,
    globalUsers: scenario.globalUsers,
    slowDownstream: scenario.slowDownstream,
    killOneServer: scenario.killOneServer,
  };
}

function statusFor(cpu: number): SimStatus {
  if (cpu > 85) return "overloaded";
  if (cpu > 60) return "warning";
  return "healthy";
}

function latencyPenalty(cpu: number): number {
  if (cpu <= 60) return cpu * 0.5;
  if (cpu <= 85) return 30 + (cpu - 60) * 6;
  return 180 + (cpu - 85) * 120;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function simulateTopology(nodes: BuilderNodeLike[], workload: WorkloadProfile): SimulationResult {
  const typeOf = (n: BuilderNodeLike) => n.data?.type;
  const idOf = (n: BuilderNodeLike, i: number) => n.id ?? `node-${i}`;
  const has = (t: ArchitectureNodeType) => nodes.some((n) => typeOf(n) === t);

  const hasLB = has("load_balancer");
  const hasCache = has("cache");
  const hasCDN = has("cdn");
  const hasQueue = has("queue");

  const servers = nodes.map((n, i) => ({ n, id: idOf(n, i) })).filter(({ n }) => typeOf(n) === "server");
  const killedId = workload.killOneServer && servers.length > 0 ? servers[servers.length - 1].id : null;
  const alive = servers.filter((s) => s.id !== killedId);

  const staticRps = workload.rps * workload.staticAssetShare;
  const dynamicRps = workload.rps - staticRps;
  const serverRps = dynamicRps + (hasCDN ? 0 : staticRps);
  const workFactor = workload.slowDownstream && !hasQueue ? 2 : 1;

  // Without a load balancer, every client hits the first server.
  const perServerRps = new Map<string, number>();
  alive.forEach((s, idx) => {
    const share = hasLB ? serverRps / alive.length : idx === 0 ? serverRps : 0;
    perServerRps.set(s.id, share);
  });

  const reads = dynamicRps * workload.readRatio;
  const writes = dynamicRps - reads;
  const dbReads = hasCache ? reads * (1 - workload.cacheHitRate) : reads;
  const replicaCount = nodes.filter((n) => typeOf(n) === "replica").length;
  const primaryLoad = replicaCount > 0 ? writes : writes + dbReads;
  const replicaLoad = replicaCount > 0 ? dbReads / replicaCount : 0;

  const rawServerCpu = (rps: number) => (rps * workFactor * 100) / SERVER_CAPACITY_RPS;
  const rawPrimaryCpu = (primaryLoad * 100) / DB_CAPACITY_QPS;
  const rawReplicaCpu = (replicaLoad * 100) / DB_CAPACITY_QPS;

  const nodeStates: SimulationResult["nodeStates"] = {};
  let errorLoad = 0;
  let maxServerCpu = 0;
  let maxDbCpu = 0;
  let primaryDbCpu = 0;

  nodes.forEach((n, i) => {
    const id = idOf(n, i);
    const type = typeOf(n);
    let raw = 15;

    if (type === "server") {
      if (id === killedId) {
        nodeStates[id] = { cpu: 0, status: "idle", down: true };
        return;
      }
      const rps = perServerRps.get(id) ?? 0;
      raw = rps === 0 ? 3 : rawServerCpu(rps);
      maxServerCpu = Math.max(maxServerCpu, raw);
    } else if (type === "database") {
      raw = rawPrimaryCpu;
      primaryDbCpu = Math.max(primaryDbCpu, raw);
      maxDbCpu = Math.max(maxDbCpu, raw);
    } else if (type === "replica") {
      raw = rawReplicaCpu;
      maxDbCpu = Math.max(maxDbCpu, raw);
    } else if (type === "load_balancer") {
      raw = Math.min(70, (workload.rps / 100000) * 70);
    } else if (type === "cache") {
      raw = Math.min(60, (workload.rps / 10000) * 15);
    } else if (type === "cdn") {
      raw = Math.min(50, 10 + (staticRps / 10000) * 5);
    } else if (type === "queue") {
      raw = workload.slowDownstream ? 35 : 10;
    }

    if (type === "server" || type === "database" || type === "replica") {
      errorLoad += Math.max(0, raw - 85) * 1.5;
    }
    const cpu = Math.min(100, Math.round(raw));
    nodeStates[id] = { cpu, status: statusFor(raw) };
  });

  let latencyMs: number;
  let errorRate: number;
  if (alive.length === 0) {
    latencyMs = 5000;
    errorRate = 100;
  } else {
    latencyMs =
      20 +
      latencyPenalty(Math.min(100, maxServerCpu)) +
      latencyPenalty(Math.min(100, maxDbCpu)) +
      (hasCache ? 0 : 25) +
      (workload.globalUsers && !hasCDN ? 250 : 0) +
      (workload.slowDownstream && !hasQueue ? 800 : 0);
    errorRate = Math.min(100, errorLoad);
  }

  return {
    nodeStates,
    metrics: {
      maxServerCpu: Math.round(maxServerCpu),
      maxDbCpu: Math.round(maxDbCpu),
      primaryDbCpu: Math.round(primaryDbCpu),
      latencyMs: Math.round(latencyMs),
      errorRate: round1(errorRate),
      aliveServers: alive.length,
      dbReadsPerSec: Math.round(dbReads),
      serverShares: alive.map((s) =>
        serverRps > 0 ? Math.round(((perServerRps.get(s.id) ?? 0) / serverRps) * 100) : 0
      ),
    },
  };
}

/** Returns nodes with cpu/status replaced by the simulation's result. */
export function applySimulation<T extends BuilderNodeLike>(nodes: T[], sim: SimulationResult): T[] {
  return nodes.map((n, i) => {
    const state = sim.nodeStates[n.id ?? `node-${i}`];
    if (!state) return n;
    return { ...n, data: { ...n.data, cpu: state.cpu, status: state.status, down: state.down ?? false } };
  });
}

// ============================================================================
// Scenario (architecture boss) evaluation
// ============================================================================

export type CheckStatus = "pass" | "fail" | "warn";

export interface ScenarioCheck {
  id: string;
  status: CheckStatus;
  message: string;
}

export interface ScenarioEvaluation {
  score: BuilderScoreResult;
  checks: ScenarioCheck[];
  canPass: boolean;
  simulation: SimulationResult;
  failureReasons: string[];
}

export const COMPONENT_LABELS: Record<ArchitectureNodeType, string> = {
  client: "users",
  load_balancer: "load balancer",
  server: "app server",
  cache: "cache",
  database: "primary database",
  replica: "read replica",
  cdn: "CDN",
  queue: "message queue",
};

export function evaluateScenario(
  nodes: BuilderNodeLike[],
  edges: BuilderEdgeLike[],
  scenario: BuilderScenario
): ScenarioEvaluation {
  const simulation = simulateTopology(nodes, scenarioWorkload(scenario));
  const simulated = applySimulation(nodes, simulation);
  const { metrics } = simulation;
  const checks: ScenarioCheck[] = [];

  const connectedIds = new Set<string>();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });
  const nodesOfType = (t: ArchitectureNodeType) => nodes.filter((n) => n.data?.type === t);

  for (const type of scenario.requiredComponents) {
    const label = COMPONENT_LABELS[type];
    const present = nodesOfType(type);
    if (present.length === 0) {
      checks.push({ id: `require-${type}`, status: "fail", message: `Fail: the design has no ${label}.` });
    } else if (!present.some((n) => n.id && connectedIds.has(n.id))) {
      checks.push({ id: `require-${type}`, status: "fail", message: `Fail: the ${label} is not connected to anything.` });
    } else {
      checks.push({ id: `require-${type}`, status: "pass", message: `Pass: ${label} is in place and connected.` });
    }
  }

  // Components that exist but carry no traffic are a warning, not a failure.
  const requiredSet = new Set(scenario.requiredComponents);
  (["cache", "replica", "cdn", "queue", "load_balancer"] as ArchitectureNodeType[]).forEach((type) => {
    if (requiredSet.has(type)) return;
    const present = nodesOfType(type);
    if (present.length > 0 && !present.some((n) => n.id && connectedIds.has(n.id))) {
      checks.push({
        id: `orphan-${type}`,
        status: "warn",
        message: `Warning: the ${COMPONENT_LABELS[type]} is not connected to the rest of the system.`,
      });
    }
  });

  const serverCount = nodesOfType("server").length;
  if (scenario.targets.minServers !== undefined) {
    checks.push({
      id: "min-servers",
      status: serverCount >= scenario.targets.minServers ? "pass" : "fail",
      message:
        serverCount >= scenario.targets.minServers
          ? `Pass: ${serverCount} servers share traffic.`
          : `Fail: ${serverCount} server${serverCount === 1 ? "" : "s"}; this scenario needs at least ${scenario.targets.minServers}.`,
    });
  }

  const serverLabel = scenario.killOneServer ? "Busiest surviving server" : "Busiest server";
  if (metrics.aliveServers === 0) {
    checks.push({ id: "server-cpu", status: "fail", message: "Fail: no app server is left to handle requests." });
  } else {
    const ok = metrics.maxServerCpu < scenario.targets.maxServerCpu;
    checks.push({
      id: "server-cpu",
      status: ok ? "pass" : "fail",
      message: `${ok ? "Pass" : "Fail"}: ${serverLabel} at ${metrics.maxServerCpu}% CPU (target < ${scenario.targets.maxServerCpu}%).`,
    });
  }

  if (scenario.targets.maxDbCpu !== undefined) {
    const ok = metrics.maxDbCpu < scenario.targets.maxDbCpu;
    checks.push({
      id: "db-cpu",
      status: ok ? "pass" : "fail",
      message: `${ok ? "Pass" : "Fail"}: busiest database node at ${metrics.maxDbCpu}% CPU (target < ${scenario.targets.maxDbCpu}%).`,
    });
  }

  if (scenario.targets.maxLatencyMs !== undefined) {
    const ok = metrics.latencyMs < scenario.targets.maxLatencyMs;
    checks.push({
      id: "latency",
      status: ok ? "pass" : "fail",
      message: `${ok ? "Pass" : "Fail"}: p95 latency ${metrics.latencyMs}ms (target < ${scenario.targets.maxLatencyMs}ms).`,
    });
  }

  const overloaded = simulated.filter((n) => n.data?.status === "overloaded");
  if (overloaded.length > 0) {
    checks.push({
      id: "overloaded",
      status: "fail",
      message: `Fail: ${overloaded.map((n) => n.data?.label ?? n.data?.type).join(", ")} overloaded under the stress test.`,
    });
  }

  const score = evaluateArchitectureScore(simulated, scenario.trafficRps, {
    cacheExpected: requiredSet.has("cache"),
    replicaExpected: requiredSet.has("replica"),
  });

  const failing = checks.filter((c) => c.status === "fail");
  const canPass = failing.length === 0 && score.score >= scenario.passThreshold;
  const failureReasons = failing.map((c) => c.id);
  if (failing.length === 0 && !canPass) failureReasons.push("score-below-threshold");

  return { score, checks, canPass, simulation, failureReasons };
}
