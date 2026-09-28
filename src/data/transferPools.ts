import type { PatternQuestion } from "@/types";

export const ADDITIONAL_TRANSFERS: Record<string, PatternQuestion[]> = {
  "horizontal-scaling": [
    {
      "question": "A PDF report rendering worker pool saturates its CPU during end-of-month accounting. How should you scale it?",
      "options": [
        {
          "id": "hs-t1-opt",
          "label": "Spin up a fleet of identical stateless render containers behind a job queue",
          "isCorrect": true,
          "explanation": "Rendering jobs are compute-heavy and independent; spreading them across stateless workers adds capacity linearly without single-node limits."
        },
        {
          "id": "hs-t1-dis1",
          "label": "Migrate the rendering service onto a bare-metal 128-core mainframe server for this system cluster",
          "isCorrect": false,
          "explanation": "Upsizing one node retains the single point of failure and hits a hardware ceiling when monthly jobs double again."
        },
        {
          "id": "hs-t1-dis2",
          "label": "Compress invoice template assets and increase timeout from 30s to 300s for this system cluster",
          "isCorrect": false,
          "explanation": "Asset compression saves trivial bytes; longer timeouts merely hide the queue backlog without adding compute throughput."
        }
      ]
    },
    {
      "question": "An image processing service spikes 10x during user avatar uploads on launch day. What is the right scaling posture?",
      "options": [
        {
          "id": "hs-t2-dis1",
          "label": "Pin each user session to an individual node via persistent sticky IP routing under active production conditions",
          "isCorrect": false,
          "explanation": "Sticky routing causes load skew when popular users or batch uploads overwhelm individual servers."
        },
        {
          "id": "hs-t2-opt",
          "label": "Autoscale identical stateless worker pods horizontally based on CPU thresholds",
          "isCorrect": true,
          "explanation": "Stateless image resizing scales horizontally; autoscaling adds replicas to absorb the burst and scales down afterwards."
        },
        {
          "id": "hs-t2-dis2",
          "label": "Store uploaded images in local server NVMe disks and bypass network storage",
          "isCorrect": false,
          "explanation": "Local storage turns stateless workers stateful, preventing any subsequent server from processing or serving the files."
        }
      ]
    },
    {
      "question": "A payment verification webhook receiver drops connections during Black Friday checkouts. What is the immediate fix?",
      "options": [
        {
          "id": "hs-t3-dis1",
          "label": "Increase socket keep-alive timers and max concurrent connections on one box",
          "isCorrect": false,
          "explanation": "Tuning connection limits on a single instance cannot overcome kernel context-switching and socket limits under extreme load."
        },
        {
          "id": "hs-t3-dis2",
          "label": "Recompile the webhook parsing service with aggressive compiler speed flags",
          "isCorrect": false,
          "explanation": "Micro-optimizing compiled code gives marginal percent gains when the system needs multiples of inbound capacity."
        },
        {
          "id": "hs-t3-opt",
          "label": "Deploy multiple stateless webhook receiver instances behind an ingress balancer",
          "isCorrect": true,
          "explanation": "Distributing stateless webhook ingestion across multiple nodes absorbs the connection burst cleanly."
        }
      ]
    }
  ],
  "load-balancing": [
    {
      "question": "A WebSocket multiplayer game gateway suffers from 90% of connections landing on one backend node. How should you fix it?",
      "options": [
        {
          "id": "lb-t1-opt",
          "label": "Switch balancer algorithm to least-connections with dynamic health weights",
          "isCorrect": true,
          "explanation": "Persistent WebSocket connections vary in duration; least-connections routes new clients to nodes with fewer open sockets."
        },
        {
          "id": "lb-t1-dis1",
          "label": "Apply round-robin routing on raw DNS A-records directly at the root zone for this system cluster",
          "isCorrect": false,
          "explanation": "DNS round-robin ignores connection lifetimes and active node load, leaving long-lived sockets clustered."
        },
        {
          "id": "lb-t1-dis2",
          "label": "Deploy duplicate ingress gateways with hardcoded static IP port mappings for this system cluster",
          "isCorrect": false,
          "explanation": "Static IP mappings require manual client reconfiguration and fail to balance live connection counts dynamically."
        }
      ]
    },
    {
      "question": "An e-commerce checkout service sees severe latency variance because some requests process 50-item carts. What balancing strategy works best?",
      "options": [
        {
          "id": "lb-t2-dis1",
          "label": "Use deterministic round-robin to ensure equal count of requests per node",
          "isCorrect": false,
          "explanation": "Equal request count causes severe skew when request workloads vary by an order of magnitude."
        },
        {
          "id": "lb-t2-opt",
          "label": "Route using least-outstanding-requests or peak-EWMA latency balancing in production",
          "isCorrect": true,
          "explanation": "Least-outstanding-requests steers heavy carts away from nodes already busy processing compute-heavy orders."
        },
        {
          "id": "lb-t2-dis2",
          "label": "Hash client IP addresses to pin shoppers consistently to the same server under active production conditions",
          "isCorrect": false,
          "explanation": "IP hashing concentrates entire corporate offices or mobile carrier proxies onto single overloaded backends."
        }
      ]
    },
    {
      "question": "During a blue-green deploy, 50% of traffic directed to new pods fails health checks. How does the balancer protect users?",
      "options": [
        {
          "id": "lb-t3-dis1",
          "label": "Retry failed connections indefinitely until the unhealthy new pod recovers",
          "isCorrect": false,
          "explanation": "Indefinite retries tie up client sockets and cascade latency into timeouts across the application."
        },
        {
          "id": "lb-t3-dis2",
          "label": "Return HTTP 503 Service Unavailable directly to trigger client reloads",
          "isCorrect": false,
          "explanation": "Failing immediately without rerouting degrades availability while healthy green pods remain idle."
        },
        {
          "id": "lb-t3-opt",
          "label": "Evict failing targets from the active pool and route to healthy green pods",
          "isCorrect": true,
          "explanation": "Active health checks remove unresponsive nodes instantly, shielding users from deployment regressions."
        }
      ]
    }
  ],
  "read-replicas": [
    {
      "question": "A real estate portal experiences 98% search reads on property listings, choking the primary database. What should you deploy?",
      "options": [
        {
          "id": "rr-t1-opt",
          "label": "Provision read replicas with read/write splitting at the application layer",
          "isCorrect": true,
          "explanation": "Offloading browse and search queries to async read replicas frees the primary database exclusively for new listings."
        },
        {
          "id": "rr-t1-dis1",
          "label": "Upgrade primary database storage volume to provisioned IOPS SSD drives for this system cluster",
          "isCorrect": false,
          "explanation": "Faster storage helps disk throughput but does not relieve CPU connection saturation caused by tens of thousands of concurrent reads."
        },
        {
          "id": "rr-t1-dis2",
          "label": "Convert all relational database tables into denormalized CSV file exports for this system cluster",
          "isCorrect": false,
          "explanation": "Exporting CSV files destroys indexing and query capabilities while failing to address live transactional needs."
        }
      ]
    },
    {
      "question": "A social media feed reads from replicas, but users complain their new posts disappear on page refresh. What is the root cause?",
      "options": [
        {
          "id": "rr-t2-dis1",
          "label": "Primary database query optimizer is dropping the newly created row index",
          "isCorrect": false,
          "explanation": "The primary executes writes correctly; disappearing rows after write indicate replication latency, not missing indexes."
        },
        {
          "id": "rr-t2-opt",
          "label": "Replication lag on async replicas causes stale reads immediately post-write",
          "isCorrect": true,
          "explanation": "Async replication takes milliseconds to seconds to catch up; routing immediately post-write reads to the primary prevents this."
        },
        {
          "id": "rr-t2-dis2",
          "label": "Browser HTTP caching headers are permanently corrupting client DOM trees under active production conditions",
          "isCorrect": false,
          "explanation": "DOM trees do not get corrupted by caching headers; the issue is that the replica hasn't received the write yet."
        }
      ]
    },
    {
      "question": "An analytics dashboard runs heavy 10-minute aggregation queries against Postgres. How should you protect OLTP transactions?",
      "options": [
        {
          "id": "rr-t3-dis1",
          "label": "Set aggressive 2-second statement timeouts on all queries on the primary DB",
          "isCorrect": false,
          "explanation": "Strict timeouts break analytics reports completely rather than isolating the resource consumption."
        },
        {
          "id": "rr-t3-opt",
          "label": "Direct all analytical reporting queries to a dedicated read-only replica",
          "isCorrect": true,
          "explanation": "A dedicated analytics replica isolates heavy table scans from critical customer-facing write transactions."
        },
        {
          "id": "rr-t3-dis2",
          "label": "Execute reporting queries in raw memory buffers on the ingress reverse proxy",
          "isCorrect": false,
          "explanation": "Reverse proxies lack the data schema, query engine, and memory capacity to perform complex SQL aggregations."
        }
      ]
    }
  ],
  "caching": [
    {
      "question": "A flight booking API repeatedly evaluates identical seat map queries. What caching pattern should you implement?",
      "options": [
        {
          "id": "c-t1-opt",
          "label": "Cache seat maps in Redis using cache-aside with a short TTL and explicit eviction",
          "isCorrect": true,
          "explanation": "Cache-aside serves frequent read hits from sub-ms memory while evicting on seat reservation updates."
        },
        {
          "id": "c-t1-dis1",
          "label": "Cache full database disk blocks in Linux page cache on every app server for this system cluster",
          "isCorrect": false,
          "explanation": "App servers cannot read raw database disk blocks over network mounts without severe corruption risks."
        },
        {
          "id": "c-t1-dis2",
          "label": "Disable database transactions and query seat availability without locking for this system cluster",
          "isCorrect": false,
          "explanation": "Skipping transactions causes double-booking disasters and does not reduce repetitive read overhead."
        }
      ]
    },
    {
      "question": "A breaking news article expires in Redis, causing 10,000 concurrent requests to hit Postgres simultaneously. What mitigates this?",
      "options": [
        {
          "id": "c-t2-dis1",
          "label": "Increase PostgreSQL connection pool limit to 50,000 maximum client sockets",
          "isCorrect": false,
          "explanation": "Massive connection pools cause thread thrashing and memory exhaustion, accelerating database collapse."
        },
        {
          "id": "c-t2-opt",
          "label": "Implement singleflight mutex locking or proactive early refresh before TTL expiry",
          "isCorrect": true,
          "explanation": "Singleflight ensures only one request fetches from DB on a cache miss while other concurrent requests wait for the result."
        },
        {
          "id": "c-t2-dis2",
          "label": "Remove TTL completely so the news article remains permanently in Redis RAM under active production conditions",
          "isCorrect": false,
          "explanation": "Permanent keys without invalidation lead to unbounded memory leaks and permanently stale article corrections."
        }
      ]
    },
    {
      "question": "An e-commerce flash sale updates inventory counts 500 times per second. Why is standard cache-aside problematic here?",
      "options": [
        {
          "id": "c-t3-dis1",
          "label": "Redis cannot process more than 100 read commands per second in production",
          "isCorrect": false,
          "explanation": "Redis comfortably handles over 100,000 operations per second; throughput is not the constraint."
        },
        {
          "id": "c-t3-dis2",
          "label": "TCP handshakes between app and Redis consume all ephemeral server ports",
          "isCorrect": false,
          "explanation": "Connection pools maintain persistent TCP connections to Redis, preventing port exhaustion."
        },
        {
          "id": "c-t3-opt",
          "label": "High write frequency causes continuous cache thrashing and stale inventory races",
          "isCorrect": true,
          "explanation": "Frequent updates invalidate cached keys immediately, reducing cache hit rates to near zero while risking race conditions."
        }
      ]
    }
  ],
  "cdn-edge": [
    {
      "question": "A global video streaming service experiences high latency for thumbnail posters in Asia from a US origin. What is the solution?",
      "options": [
        {
          "id": "cdn-t1-opt",
          "label": "Distribute static poster images via a multi-region CDN with Anycast edge nodes",
          "isCorrect": true,
          "explanation": "CDNs terminate TLS near users and cache static media at edge PoPs, cutting round-trip latency from 250ms to 15ms."
        },
        {
          "id": "cdn-t1-dis1",
          "label": "Upgrade the US origin web server network interface to dual 100 Gbps fiber for this system cluster",
          "isCorrect": false,
          "explanation": "Bandwidth does not reduce speed-of-light propagation delay across trans-Pacific undersea cables."
        },
        {
          "id": "cdn-t1-dis2",
          "label": "Convert all video poster graphics into raw base64 strings inside HTML pages for this system cluster",
          "isCorrect": false,
          "explanation": "Inlining base64 blows up HTML document size by 33% and prevents browser caching of image assets."
        }
      ]
    },
    {
      "question": "A retail site deploys a new JavaScript bundle, but global users report checkout bugs because edge PoPs hold the old version. What fixes this?",
      "options": [
        {
          "id": "cdn-t2-dis1",
          "label": "Instruct all global customers to manually perform hard browser refreshes",
          "isCorrect": false,
          "explanation": "Relying on end-user browser actions is impossible for millions of active public shoppers."
        },
        {
          "id": "cdn-t2-opt",
          "label": "Use content-hashed asset filenames (e.g., app.8f2a.js) and short HTML edge TTLs",
          "isCorrect": true,
          "explanation": "Content hashing ensures new deploys request new immutable filenames, bypassing stale edge caches instantaneously."
        },
        {
          "id": "cdn-t2-dis2",
          "label": "Disable CDN caching entirely for all static assets across the global estate under active production conditions",
          "isCorrect": false,
          "explanation": "Disabling CDN caching exposes the origin servers to massive traffic spikes and degrades global performance."
        }
      ]
    },
    {
      "question": "An API gateway forwards personalized user account balance requests through a CDN. What header prevents data leaks between users?",
      "options": [
        {
          "id": "cdn-t3-dis1",
          "label": "Set Access-Control-Allow-Origin to wildcard asterisk on all balance endpoints",
          "isCorrect": false,
          "explanation": "CORS headers control browser script access, not edge proxy caching behavior."
        },
        {
          "id": "cdn-t3-dis2",
          "label": "Compress payload with Brotli compression and set Transfer-Encoding chunked",
          "isCorrect": false,
          "explanation": "Compression reduces byte payload size but does not indicate whether a response is private to one user."
        },
        {
          "id": "cdn-t3-opt",
          "label": "Set Cache-Control to private, no-store or authenticate at edge before serving",
          "isCorrect": true,
          "explanation": "Cache-Control: private, no-store instructs shared intermediate CDN proxies never to cache user-specific responses."
        }
      ]
    }
  ],
  "async-queues": [
    {
      "question": "An order checkout service must send confirmation emails and generate PDF invoices without slowing the checkout response. What should you do?",
      "options": [
        {
          "id": "q-t1-opt",
          "label": "Publish an order.created event to a message queue and let async workers process it",
          "isCorrect": true,
          "explanation": "Message queues decouple slow downstream tasks (SMTP, PDF generation) from the synchronous checkout HTTP request."
        },
        {
          "id": "q-t1-dis1",
          "label": "Execute PDF rendering and email dispatch in synchronous thread pool on web pods for this system cluster",
          "isCorrect": false,
          "explanation": "Synchronous background threads on web servers still consume container CPU and risk dropping jobs on pod restarts."
        },
        {
          "id": "q-t1-dis2",
          "label": "Instruct the mobile client to make separate sequential calls to email servers for this system cluster",
          "isCorrect": false,
          "explanation": "Offloading backend orchestration to client apps creates security holes and causes failed invoices on network drops."
        }
      ]
    },
    {
      "question": "A queue worker encounters a malformed payload and crashes repeatedly, blocking the partition for all valid messages. How do you resolve this?",
      "options": [
        {
          "id": "q-t2-dis1",
          "label": "Restart the worker fleet in a continuous loop until the message succeeds",
          "isCorrect": false,
          "explanation": "Restarting workers without removing the poison pill message causes a crash loop that halts all processing."
        },
        {
          "id": "q-t2-opt",
          "label": "Route unprocessable messages to a Dead Letter Queue (DLQ) after N retries",
          "isCorrect": true,
          "explanation": "A DLQ isolates poison pills for engineering inspection while allowing normal queue processing to continue unblocked."
        },
        {
          "id": "q-t2-dis2",
          "label": "Disable error logging on workers to prevent uncaught exception stack traces",
          "isCorrect": false,
          "explanation": "Silencing logs hides catastrophic processing failures without preventing node crashes or data loss."
        }
      ]
    },
    {
      "question": "During a flash sale, queue length jumps to 2,000,000 messages. Worker CPU is 100%. What is the appropriate response?",
      "options": [
        {
          "id": "q-t3-dis1",
          "label": "Purge the oldest 1,000,000 messages from the queue buffer to catch up quickly",
          "isCorrect": false,
          "explanation": "Purging messages destroys paid customer orders and causes massive financial discrepancies."
        },
        {
          "id": "q-t3-dis2",
          "label": "Increase queue message retention time from 7 days to 30 days in broker config",
          "isCorrect": false,
          "explanation": "Retention settings configure data expiry in the broker but do not increase consumption throughput."
        },
        {
          "id": "q-t3-opt",
          "label": "Autoscale worker consumers horizontally and increase prefetch batch size",
          "isCorrect": true,
          "explanation": "Scaling consumer workers horizontally increases message drain rate to match the ingress volume."
        }
      ]
    }
  ],
  "sharding": [
    {
      "question": "A SaaS CRM table exceeds 10 TB and single-node Postgres write IOPS is saturated. How should you partition the data?",
      "options": [
        {
          "id": "sh-t1-opt",
          "label": "Shard database tables horizontally by tenant_id across independent DB nodes",
          "isCorrect": true,
          "explanation": "Tenant-based sharding isolates multi-tenant workloads across nodes while keeping each tenant's relational queries local."
        },
        {
          "id": "sh-t1-dis1",
          "label": "Move old records into compressed zip files attached to local filesystem storage",
          "isCorrect": false,
          "explanation": "Zip archives are unindexed and break SQL queries for historical customer records."
        },
        {
          "id": "sh-t1-dis2",
          "label": "Partition tables vertically by splitting column text datatypes into binary BLOBs",
          "isCorrect": false,
          "explanation": "Converting text to BLOBs adds serialization overhead without reducing overall write volume or row counts."
        }
      ]
    },
    {
      "question": "In a hash-sharded user database, adding a 5th node requires rehashing 80% of all keys. What technique avoids mass data movement?",
      "options": [
        {
          "id": "sh-t2-dis1",
          "label": "Use modulo arithmetic on incremental user auto-increment sequence keys under active production conditions",
          "isCorrect": false,
          "explanation": "Standard modulo (key % N) forces almost all keys to move whenever node count N changes."
        },
        {
          "id": "sh-t2-opt",
          "label": "Implement consistent hashing with virtual nodes to minimize key migration",
          "isCorrect": true,
          "explanation": "Consistent hashing ensures that adding a node only moves K/N keys, keeping 1 - 1/N of keys undisturbed."
        },
        {
          "id": "sh-t2-dis2",
          "label": "Store all user rows on every node and broadcast writes synchronously",
          "isCorrect": false,
          "explanation": "Replicating every row everywhere defeats the purpose of sharding and multiplies write contention."
        }
      ]
    },
    {
      "question": "A social network shards user tweets by user_id. A query for 'all tweets containing the word #tech' is slow because it hits all shards. What is this called?",
      "options": [
        {
          "id": "sh-t3-dis1",
          "label": "Cache stampede thundering herd contention on the primary database gateway",
          "isCorrect": false,
          "explanation": "This is a distributed query scatter-gather problem, not a cache invalidation race."
        },
        {
          "id": "sh-t3-opt",
          "label": "Scatter-gather fanout penalty; secondary non-shard key queries hit every node",
          "isCorrect": true,
          "explanation": "Querying without the shard key forces the router to broadcast to every shard and merge responses."
        },
        {
          "id": "sh-t3-dis2",
          "label": "Write-ahead log buffer exhaustion occurring during parallel table scan runs",
          "isCorrect": false,
          "explanation": "WAL is consumed during write operations; reading across shards does not saturate write-ahead logs."
        }
      ]
    }
  ],
  "consistency": [
    {
      "question": "A banking ledger allows users to transfer funds between accounts. Why is eventual consistency unacceptable here?",
      "options": [
        {
          "id": "cons-t1-opt",
          "label": "Eventual consistency allows concurrent double-spends before balance updates replicate",
          "isCorrect": true,
          "explanation": "Without strict serializable consistency, two concurrent transfers can both read the old balance and overdraft."
        },
        {
          "id": "cons-t1-dis1",
          "label": "Eventual consistency forces database connection pools to throttle query execution for this system cluster",
          "isCorrect": false,
          "explanation": "Consistency models govern state correctness across nodes, not connection pool scheduling."
        },
        {
          "id": "cons-t1-dis2",
          "label": "Eventual consistency doubles monthly cloud storage pricing on relational tables for this system cluster",
          "isCorrect": false,
          "explanation": "Consistency models do not dictate cloud storage tier pricing."
        }
      ]
    },
    {
      "question": "A distributed key-value store operates with N=3 replicas. Which quorum configuration guarantees strong consistency?",
      "options": [
        {
          "id": "cons-t2-dis1",
          "label": "Write to 1 node (W=1) and read from 1 node (R=1) for minimum latency",
          "isCorrect": false,
          "explanation": "W=1, R=1 has W + R = 2 <= 3; readers can query replicas that missed the write and observe stale data."
        },
        {
          "id": "cons-t2-opt",
          "label": "Configure quorum so that R + W > N (e.g. Write to 2 nodes, Read from 2 nodes)",
          "isCorrect": true,
          "explanation": "When R + W > N, the read set and write set must overlap by at least one node containing the latest timestamped value."
        },
        {
          "id": "cons-t2-dis2",
          "label": "Write to all 3 nodes (W=3) and read from 0 nodes using local client cache under active production conditions",
          "isCorrect": false,
          "explanation": "Reading from 0 nodes is nonsensical; clients cannot read verified distributed state without querying nodes."
        }
      ]
    },
    {
      "question": "A user edits their profile name and clicks Save. When the page reloads, the old name briefly shows. What guarantee was missed?",
      "options": [
        {
          "id": "cons-t3-dis1",
          "label": "Monotonic read consistency across cross-continental asynchronous replicas",
          "isCorrect": false,
          "explanation": "Monotonic reads prevent time from moving backwards across reads; here the user failed to see their own immediate write."
        },
        {
          "id": "cons-t3-opt",
          "label": "Read-your-own-writes consistency, routing immediate subsequent reads to primary",
          "isCorrect": true,
          "explanation": "Read-your-own-writes ensures an actor always sees updates submitted by themselves, avoiding user confusion."
        },
        {
          "id": "cons-t3-dis2",
          "label": "Strict two-phase commit transaction locking on all global database indexes",
          "isCorrect": false,
          "explanation": "Profile name updates do not require multi-datacenter 2PC; read routing to the primary suffices."
        }
      ]
    }
  ],
  "rate-limiting": [
    {
      "question": "An AI generation API costs $0.05 per inference. A rogue customer loops requests and exhausts corporate budget. What should you deploy?",
      "options": [
        {
          "id": "rl-t1-opt",
          "label": "API key token bucket rate limiter at edge ingress returning HTTP 429",
          "isCorrect": true,
          "explanation": "Token buckets enforce per-minute quotas per API key at the edge before expensive LLM inference executes."
        },
        {
          "id": "rl-t1-dis1",
          "label": "Scale up AI inference model worker nodes to absorb the extra request flood",
          "isCorrect": false,
          "explanation": "Scaling out expensive GPU nodes accelerates budget depletion instead of capping abuse."
        },
        {
          "id": "rl-t1-dis2",
          "label": "Lower TCP MTU packet size on customer sockets to throttle bandwidth for this system cluster",
          "isCorrect": false,
          "explanation": "Network packet fragmentation degrades network efficiency without enforcing logical request quotas."
        }
      ]
    },
    {
      "question": "A fixed-window rate limiter allows 100 requests per minute. An attacker sends 100 at 00:59 and 100 at 01:00. What is the flaw?",
      "options": [
        {
          "id": "rl-t2-dis1",
          "label": "Clock drift between NTP servers causes token balances to corrupt in memory under active production conditions",
          "isCorrect": false,
          "explanation": "The vulnerability is structural in fixed window algorithms, not caused by NTP server drift."
        },
        {
          "id": "rl-t2-opt",
          "label": "Boundary bursting: 200 requests pass in a 2-second window across boundaries",
          "isCorrect": true,
          "explanation": "Fixed windows reset at boundaries, allowing 2x the limit across the window edge; sliding windows prevent this."
        },
        {
          "id": "rl-t2-dis2",
          "label": "TCP connection resets fail to clear stale HTTP keep-alive socket states",
          "isCorrect": false,
          "explanation": "Keep-alive states are unrelated to the rate limiter's window counting logic."
        }
      ]
    },
    {
      "question": "Multiple app servers need a synchronized rate limit counter for a shared API key. How should state be maintained?",
      "options": [
        {
          "id": "rl-t3-dis1",
          "label": "Each server maintains an independent local in-memory counter with no sync",
          "isCorrect": false,
          "explanation": "Independent counters multiply the allowed limit by the number of app instances (N servers = N times the limit)."
        },
        {
          "id": "rl-t3-opt",
          "label": "Centralized Redis cluster with atomic Redis INCR or Lua scripts and TTLs",
          "isCorrect": true,
          "explanation": "Atomic Redis operations ensure exact global counting across distributed app instances without concurrency races."
        },
        {
          "id": "rl-t3-dis2",
          "label": "Persist each request timestamp into a disk-based relational database table",
          "isCorrect": false,
          "explanation": "Writing every API ping to relational disk storage saturates DB IOPS and adds excessive latency to requests."
        }
      ]
    }
  ],
  "circuit-breaker": [
    {
      "question": "A third-party SMS verification provider experiences an outage, taking 30 seconds to time out. App server threads pool up. What is needed?",
      "options": [
        {
          "id": "cb-t1-opt",
          "label": "Circuit breaker to fail fast and open after threshold failures, saving threads",
          "isCorrect": true,
          "explanation": "A circuit breaker trips open after repeated timeouts, failing immediately without tying up server worker threads."
        },
        {
          "id": "cb-t1-dis1",
          "label": "Double client timeout from 30s to 60s to give SMS gateways more time for this system cluster",
          "isCorrect": false,
          "explanation": "Increasing timeouts holds threads twice as long, accelerating total thread pool starvation and gateway collapse."
        },
        {
          "id": "cb-t1-dis2",
          "label": "Retry every failed SMS attempt 10 times consecutively with zero delay for this system cluster",
          "isCorrect": false,
          "explanation": "Aggressive immediate retries create a self-inflicted DDoS against an already failing dependency."
        }
      ]
    },
    {
      "question": "A circuit breaker is in the OPEN state. How does it safely determine when the downstream dependency has recovered?",
      "options": [
        {
          "id": "cb-t2-dis1",
          "label": "Flood the dependency with 10,000 test requests immediately upon timer expiration",
          "isCorrect": false,
          "explanation": "A massive flood immediately crashes a recovering service that was just beginning to stabilize."
        },
        {
          "id": "cb-t2-opt",
          "label": "Transition to HALF-OPEN and allow a small sample of probe requests through",
          "isCorrect": true,
          "explanation": "The HALF-OPEN state tests recovery with limited traffic, closing the circuit if successful or reopening if failures persist."
        },
        {
          "id": "cb-t2-dis2",
          "label": "Wait for manual DevOps engineer SSH intervention to reset state variables",
          "isCorrect": false,
          "explanation": "Manual intervention prevents automated resilience and extends outages unnecessarily during off-hours."
        }
      ]
    },
    {
      "question": "When a recommendation microservice circuit breaker trips open, what fallback behavior provides the best user experience?",
      "options": [
        {
          "id": "cb-t3-dis1",
          "label": "Return HTTP 500 Internal Server Error and crash the user web session",
          "isCorrect": false,
          "explanation": "Crashing the entire page when an auxiliary feature fails destroys core browsing capabilities."
        },
        {
          "id": "cb-t3-dis2",
          "label": "Block user interface rendering until the recommendation service recovers",
          "isCorrect": false,
          "explanation": "Blocking UI rendering ruins user experience for a non-critical personalized widget."
        },
        {
          "id": "cb-t3-opt",
          "label": "Serve a cached fallback list of globally popular items gracefully",
          "isCorrect": true,
          "explanation": "Graceful degradation displays generic popular items, keeping the page functional while the microservice recovers."
        }
      ]
    }
  ],
  "connection-pooling": [
    {
      "question": "An API server fleet running 50 pods opens 20 connections per pod to PostgreSQL, hitting max_connections (1,000) and crashing. What is the fix?",
      "options": [
        {
          "id": "cp-t1-opt",
          "label": "Deploy PgBouncer connection pooler in transaction pooling mode in front of DB",
          "isCorrect": true,
          "explanation": "PgBouncer multiplexes thousands of incoming client connections onto a small pool of active database server sockets."
        },
        {
          "id": "cp-t1-dis1",
          "label": "Increase PostgreSQL max_connections setting from 1,000 to 50,000 in config for this system cluster",
          "isCorrect": false,
          "explanation": "Each Postgres connection spawns a process consuming RAM; 50,000 processes will crash the OS via OOM killer."
        },
        {
          "id": "cp-t1-dis2",
          "label": "Open and close a brand new raw TCP connection on every single SQL query for this system cluster",
          "isCorrect": false,
          "explanation": "Opening raw TCP connections on every query adds 3-way handshake and TLS negotiation latency to every request."
        }
      ]
    },
    {
      "question": "A high-throughput service uses connection pooling, but queries intermittently stall for 5 seconds during traffic spikes. Why?",
      "options": [
        {
          "id": "cp-t2-dis1",
          "label": "PostgreSQL query optimizer shuts down vacuuming during concurrent connections under active production conditions",
          "isCorrect": false,
          "explanation": "Autovacuum runs asynchronously in background processes and is not the primary cause of connection pool stalls."
        },
        {
          "id": "cp-t2-opt",
          "label": "App-side connection pool is exhausted; requests wait in queue for a free socket",
          "isCorrect": true,
          "explanation": "When pool size is too small or queries take too long, caller threads block waiting for connections to be returned."
        },
        {
          "id": "cp-t2-dis2",
          "label": "Database write-ahead log segments are filling up local client browser RAM",
          "isCorrect": false,
          "explanation": "Client browsers never receive or store database write-ahead log (WAL) segments."
        }
      ]
    },
    {
      "question": "Why does session-level pooling in PgBouncer offer less multiplexing benefit than transaction-level pooling?",
      "options": [
        {
          "id": "cp-t3-dis1",
          "label": "Session pooling disables SSL encryption between client and database proxy",
          "isCorrect": false,
          "explanation": "SSL encryption works identically regardless of pooling mode in PgBouncer."
        },
        {
          "id": "cp-t3-dis2",
          "label": "Session pooling requires Redis cluster instances to hold SQL cursor states",
          "isCorrect": false,
          "explanation": "PgBouncer operates independently without requiring Redis for SQL cursor state management."
        },
        {
          "id": "cp-t3-opt",
          "label": "Session pooling holds the server connection open for the client lifetime",
          "isCorrect": true,
          "explanation": "In session mode, idle clients keep server connections locked; transaction mode releases the connection between queries."
        }
      ]
    }
  ],
  "backpressure": [
    {
      "question": "A stream ingestion pipeline receives 100,000 events/sec, but downstream storage can only write 20,000/sec. Memory is ballooning. What must be applied?",
      "options": [
        {
          "id": "bp-t1-opt",
          "label": "Apply backpressure: slow down upstream producers or switch to pull consumption",
          "isCorrect": true,
          "explanation": "Backpressure signals producers to slow down or uses consumer pull loops so consumers never accept more than they can process."
        },
        {
          "id": "bp-t1-dis1",
          "label": "Allocate unlimited unbounded in-memory buffers on every ingestion node for this system cluster",
          "isCorrect": false,
          "explanation": "Unbounded in-memory buffers inevitably exhaust node memory and trigger catastrophic Out-Of-Memory crashes."
        },
        {
          "id": "bp-t1-dis2",
          "label": "Silently drop 80% of incoming events at random without producer notification for this system cluster",
          "isCorrect": false,
          "explanation": "Dropping events without producer awareness causes unrecoverable data loss and breaks transaction guarantees."
        }
      ]
    },
    {
      "question": "A reactive web service uses push streams. The consumer cannot keep up with the producer. How does reactive pull solve this?",
      "options": [
        {
          "id": "bp-t2-dis1",
          "label": "Producer sends payloads over UDP broadcast instead of TCP acknowledgment sockets",
          "isCorrect": false,
          "explanation": "UDP drops packets unpredictably and does not establish systematic flow control or feedback loops."
        },
        {
          "id": "bp-t2-opt",
          "label": "Consumer requests batches explicitly via demand signaling (e.g. request(N))",
          "isCorrect": true,
          "explanation": "Demand signaling allows the consumer to pull only the batch size it has capacity to process, preventing buffer overflow."
        },
        {
          "id": "bp-t2-dis2",
          "label": "Double consumer CPU clock frequency via dynamic kernel governor profiles",
          "isCorrect": false,
          "explanation": "Clock scaling provides minor speedups but cannot resolve fundamental rate mismatches of orders of magnitude."
        }
      ]
    },
    {
      "question": "An HTTP reverse proxy sits in front of a saturated backend cluster. What HTTP status code signals load-shedding backpressure?",
      "options": [
        {
          "id": "bp-t3-dis1",
          "label": "Return HTTP 301 Moved Permanently pointing client requests to DNS root",
          "isCorrect": false,
          "explanation": "HTTP 301 is a permanent redirect; clients will cache it and break future routing to the service."
        },
        {
          "id": "bp-t3-dis2",
          "label": "Return HTTP 400 Bad Request indicating the client payload is invalid",
          "isCorrect": false,
          "explanation": "HTTP 400 claims client input is malformed, misleading clients instead of indicating temporary server overload."
        },
        {
          "id": "bp-t3-opt",
          "label": "Return HTTP 429 Too Many Requests or 503 with a Retry-After header",
          "isCorrect": true,
          "explanation": "429 and 503 with Retry-After communicate server overload and instruct clients when it is safe to retry."
        }
      ]
    }
  ],
  "idempotency": [
    {
      "question": "A customer clicks 'Pay Now' twice on a slow mobile connection. How do you prevent charging their credit card twice?",
      "options": [
        {
          "id": "idemp-t1-opt",
          "label": "Generate client-side idempotency key and reject duplicate keys in the DB",
          "isCorrect": true,
          "explanation": "A unique idempotency key with a database unique constraint ensures duplicate requests return the original receipt without re-charging."
        },
        {
          "id": "idemp-t1-dis1",
          "label": "Disable the HTML button with JavaScript after the user clicks it once for this system cluster",
          "isCorrect": false,
          "explanation": "Client UI disabling is easily bypassed by network retries, page refreshes, and automated API callers."
        },
        {
          "id": "idemp-t1-dis2",
          "label": "Refund all transactions that share the same dollar amount within 5 minutes",
          "isCorrect": false,
          "explanation": "Refunding matching amounts mistakenly cancels legitimate distinct purchases made by different customers."
        }
      ]
    },
    {
      "question": "A payment service executes credit card charges and must update the order state reliably. What pattern prevents dual-write inconsistency?",
      "options": [
        {
          "id": "idemp-t2-dis1",
          "label": "Write to payment gateway, then write to database in an unmonitored try-catch under active production conditions",
          "isCorrect": false,
          "explanation": "If the server crashes between the payment call and the database update, the customer is charged but the order is lost."
        },
        {
          "id": "idemp-t2-opt",
          "label": "Transactional Outbox: save intent and event in one DB transaction, then relay",
          "isCorrect": true,
          "explanation": "Transactional Outbox uses local DB transactions to guarantee atomicity between local state updates and published messages."
        },
        {
          "id": "idemp-t2-dis2",
          "label": "Use asynchronous fire-and-forget UDP packets to notify inventory databases",
          "isCorrect": false,
          "explanation": "Fire-and-forget UDP drops packets under load, guaranteeing state corruption and lost order records."
        }
      ]
    },
    {
      "question": "An payment idempotency record is created with key 'order_982'. A second request arrives with identical key but different amount. What should happen?",
      "options": [
        {
          "id": "idemp-t3-dis1",
          "label": "Silently overwrite the stored amount with the new payload parameters",
          "isCorrect": false,
          "explanation": "Overwriting state with mismatched parameters violates idempotency and allows payload tampering attacks."
        },
        {
          "id": "idemp-t3-dis2",
          "label": "Process the transaction as a completely new charge under a new auto-key",
          "isCorrect": false,
          "explanation": "Creating a new transaction defeats idempotency protection and duplicate charges the user."
        },
        {
          "id": "idemp-t3-opt",
          "label": "Return HTTP 409 Conflict; the key was already registered with different params",
          "isCorrect": true,
          "explanation": "Reusing an idempotency key with conflicting parameters must be rejected to prevent payload mutation exploits."
        }
      ]
    }
  ],
  "multi-region": [
    {
      "question": "A global user base experiences 300ms latency when accessing a single primary database in US-East. What architecture minimizes latency?",
      "options": [
        {
          "id": "mr-t1-opt",
          "label": "Multi-region deployment with regional read replicas and GeoDNS routing",
          "isCorrect": true,
          "explanation": "GeoDNS routes users to the nearest regional datacenter, serving reads locally in <20ms while funneling writes to primary."
        },
        {
          "id": "mr-t1-dis1",
          "label": "Install custom high-gain directional Wi-Fi antennas on US-East server racks",
          "isCorrect": false,
          "explanation": "Local Wi-Fi hardware cannot bypass continental fiber optic transit distances across global undersea cables."
        },
        {
          "id": "mr-t1-dis2",
          "label": "Synchronously replicate every single database write to 10 global regions",
          "isCorrect": false,
          "explanation": "Synchronous cross-region replication forces write latency to match the slowest global link, ballooning write times to 800ms."
        }
      ]
    },
    {
      "question": "In an active-active multi-region deployment, Region A and Region B update the same user profile simultaneously. How do you resolve conflict?",
      "options": [
        {
          "id": "mr-t2-dis1",
          "label": "Drop both updates and delete the entire user profile to prevent errors",
          "isCorrect": false,
          "explanation": "Deleting user accounts on concurrent write conflicts causes severe data loss and destroys user trust."
        },
        {
          "id": "mr-t2-opt",
          "label": "Use Conflict-Free Replicated Data Types (CRDTs) or Last-Write-Wins timestamps",
          "isCorrect": true,
          "explanation": "CRDTs mathematically merge concurrent edits deterministically, or LWW uses hybrid logical clocks to establish deterministic order."
        },
        {
          "id": "mr-t2-dis2",
          "label": "Lock global database rows using distributed synchronous mutexes over WAN under active production conditions",
          "isCorrect": false,
          "explanation": "Synchronous WAN locking turns multi-region availability fragile, as any regional network partition halts all global writes."
        }
      ]
    },
    {
      "question": "A multi-region setup must survive an entire cloud region failure (e.g. AWS us-east-1 outage). What failover mechanism is essential?",
      "options": [
        {
          "id": "mr-t3-dis1",
          "label": "Store all DNS records on an instance inside the failing region itself",
          "isCorrect": false,
          "explanation": "Hosting DNS in the failing region means DNS lookups fail when the region goes dark, preventing traffic diversion."
        },
        {
          "id": "mr-t3-dis2",
          "label": "Manually re-cable physical servers in the secondary region over 24 hours",
          "isCorrect": false,
          "explanation": "Manual physical intervention guarantees unacceptable downtime exceeding enterprise SLA targets."
        },
        {
          "id": "mr-t3-opt",
          "label": "Automated health checks with Anycast DNS / latency routing and DB promotion",
          "isCorrect": true,
          "explanation": "Automated route diversion reroutes traffic to the standby region while automated orchestration promotes a standby replica."
        }
      ]
    }
  ],
  "health-checks": [
    {
      "question": "An app server returns HTTP 200 on /health because the process is running, but its database connection pool is broken. What is the remedy?",
      "options": [
        {
          "id": "hc-t1-opt",
          "label": "Separate shallow liveness checks (process alive) from deep readiness checks (DB reachable)",
          "isCorrect": true,
          "explanation": "Shallow probes check if process can run, while readiness checks verify critical dependencies before receiving traffic."
        },
        {
          "id": "hc-t1-dis1",
          "label": "Hardcode the /health endpoint to always return 200 OK without inspecting state for this system cluster",
          "isCorrect": false,
          "explanation": "Static 200 OK endpoints route user traffic to dead pods incapable of querying databases."
        },
        {
          "id": "hc-t1-dis2",
          "label": "Query the database with a 50-table JOIN query every 500ms on health probes for this system cluster",
          "isCorrect": false,
          "explanation": "Heavy health check queries overload the database engine, causing health probes to trigger self-inflicted outages."
        }
      ]
    },
    {
      "question": "A database becomes slow, causing all 200 app pods to fail readiness checks simultaneously. What happens if the balancer removes all pods?",
      "options": [
        {
          "id": "hc-t2-dis1",
          "label": "The system automatically recovers faster because idle servers cool down",
          "isCorrect": false,
          "explanation": "Removing 100% of pods takes down the entire site and dumps traffic immediately into 502 Bad Gateway errors."
        },
        {
          "id": "hc-t2-opt",
          "label": "Total system blackout; configure a minimum healthy percentage or fail-open limit",
          "isCorrect": true,
          "explanation": "When all nodes fail, fail-open routing or minimum active thresholds ensure some traffic is served while preventing total collapse."
        },
        {
          "id": "hc-t2-dis2",
          "label": "The load balancer automatically purchases and provisions 500 new AWS instances under active production conditions",
          "isCorrect": false,
          "explanation": "Load balancers route network traffic; they do not automatically execute cloud infrastructure purchasing scripts."
        }
      ]
    },
    {
      "question": "A Kubernetes pod experiences a memory leak. Its CPU is normal, but memory hits the container limit. What mechanism evicts it?",
      "options": [
        {
          "id": "hc-t3-dis1",
          "label": "Linux kernel TCP buffer congestion control terminates client connections",
          "isCorrect": false,
          "explanation": "TCP congestion control manages network transmission windows, not container memory limits."
        },
        {
          "id": "hc-t3-dis2",
          "label": "The reverse proxy reconfigures client browser memory allocation limits",
          "isCorrect": false,
          "explanation": "Proxies have zero control over end-user client machine RAM allocation."
        },
        {
          "id": "hc-t3-opt",
          "label": "Kernel Out-Of-Memory (OOM) killer sends SIGKILL, and the orchestrator restarts it",
          "isCorrect": true,
          "explanation": "When cgroup memory limits are exceeded, OOM killer terminates the process and the container runtime starts a fresh replica."
        }
      ]
    }
  ],
  "cap-pacelc": [
    {
      "question": "A network partition isolates a distributed database cluster into two halves. Under the CAP theorem, what trade-off must be chosen?",
      "options": [
        {
          "id": "cap-t1-opt",
          "label": "Choose Consistency (reject writes on partition) or Availability (allow stale writes)",
          "isCorrect": true,
          "explanation": "Under partition (P), you must choose either Consistency (CP) by refusing split writes or Availability (AP) by accepting them."
        },
        {
          "id": "cap-t1-dis1",
          "label": "Achieve 100% Consistency and 100% Availability simultaneously with no partition for this system cluster",
          "isCorrect": false,
          "explanation": "The CAP theorem mathematically proves you cannot guarantee both consistency and availability across a partition."
        },
        {
          "id": "cap-t1-dis2",
          "label": "Disable TCP IP network routing protocols and transmit data via HTTP cookies for this system cluster",
          "isCorrect": false,
          "explanation": "HTTP cookies are client transport tokens and have no bearing on datacenter network partitions."
        }
      ]
    },
    {
      "question": "In the PACELC theorem, what does the 'E-L-C' portion govern when the network is running normally (no partition)?",
      "options": [
        {
          "id": "cap-t2-dis1",
          "label": "Else, choose between Encryption standards and Load balancer Cost targets",
          "isCorrect": false,
          "explanation": "PACELC evaluates Latency vs Consistency, not Encryption vs Cost."
        },
        {
          "id": "cap-t2-opt",
          "label": "Else (no partition), trade off between Latency (L) and Consistency (C) in production",
          "isCorrect": true,
          "explanation": "PACELC states: If Partition (P), choose Availability (A) or Consistency (C); Else (E), choose Latency (L) or Consistency (C)."
        },
        {
          "id": "cap-t2-dis2",
          "label": "Else, execute distributed Error Logging and Cloud container provisioning under active production conditions",
          "isCorrect": false,
          "explanation": "PACELC is a theoretical distributed consistency theorem, not an error-logging specification."
        }
      ]
    },
    {
      "question": "A distributed shopping cart chooses AP in PACELC. What is the direct real-world consequence during a cross-rack network split?",
      "options": [
        {
          "id": "cap-t3-dis1",
          "label": "Users receive immediate HTTP 500 errors and cannot add items to cart",
          "isCorrect": false,
          "explanation": "An AP system preserves availability; rejecting requests with 500 errors is characteristic of CP systems."
        },
        {
          "id": "cap-t3-dis2",
          "label": "All database disks in the isolated partition automatically wipe their data",
          "isCorrect": false,
          "explanation": "Network partitions do not trigger database disk formatting commands."
        },
        {
          "id": "cap-t3-opt",
          "label": "Cart updates succeed on both sides; cart items must be merged upon heal",
          "isCorrect": true,
          "explanation": "AP allows writes on both sides of the split, requiring conflict reconciliation (such as unioning cart items) when healed."
        }
      ]
    }
  ],
  "consensus-quorums": [
    {
      "question": "A Raft consensus cluster has 5 nodes. How many node failures can the cluster tolerate while maintaining full write quorum?",
      "options": [
        {
          "id": "cq-t1-opt",
          "label": "2 nodes; majority quorum requires at least (5/2) + 1 = 3 nodes online",
          "isCorrect": true,
          "explanation": "In an N-node cluster, consensus requires a strict majority ((N/2) + 1). For 5 nodes, 3 must agree, tolerating 2 failures."
        },
        {
          "id": "cq-t1-dis1",
          "label": "4 nodes; consensus can continue as long as a single node remains active",
          "isCorrect": false,
          "explanation": "A single node cannot form a majority in a 5-node cluster; this causes split-brain if two isolated nodes both write."
        },
        {
          "id": "cq-t1-dis2",
          "label": "0 nodes; any single node failure halts all Raft cluster state machines",
          "isCorrect": false,
          "explanation": "Consensus algorithms are explicitly designed for fault tolerance; losing 0 nodes describes a non-fault-tolerant system."
        }
      ]
    },
    {
      "question": "What catastrophic outcome does Raft's strict majority quorum prevent during a network partition?",
      "options": [
        {
          "id": "cq-t2-dis1",
          "label": "TCP connection timeout resets between client web browsers and proxy nodes",
          "isCorrect": false,
          "explanation": "TCP timeouts are basic networking events; consensus specifically protects state machine correctness."
        },
        {
          "id": "cq-t2-opt",
          "label": "Split-brain: two independent leaders electing themselves and accepting diverging data",
          "isCorrect": true,
          "explanation": "Requiring > N/2 votes ensures only one partition can elect a leader, preventing diverging conflicting histories."
        },
        {
          "id": "cq-t2-dis2",
          "label": "Excessive disk space consumption from Raft write-ahead log compaction runs under active production conditions",
          "isCorrect": false,
          "explanation": "Log compaction manages disk space and is orthogonal to majority quorum election safety."
        }
      ]
    },
    {
      "question": "Why are distributed consensus clusters (e.g. etcd, ZooKeeper) almost always deployed with an odd number of nodes (3, 5, 7)?",
      "options": [
        {
          "id": "cq-t3-dis1",
          "label": "Even numbers of nodes cause CPU scheduling locks in Linux kernel threads",
          "isCorrect": false,
          "explanation": "Operating systems schedule processes identically regardless of whether the cluster node count is odd or even."
        },
        {
          "id": "cq-t3-dis2",
          "label": "Odd numbers of nodes double network bandwidth across datacenter top-of-rack switches",
          "isCorrect": false,
          "explanation": "Node count parity does not alter network bandwidth capabilities of physical switches."
        },
        {
          "id": "cq-t3-opt",
          "label": "An even node adds no extra fault tolerance (4 nodes tolerates 1; 3 also tolerates 1)",
          "isCorrect": true,
          "explanation": "A 4-node cluster needs 3 for majority, so it tolerates 1 failure—the same as 3 nodes—while adding extra network overhead."
        }
      ]
    }
  ],
  "storage-engines": [
    {
      "question": "A time-series telemetry store handles 200,000 metric writes/sec. Why is an LSM-tree (Log-Structured Merge-tree) better than a B-tree here?",
      "options": [
        {
          "id": "se-t1-opt",
          "label": "LSM-trees turn random writes into sequential disk appends, maximizing write IOPS",
          "isCorrect": true,
          "explanation": "LSM-trees buffer writes in MemTable and append sequentially to disk (SSTables), avoiding B-tree in-place page write overhead."
        },
        {
          "id": "se-t1-dis1",
          "label": "LSM-trees eliminate read latency completely by storing all data in L1 CPU cache for this system cluster",
          "isCorrect": false,
          "explanation": "L1 CPU cache is mere kilobytes in size; database storage engines store gigabytes to terabytes on disk."
        },
        {
          "id": "se-t1-dis2",
          "label": "B-trees cannot store numeric timestamp columns without string serialization for this system cluster",
          "isCorrect": false,
          "explanation": "B-trees index integers, timestamps, and floats natively with high efficiency."
        }
      ]
    },
    {
      "question": "What is the primary operational penalty that LSM-tree storage engines (e.g. RocksDB, Cassandra) must pay in background threads?",
      "options": [
        {
          "id": "se-t2-dis1",
          "label": "Rebuilding raw primary key hash indexes from scratch on every transaction commit",
          "isCorrect": false,
          "explanation": "LSM-trees do not rebuild primary key indexes from scratch on transaction commits."
        },
        {
          "id": "se-t2-opt",
          "label": "Compaction: merging sorted SSTables consumes significant disk I/O and CPU",
          "isCorrect": true,
          "explanation": "Compaction cleans up deleted tombstones and merges sorted files, causing write amplification and background I/O spikes."
        },
        {
          "id": "se-t2-dis2",
          "label": "Defragmenting physical RAM chips via manual kernel memory barrier resets",
          "isCorrect": false,
          "explanation": "Physical RAM chips do not undergo manual software defragmentation routines in LSM storage engines."
        }
      ]
    },
    {
      "question": "A relational database table performs frequent point-lookups and range scans on customer IDs. Why does a B+ Tree excel for this workload?",
      "options": [
        {
          "id": "se-t3-dis1",
          "label": "B+ Trees avoid storing pointers and execute range scans via network broadcast",
          "isCorrect": false,
          "explanation": "B+ Trees rely on linked pointers between leaf pages to execute sequential range scans efficiently."
        },
        {
          "id": "se-t3-opt",
          "label": "Leaf pages form a sorted linked list, providing fast single-page range traversal",
          "isCorrect": true,
          "explanation": "B+ Tree leaf pages are linked in sequential order, making range queries efficient after an O(log N) root-to-leaf lookup."
        },
        {
          "id": "se-t3-dis2",
          "label": "B+ Trees compress all table data into binary JSON blobs stored in RAM",
          "isCorrect": false,
          "explanation": "B+ Trees structure structured data pages on disk and memory; they are not mere in-memory JSON blobs."
        }
      ]
    }
  ],
  "id-generation": [
    {
      "question": "A globally distributed database needs 64-bit unique IDs that sort roughly chronologically without coordination. What should it use?",
      "options": [
        {
          "id": "idg-t1-opt",
          "label": "Snowflake IDs: timestamp prefix + worker node ID + local atomic sequence number",
          "isCorrect": true,
          "explanation": "Twitter Snowflake IDs fit in 64 bits, sort by timestamp naturally, and require zero central coordination between nodes."
        },
        {
          "id": "idg-t1-dis1",
          "label": "Centralized PostgreSQL SERIAL auto-increment primary key on single master node for this system cluster",
          "isCorrect": false,
          "explanation": "A single database auto-increment sequence creates a global single point of failure and bottleneck."
        },
        {
          "id": "idg-t1-dis2",
          "label": "Math.random() floating point generation seeded with client system time for this system cluster",
          "isCorrect": false,
          "explanation": "Floating point random numbers collide frequently at scale and do not provide unique primary key guarantees."
        }
      ]
    },
    {
      "question": "Why does using random UUIDv4 as a primary key in a B-Tree clustered database (e.g. MySQL InnoDB) degrade write performance?",
      "options": [
        {
          "id": "idg-t2-dis1",
          "label": "UUIDv4 strings exceed maximum allowable character length of TCP packets",
          "isCorrect": false,
          "explanation": "A 36-character UUID string easily fits within standard 1,500-byte TCP network packets."
        },
        {
          "id": "idg-t2-opt",
          "label": "Random keys cause scattered page splits and random disk I/O across the index",
          "isCorrect": true,
          "explanation": "B-Trees insert ordered keys at the tail; random UUIDv4 keys insert anywhere, causing page splits and cache thrashing."
        },
        {
          "id": "idg-t2-dis2",
          "label": "Database transactions cannot parse hyphenated string formats in SQL queries under active production conditions",
          "isCorrect": false,
          "explanation": "Databases parse hyphenated UUID strings with ease; the issue is page locality and index fragmentation."
        }
      ]
    },
    {
      "question": "What is the primary operational hazard when generating timestamp-prefixed Snowflake IDs during system clock adjustments?",
      "options": [
        {
          "id": "idg-t3-dis1",
          "label": "Network switches drop packets whenever timestamp bits contain odd numbers",
          "isCorrect": false,
          "explanation": "Network hardware routes IP packets without inspecting binary ID payload timestamps."
        },
        {
          "id": "idg-t3-dis2",
          "label": "Worker node CPU temperatures rise during standard NTP time synchronizations",
          "isCorrect": false,
          "explanation": "NTP time synchronization consumes negligible CPU and has no impact on server temperatures."
        },
        {
          "id": "idg-t3-opt",
          "label": "Clock skew / backwards time steps risk generating duplicate or out-of-order IDs",
          "isCorrect": true,
          "explanation": "If system clock moves backward, ID generators risk minting timestamps already issued unless guarded by sequence tracking."
        }
      ]
    }
  ],
  "search-indexing": [
    {
      "question": "An e-commerce site needs full-text search across 50M product descriptions with typos and filtering. What engine should you deploy?",
      "options": [
        {
          "id": "srch-t1-opt",
          "label": "Deploy an inverted-index search engine (e.g. Elasticsearch/OpenSearch) alongside DB",
          "isCorrect": true,
          "explanation": "Inverted indexes map tokens to document IDs, enabling sub-50ms full-text searches that would take minutes in relational SQL."
        },
        {
          "id": "srch-t1-dis1",
          "label": "Run SQL LIKE '%query%' queries with wildcard table scans on Postgres primary for this system cluster",
          "isCorrect": false,
          "explanation": "Leading wildcards '%...' bypass B-tree indexes, forcing full table scans that choke database CPU under traffic."
        },
        {
          "id": "srch-t1-dis2",
          "label": "Download the entire 50M catalog database into client browser local storage for this system cluster",
          "isCorrect": false,
          "explanation": "Storing a 50M product catalog would consume gigabytes of client device storage and crash browsers."
        }
      ]
    },
    {
      "question": "When indexing 5,000 product updates per second, an Elasticsearch cluster suffers high CPU from segment merging. What mitigates this?",
      "options": [
        {
          "id": "srch-t2-dis1",
          "label": "Disable all replica shards permanently and write documents without replication under active production conditions",
          "isCorrect": false,
          "explanation": "Disabling replicas destroys high availability; if a node crashes, catalog data is permanently inaccessible."
        },
        {
          "id": "srch-t2-opt",
          "label": "Increase index refresh interval (e.g. 1s to 30s) and send bulk indexing batches",
          "isCorrect": true,
          "explanation": "Longer refresh intervals create fewer, larger Lucene segments, drastically reducing background merge CPU overhead."
        },
        {
          "id": "srch-t2-dis2",
          "label": "Store search indexes on compressed virtual tape drive storage arrays",
          "isCorrect": false,
          "explanation": "Tape drives have multi-second seek times that are completely incompatible with real-time search indexing."
        }
      ]
    },
    {
      "question": "Why should search indexing be kept asynchronous from the primary database write path?",
      "options": [
        {
          "id": "srch-t3-dis1",
          "label": "Search cluster latency cannot be measured accurately during synchronous HTTP calls",
          "isCorrect": false,
          "explanation": "Network latency can always be measured; the problem is coupling critical transactions to search cluster health."
        },
        {
          "id": "srch-t3-opt",
          "label": "Search indexing latency and outages should not block primary customer transactions",
          "isCorrect": true,
          "explanation": "Decoupling indexing via change data capture (CDC) ensures database transactions succeed even if search is degraded."
        },
        {
          "id": "srch-t3-dis2",
          "label": "Primary databases automatically purge records when external search clusters lag",
          "isCorrect": false,
          "explanation": "Primary databases never automatically purge transactional records due to external search engine lag."
        }
      ]
    }
  ],
  "stream-processing": [
    {
      "question": "A fraud detection system must calculate the count of transactions per card over a sliding 5-minute window. What architecture handles this?",
      "options": [
        {
          "id": "strm-t1-opt",
          "label": "Stream processing engine (e.g. Flink/Kafka Streams) with sliding event-time windows",
          "isCorrect": true,
          "explanation": "Stream engines track stateful sliding windows over high-velocity event streams with millisecond evaluation latency."
        },
        {
          "id": "strm-t1-dis1",
          "label": "Run a cron job every 5 minutes executing COUNT(*) queries over historical DB tables for this system cluster",
          "isCorrect": false,
          "explanation": "Cron batch jobs introduce 5-minute latency delays, allowing fraudulent transactions to complete before detection."
        },
        {
          "id": "strm-t1-dis2",
          "label": "Instruct credit card POS terminal devices to count transactions in offline RAM for this system cluster",
          "isCorrect": false,
          "explanation": "POS terminals only see their own transactions; fraud detection requires cross-merchant global transaction visibility."
        }
      ]
    },
    {
      "question": "In distributed stream processing, what is the difference between event time and processing time?",
      "options": [
        {
          "id": "strm-t2-dis1",
          "label": "Event time is the time recorded on server hardware; processing time is client time under active production conditions",
          "isCorrect": false,
          "explanation": "Event time is when the event occurred on the client/device; processing time is when the server consumes it."
        },
        {
          "id": "strm-t2-opt",
          "label": "Event time is when the event occurred; processing time is when the pipeline sees it",
          "isCorrect": true,
          "explanation": "Event time reflects real-world occurrence, allowing watermarks to handle out-of-order and delayed mobile events accurately."
        },
        {
          "id": "strm-t2-dis2",
          "label": "Event time applies to HTTP APIs; processing time applies to raw TCP binary frames",
          "isCorrect": false,
          "explanation": "Event vs processing time is a temporal ordering concept in stream semantics, independent of transport protocols."
        }
      ]
    },
    {
      "question": "A stream consumer node crashes while processing an event batch. How does checkpointing enable fault-tolerant recovery?",
      "options": [
        {
          "id": "strm-t3-dis1",
          "label": "It writes all input events into browser session storage for client-side replay",
          "isCorrect": false,
          "explanation": "Stream checkpoints are stored in distributed durable storage, not on client browser devices."
        },
        {
          "id": "strm-t3-opt",
          "label": "It snapshots stream offsets and internal state to durable storage periodically",
          "isCorrect": true,
          "explanation": "On failure, the replacement worker resumes from the last verified checkpoint offset, ensuring exactly-once processing semantics."
        },
        {
          "id": "strm-t3-dis2",
          "label": "It reboots physical datacenter power transformers to clear corrupted RAM chips",
          "isCorrect": false,
          "explanation": "Checkpointing is software-driven state snapshotting and has nothing to do with physical power hardware."
        }
      ]
    }
  ],
  "observability": [
    {
      "question": "An API gateway reports p99 latency spiked from 50ms to 2,000ms, but server CPU and memory are low. What tool reveals the root cause?",
      "options": [
        {
          "id": "obs-t1-opt",
          "label": "Distributed tracing flame graph showing downstream service call latencies",
          "isCorrect": true,
          "explanation": "Distributed traces track request spans across microservices, pinpointing exactly which downstream dependency is stalling."
        },
        {
          "id": "obs-t1-dis1",
          "label": "Increase sampling rate of system ping ICMP packets from developer laptops for this system cluster",
          "isCorrect": false,
          "explanation": "ICMP pings test network reachability; they cannot inspect microservice RPC execution delays or database locks."
        },
        {
          "id": "obs-t1-dis2",
          "label": "Print complete customer credit card numbers into raw console log streams for this system cluster",
          "isCorrect": false,
          "explanation": "Logging raw customer credit card data violates PCI-DSS compliance and introduces massive security liabilities."
        }
      ]
    },
    {
      "question": "Why are structured JSON logs superior to unformatted raw string logs in high-scale microservice architectures?",
      "options": [
        {
          "id": "obs-t2-dis1",
          "label": "Structured logs bypass Linux disk write operations and stream directly to RAM under active production conditions",
          "isCorrect": false,
          "explanation": "Structured logs are written to stdout or disk files just like standard text; the benefit is parsing and querying."
        },
        {
          "id": "obs-t2-opt",
          "label": "Key-value attributes (trace_id, user_id) enable automated indexing and correlation",
          "isCorrect": true,
          "explanation": "Structured fields allow log aggregators to filter, aggregate, and correlate millions of events across services instantly."
        },
        {
          "id": "obs-t2-dis2",
          "label": "JSON log strings consume 80% less disk byte storage than plain text strings",
          "isCorrect": false,
          "explanation": "JSON formatting actually adds structural key overhead; compression mitigates it, but space saving is not the goal."
        }
      ]
    },
    {
      "question": "In SRE error budget management, what does an error budget burn rate alert tell an on-call engineer?",
      "options": [
        {
          "id": "obs-t3-dis1",
          "label": "The physical server room cooling system is overheating server processor chips",
          "isCorrect": false,
          "explanation": "Error budget burn rate tracks service availability against SLO targets, not datacenter thermodynamics."
        },
        {
          "id": "obs-t3-dis2",
          "label": "Cloud provider monthly billing invoices have exceeded estimated dollar budgets",
          "isCorrect": false,
          "explanation": "Error budgets measure allowable customer-facing failure rates (SLOs), not cloud financial expenditure."
        },
        {
          "id": "obs-t3-opt",
          "label": "The speed at which allowable service errors are being consumed over time",
          "isCorrect": true,
          "explanation": "Burn rate alerts page engineers when outages consume the monthly error budget fast enough to threaten SLA breaches."
        }
      ]
    }
  ],
  "auth-at-scale": [
    {
      "question": "A microservice cluster receives 100,000 req/s. Each service calls the Auth DB to validate session tokens, crushing it. What is the solution?",
      "options": [
        {
          "id": "auth-t1-opt",
          "label": "Issue stateless signed JWT tokens verified locally by services using public keys",
          "isCorrect": true,
          "explanation": "Asymmetric JWTs allow services to verify token validity in memory with the public key, eliminating auth database trips."
        },
        {
          "id": "auth-t1-dis1",
          "label": "Store user passwords in plaintext inside clear HTTP cookies on client browsers for this system cluster",
          "isCorrect": false,
          "explanation": "Storing plaintext passwords in browser cookies is a catastrophic security vulnerability."
        },
        {
          "id": "auth-t1-dis2",
          "label": "Disable authentication checks for all API requests originating from mobile apps for this system cluster",
          "isCorrect": false,
          "explanation": "Disabling authentication allows unauthenticated attackers to steal and manipulate arbitrary user data."
        }
      ]
    },
    {
      "question": "If a user's account is compromised, how do you revoke a stateless JWT before its standard 1-hour expiration?",
      "options": [
        {
          "id": "auth-t2-dis1",
          "label": "Send remote format commands to wipe local storage on the attacker's device",
          "isCorrect": false,
          "explanation": "Servers cannot remotely wipe hardware storage on arbitrary attacker machines."
        },
        {
          "id": "auth-t2-dis2",
          "label": "Delete the user row from database and re-register the customer under a new ID under active production conditions",
          "isCorrect": false,
          "explanation": "Stateless JWTs do not query the user row; deleting the user does not prevent the validly signed token from passing."
        },
        {
          "id": "auth-t2-opt",
          "label": "Use short-lived JWTs (e.g. 5m) with refresh token rotation and token blacklist cache",
          "isCorrect": true,
          "explanation": "Short-lived tokens bound exposure, while a fast Redis blocklist or refresh token revocation cuts access immediately."
        }
      ]
    },
    {
      "question": "An identity service rotates its cryptographic signing key. How do downstream verification gateways transition without downtime?",
      "options": [
        {
          "id": "auth-t3-dis1",
          "label": "Immediately delete old public keys and reject all previously issued user tokens",
          "isCorrect": false,
          "explanation": "Deleting old keys instantly logs out millions of active users and triggers massive customer authentication panics."
        },
        {
          "id": "auth-t3-opt",
          "label": "Publish keys via JWKS with key IDs (kid); keep old public key active during overlap",
          "isCorrect": true,
          "explanation": "Key IDs allow gateways to fetch the right public key dynamically, supporting overlapping keys during rotation."
        },
        {
          "id": "auth-t3-dis2",
          "label": "Hardcode the new private key into public frontend JavaScript bundle files",
          "isCorrect": false,
          "explanation": "Private keys must never be exposed to clients; leaking private keys allows anyone to forge valid tokens."
        }
      ]
    }
  ]
};
