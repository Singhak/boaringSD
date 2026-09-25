import { InterviewProblem } from "@/types";

export const INTERVIEW_PROBLEMS: InterviewProblem[] = [
  {
    id: "interview-url-shortener",
    title: "Design URL Shortener (TinyURL)",
    tier: "Tier 1: Beginner",
    difficulty: "Beginner",
    durationMinutes: 10,
    rewardXp: 200,
    scenario:
      "Design a production-ready, globally distributed URL shortening service like TinyURL / bit.ly. System handles 100M new URLs per month with an overwhelming 100:1 Read-to-Write traffic ratio.",
    trafficScale: "100M URLs/month (~500 writes/sec, 50,000 read redirects/sec)",
    latencyConstraint: "P99 Redirect Latency < 25ms, Availability: 99.99%",
    storageScale: "100M * 500 bytes = 50GB new data/month (~3TB in 5 years)",
    hints: [
      "Traffic is overwhelmingly read-heavy (100 reads per 1 write). Direct database lookups will collapse under 50k QPS.",
      "A Single Server setup contains a critical Single Point of Failure (SPOF).",
      "Think about placing an in-memory Key-Value cache (Redis/Memcached) for hot redirect keys, backed by a Load Balancer.",
    ],
    checklist: [
      { id: "chk-1", label: "Redundant compute behind a Load Balancer (No SPOF)", category: "reliability" },
      { id: "chk-2", label: "High-speed RAM Cache for hot redirect URLs (sub-10ms)", category: "non_functional" },
      { id: "chk-3", label: "Relational or NoSQL store for long-term URL durability", category: "functional" },
      { id: "chk-4", label: "Stateless application servers for seamless autoscaling", category: "reliability" },
    ],
    benchmarkArchitecture: {
      nodes: [
        { id: "b-client", label: "Global Clients", type: "client" },
        { id: "b-lb", label: "Cloud Load Balancer", type: "load_balancer" },
        { id: "b-srv", label: "Stateless App Servers (x3)", type: "server" },
        { id: "b-cache", label: "Redis Cluster (Cache-Aside)", type: "cache" },
        { id: "b-db", label: "Postgres Master DB", type: "database" },
        { id: "b-replica", label: "Read Replica", type: "replica" },
      ],
      summary:
        "Standard production architecture for URL Shortening: Global clients route via DNS and Anycast LB to stateless API worker containers. Hot URL hashes hit Redis RAM cache with a 98% hit rate. Misses query Postgres and write-back to cache.",
      spofVulnerabilitiesWithout: [
        "Without Load Balancer: All client traffic concentrates onto one socket listener. When it crashes, total downtime ensues.",
        "Without Cache: 50,000 DB queries/sec leads to connection pool exhaustion and database disk IOPS lockup.",
        "Without Read Replicas / Multi-AZ: Single database disk corruption leads to irrevocable service outage.",
      ],
    },
    requiredDesign: {
      needsLB: true,
      minServers: 2,
      needsCache: true,
      needsDatabase: true,
      needsReplica: true,
      needsCDN: false,
      needsQueue: false,
    },
    followUpQuestions: [
      {
        id: "fu-url-1",
        interviewerPrompt:
          "Interviewer Follow-up: 'What happens if two concurrent users submit the exact same long URL at the exact same millisecond? How do you prevent duplicate primary key collisions in your short key generator?'",
        options: [
          {
            id: "fu-opt-1",
            text: "Use a centralized Token/Counter Range Service (Zookeeper/Redis counter) where each worker receives a distinct pre-allocated 10,000 ID block, then Base62 encode the unique counter.",
            isCorrect: true,
            feedback: "Outstanding answer! Distributing partitioned counter ranges eliminates race conditions without distributed row locks.",
          },
          {
            id: "fu-opt-2",
            text: "Synchronize all application servers with a global distributed database lock on the entire URL table.",
            isCorrect: false,
            feedback: "Global table locks serialize all traffic and cause massive latency spikes and connection timeouts.",
          },
          {
            id: "fu-opt-3",
            text: "Generate Math.random() in client JavaScript and trust there will never be collisions.",
            isCorrect: false,
            feedback: "Birthday paradox guarantees high collision probability at 100M URLs scale.",
          },
        ],
      },
      {
        id: "fu-url-2",
        interviewerPrompt:
          "Interviewer Follow-up: 'Should we return HTTP 301 Permanent Redirect or HTTP 302 Temporary Redirect for our short links?'",
        options: [
          {
            id: "fu-opt-2-1",
            text: "HTTP 302 Found: Browser re-contacts our server on every click, allowing accurate real-time click telemetry and analytics tracking.",
            isCorrect: true,
            feedback: "Spot on! 301 is cached indefinitely by client browsers, which blinds your analytics engine from logging recurring clicks.",
          },
          {
            id: "fu-opt-2-2",
            text: "HTTP 301 Moved Permanently: Because we never care about counting link clicks or tracking analytics.",
            isCorrect: false,
            feedback: "URL shorteners almost always monetize through analytics and click tracking; 301 prevents counting repeat clicks.",
          },
        ],
      },
    ],
  },
  {
    id: "interview-twitter-timeline",
    title: "Design Twitter Feed (Timeline & Fanout)",
    tier: "Tier 2: Intermediate",
    difficulty: "Intermediate",
    durationMinutes: 12,
    rewardXp: 250,
    scenario:
      "Design the home timeline feed generation for Twitter (X). 300 Million Daily Active Users (DAU), 500M tweets posted per day, users expect home feed loads in under 200ms with real-time fan-out.",
    trafficScale: "6,000 tweets/sec write, 300,000 timeline feed reads/sec",
    latencyConstraint: "Timeline fetch < 200ms, Fanout latency < 5 seconds",
    storageScale: "500M tweets * 300 bytes = 150GB raw text/day + media CDN pointers",
    hints: [
      "Calculating timeline on the fly (SELECT * FROM tweets JOIN follows...) at 300k QPS will crash any relational database.",
      "Consider Fan-out on write (push model) pre-computing follower feeds into Redis lists.",
      "Handle high-profile celebrity accounts (e.g. 100M followers) with a hybrid pull model to prevent fanout queue explosion.",
    ],
    checklist: [
      { id: "chk-tw-1", label: "Reverse proxy load balancing incoming user sessions", category: "reliability" },
      { id: "chk-tw-2", label: "In-memory timeline cache holding latest 800 tweet IDs per active user", category: "non_functional" },
      { id: "chk-tw-3", label: "Separation of write pipeline from read feed delivery", category: "functional" },
      { id: "chk-tw-4", label: "Distributed queue or message broker for asynchronous fanout", category: "reliability" },
    ],
    benchmarkArchitecture: {
      nodes: [
        { id: "bt-client", label: "Mobile / Web Users", type: "client" },
        { id: "bt-cdn", label: "Edge CDN (Media)", type: "cdn" },
        { id: "bt-lb", label: "Layer 7 Load Balancers", type: "load_balancer" },
        { id: "bt-srv", label: "Timeline API Fleet (x3)", type: "server" },
        { id: "bt-queue", label: "Kafka Fanout Queue", type: "queue" },
        { id: "bt-cache", label: "Redis Timeline Cache", type: "cache" },
        { id: "bt-db", label: "Sharded Tweet Database", type: "database" },
        { id: "bt-replica", label: "Read Replicas", type: "replica" },
      ],
      summary:
        "The Fanout-on-Write model pushes tweet IDs directly into followers' pre-computed Redis timeline lists via Kafka workers. Reading the home timeline becomes an O(1) Redis LRANGE operation instead of expensive multi-table database joins.",
      spofVulnerabilitiesWithout: [
        "Without In-Memory Feed Cache: Complex SQL joins across millions of follow edges will timeout database connections.",
        "Without Redundant Servers & LB: Peak events (Super Bowl, World Cup) immediately overwhelm single compute node.",
        "Without Message Queue: Synchronously fan-outing to 10M followers freezes HTTP request threads.",
      ],
    },
    requiredDesign: {
      needsLB: true,
      minServers: 3,
      needsCache: true,
      needsDatabase: true,
      needsReplica: true,
      needsCDN: true,
      needsQueue: true,
    },
    followUpQuestions: [
      {
        id: "fu-tw-1",
        interviewerPrompt:
          "Interviewer Follow-up: 'When Elon Musk or Cristiano Ronaldo (100M+ followers) tweets, a pure Fan-out-on-Write push model requires writing 100M Redis entries, creating a 5-minute queue backlog. How do you solve the Celebrity Fan-out problem?'",
        options: [
          {
            id: "fu-tw-opt-1",
            text: "Hybrid Push/Pull Model: Never push celebrity tweets into follower caches. When normal users read their timeline, pull celebrity tweets on the fly and merge them into the feed.",
            isCorrect: true,
            feedback: "Canonical staff engineer answer! Push for normal users (<5,000 followers) and dynamic pull-merge for high-follower celebrities.",
          },
          {
            id: "fu-tw-opt-2",
            text: "Temporarily rate limit the celebrity so they are only allowed to post once per week.",
            isCorrect: false,
            feedback: "Violates product requirements. The system architecture must accommodate celebrity usage patterns.",
          },
          {
            id: "fu-tw-opt-3",
            text: "Provision 50,000 additional PostgreSQL servers just to handle the write burst synchronously.",
            isCorrect: false,
            feedback: "Prohibitively expensive and does not solve the fundamental fan-out write amplification.",
          },
        ],
      },
      {
        id: "fu-tw-2",
        interviewerPrompt:
          "Interviewer Follow-up: 'Should we store the full tweet text and user profile JSON inside the Redis timeline cache, or just tweet IDs?'",
        options: [
          {
            id: "fu-tw-opt-2-1",
            text: "Store only Tweet IDs in the user feed list, and hydrate tweet content and author metadata via a multi-get from Memcached/Redis.",
            isCorrect: true,
            feedback: "Exactly right! Storing full text in every follower's list causes massive memory duplication. Storing 64-bit IDs keeps RAM consumption minimal.",
          },
          {
            id: "fu-tw-opt-2-2",
            text: "Store full 1080p video binary blobs inside each user's Redis feed list.",
            isCorrect: false,
            feedback: "Storing media blobs in RAM lists will crash the cache cluster with Out-Of-Memory (OOM) errors.",
          },
        ],
      },
    ],
  },
  {
    id: "interview-uber-dispatch",
    title: "Design Uber (Geospatial Ride Dispatch)",
    tier: "Tier 3: Advanced",
    difficulty: "Advanced",
    durationMinutes: 15,
    rewardXp: 300,
    scenario:
      "Design Uber's real-time ride dispatch and location matching engine. 5 Million active drivers streaming GPS pings every 4 seconds, and riders requesting pickup within a 3km radius expecting sub-1 second match dispatch.",
    trafficScale: "1.25M GPS location pings/sec write, 50,000 ride search queries/sec",
    latencyConstraint: "Neighbor search < 50ms, Driver dispatch match < 2 seconds",
    storageScale: "5M active driver coordinates in RAM, persistent trips audit ledger",
    hints: [
      "Relational SQL B-Tree indexes on (latitude, longitude) cannot handle 1.25M updates/sec.",
      "Use spatial indexing algorithms like GeoHash, Google S2 Cells, or In-Memory QuadTrees.",
      "Decouple high-velocity location telemetry from transactional trip booking state transitions.",
    ],
    checklist: [
      { id: "chk-ub-1", label: "Layer 4/7 Load Balancers terminating TCP/WebSocket connections", category: "reliability" },
      { id: "chk-ub-2", label: "In-memory geospatial store (Redis Geo/QuadTree) for live driver coordinates", category: "non_functional" },
      { id: "chk-ub-3", label: "Stateless Dispatch & Routing fleet with autoscaling", category: "functional" },
      { id: "chk-ub-4", label: "Event broker (Kafka) for ride offers, timeouts, and state machines", category: "reliability" },
    ],
    benchmarkArchitecture: {
      nodes: [
        { id: "bu-client", label: "Riders & Drivers", type: "client" },
        { id: "bu-lb", label: "Load Balancers", type: "load_balancer" },
        { id: "bu-srv", label: "Dispatch Fleet (x4)", type: "server" },
        { id: "bu-cache", label: "Redis Geospatial / QuadTree", type: "cache" },
        { id: "bu-queue", label: "Kafka Event Broker", type: "queue" },
        { id: "bu-db", label: "Postgres Trips Master", type: "database" },
        { id: "bu-replica", label: "Read Replicas", type: "replica" },
      ],
      summary:
        "High-velocity driver GPS pings update Redis GeoSets with sub-millisecond writes. When a rider requests a car, dispatch servers run GEORADIUS to find the nearest 10 available drivers, broadcast ride offers through Kafka, and transition trip states atomically in PostgreSQL.",
      spofVulnerabilitiesWithout: [
        "Without In-Memory Geospatial Cache: 1.2M GPS writes/sec directly to disk crashes database IOPS.",
        "Without Message Broker: Synchronous HTTP dispatch calls hang indefinitely when drivers don't respond.",
        "Without Redundant Compute: Loss of a single dispatch node leaves thousands of active riders stranded.",
      ],
    },
    requiredDesign: {
      needsLB: true,
      minServers: 3,
      needsCache: true,
      needsDatabase: true,
      needsReplica: true,
      needsCDN: false,
      needsQueue: true,
    },
    followUpQuestions: [
      {
        id: "fu-ub-1",
        interviewerPrompt:
          "Interviewer Follow-up: 'Two nearby drivers both click \"Accept Ride\" for the same customer at the exact same millisecond. How do you prevent double-dispatch?'",
        options: [
          {
            id: "fu-ub-opt-1",
            text: "Use atomic conditional updates (Optimistic Locking with version checks in DB or Redis SETNX distributed lock) so only the first request succeeds while the second receives a graceful \"Trip already assigned\" response.",
            isCorrect: true,
            feedback: "Perfect! Distributed locking or atomic state transition `UPDATE trips SET driver_id = $1 WHERE id = $2 AND status = 'REQUESTED'` guarantees mutual exclusion.",
          },
          {
            id: "fu-ub-opt-2",
            text: "Send both drivers to the pickup location and let them decide who takes the rider in person.",
            isCorrect: false,
            feedback: "Unacceptable customer and driver experience.",
          },
          {
            id: "fu-ub-opt-3",
            text: "Reboot the database cluster whenever two drivers accept simultaneously.",
            isCorrect: false,
            feedback: "Causes complete system outage for normal concurrent traffic.",
          },
        ],
      },
      {
        id: "fu-ub-2",
        interviewerPrompt:
          "Interviewer Follow-up: 'Why use Google S2 cells or GeoHash over raw latitude/longitude bounding box SQL queries?'",
        options: [
          {
            id: "fu-ub-opt-2-1",
            text: "Spatial cell algorithms project 2D Earth coordinates into 1D 64-bit integer index hashes (Hilbert curves), turning expensive 2D spatial area scans into fast 1D range queries.",
            isCorrect: true,
            feedback: "Textbook staff engineer insight! S2 / GeoHash spatial locality enables logarithmic neighbor searches.",
          },
          {
            id: "fu-ub-opt-2-2",
            text: "Because S2 cells automatically double the battery life of driver smartphones.",
            isCorrect: false,
            feedback: "Incorrect; spatial indexing is a server-side indexing optimization.",
          },
        ],
      },
    ],
  },
  {
    id: "interview-global-ecommerce",
    title: "Design Global E-Commerce (Multi-Region Commerce)",
    tier: "Tier 4: Staff",
    difficulty: "Staff",
    durationMinutes: 18,
    rewardXp: 400,
    scenario:
      "Design an enterprise-scale global e-commerce platform (like Amazon Prime Day). 50 Million concurrent shoppers across US, Europe, and Asia. Requires $<50ms catalog browsing, zero overselling on flash sales, and active-active multi-region failover resilience.",
    trafficScale: "500,000 catalog RPS, 50,000 checkout orders/sec peak burst",
    latencyConstraint: "Catalog read < 30ms, Checkout response < 200ms globally",
    storageScale: "1 Billion product SKUs, multi-region database replication",
    hints: [
      "Serving global catalog reads requires Multi-Region CDN and Edge Caching.",
      "Single-master database across ocean fiber optic links incurs 200ms+ round-trip latency.",
      "Isolate high-contention flash inventory in local cache partitions with atomic token buckets.",
    ],
    checklist: [
      { id: "chk-ec-1", label: "Global Edge CDN terminating SSL and caching catalog assets", category: "non_functional" },
      { id: "chk-ec-2", label: "Multi-Region Anycast DNS and Layer 7 Load Balancing", category: "reliability" },
      { id: "chk-ec-3", label: "Stateless Checkout & Order Services auto-scaling across regions", category: "functional" },
      { id: "chk-ec-4", label: "In-memory Redis Cluster with atomic Lua scripts for inventory lease", category: "non_functional" },
      { id: "chk-ec-5", label: "Distributed Queue & Transactional Outbox for order fulfillment", category: "reliability" },
      { id: "chk-ec-6", label: "Multi-Region Database with cross-region read replicas", category: "reliability" },
    ],
    benchmarkArchitecture: {
      nodes: [
        { id: "be-client", label: "Global Shoppers", type: "client" },
        { id: "be-cdn", label: "Global Edge CDN", type: "cdn" },
        { id: "be-lb", label: "Anycast Cloud LB", type: "load_balancer" },
        { id: "be-srv", label: "Commerce API Fleet (x4)", type: "server" },
        { id: "be-cache", label: "Multi-AZ Redis Cluster", type: "cache" },
        { id: "be-queue", label: "Kafka Order Streams", type: "queue" },
        { id: "be-db", label: "Distributed Aurora Primary", type: "database" },
        { id: "be-replica", label: "Cross-Region Replicas", type: "replica" },
      ],
      summary:
        "Edge CDN caches product pages worldwide. Traffic routes to closest regional API fleet. Flash-sale inventory reservations are managed atomically in Redis via Lua scripts to avoid database lock contention. Verified checkouts publish to Kafka for async fulfillment, updating cross-region Aurora/Spanner databases.",
      spofVulnerabilitiesWithout: [
        "Without Edge CDN: Product catalog queries cross oceans, exploding P99 latency above 300ms.",
        "Without In-Memory Inventory Reservation: 50,000 concurrent checkout transactions deadlock database row locks.",
        "Without Message Queues: Third-party payment gateway latency spikes immediately back up user checkout threads.",
      ],
    },
    requiredDesign: {
      needsLB: true,
      minServers: 4,
      needsCache: true,
      needsDatabase: true,
      needsReplica: true,
      needsCDN: true,
      needsQueue: true,
    },
    followUpQuestions: [
      {
        id: "fu-ec-1",
        interviewerPrompt:
          "Interviewer Follow-up: 'If Region US-East suffers a total datacenter fiber cut during the peak checkout hour, how do you prevent split-brain inventory discrepancies when failing over to US-West?'",
        options: [
          {
            id: "fu-ec-1-1",
            text: "Strict partition ownership: partition inventory allocation per region upfront (e.g. 500 units US-East, 500 units US-West) or use a globally consensus-backed store (Google Spanner / CockroachDB with Raft/Paxos quorum) that refuses writes rather than allowing split-brain oversell.",
            isCorrect: true,
            feedback: "Masterful architect answer! Either pre-partition inventory quota by geographic datacenter or enforce Raft/Paxos consensus quorums.",
          },
          {
            id: "fu-ec-1-2",
            text: "Let both regions accept unlimited orders without syncing and let customer support deal with angry customers.",
            isCorrect: false,
            feedback: "Violates fundamental zero-overselling requirements.",
          },
          {
            id: "fu-ec-1-3",
            text: "Synchronously query all worldwide databases on every single mouse click.",
            isCorrect: false,
            feedback: "Cross-region synchronous queries across speed-of-light fiber links destroy latency SLOs.",
          },
        ],
      },
      {
        id: "fu-ec-2",
        interviewerPrompt:
          "Interviewer Follow-up: 'How do you guarantee that a network failure between your Order Service and the Payment Gateway doesn't result in charging the customer without creating an order?'",
        options: [
          {
            id: "fu-ec-2-1",
            text: "Transactional Outbox Pattern with Idempotency Keys: Store the pending order and payment intent in the same local ACID transaction, then use a reliable worker with idempotent payment gateway calls.",
            isCorrect: true,
            feedback: "Exact industry standard! Transactional Outbox + unique Idempotency Keys guarantees at-least-once payment delivery with exact-once execution.",
          },
          {
            id: "fu-ec-2-2",
            text: "Retry charging the credit card in an infinite while loop without passing any idempotency tokens.",
            isCorrect: false,
            feedback: "This will repeatedly charge the customer's credit card multiple times for a single order.",
          },
        ],
      },
    ],
  },
];
