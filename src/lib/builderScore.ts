import type { ArchitectureNodeType, ArchitecturalArchetype, BuilderScenario } from "@/types";
import { buildAdjacency, nodeId, reachableFrom, type BuilderEdgeLike, type BuilderNodeLike } from "./graph";
import { validateWhiteboardTopology } from "./topologyValidator";

export interface BuilderScoreResult {
  score: number;
  grade: "F" | "D" | "C" | "B" | "A" | "S";
  summary: string;
  findings: string[];
  canPass: boolean;
  matchedArchetype?: ArchitecturalArchetype;
}


/** Optional scenario context. Without it, cache/replica needs are inferred from traffic. */
export interface ScoreExpectations {
  cacheExpected?: boolean;
  replicaExpected?: boolean;
  acceptedArchetypes?: ArchitecturalArchetype[];
}

/** Ids of nodes that touch at least one edge. */
function connectedNodeIds(nodes: BuilderNodeLike[], edges: BuilderEdgeLike[]): Set<string> {
  const ids = new Set(nodes.map((n, i) => nodeId(n, i)));
  const connected = new Set<string>();
  edges.forEach((e) => {
    if (ids.has(e.source) && ids.has(e.target)) {
      connected.add(e.source);
      connected.add(e.target);
    }
  });
  return connected;
}

/**
 * @param edges when given, only components wired into the system count; a
 * component dropped on the canvas but never connected earns nothing.
 */
export function evaluateArchitectureScore(
  nodes: BuilderNodeLike[],
  trafficRps: number,
  expectations: ScoreExpectations = {},
  edges?: BuilderEdgeLike[]
): BuilderScoreResult {
  const cacheExpected = expectations.cacheExpected ?? trafficRps > 12000;
  const replicaExpected = expectations.replicaExpected ?? trafficRps > 25000;
  const wired = edges ? connectedNodeIds(nodes, edges) : null;
  const counted = nodes.filter((node, i) => !wired || wired.has(nodeId(node, i)));
  const serverNodes = counted.filter((node) => node.data?.type === "server");
  const hasLB = counted.some((node) => node.data?.type === "load_balancer");
  const hasCache = counted.some((node) => node.data?.type === "cache");
  const hasDatabase = counted.some((node) => node.data?.type === "database");
  const hasReplica = counted.some((node) => node.data?.type === "replica");
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

  // Replicas only earn points where the workload needs them; CDN value shows up
  // (or doesn't) in the simulated latency rather than as a flat bonus.
  if (hasReplica && replicaExpected) {
    score += 8;
    findings.push("Read replicas improve query throughput for read-heavy workloads.");
  } else if (replicaExpected) {
    score -= 8;
    findings.push("Large read-heavy traffic should use replicas to keep the primary stable.");
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

  // Multi-Path Archetype Matching (Pillar 5)
  let matchedArchetype: ArchitecturalArchetype | undefined;
  if (expectations.acceptedArchetypes && expectations.acceptedArchetypes.length > 0) {
    const presentTypes = new Set(nodes.map((n) => n.data?.type).filter(Boolean));
    matchedArchetype = expectations.acceptedArchetypes.find((arch) => {
      const hasAllRequired = arch.requiredComponents.every((rc) => presentTypes.has(rc));
      const hasNoForbidden =
        !arch.forbiddenComponents ||
        !arch.forbiddenComponents.some((fc) => presentTypes.has(fc));
      return hasAllRequired && hasNoForbidden;
    });

    if (matchedArchetype) {
      score += 15;
      findings.unshift(`Verified valid architecture path: ${matchedArchetype.name}.`);
    }
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  let grade: BuilderScoreResult["grade"] = "F";
  if (clamped >= 90) grade = "S";
  else if (clamped >= 80) grade = "A";
  else if (clamped >= 70) grade = "B";
  else if (clamped >= 60) grade = "C";
  else if (clamped >= 45) grade = "D";

  const archetypePassed = matchedArchetype !== undefined;
  const canPass =
    (clamped >= 70 && hasLB && hasDatabase && (hasCache || !cacheExpected)) ||
    (archetypePassed && clamped >= 70);

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
    matchedArchetype,
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
  nodeStates: Record<string, { cpu: number; status: SimStatus; down?: boolean; queueDepth?: number }>;
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

/**
 * How traffic actually flows. With edges and at least one client node, only
 * wired components take effect: the LB feeds just the servers it connects to,
 * a cache offloads reads only if a serving app server uses it, replicas only if
 * they replicate from the database, the CDN only if clients reach it. Without
 * edges (legacy callers), every component on the canvas is assumed wired.
 */
function trafficWiring(nodes: BuilderNodeLike[], edges: BuilderEdgeLike[] | undefined) {
  const typeOf = (n: BuilderNodeLike) => n.data?.type;
  const ids = nodes.map((n, i) => nodeId(n, i));
  const idsOfType = (t: ArchitectureNodeType) => ids.filter((_, i) => typeOf(nodes[i]) === t);
  const clients = idsOfType("client");

  if (!edges || clients.length === 0) {
    const has = (t: ArchitectureNodeType) => idsOfType(t).length > 0;
    return {
      lbTargets: has("load_balancer") ? new Set(idsOfType("server")) : null,
      directServers: idsOfType("server"),
      cacheUsed: has("cache"),
      replicaIds: idsOfType("replica"),
      cdnUsed: has("cdn"),
      queueUsed: has("queue"),
    };
  }

  const { outgoing, incoming } = buildAdjacency(nodes, edges);
  const neighbours = (id: string) => [...(outgoing.get(id) ?? []), ...(incoming.get(id) ?? [])];
  const typeById = new Map(ids.map((id, i) => [id, typeOf(nodes[i])]));
  const reachable = reachableFrom(clients, outgoing);

  // Servers behind a reachable LB share traffic; otherwise clients hit servers they point at.
  const lbTargets = new Set<string>();
  idsOfType("load_balancer")
    .filter((lb) => reachable.has(lb))
    .forEach((lb) =>
      (outgoing.get(lb) ?? []).forEach((t) => {
        if (typeById.get(t) === "server") lbTargets.add(t);
      })
    );
  const directServers = clients.flatMap((c) => (outgoing.get(c) ?? []).filter((t) => typeById.get(t) === "server"));
  const servingServers = new Set([...lbTargets, ...directServers]);

  return {
    lbTargets: lbTargets.size > 0 ? lbTargets : null,
    directServers,
    cacheUsed: idsOfType("cache").some((c) => neighbours(c).some((n) => servingServers.has(n))),
    replicaIds: idsOfType("replica").filter((r) => neighbours(r).some((n) => typeById.get(n) === "database")),
    cdnUsed: idsOfType("cdn").some((c) => reachable.has(c) || neighbours(c).some((n) => typeById.get(n) === "client")),
    queueUsed: idsOfType("queue").some((q) => neighbours(q).some((n) => servingServers.has(n))),
  };
}

export function simulateTopology(
  nodes: BuilderNodeLike[],
  workload: WorkloadProfile,
  edges?: BuilderEdgeLike[]
): SimulationResult {
  const typeOf = (n: BuilderNodeLike) => n.data?.type;
  const idOf = (n: BuilderNodeLike, i: number) => nodeId(n, i);
  const wiring = trafficWiring(nodes, edges);

  const lbTargets = wiring.lbTargets;
  const hasCache = wiring.cacheUsed;
  const hasCDN = wiring.cdnUsed;
  const hasQueue = wiring.queueUsed;

  const servers = nodes.map((n, i) => ({ n, id: idOf(n, i) })).filter(({ n }) => typeOf(n) === "server");
  const killedId = workload.killOneServer && servers.length > 0 ? servers[servers.length - 1].id : null;
  // Only servers that traffic can reach take load.
  const routable = new Set([...(lbTargets ?? []), ...wiring.directServers]);
  const alive = servers.filter((s) => s.id !== killedId && routable.has(s.id));

  const staticRps = workload.rps * workload.staticAssetShare;
  const dynamicRps = workload.rps - staticRps;
  const serverRps = dynamicRps + (hasCDN ? 0 : staticRps);
  const workFactor = workload.slowDownstream && !hasQueue ? 2 : 1;

  // Behind an LB, traffic splits across the servers it feeds; without one, every client hits the first server.
  const perServerRps = new Map<string, number>();
  const balanced = lbTargets ? alive.filter((s) => lbTargets.has(s.id)) : [];
  alive.forEach((s, idx) => {
    let share = 0;
    if (lbTargets) share = lbTargets.has(s.id) ? serverRps / balanced.length : 0;
    else if (idx === 0) share = serverRps;
    perServerRps.set(s.id, share);
  });

  const reads = dynamicRps * workload.readRatio;
  const writes = dynamicRps - reads;
  const dbReads = hasCache ? reads * (1 - workload.cacheHitRate) : reads;
  const replicaIds = new Set(wiring.replicaIds);
  const replicaCount = replicaIds.size;
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
      raw = replicaIds.has(id) ? rawReplicaCpu : 3;
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
    let queueDepth = 0;
    if (cpu > 85) {
      queueDepth = Math.min(100, Math.round(40 + (cpu - 85) * 4));
    } else if (cpu > 60) {
      queueDepth = Math.round(5 + ((cpu - 60) / 25) * 35);
    } else {
      queueDepth = Math.round((cpu / 60) * 5);
    }
    nodeStates[id] = { cpu, status: statusFor(raw), queueDepth };
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
    return {
      ...n,
      data: {
        ...n.data,
        cpu: state.cpu,
        status: state.status,
        down: state.down ?? false,
        queueDepth: state.queueDepth,
      },
    };
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
  /** Monthly cost of the design and the scenario's budget, in cloud credits. */
  cost: number;
  budget: number;
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

// ============================================================================
// Cloud credits: every component costs money, so "place everything" loses
// ============================================================================

/** Rough monthly cost per component, in cloud credits (≈ USD). */
export const COMPONENT_MONTHLY_COST: Record<ArchitectureNodeType, number> = {
  client: 0,
  load_balancer: 300,
  server: 400,
  cache: 350,
  database: 900,
  replica: 700,
  cdn: 250,
  queue: 200,
};

export function designMonthlyCost(nodes: BuilderNodeLike[]): number {
  return nodes.reduce((sum, n) => sum + (COMPONENT_MONTHLY_COST[n.data?.type as ArchitectureNodeType] ?? 0), 0);
}

/**
 * The scenario's budget: its explicit `budget`, or the cost of a lean passing
 * design (required components plus enough servers at ~75% CPU, N+1 when a
 * server is killed) with 30% headroom.
 */
export function scenarioBudget(scenario: BuilderScenario): number {
  if (scenario.budget !== undefined) return scenario.budget;
  const serverRps = scenario.trafficRps * (scenario.requiredComponents.includes("cdn") ? 1 - scenario.staticAssetShare : 1);
  const sized = Math.ceil(serverRps / (SERVER_CAPACITY_RPS * 0.75)) + (scenario.killOneServer ? 1 : 0);
  const servers = Math.max(scenario.targets.minServers ?? 1, sized);
  const others = scenario.requiredComponents
    .filter((t) => t !== "server")
    .reduce((sum, t) => sum + COMPONENT_MONTHLY_COST[t], 0);
  const lean = others + servers * COMPONENT_MONTHLY_COST.server + (scenario.requiredComponents.includes("database") ? 0 : COMPONENT_MONTHLY_COST.database);
  return Math.round((lean * 1.3) / 50) * 50;
}

/** Optional components this workload gains nothing from. */
function unneededComponents(scenario: BuilderScenario, nodes: BuilderNodeLike[]): ArchitectureNodeType[] {
  const required = new Set(scenario.requiredComponents);
  const present = new Set(nodes.map((n) => n.data?.type as ArchitectureNodeType));
  const useless: ArchitectureNodeType[] = [];
  if (present.has("cdn") && !required.has("cdn") && scenario.staticAssetShare < 0.1 && !scenario.globalUsers) useless.push("cdn");
  if (present.has("queue") && !required.has("queue") && !scenario.slowDownstream) useless.push("queue");
  if (present.has("replica") && !required.has("replica") && scenario.readRatio < 0.5) useless.push("replica");
  return useless;
}

const OVER_BUDGET_PENALTY = 10;
const UNNEEDED_PENALTY = 5;

export function evaluateScenario(
  nodes: BuilderNodeLike[],
  edges: BuilderEdgeLike[],
  scenario: BuilderScenario
): ScenarioEvaluation {
  const simulation = simulateTopology(nodes, scenarioWorkload(scenario), edges);
  const simulated = applySimulation(nodes, simulation);
  const { metrics } = simulation;
  const checks: ScenarioCheck[] = [];

  const connectedIds = new Set<string>();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });
  const nodesOfType = (t: ArchitectureNodeType) => nodes.filter((n) => n.data?.type === t);

  // Multi-path bosses: a design matching an accepted archetype is judged on that
  // archetype's components instead of the scenario's default list.
  const wiredTypes = new Set(
    nodes.filter((n) => n.id && connectedIds.has(n.id)).map((n) => n.data?.type as ArchitectureNodeType)
  );
  const matchedPath = scenario.acceptedArchetypes?.find(
    (arch) =>
      arch.requiredComponents.every((t) => wiredTypes.has(t)) &&
      !(arch.forbiddenComponents ?? []).some((t) => wiredTypes.has(t))
  );
  const requiredComponents = matchedPath?.requiredComponents ?? scenario.requiredComponents;

  for (const type of requiredComponents) {
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
  const requiredSet = new Set(requiredComponents);
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

  // Directed Graph Topology & Flow Validation
  const topoResult = validateWhiteboardTopology(nodes, edges);
  topoResult.violations.forEach((v) => {
    checks.push({
      id: `topo-${v.code.toLowerCase()}`,
      status: v.severity === "critical" ? "fail" : "warn",
      message: `${v.severity === "critical" ? "Fail" : "Warning"}: ${v.message} (${v.recommendation})`,
    });
  });

  const baseScore = evaluateArchitectureScore(
    simulated,
    scenario.trafficRps,
    {
      cacheExpected: requiredSet.has("cache"),
      replicaExpected: requiredSet.has("replica"),
      acceptedArchetypes: scenario.acceptedArchetypes,
    },
    edges
  );

  // Cloud credits: over budget costs points; far over budget fails the boss.
  const cost = designMonthlyCost(nodes);
  const budget = scenarioBudget(scenario);
  let budgetPenalty = 0;
  if (cost > budget * 1.5) {
    checks.push({
      id: "budget",
      status: "fail",
      message: `Fail: cloud credits blown, $${cost.toLocaleString()}/mo against a $${budget.toLocaleString()} budget. Remove what the workload doesn't need.`,
    });
    budgetPenalty += OVER_BUDGET_PENALTY;
  } else if (cost > budget) {
    checks.push({
      id: "budget",
      status: "warn",
      message: `Warning: over budget, $${cost.toLocaleString()}/mo of $${budget.toLocaleString()} (−${OVER_BUDGET_PENALTY} pts).`,
    });
    budgetPenalty += OVER_BUDGET_PENALTY;
  } else {
    checks.push({
      id: "budget",
      status: "pass",
      message: `Pass: $${cost.toLocaleString()}/mo of $${budget.toLocaleString()} cloud credits.`,
    });
  }
  unneededComponents(scenario, nodes).forEach((type) => {
    budgetPenalty += UNNEEDED_PENALTY;
    checks.push({
      id: `unneeded-${type}`,
      status: "warn",
      message: `Warning: this workload gains nothing from a ${COMPONENT_LABELS[type]} (−${UNNEEDED_PENALTY} pts).`,
    });
  });

  const adjustedScoreVal = Math.max(0, baseScore.score - topoResult.scorePenalty - budgetPenalty);
  let adjustedGrade = baseScore.grade;
  if (adjustedScoreVal >= 90) adjustedGrade = "S";
  else if (adjustedScoreVal >= 80) adjustedGrade = "A";
  else if (adjustedScoreVal >= 70) adjustedGrade = "B";
  else if (adjustedScoreVal >= 60) adjustedGrade = "C";
  else if (adjustedScoreVal >= 50) adjustedGrade = "D";
  else adjustedGrade = "F";

  const score: BuilderScoreResult = {
    ...baseScore,
    score: adjustedScoreVal,
    grade: adjustedGrade,
    findings: [
      ...baseScore.findings,
      ...topoResult.violations.map((v) => `[${v.severity.toUpperCase()}] ${v.message}`),
    ],
  };

  const failing = checks.filter((c) => c.status === "fail");
  const canPass = failing.length === 0 && score.score >= scenario.passThreshold;
  const failureReasons = failing.map((c) => c.id);
  if (failing.length === 0 && !canPass) failureReasons.push("score-below-threshold");

  return { score, checks, canPass, simulation, failureReasons, cost, budget };
}
