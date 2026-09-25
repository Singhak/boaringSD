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
  {
    id: "rate-limiting",
    levelNumber: 9,
    title: "Rate Limiting & Token Buckets",
    levelGoal: "Protect fleet from traffic floods",
    chapterId: "chapter-9",
    prerequisites: ["load-balancing"],
    inherits: ["horizontal-scaling", "load-balancing"],
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    skillTags: ["token bucket", "HTTP 429", "edge protection", "noisy neighbors"],
    newConstraint: "A single tenant or bot flood can exhaust cluster resources without per-client limits.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "A shared cluster's p99 latency spikes from 80ms to 4s. CPU is consumed almost entirely by one tenant API key. What is the root cause?",
      options: [
        {
          id: "d-flood",
          label: "A single client is flooding the API without rate limits, starving worker threads for all tenants",
          isCorrect: true,
          explanation: "Without fair-share rate limiting, one abusive client or rogue loop can consume the entire fleet's capacity.",
        },
        {
          id: "d-dns",
          label: "DNS TTL has expired for all users",
          isCorrect: false,
          explanation: "DNS lookup times do not correlate to one specific heavy tenant API key.",
        },
        {
          id: "d-disk",
          label: "Database hard drives have run out of physical sector space",
          isCorrect: false,
          explanation: "The issue is traffic monopolization at the edge and compute tiers.",
        },
      ],
    },
    intervention: {
      question: "Where should the rate limiter sit to best protect backend services?",
      options: [
        {
          id: "i-edge",
          label: "At the API gateway/edge tier, rejecting excess requests with HTTP 429 before they reach app servers",
          isCorrect: true,
          explanation: "Throttling at the edge protects downstream app compute, memory, and database connections.",
        },
        {
          id: "i-db",
          label: "Inside database stored procedures",
          isCorrect: false,
          explanation: "Running limits in the database forces all junk traffic through the entire stack, amplifying load.",
        },
        {
          id: "i-client",
          label: "In client-side JavaScript cookies only",
          isCorrect: false,
          explanation: "Client-side limits are trivial to bypass with custom HTTP scripts and curl commands.",
        },
      ],
    },
    transfer: {
      question: "A mobile client sends a normal burst of 15 requests on launch, then goes quiet. How should your limiter handle this?",
      options: [
        {
          id: "t-bucket",
          label: "Use a Token Bucket algorithm that allows short bursts up to bucket capacity while enforcing a steady refill rate",
          isCorrect: true,
          explanation: "Token Bucket accommodates bursty client patterns cleanly without false-positive blocks.",
        },
        {
          id: "t-strict",
          label: "Strictly enforce 1 request per second with zero burst tolerance",
          isCorrect: false,
          explanation: "A zero-burst policy breaks legitimate mobile applications that fetch resources in parallel on launch.",
        },
        {
          id: "t-block",
          label: "Block any IP that sends more than 2 requests concurrently for 24 hours",
          isCorrect: false,
          explanation: "Aggressive blocks create catastrophic false positives on mobile cellular towers and corporate NATs.",
        },
      ],
    },
    review: {
      question: "What is the primary tradeoff of using centralized Redis for rate limiting?",
      options: [
        {
          id: "r-lat",
          label: "It guarantees global accuracy across all API servers, but adds a fast network round-trip to every request",
          isCorrect: true,
          explanation: "Centralized counters prevent split-fleet leakage at the cost of a sub-millisecond Redis lookup.",
        },
        {
          id: "r-loss",
          label: "It drops database transaction durability",
          isCorrect: false,
          explanation: "Rate limiting is ephemeral counter management, unrelated to database durability.",
        },
        {
          id: "r-cpu",
          label: "It eliminates the need for application servers",
          isCorrect: false,
          explanation: "Rate limiting only protects entry capacity; it does not replace application logic.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "One abusive caller monopolized API server threads and starved legitimate users.",
      whyFixWorked: "Token-bucket rate limiting at the edge promptly dropped excess traffic with HTTP 429.",
      insufficientWhen: "Distributed DDoS attacks spoof millions of IPs or API keys, requiring bot management and WAF IP reputation.",
    },
    builderScenarioId: "boss-rate-limiting",
    rewards: { firstClearXp: 300, replayXp: 40, builderXp: 140, reviewXp: 45 },
    nextHook: "Next: slow downstream dependencies hold server worker threads until the whole cluster locks up.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "A single API key sends 20,000 req/s and p99 latency climbs to 4 seconds.",
        constraint: "Other tenants share the same entry fleet.",
        expectedFix: "Per-key rate limits at the edge with HTTP 429.",
      },
      {
        variantId: "login",
        label: "Login brute force",
        scenario: "Password guesses flood /login against one account.",
        constraint: "Slow attackers without locking the real user out permanently.",
        expectedFix: "Rate-limit by account and IP on the auth path with backoff.",
      },
      {
        variantId: "burst",
        label: "Burst vs sustained",
        scenario: "Legitimate app opening generates 15 requests in 100ms.",
        constraint: "Allow short bursts while capping sustained volume.",
        expectedFix: "Token bucket allowing bursts up to max capacity.",
      },
    ],
  },
  {
    id: "circuit-breaker",
    levelNumber: 10,
    title: "Circuit Breaker & Fault Isolation",
    levelGoal: "Prevent cascading dependency failures",
    chapterId: "chapter-10",
    prerequisites: ["async-queues"],
    inherits: ["horizontal-scaling", "load-balancing", "async-queues"],
    difficulty: "Advanced",
    estimatedMinutes: 6,
    skillTags: ["fail fast", "half-open", "cascading failure", "fallbacks"],
    newConstraint: "Downstream timeouts hold worker threads and cascade failures to healthy services.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "An external payment gateway is hanging for 30s. The entire e-commerce app (including browsing and search) collapses. Why?",
      options: [
        {
          id: "d-starve",
          label: "Web worker threads are all blocked waiting for the payment timeout, leaving zero threads to serve other pages",
          isCorrect: true,
          explanation: "Synchronous blocking on a dead dependency consumes all server concurrency and causes cascading cluster collapse.",
        },
        {
          id: "d-power",
          label: "The hosting provider lost datacenter power",
          isCorrect: false,
          explanation: "The servers are running, but their thread pools are completely saturated by hung outbound calls.",
        },
        {
          id: "d-dns",
          label: "The domain name registration lapsed",
          isCorrect: false,
          explanation: "The issue is thread starvation caused by slow third-party I/O.",
        },
      ],
    },
    intervention: {
      question: "What pattern immediately prevents a dead dependency from bringing down caller services?",
      options: [
        {
          id: "i-breaker",
          label: "Wrap calls in a Circuit Breaker that trips to OPEN after consecutive failures and fails fast without waiting",
          isCorrect: true,
          explanation: "Failing fast instantly frees caller threads and gives the failing dependency time to recover.",
        },
        {
          id: "i-retry",
          label: "Retry every timed-out call 10 times in an immediate loop",
          isCorrect: false,
          explanation: "Retrying without backoff triples incoming load on a struggling dependency and accelerates total collapse.",
        },
        {
          id: "i-timeout",
          label: "Increase the timeout from 30 seconds to 5 minutes",
          isCorrect: false,
          explanation: "Longer timeouts lock worker threads even longer, worsening the cascading failure.",
        },
      ],
    },
    transfer: {
      question: "After an outage, how does a circuit breaker verify that the dependency has recovered without overwhelming it?",
      options: [
        {
          id: "t-halfopen",
          label: "It switches to HALF-OPEN after a cooldown, allowing a small test percentage of requests through to verify health",
          isCorrect: true,
          explanation: "Half-Open acts as a canary check: if test calls succeed, it resets to CLOSED; if they fail, it trips back to OPEN.",
        },
        {
          id: "t-flood",
          label: "It instantly sends all queued traffic simultaneously upon cooldown expiry",
          isCorrect: false,
          explanation: "Flooding a newly recovered dependency with backlog traffic triggers an immediate relapse crash.",
        },
        {
          id: "t-manual",
          label: "It requires manual developer deployment to resume traffic",
          isCorrect: false,
          explanation: "Circuit breakers automate failover and self-healing recovery.",
        },
      ],
    },
    review: {
      question: "What should callers do when the circuit breaker is in OPEN state?",
      options: [
        {
          id: "r-fallback",
          label: "Return a graceful fallback (cached data, queued retry, or clear user notification) immediately",
          isCorrect: true,
          explanation: "Graceful fallbacks preserve user experience without burning backend compute.",
        },
        {
          id: "r-block",
          label: "Freeze the user's browser until the dependency comes back online",
          isCorrect: false,
          explanation: "Freezing the UI frustrates users and leads to rage-clicking.",
        },
        {
          id: "r-reboot",
          label: "Reboot the entire database cluster",
          isCorrect: false,
          explanation: "Rebooting healthy databases does not fix an external API failure.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Unresponsive downstream APIs tied up server threads, bringing down healthy endpoints.",
      whyFixWorked: "The circuit breaker tripped to Open, failing fast and protecting thread capacity.",
      insufficientWhen: "The service has no valid fallback (e.g. strict realtime credit verification), requiring asynchronous queueing instead.",
    },
    builderScenarioId: "boss-circuit-breaker",
    rewards: { firstClearXp: 320, replayXp: 40, builderXp: 150, reviewXp: 45 },
    nextHook: "Next: opening a new database connection per web request exhausts PostgreSQL server memory.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "The payment provider is down and every checkout thread waits 30 seconds.",
        constraint: "The rest of the site should still browse normally.",
        expectedFix: "Trip circuit to OPEN after consecutive failures and fail fast.",
      },
      {
        variantId: "retry-storm",
        label: "Retrying dead dependency",
        scenario: "Inventory service returns 503 and callers retry immediately, tripling traffic.",
        constraint: "Allow the dependency time to recover.",
        expectedFix: "Trip breaker, apply cooldown, and probe with limited traffic.",
      },
      {
        variantId: "partial",
        label: "Partial outage",
        scenario: "1 in 3 calls fail with high latency, but breaker only trips on 100% failure.",
        constraint: "Detect degradation early.",
        expectedFix: "Trip on error rate or latency threshold, not only total blackout.",
      },
    ],
  },
  {
    id: "connection-pooling",
    levelNumber: 11,
    title: "Connection Pooling",
    levelGoal: "Conserve database session capacity",
    chapterId: "chapter-11",
    prerequisites: ["read-replicas"],
    inherits: ["horizontal-scaling", "read-replicas"],
    difficulty: "Intermediate",
    estimatedMinutes: 6,
    skillTags: ["connection pooling", "session reuse", "concurrency limits", "PgBouncer"],
    newConstraint: "Every request opens an independent database socket, exhausting DB thread and RAM limits.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "App containers scaled to 40 pods. PostgreSQL suddenly throws 'FATAL: sorry, too many clients already' and latency skyrockets. Why?",
      options: [
        {
          id: "d-conn",
          label: "Each HTTP request creates a new TCP/TLS connection, exceeding PostgreSQL max_connections",
          isCorrect: true,
          explanation: "Opening new connections per request wastes memory, causes TLS handshake latency, and exhausts socket limits.",
        },
        {
          id: "d-disk",
          label: "Database SSD storage is full",
          isCorrect: false,
          explanation: "The error message explicitly complains about client connection limit exhaustion.",
        },
        {
          id: "d-dns",
          label: "DNS round-robin failed",
          isCorrect: false,
          explanation: "Connecting directly to DB ports without connection reuse causes the socket limit failure.",
        },
      ],
    },
    intervention: {
      question: "What architectural fix eliminates connection exhaustion while maintaining high query throughput?",
      options: [
        {
          id: "i-pool",
          label: "Maintain a bounded pool of warm connections (via HikariCP or PgBouncer) and multiplex requests across them",
          isCorrect: true,
          explanation: "Connection pools eliminate TLS handshake overhead and keep active DB threads aligned with CPU hardware capacity.",
        },
        {
          id: "i-raise",
          label: "Set max_connections = 50,000 in PostgreSQL config",
          isCorrect: false,
          explanation: "Postgres assigns RAM per backend process; 50,000 connections will trigger an immediate OS Out-Of-Memory panic.",
        },
        {
          id: "i-close",
          label: "Instruct clients to retry on 500 error",
          isCorrect: false,
          explanation: "Retrying without pooling adds even more connection requests to the saturated database.",
        },
      ],
    },
    transfer: {
      question: "50 application containers connect to an 8-core database. How should you size the connection pool per container?",
      options: [
        {
          id: "t-size",
          label: "Size pools so that total connections (pods x pool size) stays safely within the database's optimal thread budget",
          isCorrect: true,
          explanation: "Hardware can only execute a limited number of parallel queries. Too many connections causes OS context thrashing.",
        },
        {
          id: "t-max",
          label: "Give every container 500 connections regardless of database CPU core count",
          isCorrect: false,
          explanation: "Over-provisioning connection pools leads to lock contention and massive query latency degradation.",
        },
        {
          id: "t-single",
          label: "Share 1 single connection across all 50 containers over SSH",
          isCorrect: false,
          explanation: "A single connection serializes all queries, choking throughput to a complete standstill.",
        },
      ],
    },
    review: {
      question: "What is the primary benefit of connection reuse beyond avoiding max_connections limits?",
      options: [
        {
          id: "r-handshake",
          label: "Eliminating TCP three-way handshakes, TLS negotiation, and backend session authentication on every query",
          isCorrect: true,
          explanation: "Reusing pre-warmed connections cuts 20-50ms of network handshake latency from every database interaction.",
        },
        {
          id: "r-free",
          label: "Database queries execute without using CPU cycles",
          isCorrect: false,
          explanation: "Query execution still consumes database CPU; pooling only optimizes session management.",
        },
        {
          id: "r-sql",
          label: "SQL statements are automatically converted to NoSQL documents",
          isCorrect: false,
          explanation: "Pooling does not alter database dialect or storage model.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Creating fresh database connections per HTTP request exhausted server memory and socket limits.",
      whyFixWorked: "A bounded connection pool kept active database sessions within hardware limits and eliminated handshake overhead.",
      insufficientWhen: "Queries themselves are poorly indexed table scans; connection pooling cannot fix slow SQL execution.",
    },
    builderScenarioId: "boss-connection-pooling",
    rewards: { firstClearXp: 320, replayXp: 40, builderXp: 150, reviewXp: 45 },
    nextHook: "Next: producers publish work faster than workers can process, causing memory buffer overflow.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "Each request opens a new database connection and p99 login time climbs.",
        constraint: "Max connections is 200 with 40 app pods.",
        expectedFix: "Reuse a bounded connection pool per process.",
      },
      {
        variantId: "sizing",
        label: "Pool sizing rule",
        scenario: "50 pods each configure pool of 50, presenting 2,500 connections to database.",
        constraint: "Size pools within hardware budget.",
        expectedFix: "Size pools so replicas x pool size stays under DB connection limit.",
      },
      {
        variantId: "idle",
        label: "Idle timeouts",
        scenario: "Stale connections hang indefinitely after network drops.",
        constraint: "Clean up broken sockets.",
        expectedFix: "Configure keep-alives and idle connection eviction.",
      },
    ],
  },
  {
    id: "backpressure",
    levelNumber: 12,
    title: "Backpressure & Flow Control",
    levelGoal: "Prevent buffer overflow and OOM",
    chapterId: "chapter-12",
    prerequisites: ["async-queues"],
    inherits: ["async-queues"],
    difficulty: "Advanced",
    estimatedMinutes: 7,
    skillTags: ["flow control", "bounded queue", "reactive streams", "producer throttling"],
    newConstraint: "Producers enqueue work faster than consumers process it, ballooning memory until crash.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "During a batch import, producers push 50,000 jobs/sec into an in-memory queue while workers process 5,000/sec. The app OOM crashes. Why?",
      options: [
        {
          id: "d-unbounded",
          label: "The queue is unbounded in RAM, so unprocessed jobs accumulate until the heap runs out of memory",
          isCorrect: true,
          explanation: "Without flow control, any mismatch between producer rate and consumer rate leads to fatal buffer exhaustion.",
        },
        {
          id: "d-cpu",
          label: "CPUs melted from high temperatures",
          isCorrect: false,
          explanation: "Hardware thermal throttling does not cause Out-Of-Memory process termination.",
        },
        {
          id: "d-db",
          label: "The database deleted all tables",
          isCorrect: false,
          explanation: "The crash was an in-memory queue heap allocation panic.",
        },
      ],
    },
    intervention: {
      question: "How do you stop unbounded buffer growth when consumers lag behind producers?",
      options: [
        {
          id: "i-backpressure",
          label: "Apply backpressure: use a bounded queue and throttle or reject upstream producers when buffer capacity reaches high watermark",
          isCorrect: true,
          explanation: "Backpressure signals producers to slow down, matching ingestion velocity to consumer processing throughput.",
        },
        {
          id: "i-swap",
          label: "Allocate infinite swap memory on hard drives",
          isCorrect: false,
          explanation: "Disk swap thrashes performance by 1000x and only postpones inevitable process death.",
        },
        {
          id: "i-drop",
          label: "Silently discard incoming data without telling anyone",
          isCorrect: false,
          explanation: "Silent data loss corrupts business workflows and hides system failures.",
        },
      ],
    },
    transfer: {
      question: "An ingestion API receives telemetry from 10,000 IoT sensors. Downstream processing is degraded. What should the API return?",
      options: [
        {
          id: "t-429",
          label: "HTTP 429 Too Many Requests or 503 with Retry-After headers, forcing sensors to buffer locally and back off",
          isCorrect: true,
          explanation: "Signaling backpressure over HTTP lets producers hold telemetry locally and retry exponentially.",
        },
        {
          id: "t-200",
          label: "HTTP 200 OK while discarding the payload in memory",
          isCorrect: false,
          explanation: "Returning success for dropped data violates API correctness contracts.",
        },
        {
          id: "t-hang",
          label: "Leave the TCP socket open and never send a response",
          isCorrect: false,
          explanation: "Hanging sockets exhausts client connection pools and causes client-side timeout storms.",
        },
      ],
    },
    review: {
      question: "What is the core distinction between buffering and backpressure?",
      options: [
        {
          id: "r-diff",
          label: "Buffering absorbs temporary micro-bursts; backpressure handles sustained rate mismatches by slowing producers",
          isCorrect: true,
          explanation: "Buffers only help when the average consumer rate exceeds producer rate. For sustained overload, backpressure is mandatory.",
        },
        {
          id: "r-same",
          label: "Buffering and backpressure are identical mechanisms",
          isCorrect: false,
          explanation: "Buffering stores data; backpressure regulates producer velocity.",
        },
        {
          id: "r-cost",
          label: "Buffering requires GPU acceleration while backpressure requires DNS",
          isCorrect: false,
          explanation: "Both are software queueing and protocol patterns.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Producers overwhelmed consumer capacity, causing unbounded RAM growth and OOM crashes.",
      whyFixWorked: "Bounded buffers and backpressure forced producers to pace their ingestion rate.",
      insufficientWhen: "Producers cannot slow down (e.g. real-time audio streams), requiring drop-oldest policies or elastic consumer autoscaling.",
    },
    builderScenarioId: "boss-backpressure",
    rewards: { firstClearXp: 340, replayXp: 45, builderXp: 160, reviewXp: 50 },
    nextHook: "Next: network timeouts cause duplicate checkout retries and double customer credit cards.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "Producers keep appending jobs in RAM while workers are stuck, causing OOM.",
        constraint: "Work arrives faster than it completes.",
        expectedFix: "Bounded queue that blocks or returns 429 when full.",
      },
      {
        variantId: "transcode",
        label: "Accept then collapse",
        scenario: "API returns 200 for uploads even though transcode workers are 6 hours behind.",
        constraint: "Users believe work is done.",
        expectedFix: "Apply backpressure at ingest when downstream capacity is exceeded.",
      },
      {
        variantId: "reactive",
        label: "Streaming pipeline",
        scenario: "Kafka consumers process stream with uncommitted offset backlog.",
        constraint: "Prevent consumer crash loop.",
        expectedFix: "Pause consumer poll when local processing buffers saturate.",
      },
    ],
  },
  {
    id: "idempotency",
    levelNumber: 13,
    title: "Idempotency & Mutation Keys",
    levelGoal: "Ensure retries never duplicate state",
    chapterId: "chapter-13",
    prerequisites: ["async-queues"],
    inherits: ["async-queues"],
    difficulty: "Advanced",
    estimatedMinutes: 7,
    skillTags: ["idempotency key", "safe retries", "deduplication", "distributed locks"],
    newConstraint: "Network timeouts cause client retries that duplicate orders and payments.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "A shopper double-clicks 'Pay'. The client issues two identical POST /orders requests. The customer is charged twice. Why?",
      options: [
        {
          id: "d-nonidemp",
          label: "The API endpoint is non-idempotent and executes a new charge for every POST request without mutation deduplication",
          isCorrect: true,
          explanation: "Standard HTTP POST is non-idempotent by default; without explicit keys, each request is treated as a separate purchase.",
        },
        {
          id: "d-hacker",
          label: "The shopper's computer was hijacked by malware",
          isCorrect: false,
          explanation: "Accidental double-clicks and network retries are standard consumer behavior that systems must handle safely.",
        },
        {
          id: "d-dns",
          label: "DNS resolved two IP addresses simultaneously",
          isCorrect: false,
          explanation: "DNS resolution does not duplicate backend database transactions.",
        },
      ],
    },
    intervention: {
      question: "How do production payment APIs guarantee that duplicate requests never execute duplicate charges?",
      options: [
        {
          id: "i-key",
          label: "Require an Idempotency-Key header; atomically record the key and return the original cached response on repeated submissions",
          isCorrect: true,
          explanation: "Idempotency keys ensure that repeated requests with the same identifier return the initial result without re-executing mutations.",
        },
        {
          id: "i-button",
          label: "Disable the HTML button with JavaScript only",
          isCorrect: false,
          explanation: "Client-side button disabling fails under network timeouts, page reloads, mobile retries, and API integrations.",
        },
        {
          id: "i-refund",
          label: "Charge the card every time and auto-refund duplicates next week",
          isCorrect: false,
          explanation: "Duplicate charges trigger overdraft fees, card issuer fraud alerts, and merchant chargebacks.",
        },
      ],
    },
    transfer: {
      question: "A client sends a webhook event with ID 'evt_123'. The sender experiences a timeout and retries 5 seconds later. How should the consumer handle it?",
      options: [
        {
          id: "t-dedupe",
          label: "Check if event 'evt_123' was already processed; if so, acknowledge with HTTP 200 immediately without re-running logic",
          isCorrect: true,
          explanation: "Webhook consumers must be idempotent because message brokers deliver messages 'at least once'.",
        },
        {
          id: "t-reject",
          label: "Return HTTP 500 so the sender retries a third time",
          isCorrect: false,
          explanation: "Returning 500 causes the sender to retry indefinitely until the webhook queue dead-letters.",
        },
        {
          id: "t-duplicate",
          label: "Process the event again and credit the account a second time",
          isCorrect: false,
          explanation: "Re-processing at-least-once webhooks creates financial discrepancies and duplicate orders.",
        },
      ],
    },
    review: {
      question: "How should an API respond if a duplicate request arrives while the original request is STILL in-flight?",
      options: [
        {
          id: "r-conflict",
          label: "Acquire an atomic lock on the idempotency key; return HTTP 409 Conflict or hold until the first request completes",
          isCorrect: true,
          explanation: "Atomic locks prevent concurrent race conditions from executing duplicate transactions in parallel.",
        },
        {
          id: "r-concurrent",
          label: "Run both requests concurrently on separate worker threads",
          isCorrect: false,
          explanation: "Running concurrent duplicate mutations defeats the entire purpose of idempotency keys.",
        },
        {
          id: "r-crash",
          label: "Crash the server process",
          isCorrect: false,
          explanation: "Concurrent retries are normal; crashing is unacceptable.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Network retries executed duplicate charges because mutation endpoints lacked deduplication.",
      whyFixWorked: "Idempotency keys and atomic response caching guaranteed exactly-once processing semantics.",
      insufficientWhen: "Clients change the idempotency key on each retry or cache TTL expires before late retries arrive.",
    },
    builderScenarioId: "boss-idempotency",
    rewards: { firstClearXp: 340, replayXp: 45, builderXp: 160, reviewXp: 50 },
    nextHook: "Next: an entire cloud region goes dark; global users lose access with zero failover.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "A shopper double-clicks Pay and two POSTs create two orders and two charges.",
        constraint: "The client may retry; the user meant one purchase.",
        expectedFix: "Idempotency key so second POST returns original order.",
      },
      {
        variantId: "webhook",
        label: "Webhook delivered twice",
        scenario: "Payment provider sends the same paid event twice after timeout.",
        constraint: "At-least-once delivery is documented.",
        expectedFix: "Dedupe on event ID and treat second delivery as no-op success.",
      },
      {
        variantId: "inflight",
        label: "Concurrent in-flight retry",
        scenario: "Duplicate retry arrives while original transaction is still executing.",
        constraint: "Prevent race condition.",
        expectedFix: "Acquire atomic lock and return 409 Conflict or wait on lock.",
      },
    ],
  },
  {
    id: "multi-region",
    levelNumber: 14,
    title: "Multi-Region & Disaster Recovery",
    levelGoal: "Survive complete datacenter outages",
    chapterId: "chapter-14",
    prerequisites: ["cdn-edge", "consistency"],
    inherits: ["cdn-edge", "consistency"],
    difficulty: "Advanced",
    estimatedMinutes: 8,
    skillTags: ["disaster recovery", "active-active", "Anycast", "geographic redundancy"],
    newConstraint: "A single regional datacenter failure takes down 100% of global availability.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "A major fiber cut takes an entire cloud region (us-east-1) offline. All global users experience total downtime. What architectural vulnerability existed?",
      options: [
        {
          id: "d-region",
          label: "Single-region architecture creates an existential Single Point of Failure (SPOF) for the entire business",
          isCorrect: true,
          explanation: "Even with multiple availability zones, regional control planes and power grids can fail entirely.",
        },
        {
          id: "d-router",
          label: "Users' home Wi-Fi routers failed simultaneously",
          isCorrect: false,
          explanation: "The outage was datacenter-side across the primary cloud provider region.",
        },
        {
          id: "d-ssl",
          label: "SSL certificates expired",
          isCorrect: false,
          explanation: "Certificate expiry does not correlate to cloud provider regional infrastructure blackouts.",
        },
      ],
    },
    intervention: {
      question: "How do global platforms achieve high availability against whole-region disasters?",
      options: [
        {
          id: "i-multiregion",
          label: "Deploy across multiple geographic regions with health-checked DNS / Anycast routing and cross-region replication",
          isCorrect: true,
          explanation: "Multi-region deployments ensure that if one continent or region fails, traffic automatically reroutes to healthy regions.",
        },
        {
          id: "i-singlebig",
          label: "Purchase a larger mainframe server in the same datacenter",
          isCorrect: false,
          explanation: "A larger server in a dark datacenter is still completely unreachable.",
        },
        {
          id: "i-dnsstatic",
          label: "Manually email users a new website URL during outages",
          isCorrect: false,
          explanation: "Disaster recovery must be automated with sub-minute Recovery Time Objectives (RTO).",
        },
      ],
    },
    transfer: {
      question: "During regional failover, DNS TTL was set to 86,400 seconds (24 hours). What problem occurs?",
      options: [
        {
          id: "t-ttl",
          label: "Clients and ISPs cache the dead IP for 24 hours, preventing users from seeing the healthy failover region",
          isCorrect: true,
          explanation: "Global failover requires low DNS TTLs (e.g. 10-60s) or BGP Anycast routing so traffic redirects immediately.",
        },
        {
          id: "t-fast",
          label: "DNS failover occurs faster than the speed of light",
          isCorrect: false,
          explanation: "Long TTLs delay failover; they do not speed it up.",
        },
        {
          id: "t-encrypt",
          label: "DNS packets become unencrypted",
          isCorrect: false,
          explanation: "TTL controls cache expiration, not encryption.",
        },
      ],
    },
    review: {
      question: "What is the primary engineering challenge of Multi-Region Active-Active databases?",
      options: [
        {
          id: "r-latency",
          label: "Speed-of-light cross-ocean network latency forces tradeoffs between immediate consistency and write throughput",
          isCorrect: true,
          explanation: "Synchronous cross-region writes add 100-200ms latency. Most systems use asynchronous replication with conflict resolution.",
        },
        {
          id: "r-cables",
          label: "Fiber-optic cables cannot transmit numbers larger than 1,000",
          isCorrect: false,
          explanation: "Physical data limits are not the constraint; physics (speed of light in glass) is.",
        },
        {
          id: "r-free",
          label: "Multi-region hosting eliminates cloud hosting bills",
          isCorrect: false,
          explanation: "Multi-region architecture increases infrastructure and cross-region egress costs.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "An entire cloud region went dark, knocking out all users due to lack of multi-region redundancy.",
      whyFixWorked: "Multi-region deployment and health-checked routing rerouted traffic to healthy continents.",
      insufficientWhen: "Cross-region data replication lag causes split-brain writes during active-active network partitions.",
    },
    builderScenarioId: "boss-multi-region",
    rewards: { firstClearXp: 360, replayXp: 50, builderXp: 180, reviewXp: 55 },
    nextHook: "Next: silently corrupted instances receive traffic and cause intermittent failures without health checking.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "Availability-zone storm takes only region offline; product unreachable worldwide.",
        constraint: "RTO 15 minutes, near-zero RPO.",
        expectedFix: "Second region with automated health-checked failover.",
      },
      {
        variantId: "dns-cache",
        label: "DNS failover delay",
        scenario: "Primary region dies, but clients cache old IP for 30 minutes due to 1800s TTL.",
        constraint: "Sub-minute automated reroute.",
        expectedFix: "Health-checked routing with short TTLs or BGP Anycast.",
      },
      {
        variantId: "split-brain",
        label: "Cross-region writes",
        scenario: "Two regions accept writes to the same record during cross-region partition.",
        constraint: "Reconcile conflicting mutations.",
        expectedFix: "Region-homed partitioning or CRDT conflict resolution.",
      },
    ],
  },
  {
    id: "health-checks",
    levelNumber: 15,
    title: "Health Checks & Node Eviction",
    levelGoal: "Detect and isolate zombie nodes",
    chapterId: "chapter-15",
    prerequisites: ["load-balancing", "circuit-breaker"],
    inherits: ["load-balancing", "circuit-breaker"],
    difficulty: "Advanced",
    estimatedMinutes: 7,
    skillTags: ["liveness", "readiness", "outlier detection", "graceful degradation"],
    newConstraint: "Silently degraded nodes continue receiving requests, causing intermittent 500 errors.",
    objectives: RUN_OBJECTIVES,
    diagnosis: {
      question: "Server 2's background thread pool is deadlocked and throwing 500 on all API calls, but its TCP socket still accepts connections. What happens without health checking?",
      options: [
        {
          id: "d-zombie",
          label: "The load balancer continues routing traffic to the zombie node, failing 33% of user requests indefinitely",
          isCorrect: true,
          explanation: "TCP-only or missing application health checks fail to detect process-level deadlock and silent degradation.",
        },
        {
          id: "d-selfheal",
          label: "The server will automatically reboot itself within 1 second",
          isCorrect: false,
          explanation: "Deadlocked processes rarely self-terminate without external orchestrator probes.",
        },
        {
          id: "d-client",
          label: "Clients will automatically avoid the broken IP",
          isCorrect: false,
          explanation: "Clients talk to the load balancer, not directly to backend nodes.",
        },
      ],
    },
    intervention: {
      question: "How should health check probes be designed to protect traffic without crashing servers?",
      options: [
        {
          id: "i-probes",
          label: "Separate Liveness (restart deadlocked process) from Readiness (stop sending traffic if temporary buffer full)",
          isCorrect: true,
          explanation: "Splitting probes prevents reboot cascading while keeping broken nodes out of active load balancer pools.",
        },
        {
          id: "i-deep",
          label: "Have /health execute a heavy SELECT * query on the database every 500ms from 500 pods",
          isCorrect: false,
          explanation: "Heavy dependency checks turn health probing into a self-inflicted denial-of-service attack on the database.",
        },
        {
          id: "i-disable",
          label: "Disable all health checks in production to save bandwidth",
          isCorrect: false,
          explanation: "Disabling health checks leaves zombie and crashed servers in rotation.",
        },
      ],
    },
    transfer: {
      question: "A new container takes 45 seconds to warm up its local cache before it can serve traffic. Which probe manages this startup period?",
      options: [
        {
          id: "t-startup",
          label: "Startup probe / Readiness probe with initialDelaySeconds, keeping traffic off the pod until cache warmup completes",
          isCorrect: true,
          explanation: "Readiness gates prevent premature traffic routing until the container signals it is fully prepared.",
        },
        {
          id: "t-livekill",
          label: "A 5-second liveness probe that kills and restarts the pod repeatedly during warmup",
          isCorrect: false,
          explanation: "Aggressive liveness probes cause crash-loop backoff during initialization.",
        },
        {
          id: "t-traffic",
          label: "Send 100% of production traffic immediately to force cache population",
          isCorrect: false,
          explanation: "Dumping traffic on cold caches causes 100% cache misses and database saturation.",
        },
      ],
    },
    review: {
      question: "What is 'flapping' in node health detection and how is it mitigated?",
      options: [
        {
          id: "r-flapping",
          label: "Rapid switching between healthy and unhealthy states; mitigated using consecutive success/failure thresholds",
          isCorrect: true,
          explanation: "Hysteresis (e.g. requiring 3 consecutive failures to evict, 3 consecutive successes to restore) stabilizes cluster membership.",
        },
        {
          id: "r-wing",
          label: "Servers physically vibrating in datacenter racks",
          isCorrect: false,
          explanation: "Flapping refers to state oscillation in monitoring systems.",
        },
        {
          id: "r-dns",
          label: "DNS changing from IPv4 to IPv6",
          isCorrect: false,
          explanation: "Flapping is about probe volatility, not IP addressing standards.",
        },
      ],
    },
    tradeoff: {
      whatFailed: "Silently deadlocked nodes continued receiving requests, causing high error rates.",
      whyFixWorked: "Active health checks and readiness thresholds evicted unhealthy nodes automatically.",
      insufficientWhen: "Probes check external dependencies too deeply, causing cluster-wide reboot storms during third-party hiccups.",
    },
    builderScenarioId: "boss-health-checks",
    rewards: { firstClearXp: 360, replayXp: 50, builderXp: 180, reviewXp: 55 },
    nextHook: "Congratulations! You have mastered all 15 core architectural patterns of distributed systems engineering.",
    replayFamily: [
      {
        variantId: "baseline",
        label: "Baseline",
        scenario: "Pod is killed because /health fails while process is warming a local cache.",
        constraint: "Process alive but not ready for traffic.",
        expectedFix: "Split liveness (restart) from readiness (traffic gate).",
      },
      {
        variantId: "db-probe",
        label: "Probes amplify load",
        scenario: "Every 2s probe runs SELECT 1 on primary database from 300 pods.",
        constraint: "Probes become a real bottleneck.",
        expectedFix: "Check local process health without amplifying primary DB load.",
      },
      {
        variantId: "zombie",
        label: "Zombie thread deadlock",
        scenario: "Thread pool deadlocks while TCP port remains open, returning 500s.",
        constraint: "Evict dead worker from balancer.",
        expectedFix: "Active application-layer health check and outlier eviction.",
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
