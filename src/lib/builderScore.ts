export interface BuilderScoreResult {
  score: number;
  grade: "F" | "D" | "C" | "B" | "A" | "S";
  summary: string;
  findings: string[];
  canPass: boolean;
}

interface BuilderNodeLike {
  data?: {
    type?: string;
    cpu?: number;
    status?: string;
  };
}

export function evaluateArchitectureScore(nodes: BuilderNodeLike[], trafficRps: number): BuilderScoreResult {
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
  } else if (trafficRps > 12000) {
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
  } else if (trafficRps > 25000) {
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

  const canPass = clamped >= 70 && hasLB && hasDatabase && (hasCache || trafficRps <= 12000);

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
