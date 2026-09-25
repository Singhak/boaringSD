import { PatternId, PatternObjective, SystemDesignPattern } from "@/types";

// The campaign chapters are the world map; patterns are the semantic layer on top.
// Each pattern links to an existing chapter (and its boss challenge) by ID.

const RUN_OBJECTIVES: PatternObjective[] = [
  { id: "diagnose", stage: "diagnose", label: "Diagnose what is failing" },
  { id: "choose", stage: "choose", label: "Deploy a change that fixes it" },
  { id: "counter", stage: "counter", label: "Handle the second-order tradeoff" },
  { id: "transfer", stage: "transfer", label: "Apply the pattern to a new situation" },
];

export const PATTERNS: SystemDesignPattern[] = [
  {
    id: "horizontal-scaling",
    levelNumber: 1,
    title: "Horizontal Scaling",
    levelGoal: "Survive overload",
    chapterId: "chapter-1",
    prerequisites: [],
    inherits: [],
    difficulty: "Beginner",
    estimatedMinutes: 4,
    skillTags: ["capacity", "single point of failure", "stateless servers"],
    newConstraint: "One machine cannot keep up with a traffic spike.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "Traffic went from 20 to 4,000 req/s. What is actually failing?",
      options: [
        {
          id: "d-cpu",
          label: "The one app server has run out of CPU, so requests queue and time out",
          isCorrect: true,
          explanation: "CPU is at 96% on the only server. Every request waits for the same exhausted machine, so latency and errors climb together.",
        },
        {
          id: "d-dns",
          label: "DNS is resolving the domain too slowly",
          isCorrect: false,
          explanation: "DNS lookups happen once per client and are cached. They would not push server CPU to 96%.",
        },
        {
          id: "d-disk",
          label: "The disk is full",
          isCorrect: false,
          explanation: "A full disk causes write errors, but the telemetry shows CPU saturation and request queueing, not storage failures.",
        },
      ],
    },
    intervention: {
      question: "Which change should you deploy first?",
      options: [
        {
          id: "i-scale",
          label: "Run several identical stateless app servers",
          isCorrect: true,
          explanation: "Spreading work across machines adds capacity and removes the single point of failure.",
        },
        {
          id: "i-bigger",
          label: "Upgrade to the largest single machine available",
          isCorrect: false,
          explanation: "This buys time, but hardware tops out, cost rises steeply, and one crash still takes everyone down.",
        },
        {
          id: "i-timeout",
          label: "Raise the request timeout to 60 seconds",
          isCorrect: false,
          explanation: "Longer timeouts keep more requests waiting on the same exhausted CPU. Latency gets worse, not better.",
        },
      ],
    },
    transfer: {
      question: "A video-encoding service has one worker at 100% CPU and a growing backlog. What is the most resilient next step?",
      options: [
        {
          id: "t-more",
          label: "Add multiple stateless workers that share the backlog",
          isCorrect: true,
          explanation: "Same pattern, different product: independent workers add capacity and survive a single failure.",
        },
        {
          id: "t-bigger",
          label: "Keep buying a larger single machine",
          isCorrect: false,
          explanation: "Vertical scaling hits a ceiling and keeps the single point of failure.",
        },
        {
          id: "t-timeout",
          label: "Increase job timeouts",
          isCorrect: false,
          explanation: "Timeouts do not add capacity; the backlog keeps growing.",
        },
      ],
    },
    review: {
      question: "Why do app servers need to be stateless before you can scale them horizontally?",
      options: [
        {
          id: "r-any",
          label: "So any server can handle any request without needing another server's memory",
          isCorrect: true,
          explanation: "If session data lives on one server, requests must return to it, so you cannot freely add or remove servers.",
        },
        {
          id: "r-cpu",
          label: "Stateless servers use less CPU per request",
          isCorrect: false,
          explanation: "Statelessness is about where data lives, not per-request CPU cost.",
        },
        {
          id: "r-db",
          label: "So they do not need a database",
          isCorrect: false,
          explanation: "Stateless servers still use a database; they just do not keep user state in local memory.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "A single server hit its CPU limit and became a single point of failure.",
      whyFixWorked: "Several stateless servers share the work, so no one machine is saturated.",
      insufficientWhen: "Clients still connect to one server's address. Without something distributing traffic, the extra servers sit idle.",
    },
    builderScenarioId: "boss-scale",
    rewards: { firstClearXp: 100, replayXp: 15, builderXp: 60, reviewXp: 20 },
    nextHook: "Next: the extra servers sit idle because nothing routes traffic to them.",
  },
  {
    id: "load-balancing",
    levelNumber: 2,
    title: "Load Balancing",
    levelGoal: "Distribute traffic",
    chapterId: "chapter-2",
    lessonId: "load-balancer",
    prerequisites: ["horizontal-scaling"],
    inherits: ["horizontal-scaling"],
    difficulty: "Beginner",
    estimatedMinutes: 5,
    skillTags: ["reverse proxy", "health checks", "round robin"],
    newConstraint: "Servers must keep serving when one of them crashes.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "You have three servers now, but Server 1 is at 99% and the others are nearly idle. Why?",
      options: [
        {
          id: "d-direct",
          label: "Clients connect straight to Server 1, so the others receive no traffic",
          isCorrect: true,
          explanation: "Adding servers adds capacity only if traffic actually reaches them. Every client still uses Server 1's address.",
        },
        {
          id: "d-slow",
          label: "Servers 2 and 3 have slower CPUs",
          isCorrect: false,
          explanation: "Slower CPUs would still show load. Near-zero CPU means they receive almost no requests.",
        },
        {
          id: "d-db",
          label: "The database is rejecting connections from Servers 2 and 3",
          isCorrect: false,
          explanation: "That would show errors on those servers, not idle CPUs next to one saturated server.",
        },
      ],
    },
    intervention: {
      question: "Which change spreads the traffic?",
      options: [
        {
          id: "i-lb",
          label: "Put a load balancer in front of the servers and send all clients to it",
          isCorrect: true,
          explanation: "The load balancer is the single entry point and spreads requests across healthy servers.",
        },
        {
          id: "i-dns",
          label: "Publish three DNS records and let clients pick one",
          isCorrect: false,
          explanation: "DNS round-robin spreads some load, but clients cache records for minutes and keep hitting a dead server after it crashes.",
        },
        {
          id: "i-cache",
          label: "Add a cache in front of the database",
          isCorrect: false,
          explanation: "A cache reduces database reads. It does nothing about Server 1 receiving every request.",
        },
      ],
    },
    transfer: {
      question: "A second API server is online, but mobile clients still hit only the first one. What completes the fix?",
      options: [
        {
          id: "t-lb",
          label: "Route mobile traffic through the load balancer",
          isCorrect: true,
          explanation: "Any client that bypasses the balancer keeps overloading one server.",
        },
        {
          id: "t-direct",
          label: "Keep mobile clients pointed directly at the first server",
          isCorrect: false,
          explanation: "That is the original problem in a new place.",
        },
        {
          id: "t-dns",
          label: "Add another DNS record and wait for propagation",
          isCorrect: false,
          explanation: "Propagation is slow and clients cache records, so this does not reliably spread load.",
        },
      ],
    },
    review: {
      question: "A server crashes. What happens to its traffic with active health checks enabled?",
      options: [
        {
          id: "r-evict",
          label: "The balancer stops sending it requests after it fails a few probes",
          isCorrect: true,
          explanation: "Failed health checks evict the node from rotation; the remaining servers absorb its share.",
        },
        {
          id: "r-lost",
          label: "Its share of traffic is dropped until an engineer restarts it",
          isCorrect: false,
          explanation: "Health checks exist so traffic is rerouted without waiting for a human.",
        },
        {
          id: "r-dns",
          label: "DNS updates and clients move within seconds",
          isCorrect: false,
          explanation: "DNS changes take minutes to hours because of TTL caching.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "All clients used one server's address, so the other servers stayed idle.",
      whyFixWorked: "The load balancer spreads requests and removes crashed servers from rotation.",
      insufficientWhen: "The database behind the servers saturates. Spreading app traffic does not reduce database load.",
    },
    builderScenarioId: "boss-lb",
    rewards: { firstClearXp: 125, replayXp: 15, builderXp: 70, reviewXp: 20 },
    nextHook: "Next: every server now hammers the same database.",
  },
  {
    id: "read-replicas",
    levelNumber: 3,
    title: "Read Replicas",
    levelGoal: "Protect the database",
    chapterId: "chapter-3",
    lessonId: "database-scaling",
    prerequisites: ["load-balancing"],
    inherits: ["horizontal-scaling", "load-balancing"],
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    skillTags: ["replication", "read/write split", "replication lag"],
    newConstraint: "90% of traffic is reads, and writes are being starved.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "App servers are healthy at 40% CPU, yet latency is 7 seconds. Where is the bottleneck?",
      options: [
        {
          id: "d-db",
          label: "The single database: CPU is at 99% and every connection is in use",
          isCorrect: true,
          explanation: "The app tier scaled, but every server still queries one database. Reads and writes now compete for it.",
        },
        {
          id: "d-lb",
          label: "The load balancer is too slow",
          isCorrect: false,
          explanation: "If the balancer were the bottleneck, app servers would be idle and the database would be quiet too.",
        },
        {
          id: "d-app",
          label: "The app servers need more RAM",
          isCorrect: false,
          explanation: "App servers are at 40% CPU. They are waiting on the database, not short on resources.",
        },
      ],
    },
    intervention: {
      question: "Most queries are reads. Which change protects the database?",
      options: [
        {
          id: "i-replica",
          label: "Add read replicas and send read queries to them; writes stay on the primary",
          isCorrect: true,
          explanation: "Replicas copy the primary and absorb read traffic, freeing the primary for writes.",
        },
        {
          id: "i-servers",
          label: "Add more app servers",
          isCorrect: false,
          explanation: "More app servers send even more queries to the same database.",
        },
        {
          id: "i-shard",
          label: "Split the data across 10 database shards immediately",
          isCorrect: false,
          explanation: "Sharding helps write-heavy growth, but it is a large redesign. For a read-heavy load, replicas are the smaller fix.",
        },
      ],
    },
    transfer: {
      question: "An analytics dashboard runs heavy reports against the orders database, slowing checkout writes. What fits best?",
      options: [
        {
          id: "t-replica",
          label: "Point the reports at a read replica",
          isCorrect: true,
          explanation: "Reports are reads that can tolerate a little lag, so they belong on a replica away from checkout writes.",
        },
        {
          id: "t-primary",
          label: "Run reports on the primary during peak hours",
          isCorrect: false,
          explanation: "That keeps the same contention that is slowing checkout.",
        },
        {
          id: "t-cdn",
          label: "Move checkout writes to a CDN",
          isCorrect: false,
          explanation: "CDNs cache static content; they cannot accept transactional writes.",
        },
      ],
    },
    review: {
      question: "A user updates their profile and immediately sees the old version. What is the usual fix?",
      options: [
        {
          id: "r-ryw",
          label: "Read your own recent writes from the primary for a short window",
          isCorrect: true,
          explanation: "Read-after-write consistency: route that user's reads to the primary briefly while replicas catch up.",
        },
        {
          id: "r-nocache",
          label: "Remove all replicas",
          isCorrect: false,
          explanation: "That fixes staleness by bringing back the original database overload.",
        },
        {
          id: "r-refresh",
          label: "Tell users to refresh again",
          isCorrect: false,
          explanation: "The system should handle lag without asking users to work around it.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "One database handled every read and write for all app servers.",
      whyFixWorked: "Replicas absorb reads, so the primary has headroom for writes.",
      insufficientWhen: "Millions of users request the same hot record. Replicas still read from disk; repeated reads need a cache.",
    },
    builderScenarioId: "boss-replicas",
    rewards: { firstClearXp: 150, replayXp: 20, builderXp: 80, reviewXp: 25 },
    nextHook: "Next: one viral post triggers the same read 200,000 times.",
  },
  {
    id: "caching",
    levelNumber: 4,
    title: "Caching",
    levelGoal: "Handle hot reads",
    chapterId: "chapter-4",
    lessonId: "cache",
    prerequisites: ["read-replicas"],
    inherits: ["horizontal-scaling", "load-balancing", "read-replicas"],
    difficulty: "Intermediate",
    estimatedMinutes: 5,
    skillTags: ["cache-aside", "TTL", "cache stampede"],
    newConstraint: "The same record is read 200,000 times at once.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "A celebrity posts. Database hits jump to 50,000/s, almost all for the same row. What is the problem?",
      options: [
        {
          id: "d-hot",
          label: "Identical reads go to disk every time instead of being served from memory",
          isCorrect: true,
          explanation: "The answer does not change between requests, yet each one does the full database read.",
        },
        {
          id: "d-writes",
          label: "Too many writes are locking the table",
          isCorrect: false,
          explanation: "The spike is reads of one row, not writes.",
        },
        {
          id: "d-lb",
          label: "The load balancer is sending traffic unevenly",
          isCorrect: false,
          explanation: "Even perfect balancing still sends every one of those reads to the database.",
        },
      ],
    },
    intervention: {
      question: "Which change stops repeated reads from reaching the database?",
      options: [
        {
          id: "i-cache",
          label: "Check an in-memory cache first and fill it from the database on a miss, with a TTL",
          isCorrect: true,
          explanation: "Cache-aside serves the hot row from RAM in under a millisecond; the database sees only misses.",
        },
        {
          id: "i-replicas",
          label: "Add 20 more read replicas",
          isCorrect: false,
          explanation: "This spreads the reads, but each replica still reads from disk and costs a full database instance.",
        },
        {
          id: "i-queue",
          label: "Put reads in a message queue",
          isCorrect: false,
          explanation: "Queues are for deferring work. Users need the post now, not later.",
        },
      ],
    },
    transfer: {
      question: "A product page is requested 10,000 times a minute and changes once an hour. Which layer should absorb the repeated reads?",
      options: [
        {
          id: "t-cache",
          label: "A cache with a TTL shorter than the update interval",
          isCorrect: true,
          explanation: "Same pattern: repeated identical reads with rare changes are what caches are for.",
        },
        {
          id: "t-queue",
          label: "A larger write queue",
          isCorrect: false,
          explanation: "The load is reads, not writes.",
        },
        {
          id: "t-dns",
          label: "A DNS resolver",
          isCorrect: false,
          explanation: "DNS maps names to addresses; it does not store page data.",
        },
      ],
    },
    review: {
      question: "What is the main risk you accept when you add a cache?",
      options: [
        {
          id: "r-stale",
          label: "Users may see stale data until the entry expires or is invalidated",
          isCorrect: true,
          explanation: "Caching trades freshness for speed. TTLs and invalidation decide how stale data can get.",
        },
        {
          id: "r-writes",
          label: "Writes become impossible",
          isCorrect: false,
          explanation: "Writes still go to the database; the cache needs to be updated or invalidated.",
        },
        {
          id: "r-cpu",
          label: "App server CPU always doubles",
          isCorrect: false,
          explanation: "Cache lookups are cheap; they usually reduce total work.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "The same row was read from disk for every request.",
      whyFixWorked: "The cache serves repeated reads from memory; only misses reach the database.",
      insufficientWhen: "Users are far from your datacenter. A cache in Virginia cannot remove a 300ms round trip from Tokyo.",
    },
    builderScenarioId: "boss-cache",
    rewards: { firstClearXp: 150, replayXp: 20, builderXp: 80, reviewXp: 25 },
    nextHook: "Next: users on other continents wait seconds for every image.",
  },
  {
    id: "cdn-edge",
    levelNumber: 5,
    title: "CDN & Edge Delivery",
    levelGoal: "Reduce global latency",
    chapterId: "chapter-5",
    prerequisites: ["caching"],
    inherits: ["horizontal-scaling", "load-balancing", "read-replicas", "caching"],
    difficulty: "Intermediate",
    estimatedMinutes: 5,
    skillTags: ["edge PoPs", "static assets", "cache busting"],
    newConstraint: "Users are worldwide, but the origin is in one region.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "Users in Tokyo wait 5 seconds; users in Virginia wait 200ms. Same servers, same code. What explains the gap?",
      options: [
        {
          id: "d-distance",
          label: "Distance: every image and script crosses an ocean from the origin",
          isCorrect: true,
          explanation: "Round trips across the planet add hundreds of milliseconds each, and large media multiplies it.",
        },
        {
          id: "d-cpu",
          label: "Servers are slower for Tokyo users",
          isCorrect: false,
          explanation: "Servers do the same work for everyone. The difference is network distance.",
        },
        {
          id: "d-db",
          label: "The database is overloaded",
          isCorrect: false,
          explanation: "That would slow Virginia users too.",
        },
      ],
    },
    intervention: {
      question: "Which change brings content closer to distant users?",
      options: [
        {
          id: "i-cdn",
          label: "Serve static assets and media from CDN edge locations near users",
          isCorrect: true,
          explanation: "Edge caches answer from nearby, cutting round trips and offloading the origin.",
        },
        {
          id: "i-replica",
          label: "Add a database replica in the origin region",
          isCorrect: false,
          explanation: "A replica in the same region does not shorten the trip from Tokyo.",
        },
        {
          id: "i-threads",
          label: "Add more threads to origin servers",
          isCorrect: false,
          explanation: "The bytes still travel the same distance.",
        },
      ],
    },
    transfer: {
      question: "A game publisher ships a 2 GB patch to players worldwide on launch day. How should the files be delivered?",
      options: [
        {
          id: "t-cdn",
          label: "Through a CDN so players download from a nearby edge",
          isCorrect: true,
          explanation: "Large static files and a global audience are what CDNs are for.",
        },
        {
          id: "t-origin",
          label: "Directly from the origin with more bandwidth",
          isCorrect: false,
          explanation: "Distance and origin egress remain the bottleneck.",
        },
        {
          id: "t-queue",
          label: "Queue downloads and send them one at a time",
          isCorrect: false,
          explanation: "That makes players wait longer instead of serving them from nearby.",
        },
      ],
    },
    review: {
      question: "You shipped a fix to app.js but edge nodes still serve the old file. What prevents this on every deploy?",
      options: [
        {
          id: "r-hash",
          label: "Put a content hash in the filename so each build gets a new URL",
          isCorrect: true,
          explanation: "New content means a new URL, so edges fetch it immediately while old files can be cached forever.",
        },
        {
          id: "r-nocdn",
          label: "Disable CDN caching for scripts",
          isCorrect: false,
          explanation: "That sends every script request back to the origin.",
        },
        {
          id: "r-users",
          label: "Ask users to hard-refresh",
          isCorrect: false,
          explanation: "You cannot rely on users to clear their caches.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Every asset traveled from one region to users worldwide.",
      whyFixWorked: "Edge locations serve cached assets close to users and offload the origin.",
      insufficientWhen: "Requests call slow third-party APIs synchronously. Edge caching cannot speed up a payment provider.",
    },
    builderScenarioId: "boss-cdn",
    rewards: { firstClearXp: 175, replayXp: 25, builderXp: 90, reviewXp: 30 },
    nextHook: "Next: slow payment and email APIs tie up every server thread.",
  },
  {
    id: "async-queues",
    levelNumber: 6,
    title: "Queues & Failure Handling",
    levelGoal: "Survive asynchronous failures",
    chapterId: "chapter-6",
    prerequisites: ["cdn-edge"],
    inherits: ["horizontal-scaling", "load-balancing", "read-replicas", "caching", "cdn-edge"],
    difficulty: "Advanced",
    estimatedMinutes: 8,
    skillTags: ["message queues", "acknowledgments", "backpressure", "retries"],
    newConstraint: "Slow downstream services block request threads.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "Servers are at 94% CPU, yet most threads are just waiting for the payment and email APIs. What is wrong?",
      options: [
        {
          id: "d-sync",
          label: "Slow external calls run inside the request, so threads sit blocked",
          isCorrect: true,
          explanation: "Each request holds a thread until the slowest dependency answers. Blocked threads pile up and new requests wait.",
        },
        {
          id: "d-cache",
          label: "The cache hit rate is too low",
          isCorrect: false,
          explanation: "The hit rate is 88%. The time is spent waiting on external APIs, not on reads.",
        },
        {
          id: "d-cdn",
          label: "The CDN is misconfigured",
          isCorrect: false,
          explanation: "Static delivery is fine; the slow part is dynamic calls to other services.",
        },
      ],
    },
    intervention: {
      question: "Which change frees request threads?",
      options: [
        {
          id: "i-queue",
          label: "Put slow work on a message queue and let background workers process it",
          isCorrect: true,
          explanation: "The request returns quickly after enqueueing; workers handle payment and email at their own pace.",
        },
        {
          id: "i-timeout",
          label: "Increase the timeout for external calls",
          isCorrect: false,
          explanation: "Threads would stay blocked even longer.",
        },
        {
          id: "i-servers",
          label: "Double the number of app servers",
          isCorrect: false,
          explanation: "More servers means more blocked threads. It is expensive and the external APIs are still slow.",
        },
      ],
    },
    transfer: {
      question: "A photo app generates five thumbnail sizes during upload, making uploads take 8 seconds. What fits best?",
      options: [
        {
          id: "t-queue",
          label: "Save the original, enqueue a thumbnail job, and return immediately",
          isCorrect: true,
          explanation: "Same pattern: slow, deferrable work moves off the request path to workers.",
        },
        {
          id: "t-cdn",
          label: "Serve the upload form from a CDN",
          isCorrect: false,
          explanation: "The form is not slow; the processing is.",
        },
        {
          id: "t-cache",
          label: "Cache the uploaded photos",
          isCorrect: false,
          explanation: "Caching helps later reads, not the slow work during upload.",
        },
      ],
    },
    review: {
      question: "A worker crashes halfway through charging a card. How do you avoid charging twice when the message is redelivered?",
      options: [
        {
          id: "r-idem",
          label: "Use an idempotency key so repeating the same charge has no extra effect",
          isCorrect: true,
          explanation: "Queues deliver at least once. Idempotent handlers make redelivery safe.",
        },
        {
          id: "r-noack",
          label: "Never redeliver messages",
          isCorrect: false,
          explanation: "Then a crash loses the order entirely.",
        },
        {
          id: "r-sync",
          label: "Move payments back into the request",
          isCorrect: false,
          explanation: "That brings back blocked threads and does not remove retries.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Slow third-party calls ran synchronously and tied up request threads.",
      whyFixWorked: "A queue decouples the request from slow work; workers process it with acknowledgments and retries.",
      insufficientWhen: "Messages can be delivered twice, so handlers must be idempotent, and a growing backlog needs backpressure and monitoring.",
    },
    builderScenarioId: "boss-queue",
    rewards: { firstClearXp: 250, replayXp: 30, builderXp: 120, reviewXp: 35 },
    nextHook: "Next: the hot tenant is still the bottleneck and reads are stale after writes.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "Every checkout waits on a slow payment API.",
        constraint: "The request path contains a dependency that can take 600ms+.",
        expectedFix: "Move the payment call into a queue and return immediately.",
      },
      {
        variantId: "spike",
        label: "Flash sale spike",
        scenario: "Traffic jumps while every payment and email job is slow.",
        constraint: "Thread starvation occurs because the API and workers are not decoupled.",
        expectedFix: "Back-pressure the ingress and rate-limit non-critical work.",
      },
      {
        variantId: "tradeoff",
        label: "Tradeoff",
        scenario: "A crash happens after the charge succeeds but before the message is acknowledged.",
        constraint: "Redelivery can happen, so the payment must be idempotent.",
        expectedFix: "Use idempotency keys and a safe retry policy.",
      },
    ],
  },
  {
    id: "sharding",
    levelNumber: 7,
    title: "Sharding",
    levelGoal: "Split the hot dataset",
    chapterId: "chapter-7",
    lessonId: "sharding",
    prerequisites: ["read-replicas"],
    inherits: ["horizontal-scaling", "load-balancing", "read-replicas"],
    difficulty: "Advanced",
    estimatedMinutes: 7,
    skillTags: ["partitioning", "tenant sharding", "hot keys"],
    newConstraint: "One database remains the bottleneck even after replicas; a single tenant or key dominates all writes.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "The app is scaled out, but one database shard still receives most of the traffic. What is the real bottleneck?",
      options: [
        {
          id: "d-hotkey",
          label: "A single tenant or hot key keeps landing on the same shard, so it is overloaded",
          isCorrect: true,
          explanation: "The system is now horizontally scaled, but the data itself is still clumped into a single shard.",
        },
        {
          id: "d-network",
          label: "The network cable is saturated",
          isCorrect: false,
          explanation: "Networking issues would affect every shard, not just one partition.",
        },
        {
          id: "d-ssl",
          label: "TLS handshakes are taking too long",
          isCorrect: false,
          explanation: "The traffic pattern shows a data hotspot, not an encryption bottleneck.",
        },
      ],
    },
    intervention: {
      question: "Which partitioning strategy reduces the hotspot without redesigning the whole platform?",
      options: [
        {
          id: "i-shard",
          label: "Split data by tenant or key range and route each request to the correct shard",
          isCorrect: true,
          explanation: "Sharding spreads storage and writes across independent databases instead of one giant hot bucket.",
        },
        {
          id: "i-morecache",
          label: "Add more cache nodes to hide the same overloaded shard",
          isCorrect: false,
          explanation: "The cache reduces read load, but the writes and hot keys still need partitioning.",
        },
        {
          id: "i-largerdb",
          label: "Move to a larger single database instance",
          isCorrect: false,
          explanation: "That delays the bottleneck and preserves a single point of failure.",
        },
      ],
    },
    transfer: {
      question: "A system stores hundreds of millions of order records and one tenant's account creates 70% of the traffic. How should it scale?",
      options: [
        {
          id: "t-tenant",
          label: "Shards by tenant ID so that hot tenants are spread across multiple partitions",
          isCorrect: true,
          explanation: "The root problem is key distribution, not just database size. Partitioning by key or tenant reduces congestion.",
        },
        {
          id: "t-queue",
          label: "Queue all writes and process them later",
          isCorrect: false,
          explanation: "That reduces responsiveness and does not redistribute the dataset.",
        },
        {
          id: "t-cdn",
          label: "Serve data from a CDN",
          isCorrect: false,
          explanation: "CDN content is static, while the hot dataset is transactional and stateful.",
        },
      ],
    },
    review: {
      question: "Why is a naive sharding plan dangerous even when the traffic is split evenly?",
      options: [
        {
          id: "r-skew",
          label: "A single key or tenant can still dominate one shard and create hotspots",
          isCorrect: true,
          explanation: "Hashing or random assignment reduces skew, but poor key choices can still leave a shard overloaded.",
        },
        {
          id: "r-cpu",
          label: "CPU climbs because every request now does more work",
          isCorrect: false,
          explanation: "Sharding is often about distributing data, not about a higher per-request cost.",
        },
        {
          id: "r-cache",
          label: "Cache eviction becomes impossible",
          isCorrect: false,
          explanation: "A cache still helps, but the deeper issue is the hot data layout.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "The data was still concentrated in one partition, so writes and reads piled up on the same shard.",
      whyFixWorked: "Partitioning by tenant or key moves the workload across multiple databases and reduces the hotspot.",
      insufficientWhen: "Rebalancing and cross-shard queries increase complexity, and hot keys can still create imbalanced partitions.",
    },
    builderScenarioId: "boss-sharding",
    rewards: { firstClearXp: 275, replayXp: 35, builderXp: 130, reviewXp: 40 },
    nextHook: "Next: users see stale reads after a write because replicas and shards are not coordinated.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "One tenant owns most of the orders and writes.",
        constraint: "All of that tenant's traffic funnels to one shard.",
        expectedFix: "Partition by tenant or key to spread the hotspot.",
      },
      {
        variantId: "rebalancing",
        label: "Rebalancing",
        scenario: "A new tenant suddenly becomes dominant during a campaign.",
        constraint: "A static shard layout cannot absorb a skewed new workload.",
        expectedFix: "Re-shard or rebalance key ranges before saturation.",
      },
      {
        variantId: "tradeoff",
        label: "Tradeoff",
        scenario: "Read traffic is balanced but cross-shard joins become expensive.",
        constraint: "The system is partitioned but not designed around access patterns.",
        expectedFix: "Keep hot keys local and avoid heavy cross-shard fan-out.",
      },
    ],
  },
  {
    id: "consistency",
    levelNumber: 8,
    title: "Consistency & Read-Your-Own-Writes",
    levelGoal: "Keep users on the same version of reality",
    chapterId: "chapter-8",
    lessonId: "consistency",
    prerequisites: ["sharding", "async-queues"],
    inherits: ["horizontal-scaling", "load-balancing", "read-replicas", "caching", "cdn-edge", "async-queues", "sharding"],
    difficulty: "Advanced",
    estimatedMinutes: 8,
    skillTags: ["read-after-write", "replication lag", "eventual consistency"],
    newConstraint: "Writes are replicated asynchronously across shards and replicas, so users can see stale data.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "A user posts a message, refreshes immediately, and sees the old version. Why?",
      options: [
        {
          id: "d-lag",
          label: "The write reached the primary, but a replica or secondary shard had not caught up yet",
          isCorrect: true,
          explanation: "Replication is asynchronous. A follower can serve stale data while the primary is already updated.",
        },
        {
          id: "d-cache",
          label: "The cache is poisoning every response",
          isCorrect: false,
          explanation: "The stale read is a consistency problem, not a cache poisoning problem.",
        },
        {
          id: "d-ssl",
          label: "The browser is not sending the request to the right server",
          isCorrect: false,
          explanation: "The client may be routed to the right site, but the read path is behind the latest write.",
        },
      ],
    },
    intervention: {
      question: "Which fix makes the author see a fresh version while preserving availability?",
      options: [
        {
          id: "i-rw",
          label: "Route the author's reads to the primary for a short window, or use a session-aware consistent read path",
          isCorrect: true,
          explanation: "Read-your-own-writes keeps the author from seeing stale data while the rest of the system remains asynchronous.",
        },
        {
          id: "i-wait",
          label: "Force every request to wait for replication to finish",
          isCorrect: false,
          explanation: "That makes the system slower and still does not guarantee cross-region consistency for all users.",
        },
        {
          id: "i-disable",
          label: "Disable replicas and keep everything on one database",
          isCorrect: false,
          explanation: "That removes lag but reintroduces the bottleneck you already solved.",
        },
      ],
    },
    transfer: {
      question: "A user edits a profile and immediately reloads the profile page from a different region. What should happen?",
      options: [
        {
          id: "t-session",
          label: "Use a session-aware read policy or a consistent read path for that user until the update is fully propagated",
          isCorrect: true,
          explanation: "The user expectation is freshness for their own writes; other users may accept eventual consistency.",
        },
        {
          id: "t-global",
          label: "Synchronize every region before any read succeeds",
          isCorrect: false,
          explanation: "Global strong consistency is expensive and slows all requests.",
        },
        {
          id: "t-retry",
          label: "Tell the user to retry later",
          isCorrect: false,
          explanation: "Sticky freshness is a product decision and should be built into the system, not handed to users.",
        },
      ],
    },
    review: {
      question: "What is the main tradeoff of eventual consistency?",
      options: [
        {
          id: "r-freshness",
          label: "Some requests may briefly read stale data, but the system remains available and scales better",
          isCorrect: true,
          explanation: "Eventually consistent systems optimize for throughput and availability, not immediate global freshness on every read.",
        },
        {
          id: "r-uptime",
          label: "The system will always be down under load",
          isCorrect: false,
          explanation: "Consistency choices are about read freshness, not base uptime.",
        },
        {
          id: "r-cost",
          label: "It requires no monitoring",
          isCorrect: false,
          explanation: "Asynchronous replication still needs monitoring and lag alerts.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "The system replicated writes asynchronously, so some reads landed on behind followers and showed stale data.",
      whyFixWorked: "The read-your-own-writes path routes the user to fresh data while the rest of the system keeps the throughput benefits of replication.",
      insufficientWhen: "Multiple regions are involved and a user reads someone else's data that is not yet in sync. Stronger consistency windows or explicit conflict handling may be needed.",
    },
    builderScenarioId: "boss-consistency",
    rewards: { firstClearXp: 300, replayXp: 40, builderXp: 150, reviewXp: 45 },
    nextHook: "Next: the first full interview-style system design lab opens in the sandbox.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "A user writes and reloads immediately.",
        constraint: "The follower is behind the primary by a few seconds.",
        expectedFix: "Route that user's reads to a fresh source for a small consistency window.",
      },
      {
        variantId: "regional",
        label: "Regional failover",
        scenario: "A region fails over and a read lands on a stale follower.",
        constraint: "The region's replica is serving old data during failover.",
        expectedFix: "Add lag-aware routing and failover detection for critical reads.",
      },
      {
        variantId: "tradeoff",
        label: "Tradeoff",
        scenario: "The product needs near-real-time reads across multiple regions.",
        constraint: "Eventual consistency is fast but not globally fresh.",
        expectedFix: "Pick a bounded freshness model and explain the tradeoff clearly.",
      },
    ],
  },
];

export function getAllPatterns(): SystemDesignPattern[] {
  return PATTERNS;
}

export function getPatternById(id: string): SystemDesignPattern | undefined {
  return PATTERNS.find((p) => p.id === id);
}

export function getPatternByChapterId(chapterId: string): SystemDesignPattern | undefined {
  return PATTERNS.find((p) => p.chapterId === chapterId);
}

export function getPatternIds(): PatternId[] {
  return PATTERNS.map((p) => p.id);
}
