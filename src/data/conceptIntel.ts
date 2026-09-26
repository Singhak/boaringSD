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
        "Imagine a grocery store on Sunday evening. 500 customers are waiting in line at Cashier 1. If you replace Cashier 1 with the world's fastest human (Vertical Scaling), they will still eventually collapse under 500 people. Instead, the manager opens Cashier 2 and Cashier 3 (Horizontal Scaling). Each line is now about a third as long, and nobody had to hire a superhuman. (It only works because any cashier can scan any cart. If every customer had to see Cashier 1 personally, the new lanes would sit empty.)",
    },
    visualFlow: `[ 100,000 req/s ]
       │
  ┌────┴────┐
  ▼         ▼
[Server 1] [Server 2]  (Traffic splits 50/50: CPU drops from 98% -> 45%)`,
    whyItWorks:
      "Stateless web/API servers can execute identical logic independently. By provisioning identical nodes behind a shared ingress, capacity grows roughly linearly with server count, but only while the servers stay stateless and a shared dependency (database, cache, a downstream API) is not the bottleneck. Once the DB saturates, extra app servers just add more connections to it.",
    tradeoffs: {
      pros: [
        "Near-linear compute scaling past a single machine's hardware ceiling (until a shared dependency saturates)",
        "High availability: if 1 server crashes, remaining servers keep serving",
        "Cost efficiency: many commodity instances (e.g. c6g.xlarge) usually cost less than the largest single machines, and can scale down off-peak",
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
        "Reduces traffic skew across servers (though it cannot fix a hot key inside the data tier)",
        "Active health checks pull failing servers out of rotation after a few failed probes (typically seconds)",
        "SSL/TLS termination offloads cryptographic compute from application servers",
      ],
      cons: [
        "Single Point of Failure (SPOF) unless deployed redundantly (HA pair or a managed multi-AZ LB)",
        "Adds an extra network hop (~0.5-2ms in the same datacenter)",
        "Sticky sessions (if needed) complicate even distribution",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Whenever scaling beyond a single server, to spread load evenly and route around a failed node. Expect a short failover window (a few seconds while health checks notice) where some in-flight requests fail and need a client retry.",
      sampleDialogue:
        "'We place a redundant Layer 7 Application Load Balancer in front of our backend cluster. We use a round-robin or least-outstanding-requests algorithm paired with deep HTTP health probes, so an unhealthy pod is evicted after 2 failed checks, roughly 10 seconds at a 5-second interval. Clients retry idempotent requests to cover that window.'",
    },
  },

  caching: {
    id: "caching",
    name: "In-Memory Caching (Cache-Aside)",
    category: "caching",
    oneLiner: "Keeping precomputed or frequently read results in an in-memory store so most requests skip the database query entirely.",
    eli5Analogy: {
      title: "The Sticky Note vs The Basement Filing Cabinet",
      story:
        "Your boss asks you for the office Wi-Fi password 50 times an hour. Every time, you walk down 3 flights of stairs, wait in line behind everyone else who needs the filing cabinet, and dig through the folders (Database Query). You are exhausted, and so is the line. Instead, you write the password on a sticky note pasted on your monitor (RAM Cache). Now you answer in 1 second. You only visit the basement when the password changes.",
    },
    visualFlow: `[ App Server ] ──1. Check Cache──► [ Redis RAM Cache ]
       │                                  │
       │ (Cache Hit: 95% ~0.5ms) ◄────────┘
       │
       └──2. On Cache Miss (5%) ────────► [ Postgres DB ] ──► Update Cache`,
    whyItWorks:
      "Ballparks: RAM access ~100 ns, NVMe SSD random read ~100 µs, HDD seek ~5-10 ms. But a busy database already serves hot rows from its in-memory buffer pool, and a Redis GET including the network round-trip costs ~0.2-1 ms. So the cache's real win is not 'RAM vs disk': it skips the query work itself (parsing, planning, joins, locks, holding a scarce DB connection) and removes contention from the primary. That shields the relational database from thousands of redundant identical queries.",
    tradeoffs: {
      pros: [
        "Dramatically slashes database read load (often 80-95% at a high hit ratio)",
        "Low latency on hits (~0.2-1ms per Redis round-trip)",
        "Absorbs traffic spikes on popular items, as long as hot keys stay cached",
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
        "'Because our user timeline has a 99:1 read-to-write ratio, we implement a Cache-Aside pattern using Redis Cluster. Hot user feeds are cached with a 15-minute TTL. On user publish, we delete the specific cache key so the next read refills it; a short TTL bounds staleness if an invalidation is ever lost.'",
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
             │  (Only 1 request per server passes through!)
             ▼
   [ Postgres Database ] ──► Returns data once ──► Broadcast to all 5,000 callers`,
    whyItWorks:
      "When a hot cache key expires, thousands of concurrent threads simultaneously experience a cache miss and rush the DB (Thundering Herd). Singleflight uses an in-process mutex and promise/channel map so, per key, only the first request on each server queries the DB; the others on that server wait and share the resolved result. With 50 app servers that is at most ~50 DB queries instead of 5,000.",
    tradeoffs: {
      pros: [
        "Caps a stampede at one query per key per server, without pre-warming",
        "No added infrastructure for the in-process version (runs in app memory)",
        "Protects SQL databases from sudden connection exhaustion when a hot key expires",
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
        "'To defend against cache stampedes on viral breaking news stories, we implement Go singleflight (or Redis mutex locks). When a key's TTL expires under 100k QPS, one request per app instance refreshes it from Postgres while the rest await that in-flight promise. If we need a single refresh fleet-wide, we add a short-lived Redis lock with a timeout.'",
    },
  },

  "read-replicas": {
    id: "read-replicas",
    name: "Database Read Replicas",
    category: "database",
    oneLiner: "Read-only database copies kept in sync (usually asynchronously) from the primary writer.",
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
      "Many production workloads are 80-95% reads. Offloading `SELECT` queries to read-only replica instances frees the primary's CPU, connections, and buffer pool for writes, locks, and transactions.",
    tradeoffs: {
      pros: [
        "Scales read throughput horizontally across multiple instances",
        "High availability: a replica can be promoted if the primary dies. Expect a failover window of seconds to a minute, and with async replication any writes not yet replicated can be lost",
        "Isolates heavy analytical reports from production write paths",
      ],
      cons: [
        "Replication Lag: Replicas update asynchronously, so reads may be milliseconds or seconds stale",
        "Read-after-write inconsistency: a user may not see their own write if the read hits a lagging replica",
        "Does NOT scale write throughput (all writes still bottleneck on 1 master)",
      ],
    },
    interviewPlaybook: {
      whenToUse: "When the primary's CPU, connections, or I/O are saturated by read queries that can tolerate a little replication lag.",
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
        "If a wire in your kitchen starts sparking and drawing 100 amps of dangerous current, your house does not keep feeding it electricity until the whole building catches fire. The breaker trips open within a moment, cutting power to that single room so the rest of your house stays safe and brightly lit.",
    },
    visualFlow: `Normal:   [ App ] ─── CLOSED ───► [ Payment Gateway (Healthy) ]
Failing:  [ App ] ─── OPEN ─────► Returns Fast Fallback (<1ms, stops retry storm)
Probing:  [ App ] ─── HALF-OPEN ─► Sends 1 Canary Probe to check if recovered`,
    whyItWorks:
      "When a third-party service slows down from 50ms to 10,000ms, thousands of caller threads hang waiting for timeouts, exhausting thread pools and causing cascading system collapse. A circuit breaker trips OPEN once failures or slow calls cross a threshold, returning immediate fallback errors so caller threads are freed instead of piling up.",
    tradeoffs: {
      pros: [
        "Contains cascading failure and thread starvation (paired with timeouts and bounded pools)",
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
