import type { ReasoningPrompt } from "@/lib/grading/types";

/**
 * "Defend your call" chat pings shown after a War Room fix or an interview.
 * Each answer is ≤ 280 characters and graded against a small rubric.
 */
export const REASONING_PROMPTS: ReasoningPrompt[] = [
  // ── Horizontal scaling ────────────────────────────────────────────────
  {
    id: "horizontal-scaling-why",
    patternId: "horizontal-scaling",
    kind: "why_this",
    askedBy: "Priya · Incident commander",
    prompt:
      "Nice save. But why add 3 more app servers instead of just upgrading the one box to 64 cores? One bigger machine sounds simpler to me.",
    starters: ["Because one box…", "A bigger machine…", "The tradeoff is…"],
    rubric: [
      { id: "ceiling", criterion: "Explains vertical scaling hits a hardware/cost ceiling while adding nodes keeps growing capacity", weight: 3 },
      { id: "spof", criterion: "Notes a single big box is still a single point of failure; multiple nodes survive one dying", weight: 2 },
      { id: "cost", criterion: "Names a cost of scaling out: needs a load balancer, stateless servers, or more ops overhead", weight: 2 },
    ],
    modelAnswer:
      "A 64-core box has a hard ceiling and is still one SPOF: if it dies, we're down. N stateless servers let us add capacity step by step and lose one without an outage. Cost: we need a load balancer and must move session state out of app memory.",
  },
  {
    id: "horizontal-scaling-10x",
    patternId: "horizontal-scaling",
    kind: "ten_x",
    askedBy: "Jordan · CTO",
    prompt:
      "Marketing just booked a Super Bowl ad: 10x traffic. We can autoscale app servers to 40. What breaks first, and how will we see it coming?",
    starters: ["The next bottleneck…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "db", criterion: "Identifies the shared database (connections or CPU) as the next bottleneck, not the stateless app tier", weight: 3 },
      { id: "signal", criterion: "Names a signal to watch: DB CPU, connection count, or p99 query latency", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: connection pooling, read replicas, or caching in front of the DB", weight: 2 },
    ],
    modelAnswer:
      "40 app servers means ~40x the DB connections; the single database saturates first, not the app tier. I'd alert on DB CPU >70%, active connections near max, and p99 query latency. Mitigate with a connection pooler, read replicas and a cache for hot reads.",
  },

  // ── Load balancing ────────────────────────────────────────────────────
  {
    id: "load-balancing-why",
    patternId: "load-balancing",
    kind: "why_this",
    askedBy: "Sam · Staff engineer",
    prompt:
      "Why a load balancer? DNS round-robin across the 3 servers is free and needs no new box. What does the LB buy us that DNS doesn't?",
    starters: ["DNS can't…", "Because health checks…", "The cost is…"],
    rubric: [
      { id: "health", criterion: "Explains the LB health-checks and stops routing to dead servers within seconds; DNS keeps sending traffic there", weight: 3 },
      { id: "ttl", criterion: "Mentions DNS TTL/client caching makes changes slow or uneven (minutes to hours)", weight: 2 },
      { id: "cost", criterion: "Names a cost: the LB is an extra hop/component that itself needs redundancy", weight: 2 },
    ],
    modelAnswer:
      "DNS round-robin keeps handing out a dead server's IP until TTLs expire, often minutes, and clients cache it. The LB health-checks every few seconds and ejects bad nodes, balancing by real load. Cost: one more hop, and the LB itself needs a redundant pair.",
  },
  {
    id: "load-balancing-10x",
    patternId: "load-balancing",
    kind: "ten_x",
    askedBy: "Ren · SRE on call",
    prompt:
      "We're going from 5k to 50k RPS behind this one LB. What falls over next, and what dashboard do I stare at during the launch?",
    starters: ["The LB itself…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "lb-limit", criterion: "Identifies the LB itself (connections, bandwidth, or being a single instance) as the next limit", weight: 3 },
      { id: "signal", criterion: "Names a signal: active connections, 5xx/queue rate at the LB, or per-backend latency skew", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: redundant/managed LB tier, multiple LBs behind DNS/anycast, or keepalive tuning", weight: 2 },
    ],
    modelAnswer:
      "A single LB instance becomes the SPOF and can hit connection or bandwidth limits at 50k RPS. Watch LB active connections, 5xx rate and backend latency skew. Mitigate with an active-passive pair or managed LB, and spread across several LBs via DNS or anycast.",
  },

  // ── Read replicas ─────────────────────────────────────────────────────
  {
    id: "read-replicas-why",
    patternId: "read-replicas",
    kind: "why_this",
    askedBy: "Alex · Database lead",
    prompt:
      "You added 2 read replicas. Why not shard the database instead? Sharding would fix everything forever, right?",
    starters: ["Reads dominate, so…", "Sharding costs…", "The tradeoff is…"],
    rubric: [
      { id: "reads", criterion: "Identifies the load is read-heavy (e.g. 80-90%+ reads) so offloading reads to replicas relieves the primary", weight: 3 },
      { id: "shard-cost", criterion: "Explains sharding is premature here: app changes, cross-shard queries, resharding pain", weight: 2 },
      { id: "lag", criterion: "Names a cost of replicas: replication lag / stale reads, and writes still hit one primary", weight: 2 },
    ],
    modelAnswer:
      "~90% of our queries are reads, so replicas take that load off the primary with no schema or app routing rewrite. Sharding adds shard keys, cross-shard joins and resharding pain we don't need yet. Cost: replica lag means stale reads, and writes still hit one primary.",
  },
  {
    id: "read-replicas-10x",
    patternId: "read-replicas",
    kind: "ten_x",
    askedBy: "Morgan · Product manager",
    prompt:
      "Signups are about to 10x, so writes go 10x too. Can we just keep adding replicas? What breaks, and how would we know?",
    starters: ["Replicas don't help writes…", "I'd watch…", "Next step is…"],
    rubric: [
      { id: "writes", criterion: "Explains replicas don't scale writes: every replica replays all writes, so the primary becomes the bottleneck", weight: 3 },
      { id: "signal", criterion: "Names a signal: replication lag growing, primary CPU/IOPS or write latency", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: sharding/partitioning writes, batching, or a queue to smooth write bursts", weight: 2 },
    ],
    modelAnswer:
      "No. Every replica replays every write, so 10x writes saturates the primary and lag climbs on all replicas. I'd watch replication lag in seconds plus primary IOPS and write p99. Short term, batch or queue writes; long term, shard by user_id to split the write load.",
  },

  // ── Caching ───────────────────────────────────────────────────────────
  {
    id: "caching-why",
    patternId: "caching",
    kind: "why_this",
    askedBy: "Kai · Finance partner",
    prompt:
      "The DB team asked for 4 more replicas; you added a Redis cache instead. Why is that the better call for our hot product pages?",
    starters: ["Hot keys mean…", "Memory is faster…", "The catch is…"],
    rubric: [
      { id: "hot", criterion: "Identifies a small set of hot keys serves most reads, so a cache absorbs most traffic (high hit ratio)", weight: 3 },
      { id: "latency", criterion: "Notes in-memory reads are sub-millisecond and cheaper than more DB replicas", weight: 1 },
      { id: "stale", criterion: "Names a cost: stale data, invalidation, or cache-miss stampede when it empties", weight: 2 },
    ],
    modelAnswer:
      "A few hundred hot pages get most reads, so a cache with a 90%+ hit ratio removes most DB load at sub-ms latency, cheaper than 4 replicas. The catch: data can be stale until TTL or invalidation, and a cold or flushed cache sends a stampede to the DB.",
  },
  {
    id: "caching-10x",
    patternId: "caching",
    kind: "ten_x",
    askedBy: "Dana · SRE on call",
    prompt:
      "Flash sale tomorrow: 10x reads, all on the same 50 products. What breaks in the cache layer, and what's your early warning?",
    starters: ["Hot keys will…", "I'd alert on…", "To mitigate…"],
    rubric: [
      { id: "hotkey", criterion: "Identifies hot-key overload on a single cache node or a stampede when a hot key expires", weight: 3 },
      { id: "signal", criterion: "Names a signal: hit ratio dropping, per-node CPU/ops skew, or DB QPS spiking on misses", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: request coalescing/locking, jittered TTLs, key replication, or local in-process cache", weight: 2 },
    ],
    modelAnswer:
      "50 hot keys land on a few cache nodes, which max out, and when a hot key expires thousands of misses stampede the DB. I'd alert on hit ratio drops, per-node ops skew and DB QPS. Mitigate with request coalescing, jittered TTLs and a small local cache for the hottest keys.",
  },

  // ── CDN & edge ────────────────────────────────────────────────────────
  {
    id: "cdn-edge-why",
    patternId: "cdn-edge",
    kind: "why_this",
    askedBy: "Noor · Growth lead",
    prompt:
      "Users in Sydney saw 1.2s image loads. You put a CDN in front. Why not just spin up a read replica in Australia instead?",
    starters: ["The latency is distance…", "Static assets…", "The tradeoff is…"],
    rubric: [
      { id: "distance", criterion: "Identifies the problem is network distance/RTT for static assets, which edge caching solves close to users", weight: 3 },
      { id: "replica-miss", criterion: "Explains a DB replica doesn't help: images aren't DB reads and origin servers are still far away", weight: 2 },
      { id: "cost", criterion: "Names a cost: cache invalidation/purges, stale assets, or CDN bandwidth bills", weight: 2 },
    ],
    modelAnswer:
      "The slowness is ~200ms RTTs to our US origin, multiplied per asset. A CDN serves images from a Sydney edge in tens of ms. A DB replica won't help: images aren't DB queries and the app servers are still far away. Cost: purges on update, versioned URLs and CDN bandwidth fees.",
  },
  {
    id: "cdn-edge-10x",
    patternId: "cdn-edge",
    kind: "ten_x",
    askedBy: "Theo · Incident commander",
    prompt:
      "A video launch will push 10x traffic through the CDN. Edges are fine. What actually breaks, and what would you watch?",
    starters: ["Cache misses hit…", "I'd watch…", "To protect origin…"],
    rubric: [
      { id: "origin", criterion: "Identifies origin overload from cache misses (cold edges, purges, uncacheable requests) as the risk", weight: 3 },
      { id: "signal", criterion: "Names a signal: CDN hit ratio, origin egress/RPS, or origin 5xx", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: origin shield/tiered caching, pre-warming, longer TTLs, or avoiding mass purges", weight: 2 },
    ],
    modelAnswer:
      "Edges scale; origin doesn't. Every miss, cold edge or mass purge goes back to origin, so a hit ratio drop from 95% to 80% quadruples origin load. Watch hit ratio, origin RPS and origin 5xx. Mitigate with an origin shield, pre-warming popular files and no mass purges on launch.",
  },

  // ── Async queues ──────────────────────────────────────────────────────
  {
    id: "async-queues-why",
    patternId: "async-queues",
    kind: "why_this",
    askedBy: "Ines · Staff engineer",
    prompt:
      "Checkout was timing out on PDF receipts, and you moved them to a queue. Why not just raise the request timeout from 5s to 30s?",
    starters: ["Longer timeouts…", "The user doesn't need…", "The tradeoff is…"],
    rubric: [
      { id: "decouple", criterion: "Explains the slow work isn't needed for the response, so a queue decouples it and checkout returns fast", weight: 3 },
      { id: "timeout-bad", criterion: "Explains longer timeouts hold threads/connections longer, so capacity drops and failures cascade", weight: 2 },
      { id: "cost", criterion: "Names a cost: eventual completion, retries/duplicates, or monitoring queue depth", weight: 2 },
    ],
    modelAnswer:
      "Users don't need the PDF to finish paying. A queue lets checkout reply in ~200ms while workers render later. A 30s timeout just ties up threads 6x longer, so fewer requests fit and failures cascade. Cost: receipts arrive later, and retries mean workers must handle duplicates.",
  },
  {
    id: "async-queues-10x",
    patternId: "async-queues",
    kind: "ten_x",
    askedBy: "Yuki · SRE on call",
    prompt:
      "Holiday traffic: 10x orders flooding the queue, and workers fixed at 8. What goes wrong, and what alert fires first?",
    starters: ["The backlog grows…", "I'd alert on…", "To mitigate…"],
    rubric: [
      { id: "backlog", criterion: "Identifies consumers can't keep up so backlog and end-to-end delay grow without bound", weight: 3 },
      { id: "signal", criterion: "Names a signal: queue depth, oldest-message age, or consumer lag", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: autoscale workers on queue depth, prioritise queues, or DLQ for poison messages", weight: 2 },
    ],
    modelAnswer:
      "If 8 workers drain less than the arrival rate, the backlog grows forever and a receipt could lag hours. Alert on oldest-message age and queue depth, not just CPU. Autoscale workers on depth, put urgent jobs on a priority queue and send poison messages to a DLQ.",
  },

  // ── Sharding ──────────────────────────────────────────────────────────
  {
    id: "sharding-why",
    patternId: "sharding",
    kind: "why_this",
    askedBy: "Omar · CTO",
    prompt:
      "The primary is at 95% write IOPS. You chose sharding by user_id. Why not add more read replicas? They're way less work.",
    starters: ["Replicas copy writes…", "Sharding splits…", "The cost is…"],
    rubric: [
      { id: "writes", criterion: "Explains the bottleneck is writes, and replicas copy every write so they can't reduce write load", weight: 3 },
      { id: "key", criterion: "Justifies user_id as a key: high cardinality spreads load and keeps a user's data on one shard", weight: 2 },
      { id: "cost", criterion: "Names a cost: cross-shard queries/joins, hot shards, or resharding complexity", weight: 2 },
    ],
    modelAnswer:
      "We're write-bound, and every replica replays every write, so replicas can't cut write IOPS. Sharding by user_id splits writes across N primaries; it's high-cardinality and keeps a user's rows together. Cost: cross-shard queries get hard and resharding later is painful.",
  },
  {
    id: "sharding-10x",
    patternId: "sharding",
    kind: "ten_x",
    askedBy: "Lena · Database lead",
    prompt:
      "We have 4 shards now. A celebrity joins and traffic goes 10x overall. What breaks first, and how do you spot it?",
    starters: ["A hot shard…", "I'd compare…", "To rebalance…"],
    rubric: [
      { id: "hot", criterion: "Identifies a hot shard/hot key (celebrity) overloads one shard while others idle", weight: 3 },
      { id: "signal", criterion: "Names a signal: per-shard QPS/CPU skew or p99 latency on one shard", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: more shards via consistent hashing/virtual nodes, splitting the hot key, or caching it", weight: 2 },
    ],
    modelAnswer:
      "The celebrity's user_id pins all their traffic to one shard, which melts while 3 idle. Watch per-shard QPS and p99 skew, not averages. Mitigate by caching their hot rows, splitting the hot key, and moving to consistent hashing with virtual nodes so new shards move less data.",
  },

  // ── Consistency ───────────────────────────────────────────────────────
  {
    id: "consistency-why",
    patternId: "consistency",
    kind: "why_this",
    askedBy: "Zara · Product manager",
    prompt:
      "Users saw their new post vanish after refresh. You routed their own reads to the primary for 5s. Why not send ALL reads to the primary?",
    starters: ["Only the writer needs…", "All reads on primary…", "The tradeoff is…"],
    rubric: [
      { id: "ryw", criterion: "Explains read-your-writes only matters for the user who just wrote, so only their reads need the primary", weight: 3 },
      { id: "overload", criterion: "Explains sending all reads to the primary throws away replica capacity and overloads it", weight: 2 },
      { id: "cost", criterion: "Names a cost: other users may see stale data briefly, or the 5s window must exceed replica lag", weight: 2 },
    ],
    modelAnswer:
      "Only the author needs to see their post instantly, so read-your-writes for 5s after a write fixes it. Moving all reads to the primary wastes the replicas and puts 10x load back on it. Cost: other users may see it a second late, and the 5s window must exceed worst-case lag.",
  },
  {
    id: "consistency-10x",
    patternId: "consistency",
    kind: "ten_x",
    askedBy: "Felix · SRE on call",
    prompt:
      "At 10x write volume, replica lag could jump from 200ms to 10s. What does your 5-second read-your-writes rule do then?",
    starters: ["The window breaks…", "I'd monitor…", "Instead I'd…"],
    rubric: [
      { id: "breaks", criterion: "Identifies a fixed time window fails once lag exceeds it, so stale reads return", weight: 3 },
      { id: "signal", criterion: "Names a signal: replication lag metric or stale-read reports", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: route by replication position/LSN or version token, or lag-aware routing", weight: 2 },
    ],
    modelAnswer:
      "If lag hits 10s, a fixed 5s window expires early and users see stale data again. Alert on replica lag vs the window. Better: store the write's LSN or version in the session and only read from replicas that have caught up to it, else fall back to the primary.",
  },

  // ── Rate limiting ─────────────────────────────────────────────────────
  {
    id: "rate-limiting-why",
    patternId: "rate-limiting",
    kind: "why_this",
    askedBy: "Riya · Security lead",
    prompt:
      "One client was hammering the API at 20k RPS. You added a per-API-key rate limit. Why not just autoscale to absorb it?",
    starters: ["Scaling rewards abuse…", "Per-key limits…", "The tradeoff is…"],
    rubric: [
      { id: "fair", criterion: "Explains per-key limits protect other tenants by capping one abuser, instead of letting them consume shared capacity", weight: 3 },
      { id: "scale-bad", criterion: "Explains autoscaling costs money, lags behind spikes, and pushes load to the DB or other shared bottlenecks", weight: 2 },
      { id: "cost", criterion: "Names a cost: legit bursts get 429s, limits need tuning, or distributed counter overhead", weight: 2 },
    ],
    modelAnswer:
      "Autoscaling just pays to serve the abuser, lags spikes by minutes, and still floods the DB. A per-key token bucket caps one tenant so everyone else stays fast. Cost: legit bursty clients will get 429s, so we need sensible limits, Retry-After headers and a way to raise quotas.",
  },
  {
    id: "rate-limiting-10x",
    patternId: "rate-limiting",
    kind: "ten_x",
    askedBy: "Chen · Staff engineer",
    prompt:
      "We go from 3 to 30 API gateway nodes. Every request checks a Redis counter for its key. What breaks, and how would you know?",
    starters: ["The counter store…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "redis", criterion: "Identifies the central counter store becomes a hot bottleneck / added latency / SPOF on every request", weight: 3 },
      { id: "signal", criterion: "Names a signal: Redis latency/ops per sec, limiter-added p99, or errors when Redis is unreachable", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: local token buckets synced periodically, sharded counters, or a fail-open/closed policy", weight: 2 },
    ],
    modelAnswer:
      "Every request now hits one Redis, so it becomes a hot SPOF and adds latency to all calls. Watch Redis ops/sec, limiter p99 and timeout errors. Mitigate with local per-node buckets synced every ~100ms, counters sharded by key, and a clear fail-open policy if Redis dies.",
  },

  // ── Circuit breaker ───────────────────────────────────────────────────
  {
    id: "circuit-breaker-why",
    patternId: "circuit-breaker",
    kind: "why_this",
    askedBy: "Avery · Incident commander",
    prompt:
      "The payments provider was timing out and you added a circuit breaker. Why not just retry 3 times? Retries fix flaky calls.",
    starters: ["Retries multiply load…", "Failing fast…", "The tradeoff is…"],
    rubric: [
      { id: "fastfail", criterion: "Explains the breaker fails fast when the dependency is down, freeing threads instead of waiting on timeouts", weight: 3 },
      { id: "retry-storm", criterion: "Explains retries multiply load (up to 4x) on an already-struggling dependency", weight: 2 },
      { id: "cost", criterion: "Names a cost: requests are rejected while open, needs a fallback, or thresholds must be tuned", weight: 2 },
    ],
    modelAnswer:
      "If the provider is down, 3 retries mean up to 4x load on it and our threads stuck on timeouts, so we fall over too. The breaker trips on repeated failures, fails fast, then probes. Cost: some payments are rejected while open, so we need a fallback or a retry-later queue.",
  },
  {
    id: "circuit-breaker-10x",
    patternId: "circuit-breaker",
    kind: "ten_x",
    askedBy: "Mika · SRE on call",
    prompt:
      "At 10x traffic we'll have 200 instances, each with its own breaker. What goes wrong when the provider blips, and what do you watch?",
    starters: ["Half-open probes…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "herd", criterion: "Identifies thundering herd: many breakers half-open/close together and slam the recovering dependency", weight: 3 },
      { id: "signal", criterion: "Names a signal: breaker state changes per minute, dependency error rate, or fallback rate", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: jittered probe timing, limited half-open trial requests, or retry budgets", weight: 2 },
    ],
    modelAnswer:
      "200 breakers trip together, then half-open together and hammer the provider as it recovers, knocking it over again. Watch breaker open/close flaps per minute and fallback rate. Mitigate with jittered reset timers, only a few trial calls while half-open, and a global retry budget.",
  },

  // ── Connection pooling ────────────────────────────────────────────────
  {
    id: "connection-pooling-why",
    patternId: "connection-pooling",
    kind: "why_this",
    askedBy: "Tariq · Database lead",
    prompt:
      "Postgres hit max_connections. You added a pooler instead of raising max_connections from 100 to 2,000. Why? Changing one number is easier.",
    starters: ["Each connection costs…", "A pool reuses…", "The tradeoff is…"],
    rubric: [
      { id: "memory", criterion: "Explains each Postgres connection is a process using memory (MBs); thousands cause contention and slow the DB", weight: 3 },
      { id: "reuse", criterion: "Explains a pool reuses a small set of connections and skips connect/TLS setup cost per request", weight: 2 },
      { id: "cost", criterion: "Names a cost: requests may wait for a free connection, or pool sizing/session features need care", weight: 2 },
    ],
    modelAnswer:
      "Each Postgres connection is a process using several MB; 2,000 of them thrash memory and locks, so the DB gets slower, not faster. A pooler reuses ~100 warm connections and skips setup per request. Cost: requests queue when the pool is full, and session-level features need care.",
  },
  {
    id: "connection-pooling-10x",
    patternId: "connection-pooling",
    kind: "ten_x",
    askedBy: "Harper · CTO",
    prompt:
      "Traffic grows 10x, app instances go from 10 to 100, each with a pool of 20. What happens to the database, and how do we notice?",
    starters: ["100 times 20…", "I'd alert on…", "To mitigate…"],
    rubric: [
      { id: "math", criterion: "Calculates or notes total connections multiply (100 x 20 = 2,000) and exceed DB limits", weight: 3 },
      { id: "signal", criterion: "Names a signal: DB connection count, pool wait time, or connection timeout errors", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: central pooler (e.g. PgBouncer), smaller per-instance pools, or read replicas", weight: 2 },
    ],
    modelAnswer:
      "Per-instance pools multiply: 100 x 20 = 2,000 connections against a DB tuned for a few hundred, so connects fail. Alert on DB connection count and pool wait time. Mitigate with a central pooler like PgBouncer in transaction mode, smaller app pools, and replicas for reads.",
  },

  // ── Backpressure ──────────────────────────────────────────────────────
  {
    id: "backpressure-why",
    patternId: "backpressure",
    kind: "why_this",
    askedBy: "Quinn · Staff engineer",
    prompt:
      "The ingest service OOM-crashed. You bounded its buffer and return 503 when full. Why not just give it 4x the memory?",
    starters: ["More memory delays…", "Rejecting early…", "The tradeoff is…"],
    rubric: [
      { id: "unbounded", criterion: "Explains if input rate exceeds processing rate, any unbounded buffer eventually overflows; more memory only delays it", weight: 3 },
      { id: "signal-up", criterion: "Explains rejecting/slowing producers pushes the signal upstream so clients can back off", weight: 2 },
      { id: "cost", criterion: "Names a cost: some requests are rejected, clients must retry with backoff, or latency rises", weight: 2 },
    ],
    modelAnswer:
      "If producers outpace us, any unbounded buffer fills; 4x memory just delays the OOM and adds huge queueing latency. A bounded queue that returns 503 tells clients to back off, and we stay alive. Cost: some requests are rejected, so clients need retry with backoff and jitter.",
  },
  {
    id: "backpressure-10x",
    patternId: "backpressure",
    kind: "ten_x",
    askedBy: "Sasha · SRE on call",
    prompt:
      "Traffic 10x's and now 60% of ingest requests get 503s. Clients retry instantly. What happens next, and what do you watch?",
    starters: ["Retries amplify…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "storm", criterion: "Identifies instant retries create a retry storm that multiplies load and keeps the system saturated", weight: 3 },
      { id: "signal", criterion: "Names a signal: rejection rate, retry ratio, or queue fill level", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: exponential backoff + jitter, Retry-After, load shedding by priority, or adding capacity", weight: 2 },
    ],
    modelAnswer:
      "Instant retries turn rejections into more load, a retry storm, so the queue stays full and success rate collapses. Watch rejection rate and retries per original request. Send Retry-After, require exponential backoff with jitter, shed low-priority traffic, scale consumers.",
  },

  // ── Idempotency ───────────────────────────────────────────────────────
  {
    id: "idempotency-why",
    patternId: "idempotency",
    kind: "why_this",
    askedBy: "Nia · Finance partner",
    prompt:
      "Some customers were charged twice after timeouts. You added idempotency keys. Why not just turn off client retries?",
    starters: ["Retries are needed…", "The key lets…", "The cost is…"],
    rubric: [
      { id: "unknown", criterion: "Explains a timeout doesn't tell the client if the charge happened, so retries are still needed for reliability", weight: 3 },
      { id: "dedupe", criterion: "Explains the server stores the key and returns the original result for repeats, so the charge applies once", weight: 2 },
      { id: "cost", criterion: "Names a cost: storing keys with a TTL, handling concurrent same-key requests, or the check adds latency", weight: 2 },
    ],
    modelAnswer:
      "After a timeout the client can't know if the charge went through; no retries means lost payments. With an idempotency key, the server records the first result and replays it for repeats, so it's charged once. Cost: we store keys ~24h and must lock concurrent duplicates.",
  },
  {
    id: "idempotency-10x",
    patternId: "idempotency",
    kind: "ten_x",
    askedBy: "Elio · Staff engineer",
    prompt:
      "At 10x payments we'll store ~50M idempotency keys a day in one table. What breaks, and how would you catch it early?",
    starters: ["The key store…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "store", criterion: "Identifies the key store grows/becomes a write hotspot or slow lookup on every payment", weight: 3 },
      { id: "signal", criterion: "Names a signal: key-check latency, table size/storage growth, or duplicate-key conflict rate", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: TTL expiry, partition/shard keys by tenant/hash, or a fast KV store with durability", weight: 2 },
    ],
    modelAnswer:
      "Every payment checks and writes a key, so the table grows by 50M rows/day and lookups slow the checkout path. Watch key-check p99, table growth and lock waits. Mitigate with a 24-48h TTL cleanup, partitioning keys by hash, or a durable KV store built for fast point lookups.",
  },

  // ── Multi-region ──────────────────────────────────────────────────────
  {
    id: "multi-region-why",
    patternId: "multi-region",
    kind: "why_this",
    askedBy: "Rowan · CTO",
    prompt:
      "us-east-1 went down and took us with it. You set up a second region. Why not just spread across 3 availability zones in us-east-1?",
    starters: ["A whole region…", "AZs share…", "The tradeoff is…"],
    rubric: [
      { id: "blast", criterion: "Explains multi-AZ doesn't survive a region-wide failure (shared control plane/region outage); a second region does", weight: 3 },
      { id: "latency", criterion: "Mentions a bonus or reason: serving distant users closer, or regulatory/data residency", weight: 1 },
      { id: "cost", criterion: "Names a cost: cross-region replication lag/consistency, double infra cost, or failover complexity", weight: 2 },
    ],
    modelAnswer:
      "3 AZs protect against a data-center fire, not a region-wide outage like today's; AZs share the region's control plane. A second region survives that. Cost: roughly double infra, cross-region replication lag (may lose seconds of writes on failover) and drills we must run.",
  },
  {
    id: "multi-region-10x",
    patternId: "multi-region",
    kind: "ten_x",
    askedBy: "Imani · Incident commander",
    prompt:
      "We're active-passive with 10x more traffic now. If us-east fails, can us-west take it all? What breaks, and how would you know?",
    starters: ["The passive region…", "I'd test…", "To mitigate…"],
    rubric: [
      { id: "capacity", criterion: "Identifies the standby region may lack capacity (or cold caches/scaling limits) to absorb 100% of 10x traffic", weight: 3 },
      { id: "signal", criterion: "Names a signal: regular failover drills/game days, standby headroom, or replication lag", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: pre-provision headroom or quota, warm caches, shed load, or move to active-active", weight: 2 },
    ],
    modelAnswer:
      "No: a passive region sized for yesterday gets 100% of 10x load with cold caches and autoscaling that takes minutes. Only drills prove it, so run game days and track standby headroom. Pre-reserve capacity, warm caches and shed non-critical traffic on failover.",
  },

  // ── Health checks ─────────────────────────────────────────────────────
  {
    id: "health-checks-why",
    patternId: "health-checks",
    kind: "why_this",
    askedBy: "Parker · SRE on call",
    prompt:
      "The LB kept routing to a zombie server whose /ping returned 200. You made the check hit its real deps. Why not just keep /ping and page a human?",
    starters: ["/ping only proves…", "A deep check…", "The tradeoff is…"],
    rubric: [
      { id: "shallow", criterion: "Explains a shallow ping only proves the process is up, not that it can serve (DB/deps broken)", weight: 3 },
      { id: "auto", criterion: "Explains automatic ejection reacts in seconds, while paging a human takes minutes", weight: 2 },
      { id: "cost", criterion: "Names a cost: a shared dependency blip can fail all checks at once and eject every server", weight: 2 },
    ],
    modelAnswer:
      "/ping only proves the process is alive; the zombie couldn't reach the DB yet got traffic. A readiness check that tests real deps lets the LB eject it in seconds, not the minutes a page takes. Risk: if the shared DB blips, every node fails at once, so cap ejections.",
  },
  {
    id: "health-checks-10x",
    patternId: "health-checks",
    kind: "ten_x",
    askedBy: "Devi · Staff engineer",
    prompt:
      "At 10x we'll run 300 instances, and each deep health check queries the DB every 2s. What goes wrong, and what do you watch?",
    starters: ["Checks become load…", "I'd watch…", "To mitigate…"],
    rubric: [
      { id: "load", criterion: "Identifies health checks themselves become real load (e.g. 150 QPS on the DB) and can cause cascading ejections", weight: 3 },
      { id: "signal", criterion: "Names a signal: health-check QPS/latency, flapping healthy/unhealthy counts, or % of fleet ejected", weight: 2 },
      { id: "mitigate", criterion: "Proposes a mitigation: cache dependency status, split liveness vs readiness, longer intervals, or fail-open when most nodes fail", weight: 2 },
    ],
    modelAnswer:
      "300 instances checking every 2s is 150 DB queries/sec of pure overhead, and a slow DB fails all checks so the LB ejects the whole fleet. Watch check latency and % of fleet unhealthy. Cache dep status a few seconds, split liveness from readiness, and fail open if most nodes fail.",
  },

  // ── Interview problems ────────────────────────────────────────────────
  {
    id: "interview-url-shortener",
    interviewId: "interview-url-shortener",
    kind: "interview",
    askedBy: "Hana · Interviewer, staff engineer",
    prompt:
      "Reads are 100:1 over writes, ~50k redirects/sec. You put a cache in front of the DB. How do you keep a redirect under 25ms without serving a dead or wrong link?",
    starters: ["Because reads dominate…", "Short codes rarely change…", "The tradeoff is…"],
    rubric: [
      { id: "read-heavy", criterion: "Uses the 100:1 read ratio: a cache for hot codes serves most redirects in memory, sparing the DB", weight: 3 },
      { id: "immutable", criterion: "Notes mappings are mostly immutable, so staleness risk is low; invalidate on delete/expiry", weight: 2 },
      { id: "cost", criterion: "Names a cost/tradeoff: deleted links can live until TTL/invalidation, cache misses on cold links, or memory cost", weight: 2 },
    ],
    modelAnswer:
      "At 100:1, a cache of hot codes serves most of the 50k redirects/sec from memory in ~1ms, with replicas for misses. Mappings rarely change, so staleness is low risk. Cost: a deleted or abused link can live until we invalidate it, so deletes must purge the cache immediately.",
  },
  {
    id: "interview-twitter-timeline",
    interviewId: "interview-twitter-timeline",
    kind: "interview",
    askedBy: "Marcus · Interviewer, principal engineer",
    prompt:
      "You fan out tweets on write to follower timelines via a queue. A user with 50M followers tweets. Defend the tradeoff: freshness vs cost.",
    starters: ["Fan-out on write…", "For celebrities…", "The tradeoff is…"],
    rubric: [
      { id: "hybrid", criterion: "Proposes hybrid: fan-out on write for normal users, fan-out on read (merge at read time) for celebrities", weight: 3 },
      { id: "why-write", criterion: "Explains precomputed timelines make 300k reads/sec cheap and fast (<200ms)", weight: 2 },
      { id: "cost", criterion: "Names a tradeoff: eventual consistency/delay in timelines, or write amplification/storage cost", weight: 2 },
    ],
    modelAnswer:
      "Fan-out on write precomputes timelines so 300k reads/sec are cheap cache reads under 200ms. But 50M writes per celebrity tweet is too costly, so celebs are fan-out on read and merged at load. Tradeoff: timelines are eventually consistent; a tweet may take seconds to appear.",
  },
  {
    id: "interview-uber-dispatch",
    interviewId: "interview-uber-dispatch",
    kind: "interview",
    askedBy: "Lucía · Interviewer, engineering manager",
    prompt:
      "1.25M GPS pings/sec. You keep driver locations in an in-memory geo index, not the database. Why, and what do you give up?",
    starters: ["Locations are ephemeral…", "A geo index…", "The tradeoff is…"],
    rubric: [
      { id: "ephemeral", criterion: "Explains locations are ephemeral and overwritten every ~4s, so durable DB writes at 1.25M/sec are wasteful", weight: 3 },
      { id: "geo", criterion: "Mentions a spatial index (geohash/S2/H3 cells) partitioned by region for fast radius queries", weight: 2 },
      { id: "cost", criterion: "Names what's given up: losing a node loses recent positions (recovered on next ping) or brief stale matches", weight: 2 },
    ],
    modelAnswer:
      "A driver's location is stale in 4s anyway, so persisting 1.25M writes/sec is waste. An in-memory index keyed by geohash/H3 cell, sharded by city, answers 3km radius queries in ms. We give up durability: a crashed node loses positions until the next ping, ~4s later.",
  },
  {
    id: "interview-global-ecommerce",
    interviewId: "interview-global-ecommerce",
    kind: "interview",
    askedBy: "Aiko · Interviewer, CTO",
    prompt:
      "Active-active across 3 regions, but flash-sale stock can't oversell. How do you keep checkout correct without making every catalog view slow?",
    starters: ["Split the paths…", "Inventory needs…", "The tradeoff is…"],
    rubric: [
      { id: "split", criterion: "Splits the paths: catalog is eventually consistent via CDN/cache/replicas; inventory decrements are strongly consistent", weight: 3 },
      { id: "mechanism", criterion: "Names a mechanism for no overselling: single home region/leader per SKU, conditional atomic decrement, or reservations", weight: 2 },
      { id: "cost", criterion: "Names a tradeoff: checkout pays cross-region latency, or reduced availability for that SKU during a partition", weight: 2 },
    ],
    modelAnswer:
      "Catalog reads can be seconds stale, so CDN, caches and local replicas keep them under 50ms. Stock decrements go to one home region per SKU with an atomic 'stock > 0' check. Tradeoff: remote shoppers pay ~100ms more at checkout, and a partition can pause that SKU's sales.",
  },
];

const BY_ID = new Map(REASONING_PROMPTS.map((p) => [p.id, p]));

export function getReasoningPrompt(id: string): ReasoningPrompt | undefined {
  return BY_ID.get(id);
}

/** Prompt for a pattern's War Room debrief; alternates kinds by run so replays vary. */
export function getPatternReasoningPrompt(patternId: string, runIndex = 0): ReasoningPrompt | undefined {
  const options = REASONING_PROMPTS.filter((p) => p.patternId === patternId);
  return options.length ? options[Math.abs(runIndex) % options.length] : undefined;
}

export function getInterviewReasoningPrompt(interviewId: string): ReasoningPrompt | undefined {
  return REASONING_PROMPTS.find((p) => p.interviewId === interviewId);
}
