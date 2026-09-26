import { ConceptIntel } from "@/types";

export const CONCEPT_INTEL_REGISTRY: Record<string, ConceptIntel> = {
  "horizontal-scaling": {
    id: "horizontal-scaling",
    name: "Horizontal Scaling (Scale Out)",
    category: "scaling",
    oneLiner: "Adding more machines in parallel instead of buying one giant expensive server.",
    eli5Analogy: {
      title: "The Supermarket Cashier Analogy",
      story:
        "Imagine a grocery store on Sunday evening. 500 customers are waiting in line at Cashier 1. If you replace Cashier 1 with the world's fastest human (Vertical Scaling), they will still eventually collapse under 500 people. Instead, the manager opens Cashier 2 and Cashier 3 (Horizontal Scaling). The line instantly cuts in three without hiring a superhuman.",
    },
    visualFlow: `[ 100,000 req/s ]
       │
  ┌────┴────┐
  ▼         ▼
[Server 1] [Server 2]  (Traffic splits 50/50: CPU drops from 98% -> 45%)`,
    whyItWorks:
      "Stateless web/API servers can execute identical logic independently. By provisioning identical nodes behind a shared ingress, capacity scales linearly with server count.",
    tradeoffs: {
      pros: [
        "Linear compute scaling without hardware ceiling",
        "High availability: if 1 server crashes, remaining servers keep serving",
        "Cost efficiency: commodity cloud instances (e.g. c6g.xlarge) cost far less than mainframe scale",
      ],
      cons: [
        "Servers MUST be stateless (sessions/state must live in Redis or DB)",
        "Requires a load balancer to distribute traffic",
        "Downstream database becomes the next bottleneck",
      ],
    },
    interviewPlaybook: {
      whenToUse: "When stateless API or web server CPU is saturated (>80%) under traffic spikes.",
      sampleDialogue:
        "'Because our API servers are stateless, our first line of defense is horizontal autoscaling. We provision additional container replicas across availability zones, capping each node at 60% CPU to withstand sudden bursts.'",
    },
  },

  "load-balancing": {
    id: "load-balancing",
    name: "Load Balancing (Reverse Proxy)",
    category: "networking",
    oneLiner: "The traffic conductor directing incoming requests evenly across healthy servers.",
    eli5Analogy: {
      title: "The Restaurant Maitre D' Analogy",
      story:
        "Imagine a restaurant with 3 waiters. If all 100 guests rush through the front door and crowd Waiter 1 while Waiters 2 and 3 sit reading magazines, the kitchen melts down. The restaurant hires a Maitre D' at the door (Load Balancer) who greets each incoming group and assigns them sequentially (Round Robin) or to the waiter with the fewest tables (Least Connections).",
    },
    visualFlow: `[ Users ] ──► [ Load Balancer (Reverse Proxy) ]
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    [Server 1]       [Server 2]       [Server 3]
     (33.3%)          (33.3%)          (33.3%)`,
    whyItWorks:
      "A reverse proxy sits in front of the server fleet, terminating client TLS connections and forwarding HTTP requests to backend targets according to distribution algorithms and active health check probes.",
    tradeoffs: {
      pros: [
        "Eliminates traffic skew and hot spots",
        "Active health checks automatically pull failing/crashed servers out of rotation",
        "SSL/TLS termination offloads cryptographic compute from application servers",
      ],
      cons: [
        "Single Point of Failure (SPOF) if not deployed in active-passive HA pair",
        "Adds ~1-3ms network hop latency",
        "Sticky sessions (if needed) complicate even distribution",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Whenever scaling beyond a single server to guarantee uniform utilization and zero-downtime failover.",
      sampleDialogue:
        "'We place a redundant Layer 7 Application Load Balancer in front of our backend cluster. We use a round-robin or least-outstanding-requests algorithm paired with deep HTTP health probes to immediately evict unhealthy pods within 2 failed heartbeats.'",
    },
  },

  caching: {
    id: "caching",
    name: "In-Memory Caching (Cache-Aside)",
    category: "caching",
    oneLiner: "Storing precomputed or frequent database reads in high-speed RAM for sub-millisecond lookups.",
    eli5Analogy: {
      title: "The Sticky Note vs The Basement Filing Cabinet",
      story:
        "Your boss asks you for the office Wi-Fi password 50 times an hour. Every time, you walk down 3 flights of stairs to unlock a metal filing cabinet in the dark basement (Disk Database). You are exhausted. Instead, you write the password on a sticky note pasted on your monitor (RAM Cache). Now you answer in 1 second. You only visit the basement when the password changes.",
    },
    visualFlow: `[ App Server ] ──1. Check Cache──► [ Redis RAM Cache ]
       │                                  │
       │ (Cache Hit: 95% < 2ms) ◄─────────┘
       │
       └──2. On Cache Miss (5%) ────────► [ Postgres DB ] ──► Update Cache`,
    whyItWorks:
      "RAM memory access runs at ~100 nanoseconds, compared to disk SSD I/O running at ~1-10 milliseconds (10,000x slower). Caching reads shields the relational database from redundant queries.",
    tradeoffs: {
      pros: [
        "Dramatically slashes database read load (often 80-95% reduction)",
        "Ultra-low latency (<2ms response times)",
        "Handles viral traffic spikes on popular items seamlessly",
      ],
      cons: [
        "Cache invalidation is notoriously tricky (risk of serving stale data)",
        "Vulnerable to Cache Stampedes / Thundering Herd when hot keys expire",
        "RAM cost is significantly higher per gigabyte than SSD storage",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Read-heavy workloads (>80% reads) where data changes infrequently or tolerates slight staleness.",
      sampleDialogue:
        "'Because our user timeline has a 99:1 read-to-write ratio, we implement a Cache-Aside pattern using Redis Cluster. Hot user feeds are cached with a 15-minute TTL. On user publish, we invalidate the specific cache key to guarantee near-instant freshness.'",
    },
  },

  singleflight: {
    id: "singleflight",
    name: "Singleflight (Request Coalescing)",
    category: "caching",
    oneLiner: "Merging 1,000 concurrent duplicate requests for the same missing key into one single database query.",
    eli5Analogy: {
      title: "The Office Carpool Analogy",
      story:
        "100 coworkers at your office all suddenly crave coffee at 9:00 AM. If all 100 people get in their own cars and drive to Starbucks, the drive-thru lane is completely paralyzed (Cache Stampede). With Singleflight, 1 person volunteers to drive, takes everyone's order, buys the coffee once, and shares the result with all 99 waiting coworkers when they return.",
    },
    visualFlow: `[ 5,000 Requests for Key "post:999" ]
             │
             ▼
   [ Singleflight Barrier ]
             │  (Only 1 request passes through!)
             ▼
   [ Postgres Database ] ──► Returns data once ──► Broadcast to all 5,000 callers`,
    whyItWorks:
      "When a hot cache key expires, thousands of concurrent threads simultaneously experience a cache miss and rush the DB (Thundering Herd). Singleflight uses an in-process mutex and promise/channel map so only the first request queries the DB; the other 4,999 wait and share the resolved result.",
    tradeoffs: {
      pros: [
        "Completely prevents cache stampedes without pre-warming",
        "Zero added cloud infrastructure (runs in app process memory)",
        "Protects SQL databases from instant connection exhaustion during key eviction",
      ],
      cons: [
        "Only coalesces requests within the same server container (unless paired with distributed mutex)",
        "If the single database query hangs, all waiting client requests hang together",
        "Requires timeout guards to avoid thread starvation",
      ],
    },
    interviewPlaybook: {
      whenToUse: "High-concurrency systems vulnerable to hot-key expiration (e.g. celebrity tweets, breaking news, flash sales).",
      sampleDialogue:
        "'To defend against cache stampedes on viral breaking news stories, we implement Go singleflight (or Redis mutex locks). When key TTL expires under 100k QPS, exactly one worker refreshes the cache from Postgres while all other requests await that single flight promise.'",
    },
  },

  "read-replicas": {
    id: "read-replicas",
    name: "Database Read Replicas",
    category: "database",
    oneLiner: "Dedicated read-only database copies synchronized asynchronously from the primary writer.",
    eli5Analogy: {
      title: "The Library Reference Desk Analogy",
      story:
        "A university has only 1 master copy of an ancient textbook locked in the head librarian's office. 1,000 students want to read it before tomorrow's exam, while the professor is making corrections with a pen. If all 1,000 students wait at the professor's desk, nobody studies. The library photocopies 5 identical reading desk copies (Read Replicas). Students read the copies, while the professor updates only the master.",
    },
    visualFlow: `[ Writes / Updates ] ──► [ Primary DB (Master) ]
                               │
                               │ (Async Replication Stream)
                               ▼
[ Reads (90%) ] ───────► [ Read Replica 1 ] & [ Read Replica 2 ]`,
    whyItWorks:
      "Most production workloads are 80-95% reads. Offloading `SELECT` queries to read-only replica instances frees the primary master database to handle atomic writes, locks, and transactions without disk I/O saturation.",
    tradeoffs: {
      pros: [
        "Scales read throughput horizontally across multiple instances",
        "High availability: a healthy replica can be promoted to primary if master dies",
        "Isolates heavy analytical reports from production write paths",
      ],
      cons: [
        "Replication Lag: Replicas update asynchronously, so reads may be milliseconds or seconds stale",
        "Risk of dirty reads / read-after-write inconsistency",
        "Does NOT scale write throughput (all writes still bottleneck on 1 master)",
      ],
    },
    interviewPlaybook: {
      whenToUse: "When database CPU or disk IOPS is saturated by read queries on a write-capable relational database.",
      sampleDialogue:
        "'We configure master-replica replication with Amazon Aurora or PostgreSQL. All mutations hit the writer primary, while our API router sends read queries across a cluster of 3 read replicas with sticky read-your-own-writes session routing for active authors.'",
    },
  },

  "circuit-breaker": {
    id: "circuit-breaker",
    name: "Circuit Breaker Pattern",
    category: "resilience",
    oneLiner: "Failing fast to stop a struggling downstream dependency from crashing your entire platform.",
    eli5Analogy: {
      title: "The Electrical Fuse Box Analogy",
      story:
        "If a wire in your kitchen starts sparking and drawing 100 amps of dangerous current, your house does not keep feeding it electricity until the whole building catches fire. The electrical fuse trips open immediately, cutting power to that single room so the rest of your house stays safe and brightly lit.",
    },
    visualFlow: `Normal:   [ App ] ─── CLOSED ───► [ Payment Gateway (Healthy) ]
Failing:  [ App ] ─── OPEN ─────► Returns Fast Fallback (Zero delay, stops retry storm)
Probing:  [ App ] ─── HALF-OPEN ─► Sends 1 Canary Probe to check if recovered`,
    whyItWorks:
      "When a third-party service slows down from 50ms to 10,000ms, thousands of caller threads hang waiting for timeouts, exhausting thread pools and causing cascading system collapse. A circuit breaker trips OPEN after N failures, returning immediate fallback errors and preventing resource exhaustion.",
    tradeoffs: {
      pros: [
        "Eliminates cascading failure and thread starvation across microservices",
        "Provides predictable fallback user experiences (e.g. cached recommendations)",
        "Gives struggling downstream services breathing room to recover",
      ],
      cons: [
        "Requires engineering fallback logic for every degraded path",
        "Tuning failure thresholds and half-open timeouts requires operational care",
        "Users experience degraded functionality while circuit is open",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Any synchronous inter-service communication or third-party API integration (e.g. Stripe, Twilio, Shipping APIs).",
      sampleDialogue:
        "'We wrap all external vendor APIs in Resilience4j / Envoy circuit breakers. If error rates exceed 30% over a 10-second window, the circuit trips OPEN, failing fast in <1ms and serving fallback recommendations while protecting our worker pools.'",
    },
  },
};

export function getConceptIntel(id: string): ConceptIntel | undefined {
  return CONCEPT_INTEL_REGISTRY[id];
}
