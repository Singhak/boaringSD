import { TradeoffCardOption } from "@/types";

export interface PatternTradeoffSet {
  patternId: string;
  incidentTitle: string;
  primaryConstraintSummary: string;
  recommendedOptionId: string;
  options: TradeoffCardOption[];
}

export const PATTERN_TRADEOFFS: Record<string, PatternTradeoffSet> = {
  "caching": {
    patternId: "caching",
    incidentTitle: "Database Connection Exhaustion Under Read Spike",
    primaryConstraintSummary: "Read/Write ratio is 95:5. 100,000 queries/sec are saturating PostgreSQL connection limits. P99 latency is 3,400ms.",
    recommendedOptionId: "opt-cache-aside",
    options: [
      {
        id: "opt-cache-aside",
        title: "Deploy Redis Cluster (Cache-Aside Pattern)",
        tagline: "In-memory caching of hot query results with TTLs and LRU eviction.",
        patternId: "caching",
        costEstimateDeltaUsd: 450,
        latencyProfileMs: -180,
        operationalComplexity: 2,
        consistencyGuarantee: "Eventual Consistency",
        durabilityTier: "Ephemeral (RAM)",
        pros: [
          "~0.2-1ms Redis round-trip for the ~95% of reads that hit the cache",
          "Shields the primary database from connection exhaustion by skipping repeated queries",
          "Automatic LRU eviction keeps memory bounded",
        ],
        cons: [
          "Potential cache stampede (thundering herd) on key expiration",
          "Eventual consistency: stale reads possible during invalidation lag",
        ],
        isRecommendedForConstraints: true,
        tradeoffDefenseQuestion: {
          question: "Why is Cache-Aside preferable to adding Read Replicas for this specific 95% read-heavy spike?",
          options: [
            {
              id: "tq-1",
              text: "A cache hit is a sub-ms GET that skips Postgres; replicas still run every SELECT in full, each under its own connection cap.",
              isCorrect: true,
              feedback: "Spot on! Both options read hot rows from memory (Postgres keeps them in its buffer pool). The difference is work per read: a Redis GET is far cheaper than a full SQL query, so one cache node absorbs many times the reads of one replica for the money.",
            },
            {
              id: "tq-2",
              text: "Cache-aside with delete-on-write keeps Redis strongly consistent with Postgres, whereas async replicas always lag the primary.",
              isCorrect: false,
              feedback: "Backwards. Cache-aside is eventually consistent even with delete-on-write: between a write and the key's invalidation (or TTL expiry), and in read-miss/delete races, readers can see stale values. Replicas lag too; neither option is strongly consistent here.",
            },
            {
              id: "tq-3",
              text: "Replicas would need synchronous_commit = remote_apply to avoid stale reads, roughly doubling write latency on the primary.",
              isCorrect: false,
              feedback: "remote_apply is one way to get read-your-writes from replicas, but cache-aside is eventually consistent too, so staleness doesn't favor the cache. The real argument is cost per read: replicas run every query in full, whereas a cache hit skips the query entirely.",
            },
          ],
        },
        stressTest10xQuestion: {
          question: "When traffic surges 10x from 100k to 1,000,000 RPS, what is the primary failure mode of this Redis cache?",
          options: [
            {
              id: "sq-1",
              text: "Cache stampede: a hot key expires and thousands of concurrent misses hit the DB at once. Fix: singleflight or early refresh.",
              isCorrect: true,
              feedback: "Senior Architect answer! Thundering herd is the classic high-scale cache collapse.",
            },
            {
              id: "sq-2",
              text: "With appendfsync always, the AOF is fsynced on every command, so at 1M requests/sec disk IOPS becomes Redis's ceiling.",
              isCorrect: false,
              feedback: "The AOF logs write commands only, never GETs, so reads never trigger an fsync. At 1M RPS of mostly reads, the pressure is on hot keys and on the DB when they expire, not on Redis's disk.",
            },
            {
              id: "sq-3",
              text: "Once maxmemory is reached, allkeys-lru eviction thrashes, dropping the hottest keys and turning hits into DB misses.",
              isCorrect: false,
              feedback: "LRU evicts the least recently used keys, so hot keys are the last to go. The dangerous moment is when a hot key expires by TTL and every request misses at once.",
            },
          ],
        },
      },
      {
        id: "opt-read-replicas",
        title: "Provision 3x PostgreSQL Read Replicas",
        tagline: "Horizontal database read scaling with streaming replication.",
        patternId: "read-replicas",
        costEstimateDeltaUsd: 1400,
        latencyProfileMs: -90,
        operationalComplexity: 3,
        consistencyGuarantee: "Eventual Consistency",
        durabilityTier: "Durable SSD",
        pros: [
          "Full SQL query expressiveness without data denormalization",
          "Durable, replicated copies on disk (and a promotion candidate for failover)",
          "Simple read/write connection string splitting",
        ],
        cons: [
          "~3x higher cloud hosting cost than a Redis cluster",
          "Async replication lag: users can read stale data right after writing unless reads-after-write go to the primary",
          "Every read still runs a full SQL query, and each replica has its own max_connections cap",
        ],
        isRecommendedForConstraints: false,
        tradeoffDefenseQuestion: {
          question: "What is the primary operational disadvantage of Read Replicas vs In-Memory Caching for read-heavy key-value queries?",
          options: [
            {
              id: "tq-rep-1",
              text: "Each replica runs the full query for every read, so throughput per dollar is far lower ($1,400 vs $450).",
              isCorrect: true,
              feedback: "Correct! Replicas are full database instances: every read pays for parsing, planning, execution and a pooled connection, whereas a cache hit is a single key lookup.",
            },
            {
              id: "tq-rep-2",
              text: "Replicas must take row locks on the primary while serving each read, so reads still contend with writes.",
              isCorrect: false,
              feedback: "Replicas serve reads from their own copy and never take locks on the primary. Their downsides are cost per read and replication lag, not lock contention.",
            },
          ],
        },
        stressTest10xQuestion: {
          question: "What breaks first on read replicas under 10x load?",
          options: [
            {
              id: "sq-rep-1",
              text: "Replicas saturate CPU and connections, and WAL replay falls behind, so lag grows.",
              isCorrect: true,
              feedback: "Accurate! 10x traffic means 10x reads on each replica and 10x writes to replay. A busy replica replays WAL more slowly (and long queries can conflict with replay), so lag grows from milliseconds to seconds or more.",
            },
            {
              id: "sq-rep-2",
              text: "The primary's disk fills with WAL segments held back for the three replicas, halting writes.",
              isCorrect: false,
              feedback: "WAL retention only balloons when a replica disconnects or a replication slot is abandoned. Under load, connected replicas keep consuming WAL; the first thing to break is replica CPU and connections, then lag.",
            },
          ],
        },
      },
      {
        id: "opt-scale-compute",
        title: "Scale Application Servers from 2 to 10 Nodes",
        tagline: "Horizontal compute expansion without touching the data tier.",
        patternId: "horizontal-scaling",
        costEstimateDeltaUsd: 900,
        latencyProfileMs: +15,
        operationalComplexity: 1,
        consistencyGuarantee: "Strict ACID",
        durabilityTier: "Durable SSD",
        pros: [
          "Zero code changes required",
          "Fast autoscaling group provisioning",
        ],
        cons: [
          "Ineffective here: the DB is the bottleneck, and 5x the servers means up to 5x the pooled DB connections",
          "Makes database connection starvation worse",
        ],
        isRecommendedForConstraints: false,
        tradeoffDefenseQuestion: {
          question: "Why does adding more web servers make a database bottleneck WORSE instead of better?",
          options: [
            {
              id: "tq-sc-1",
              text: "Each server brings its own DB pool, so more servers push Postgres past max_connections and into contention.",
              isCorrect: true,
              feedback: "Fundamental systems lesson! Postgres runs one process per connection, so thousands of connections add memory and context-switch overhead. Scaling compute against a saturated database is like a DDoS on your own storage tier.",
            },
            {
              id: "tq-sc-2",
              text: "New nodes boot with cold local caches, so every request they serve misses and goes straight to the DB until they warm up.",
              isCorrect: false,
              feedback: "Cold caches cause a short warm-up blip, not a lasting slowdown. The lasting harm is connections: the app tier was never the bottleneck, and every extra server adds another pool of connections to the same saturated database.",
            },
          ],
        },
        stressTest10xQuestion: {
          question: "What metric immediately spikes when scaling compute against a bottlenecked database?",
          options: [
            {
              id: "sq-sc-1",
              text: "Active connection count and Lock Wait Time (pg_stat_activity).",
              isCorrect: true,
              feedback: "Exactly right! Connection count climbs toward max_connections, queries queue on locks and CPU, and per-process context-switch overhead slows the DB to a crawl.",
            },
            {
              id: "sq-sc-2",
              text: "App-server CPU, since each node now spends longer waiting on slow queries.",
              isCorrect: false,
              feedback: "Waiting on I/O doesn't burn CPU, and each app node now gets a smaller share of traffic, so its CPU falls. The pain shows up downstream, as DB connections and lock waits.",
            },
          ],
        },
      },
    ],
  },
  "load-balancing": {
    patternId: "load-balancing",
    incidentTitle: "Ingress Bottleneck & Single Point of Failure Outage",
    primaryConstraintSummary: "Direct client traffic to a single IP address is saturating CPU at 99%. Server crash causes 100% outage.",
    recommendedOptionId: "opt-l7-lb",
    options: [
      {
        id: "opt-l7-lb",
        title: "Layer 7 Reverse Proxy Load Balancer",
        tagline: "Content-aware HTTP/HTTPS reverse proxy with SSL termination and round-robin health checking.",
        patternId: "load-balancing",
        costEstimateDeltaUsd: 150,
        latencyProfileMs: -50,
        operationalComplexity: 2,
        consistencyGuarantee: "Not applicable (stateless)",
        durabilityTier: "Not applicable (stateless)",
        pros: [
          "Evenly distributes traffic across stateless worker instances",
          "Health checks pull dead nodes from rotation after a few failed probes (seconds, depending on interval)",
          "Terminates TLS/SSL centrally to offload backend CPU",
        ],
        cons: [
          "Adds an extra proxy hop (~0.5-2ms in the same datacenter)",
          "The load balancer itself needs redundancy (HA pair or managed multi-AZ LB) or it becomes the new SPOF",
        ],
        isRecommendedForConstraints: true,
        tradeoffDefenseQuestion: {
          question: "Why terminate SSL at the Load Balancer rather than on individual application servers?",
          options: [
            {
              id: "tq-lb-1",
              text: "TLS handshakes are CPU-heavy asymmetric crypto; offloading them frees app CPU and centralizes certificate rotation.",
              isCorrect: true,
              feedback: "Standard infrastructure architecture practice!",
            },
            {
              id: "tq-lb-2",
              text: "Terminating at the LB keeps traffic encrypted end-to-end, from the browser all the way into each app server's process.",
              isCorrect: false,
              feedback: "The opposite: after termination, the LB-to-backend hop is plaintext unless you re-encrypt it (TLS or mTLS to the backends). The reasons to terminate at the LB are CPU offload and one place to manage certificates.",
            },
          ],
        },
        stressTest10xQuestion: {
          question: "At 10x scale (500k RPS), what becomes the bottleneck of a single Layer 7 Load Balancer?",
          options: [
            {
              id: "sq-lb-1",
              text: "One box's TLS CPU, file descriptors and ephemeral ports; scale out L7 proxies behind an L4 tier (ECMP, Maglev, Anycast).",
              isCorrect: true,
              feedback: "Staff-level networking insight! An L4 layer spreads connections across many L7 proxies, and keep-alive pooling to backends cuts port churn and TIME_WAIT buildup.",
            },
            {
              id: "sq-lb-2",
              text: "Least-connections picking needs a lock over the shared backend table, so selection latency climbs as backends are added.",
              isCorrect: false,
              feedback: "Choosing a backend is O(1) for round-robin and cheap for least-connections (per-worker counters or power-of-two-choices avoid a global lock). The per-request cost lives in TLS handshakes and connection handling, not the balancing algorithm.",
            },
          ],
        },
      },
    ],
  },
};

export function getTradeoffsForPattern(patternId: string): PatternTradeoffSet | undefined {
  return PATTERN_TRADEOFFS[patternId];
}
