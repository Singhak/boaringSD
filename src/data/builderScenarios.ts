import { BuilderScenario } from "@/types";

// Each boss starts from the previous level's stack (or the learner's own passing
// design for that level) and adds one new constraint. Numbers are tuned against
// simulateTopology() in src/lib/builderScore.ts; see builderScore.test.ts.

type Start = Pick<BuilderScenario, "startingNodes" | "startingEdges">;

const USERS = { id: "users", label: "Users", type: "client" as const, x: 0, y: 160 };
const LB = { id: "lb", label: "Load Balancer", type: "load_balancer" as const, x: 220, y: 160 };
const DB = { id: "db", label: "Postgres Primary", type: "database" as const, x: 700, y: 220 };
const server = (n: number, y: number) => ({
  id: `server-${n}`,
  label: `API Server ${n}`,
  type: "server" as const,
  x: 440,
  y,
});
const replica = (n: number, y: number) => ({
  id: `replica-${n}`,
  label: `Read Replica ${n}`,
  type: "replica" as const,
  x: 920,
  y,
});

function fleet(count: number) {
  const nodes = Array.from({ length: count }, (_, i) => server(i + 1, 40 + i * 110));
  return nodes;
}

function lbStack(serverCount: number, extras: Start["startingNodes"] = [], extraEdges: Start["startingEdges"] = []): Start {
  const servers = fleet(serverCount);
  return {
    startingNodes: [USERS, LB, ...servers, DB, ...extras],
    startingEdges: [
      { source: "users", target: "lb" },
      ...servers.map((s) => ({ source: "lb", target: s.id })),
      ...servers.map((s) => ({ source: s.id, target: "db" })),
      ...extraEdges,
    ],
  };
}

const TWO_REPLICAS = [replica(1, 120), replica(2, 320)];
const REPLICA_EDGES = [
  { source: "db", target: "replica-1" },
  { source: "db", target: "replica-2" },
];
const CACHE = { id: "cache", label: "Redis Cache", type: "cache" as const, x: 700, y: 40 };
const CDN = { id: "cdn", label: "Edge CDN", type: "cdn" as const, x: 0, y: 20 };

export const BUILDER_SCENARIOS: BuilderScenario[] = [
  {
    id: "boss-scale",
    patternId: "horizontal-scaling",
    title: "Launch Day Spike",
    userScale: "200k signups in one afternoon",
    trafficRps: 12000,
    trafficPattern: "Steady 12,000 req/s after a front-page launch",
    failureCondition: "One API server receives every request",
    objective: "Keep every API server below 60% CPU at 12,000 req/s",
    winCondition: "At least 2 servers share traffic, no node overloaded, score ≥ 70",
    readRatio: 0.9,
    cacheHitRate: 0.9,
    staticAssetShare: 0,
    globalUsers: false,
    slowDownstream: false,
    killOneServer: false,
    targets: { maxServerCpu: 60, minServers: 2 },
    requiredComponents: ["load_balancer", "database"],
    startingNodes: [USERS, { ...server(1, 160) }, DB],
    startingEdges: [
      { source: "users", target: "server-1" },
      { source: "server-1", target: "db" },
    ],
    explain: {
      question: "Your design passes. When would it still fail?",
      options: [
        {
          id: "e-db",
          label: "When traffic grows until the single database saturates",
          isCorrect: true,
          explanation: "More app servers mean more queries to the same database. Scaling one tier moves the bottleneck to the next.",
        },
        {
          id: "e-never",
          label: "Never; horizontal scaling removes all limits",
          isCorrect: false,
          explanation: "Every shared dependency still has a limit. Here, that is the database.",
        },
        {
          id: "e-lb",
          label: "When users log in from mobile",
          isCorrect: false,
          explanation: "The client type does not change how load is spread.",
        },
      ],
    },
    hints: [
      "Look at the CPU on each server. How is the traffic split between them?",
      "Extra servers only help if something spreads requests across them.",
      "Add a second API server and a load balancer between Users and the servers.",
    ],
    passThreshold: 70,
  },
  {
    id: "boss-lb",
    patternId: "load-balancing",
    title: "Server Down at Peak",
    userScale: "Same 12,000 req/s, and one server will crash",
    trafficRps: 12000,
    trafficPattern: "12,000 req/s while the last server in the fleet crashes",
    failureCondition: "The stress test kills one API server mid-spike",
    objective: "Keep surviving servers below 60% CPU after losing one",
    winCondition: "Surviving servers below 60% CPU, no node overloaded, score ≥ 70",
    readRatio: 0.9,
    cacheHitRate: 0.9,
    staticAssetShare: 0,
    globalUsers: false,
    slowDownstream: false,
    killOneServer: true,
    targets: { maxServerCpu: 60 },
    requiredComponents: ["load_balancer", "database"],
    inheritsFrom: "boss-scale",
    ...lbStack(2),
    explain: {
      question: "How does the load balancer know a server has crashed?",
      options: [
        {
          id: "e-health",
          label: "It sends regular health-check requests and removes servers that stop answering",
          isCorrect: true,
          explanation: "Health checks let the balancer take a dead server out of rotation within seconds.",
        },
        {
          id: "e-dns",
          label: "DNS tells it",
          isCorrect: false,
          explanation: "DNS does not track server health, and changes take minutes to spread.",
        },
        {
          id: "e-client",
          label: "Clients report errors to it",
          isCorrect: false,
          explanation: "Clients see errors, but the balancer cannot rely on them to detect failures.",
        },
      ],
    },
    hints: [
      "If one server disappears, who takes over its share of the traffic?",
      "Plan capacity for N+1: enough servers that losing one still leaves headroom.",
      "Add a third API server behind the load balancer.",
    ],
    passThreshold: 70,
  },
  {
    id: "boss-replicas",
    patternId: "read-replicas",
    title: "Feed Reads Flood the Database",
    userScale: "24,000 req/s of personalized feeds",
    trafficRps: 24000,
    trafficPattern: "95% reads; each feed is personalized, so a cache only hits 20%",
    failureCondition: "The primary database handles every read and write",
    objective: "Keep every database node below 70% CPU",
    winCondition: "All database nodes below 70% CPU, servers below 70%, score ≥ 70",
    readRatio: 0.95,
    cacheHitRate: 0.2,
    staticAssetShare: 0,
    globalUsers: false,
    slowDownstream: false,
    killOneServer: false,
    targets: { maxServerCpu: 70, maxDbCpu: 70 },
    requiredComponents: ["load_balancer", "database", "replica"],
    inheritsFrom: "boss-lb",
    ...lbStack(3),
    explain: {
      question: "A user posts and immediately reloads, but the post is missing. Why?",
      options: [
        {
          id: "e-lag",
          label: "The read went to a replica that has not received the write yet",
          isCorrect: true,
          explanation: "Asynchronous replication lags slightly. Read-your-own-writes routing fixes it for the author.",
        },
        {
          id: "e-lb",
          label: "The load balancer dropped the write",
          isCorrect: false,
          explanation: "The write succeeded on the primary; the replica just has not caught up.",
        },
        {
          id: "e-cache",
          label: "The CDN cached the old feed",
          isCorrect: false,
          explanation: "There is no CDN in this design. The lag is between primary and replica.",
        },
      ],
    },
    hints: [
      "Which node is red during the stress test? What kind of queries does it serve?",
      "95% of queries are reads. Could copies of the database serve them?",
      "Add read replicas connected to the primary. One may not be enough.",
    ],
    passThreshold: 70,
  },
  {
    id: "boss-cache",
    patternId: "caching",
    title: "Celebrity Post",
    userScale: "30,000 req/s for the same few posts",
    trafficRps: 30000,
    trafficPattern: "95% reads of a handful of hot posts; a cache hits 95%",
    failureCondition: "Replicas read identical rows from disk over and over",
    objective: "Database nodes below 30% CPU and p95 latency below 80ms",
    winCondition: "Cache connected, DB nodes < 30%, servers < 75%, latency < 80ms, score ≥ 70",
    readRatio: 0.95,
    cacheHitRate: 0.95,
    staticAssetShare: 0,
    globalUsers: false,
    slowDownstream: false,
    killOneServer: false,
    targets: { maxServerCpu: 75, maxDbCpu: 30, maxLatencyMs: 80 },
    requiredComponents: ["load_balancer", "database", "cache"],
    inheritsFrom: "boss-replicas",
    ...lbStack(3, TWO_REPLICAS, REPLICA_EDGES),
    explain: {
      question: "The hot post's cache entry expires and 10,000 requests miss at once. What protects the database?",
      options: [
        {
          id: "e-lock",
          label: "Let one request rebuild the entry while the others wait or get the old value",
          isCorrect: true,
          explanation: "A lock (single-flight) or early refresh turns 10,000 database queries into one.",
        },
        {
          id: "e-nottl",
          label: "Never expire cache entries",
          isCorrect: false,
          explanation: "Entries would go stale forever and memory would fill up.",
        },
        {
          id: "e-timeout",
          label: "Raise the database timeout",
          isCorrect: false,
          explanation: "Longer timeouts let the pile-up grow.",
        },
      ],
    },
    hints: [
      "Most reads ask for the same few rows. Do they need to reach a disk each time?",
      "An in-memory layer can answer repeated reads before the database sees them. Also check your server CPU.",
      "Add a cache connected to the API servers, and add a fourth server if CPU is above target.",
    ],
    passThreshold: 70,
  },
  {
    id: "boss-cdn",
    patternId: "cdn-edge",
    title: "Global Launch",
    userScale: "30,000 req/s from four continents",
    trafficRps: 30000,
    trafficPattern: "Half the traffic is images and scripts; users are worldwide",
    failureCondition: "Every asset crosses an ocean from one region",
    objective: "p95 latency below 150ms and servers below 60% CPU",
    winCondition: "CDN connected, latency < 150ms, servers < 60%, score ≥ 70",
    readRatio: 0.95,
    cacheHitRate: 0.95,
    staticAssetShare: 0.5,
    globalUsers: true,
    slowDownstream: false,
    killOneServer: false,
    targets: { maxServerCpu: 60, maxLatencyMs: 150 },
    requiredComponents: ["load_balancer", "database", "cache", "cdn"],
    inheritsFrom: "boss-cache",
    ...lbStack(
      4,
      [CACHE, ...TWO_REPLICAS],
      [
        ...REPLICA_EDGES,
        ...[1, 2, 3, 4].map((n) => ({ source: `server-${n}`, target: "cache" })),
      ]
    ),
    explain: {
      question: "You deploy a fix to app.js, but users still get the old file from the edge. What prevents this?",
      options: [
        {
          id: "e-hash",
          label: "Put a content hash in asset filenames so each build has new URLs",
          isCorrect: true,
          explanation: "New content, new URL: edges fetch it immediately and old files can stay cached.",
        },
        {
          id: "e-off",
          label: "Turn off CDN caching for scripts",
          isCorrect: false,
          explanation: "Every script request would return to the origin, undoing the fix.",
        },
        {
          id: "e-refresh",
          label: "Ask users to hard-refresh",
          isCorrect: false,
          explanation: "You cannot depend on users clearing caches.",
        },
      ],
    },
    hints: [
      "Latency is high even though servers are not overloaded. Where is the time going?",
      "Static files could be served from somewhere closer to users.",
      "Add a CDN and connect Users to it.",
    ],
    passThreshold: 70,
  },
  {
    id: "boss-queue",
    patternId: "async-queues",
    title: "Flash Sale Checkout",
    userScale: "30,000 req/s during a flash sale",
    trafficRps: 30000,
    trafficPattern: "Every checkout calls a slow payment API and sends an email",
    failureCondition: "Request threads wait on slow third-party calls",
    objective: "p95 latency below 200ms and servers below 60% CPU",
    winCondition: "Queue connected, latency < 200ms, servers < 60%, score ≥ 70",
    readRatio: 0.95,
    cacheHitRate: 0.95,
    staticAssetShare: 0.5,
    globalUsers: true,
    slowDownstream: true,
    killOneServer: false,
    targets: { maxServerCpu: 60, maxLatencyMs: 200 },
    requiredComponents: ["load_balancer", "database", "cache", "cdn", "queue"],
    inheritsFrom: "boss-cdn",
    ...lbStack(
      4,
      [CACHE, CDN, ...TWO_REPLICAS],
      [
        { source: "users", target: "cdn" },
        ...REPLICA_EDGES,
        ...[1, 2, 3, 4].map((n) => ({ source: `server-${n}`, target: "cache" })),
      ]
    ),
    explain: {
      question: "A worker crashes after charging a card but before acknowledging the message. What stops a double charge on redelivery?",
      options: [
        {
          id: "e-idem",
          label: "An idempotency key, so the same charge request is only applied once",
          isCorrect: true,
          explanation: "Queues deliver at least once; idempotent handlers make retries safe.",
        },
        {
          id: "e-noretry",
          label: "Disable redelivery",
          isCorrect: false,
          explanation: "Then crashed work is lost entirely.",
        },
        {
          id: "e-sync",
          label: "Charge the card inside the web request instead",
          isCorrect: false,
          explanation: "That brings back blocked threads and still needs retries.",
        },
      ],
    },
    hints: [
      "Servers are busy, but mostly waiting. What are they waiting for?",
      "Work the user does not need to wait for can happen after the response.",
      "Add a message queue connected to the API servers.",
    ],
    passThreshold: 70,
  },
];

export function getBuilderScenarioById(id: string): BuilderScenario | undefined {
  return BUILDER_SCENARIOS.find((s) => s.id === id);
}

export function getAllBuilderScenarios(): BuilderScenario[] {
  return BUILDER_SCENARIOS;
}
