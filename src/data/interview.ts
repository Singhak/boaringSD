import { InterviewProblem } from "@/types";

export const INTERVIEW_PROBLEMS: InterviewProblem[] = [
  {
    id: "interview-url-shortener",
    title: "Mini Interview: Design URL Shortener",
    difficulty: "Medium",
    durationMinutes: 10,
    rewardXp: 200,
    scenario:
      "Design a production-ready, globally distributed URL shortening service like TinyURL / bit.ly. System handles 100M new URLs per month with a 100:1 Read-to-Write traffic ratio.",
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
  },
  {
    id: "interview-twitter-timeline",
    title: "Mini Interview: Design Twitter Feed",
    difficulty: "Hard",
    durationMinutes: 10,
    rewardXp: 250,
    scenario:
      "Design the home timeline feed generation for Twitter (X). 300 Million Daily Active Users (DAU), 500M tweets posted per day, users expect home feed load in under 200ms.",
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
        { id: "bt-cdn", label: "Cloudflare CDN (Media)", type: "cdn" },
        { id: "bt-lb", label: "Layer 7 Load Balancers", type: "load_balancer" },
        { id: "bt-srv", label: "Timeline API Fleet", type: "server" },
        { id: "bt-cache", label: "Redis Timeline Cache", type: "cache" },
        { id: "bt-db", label: "Sharded Tweet Database", type: "database" },
      ],
      summary:
        "The Fanout-on-Write model pushes tweet IDs directly into followers' pre-computed Redis timeline lists. Reading the home timeline becomes an O(1) Redis LRANGE operation instead of expensive multi-table database joins.",
      spofVulnerabilitiesWithout: [
        "Without In-Memory Feed Cache: Complex SQL joins across millions of follow edges will timeout database connections.",
        "Without Redundant Servers & LB: Peak events (Super Bowl, World Cup) immediately overwhelm single compute node.",
      ],
    },
  },
];
