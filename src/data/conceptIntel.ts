import { ConceptIntel } from "@/types";

export const CONCEPT_INTEL_REGISTRY: Record<string, ConceptIntel> = {
  "horizontal-scaling": {
    id: "horizontal-scaling",
    name: "Horizontal Scaling (Scale Out)",
    category: "scaling",
    oneLiner: "Adding more machines in parallel instead of buying one giant expensive server.",
    eli5Analogy: {
      title: "The Supermarket Cashier Analogy",
      story: "Opening more checkout lanes at a busy grocery store so customers divide across cashiers instead of overloading one person.",
    },
    visualFlow: `[ Traffic Burst ] ──► [ Ingress / DNS ] ──► [ N Stateless App Nodes ]`,
    whyItWorks: "Stateless app servers execute identical logic independently. By provisioning identical nodes behind a shared ingress, compute capacity grows linearly with server count without hitting hardware ceilings.",
    whenItFails: "Fails when app servers hold local session state, or when the shared database saturates under the extra connection pool load.",
    tradeoffs: {
      pros: [
        "Near-linear compute scaling past single-machine hardware ceilings",
        "High availability: if one node crashes, surviving nodes keep serving",
        "Cost-effective autoscaling during off-peak traffic valleys",
      ],
      cons: [
        "Requires completely stateless application layers",
        "Requires load balancers and health checking infrastructure",
        "Pushes the scaling bottleneck down to shared databases and caches",
      ],
    },
    interviewPlaybook: {
      whenToUse: "When stateless API or web server CPU is saturated (>80%) under traffic spikes.",
      sampleDialogue: "'Because our API servers are stateless, our first line of defense is horizontal autoscaling across availability zones, capping each node at 60% CPU to withstand sudden bursts.'",
    },
  },

  "load-balancing": {
    id: "load-balancing",
    name: "Load Balancing (Reverse Proxy)",
    category: "networking",
    oneLiner: "The traffic conductor directing incoming requests evenly across healthy servers.",
    eli5Analogy: {
      title: "The Restaurant Maitre D' Analogy",
      story: "A restaurant host standing at the front door assigning incoming dining parties to the waiter with the fewest active tables.",
    },
    visualFlow: `[ Client Traffic ] ──► [ Reverse Proxy / LB ] ──► [ Healthy App Targets ]`,
    whyItWorks: "A reverse proxy terminates client TLS connections and distributes HTTP requests across backend targets using algorithms like round-robin or least-connections, actively probing node health.",
    whenItFails: "Fails if health check timeouts are misconfigured (routing traffic to dead nodes) or if the load balancer itself is a single point of failure without an HA pair.",
    tradeoffs: {
      pros: [
        "Eliminates traffic skew and prevents individual server hot spots",
        "Active health checks automatically evict failing instances",
        "Offloads SSL/TLS cryptographic overhead from backend compute nodes",
      ],
      cons: [
        "Adds an extra network hop (~0.5–2ms per request)",
        "Single point of failure unless deployed as a redundant HA pair",
        "Sticky session requirements complicate even traffic distribution",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Whenever scaling beyond a single server to balance load and route around server crashes.",
      sampleDialogue: "'We place a redundant Layer 7 Application Load Balancer in front of our backend cluster with least-connections routing and deep HTTP health probes to evict failing pods within seconds.'",
    },
  },

  "read-replicas": {
    id: "read-replicas",
    name: "Database Read Replicas",
    category: "database",
    oneLiner: "Read-only database copies kept in sync asynchronously from the primary writer.",
    eli5Analogy: {
      title: "The Library Reference Desk Analogy",
      story: "Photocopying reference sheets for students to study from while the professor writes new exam questions on the master copy.",
    },
    visualFlow: `[ Writes ] ──► [ Primary DB ] ──(Async WAL)──► [ Read Replicas (90% Reads) ]`,
    whyItWorks: "Most web workloads are 80–95% reads. Offloading SELECT queries to read replicas frees the primary database CPU, memory, and buffer pool to process ACID write transactions without contention.",
    whenItFails: "Fails under heavy write loads (since all writes bottleneck on the single primary) or when replication lag causes users to see stale data right after updating.",
    tradeoffs: {
      pros: [
        "Horizontally scales database read throughput across multiple nodes",
        "Allows replica promotion to minimize downtime during primary database failure",
        "Isolates heavy analytical reporting queries from user-facing transactions",
      ],
      cons: [
        "Replication lag causes read-after-write inconsistency for active users",
        "Does not scale write throughput (all mutations still hit the primary)",
        "Increases infrastructure costs and replication management overhead",
      ],
    },
    interviewPlaybook: {
      whenToUse: "When read-heavy queries saturate primary database CPU or connection pools.",
      sampleDialogue: "'With a 9:1 read-to-write ratio, we offload read traffic to a cluster of read replicas, routing mutations to the primary and using session pinning for read-your-own-writes consistency.'",
    },
  },

  caching: {
    id: "caching",
    name: "In-Memory Caching (Cache-Aside)",
    category: "caching",
    oneLiner: "Keeping precomputed query results in RAM so requests skip expensive database execution.",
    eli5Analogy: {
      title: "The Sticky Note vs Basement Filing Cabinet",
      story: "Keeping a quick cheat-sheet on your desk instead of walking to the archive room every time someone asks a common question.",
    },
    visualFlow: `[ App Query ] ──► [ Redis RAM (Hit: <1ms) ] ──(Miss: 5%)──► [ Database ]`,
    whyItWorks: "Reading from RAM takes ~100 nanoseconds compared to milliseconds for relational queries. Cache-aside bypasses SQL parsing, query planning, table joins, and lock contention on the primary database.",
    whenItFails: "Fails during cache stampedes (thundering herd on key expiry), memory exhaustion under low TTLs, or stale reads from lost invalidation events.",
    tradeoffs: {
      pros: [
        "Slashes database read query load by 80–95% on hot datasets",
        "Sub-millisecond latency for cached data hits",
        "Buffers backend databases against unexpected traffic spikes",
      ],
      cons: [
        "Cache invalidation complexity leads to potential stale data reads",
        "Vulnerable to thundering herd stampedes when popular keys expire",
        "High RAM cost per gigabyte relative to persistent disk storage",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Read-heavy workloads with repetitive queries that tolerate slight eventual consistency.",
      sampleDialogue: "'We place a Redis Cluster in front of our database using cache-aside. On write mutations we invalidate the cache key, and we enforce bounded TTLs to cap maximum staleness window.'",
    },
  },

  "cdn-edge": {
    id: "cdn-edge",
    name: "Content Delivery Network (CDN Edge)",
    category: "networking",
    oneLiner: "Geographically distributed edge proxy servers caching static and streaming content close to users.",
    eli5Analogy: {
      title: "The Regional Fulfillment Warehouses",
      story: "Warehouses stocked in every major city so local deliveries arrive in minutes instead of shipping across the ocean each time.",
    },
    visualFlow: `[ Global User ] ──► [ Edge POP (GeoDNS / Anycast) ] ──(Miss)──► [ Origin Server ]`,
    whyItWorks: "Light travels through fiber at ~200 km/ms; intercontinental round-trips add 100–250ms of physical latency. CDNs terminate TLS and serve cached assets from local Points of Presence (POPs) within 10–20ms.",
    whenItFails: "Fails for highly dynamic, personalized API responses that cannot be cached, or when edge purge delays serve outdated assets to users.",
    tradeoffs: {
      pros: [
        "Drastically cuts physical network latency for international users",
        "Absorbs massive static traffic bursts, shielding origin servers",
        "Provides built-in DDoS mitigation and TLS edge termination",
      ],
      cons: [
        "Global cache purges take seconds to propagate across all edge nodes",
        "Cache misses add origin request latency for cold assets",
        "Egress bandwidth costs can become significant at petabyte scale",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Serving static assets, images, media streaming, or public API responses globally.",
      sampleDialogue: "'We deploy Cloudflare or CloudFront with Anycast routing to cache static assets and public catalog endpoints at the edge, setting strict Cache-Control headers and stale-while-revalidate.'",
    },
  },

  "async-queues": {
    id: "async-queues",
    name: "Asynchronous Message Queues",
    category: "scaling",
    oneLiner: "Decoupling request ingestion from background processing with persistent message buffers.",
    eli5Analogy: {
      title: "The Fast-Food Order Ticket",
      story: "Taking orders and handing out numbered tickets at a fast-food counter so the kitchen cooks at its own steady pace without blocking the register.",
    },
    visualFlow: `[ API Producer ] ──(Enqueue Message)──► [ Message Queue / Broker ] ──► [ Worker Pool ]`,
    whyItWorks: "Queues decouple producers from consumers in time and rate. Web servers accept requests, enqueue task payloads in <5ms, and return 202 Accepted, while independent worker pools process tasks steadily.",
    whenItFails: "Fails when consumer processing rate consistently falls below production rate, causing unbounded queue backlog growth and message timeouts.",
    tradeoffs: {
      pros: [
        "Smooths out traffic spikes without overwhelming downstream dependencies",
        "Decouples service architectures and enables independent autoscaling",
        "Guarantees job persistence and retries via dead-letter queues",
      ],
      cons: [
        "Introduces asynchronous completion flows and polling complexity",
        "Requires handling duplicate deliveries and out-of-order execution",
        "Unbounded backlog accumulation risks consumer lag and memory pressure",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Long-running tasks such as payment settlement, email notifications, video encoding, or batch exports.",
      sampleDialogue: "'We buffer checkout processing through RabbitMQ or SQS. The API returns an immediate acknowledgment, while autoscaled worker fleets consume from the queue at a sustainable rate.'",
    },
  },

  sharding: {
    id: "sharding",
    name: "Database Horizontal Partitioning (Sharding)",
    category: "database",
    oneLiner: "Splitting a database horizontally across multiple independent servers using a partition key.",
    eli5Analogy: {
      title: "The Multi-Volume Phone Book",
      story: "Splitting an enormous phone book into separate alphabetical volumes across multiple desks so callers look up numbers in parallel.",
    },
    visualFlow: `[ Query ] ──► [ Shard Router (Hash / Range Key) ] ──► [ Target Shard (DB Node) ]`,
    whyItWorks: "When database size or write throughput exceeds the physical capacity of any single machine, sharding distributes rows across independent nodes using a partition key (such as hash(user_id) % N).",
    whenItFails: "Fails on cross-shard queries and distributed joins, or when a skewed shard key creates a hot shard that exhausts its single node.",
    tradeoffs: {
      pros: [
        "Horizontally scales both write throughput and storage capacity indefinitely",
        "Limits blast radius: a single shard failure affects only a fraction of users",
        "Enables data locality by routing regions to geographic shards",
      ],
      cons: [
        "Cross-shard joins and distributed transactions are slow or unsupported",
        "Uneven partition key distribution leads to hot shard bottlenecks",
        "Resharding and rebalancing clusters involves heavy operational overhead",
      ],
    },
    interviewPlaybook: {
      whenToUse: "When total dataset size exceeds 5–10 TB or write operations saturate single-master limits.",
      sampleDialogue: "'We shard our PostgreSQL cluster by tenant_id using consistent hashing across 16 shards, ensuring all queries specify tenant_id to avoid expensive multi-shard scatter-gather lookups.'",
    },
  },

  consistency: {
    id: "consistency",
    name: "Distributed Consistency Models",
    category: "consistency",
    oneLiner: "Managing the trade-off between instant cross-node agreement and low latency availability.",
    eli5Analogy: {
      title: "The Team Whiteboard Agreement",
      story: "A shared office whiteboard where changes require everyone to nod before continuing, trading instant speed for total agreement.",
    },
    visualFlow: `[ Write Request ] ──► [ Replication Coordinator ] ──► [ Quorum / Sync Acks ]`,
    whyItWorks: "Distributed data replicas cannot synchronize instantaneously across network links. Systems choose strong linearizability for financial balances or eventual consistency for feeds to maximize throughput.",
    whenItFails: "Fails during network partitions when systems must either refuse requests (favoring consistency) or serve divergent data (favoring availability).",
    tradeoffs: {
      pros: [
        "Strong consistency eliminates stale reads and prevents double-spending",
        "Eventual consistency maximizes system availability and write latency",
        "Tunable consistency allows matching guarantees to specific domain requirements",
      ],
      cons: [
        "Strong consistency adds synchronous cross-node network round-trips",
        "Eventual consistency requires resolving concurrent conflicts (LWW / CRDTs)",
        "Partition handling requires complex failover and reconciliation logic",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Designing multi-node state stores balancing correctness against latency (e.g. balances vs likes).",
      sampleDialogue: "'We use strong linearizable consistency via synchronous quorum for ledger transactions, but eventual consistency with monotonic read guarantees for user social timelines.'",
    },
  },

  "rate-limiting": {
    id: "rate-limiting",
    name: "API Rate Limiting & Throttling",
    category: "resilience",
    oneLiner: "Controlling request traffic rates to protect backend services from abuse and resource starvation.",
    eli5Analogy: {
      title: "The Subway Turnstile",
      story: "A subway turnstile that only allows a fixed number of riders through per minute so the platform never dangerously crushes.",
    },
    visualFlow: `[ Client Request ] ──► [ Rate Limiter (Token Bucket / Redis) ] ──► [ App / 429 Too Many Requests ]`,
    whyItWorks: "Rate limiters evaluate incoming requests against quota algorithms (token bucket, sliding window counter) in Redis or API gateways, returning HTTP 429 when thresholds are exceeded.",
    whenItFails: "Fails when distributed limiters bottleneck on centralized Redis locks or when misconfigured limits reject legitimate users during flash sales.",
    tradeoffs: {
      pros: [
        "Defends against Denial of Service (DoS) and brute-force credential stuffing",
        "Guarantees fair resource allocation among competing multi-tenant clients",
        "Prevents cascade failures by capping ingress traffic at system capacity",
      ],
      cons: [
        "Centralized rate limit counters add ~1ms latency per incoming request",
        "Inaccurate limit tuning risks blocking legitimate client spikes",
        "Distributed race conditions require Lua scripts or sliding window math",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Protecting public endpoints, tiering API access, and preventing downstream resource exhaustion.",
      sampleDialogue: "'We implement a sliding window counter in Redis with an atomic Lua script at our API gateway, enforcing 100 requests per minute per IP and returning 429 with Retry-After headers.'",
    },
  },

  "circuit-breaker": {
    id: "circuit-breaker",
    name: "Circuit Breaker Pattern",
    category: "resilience",
    oneLiner: "Failing fast to stop a struggling downstream dependency from crashing your entire platform.",
    eli5Analogy: {
      title: "The Electrical Fuse Box Analogy",
      story: "An electrical fuse in your basement that trips instantly when a circuit overheats, preventing a fire from spreading through the whole house.",
    },
    visualFlow: `[ App Call ] ──[ Closed: Normal ]──► [ Upstream Service ] ──(Failures Cross Threshold)──► [ Open: Fast Fallback ]`,
    whyItWorks: "When a third-party dependency slows down, calling threads wait for timeouts, exhausting thread pools. A circuit breaker trips OPEN after consecutive failures, returning immediate fallbacks in <1ms.",
    whenItFails: "Fails when fallback defaults are missing or misconfigured, or when half-open probe storms immediately re-overload a recovering dependency.",
    tradeoffs: {
      pros: [
        "Prevents thread starvation and cascading failures across microservices",
        "Provides predictable fallback user experiences during partial outages",
        "Gives struggling downstream services breathing room to recover",
      ],
      cons: [
        "Requires authoring and maintaining sensible fallback responses",
        "Tuning failure thresholds and half-open reset timers requires operational care",
        "Users experience degraded functionality while the circuit remains open",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Any synchronous inter-service communication or third-party API integration (e.g. Stripe, Twilio).",
      sampleDialogue: "'We wrap external partner calls in Resilience4j circuit breakers. If error rates exceed 30% over 10 seconds, the circuit opens, returning cached fallbacks and preventing worker thread exhaustion.'",
    },
  },

  "connection-pooling": {
    id: "connection-pooling",
    name: "Database Connection Pooling",
    category: "database",
    oneLiner: "Maintaining a reusable cache of open database connections to eliminate per-request TCP/TLS handshake overhead.",
    eli5Analogy: {
      title: "The Fleet Taxi Stand",
      story: "A taxi stand keeping a fleet of idling cabs ready for passengers instead of buying and assembling a new car for every trip.",
    },
    visualFlow: `[ App Thread ] ──► [ Connection Pooler (PgBouncer) ] ──(Reused Socket)──► [ Database Server ]`,
    whyItWorks: "Establishing a PostgreSQL connection forks a backend process and costs ~30–50ms. A connection pooler (like PgBouncer or HikariCP) keeps persistent sockets open, renting them to active queries for milliseconds.",
    whenItFails: "Fails when slow queries hold connections indefinitely, exhausting the pool and causing callers to queue until connection timeouts fire.",
    tradeoffs: {
      pros: [
        "Eliminates per-request TCP, TLS, and database process authentication latency",
        "Shields database servers from crashing under connection spikes (e.g. 10,000 clients)",
        "Optimizes database memory by capping concurrent backend worker processes",
      ],
      cons: [
        "Pool starvation occurs if long-running queries or transactions hold connections",
        "Transaction-mode pooling disallows session-level state (e.g. prepared statements)",
        "Adds another proxy layer to monitor, size, and maintain in production",
      ],
    },
    interviewPlaybook: {
      whenToUse: "High-concurrency web applications connecting to relational databases like PostgreSQL or MySQL.",
      sampleDialogue: "'Because PostgreSQL allocates ~10MB per backend process, we put PgBouncer in transaction pooling mode between our API fleet and DB, multiplexing 5,000 app threads into 100 dedicated database connections.'",
    },
  },

  backpressure: {
    id: "backpressure",
    name: "Backpressure & Flow Control",
    category: "resilience",
    oneLiner: "Signaling upstream producers to slow down transmission when downstream consumers approach capacity limits.",
    eli5Analogy: {
      title: "The Factory Conveyor Halt",
      story: "A factory conveyor belt sensor that halts upstream assembly when the packaging station gets jammed, stopping products from spilling onto the floor.",
    },
    visualFlow: `[ Fast Producer ] ──► [ Buffer Watermark Monitor ] ──(Signal Slowdown / 429)──► [ Throttled Upstream ]`,
    whyItWorks: "When consumers cannot process messages as fast as producers emit them, buffers grow until memory is exhausted. Backpressure communicates buffer high-watermarks upstream using TCP windowing or reactive streams.",
    whenItFails: "Fails if producers ignore backpressure signals or if client retry loops amplify the pressure instead of respecting backoff headers.",
    tradeoffs: {
      pros: [
        "Prevents consumer memory exhaustion (OOM crashes) during peak bursts",
        "Gracefully degrades system throughput instead of experiencing total collapse",
        "Protects downstream storage engines from unmanageable write storms",
      ],
      cons: [
        "Requires end-to-end support across the entire communication pipeline",
        "May cause upstream buffers or client request queues to fill instead",
        "Clients experience throttled latency or rate limit rejections during bursts",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Stream pipelines, event consumers, and high-throughput inter-service messaging.",
      sampleDialogue: "'We implement reactive stream backpressure using bounded buffers. When queue depth crosses 80%, we return 429 responses with exponential backoff headers to throttle upstream ingestion.'",
    },
  },

  idempotency: {
    id: "idempotency",
    name: "Idempotency Keys & Deduplication",
    category: "consistency",
    oneLiner: "Ensuring an operation produces the identical outcome even when retried multiple times due to network glitches.",
    eli5Analogy: {
      title: "The Parcel Tracking Barcode",
      story: "A parcel tracking barcode that postal workers scan so scanning the same box twice never charges or ships the package twice.",
    },
    visualFlow: `[ Client Mutation (ID: key_123) ] ──► [ Idempotency Store (Redis SETNX) ] ──► [ Execute Once or Return Cached Response ]`,
    whyItWorks: "Network timeouts leave callers uncertain if a mutation succeeded. By passing a unique Idempotency-Key, the server records the key atomically; duplicates skip execution and return the cached result.",
    whenItFails: "Fails when client retry keys collide, when transactions fail halfway through leaving locks stuck, or when key TTLs expire before late retries arrive.",
    tradeoffs: {
      pros: [
        "Guarantees safe network retries without duplicate payments or orders",
        "Prevents race conditions from concurrent duplicate client submissions",
        "Enables robust distributed transaction coordination across microservices",
      ],
      cons: [
        "Requires fast, persistent key storage with strict atomic operations",
        "Handling concurrent in-flight retries requires lock timeouts and polling",
        "Storage footprint grows with key retention windows and response payloads",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Financial transactions, order processing, and any non-idempotent HTTP POST mutations.",
      sampleDialogue: "'All payment mutations require an Idempotency-Key header. We use Redis SETNX with a 24-hour TTL to ensure duplicate webhook or client retries return the original processed receipt without re-executing charges.'",
    },
  },

  "multi-region": {
    id: "multi-region",
    name: "Multi-Region Active-Active Deployment",
    category: "scaling",
    oneLiner: "Running applications across geographically distinct cloud regions to survive total regional disasters.",
    eli5Analogy: {
      title: "The Twin International Headquarters",
      story: "Running twin company headquarters in different countries with synchronised filing cabinets so a blackout in one city doesn't halt global operations.",
    },
    visualFlow: `[ Global DNS / Anycast ] ──► [ Active Region A / B ] ──(Cross-Region Replication)──► [ Standby / Active Peer Region ]`,
    whyItWorks: "Cloud datacenters experience fiber cuts, weather catastrophes, and control plane outages. Multi-region deployments route users via GeoDNS or Anycast to the nearest active region while replicating data asynchronously.",
    whenItFails: "Fails with split-brain data divergence during cross-ocean link cuts, or when failover traffic swamps the surviving region's capacity.",
    tradeoffs: {
      pros: [
        "Guarantees business continuity even if an entire cloud region goes dark",
        "Minimizes client latency by routing users to their closest geographic region",
        "Enables compliance with regional data residency and sovereignty laws",
      ],
      cons: [
        "Cross-region data replication latency creates consistency and conflict challenges",
        "Significantly increases infrastructure costs and cloud egress transfer fees",
        "Complex operational overhead during traffic draining and regional failover",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Mission-critical applications requiring 99.99%+ availability and disaster recovery guarantees.",
      sampleDialogue: "'We deploy active-active across us-east and eu-west using Amazon Aurora Global Database with asynchronous cross-region replication and Route 53 latency-based routing with automated health check failover.'",
    },
  },

  "health-checks": {
    id: "health-checks",
    name: "Health Checks & Probes (Liveness / Readiness)",
    category: "resilience",
    oneLiner: "Automated probes verifying application vitality to isolate failing nodes before traffic reaches them.",
    eli5Analogy: {
      title: "The Flight Controller Check-In",
      story: "A flight controller checking in with pilots every 10 seconds and diverting incoming traffic if a plane stops responding.",
    },
    visualFlow: `[ Monitor Agent ] ──(HTTP GET /healthz)──► [ Target Instance ] ──► [ Drain & Evict Target on Consecutive Failures ]`,
    whyItWorks: "Operating systems can run while applications deadlock. Orchestrators use lightweight liveness probes (is the process alive?) and readiness probes (can it take traffic?) to direct load only to healthy containers.",
    whenItFails: "Fails with cascading mass eviction if deep health checks inspect external dependencies (like the database) rather than local process health.",
    tradeoffs: {
      pros: [
        "Automatically isolates failing or deadlocked nodes without human intervention",
        "Prevents traffic from hitting newly created instances before warm-up completes",
        "Enables zero-downtime rolling deployments by coordinating traffic cutovers",
      ],
      cons: [
        "Deep health checks testing dependencies cause catastrophic mass-node evictions",
        "Flapping health checks cause frequent route rebalancing and connection churn",
        "High-frequency probe intervals consume non-trivial server CPU and logs",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Containerized fleets, Kubernetes pods, and autoscaled load balancer target groups.",
      sampleDialogue: "'We decouple liveness from readiness: liveness checks only local process responsiveness, while readiness verifies local cache warming and connection pool health, avoiding cascading evictions when upstream databases slow down.'",
    },
  },

  "cap-pacelc": {
    id: "cap-pacelc",
    name: "CAP & PACELC Theorem",
    category: "consistency",
    oneLiner: "The fundamental law governing consistency, availability, and latency trade-offs in distributed systems.",
    eli5Analogy: {
      title: "The Emergency Branch Rulebook",
      story: "A business decision rulebook stating whether branches stay open with old prices or close their doors whenever the phone lines go down.",
    },
    visualFlow: `[ Network Partition / Normal ] ──► [ Policy Evaluator (PACELC) ] ──► [ Yield Consistency or Yield Latency/Availability ]`,
    whyItWorks: "Network partitions (P) inevitably occur. If partitioned, a system chooses Availability (PA) or Consistency (PC). Else, during normal operation (E), it chooses Latency (EL) or Consistency (EC).",
    whenItFails: "Fails when system architects assume they can have both strong consistency and zero latency across wide-area networks without trade-offs.",
    tradeoffs: {
      pros: [
        "Provides a rigorous mental framework for database architecture selection",
        "Prevents unrealistic expectations of simultaneous zero latency and strong consistency",
        "Clarifies failure modes during wide-area network fiber cuts",
      ],
      cons: [
        "Forces deliberate compromises between customer-facing latency and data correctness",
        "Often oversimplified into a binary choice rather than nuanced per-table policies",
        "Requires deep engineering to handle split-brain partitions cleanly",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Selecting databases (DynamoDB vs Cassandra vs Spanner) and defining multi-region replication strategy.",
      sampleDialogue: "'Per PACELC, DynamoDB is a PA/EL system optimizing for sub-10ms latency during normal operations, whereas Google Cloud Spanner is PC/EC choosing strong consistency via TrueTime synchronized clocks.'",
    },
  },

  "consensus-quorums": {
    id: "consensus-quorums",
    name: "Consensus Protocols & Quorums",
    category: "consistency",
    oneLiner: "Algorithms ensuring distributed nodes agree on a single source of truth despite node crashes.",
    eli5Analogy: {
      title: "The Boardroom Majority Vote",
      story: "A committee of five board members where any decision requires at least three votes, ensuring no two conflicting decisions can ever both pass.",
    },
    visualFlow: `[ Leader Proposes Write ] ──► [ Node Cluster (N Nodes) ] ──(Major Majority Ack: (N/2)+1)──► [ Commit & Apply ]`,
    whyItWorks: "Consensus algorithms (Raft, Paxos) require a strict majority quorum ((N/2) + 1 nodes) to commit writes and elect leaders. Overlapping quorums ensure split-brain partitions can never commit conflicting states.",
    whenItFails: "Fails when network partitions isolate nodes so no group can form a strict majority quorum, halting all write operations.",
    tradeoffs: {
      pros: [
        "Guarantees linearizable order of state changes without split-brain anomalies",
        "Survives minority node failures automatically (e.g. 2 nodes down in a 5-node cluster)",
        "Serves as the foundation for distributed locks, metadata, and service discovery",
      ],
      cons: [
        "Write latency is bound by the slowest node in the majority quorum round-trip",
        "Requires an odd number of nodes (3 or 5) for optimal failure tolerance",
        "Cluster becomes completely read-only or halts if majority connectivity is lost",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Distributed coordination, leader election, metadata storage (etcd, ZooKeeper, Raft).",
      sampleDialogue: "'We deploy etcd in a 5-node Raft cluster across 3 availability zones. Any leader proposal requires acknowledgment from at least 3 nodes, surviving the loss of up to 2 nodes without data corruption.'",
    },
  },

  "storage-engines": {
    id: "storage-engines",
    name: "Storage Engines (B-Tree vs LSM-Tree)",
    category: "database",
    oneLiner: "The low-level disk data structures optimizing either read latency or sequential write throughput.",
    eli5Analogy: {
      title: "The Indexed Ledger vs Daily Diary",
      story: "Choosing between a neatly indexed filing cabinet for quick random searches (B-Tree) and an append-only log ledger for blazing fast writes (LSM-Tree).",
    },
    visualFlow: `[ Write Query ] ──► [ In-Memory Memtable + WAL ] ──(Flush & Merge)──► [ Immutable SSTables on Disk ]`,
    whyItWorks: "B-Trees update in-place with random I/O, ideal for point reads. LSM-Trees (Log-Structured Merge-Trees) buffer writes in memory and append sequentially to immutable SSTables, maximizing write throughput.",
    whenItFails: "Fails when write amplification or compaction debt overwhelms disk I/O on LSM-trees, or random page churn fragments B-trees under heavy writes.",
    tradeoffs: {
      pros: [
        "LSM-Trees maximize write throughput by converting random writes to sequential I/O",
        "B-Trees provide predictable, low-latency point and range reads for relational queries",
        "Allows pairing engine architecture to specialized read-heavy or write-heavy workloads",
      ],
      cons: [
        "LSM background compaction causes periodic disk I/O latency spikes",
        "B-Tree write amplification causes flash memory wear and random disk page writes",
        "Engine selection is typically permanent without complete database migration",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Choosing database engines for write-intensive time-series/logs (RocksDB/Cassandra) vs general relational (Postgres).",
      sampleDialogue: "'For our write-heavy metric ingestion (500k writes/sec), we use an LSM-based engine like Cassandra or RocksDB to leverage sequential append-only writes, avoiding B-Tree random write amplification.'",
    },
  },

  "id-generation": {
    id: "id-generation",
    name: "Distributed Unique ID Generation (Snowflake)",
    category: "database",
    oneLiner: "Generating globally unique, time-sortable 64-bit identifiers without centralized database coordination.",
    eli5Analogy: {
      title: "The Courthouse Timestamp Seal",
      story: "A courthouse stamping every filed legal document with a precise millisecond timestamp, machine number, and sequence counter.",
    },
    visualFlow: `[ ID Request ] ──► [ Snowflake Generator (Worker ID) ] ──► [ 64-bit k-ordered Unique Integer (Time + Node + Seq) ]`,
    whyItWorks: "Centralized AUTO_INCREMENT bottlenecks databases. Twitter Snowflake bit-packs 41 bits of timestamp, 10 bits of worker ID, and 12 bits of local sequence into a 64-bit integer, generating 4,096 IDs/ms per node locally.",
    whenItFails: "Fails when server clocks drift backwards (NTP skew) without safety checks, or when worker node IDs collide in autoscaling environments.",
    tradeoffs: {
      pros: [
        "Generates millions of IDs per second per machine with zero network coordination",
        "IDs are roughly time-ordered (k-sorted), improving B-Tree index insertion locality",
        "Compact 64-bit representation uses half the storage of 128-bit UUID strings",
      ],
      cons: [
        "Vulnerable to NTP clock backwards drift, requiring crash-guards or hold logic",
        "Requires static or coordinated assignment of worker machine IDs (0–1023)",
        "Exposes creation timestamp and node metadata within the generated ID value",
      ],
    },
    interviewPlaybook: {
      whenToUse: "High-volume distributed databases requiring primary keys (tweets, orders, messages, tracking events).",
      sampleDialogue: "'We implement a Snowflake-based ID generator producing 64-bit integers composed of 41-bit millisecond timestamp, 10-bit machine ID, and 12-bit sequence, maintaining indexing efficiency across sharded databases.'",
    },
  },

  "search-indexing": {
    id: "search-indexing",
    name: "Inverted Search Indexing",
    category: "database",
    oneLiner: "Mapping terms to document locations for sub-second full-text and fuzzy search across millions of records.",
    eli5Analogy: {
      title: "The Textbook Index",
      story: "The alphabetical index in the back of a textbook mapping every keyword to the exact page numbers where it appears.",
    },
    visualFlow: `[ Document Ingestion ] ──► [ Inverted Index Tokenizer ] ──► [ Postings List Lookup (<10ms) ]`,
    whyItWorks: "Relational LIKE queries perform full table scans. Inverted indexes (Elasticsearch, OpenSearch) tokenize text into terms and maintain postings lists of matching document IDs, evaluating complex boolean queries in milliseconds.",
    whenItFails: "Fails when asynchronous index ingestion falls behind primary database updates, leading to search results returning deleted or stale records.",
    tradeoffs: {
      pros: [
        "Enables sub-10ms full-text, fuzzy, and faceted search across billions of documents",
        "Offloads expensive analytical text scanning queries from primary transaction databases",
        "Supports relevance scoring algorithms (BM25) and geospatial queries natively",
      ],
      cons: [
        "Dual-write drift: search indexes lag primary database records by seconds",
        "Massive memory and disk storage footprint for auxiliary postings lists",
        "Complex cluster management and shard rebalancing at terabyte scale",
      ],
    },
    interviewPlaybook: {
      whenToUse: "E-commerce product catalog search, log analytics (ELK), document discovery, and autocomplete.",
      sampleDialogue: "'We stream database change-data-capture (CDC) events via Debezium and Kafka into OpenSearch, updating an inverted index with BM25 scoring while shielding Postgres from text search scans.'",
    },
  },

  "stream-processing": {
    id: "stream-processing",
    name: "Real-Time Stream Processing",
    category: "scaling",
    oneLiner: "Processing, transforming, and aggregating continuous event streams in real time with sub-second latency.",
    eli5Analogy: {
      title: "The Assembly Line Quality Inspector",
      story: "Inspectors standing along a moving factory conveyor belt inspecting and tagging each item in real time instead of checking daily warehouse batches.",
    },
    visualFlow: `[ Event Stream (Kafka / Kinesis) ] ──► [ Stream Processor (Sliding Window / Flink) ] ──► [ Live Aggregates / Alert Sink ]`,
    whyItWorks: "Batch jobs process data hours after ingestion. Stream engines (Apache Flink, Kafka Streams) maintain managed in-memory state and evaluate sliding time-windows continuously on partitioned event logs.",
    whenItFails: "Fails when out-of-order events exceed watermark delay limits, or when stateful checkpoints swell beyond available memory.",
    tradeoffs: {
      pros: [
        "Provides real-time analytics, fraud detection, and alerting within milliseconds",
        "Eliminates nightly batch ETL bottlenecks by processing data continuously",
        "Handles sliding and tumbling time-window aggregations across millions of events",
      ],
      cons: [
        "Managing out-of-order and late-arriving events requires complex watermarking",
        "Stateful checkpointing requires high-throughput distributed storage (S3/HDFS)",
        "Debugging streaming pipeline bugs requires replaying raw event partitions",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Real-time fraud detection, financial trade processing, live user analytics, and IoT telemetry.",
      sampleDialogue: "'We process financial transaction streams using Apache Flink on Kafka event partitions, maintaining 5-minute sliding state windows with RocksDB state storage to flag fraud patterns in real time.'",
    },
  },

  observability: {
    id: "observability",
    name: "Full-Stack Observability (Metrics, Logs, Traces)",
    category: "resilience",
    oneLiner: "Correlating metrics, structured logs, and distributed traces to diagnose unexpected production failures.",
    eli5Analogy: {
      title: "The Airplane Black Box Dashboard",
      story: "An airplane cockpit dashboard correlating radar, engine temperature, and flight black-box recordings to pinpoint exactly which system malfunctioned.",
    },
    visualFlow: `[ Distributed Traces & Metrics ] ──► [ Correlation Pipeline (TraceID) ] ──► [ High-Cardinality Alerting & Root Cause Analysis ]`,
    whyItWorks: "Microservice failures cascade unpredictably. Observability injects unique trace contexts (W3C TraceContext) across service boundaries, correlating latency metrics, error counters, and structured logs per request.",
    whenItFails: "Fails when metric cardinality explodes (e.g. tracking user IDs in tags), or when high-volume trace sampling drops the exact outlier requests causing outages.",
    tradeoffs: {
      pros: [
        "Pinpoints the exact microservice and code bottleneck causing P99 latency spikes",
        "Correlates business transactions end-to-end across polyglot microservice boundaries",
        "Accelerates Mean Time to Detection (MTTD) and Resolution (MTTR) during outages",
      ],
      cons: [
        "High telemetry ingestion and storage costs at petabyte scale",
        "High-cardinality label explosions can crash timeseries databases like Prometheus",
        "Trace sampling strategies risk missing infrequent but severe customer errors",
      ],
    },
    interviewPlaybook: {
      whenToUse: "All distributed architectures, microservices, and high-availability cloud platforms.",
      sampleDialogue: "'We propagate W3C TraceContext headers across our service mesh with OpenTelemetry, shipping RED metrics to Prometheus and traces to Jaeger with tail-based sampling on errors and slow queries.'",
    },
  },

  "auth-at-scale": {
    id: "auth-at-scale",
    name: "Authentication & Authorization at Scale",
    category: "networking",
    oneLiner: "Cryptographically verifying identity and permissions at the edge without database bottlenecks.",
    eli5Analogy: {
      title: "The Cryptographic Wristband",
      story: "A concert wristband stamped with cryptographic seals that bouncers can verify with their eyes without calling the box office for every attendee.",
    },
    visualFlow: `[ Auth Gateway (JWT Token Verification) ] ──► [ Stateless Public Key Check ] ──(Revocation Cache Lookup)──► [ Downstream Microservices ]`,
    whyItWorks: "Checking central session tables per request creates massive database contention. Asymmetric JWTs (RS256) allow API gateways and microservices to verify authenticity statelessly using cached public keys.",
    whenItFails: "Fails when stateless tokens cannot be revoked instantly after security breaches without central blacklist queries that recreate the database bottleneck.",
    tradeoffs: {
      pros: [
        "Stateless token verification scales horizontally across all edge gateways",
        "Eliminates per-request database lookups for session validation",
        "Transports verified claims and roles directly within signed token payloads",
      ],
      cons: [
        "Immediate token revocation requires distributed bloom filters or blacklist caches",
        "Token theft exposes resources until the expiration time (TTL) lapses",
        "Large token claims increase HTTP request header overhead on every call",
      ],
    },
    interviewPlaybook: {
      whenToUse: "Securing microservices, single page applications, public APIs, and mobile clients at scale.",
      sampleDialogue: "'We issue short-lived 15-minute asymmetric JWTs verified statelessly at our API gateway using rotating public keys, paired with Redis-backed revocation lists for immediate security logout invalidation.'",
    },
  },

  // Supporting utility intel
  singleflight: {
    id: "singleflight",
    name: "Singleflight (Request Coalescing)",
    category: "caching",
    oneLiner: "Merging concurrent duplicate requests for the same missing key into one single database query.",
    eli5Analogy: {
      title: "The Office Carpool Analogy",
      story: "One person volunteers to drive to the coffee shop and take everyone's orders instead of 100 coworkers driving 100 separate cars to the same drive-thru.",
    },
    visualFlow: `[ 5,000 Concurrent Requests ] ──► [ Singleflight Barrier ] ──(1 Query)──► [ Database ]`,
    whyItWorks: "When a popular cache key expires, thousands of concurrent requests miss simultaneously (Thundering Herd). Singleflight uses an in-process mutex and promise map so only the first request queries the DB; the others await and share that result.",
    whenItFails: "Fails if the single coalesced database query hangs, causing all waiting client requests to block together until timeouts expire.",
    tradeoffs: {
      pros: [
        "Caps stampedes at one query per key per server instance without pre-warming",
        "Requires no external infrastructure (runs in application memory)",
        "Protects relational databases from connection exhaustion on hot key expiration",
      ],
      cons: [
        "Only coalesces within the same server container unless backed by distributed locks",
        "If the single database query stalls, all waiting client threads stall together",
        "Requires strict timeout guards to prevent thread pool starvation",
      ],
    },
    interviewPlaybook: {
      whenToUse: "High-concurrency systems vulnerable to hot-key expiration (flash sales, breaking news).",
      sampleDialogue: "'To defend against cache stampedes on viral breaking news, we implement singleflight coalescing in application memory so 10,000 concurrent requests share a single database query.'",
    },
  },
};

export function getConceptIntel(id: string): ConceptIntel | undefined {
  return CONCEPT_INTEL_REGISTRY[id];
}

/** The first candidate id that has intel, or null so callers can hide the button. */
export function resolveConceptIntelId(...candidates: (string | undefined)[]): string | null {
  return candidates.find((id): id is string => !!id && id in CONCEPT_INTEL_REGISTRY) ?? null;
}
