import type { ArchitectureNodeType } from "@/types";
import { buildAdjacency, nodeId, reachableFrom, type BuilderEdgeLike, type BuilderNodeLike } from "./graph";

export type { BuilderEdgeLike, BuilderNodeLike } from "./graph";

export type ViolationSeverity = "critical" | "warning" | "advisory";

export interface TopologyViolation {
  code: string;
  severity: ViolationSeverity;
  penalty: number;
  message: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  recommendation: string;
}

export interface TopologyValidationResult {
  isValid: boolean;
  scorePenalty: number;
  violations: TopologyViolation[];
  hasIngressProtection: boolean;
  hasExposedDataTier: boolean;
  hasReplicaWriteViolation: boolean;
  reachabilityFromClients: string[]; // Node IDs reachable from client ingress
}

/**
 * Validates a directed graph topology drawn on the Freeform Whiteboard or Architecture Builder.
 * Ensures security isolation, correct ingress flow through load balancers, valid cache-aside paths,
 * and data durability constraints.
 */
export function validateWhiteboardTopology(
  nodes: BuilderNodeLike[],
  edges: BuilderEdgeLike[]
): TopologyValidationResult {
  const violations: TopologyViolation[] = [];
  let scorePenalty = 0;

  // Build node lookup maps
  const nodeById = new Map<string, BuilderNodeLike>();
  const typeById = new Map<string, ArchitectureNodeType>();
  const nodesByType = new Map<ArchitectureNodeType, string[]>();

  nodes.forEach((n, idx) => {
    const id = nodeId(n, idx);
    nodeById.set(id, n);
    const type = (n.data?.type as ArchitectureNodeType) ?? "server";
    typeById.set(id, type);

    if (!nodesByType.has(type)) {
      nodesByType.set(type, []);
    }
    nodesByType.get(type)!.push(id);
  });

  // Build directed adjacency list
  const { outgoing, incoming } = buildAdjacency(nodes, edges);

  const clientNodes = nodesByType.get("client") ?? [];
  const serverNodes = nodesByType.get("server") ?? [];
  const dbNodes = nodesByType.get("database") ?? [];
  const replicaNodes = nodesByType.get("replica") ?? [];
  const cacheNodes = nodesByType.get("cache") ?? [];
  const queueNodes = nodesByType.get("queue") ?? [];

  let hasExposedDataTier = false;
  let hasIngressProtection = true;
  let hasReplicaWriteViolation = false;

  // 1. INGRESS SECURITY CHECK: Clients must never directly connect to DB, Replica, or Cache
  clientNodes.forEach((clientId) => {
    const targets = outgoing.get(clientId) ?? [];
    targets.forEach((targetId) => {
      const targetType = typeById.get(targetId);

      if (targetType === "database" || targetType === "replica") {
        hasExposedDataTier = true;
        scorePenalty += 40;
        violations.push({
          code: "ERR_EXPOSED_DATABASE",
          severity: "critical",
          penalty: 40,
          sourceNodeId: clientId,
          targetNodeId: targetId,
          message: "Fatal: Database ports are exposed directly to public client traffic.",
          recommendation: "Route traffic through an API gateway or application server tier. Never expose databases directly to clients.",
        });
      }

      if (targetType === "cache") {
        hasExposedDataTier = true;
        scorePenalty += 25;
        violations.push({
          code: "ERR_EXPOSED_CACHE",
          severity: "critical",
          penalty: 25,
          sourceNodeId: clientId,
          targetNodeId: targetId,
          message: "Fatal: In-memory cache is directly exposed to public client traffic.",
          recommendation: "Clients should query backend application APIs. Caching tiers must reside behind the application layer.",
        });
      }
    });
  });

  // 2. INGRESS BALANCING & SPOF CHECK:
  // If multiple servers exist, clients should connect through an LB or CDN -> LB
  if (serverNodes.length > 1) {
    clientNodes.forEach((clientId) => {
      const targets = outgoing.get(clientId) ?? [];
      const directServer = targets.find((t) => typeById.get(t) === "server");
      if (directServer) {
        hasIngressProtection = false;
        scorePenalty += 20;
        violations.push({
          code: "ERR_DIRECT_SERVER_INGRESS_SPOF",
          severity: "warning",
          penalty: 20,
          sourceNodeId: clientId,
          targetNodeId: directServer,
          message: "Single Point of Failure: Clients connect directly to an individual server despite multiple servers existing.",
          recommendation: "Place a Load Balancer between clients and the server fleet to distribute ingress traffic evenly.",
        });
      }
    });
  }

  // 3. REPLICA WRITE VIOLATION CHECK:
  // Replicas are read-only. Primary DB must replicate to Replicas.
  // Direct server writes to replica without replication link is a data consistency hazard.
  replicaNodes.forEach((replicaId) => {
    const inNodes = incoming.get(replicaId) ?? [];
    const hasDbReplication = inNodes.some((id) => typeById.get(id) === "database");

    if (dbNodes.length > 0 && !hasDbReplication) {
      hasReplicaWriteViolation = true;
      scorePenalty += 20;
      violations.push({
        code: "ERR_REPLICA_ORPHANED_FROM_PRIMARY",
        severity: "warning",
        penalty: 20,
        targetNodeId: replicaId,
        message: "Read Replica is not receiving replication stream from the primary database.",
        recommendation: "Connect the Primary Database to the Read Replica to represent the WAL/binlog replication stream.",
      });
    }
  });

  // 4. CACHE-ASIDE TOPOLOGY CHECK:
  // Cache nodes should be queried by application servers
  cacheNodes.forEach((cacheId) => {
    const inNodes = incoming.get(cacheId) ?? [];
    const outNodes = outgoing.get(cacheId) ?? [];
    const connectedToAnyServer = inNodes.some((id) => typeById.get(id) === "server") ||
                                 outNodes.some((id) => typeById.get(id) === "server");

    if (serverNodes.length > 0 && !connectedToAnyServer) {
      scorePenalty += 15;
      violations.push({
        code: "WARN_CACHE_DISCONNECTED_FROM_APP",
        severity: "warning",
        penalty: 15,
        targetNodeId: cacheId,
        message: "Cache cluster is disconnected from application servers (Cache-Aside pattern broken).",
        recommendation: "Connect application servers to the cache cluster to offload read lookups.",
      });
    }
  });

  // 5. QUEUE WORKER DECOUPLING:
  // Queues should receive messages from servers and feed workers or downstream servers
  queueNodes.forEach((queueId) => {
    const inNodes = incoming.get(queueId) ?? [];
    if (inNodes.length === 0) {
      scorePenalty += 10;
      violations.push({
        code: "WARN_EMPTY_QUEUE_PRODUCER",
        severity: "warning",
        penalty: 10,
        targetNodeId: queueId,
        message: "Message Queue has no producers feeding tasks into it.",
        recommendation: "Connect application servers to push asynchronous tasks into the queue.",
      });
    }
  });

  // 6. CLIENT REACHABILITY (BFS traversal)
  const reachable = reachableFrom(clientNodes, outgoing);

  // Check if primary compute is reachable
  if (serverNodes.length > 0 && !serverNodes.some((s) => reachable.has(s))) {
    scorePenalty += 30;
    violations.push({
      code: "ERR_COMPUTE_UNREACHABLE",
      severity: "critical",
      penalty: 30,
      message: "No application server is reachable from client ingress.",
      recommendation: "Ensure clients can reach application servers via Load Balancer or direct ingress.",
    });
  }

  const isValid = violations.filter((v) => v.severity === "critical").length === 0;

  return {
    isValid,
    scorePenalty: Math.min(60, scorePenalty),
    violations,
    hasIngressProtection,
    hasExposedDataTier,
    hasReplicaWriteViolation,
    reachabilityFromClients: Array.from(reachable),
  };
}
