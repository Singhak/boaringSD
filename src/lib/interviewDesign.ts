import type { InterviewProblem } from "@/types";
import { buildAdjacency, nodeId, reachableFrom, type BuilderEdgeLike, type BuilderNodeLike } from "@/lib/graph";

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

interface GraphIndex {
  typeOf: Map<string, string>;
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  reachable: Set<string>;
}

function indexGraph(nodes: BuilderNodeLike[], edges: BuilderEdgeLike[]): GraphIndex {
  const { outgoing, incoming } = buildAdjacency(nodes, edges);
  const typeOf = new Map(nodes.map((n, i) => [nodeId(n, i), n.data?.type ?? ""]));
  const clients = [...typeOf].filter(([, t]) => t === "client").map(([id]) => id);
  return { typeOf, outgoing, incoming, reachable: reachableFrom(clients, outgoing) };
}

/** Ids of wired components that actually earn credit in {@link designFromGraph}. */
function countedIds(g: GraphIndex): Set<string> {
  const { typeOf, outgoing, incoming, reachable } = g;
  const live = (type: string) => [...reachable].filter((id) => typeOf.get(id) === type);
  const neighbours = (id: string) => [...(outgoing.get(id) ?? []), ...(incoming.get(id) ?? [])];
  const touches = (id: string, pool: Set<string>) => neighbours(id).some((n) => pool.has(n));

  const servers = new Set(live("server"));
  // Anything downstream of a live server is part of the request path.
  const behindServers = reachableFrom([...servers], outgoing);
  const databases = new Set(live("database").filter((id) => behindServers.has(id)));

  const counted = new Set<string>([...servers, ...databases]);
  live("client").forEach((id) => counted.add(id));
  live("load_balancer")
    .filter((id) => (outgoing.get(id) ?? []).some((n) => servers.has(n)))
    .forEach((id) => counted.add(id));
  live("cdn")
    .filter((id) => (outgoing.get(id) ?? []).some((n) => reachable.has(n) && typeOf.get(n) !== "client"))
    .forEach((id) => counted.add(id));
  live("cache").filter((id) => touches(id, servers)).forEach((id) => counted.add(id));
  live("queue")
    .filter((id) => (incoming.get(id) ?? []).some((n) => servers.has(n)))
    .forEach((id) => counted.add(id));
  live("replica").filter((id) => touches(id, databases)).forEach((id) => counted.add(id));
  return counted;
}

/**
 * Derives the graded {@link Design} from a drawn topology. Only components on
 * a path from a client count, and each must be wired where it does its job:
 * an LB must feed a server, a cache must talk to a server, a queue must be fed
 * by a server, a replica must hang off a database the servers write to.
 */
export function designFromGraph(nodes: BuilderNodeLike[], edges: BuilderEdgeLike[]): Design {
  const g = indexGraph(nodes, edges);
  const counted = countedIds(g);
  const count = (type: string) => [...counted].filter((id) => g.typeOf.get(id) === type).length;
  return {
    hasCDN: count("cdn") > 0,
    hasLB: count("load_balancer") > 0,
    serverCount: count("server"),
    hasCache: count("cache") > 0,
    hasQueue: count("queue") > 0,
    hasDatabase: count("database") > 0,
    hasReplica: count("replica") > 0,
  };
}

/** Ids of drawn components that earn nothing because they are not wired into the request path. */
export function unwiredNodeIds(nodes: BuilderNodeLike[], edges: BuilderEdgeLike[]): string[] {
  const g = indexGraph(nodes, edges);
  const counted = countedIds(g);
  return [...g.typeOf.keys()].filter((id) => !counted.has(id));
}
