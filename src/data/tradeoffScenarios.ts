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
    "patternId": "caching",
    "incidentTitle": "Database Connection Exhaustion Under Read Spike",
    "primaryConstraintSummary": "Read/Write ratio is 95:5. 100,000 queries/sec are saturating PostgreSQL connection limits. P99 latency is 3,400ms.",
    "recommendedOptionId": "opt-cache-aside",
    "options": [
      {
        "id": "opt-cache-aside",
        "title": "Deploy Redis Cluster (Cache-Aside Pattern)",
        "tagline": "In-memory caching of hot query results with TTLs and LRU eviction.",
        "patternId": "caching",
        "costEstimateDeltaUsd": 450,
        "latencyProfileMs": -180,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "~0.2-1ms Redis round-trip for the ~95% of reads that hit the cache",
          "Shields the primary database from connection exhaustion by skipping repeated queries",
          "Automatic LRU eviction keeps memory bounded"
        ],
        "cons": [
          "Potential cache stampede (thundering herd) on key expiration",
          "Eventual consistency: stale reads possible during invalidation lag"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is Cache-Aside preferable to adding Read Replicas for this specific 95% read-heavy spike?",
          "options": [
            {
              "id": "tq-1",
              "text": "A cache hit is a sub-ms GET that skips Postgres; replicas still run every SELECT in full, each under its own connection cap.",
              "isCorrect": true,
              "feedback": "Spot on! Both options read hot rows from memory (Postgres keeps them in its buffer pool). The difference is work per read: a Redis GET is far cheaper than a full SQL query, so one cache node absorbs many times the reads of one replica for the money."
            },
            {
              "id": "tq-2",
              "text": "Cache-aside with delete-on-write keeps Redis strongly consistent with Postgres, whereas async replicas always lag the primary.",
              "isCorrect": false,
              "feedback": "Backwards. Cache-aside is eventually consistent even with delete-on-write: between a write and the key's invalidation (or TTL expiry), and in read-miss/delete races, readers can see stale values. Replicas lag too; neither option is strongly consistent here."
            },
            {
              "id": "tq-3",
              "text": "Replicas would need synchronous_commit = remote_apply to avoid stale reads, roughly doubling write latency on the primary.",
              "isCorrect": false,
              "feedback": "remote_apply is one way to get read-your-writes from replicas, but cache-aside is eventually consistent too, so staleness doesn't favor the cache. The real argument is cost per read: replicas run every query in full, whereas a cache hit skips the query entirely."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When traffic surges 10x from 100k to 1,000,000 RPS, what is the primary failure mode of this Redis cache?",
          "options": [
            {
              "id": "sq-1",
              "text": "Cache stampede: a hot key expires and thousands of concurrent misses hit the DB at once. Fix: singleflight or early refresh.",
              "isCorrect": true,
              "feedback": "Senior Architect answer! Thundering herd is the classic high-scale cache collapse."
            },
            {
              "id": "sq-2",
              "text": "With appendfsync always, the AOF is fsynced on every command, so at 1M requests/sec disk IOPS becomes Redis's ceiling.",
              "isCorrect": false,
              "feedback": "The AOF logs write commands only, never GETs, so reads never trigger an fsync. At 1M RPS of mostly reads, the pressure is on hot keys and on the DB when they expire, not on Redis's disk."
            },
            {
              "id": "sq-3",
              "text": "Once maxmemory is reached, allkeys-lru eviction thrashes, dropping the hottest keys and turning hits into DB misses.",
              "isCorrect": false,
              "feedback": "LRU evicts the least recently used keys, so hot keys are the last to go. The dangerous moment is when a hot key expires by TTL and every request misses at once."
            }
          ]
        }
      },
      {
        "id": "opt-read-replicas",
        "title": "Provision 3x PostgreSQL Read Replicas",
        "tagline": "Horizontal database read scaling with streaming replication.",
        "patternId": "read-replicas",
        "costEstimateDeltaUsd": 1400,
        "latencyProfileMs": -90,
        "operationalComplexity": 3,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Full SQL query expressiveness without data denormalization",
          "Durable, replicated copies on disk (and a promotion candidate for failover)",
          "Simple read/write connection string splitting"
        ],
        "cons": [
          "~3x higher cloud hosting cost than a Redis cluster",
          "Async replication lag: users can read stale data right after writing unless reads-after-write go to the primary",
          "Every read still runs a full SQL query, and each replica has its own max_connections cap"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "What is the primary operational disadvantage of Read Replicas vs In-Memory Caching for read-heavy key-value queries?",
          "options": [
            {
              "id": "tq-rep-1",
              "text": "Each replica runs the full query for every read, so throughput per dollar is far lower ($1,400 vs $450).",
              "isCorrect": true,
              "feedback": "Correct! Replicas are full database instances: every read pays for parsing, planning, execution and a pooled connection, whereas a cache hit is a single key lookup."
            },
            {
              "id": "tq-rep-2",
              "text": "Replicas must take row locks on the primary while serving each read, so reads still contend with writes.",
              "isCorrect": false,
              "feedback": "Replicas serve reads from their own copy and never take locks on the primary. Their downsides are cost per read and replication lag, not lock contention."
            },
            {
              "id": "tq-rep-3",
              "text": "Replicas cannot serve SELECTs until the primary is idle, so read capacity only appears during low-write windows.",
              "isCorrect": false,
              "feedback": "A hot standby serves reads continuously while it replays the WAL. Its real drawbacks are cost per read and replication lag, not waiting for the primary to go idle."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What breaks first on read replicas under 10x load?",
          "options": [
            {
              "id": "sq-rep-1",
              "text": "Replicas saturate CPU and connections, and WAL replay falls behind, so lag grows.",
              "isCorrect": true,
              "feedback": "Accurate! 10x traffic means 10x reads on each replica and 10x writes to replay. A busy replica replays WAL more slowly (and long queries can conflict with replay), so lag grows from milliseconds to seconds or more."
            },
            {
              "id": "sq-rep-2",
              "text": "The primary's disk fills with WAL segments held back for the three replicas, halting writes.",
              "isCorrect": false,
              "feedback": "WAL retention only balloons when a replica disconnects or a replication slot is abandoned. Under load, connected replicas keep consuming WAL; the first thing to break is replica CPU and connections, then lag."
            },
            {
              "id": "sq-rep-3",
              "text": "The load balancer in front of the replicas runs out of routing rules, so new reads are rejected.",
              "isCorrect": false,
              "feedback": "Read/write splitting is a connection-string or proxy decision, not a finite rule table. What runs out under 10x is replica CPU and connections, followed by growing lag."
            }
          ]
        }
      },
      {
        "id": "opt-scale-compute",
        "title": "Scale Application Servers from 2 to 10 Nodes",
        "tagline": "Horizontal compute expansion without touching the data tier.",
        "patternId": "horizontal-scaling",
        "costEstimateDeltaUsd": 900,
        "latencyProfileMs": 15,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Zero code changes required",
          "Fast autoscaling group provisioning"
        ],
        "cons": [
          "Ineffective here: the DB is the bottleneck, and 5x the servers means up to 5x the pooled DB connections",
          "Makes database connection starvation worse"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does adding more web servers make a database bottleneck WORSE instead of better?",
          "options": [
            {
              "id": "tq-sc-1",
              "text": "Each server brings its own DB pool, so more servers push Postgres past max_connections and into contention.",
              "isCorrect": true,
              "feedback": "Fundamental systems lesson! Postgres runs one process per connection, so thousands of connections add memory and context-switch overhead. Scaling compute against a saturated database is like a DDoS on your own storage tier."
            },
            {
              "id": "tq-sc-2",
              "text": "New nodes boot with cold local caches, so every request they serve misses and goes straight to the DB until they warm up.",
              "isCorrect": false,
              "feedback": "Cold caches cause a short warm-up blip, not a lasting slowdown. The lasting harm is connections: the app tier was never the bottleneck, and every extra server adds another pool of connections to the same saturated database."
            },
            {
              "id": "tq-sc-3",
              "text": "App servers cannot share a load balancer with the database, so extra nodes split the traffic unevenly.",
              "isCorrect": false,
              "feedback": "The load balancer only fronts the app tier and the split stays even. The harm is downstream: every new server opens its own pool against the same saturated database."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What metric immediately spikes when scaling compute against a bottlenecked database?",
          "options": [
            {
              "id": "sq-sc-1",
              "text": "Active connection count and Lock Wait Time (pg_stat_activity).",
              "isCorrect": true,
              "feedback": "Exactly right! Connection count climbs toward max_connections, queries queue on locks and CPU, and per-process context-switch overhead slows the DB to a crawl."
            },
            {
              "id": "sq-sc-2",
              "text": "App-server CPU, since each node now spends longer waiting on slow queries.",
              "isCorrect": false,
              "feedback": "Waiting on I/O doesn't burn CPU, and each app node now gets a smaller share of traffic, so its CPU falls. The pain shows up downstream, as DB connections and lock waits."
            },
            {
              "id": "sq-sc-3",
              "text": "Network egress from the app tier, because more nodes multiply the outbound bandwidth bill immediately.",
              "isCorrect": false,
              "feedback": "Bandwidth cost grows with traffic, not node count, and it is not what breaks. Watch Postgres connection count and lock waits, which climb as each new node adds a pool."
            }
          ]
        }
      }
    ]
  },
  "load-balancing": {
    "patternId": "load-balancing",
    "incidentTitle": "Ingress Bottleneck & Single Point of Failure Outage",
    "primaryConstraintSummary": "Direct client traffic to a single IP address is saturating CPU at 99%. Server crash causes 100% outage.",
    "recommendedOptionId": "opt-l7-lb",
    "options": [
      {
        "id": "opt-l7-lb",
        "title": "Layer 7 Reverse Proxy Load Balancer",
        "tagline": "Content-aware HTTP/HTTPS reverse proxy with health checking, least-connections routing and central TLS termination.",
        "patternId": "load-balancing",
        "costEstimateDeltaUsd": 150,
        "latencyProfileMs": -50,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Not applicable (stateless)",
        "durabilityTier": "Not applicable (stateless)",
        "pros": [
          "Spreads traffic across stateless backends using live signals such as open connections",
          "Health checks pull dead nodes from rotation after a few failed probes (seconds, depending on interval)",
          "Terminates TLS centrally to offload backend CPU"
        ],
        "cons": [
          "Adds an extra proxy hop (~0.5-2ms in the same datacenter)",
          "The load balancer itself needs redundancy (HA pair or managed multi-AZ LB) or it becomes the new SPOF"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Layer 7 Reverse Proxy Load Balancer\" fix a single overloaded endpoint that also takes the whole service down when it crashes?",
          "options": [
            {
              "id": "tq-lb-1",
              "text": "It fans requests out across several healthy backends and stops routing to a dead one, so no server carries all the load and one crash is no longer an outage.",
              "isCorrect": true,
              "feedback": "Right. The balancer owns the single entry point, picks a backend per request using live signals, and evicts unhealthy nodes, which removes both the overload and the single point of failure."
            },
            {
              "id": "tq-lb-2",
              "text": "It makes every request cheaper to execute, so the same traffic needs fewer CPU cycles in total.",
              "isCorrect": false,
              "feedback": "A balancer does not reduce per-request work; it divides the same total work across more servers. Capacity grows because you add backends behind it."
            },
            {
              "id": "tq-lb-3",
              "text": "It copies application data to every server so any node can answer any database query.",
              "isCorrect": false,
              "feedback": "A load balancer never replicates data. It only decides which backend receives each request, which is why the app tier behind it needs to be stateless or share its state."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "At 10x scale (500k RPS), what becomes the bottleneck of a single Layer 7 Load Balancer?",
          "options": [
            {
              "id": "sq-lb-1",
              "text": "One box's TLS CPU, file descriptors and ephemeral ports; scale out L7 proxies behind an L4 tier (ECMP, Maglev, Anycast).",
              "isCorrect": true,
              "feedback": "Staff-level networking insight! An L4 layer spreads connections across many L7 proxies, and keep-alive pooling to backends cuts port churn and TIME_WAIT buildup."
            },
            {
              "id": "sq-lb-2",
              "text": "Least-connections picking needs a lock over the shared backend table, so selection latency climbs as backends are added.",
              "isCorrect": false,
              "feedback": "Choosing a backend is O(1) for round-robin and cheap for least-connections (per-worker counters or power-of-two-choices avoid a global lock). The per-request cost lives in TLS handshakes and connection handling, not the balancing algorithm."
            },
            {
              "id": "sq-lb-3",
              "text": "Health probes to the backends, because probing cannot run once traffic passes 100k requests per second.",
              "isCorrect": false,
              "feedback": "Probes run on their own low-rate schedule (for example one every few seconds per backend) and do not scale with request volume. Connection and TLS capacity of the proxy is what runs out."
            }
          ]
        }
      },
      {
        "id": "opt-dns-round-robin",
        "title": "DNS Round-Robin Across Server IPs",
        "tagline": "Publish every server IP as an A record and let clients pick one.",
        "patternId": "load-balancing",
        "costEstimateDeltaUsd": 0,
        "latencyProfileMs": 0,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Not applicable (stateless)",
        "durabilityTier": "Not applicable (stateless)",
        "pros": [
          "No new component to run or pay for",
          "Spreads new clients roughly evenly across the published IPs"
        ],
        "cons": [
          "DNS cannot see server health, so a dead node keeps receiving traffic until cached records expire",
          "Clients and resolvers cache answers (TTL), so changes and rebalancing are slow and uneven"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"DNS Round-Robin Across Server IPs\" be an acceptable pick over a load balancer?",
          "options": [
            {
              "id": "tq-dns-1",
              "text": "When a brief outage is tolerable and traffic is light, since it costs nothing and adds no hop, but it cannot react to a dead server.",
              "isCorrect": true,
              "feedback": "Yes. DNS round-robin is a cheap way to spread new clients, but it has no health awareness and caches are slow to expire, so it is only acceptable when failures and imbalance are cheap."
            },
            {
              "id": "tq-dns-2",
              "text": "When you need a dead server removed within seconds, because DNS updates propagate to every client immediately.",
              "isCorrect": false,
              "feedback": "The opposite: resolvers and clients cache records for the TTL and many ignore short TTLs, so a bad IP can keep receiving traffic for minutes or hours."
            },
            {
              "id": "tq-dns-3",
              "text": "When you need per-request routing on live connection counts, since each DNS answer reflects current server load.",
              "isCorrect": false,
              "feedback": "DNS answers rotate without any knowledge of load or health, and they are cached, so routing is per client lookup, not per request."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 10x on \"DNS Round-Robin Across Server IPs\". What goes wrong first?",
          "options": [
            {
              "id": "sq-dns-1",
              "text": "Load skews badly: big resolvers and long-lived clients pin many users to one IP, and you cannot drain or rebalance quickly.",
              "isCorrect": true,
              "feedback": "Correct. Caching resolvers hand the same IP to large groups of users, so one server can be hit far harder than the rest, and lowering the TTL does not take effect fast enough to fix it."
            },
            {
              "id": "sq-dns-2",
              "text": "The DNS servers cannot answer 10x more queries, so name resolution starts failing.",
              "isCorrect": false,
              "feedback": "DNS answers are heavily cached and cheap to serve, so a 10x traffic increase barely changes the query rate reaching authoritative servers."
            },
            {
              "id": "sq-dns-3",
              "text": "Round-robin stops rotating once the record set is queried more than 100k times a second.",
              "isCorrect": false,
              "feedback": "Rotation order does not depend on query volume. The real limit is that cached answers bypass the rotation entirely."
            }
          ]
        }
      },
      {
        "id": "opt-hardcoded-ips",
        "title": "Hardcode Server IPs in Every Client",
        "tagline": "Ship the server address list inside the mobile or web client and let it pick one.",
        "patternId": "load-balancing",
        "costEstimateDeltaUsd": 0,
        "latencyProfileMs": 20,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Not applicable (stateless)",
        "durabilityTier": "Not applicable (stateless)",
        "pros": [
          "Nothing to run in the request path",
          "Works on day one with no infrastructure change"
        ],
        "cons": [
          "Adding, removing or replacing a server requires a client release",
          "Every installed client keeps calling a dead IP until users update"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Hardcode Server IPs in Every Client\" a poor answer to a single endpoint that can take the service down?",
          "options": [
            {
              "id": "tq-hc-1",
              "text": "Server changes and failures cannot be hidden from clients, so a dead or replaced IP keeps receiving requests until every user updates the app.",
              "isCorrect": true,
              "feedback": "Right. Without a stable entry point, the client list becomes the routing table, and you cannot change it faster than users update."
            },
            {
              "id": "tq-hc-2",
              "text": "Clients always pick the first IP in the list, so extra servers never receive any traffic at all.",
              "isCorrect": false,
              "feedback": "Clients can randomise their pick. The problem is not distribution but that no one can remove a failed server or add capacity without shipping a new client."
            },
            {
              "id": "tq-hc-3",
              "text": "Hardcoded IPs cannot use HTTPS, so all traffic to the servers is unencrypted.",
              "isCorrect": false,
              "feedback": "TLS works fine against a fixed IP or hostname. The weakness is operational: routing changes cannot be made centrally or quickly."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 10x on \"Hardcode Server IPs in Every Client\". What breaks first?",
          "options": [
            {
              "id": "sq-hc-1",
              "text": "You cannot add capacity in time: new servers receive no traffic until a client release reaches users, while the old servers stay overloaded.",
              "isCorrect": true,
              "feedback": "Correct. Capacity is tied to the shipped client list, so scaling out requires a release cycle, not a configuration change."
            },
            {
              "id": "sq-hc-2",
              "text": "The clients run out of memory storing the list of server addresses.",
              "isCorrect": false,
              "feedback": "A list of addresses is a few hundred bytes. Memory is never the limit here."
            },
            {
              "id": "sq-hc-3",
              "text": "The servers reject the extra connections because they detect that the IPs are hardcoded.",
              "isCorrect": false,
              "feedback": "Servers cannot tell how a client found their address. The real failure is that clients cannot be redirected when capacity changes."
            }
          ]
        }
      }
    ]
  },
  "horizontal-scaling": {
    "patternId": "horizontal-scaling",
    "incidentTitle": "Single node CPU at 98% under 80,000 req/s",
    "primaryConstraintSummary": "Web traffic is stateless HTTP/JSON API requests.",
    "recommendedOptionId": "opt-horizontal-scaling-recommended",
    "options": [
      {
        "id": "opt-horizontal-scaling-recommended",
        "title": "Deploy Stateless Autoscaling Fleet",
        "tagline": "Industry-standard architectural pattern for stateless app fleet overload.",
        "patternId": "horizontal-scaling",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Deploy Stateless Autoscaling Fleet\" fix a single node pinned at 98% CPU under 80,000 req/s?",
          "options": [
            {
              "id": "tdq-horizontal-scaling-recommended-1",
              "text": "Extra instances make each request cheaper to execute, so the same 80,000 req/s needs fewer CPU cycles overall.",
              "isCorrect": false,
              "feedback": "Scaling out does not reduce per-request CPU cost. It divides the same total work across more cores, which is why the fleet, not the code path, gets faster."
            },
            {
              "id": "tdq-horizontal-scaling-recommended-2",
              "text": "Stateless requests spread over N identical nodes via a load balancer, each at about 1/N of the CPU.",
              "isCorrect": true,
              "feedback": "Right. With no session state pinned to a node, any instance can serve any request, so total CPU demand is divided across the fleet and capacity grows by adding nodes."
            },
            {
              "id": "tdq-horizontal-scaling-recommended-3",
              "text": "Each node keeps only the sessions it serves, so shrinking per-node state is what lowers CPU usage.",
              "isCorrect": false,
              "feedback": "The opposite: stateless means nodes hold no per-user state. The win comes from any node being able to serve any request, not from partitioning state."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 10x to 800,000 req/s against \"Deploy Stateless Autoscaling Fleet\". What breaks first?",
          "options": [
            {
              "id": "stq-horizontal-scaling-recommended-1",
              "text": "The load balancer, because it is a single machine that cannot forward 800,000 req/s no matter how many app nodes sit behind it.",
              "isCorrect": false,
              "feedback": "Cloud load balancers scale horizontally and routinely handle this rate. The fixed-capacity piece is usually the shared datastore behind the fleet."
            },
            {
              "id": "stq-horizontal-scaling-recommended-2",
              "text": "The autoscaler cannot add nodes as fast as traffic ramps, so the fleet stays permanently overloaded until traffic drops.",
              "isCorrect": false,
              "feedback": "Warm-up lag causes a short spike, and target-tracking with headroom absorbs it. It is transient, unlike a hard limit on a shared dependency."
            },
            {
              "id": "stq-horizontal-scaling-recommended-3",
              "text": "The shared database behind the fleet: 10x more nodes open 10x more connections against one fixed-size backend.",
              "isCorrect": true,
              "feedback": "Correct. App nodes scale out freely, but the shared datastore's connection cap and CPU do not, so it becomes the next bottleneck. Pool connections and cache reads."
            }
          ]
        }
      },
      {
        "id": "opt-horizontal-scaling-alternative",
        "title": "Upsize to 64-Core Bare Metal Instance",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "horizontal-scaling",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"Upsize to 64-Core Bare Metal Instance\" be a better pick than the autoscaling fleet for the 98% CPU node?",
          "options": [
            {
              "id": "tdq-horizontal-scaling-alternative-1",
              "text": "When the service holds a 200 GB in-memory index that cannot be split across nodes without a rewrite.",
              "isCorrect": true,
              "feedback": "Yes. Scale-up wins when state is tightly coupled to memory and sharding it would need a redesign. For stateless JSON APIs the fleet is still the better default."
            },
            {
              "id": "tdq-horizontal-scaling-alternative-2",
              "text": "When traffic is stateless and very spiky, since one large machine absorbs bursts without any instance warm-up delay or scaling lag.",
              "isCorrect": false,
              "feedback": "Stateless, spiky traffic is exactly what autoscaling suits. A fixed big box is paid for while idle and still has a hard ceiling when the burst exceeds 64 cores."
            },
            {
              "id": "tdq-horizontal-scaling-alternative-3",
              "text": "When availability matters most, since a single 64-core host has fewer parts that can fail than a whole fleet of small nodes.",
              "isCorrect": false,
              "feedback": "One host is a single point of failure: if it dies, the service is fully down. A fleet behind a load balancer tolerates losing nodes."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 5x on \"Upsize to 64-Core Bare Metal Instance\". What happens?",
          "options": [
            {
              "id": "stq-horizontal-scaling-alternative-1",
              "text": "The host hits a fixed ceiling: 64 cores is the top size, and it is still one failure domain.",
              "isCorrect": true,
              "feedback": "Correct. Vertical scaling ends at the biggest machine you can buy. Past that point the only way up is splitting load across hosts, which is the fleet you skipped."
            },
            {
              "id": "stq-horizontal-scaling-alternative-2",
              "text": "Nothing breaks, because throughput scales linearly with cores once you raise the app's worker thread count to 64.",
              "isCorrect": false,
              "feedback": "Scaling is sub-linear: lock contention, cross-socket NUMA memory traffic and NIC interrupt handling all eat into it. Thread count alone cannot deliver 5x."
            },
            {
              "id": "stq-horizontal-scaling-alternative-3",
              "text": "The NIC saturates first, because bare metal shares its network card with noisy neighbors on the same rack.",
              "isCorrect": false,
              "feedback": "Bare metal is single-tenant, so there are no noisy neighbors. The real limit is that one machine's CPU and NIC are finite whatever you provision."
            }
          ]
        }
      },
      {
        "id": "opt-horizontal-scaling-antipattern",
        "title": "Enable Brotli Gzip Compression on Nginx",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "horizontal-scaling",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Enable Brotli Gzip Compression on Nginx\" not fix the node running at 98% CPU?",
          "options": [
            {
              "id": "tdq-horizontal-scaling-antipattern-1",
              "text": "Compression only applies to static files, so the JSON API responses are untouched and the load stays identical.",
              "isCorrect": false,
              "feedback": "Nginx can compress dynamic JSON responses on the fly, and that is exactly why it costs CPU. It does change the load, just in the wrong direction."
            },
            {
              "id": "tdq-horizontal-scaling-antipattern-2",
              "text": "It shrinks bytes on the wire, but the bottleneck is CPU, and compressing every response adds CPU work per request.",
              "isCorrect": true,
              "feedback": "Right. Compression trades CPU for bandwidth. When CPU is the saturated resource, spending more of it per response makes the outage worse, not better."
            },
            {
              "id": "tdq-horizontal-scaling-antipattern-3",
              "text": "It reduces bandwidth, but 80,000 req/s of connections is a load balancer problem, which compression cannot relieve.",
              "isCorrect": false,
              "feedback": "There is no load balancer in this incident. The single node is CPU-bound, and the fix must add compute capacity, not shave bytes."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Enable Brotli Gzip Compression on Nginx\" collapse when traffic grows 10x?",
          "options": [
            {
              "id": "stq-horizontal-scaling-antipattern-1",
              "text": "Compression ratios fall as traffic rises, so bandwidth costs spike and the network becomes the limit.",
              "isCorrect": false,
              "feedback": "Ratio depends on payload content, not request volume. The failure is CPU, which compression consumes more of on every response."
            },
            {
              "id": "stq-horizontal-scaling-antipattern-2",
              "text": "Nginx worker_connections defaults to 1024, so at 800,000 req/s new connections are refused before compression runs.",
              "isCorrect": false,
              "feedback": "That limit is a tunable setting and does not explain the collapse. Even with it raised, the CPU cannot keep up with 10x requests plus compression."
            },
            {
              "id": "stq-horizontal-scaling-antipattern-3",
              "text": "Every response now costs more CPU than before, so the already saturated node queues requests and times out well below 10x.",
              "isCorrect": true,
              "feedback": "Correct. With CPU at 98% and per-request cost rising, there is no headroom. Latency climbs as the run queue grows and clients start timing out."
            }
          ]
        }
      }
    ]
  },
  "read-replicas": {
    "patternId": "read-replicas",
    "incidentTitle": "Primary Postgres CPU at 96% with 90% SELECT queries",
    "primaryConstraintSummary": "90% reads, 10% writes. Replication lag < 100ms acceptable.",
    "recommendedOptionId": "opt-read-replicas-recommended",
    "options": [
      {
        "id": "opt-read-replicas-recommended",
        "title": "Deploy Streaming Read Replicas",
        "tagline": "Industry-standard architectural pattern for primary database read saturation.",
        "patternId": "read-replicas",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why do \"Deploy Streaming Read Replicas\" fit a 90% SELECT workload that tolerates under 100ms of replication lag?",
          "options": [
            {
              "id": "tdq-read-replicas-recommended-1",
              "text": "Streaming replication keeps replicas strongly consistent, so read-after-write is guaranteed on every replica you query.",
              "isCorrect": false,
              "feedback": "Streaming replication is asynchronous by default, so replicas can trail the primary. It works here only because sub-100ms staleness is acceptable."
            },
            {
              "id": "tdq-read-replicas-recommended-2",
              "text": "Replicas also multiply write throughput, because writes get spread evenly across the primary and every replica.",
              "isCorrect": false,
              "feedback": "All writes still go to the primary and every replica replays them. Replicas add read capacity only; write capacity stays the same."
            },
            {
              "id": "tdq-read-replicas-recommended-3",
              "text": "Replicas serve the 90% SELECT traffic from their own copies, and sub-100ms lag is invisible for these reads.",
              "isCorrect": true,
              "feedback": "Correct. The primary's 96% CPU is mostly SELECT execution, which moves to replicas. The lag tolerance is what makes async replication safe for this workload."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Read and write volume both grow 10x with \"Deploy Streaming Read Replicas\". What breaks first?",
          "options": [
            {
              "id": "stq-read-replicas-recommended-1",
              "text": "Postgres caps a cluster at three streaming replicas, so extra read capacity cannot be added after that.",
              "isCorrect": false,
              "feedback": "No such cap exists. You can add more replicas or cascade them. The pressure point is the single primary's write and WAL stream."
            },
            {
              "id": "stq-read-replicas-recommended-2",
              "text": "The primary's write path: 10x writes mean 10x WAL to replay, so lag passes 100ms and writes can't scale.",
              "isCorrect": true,
              "feedback": "Correct. Read capacity grows by adding replicas, but every write lands on one primary and is replayed everywhere, so replay lag and write ceiling are the limits."
            },
            {
              "id": "stq-read-replicas-recommended-3",
              "text": "Replica disks fill up first because each replica must store ten times more data at ten times the request rate.",
              "isCorrect": false,
              "feedback": "Dataset size grows with stored rows, not request rate. Replicas hold the same data as the primary, so 10x traffic does not mean 10x disk."
            }
          ]
        }
      },
      {
        "id": "opt-read-replicas-alternative",
        "title": "Upgrade Primary NVMe Storage IOPS",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "read-replicas",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"Upgrade Primary NVMe Storage IOPS\" beat adding replicas for the primary Postgres?",
          "options": [
            {
              "id": "tdq-read-replicas-alternative-1",
              "text": "When the bottleneck is CPU, because faster storage lets each query finish in fewer CPU cycles per statement.",
              "isCorrect": false,
              "feedback": "Faster IOPS cuts time spent waiting on disk, not cycles spent parsing, planning and executing. If CPU is saturated, storage speed is not the constraint."
            },
            {
              "id": "tdq-read-replicas-alternative-2",
              "text": "When reads must see the latest commit and data spills past RAM, since one faster primary has no stale reads.",
              "isCorrect": true,
              "feedback": "Yes. A single authoritative node has zero replication lag, and faster NVMe helps if queries wait on disk. It suits strict-freshness, I/O-bound cases, not this CPU-bound one."
            },
            {
              "id": "tdq-read-replicas-alternative-3",
              "text": "When writes are only 10% of traffic, because faster disks bring replication lag down to zero on standbys.",
              "isCorrect": false,
              "feedback": "Lag comes from network transfer and WAL replay on the replica, not primary disk speed. There are no replicas in this option to lag at all."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Reads grow 5x on \"Upgrade Primary NVMe Storage IOPS\". What limits it first?",
          "options": [
            {
              "id": "stq-read-replicas-alternative-1",
              "text": "The NVMe queue depth saturates at about 5x IOPS, so requests stall in the drive before Postgres sees them.",
              "isCorrect": false,
              "feedback": "Modern NVMe drives handle very deep queues and hundreds of thousands of IOPS. The incident is CPU-bound, so disk is rarely what stalls first."
            },
            {
              "id": "stq-read-replicas-alternative-2",
              "text": "The one primary still runs every SELECT on its CPU, so 5x reads push it past 100% despite fast NVMe.",
              "isCorrect": true,
              "feedback": "Correct. Query execution needs CPU whether pages come from RAM or NVMe. With no second node to share the reads, the CPU ceiling stays."
            },
            {
              "id": "stq-read-replicas-alternative-3",
              "text": "NVMe write endurance wears out five times faster, so the drive fails before the CPU becomes the issue.",
              "isCorrect": false,
              "feedback": "Wear accumulates over months of writes and reads barely affect it. It would not cause failure in a 5x traffic event."
            }
          ]
        }
      },
      {
        "id": "opt-read-replicas-antipattern",
        "title": "Shard Tables Across Multiple Hosts",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "read-replicas",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Shard Tables Across Multiple Hosts\" not fix a primary at 96% CPU from 90% SELECT queries?",
          "options": [
            {
              "id": "tdq-read-replicas-antipattern-1",
              "text": "Sharding spreads writes and storage, but these reads still run the same queries and now need routing.",
              "isCorrect": true,
              "feedback": "Right. Sharding solves write and size limits, not a read-heavy CPU load on data that fits one node. It adds a routing layer and can make joins more expensive."
            },
            {
              "id": "tdq-read-replicas-antipattern-2",
              "text": "Sharding raises write latency, and writes are what saturate the primary's CPU in this outage, so it is not worth doing.",
              "isCorrect": false,
              "feedback": "Writes are only 10% of traffic. The CPU is burned by SELECT execution, so a write-focused technique targets the wrong bottleneck."
            },
            {
              "id": "tdq-read-replicas-antipattern-3",
              "text": "Sharding would work, but only if replication lag stays under 100ms across all of the newly created shards.",
              "isCorrect": false,
              "feedback": "Replication lag is unrelated to sharding. Shards hold disjoint data and do not replicate to each other, so the lag tolerance does not apply."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Shard Tables Across Multiple Hosts\" fall over when read traffic grows 10x?",
          "options": [
            {
              "id": "stq-read-replicas-antipattern-1",
              "text": "Every shard replicates its WAL to all the other shards, so network traffic multiplies with each extra host added.",
              "isCorrect": false,
              "feedback": "Shards hold disjoint slices of data and do not stream WAL to each other. Replication is a per-shard concern, not cross-shard."
            },
            {
              "id": "stq-read-replicas-antipattern-2",
              "text": "Postgres cannot re-shard after launch because shard keys are immutable, so no capacity can ever be added later.",
              "isCorrect": false,
              "feedback": "Re-sharding is painful but possible with online tools and logical replication. The stress failure is skewed load, not impossibility."
            },
            {
              "id": "stq-read-replicas-antipattern-3",
              "text": "A hot shard: popular rows land on one host whose CPU saturates while the other hosts sit idle.",
              "isCorrect": true,
              "feedback": "Correct. Sharding balances data, not read popularity. A hot key pins 10x load on one shard, and fan-out queries touch every host, so no single-node relief arrives."
            }
          ]
        }
      }
    ]
  },
  "cdn-edge": {
    "patternId": "cdn-edge",
    "incidentTitle": "Overseas users suffer 3,200ms latency for static product photos",
    "primaryConstraintSummary": "Static immutable image assets, global customer base.",
    "recommendedOptionId": "opt-cdn-edge-recommended",
    "options": [
      {
        "id": "opt-cdn-edge-recommended",
        "title": "Deploy Anycast Global CDN",
        "tagline": "Industry-standard architectural pattern for global media asset latency.",
        "patternId": "cdn-edge",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Deploy Anycast Global CDN\" cut 3,200ms latency for overseas users when the photos are static and immutable?",
          "options": [
            {
              "id": "tdq-cdn-edge-recommended-1",
              "text": "Anycast steers packets across dedicated private fiber that carries data faster than the public internet between continents.",
              "isCorrect": false,
              "feedback": "Anycast only routes each user to a nearby point of presence. The speedup comes from shorter distance and cache hits, not from faster links."
            },
            {
              "id": "tdq-cdn-edge-recommended-2",
              "text": "Immutable files get long TTLs at nearby edge PoPs, so repeat requests skip the long-haul trip to origin.",
              "isCorrect": true,
              "feedback": "Correct. Distance drives latency through RTT and TCP/TLS handshakes. A nearby edge cache answers in tens of milliseconds and never touches the distant origin."
            },
            {
              "id": "tdq-cdn-edge-recommended-3",
              "text": "The CDN losslessly recompresses every image to about a tenth of its size, which alone accounts for the latency drop.",
              "isCorrect": false,
              "feedback": "A CDN may optimize images, but the multi-second delay here is mostly distance and handshakes. Even unchanged bytes are fast from a nearby edge."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Image traffic grows 10x on \"Deploy Anycast Global CDN\". What is the first thing to strain?",
          "options": [
            {
              "id": "stq-cdn-edge-recommended-1",
              "text": "Anycast sends nearly all traffic to a single PoP, which overloads while all of the others sit idle.",
              "isCorrect": false,
              "feedback": "Anycast spreads users across PoPs by network topology, and edge capacity scales out. A single overloaded PoP is not the typical failure."
            },
            {
              "id": "stq-cdn-edge-recommended-2",
              "text": "Long-tail photos miss at cold PoPs and hit the origin; an origin shield tier merges those fetches.",
              "isCorrect": true,
              "feedback": "Correct. Popular images stay hot at the edge, but the long tail has low hit ratios and every PoP fetches it separately. An origin shield merges these into one origin request."
            },
            {
              "id": "stq-cdn-edge-recommended-3",
              "text": "Edge caches expire the images on their TTL, so every single user must re-download all photos from the origin.",
              "isCorrect": false,
              "feedback": "Immutable assets can carry year-long TTLs and content-hashed URLs, and expiry usually triggers a cheap revalidation, not a full re-download."
            }
          ]
        }
      },
      {
        "id": "opt-cdn-edge-alternative",
        "title": "Double Origin Egress Network Bandwidth",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "cdn-edge",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"Double Origin Egress Network Bandwidth\" be a smarter choice than a CDN for the product photos?",
          "options": [
            {
              "id": "tdq-cdn-edge-alternative-1",
              "text": "When users sit near the origin and images are personalized, so an edge cache would rarely hit.",
              "isCorrect": true,
              "feedback": "Yes. A CDN pays off through cache hits. With low cache-ability or a local audience, saturated egress is the real constraint, and more bandwidth addresses it directly."
            },
            {
              "id": "tdq-cdn-edge-alternative-2",
              "text": "When overseas latency comes from distance, because a wider pipe shortens the round trip time to users abroad.",
              "isCorrect": false,
              "feedback": "Bandwidth sets throughput, not propagation delay. Round-trip time to a distant user is set by distance and stays the same however wide the origin link is."
            },
            {
              "id": "tdq-cdn-edge-alternative-3",
              "text": "When images must be served from your own domain over HTTPS, since CDNs cannot terminate TLS for custom domains.",
              "isCorrect": false,
              "feedback": "CDNs routinely serve custom domains with your own or managed certificates. TLS termination is not a reason to avoid one."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Image traffic grows 5x after \"Double Origin Egress Network Bandwidth\". What happens?",
          "options": [
            {
              "id": "stq-cdn-edge-alternative-1",
              "text": "Bandwidth scales with users, so doubling again keeps up and overseas latency improves with each doubling.",
              "isCorrect": false,
              "feedback": "Latency is set by distance and handshakes, so wider links help throughput only. Overseas users still wait on ocean-crossing round trips."
            },
            {
              "id": "stq-cdn-edge-alternative-2",
              "text": "Overseas requests still cross oceans to one origin, so the doubled link saturates at 2x and latency stays high.",
              "isCorrect": true,
              "feedback": "Correct. Doubling covers only 2x of a 5x jump, and no cache absorbs repeats. You pay per byte of egress and remote users see no latency improvement."
            },
            {
              "id": "stq-cdn-edge-alternative-3",
              "text": "DNS lookups become the bottleneck, since a larger link needs more origin IP addresses to be resolved.",
              "isCorrect": false,
              "feedback": "Link capacity does not change how many IPs are needed, and DNS answers are cached by resolvers. The limit is the saturated origin pipe."
            }
          ]
        }
      },
      {
        "id": "opt-cdn-edge-antipattern",
        "title": "Inline Base64 Images Directly in HTML",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "cdn-edge",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Inline Base64 Images Directly in HTML\" not fix 3,200ms latency for overseas users?",
          "options": [
            {
              "id": "tdq-cdn-edge-antipattern-1",
              "text": "Decoding Base64 costs seconds of CPU time on the user's device, which cancels out any requests that inlining saved.",
              "isCorrect": false,
              "feedback": "Browsers decode Base64 quickly, in milliseconds. The real damage is the bytes added and the loss of separate caching, not decode time."
            },
            {
              "id": "tdq-cdn-edge-antipattern-2",
              "text": "Base64 adds about 33% to each image and embeds it in HTML, so it cannot be cached and is refetched from origin.",
              "isCorrect": true,
              "feedback": "Right. Inlining saves a few requests but adds bytes to every HTML response and removes cacheability. The long haul to the origin remains, with more data on it."
            },
            {
              "id": "tdq-cdn-edge-antipattern-3",
              "text": "Browsers refuse to render data URIs above 32 KB, so most product photos would not display on any page at all.",
              "isCorrect": false,
              "feedback": "That limit was an old IE quirk. Modern browsers render large data URIs, and the problem is bandwidth and caching, not blocked rendering."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Inline Base64 Images Directly in HTML\" collapse when traffic grows 10x?",
          "options": [
            {
              "id": "stq-cdn-edge-antipattern-1",
              "text": "The origin must Base64-encode every image on each request, so encoding CPU saturates first at scale.",
              "isCorrect": false,
              "feedback": "Encoding can be done once at build time. The lasting problem is the extra bytes served and the missing cache, both of which grow with traffic."
            },
            {
              "id": "stq-cdn-edge-antipattern-2",
              "text": "Browsers cap connections at six per host, so pages with many inline images queue behind each other.",
              "isCorrect": false,
              "feedback": "That cap applies to separate image requests. Inlining removes those requests, so it is not what breaks; the payload size is."
            },
            {
              "id": "stq-cdn-edge-antipattern-3",
              "text": "HTML grows 33% and is re-sent on every view with no cache, so origin egress grows 10x.",
              "isCorrect": true,
              "feedback": "Correct. With nothing cacheable, every view pays full transfer from origin. Egress scales linearly with traffic and overseas users wait for the whole document."
            }
          ]
        }
      }
    ]
  },
  "async-queues": {
    "patternId": "async-queues",
    "incidentTitle": "Checkout API stalls when invoice PDF generation runs inline",
    "primaryConstraintSummary": "Invoices can be delivered within 60 seconds asynchronously.",
    "recommendedOptionId": "opt-async-queues-recommended",
    "options": [
      {
        "id": "opt-async-queues-recommended",
        "title": "Decouple via Asynchronous Job Queue",
        "tagline": "Industry-standard architectural pattern for ingress burst decoupling.",
        "patternId": "async-queues",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Decouple via Asynchronous Job Queue\" the right call when invoices only need to arrive within 60 seconds?",
          "options": [
            {
              "id": "tdq-async-queues-recommended-1",
              "text": "A queue makes each PDF render cheaper, because workers reuse warm renderer processes and the CPU cost per invoice drops well below the inline path.",
              "isCorrect": false,
              "feedback": "Rendering cost per invoice is unchanged. The queue only moves that work off the checkout request path; any warm-worker savings are a separate optimization."
            },
            {
              "id": "tdq-async-queues-recommended-2",
              "text": "Checkout only enqueues a message and returns, so PDF render time leaves the request path, and the 60-second window gives workers room to drain bursts.",
              "isCorrect": true,
              "feedback": "Correct. The slack in the 60s delivery window is what lets a queue absorb spikes: enqueue costs milliseconds while rendering catches up in the background."
            },
            {
              "id": "tdq-async-queues-recommended-3",
              "text": "Queues deliver each message exactly once, so invoice workers need no idempotency handling and duplicate PDFs or duplicate emails cannot happen.",
              "isCorrect": false,
              "feedback": "Most brokers are at-least-once. A worker crash after rendering but before ack causes redelivery, so workers still need idempotency keys."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What breaks first for the queue-based design when checkout traffic grows 10x?",
          "options": [
            {
              "id": "stq-async-queues-recommended-1",
              "text": "Enqueue calls start blocking until a worker finishes the PDF, so checkout latency climbs back toward the original inline render time.",
              "isCorrect": false,
              "feedback": "Enqueue only waits for the broker to acknowledge the message, typically a few milliseconds. It is not coupled to how fast workers render."
            },
            {
              "id": "stq-async-queues-recommended-2",
              "text": "Acknowledged messages start vanishing from the broker, because queued jobs live only in broker memory and are dropped once the backlog grows large.",
              "isCorrect": false,
              "feedback": "Durable brokers persist and replicate messages to disk. A large backlog costs storage and age, not silent message loss."
            },
            {
              "id": "stq-async-queues-recommended-3",
              "text": "Queue depth grows faster than workers drain it, so invoice age passes the 60-second window unless worker count autoscales on queue lag.",
              "isCorrect": true,
              "feedback": "Correct. Checkout stays fast, but the SLA now lives in the backlog: arrival rate above drain rate means invoices go stale, so scale workers on queue lag."
            }
          ]
        }
      },
      {
        "id": "opt-async-queues-alternative",
        "title": "Run Synchronous Background Threads on App Pods",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "async-queues",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Run Synchronous Background Threads on App Pods\" instead of a job queue?",
          "options": [
            {
              "id": "tdq-async-queues-alternative-1",
              "text": "For a small single-service app with low invoice volume, where losing an in-flight job on a pod restart is acceptable and running a broker is not worth it.",
              "isCorrect": true,
              "feedback": "Correct. In-process threads need no new infrastructure, but jobs live in pod memory and vanish on restart, so this fits only low-volume, loss-tolerant work."
            },
            {
              "id": "tdq-async-queues-alternative-2",
              "text": "When invoices must survive pod restarts, because threads inside the app process checkpoint their pending work to disk before a pod is terminated.",
              "isCorrect": false,
              "feedback": "Threads have no automatic checkpointing. A terminated pod loses its in-flight and pending jobs unless you add your own durable store."
            },
            {
              "id": "tdq-async-queues-alternative-3",
              "text": "When PDF capacity must scale independently of checkout, because thread pools let you add render throughput without adding API pods.",
              "isCorrect": false,
              "feedback": "Threads share the pod's CPU and heap with request handlers, so PDF capacity only scales by scaling the API pods. Independent scaling needs separate workers."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Run Synchronous Background Threads on App Pods\" when traffic grows another 5x?",
          "options": [
            {
              "id": "stq-async-queues-alternative-1",
              "text": "The OS scheduler kills threads beyond the core count, so surplus invoices are silently dropped while the remaining threads keep working normally.",
              "isCorrect": false,
              "feedback": "Threads are time-sliced, not killed. Extra threads slow every other thread down, including the request handlers, rather than being dropped."
            },
            {
              "id": "stq-async-queues-alternative-2",
              "text": "Each pod's PDF memory is isolated from request handling, so checkout latency stays flat and only the monthly bill rises with the pod count.",
              "isCorrect": false,
              "feedback": "Render threads and request handlers share one process: CPU, heap and GC pauses are common, so heavy PDF work degrades checkout latency directly."
            },
            {
              "id": "stq-async-queues-alternative-3",
              "text": "PDF threads compete with request handlers for the same CPU and heap, so checkout slows, and autoscaling must add whole pods to fix it.",
              "isCorrect": true,
              "feedback": "Correct. Render load and API load are coupled in one process, so the only lever is more pods, which is why the cost delta ($1200) is so high."
            }
          ]
        }
      },
      {
        "id": "opt-async-queues-antipattern",
        "title": "Increase HTTP Client Timeout to 300 Seconds",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "async-queues",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Increase HTTP Client Timeout to 300 Seconds\" not fix the checkout stall caused by inline PDF generation?",
          "options": [
            {
              "id": "tdq-async-queues-antipattern-1",
              "text": "It only lets clients wait longer; every request still holds a server thread and connection for the full PDF render, so the worker pool stays exhausted.",
              "isCorrect": true,
              "feedback": "Correct. The stall is server-side thread exhaustion. A longer client timeout hides the errors but each inline request still occupies a thread for the whole render."
            },
            {
              "id": "tdq-async-queues-antipattern-2",
              "text": "Client timeouts are enforced by the server, so a longer setting makes the server reject inline PDF work sooner and checkout returns errors faster.",
              "isCorrect": false,
              "feedback": "The client timeout is enforced by the caller, not the server. Raising it makes the server keep working on slow requests, not reject them."
            },
            {
              "id": "tdq-async-queues-antipattern-3",
              "text": "A longer timeout makes the renderer run more slowly, because the runtime throttles work to fit whatever deadline the client has configured.",
              "isCorrect": false,
              "feedback": "Runtimes do not adapt work speed to client deadlines. Render time is unchanged; only the moment the client gives up moves."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Increase HTTP Client Timeout to 300 Seconds\" collapse under 10x checkout traffic?",
          "options": [
            {
              "id": "stq-async-queues-antipattern-1",
              "text": "The API gateway sees the longer waits as abuse and rate-limits all checkout callers for 300 seconds, which blocks healthy requests as well.",
              "isCorrect": false,
              "feedback": "Gateways rate-limit on request rate, not on client timeout length. A longer timeout does not trigger rate limiting."
            },
            {
              "id": "stq-async-queues-antipattern-2",
              "text": "Requests stay open up to 300s, so threads and connections fill the pool and healthy requests queue behind stuck renders.",
              "isCorrect": true,
              "feedback": "Correct. By Little's law, in-flight requests equal arrival rate times hold time. With 10x arrivals and long holds, thread and connection pools saturate."
            },
            {
              "id": "stq-async-queues-antipattern-3",
              "text": "PDF render time scales with the timeout value, so a 300s limit makes each invoice take up to five times longer than it did before.",
              "isCorrect": false,
              "feedback": "Render duration depends on document size and CPU, not on client timeout. The timeout only decides when the client stops waiting."
            }
          ]
        }
      }
    ]
  },
  "sharding": {
    "patternId": "sharding",
    "incidentTitle": "Multi-tenant table exceeds 12 TB with heavy write contention",
    "primaryConstraintSummary": "Workload is multi-tenant with tenant_id present on all queries.",
    "recommendedOptionId": "opt-sharding-recommended",
    "options": [
      {
        "id": "opt-sharding-recommended",
        "title": "Hash Sharding by Tenant ID",
        "tagline": "Industry-standard architectural pattern for single table iops exhaustion.",
        "patternId": "sharding",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Hash Sharding by Tenant ID\" the right call for a 12 TB table when every query carries a tenant_id?",
          "options": [
            {
              "id": "tdq-sharding-recommended-1",
              "text": "Hashing tenant_id guarantees every shard gets an equal share of writes, because hash functions spread tenants evenly regardless of how big each tenant is.",
              "isCorrect": false,
              "feedback": "Hashing balances the number of tenants, not their volume. One very large tenant still lands entirely on one shard."
            },
            {
              "id": "tdq-sharding-recommended-2",
              "text": "Every query routes to exactly one shard by tenant_id, so data size and write load split across nodes without scatter-gather queries.",
              "isCorrect": true,
              "feedback": "Correct. Because tenant_id is on every query, the shard key is always available, so reads and writes stay single-shard while the 12 TB and write contention are divided."
            },
            {
              "id": "tdq-sharding-recommended-3",
              "text": "Sharding keeps cross-tenant joins and transactions running on a single node, so reporting queries across all tenants stay as cheap as before.",
              "isCorrect": false,
              "feedback": "Cross-tenant joins and transactions span shards after sharding, which makes them scatter-gather or distributed transactions. Only single-tenant queries stay cheap."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What breaks first for \"Hash Sharding by Tenant ID\" when traffic surges 10x?",
          "options": [
            {
              "id": "stq-sharding-recommended-1",
              "text": "Hash collisions start mixing tenants' rows, so queries on one shard can return data belonging to other tenants that hashed to the same node.",
              "isCorrect": false,
              "feedback": "Tenants sharing a shard are still separated by the tenant_id predicate. Co-location is normal and does not leak rows."
            },
            {
              "id": "stq-sharding-recommended-2",
              "text": "Adding shards forces a full modulo rehash of every key, which always requires taking the whole cluster offline while data is moved.",
              "isCorrect": false,
              "feedback": "Consistent hashing or a fixed bucket-to-shard map moves only a fraction of data, and it can be done online. It is not a required outage."
            },
            {
              "id": "stq-sharding-recommended-3",
              "text": "One very large tenant becomes a hot shard, because all its writes hash to a single node, and adding more shards cannot split that tenant.",
              "isCorrect": true,
              "feedback": "Correct. tenant_id is the shard key, so a whale's load is indivisible. Fixing it needs a finer key (tenant_id plus something else) or a dedicated shard."
            }
          ]
        }
      },
      {
        "id": "opt-sharding-alternative",
        "title": "Vertical Partitioning by Table Columns",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "sharding",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Vertical Partitioning by Table Columns\" instead of hash sharding by tenant?",
          "options": [
            {
              "id": "tdq-sharding-alternative-1",
              "text": "When row width is the problem, such as blob or JSON columns bloating I/O, and hot columns fit one node without new routing.",
              "isCorrect": true,
              "feedback": "Correct. Splitting cold or wide columns into their own table shrinks the hot row and cache footprint, at low migration cost, when row count and write rate are not the limit."
            },
            {
              "id": "tdq-sharding-alternative-2",
              "text": "When write throughput is the bottleneck, because splitting columns divides the number of rows each node must write per second.",
              "isCorrect": false,
              "feedback": "Each insert still writes one row to every column group, so the row count per node is unchanged. Vertical splits do not divide write volume by rows."
            },
            {
              "id": "tdq-sharding-alternative-3",
              "text": "When tenants need data isolation, because separate column groups keep one tenant's data physically apart from every other tenant's.",
              "isCorrect": false,
              "feedback": "Vertical partitioning splits columns, not tenants. All tenants' rows still sit together in each column group, so there is no tenant isolation."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Vertical Partitioning by Table Columns\" when traffic grows another 5x?",
          "options": [
            {
              "id": "stq-sharding-alternative-1",
              "text": "The join between column groups gets cached in memory, so reads that span partitions actually get cheaper as traffic increases.",
              "isCorrect": false,
              "feedback": "Reassembling rows across partitions costs extra lookups or joins on every read. More traffic means more of that cost, not less."
            },
            {
              "id": "stq-sharding-alternative-2",
              "text": "Each column group still holds every tenant's rows on one node, so the hottest group hits that node's write IOPS and disk ceiling.",
              "isCorrect": true,
              "feedback": "Correct. Vertical splits never divide rows across machines, so the busiest slice is still a single-node, single-writer table bounded by one server's limits."
            },
            {
              "id": "stq-sharding-alternative-3",
              "text": "Column groups rebalance across nodes automatically as row counts grow, the same way hash shards spread out when new shards are added.",
              "isCorrect": false,
              "feedback": "Vertical partitions are fixed by schema and do not redistribute rows. Only horizontal sharding spreads rows across nodes."
            }
          ]
        }
      },
      {
        "id": "opt-sharding-antipattern",
        "title": "Single Monolithic Database Instance Upsize",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "sharding",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Single Monolithic Database Instance Upsize\" not fix the 12 TB multi-tenant write contention?",
          "options": [
            {
              "id": "tdq-sharding-antipattern-1",
              "text": "A larger instance disables row-level locking to cut contention, so the outage clears but transactions lose their ACID isolation guarantees.",
              "isCorrect": false,
              "feedback": "Instance size never changes the locking model. Contention on hot rows and the write-ahead log remains, just with more CPU to absorb it."
            },
            {
              "id": "tdq-sharding-antipattern-2",
              "text": "Upsizing triggers an automatic re-shard by tenant_id, and the resulting migration downtime makes the incident longer than doing nothing.",
              "isCorrect": false,
              "feedback": "Resizing a single instance never re-shards anything. Data stays on one volume; the trouble is that nothing about the layout changes."
            },
            {
              "id": "tdq-sharding-antipattern-3",
              "text": "It raises the ceiling once, but writes still funnel through one primary with one log, and all 12 TB stays on a single volume.",
              "isCorrect": true,
              "feedback": "Correct. Vertical scaling adds CPU, RAM and IOPS to the same single-writer node. The contention and data-size problem remain and simply return later."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Single Monolithic Database Instance Upsize\" collapse under 10x traffic?",
          "options": [
            {
              "id": "stq-sharding-antipattern-1",
              "text": "Larger instances have proportionally slower disks per gigabyte, so 10x traffic makes every query about ten times slower than before.",
              "isCorrect": false,
              "feedback": "Bigger instances typically get more IOPS and throughput, not less. The problem is that a single node has a hard ceiling that 10x growth exceeds."
            },
            {
              "id": "stq-sharding-antipattern-2",
              "text": "Replicas must acknowledge each commit before it completes, so 10x writes make replication lag block every write on the upsized primary.",
              "isCorrect": false,
              "feedback": "Standard replication is asynchronous, so lag does not block commits. Synchronous replication is opt-in and is not what causes this outage."
            },
            {
              "id": "stq-sharding-antipattern-3",
              "text": "Data and writes keep growing on one node until it reaches the largest instance's IOPS or storage cap, forcing a live re-shard at peak load.",
              "isCorrect": true,
              "feedback": "Correct. Vertical scaling has a fixed top. Once you hit it, you must shard anyway, and doing that migration under peak load is far riskier than doing it now."
            }
          ]
        }
      }
    ]
  },
  "consistency": {
    "patternId": "consistency",
    "incidentTitle": "Flash sale inventory goes negative due to eventual replica reads",
    "primaryConstraintSummary": "Strict inventory correctness required during high-concurrency checkout.",
    "recommendedOptionId": "opt-consistency-recommended",
    "options": [
      {
        "id": "opt-consistency-recommended",
        "title": "Linearizable Quorum or Atomic Lua Decrement",
        "tagline": "Industry-standard architectural pattern for distributed counter oversell race.",
        "patternId": "consistency",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Linearizable Quorum or Atomic Lua Decrement\" the right call for strict inventory correctness during a flash sale?",
          "options": [
            {
              "id": "tdq-consistency-recommended-1",
              "text": "Stock check and decrement run as one atomic step on a single authoritative copy, so two buyers cannot both read stock 1 and succeed.",
              "isCorrect": true,
              "feedback": "Correct. Atomicity removes the read-then-write gap where the oversell race lives. Only one of the concurrent decrements can take the last unit."
            },
            {
              "id": "tdq-consistency-recommended-2",
              "text": "It fans reads out to more replicas at once, so averaging the replica values converges on the true stock number before the order is confirmed.",
              "isCorrect": false,
              "feedback": "Averaging stale replicas does not produce a correct count. Correctness comes from serializing the decrement on one authority, not from more reads."
            },
            {
              "id": "tdq-consistency-recommended-3",
              "text": "The atomic decrement also persists the payment and order record, so no separate database transaction is needed to finalize the purchase.",
              "isCorrect": false,
              "feedback": "The decrement only guards the counter. Payment and order creation still need their own durable writes and a plan for releasing stock if payment fails."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What breaks first for \"Linearizable Quorum or Atomic Lua Decrement\" when flash-sale traffic grows 10x?",
          "options": [
            {
              "id": "stq-consistency-recommended-1",
              "text": "Lua scripts execute in parallel across threads, so 10x concurrency reintroduces the race and negative inventory returns.",
              "isCorrect": false,
              "feedback": "Redis runs a script atomically on its single command thread, so concurrency does not reintroduce the race. Correctness holds; throughput is what limits."
            },
            {
              "id": "stq-consistency-recommended-2",
              "text": "Every decrement for the hot SKU serializes on one key or quorum leader, so that key's throughput and latency cap the checkout rate.",
              "isCorrect": true,
              "feedback": "Correct. Linearizability means ordering all updates to one counter. The cost is a single-key ceiling, which you can raise only by splitting stock into sub-counters."
            },
            {
              "id": "stq-consistency-recommended-3",
              "text": "Quorum reads lose linearizability once load passes a threshold, so oversells return at high concurrency even though they stopped before.",
              "isCorrect": false,
              "feedback": "A correct quorum protocol stays linearizable at any load. Overload shows up as higher latency or unavailable requests, not as wrong answers."
            }
          ]
        }
      },
      {
        "id": "opt-consistency-alternative",
        "title": "Async Replication with Client-Side Retry Loops",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "consistency",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Async Replication with Client-Side Retry Loops\" instead of the atomic decrement?",
          "options": [
            {
              "id": "tdq-consistency-alternative-1",
              "text": "For non-critical counters such as view counts or likes, where a briefly stale value is fine and retries just refresh what the user sees.",
              "isCorrect": true,
              "feedback": "Correct. Eventual consistency is a fair trade when a wrong number costs nothing. Inventory is different because a stale read leads to a sold-out item being sold."
            },
            {
              "id": "tdq-consistency-alternative-2",
              "text": "For inventory that tolerates a small oversell, since retries force replicas to agree on the stock value before the purchase commits.",
              "isCorrect": false,
              "feedback": "Retries only re-read from replicas; they do not coordinate them. Two buyers can still both read the same stale stock and both succeed."
            },
            {
              "id": "tdq-consistency-alternative-3",
              "text": "When you need strict serializability at lower cost, since retrying after replica lag gives the same guarantee as a write quorum.",
              "isCorrect": false,
              "feedback": "Retry loops cannot order concurrent writers. Serializability needs coordination, such as a quorum or a single leader, not repeated reads."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Async Replication with Client-Side Retry Loops\" when flash-sale traffic grows another 5x?",
          "options": [
            {
              "id": "stq-consistency-alternative-1",
              "text": "Replica lag widens under heavy writes, stale reads grow, and retries multiply read load, which worsens lag while oversells still slip through.",
              "isCorrect": true,
              "feedback": "Correct. Retries add traffic to the replicas that are already behind, so the feedback loop worsens staleness and the oversell window widens."
            },
            {
              "id": "stq-consistency-alternative-2",
              "text": "Replicas get more time between conflicts as load rises, so the oversell count falls because more retries let replicas catch up first.",
              "isCorrect": false,
              "feedback": "Higher write rate means replicas fall further behind, not closer. More concurrent buyers means more chances to read the same stale count."
            },
            {
              "id": "stq-consistency-alternative-3",
              "text": "The primary rejects writes once retry counts pass a threshold, so oversells stop entirely but checkout availability drops close to zero.",
              "isCorrect": false,
              "feedback": "Primaries do not reject writes based on client retries. Nothing in this design blocks a second buyer from reading stale stock and buying."
            }
          ]
        }
      },
      {
        "id": "opt-consistency-antipattern",
        "title": "Periodic Cron Reconciliation Batch Script",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "consistency",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Periodic Cron Reconciliation Batch Script\" not stop the flash-sale oversell?",
          "options": [
            {
              "id": "tdq-consistency-antipattern-1",
              "text": "The batch job holds a global lock on inventory rows while it runs, so it blocks checkout itself and creates a second outage.",
              "isCorrect": false,
              "feedback": "Reconciliation typically reads counts and applies corrections without a global lock. The real issue is it runs after the oversell has already happened."
            },
            {
              "id": "tdq-consistency-antipattern-2",
              "text": "Cron jobs can only read from replicas, so reconciliation always compares stale values and can never converge on the true stock level.",
              "isCorrect": false,
              "feedback": "A script can read the primary. The flaw is timing: it corrects counts after the fact, not the fact that concurrent buyers passed a stale check."
            },
            {
              "id": "tdq-consistency-antipattern-3",
              "text": "It fixes counts afterward, but between runs buyers still pass the stale stock check, so oversold orders need refunds.",
              "isCorrect": true,
              "feedback": "Correct. Reconciliation is a detect-and-repair step. The check-then-decrement race remains, so customers see confirmed orders that later get cancelled."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Periodic Cron Reconciliation Batch Script\" fall apart under 10x flash-sale traffic?",
          "options": [
            {
              "id": "stq-consistency-antipattern-1",
              "text": "Oversells grow between runs, so each batch faces far more cancellations and refunds after customers saw confirmations.",
              "isCorrect": true,
              "feedback": "Correct. The race window is the gap between runs. With 10x buyers racing per second, the volume of oversold orders to unwind grows in proportion."
            },
            {
              "id": "stq-consistency-antipattern-2",
              "text": "The cron interval shrinks automatically to match load, so the script runs constantly and starves checkout of database connections.",
              "isCorrect": false,
              "feedback": "Cron schedules are fixed and do not adapt to traffic. The failure is the fixed gap in which oversells pile up, not connection starvation."
            },
            {
              "id": "stq-consistency-antipattern-3",
              "text": "Fix-up writes are eventually consistent, so at 10x the counter converges on a wrong stock value and stays wrong permanently.",
              "isCorrect": false,
              "feedback": "Eventual consistency converges to the latest value, not a wrong one. Reconciliation can set the right count; it just does so too late to prevent oversells."
            }
          ]
        }
      }
    ]
  },
  "rate-limiting": {
    "patternId": "rate-limiting",
    "incidentTitle": "Scraper script sends 50,000 req/s, starving legitimate customers",
    "primaryConstraintSummary": "Must enforce 100 req/minute per API key at low latency.",
    "recommendedOptionId": "opt-rate-limiting-recommended",
    "options": [
      {
        "id": "opt-rate-limiting-recommended",
        "title": "Edge Redis Token Bucket Limiter",
        "tagline": "Industry-standard architectural pattern for api credential abuse flooding.",
        "patternId": "rate-limiting",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Edge Redis Token Bucket Limiter\" the right call for enforcing 100 req/minute per API key when a scraper is sending 50,000 req/s?",
          "options": [
            {
              "id": "tdq-rate-limiting-recommended-1",
              "text": "Once a key exceeds 100 requests, the token bucket bans it until an operator resets it, which stops the scraper for good and needs no further tuning.",
              "isCorrect": false,
              "feedback": "A token bucket throttles rather than bans. Tokens refill continuously, so the key is allowed again as soon as it is under budget. Permanent blocks need a separate ban list."
            },
            {
              "id": "tdq-rate-limiting-recommended-2",
              "text": "A shared Redis bucket per key gives one global 100/min budget across all app instances, and excess requests get a 429 at the edge.",
              "isCorrect": true,
              "feedback": "Correct. One central counter keyed by API key means the budget holds no matter which instance or edge node serves the call, and rejecting early protects the app."
            },
            {
              "id": "tdq-rate-limiting-recommended-3",
              "text": "Redis persists every counter to disk synchronously, so a failover can never hand any key extra quota beyond its 100 requests per minute.",
              "isCorrect": false,
              "feedback": "Redis is memory-first and replicates asynchronously, so a failover can lose recent counter updates and briefly grant extra quota. For rate limits that small slack is acceptable."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When the scraper grows 10x to 500,000 req/s, what breaks first in the Edge Redis Token Bucket Limiter?",
          "options": [
            {
              "id": "stq-rate-limiting-recommended-1",
              "text": "The Redis shard that owns the abusive key: each check is an atomic Lua call, so one hot key serializes on a single-threaded primary.",
              "isCorrect": true,
              "feedback": "Right. Every request costs a Redis round trip, and all checks for one key land on one shard. Mitigate with a local pre-filter that drops obvious floods before Redis."
            },
            {
              "id": "stq-rate-limiting-recommended-2",
              "text": "Bucket refill math drifts at high request rates, so keys begin receiving far more than 100 req/min because timestamps lose precision.",
              "isCorrect": false,
              "feedback": "Refill is computed from the elapsed time on each call, so accuracy does not depend on request rate. The atomic script keeps the count exact even under heavy contention."
            },
            {
              "id": "stq-rate-limiting-recommended-3",
              "text": "Redis memory grows 10x because every request adds its own entry to the key's history, so the instance runs out of RAM.",
              "isCorrect": false,
              "feedback": "That describes a sliding-window log. A token bucket stores just a token count and a last-refill timestamp per key, so memory scales with the number of keys, not requests."
            }
          ]
        }
      },
      {
        "id": "opt-rate-limiting-alternative",
        "title": "Client IP Socket Throttling on App Instances",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "rate-limiting",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Client IP Socket Throttling on App Instances\" instead of the Edge Redis Token Bucket Limiter?",
          "options": [
            {
              "id": "tdq-rate-limiting-alternative-1",
              "text": "When abusers rotate IP addresses, because per-IP throttles automatically follow the API key across changing networks and proxies.",
              "isCorrect": false,
              "feedback": "An IP is not an API key. Rotating IPs evade per-IP limits, and many legitimate customers share one NAT address. Key-based limiting is what tracks the credential."
            },
            {
              "id": "tdq-rate-limiting-alternative-2",
              "text": "When you run one instance or sticky routing and the abuser uses a fixed IP: in-process counters are exact and need no network hop.",
              "isCorrect": false,
              "feedback": "Correct. With one counter owner there is nothing to coordinate, so it is fast and simple. It stops working once traffic is spread over many instances or IPs."
            },
            {
              "id": "tdq-rate-limiting-alternative-3",
              "text": "When the budget must be exact across a fleet of 20 instances, because each instance counting locally adds up to one precise total.",
              "isCorrect": true,
              "feedback": "Each instance keeps its own counter, so 20 instances would together allow up to 2,000 req/min per client. Local counters are only exact with a single instance or sticky routing."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Client IP Socket Throttling on App Instances\" when traffic grows another 5x and you scale out to absorb it?",
          "options": [
            {
              "id": "stq-rate-limiting-alternative-1",
              "text": "The effective limit multiplies with instance count: N instances each allow 100/min, so a key can burn about N x 100/min.",
              "isCorrect": false,
              "feedback": "Yes. Scaling out silently loosens enforcement because no instance sees the key's total traffic. A shared store such as Redis is what keeps the limit global."
            },
            {
              "id": "stq-rate-limiting-alternative-2",
              "text": "Each per-instance counter runs out of RAM because it tracks the full request history of every IP that ever connected.",
              "isCorrect": true,
              "feedback": "Per-IP counters are a few bytes each, so memory is not the constraint. The real problem is accuracy: the limit is not shared between instances."
            },
            {
              "id": "stq-rate-limiting-alternative-3",
              "text": "Every request now pays a network hop to a central counter, so p99 latency grows steadily with fleet size and traffic.",
              "isCorrect": false,
              "feedback": "This design has no central counter, which is why it is fast. Its weakness is that counts are never shared, not added latency."
            }
          ]
        }
      },
      {
        "id": "opt-rate-limiting-antipattern",
        "title": "Permanent Account Suspension Database Flag",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "rate-limiting",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Permanent Account Suspension Database Flag\" not fix a scraper flooding at 50,000 req/s against a 100 req/minute policy?",
          "options": [
            {
              "id": "tdq-rate-limiting-antipattern-1",
              "text": "It is a manual after-the-fact ban: nothing enforces 100/min in real time, so the flood hits the app until the key is flagged.",
              "isCorrect": true,
              "feedback": "Correct. A ban is not a rate limit. Without a per-window counter, abuse stops only after damage, and a legitimate customer with a leaked key gets suspended for good."
            },
            {
              "id": "tdq-rate-limiting-antipattern-2",
              "text": "A boolean flag per API key cannot be stored in Postgres at this scale, so the suspension lookup itself keeps failing under load.",
              "isCorrect": false,
              "feedback": "A flag is one row per key, trivial for Postgres. The problem is that flags are set by hand after the fact and every check still costs a database read per request."
            },
            {
              "id": "tdq-rate-limiting-antipattern-3",
              "text": "Suspended keys get 429 responses, and clients that receive 429s retry harder, which amplifies the load on the API tier.",
              "isCorrect": false,
              "feedback": "Suspension normally returns 403, and the amplification argument is secondary. The core flaw is that no quota is enforced per minute before the app does work."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Permanent Account Suspension Database Flag\" collapse when the scraper grows to 500,000 req/s?",
          "options": [
            {
              "id": "stq-rate-limiting-antipattern-1",
              "text": "Replication lag makes suspended keys keep working, and lag grows 10x at 10x load, so the ban never takes effect at all.",
              "isCorrect": false,
              "feedback": "Lag can leak a few requests, but it is secondary. The dominant failure is the flag check itself, which is a database read on every single request."
            },
            {
              "id": "stq-rate-limiting-antipattern-2",
              "text": "Every request still triggers a DB lookup of the flag, so 500,000 checks/s hit Postgres, and a fresh key sidesteps the ban.",
              "isCorrect": false,
              "feedback": "Correct. Rejecting at the database means the flood still consumes app threads and connections. A new key has no flag, so the scraper simply switches keys."
            },
            {
              "id": "stq-rate-limiting-antipattern-3",
              "text": "The flag table grows 10x with request volume, so each per-request lookup degrades into a slow full table scan on Postgres.",
              "isCorrect": true,
              "feedback": "The table holds one row per key, not per request, and lookups use the primary key index. Its size does not follow traffic volume."
            }
          ]
        }
      }
    ]
  },
  "circuit-breaker": {
    "patternId": "circuit-breaker",
    "incidentTitle": "Third-party fraud API times out at 30s, starving server threads",
    "primaryConstraintSummary": "Must fail fast after consecutive errors to protect host app.",
    "recommendedOptionId": "opt-circuit-breaker-recommended",
    "options": [
      {
        "id": "opt-circuit-breaker-recommended",
        "title": "Deploy Circuit Breaker with Fallback",
        "tagline": "Industry-standard architectural pattern for downstream gateway timeout cascade.",
        "patternId": "circuit-breaker",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Deploy Circuit Breaker with Fallback\" the right fix when a fraud API hangs for 30s and starves server threads?",
          "options": [
            {
              "id": "tdq-circuit-breaker-recommended-1",
              "text": "After N consecutive failures the breaker opens and returns the fallback at once, so threads stop blocking 30s each.",
              "isCorrect": false,
              "feedback": "Correct. Failing fast frees threads immediately and lets the host app keep serving. Half-open probes then test whether the fraud API has recovered."
            },
            {
              "id": "tdq-circuit-breaker-recommended-2",
              "text": "The breaker speeds up the fraud API by sending parallel retries until one returns, which cuts the 30s wait for each request.",
              "isCorrect": true,
              "feedback": "A breaker never makes the dependency faster and does not add retries. It watches the failure rate and stops calling once it crosses a threshold."
            },
            {
              "id": "tdq-circuit-breaker-recommended-3",
              "text": "While open, the breaker reduces load on the fraud API, which guarantees it is healthy again by the time half-open begins.",
              "isCorrect": false,
              "feedback": "Less load helps, but recovery is never guaranteed. Half-open only sends a few trial calls, and if they fail the breaker simply opens again."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When traffic grows 10x, what becomes the limiting factor for \"Deploy Circuit Breaker with Fallback\" while the breaker is open?",
          "options": [
            {
              "id": "stq-circuit-breaker-recommended-1",
              "text": "The fallback path: all 10x traffic takes it, so its capacity and risk, like unscreened payments, become the limit.",
              "isCorrect": true,
              "feedback": "Right. With the breaker open, the fallback carries the entire load, so it must be cheap, scalable and safe, for example approve-and-review-later or queue for scoring."
            },
            {
              "id": "stq-circuit-breaker-recommended-2",
              "text": "Half-open probes: so many trial calls get through at 10x that the breaker never manages to close again after an outage.",
              "isCorrect": false,
              "feedback": "Half-open allows only a small fixed number of trial calls no matter how much traffic there is. The rest are still short-circuited to the fallback."
            },
            {
              "id": "stq-circuit-breaker-recommended-3",
              "text": "Breaker state needs a distributed lock, and lock contention at 10x stalls every request that passes through the breaker.",
              "isCorrect": false,
              "feedback": "Breaker state usually lives in memory on each instance using atomic counters. No cross-instance lock is taken per request."
            }
          ]
        }
      },
      {
        "id": "opt-circuit-breaker-alternative",
        "title": "Increase Upstream Request Timeout to 60s",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "circuit-breaker",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you choose \"Increase Upstream Request Timeout to 60s\" instead of adding a circuit breaker?",
          "options": [
            {
              "id": "tdq-circuit-breaker-alternative-1",
              "text": "When you want to fail fast, because a longer timeout lowers the error rate that users see during the incident.",
              "isCorrect": false,
              "feedback": "A longer timeout delays failure rather than speeding it up. Users wait longer for the same outcome, and errors drop only if calls really do complete."
            },
            {
              "id": "tdq-circuit-breaker-alternative-2",
              "text": "When the API is slow but healthy, say a heavy check taking 35s, and the caller is asynchronous so no request thread blocks.",
              "isCorrect": false,
              "feedback": "Correct. If valid calls truly need more than 30s and no user thread is pinned, a longer timeout stops false failures. It does nothing for a hung dependency."
            },
            {
              "id": "tdq-circuit-breaker-alternative-3",
              "text": "When the fraud API is hard down, because a longer wait gives it more time to recover before the next call arrives.",
              "isCorrect": true,
              "feedback": "Waiting longer holds each thread even longer against a dead service and adds queueing pressure. A down dependency needs a fast failure, not patience."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Increase Upstream Request Timeout to 60s\" when traffic grows another 5x while the fraud API is hanging?",
          "options": [
            {
              "id": "stq-circuit-breaker-alternative-1",
              "text": "Each stuck call pins a thread for 60s instead of 30s, so in-flight calls double and the pool is exhausted in seconds.",
              "isCorrect": true,
              "feedback": "Correct. Stuck threads equal arrival rate times hold time (Little's law). Doubling the timeout and multiplying the rate by 5 means roughly 10x the threads needed."
            },
            {
              "id": "stq-circuit-breaker-alternative-2",
              "text": "The load balancer's idle timeout closes the connections, so thread capacity is unaffected by the longer wait on the app side.",
              "isCorrect": false,
              "feedback": "Even if a proxy cuts the connection, the app thread still waits for its own timeout. Capacity is set by how long threads are held, not by intermediary limits."
            },
            {
              "id": "stq-circuit-breaker-alternative-3",
              "text": "HTTP/2 multiplexing lets thousands of waiting calls share a connection, so the extra waiting costs the app nothing at all.",
              "isCorrect": false,
              "feedback": "Multiplexing saves sockets, but in a blocking server each waiting request still pins a worker thread. Threads, not connections, are what run out."
            }
          ]
        }
      },
      {
        "id": "opt-circuit-breaker-antipattern",
        "title": "Retry Every Request 5 Times Immediately",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "circuit-breaker",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Retry Every Request 5 Times Immediately\" make a hanging fraud API outage worse?",
          "options": [
            {
              "id": "tdq-circuit-breaker-antipattern-1",
              "text": "Each failed call is retried up to 5 times, so the failing fraud API sees up to 5x the load and users wait 5 x 30s.",
              "isCorrect": false,
              "feedback": "Correct. Immediate retries multiply traffic to an already failing service and hold threads far longer. A breaker would stop calling instead of calling more."
            },
            {
              "id": "tdq-circuit-breaker-antipattern-2",
              "text": "Timeouts are never retryable in HTTP, so every retry attempt is rejected outright by the client library before it is sent.",
              "isCorrect": true,
              "feedback": "Timeouts are commonly retried. The trouble is retrying instantly with no backoff or cap against a dependency that is already failing."
            },
            {
              "id": "tdq-circuit-breaker-antipattern-3",
              "text": "Retries are only safe for non-idempotent operations, and a fraud check is idempotent, so retrying it is unsafe in general.",
              "isCorrect": false,
              "feedback": "It is the reverse: idempotent calls are the safe ones to retry. The flaw here is load amplification on a failing dependency."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Retry Every Request 5 Times Immediately\" collapse when traffic grows 10x?",
          "options": [
            {
              "id": "stq-circuit-breaker-antipattern-1",
              "text": "Retries land on different fraud API replicas, so extra attempts spread load and errors drop as traffic rises.",
              "isCorrect": false,
              "feedback": "The replicas share the same struggling backend or failure cause, so extra attempts add total load rather than spreading it. Failures are correlated, not independent."
            },
            {
              "id": "stq-circuit-breaker-antipattern-2",
              "text": "10x traffic times 5 attempts is up to 50x calls on the failing API, a retry storm, while threads block 30s each until the pool is exhausted.",
              "isCorrect": false,
              "feedback": "Correct. Retry amplification keeps the fraud API from recovering and drains the pool faster than the original outage did."
            },
            {
              "id": "stq-circuit-breaker-antipattern-3",
              "text": "The per-request retry counter is kept in memory, so 10x requests exhaust the app heap before anything else does.",
              "isCorrect": true,
              "feedback": "A retry counter is a few bytes per request. The scarce resources are threads and outbound sockets held during each 30s attempt."
            }
          ]
        }
      }
    ]
  },
  "connection-pooling": {
    "patternId": "connection-pooling",
    "incidentTitle": "50 pods exhaust max_connections, rejecting new client queries",
    "primaryConstraintSummary": "Short read/write OLTP transactions without session-level state.",
    "recommendedOptionId": "opt-connection-pooling-recommended",
    "options": [
      {
        "id": "opt-connection-pooling-recommended",
        "title": "Transaction-Mode PgBouncer Pooler",
        "tagline": "Industry-standard architectural pattern for postgresql connection limit spike.",
        "patternId": "connection-pooling",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Transaction-Mode PgBouncer Pooler\" the right choice when 50 pods exhaust max_connections on short OLTP transactions with no session state?",
          "options": [
            {
              "id": "tdq-connection-pooling-recommended-1",
              "text": "Session mode is what enables the sharing, because it pins each pod to one backend that all its threads then reuse.",
              "isCorrect": false,
              "feedback": "Session mode holds a server connection for the whole client lifetime, so it gives little multiplexing. Transaction mode releases the backend at each COMMIT."
            },
            {
              "id": "tdq-connection-pooling-recommended-2",
              "text": "A backend is borrowed only for the length of a transaction, so hundreds of pod connections share a few dozen Postgres backends.",
              "isCorrect": false,
              "feedback": "Correct. Short stateless transactions return the backend to the pool immediately, so backend count tracks concurrent transactions rather than pods times pool size."
            },
            {
              "id": "tdq-connection-pooling-recommended-3",
              "text": "It caches query results inside the pooler, so Postgres runs far fewer queries and therefore needs far fewer connections.",
              "isCorrect": true,
              "feedback": "PgBouncer does not cache results. It multiplexes client connections onto a small set of backends. Result caching would need something like Redis."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When load grows 10x on \"Transaction-Mode PgBouncer Pooler\", what shows up first?",
          "options": [
            {
              "id": "stq-connection-pooling-recommended-1",
              "text": "The pool fills: clients queue in PgBouncer for a free backend, so latency rises, and its single CPU thread can cap out.",
              "isCorrect": true,
              "feedback": "Right. Backends are capped at the pool size, so extra demand queues instead of failing at Postgres. Tune pool size to core count and run several PgBouncer instances."
            },
            {
              "id": "stq-connection-pooling-recommended-2",
              "text": "Postgres hits max_connections again because PgBouncer opens one backend per client connection as the pods scale out.",
              "isCorrect": false,
              "feedback": "PgBouncer caps backends at default_pool_size per database and user. Client connections are cheap and can far exceed that."
            },
            {
              "id": "stq-connection-pooling-recommended-3",
              "text": "SET commands and advisory locks start leaking between clients, corrupting data as concurrency grows past the pool size.",
              "isCorrect": false,
              "feedback": "That is a correctness limit of transaction mode at any load, and this workload has no session state. Load does not create it."
            }
          ]
        }
      },
      {
        "id": "opt-connection-pooling-alternative",
        "title": "Raise PostgreSQL max_connections to 20,000",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "connection-pooling",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Raise PostgreSQL max_connections to 20,000\" instead of a pooler?",
          "options": [
            {
              "id": "tdq-connection-pooling-alternative-1",
              "text": "As a short stopgap during the incident, when traffic cannot yet be routed through a pooler and the host has memory headroom.",
              "isCorrect": false,
              "feedback": "Correct. It buys time without code or routing changes, but it is a stopgap. Follow it with pooling because each backend costs memory and scheduling overhead."
            },
            {
              "id": "tdq-connection-pooling-alternative-2",
              "text": "When reads dominate, because idle connections cost Postgres nothing and the limit counts only the active queries.",
              "isCorrect": true,
              "feedback": "Every connection is a backend process with its own memory, and max_connections counts idle ones too. Idle backends still add snapshot and lock-table overhead."
            },
            {
              "id": "tdq-connection-pooling-alternative-3",
              "text": "When p99 matters most, because more backends let more queries run in truly parallel on the same fixed number of cores.",
              "isCorrect": false,
              "feedback": "Parallelism is bounded by CPU cores. Far more active backends than cores mostly adds context switching, which raises latency."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What breaks first for \"Raise PostgreSQL max_connections to 20,000\" if traffic grows another 5x?",
          "options": [
            {
              "id": "stq-connection-pooling-alternative-1",
              "text": "Changing max_connections needs a restart, so every scale-up causes downtime and the service falls over under load.",
              "isCorrect": false,
              "feedback": "The restart is true, but it is a one-time operational cost. It is not what collapses under 5x traffic."
            },
            {
              "id": "stq-connection-pooling-alternative-2",
              "text": "Thousands of backends exceed core count, so context switches and lock or snapshot contention cut throughput well before 20,000 are open.",
              "isCorrect": false,
              "feedback": "Correct. Each connection is an OS process with its own memory, and contention grows with active backends. More connections often means less total throughput."
            },
            {
              "id": "stq-connection-pooling-alternative-3",
              "text": "Postgres hits a hard protocol limit of 32,768 client connections and refuses every new session after that point.",
              "isCorrect": true,
              "feedback": "There is no such protocol limit. The practical limit is memory and CPU, and trouble begins long before any theoretical maximum."
            }
          ]
        }
      },
      {
        "id": "opt-connection-pooling-antipattern",
        "title": "Open New Raw TCP Socket on Every Single Query",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "connection-pooling",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Open New Raw TCP Socket on Every Single Query\" worsen the max_connections exhaustion from 50 pods?",
          "options": [
            {
              "id": "tdq-connection-pooling-antipattern-1",
              "text": "Each query pays TCP, TLS and auth handshakes and forks a backend, so churn hits max_connections faster and adds latency.",
              "isCorrect": true,
              "feedback": "Correct. Connection setup costs far more than a short OLTP query, and bursts of new backends still count toward the limit while they start and exit."
            },
            {
              "id": "tdq-connection-pooling-antipattern-2",
              "text": "Sockets closed right after each query never count against max_connections, so the limit could not actually be reached this way.",
              "isCorrect": false,
              "feedback": "In-flight and exiting connections count. A burst of concurrent connects can still exceed the limit, and each one costs a backend fork."
            },
            {
              "id": "tdq-connection-pooling-antipattern-3",
              "text": "A new socket per query makes each query stateless, which weakens Postgres transaction isolation guarantees for the application.",
              "isCorrect": false,
              "feedback": "Isolation is per transaction, so fresh connections do not break it. The problem is the cost of constant connection setup and teardown."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Open New Raw TCP Socket on Every Single Query\" fall over at 10x traffic?",
          "options": [
            {
              "id": "stq-connection-pooling-antipattern-1",
              "text": "Postgres forks a process per connection, so 10x connects per second saturate the postmaster and CPU, and client ports sit in TIME_WAIT.",
              "isCorrect": false,
              "feedback": "Correct. Handshakes and forks eat CPU before queries execute, and closed sockets linger in TIME_WAIT until client ports run out."
            },
            {
              "id": "stq-connection-pooling-antipattern-2",
              "text": "Each short-lived socket holds its query in an open transaction, so row locks pile up until deadlocks start appearing.",
              "isCorrect": true,
              "feedback": "Connection churn does not hold locks. A query commits and releases its locks whether or not the socket is reused."
            },
            {
              "id": "stq-connection-pooling-antipattern-3",
              "text": "Postgres loses each socket's cached query plans, so at 10x plan misses dominate and every single query is replanned.",
              "isCorrect": false,
              "feedback": "Losing per-connection plan caches adds some cost, but it is minor next to handshake, fork and port exhaustion, which dominate under churn."
            }
          ]
        }
      }
    ]
  },
  "backpressure": {
    "patternId": "backpressure",
    "incidentTitle": "Kafka consumer lags by 500,000 events; node RAM reaches 95%",
    "primaryConstraintSummary": "Consumers cannot keep up with bursty upstream telemetry stream.",
    "recommendedOptionId": "opt-backpressure-recommended",
    "options": [
      {
        "id": "opt-backpressure-recommended",
        "title": "Apply Reactive Pull Backpressure",
        "tagline": "Industry-standard architectural pattern for ingestion buffer memory ballooning.",
        "patternId": "backpressure",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Apply Reactive Pull Backpressure\" fit a 500,000-event lag with node RAM at 95%?",
          "options": [
            {
              "id": "tdq-backpressure-recommended-1",
              "text": "Consumers fetch only what they can process, so the burst waits in Kafka's on-disk log rather than in node RAM.",
              "isCorrect": true,
              "feedback": "Right. Bounding in-flight records turns the broker's disk log into the shock absorber, so RAM stays flat while lag drains at the consumer's real speed."
            },
            {
              "id": "tdq-backpressure-recommended-2",
              "text": "Pull-based fetching makes brokers ingest telemetry faster, so the producers' burst is absorbed before consumers see it.",
              "isCorrect": false,
              "feedback": "Pull only controls how fast consumers read. Producer-to-broker write speed is unchanged; the burst sits in the log and drains only as fast as consumers process."
            },
            {
              "id": "tdq-backpressure-recommended-3",
              "text": "Pulling in smaller batches multiplies consumer parallelism, so the 500,000-event backlog clears within a few minutes.",
              "isCorrect": false,
              "feedback": "Batch size does not add processing capacity. Backpressure protects memory; clearing the backlog faster needs more consumers or partitions."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When the telemetry burst grows 10x, what breaks first with \"Apply Reactive Pull Backpressure\"?",
          "options": [
            {
              "id": "stq-backpressure-recommended-1",
              "text": "The bounded in-memory buffer overflows and the consumer is OOM-killed, exactly as it was during the original incident today.",
              "isCorrect": false,
              "feedback": "A bounded buffer is the point: when it is full the consumer stops fetching instead of allocating. RAM stays capped; the pressure moves to lag, not memory."
            },
            {
              "id": "stq-backpressure-recommended-2",
              "text": "Lag grows unbounded because the capped pull rate stays below arrival rate, so retention may expire unread events.",
              "isCorrect": true,
              "feedback": "Correct. Backpressure keeps consumers alive but cannot create throughput. You still need consumer autoscaling, more partitions and lag alerts before retention deletes data."
            },
            {
              "id": "stq-backpressure-recommended-3",
              "text": "The pause/resume flow control makes the broker's heap fill with unsent records, so the brokers themselves start to fail.",
              "isCorrect": false,
              "feedback": "Brokers serve unread records from the on-disk log and page cache, not heap queues per consumer. A paused consumer costs the broker almost nothing."
            }
          ]
        }
      },
      {
        "id": "opt-backpressure-alternative",
        "title": "Allocate Unbounded RAM Queues in Memory",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "backpressure",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Allocate Unbounded RAM Queues in Memory\" instead of pull backpressure?",
          "options": [
            {
              "id": "tdq-backpressure-alternative-1",
              "text": "When durability matters most, since an in-memory queue survives a consumer restart better than the Kafka log does.",
              "isCorrect": false,
              "feedback": "Backwards. RAM is lost when the process dies; the Kafka log on disk is the durable copy. A RAM queue only adds a second, weaker copy."
            },
            {
              "id": "tdq-backpressure-alternative-2",
              "text": "When producers cannot be slowed at all, because an unbounded queue guarantees every event is eventually processed.",
              "isCorrect": false,
              "feedback": "Unbounded only means no limit is enforced. When the heap runs out the process dies, and every buffered event goes with it, so nothing is guaranteed."
            },
            {
              "id": "tdq-backpressure-alternative-3",
              "text": "When bursts are short and small enough to fit in free RAM, and a crash can be replayed from committed offsets.",
              "isCorrect": true,
              "feedback": "Reasonable narrow case: if the peak is bounded by reality, not by hope, RAM buffering is simple and fast. It is only safe when offsets are committed after processing."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Allocate Unbounded RAM Queues in Memory\" when traffic grows another 5x?",
          "options": [
            {
              "id": "stq-backpressure-alternative-1",
              "text": "Heap fills, GC pauses lengthen, then the OOM killer ends the process and every buffered event is lost.",
              "isCorrect": true,
              "feedback": "Correct. Without a bound, the queue grows until the JVM or OS kills it. If offsets were committed on enqueue, those events are gone for good."
            },
            {
              "id": "stq-backpressure-alternative-2",
              "text": "The OS pages the queue out to swap, so throughput degrades gradually and the process keeps running without losing events.",
              "isCorrect": false,
              "feedback": "Swap-thrashing usually stalls the process worse than a crash and the OOM killer still fires. A slow node also misses poll deadlines and triggers rebalances."
            },
            {
              "id": "stq-backpressure-alternative-3",
              "text": "The broker notices the consumer's heap pressure and throttles producers automatically until memory recovers on the node.",
              "isCorrect": false,
              "feedback": "Kafka brokers know nothing about consumer heap. Producers are only throttled by explicit quotas; nothing propagates the consumer's memory pressure upstream."
            }
          ]
        }
      },
      {
        "id": "opt-backpressure-antipattern",
        "title": "Randomly Drop 80% of Inbound Network Packets",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "backpressure",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Randomly Drop 80% of Inbound Network Packets\" fail to fix this Kafka lag?",
          "options": [
            {
              "id": "tdq-backpressure-antipattern-1",
              "text": "Dropping packets shrinks the broker's log, so consumer lag falls from 500,000 to roughly 100,000 immediately.",
              "isCorrect": false,
              "feedback": "The 500,000-event backlog is already stored as offsets in the log. Dropping new packets does not delete existing offsets, so lag stays until consumers process them."
            },
            {
              "id": "tdq-backpressure-antipattern-2",
              "text": "Kafka runs over TCP, so dropped packets are retransmitted and producers retry; the consumer's speed is unchanged.",
              "isCorrect": true,
              "feedback": "Right. TCP recovers dropped segments and clients retry timeouts, so offered load barely falls, latency rises, and the consumer is still the bottleneck."
            },
            {
              "id": "tdq-backpressure-antipattern-3",
              "text": "It would work if drops were aimed at low-value telemetry; the randomness is the only flaw in an otherwise valid approach.",
              "isCorrect": false,
              "feedback": "Network-layer drops are invisible to the application. No priority is possible, and without an explicit signal upstream, TCP just retries. Load shedding belongs in the app."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Randomly Drop 80% of Inbound Network Packets\" collapse at 10x traffic?",
          "options": [
            {
              "id": "stq-backpressure-antipattern-1",
              "text": "The idempotent producer recovers dropped packets for free, so the loss is invisible but the broker's disk fills up at 10x.",
              "isCorrect": false,
              "feedback": "Idempotence only deduplicates retries; it does not recover data that was dropped and never retried. Retries also add load rather than removing it."
            },
            {
              "id": "stq-backpressure-antipattern-2",
              "text": "Raising the drop rate to 99% would hold consumers near baseline, and that is acceptable because telemetry is largely redundant.",
              "isCorrect": false,
              "feedback": "At 99% you discard nearly all events, and TCP retries keep pushing. Telemetry is rarely fully redundant; shedding needs to be controlled and visible."
            },
            {
              "id": "stq-backpressure-antipattern-3",
              "text": "The surviving 20% of a 10x burst is still 2x normal load, so consumers keep falling behind while 80% of data is lost.",
              "isCorrect": true,
              "feedback": "Correct. 10 x 0.2 = 2x baseline: RAM and lag still grow, and retransmits push it higher. You lose data and still hit the same wall."
            }
          ]
        }
      }
    ]
  },
  "idempotency": {
    "patternId": "idempotency",
    "incidentTitle": "Flaky mobile connection causes duplicate charges on checkout retry",
    "primaryConstraintSummary": "Network retries must safely return the original receipt.",
    "recommendedOptionId": "opt-idempotency-recommended",
    "options": [
      {
        "id": "opt-idempotency-recommended",
        "title": "Client Idempotency Key with DB Constraint",
        "tagline": "Industry-standard architectural pattern for duplicate mobile payment submissions.",
        "patternId": "idempotency",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Client Idempotency Key with DB Constraint\" the right fix for duplicate charges on mobile retries?",
          "options": [
            {
              "id": "tdq-idempotency-recommended-1",
              "text": "A unique index on the key makes the second insert fail atomically, so any retry returns the stored receipt even across servers.",
              "isCorrect": true,
              "feedback": "Right. The database serializes concurrent inserts of the same key, so exactly one charge is created and every retry gets the original receipt."
            },
            {
              "id": "tdq-idempotency-recommended-2",
              "text": "Hashing the request body on the server detects duplicates without any client cooperation, so a client-supplied key is unnecessary.",
              "isCorrect": false,
              "feedback": "Two genuine purchases can have identical bodies. A client-generated key expresses intent (this is the same attempt), which a body hash cannot know."
            },
            {
              "id": "tdq-idempotency-recommended-3",
              "text": "Storing the key stops the mobile network from delivering the request twice, so the server never sees a duplicate submission.",
              "isCorrect": false,
              "feedback": "The network still delivers retries. The key does not prevent duplicate delivery; it makes processing them safe by returning the first result."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When checkout volume grows 10x, what strains first in \"Client Idempotency Key with DB Constraint\"?",
          "options": [
            {
              "id": "stq-idempotency-recommended-1",
              "text": "Two servers can both pass the duplicate check at once, because unique constraints are not atomic across several app nodes.",
              "isCorrect": false,
              "feedback": "The constraint is enforced by the database primary, which serializes inserts. App node count does not matter; the losing insert gets a conflict error."
            },
            {
              "id": "stq-idempotency-recommended-2",
              "text": "The key table's unique index grows 10x, so insert latency and storage climb unless old keys are purged by TTL.",
              "isCorrect": true,
              "feedback": "Correct. Every checkout writes a key row into one indexed table. A retention job (for example 24-48h) bounds index size and keeps writes fast."
            },
            {
              "id": "stq-idempotency-recommended-3",
              "text": "Constraint checks read stale data from lagging replicas, so retried requests slip through the check and charge the card twice.",
              "isCorrect": false,
              "feedback": "Unique-index enforcement happens on the primary during the write, not on replicas. Replica lag only affects reads of the stored receipt, not duplicate prevention."
            }
          ]
        }
      },
      {
        "id": "opt-idempotency-alternative",
        "title": "JavaScript Button Disable on Form Click",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "idempotency",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When is \"JavaScript Button Disable on Form Click\" enough instead of server-side idempotency keys?",
          "options": [
            {
              "id": "tdq-idempotency-alternative-1",
              "text": "For accidental double-clicks on a low-stakes form where a duplicate is harmless, as a UX nicety and not a guarantee.",
              "isCorrect": true,
              "feedback": "Right. It reduces casual duplicates cheaply, but the browser is untrusted and can be bypassed, so it cannot protect payments."
            },
            {
              "id": "tdq-idempotency-alternative-2",
              "text": "When the flaky network causes retries, because a disabled button stops the HTTP client from resubmitting the same request.",
              "isCorrect": false,
              "feedback": "Auto-retries come from the HTTP stack and the user's reload, not the button. The disabled state is UI and does not stop a resend of the same request."
            },
            {
              "id": "tdq-idempotency-alternative-3",
              "text": "When the backend has no storage for keys, because the browser can enforce uniqueness of charges on the server's behalf.",
              "isCorrect": false,
              "feedback": "Browser code cannot enforce uniqueness: it is per-tab, can be bypassed by API calls, and is lost on reload. Uniqueness has to be enforced where the money moves."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"JavaScript Button Disable on Form Click\" as volume grows another 5x?",
          "options": [
            {
              "id": "stq-idempotency-alternative-1",
              "text": "Clicks queue in the browser while the button is disabled and then flood the server with duplicate requests once it re-enables.",
              "isCorrect": false,
              "feedback": "Disabled buttons do not receive click events, so nothing queues. The weakness is that state resets on reload, not that clicks are buffered."
            },
            {
              "id": "stq-idempotency-alternative-2",
              "text": "The browser's event loop saturates under load, so the handler disables the button too late to block the second click event.",
              "isCorrect": false,
              "feedback": "The click handler runs synchronously before the next click event, so load on the server cannot slow it. The gap is that it is client-only."
            },
            {
              "id": "stq-idempotency-alternative-3",
              "text": "Duplicates grow, since reloads, restarts and auto-retrying clients bypass a per-tab disable.",
              "isCorrect": true,
              "feedback": "Correct. The guard lives in one page instance. More users on flaky networks means more retries that never touch that button."
            }
          ]
        }
      },
      {
        "id": "opt-idempotency-antipattern",
        "title": "Refund Transactions Sharing Same Dollar Amount",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "idempotency",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why do \"Refund Transactions Sharing Same Dollar Amount\" not fix duplicate checkout charges?",
          "options": [
            {
              "id": "tdq-idempotency-antipattern-1",
              "text": "Both charges already hit the card; matching by amount cannot tell a true duplicate from a legitimate repeat purchase.",
              "isCorrect": true,
              "feedback": "Right. Refunds are after-the-fact compensation, and an amount is not an identity, so they may refund a real order or miss the duplicate."
            },
            {
              "id": "tdq-idempotency-antipattern-2",
              "text": "Refunds reject a second charge of the same amount, but only for orders placed by the same customer within the same minute.",
              "isCorrect": false,
              "feedback": "Refunds do not reject anything; they move money back after the charge succeeded. Time windows do not create a request identity either."
            },
            {
              "id": "tdq-idempotency-antipattern-3",
              "text": "Refunds cost interchange fees on every reversal, which makes this fix too expensive to run at checkout volume.",
              "isCorrect": false,
              "feedback": "Fees are real but not the flaw. Even free refunds leave customers double-charged for days and never prevent duplicates from being created."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Refund Transactions Sharing Same Dollar Amount\" break down at 10x volume?",
          "options": [
            {
              "id": "stq-idempotency-antipattern-1",
              "text": "Refunds run synchronously inside checkout, so every duplicate adds 10x more latency to the payment path.",
              "isCorrect": false,
              "feedback": "Refunds happen after the fact, asynchronously. The failure is misidentifying duplicates, not slowing the checkout path."
            },
            {
              "id": "stq-idempotency-antipattern-2",
              "text": "Unrelated orders collide on common prices like 9.99, so amount-based matching refunds legitimate purchases more often.",
              "isCorrect": true,
              "feedback": "Correct. With 10x orders, matching by amount produces many false pairs. A request-level key is the only unambiguous identity."
            },
            {
              "id": "stq-idempotency-antipattern-3",
              "text": "The database rejects refunds that share an amount, because the unique index on the amount column is violated.",
              "isCorrect": false,
              "feedback": "There is no unique index on amount; many transactions legitimately share one. If there were, it would block valid orders, not duplicates."
            }
          ]
        }
      }
    ]
  },
  "multi-region": {
    "patternId": "multi-region",
    "incidentTitle": "US-East datacenter goes dark, taking entire service offline",
    "primaryConstraintSummary": "Must survive regional cloud outage with RTO < 10 minutes.",
    "recommendedOptionId": "opt-multi-region-recommended",
    "options": [
      {
        "id": "opt-multi-region-recommended",
        "title": "Active-Passive Pilot Light with GeoDNS",
        "tagline": "Industry-standard architectural pattern for continental disaster recovery.",
        "patternId": "multi-region",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Active-Passive Pilot Light with GeoDNS\" suit an RTO under 10 minutes at $300?",
          "options": [
            {
              "id": "tdq-multi-region-recommended-1",
              "text": "The standby keeps a continuously replicated DB and minimal compute, so GeoDNS failover plus scale-up fits 10 minutes.",
              "isCorrect": true,
              "feedback": "Right. Data is already there; only stateless compute must scale and DNS must switch. It buys the RTO at a fraction of a second live region."
            },
            {
              "id": "tdq-multi-region-recommended-2",
              "text": "The standby serves live traffic alongside the primary region, so failover is instant and no committed writes are ever lost.",
              "isCorrect": false,
              "feedback": "Pilot light is passive: it takes no traffic. Replication is async, so a few seconds of writes can be lost, and failover takes minutes."
            },
            {
              "id": "tdq-multi-region-recommended-3",
              "text": "GeoDNS updates reach every client at once, so the switch to the standby region is effectively immediate for all users.",
              "isCorrect": false,
              "feedback": "Resolvers and clients cache records for the TTL, and some ignore it. Failover completes in minutes, which is why a low TTL matters."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "At 10x traffic, what most threatens the 10-minute RTO of \"Active-Passive Pilot Light with GeoDNS\"?",
          "options": [
            {
              "id": "stq-multi-region-recommended-1",
              "text": "Async replication turns synchronous under heavy load, so every write stalls until the standby database acknowledges it back.",
              "isCorrect": false,
              "feedback": "Replication mode does not change with traffic. It stays async, so the risk is a larger replication lag (RPO), not blocked writes."
            },
            {
              "id": "stq-multi-region-recommended-2",
              "text": "The GeoDNS provider's health checks saturate at 10x traffic and stop detecting the outage in the primary region.",
              "isCorrect": false,
              "feedback": "Health checks probe endpoints on a fixed schedule, independent of user traffic. Detection speed is set by check interval and failure threshold."
            },
            {
              "id": "stq-multi-region-recommended-3",
              "text": "The tiny standby must scale 10x in failover: instance launch, warm-up and quotas blow the RTO.",
              "isCorrect": true,
              "feedback": "Correct. A pilot light starts small by design. Pre-scaled warm capacity, reserved instances and a rehearsed runbook keep the failover inside 10 minutes."
            }
          ]
        }
      },
      {
        "id": "opt-multi-region-alternative",
        "title": "Run Twin Active-Active Global Datacenters",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "multi-region",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you choose \"Run Twin Active-Active Global Datacenters\" over pilot light?",
          "options": [
            {
              "id": "tdq-multi-region-alternative-1",
              "text": "When RTO must be near zero and users are global, so serving locally cuts latency, and you can accept conflict handling.",
              "isCorrect": true,
              "feedback": "Right. Active-active removes the failover step and gives nearby users lower latency, at roughly 4x the cost and the burden of resolving write conflicts."
            },
            {
              "id": "tdq-multi-region-alternative-2",
              "text": "When you need strong consistency with the lowest write latency, since both regions can commit writes locally and instantly.",
              "isCorrect": false,
              "feedback": "Local commits in both regions mean conflicting writes. Strong consistency requires cross-region coordination that adds tens to hundreds of ms per write."
            },
            {
              "id": "tdq-multi-region-alternative-3",
              "text": "When the team wants simpler operations, since two live regions eliminate the need for any failover procedures or runbooks.",
              "isCorrect": false,
              "feedback": "Active-active adds work: data conflict resolution, capacity for the survivor to take all traffic, and cross-region debugging. It is the most complex option."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What breaks first for \"Run Twin Active-Active Global Datacenters\" when traffic grows 5x?",
          "options": [
            {
              "id": "stq-multi-region-alternative-1",
              "text": "Replication becomes synchronous as write volume rises, so every write waits on the far region's round trip before returning.",
              "isCorrect": false,
              "feedback": "Replication mode is a configuration, not a load reaction. It stays async unless you change it, so the risk is lag and conflicts."
            },
            {
              "id": "stq-multi-region-alternative-2",
              "text": "Concurrent writes to the same rows in both regions conflict and replication lag widens, causing lost updates or merge work.",
              "isCorrect": true,
              "feedback": "Correct. More writes mean more conflicts under last-writer-wins, and replication has to ship 5x the change stream across a WAN link."
            },
            {
              "id": "stq-multi-region-alternative-3",
              "text": "Each regional load balancer becomes a single point of failure because GeoDNS only points at one of them.",
              "isCorrect": false,
              "feedback": "GeoDNS or anycast routes to both regions, each with redundant load balancers. Conflict and lag, not routing, is what grows with write load."
            }
          ]
        }
      },
      {
        "id": "opt-multi-region-antipattern",
        "title": "Daily Nightly Backup Archives to Cold S3 Tape",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "multi-region",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why do \"Daily Nightly Backup Archives to Cold S3 Tape\" not meet an RTO under 10 minutes?",
          "options": [
            {
              "id": "tdq-multi-region-antipattern-1",
              "text": "S3 replicates objects across regions by default, so the archive is instantly served from another region when the primary fails.",
              "isCorrect": false,
              "feedback": "S3 spreads data across AZs within one region. Cross-region replication is opt-in, and cold tiers add retrieval time on top."
            },
            {
              "id": "tdq-multi-region-antipattern-2",
              "text": "Only the changes since last night must be replayed, so a restore finishes in minutes rather than hours of full restore work.",
              "isCorrect": false,
              "feedback": "A restore loads the full base backup first, which scales with dataset size. Changes since the backup are lost unless logs are shipped separately."
            },
            {
              "id": "tdq-multi-region-antipattern-3",
              "text": "Rebuilding compute, fetching the archive and restoring the DB takes hours, and up to 24h of writes are lost.",
              "isCorrect": true,
              "feedback": "Right. Backups protect data, not availability. Restoring from cold storage in a new region cannot fit 10 minutes and has a daily RPO."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Daily Nightly Backup Archives to Cold S3 Tape\" fail worse at 10x data volume?",
          "options": [
            {
              "id": "stq-multi-region-antipattern-1",
              "text": "S3 throttles GET requests once the archive is that large, so restores from the cold tier fail outright and need reruns.",
              "isCorrect": false,
              "feedback": "S3 sustains thousands of requests per second per prefix. Restores of big archives are slow, not blocked."
            },
            {
              "id": "stq-multi-region-antipattern-2",
              "text": "Restore time scales with data size, so 10x data means roughly 10x longer download and DB restore before any traffic.",
              "isCorrect": true,
              "feedback": "Correct. Recovery duration is proportional to dataset size. What took an hour now takes many, so the gap to a 10-minute RTO widens."
            },
            {
              "id": "stq-multi-region-antipattern-3",
              "text": "The nightly job overruns its window and corrupts the archive when the next scheduled run starts on top of it.",
              "isCorrect": false,
              "feedback": "Overrun delays the backup, but snapshot-based jobs do not corrupt each other. The danger is a wider RPO and slow restore, not corruption."
            }
          ]
        }
      }
    ]
  },
  "health-checks": {
    "patternId": "health-checks",
    "incidentTitle": "App process runs but database connection pool is completely dead",
    "primaryConstraintSummary": "Traffic must only route to pods capable of executing queries.",
    "recommendedOptionId": "opt-health-checks-recommended",
    "options": [
      {
        "id": "opt-health-checks-recommended",
        "title": "Deep Readiness Probe Checking DB Connectivity",
        "tagline": "Industry-standard architectural pattern for zombie pod traffic routing.",
        "patternId": "health-checks",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Deep Readiness Probe Checking DB Connectivity\" fix the dead-connection-pool outage better than a probe that only checks the process?",
          "options": [
            {
              "id": "tdq-health-checks-recommended-1",
              "text": "A deep probe restarts the pod when the DB is unreachable, and the fresh process rebuilds a healthy connection pool.",
              "isCorrect": false,
              "feedback": "That is the liveness job. A readiness probe only removes the pod from Service endpoints; it never restarts it. Restarting on a DB failure would also cycle every pod during a real DB outage."
            },
            {
              "id": "tdq-health-checks-recommended-2",
              "text": "The probe runs a trivial query through the pool, so pods that cannot execute queries are pulled from endpoints while healthy ones keep serving.",
              "isCorrect": true,
              "feedback": "Correct. Readiness gates traffic on the ability to do real work. Dead-pool pods stop receiving requests within failureThreshold x periodSeconds instead of returning 500s indefinitely."
            },
            {
              "id": "tdq-health-checks-recommended-3",
              "text": "It makes the database faster, since pods that fail the probe stop opening connections and free up max_connections capacity for others.",
              "isCorrect": false,
              "feedback": "Not the mechanism. Unready pods keep their existing connections until they close them, and the probe adds a little DB load. The gain is routing: requests reach only pods that can query."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 10x and every pod's pool is busy. What breaks first for the deep readiness probe?",
          "options": [
            {
              "id": "stq-health-checks-recommended-1",
              "text": "The probe waits behind real queries for a pooled connection, times out on busy but healthy pods, and marks them unready, shrinking capacity.",
              "isCorrect": true,
              "feedback": "Right. Probe cost scales with pod count, but its latency scales with pool contention. Use a reserved connection, a cached result and a failureThreshold above 1 so saturation is not mistaken for death."
            },
            {
              "id": "stq-health-checks-recommended-2",
              "text": "The kubelet runs out of CPU executing the probe every few seconds, so probes fail across the whole node before the app is affected.",
              "isCorrect": false,
              "feedback": "Probes are cheap: one exec or HTTP call per pod per period. The kubelet is not the bottleneck at 10x; the shared pool and DB connection cap are."
            },
            {
              "id": "stq-health-checks-recommended-3",
              "text": "The probe's SELECT 1 scans more and more rows as traffic rises, so probe latency grows linearly with request volume.",
              "isCorrect": false,
              "feedback": "SELECT 1 touches no tables, so its cost is constant. What grows is the wait for a free pooled connection when real traffic exhausts the pool."
            }
          ]
        }
      },
      {
        "id": "opt-health-checks-alternative",
        "title": "Hardcoded Static HTTP 200 OK Liveness Check",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "health-checks",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you pick \"Hardcoded Static HTTP 200 OK Liveness Check\" instead of a deep readiness probe against the database?",
          "options": [
            {
              "id": "tdq-health-checks-alternative-1",
              "text": "When you want the load balancer to stop routing to pods whose DB connection pool is dead, without touching application code.",
              "isCorrect": false,
              "feedback": "A static 200 cannot see the pool at all, so those pods keep receiving traffic. It fits only when the goal is no code change, not this outage's routing problem."
            },
            {
              "id": "tdq-health-checks-alternative-2",
              "text": "When the database is a shared dependency and you want every pod restarted the moment it becomes unreachable, to force new connections.",
              "isCorrect": false,
              "feedback": "Restarting all pods on a DB blip is harmful: it creates a reconnect storm against a database that is already struggling. Liveness checks should avoid dependencies."
            },
            {
              "id": "tdq-health-checks-alternative-3",
              "text": "When a hung or deadlocked process needs a restart; keeping the DB out of the check stops a shared DB outage killing every pod.",
              "isCorrect": true,
              "feedback": "Correct. A dependency-free liveness check restarts only genuinely stuck processes. Checking a shared DB there would restart the whole fleet during a database outage and worsen it."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows another 5x under \"Hardcoded Static HTTP 200 OK Liveness Check\". What fails first?",
          "options": [
            {
              "id": "stq-health-checks-alternative-1",
              "text": "The static endpoint itself becomes a bottleneck because serving the fixed 200 response saturates each pod's CPU before anything else.",
              "isCorrect": false,
              "feedback": "A constant 200 costs almost nothing. The pods fail somewhere else: on real requests that need the database."
            },
            {
              "id": "stq-health-checks-alternative-2",
              "text": "Pods with exhausted pools keep answering 200, so the balancer keeps sending them 5x the requests and errors and timeouts grow in step with traffic.",
              "isCorrect": true,
              "feedback": "Correct. The check never sees the pool, so failing pods stay in rotation. A bigger share of an already larger load hits pods that can only return 500s."
            },
            {
              "id": "stq-health-checks-alternative-3",
              "text": "Autoscaling triggers on the failing health checks and adds pods until the DB max_connections limit is reached, which is the first failure.",
              "isCorrect": false,
              "feedback": "The check always passes, so nothing scales on it. CPU-based autoscaling could exhaust max_connections later, but routing to dead-pool pods fails first."
            }
          ]
        }
      },
      {
        "id": "opt-health-checks-antipattern",
        "title": "Frequent 50-Table SQL JOIN Query on Health Endpoint",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "health-checks",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Frequent 50-Table SQL JOIN Query on Health Endpoint\" not fix the outage where pods run but cannot reach the database?",
          "options": [
            {
              "id": "tdq-health-checks-antipattern-1",
              "text": "A dead-pool pod would fail the query and be pulled, but the JOIN also uses pool connections and DB time, so the probe adds load.",
              "isCorrect": true,
              "feedback": "Correct. Testing the DB is the right idea; the implementation is wrong. Health checks must be cheap, like SELECT 1, or they consume the scarce resource they are meant to protect."
            },
            {
              "id": "tdq-health-checks-antipattern-2",
              "text": "A JOIN across 50 tables cannot detect a dead connection pool, because the driver caches query results and the probe returns stale success.",
              "isCorrect": false,
              "feedback": "Drivers do not serve cached results on a broken connection. A dead pool makes the query error out. The flaw is the probe's own cost."
            },
            {
              "id": "tdq-health-checks-antipattern-3",
              "text": "Probes must be idempotent writes to be valid, and a read-only JOIN cannot prove that the database still accepts transactions.",
              "isCorrect": false,
              "feedback": "Readiness probes are usually read-only and that is fine. The problem is that a 50-table JOIN is expensive and slow, not that it is a read."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does the 50-table JOIN health endpoint collapse when traffic grows 10x?",
          "options": [
            {
              "id": "stq-health-checks-antipattern-1",
              "text": "The JOIN result sets grow ten times larger as traffic rises, so the endpoint's response payload overruns the kubelet's HTTP body limit.",
              "isCorrect": false,
              "feedback": "Result size depends on the data, not request volume, and probes only check the status code. The cost comes from DB work, not payload size."
            },
            {
              "id": "stq-health-checks-antipattern-2",
              "text": "The query planner switches to full sequential scans once concurrency doubles, which makes every JOIN return wrong data and fail the probe.",
              "isCorrect": false,
              "feedback": "Plans can change, but a different plan never returns wrong results. The failure is time: slow probe queries breach timeoutSeconds."
            },
            {
              "id": "stq-health-checks-antipattern-3",
              "text": "With slow queries under load, probes time out, healthy pods go unready, the rest take more traffic, and probes keep holding DB connections.",
              "isCorrect": true,
              "feedback": "Correct. Probe load scales with pod count, each JOIN holds a connection for long, and timeouts feed a cascade that removes good pods while the DB is already saturated."
            }
          ]
        }
      }
    ]
  },
  "cap-pacelc": {
    "patternId": "cap-pacelc",
    "incidentTitle": "Network partition separates primary and secondary datacenter racks",
    "primaryConstraintSummary": "Must choose between immediate availability and strict data consistency.",
    "recommendedOptionId": "opt-cap-pacelc-recommended",
    "options": [
      {
        "id": "opt-cap-pacelc-recommended",
        "title": "CP Mode: Reject Writes in Minor Partition",
        "tagline": "Industry-standard architectural pattern for cross-rack network split.",
        "patternId": "cap-pacelc",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"CP Mode: Reject Writes in Minor Partition\" the right choice when the racks lose contact and you must pick between availability and strict consistency?",
          "options": [
            {
              "id": "tdq-cap-pacelc-recommended-1",
              "text": "Rejecting writes on the minority side keeps both racks available for reads and writes, since the majority replicates to the other later.",
              "isCorrect": false,
              "feedback": "Not true. Rejecting writes is a loss of availability for the minority side. CP accepts that cost. Only the majority side stays fully writable."
            },
            {
              "id": "tdq-cap-pacelc-recommended-2",
              "text": "Only the majority side can confirm a write with a quorum, so the minority refuses instead of creating a second history that would need merging.",
              "isCorrect": true,
              "feedback": "Correct. During the partition you cannot have both, so the minority gives up availability to keep one linearizable history and avoid conflicts and lost writes."
            },
            {
              "id": "tdq-cap-pacelc-recommended-3",
              "text": "CP mode removes the need to choose during a partition, because a leader lease guarantees every write commits on both racks in one round trip.",
              "isCorrect": false,
              "feedback": "A partition is precisely when messages do not arrive, so no lease can guarantee commit on both sides. CAP forces the choice; CP chooses consistency."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 10x during the partition. What is the first thing to break in CP mode?",
          "options": [
            {
              "id": "stq-cap-pacelc-recommended-1",
              "text": "Write conflicts across racks multiply tenfold, and the reconciliation job after healing runs out of memory merging the two histories.",
              "isCorrect": false,
              "feedback": "CP never creates two histories, so there is nothing to reconcile. Conflicts are an AP concern."
            },
            {
              "id": "stq-cap-pacelc-recommended-2",
              "text": "Consistency itself degrades, because at 10x load the majority side starts acknowledging writes before a quorum has persisted them.",
              "isCorrect": false,
              "feedback": "A correct CP system never acknowledges without a quorum, even under load. It slows down or fails requests before it weakens the guarantee."
            },
            {
              "id": "stq-cap-pacelc-recommended-3",
              "text": "Minority-side clients get 10x more rejected writes and retry, while the majority leader absorbs redirected load and slows.",
              "isCorrect": true,
              "feedback": "Correct. Unavailability scales with traffic: minority clients see errors, retries pile on, and the surviving quorum takes the spillover. Backoff and client routing are the fix."
            }
          ]
        }
      },
      {
        "id": "opt-cap-pacelc-alternative",
        "title": "AP Mode: Accept Local Writes and Reconcile",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "cap-pacelc",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When is \"AP Mode: Accept Local Writes and Reconcile\" the better choice than rejecting writes in the minority partition?",
          "options": [
            {
              "id": "tdq-cap-pacelc-alternative-1",
              "text": "When the data merges cleanly (carts, counters, presence) and refusing a user's write costs more than repairing a conflict afterward.",
              "isCorrect": true,
              "feedback": "Correct. AP trades consistency for availability. It works when a conflict-free merge such as a CRDT exists, or when losing an occasional concurrent update is cheaper than downtime."
            },
            {
              "id": "tdq-cap-pacelc-alternative-2",
              "text": "When the data is money or inventory, because accepting writes on both sides doubles capacity and reconciliation later removes double spends.",
              "isCorrect": false,
              "feedback": "Reconciliation cannot undo a double spend that has already been paid out. That is a case for CP, which prevents conflicting writes."
            },
            {
              "id": "tdq-cap-pacelc-alternative-3",
              "text": "When the partition is expected to last only a few milliseconds, because AP mode guarantees no update is ever lost after healing.",
              "isCorrect": false,
              "feedback": "AP does not guarantee that. Last-write-wins merging silently discards one of two concurrent updates, however brief the split was."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Write volume grows another 5x under \"AP Mode: Accept Local Writes and Reconcile\". What breaks first?",
          "options": [
            {
              "id": "stq-cap-pacelc-alternative-1",
              "text": "Reads on both racks slow down 5x, because every read must first query the other rack to check for a newer version.",
              "isCorrect": false,
              "feedback": "AP reads are served locally, which is the availability benefit. The cost appears at merge time, not read time."
            },
            {
              "id": "stq-cap-pacelc-alternative-2",
              "text": "Conflicts grow with write rate and partition length, and the post-heal merge loses data under last-write-wins.",
              "isCorrect": true,
              "feedback": "Correct. More writes hit the same keys on both sides, so conflicts and reconciliation work grow roughly with write rate times partition duration."
            },
            {
              "id": "stq-cap-pacelc-alternative-3",
              "text": "The link between racks saturates during the partition as both sides push every write to each other, and throughput collapses.",
              "isCorrect": false,
              "feedback": "During a partition the link is down, so nothing is sent. The replication burst arrives after healing, and that is the merge backlog."
            }
          ]
        }
      },
      {
        "id": "opt-cap-pacelc-antipattern",
        "title": "Disable Cross-Rack TCP Networking Completely",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "cap-pacelc",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Disable Cross-Rack TCP Networking Completely\" fail to address the partition outage?",
          "options": [
            {
              "id": "tdq-cap-pacelc-antipattern-1",
              "text": "Cutting the links reduces consistency checks but makes every node a strict CP participant, so it only moves the outage to the client.",
              "isCorrect": false,
              "feedback": "Cutting links selects no policy. A CP system decides which side refuses writes; a blanket cutoff has no majority logic at all."
            },
            {
              "id": "tdq-cap-pacelc-antipattern-2",
              "text": "Disabling TCP forces a UDP fallback, which loses packets and makes replication skip records silently on both racks.",
              "isCorrect": false,
              "feedback": "Replication does not fall back to UDP. Without cross-rack TCP there is simply no replication, which is the problem."
            },
            {
              "id": "tdq-cap-pacelc-antipattern-3",
              "text": "It turns the accidental partition into a permanent one: both racks keep writing with no replication, no quorum rule and no way to merge later.",
              "isCorrect": true,
              "feedback": "Correct. The outage is the partition; deliberately cutting the link removes the only path for coordinating or reconciling. It is neither CP nor AP, just divergence."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does the full cross-rack cutoff collapse at 10x traffic?",
          "options": [
            {
              "id": "stq-cap-pacelc-antipattern-1",
              "text": "Cutoff-window writes sit unreplicated on one rack, so at 10x divergence, resync and data loss grow tenfold.",
              "isCorrect": true,
              "feedback": "Correct. With no replication, the unreplicated delta is proportional to write volume, and a rack failure loses it. Rejoining needs a costly full resync."
            },
            {
              "id": "stq-cap-pacelc-antipattern-2",
              "text": "Each rack's CPU saturates because nodes retry cross-rack TCP connections forever, starving the application threads.",
              "isCorrect": false,
              "feedback": "Retries are cheap, and well-behaved clients back off. The real damage is the diverging data, not CPU."
            },
            {
              "id": "stq-cap-pacelc-antipattern-3",
              "text": "The kernel's TCP connection table fills after the cutoff, so new client connections are refused on both racks at 10x.",
              "isCorrect": false,
              "feedback": "The cutoff affects only cross-rack traffic. Client connections are separate and are not blocked by the change."
            }
          ]
        }
      }
    ]
  },
  "consensus-quorums": {
    "patternId": "consensus-quorums",
    "incidentTitle": "Network flap causes two nodes to both believe they are active leader",
    "primaryConstraintSummary": "State machine replication requires strict majority agreement.",
    "recommendedOptionId": "opt-consensus-quorums-recommended",
    "options": [
      {
        "id": "opt-consensus-quorums-recommended",
        "title": "Strict Majority Raft Quorum ((N/2) + 1)",
        "tagline": "Industry-standard architectural pattern for distributed leader split-brain.",
        "patternId": "consensus-quorums",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Strict Majority Raft Quorum ((N/2) + 1)\" stop two nodes from both acting as leader?",
          "options": [
            {
              "id": "tdq-consensus-quorums-recommended-1",
              "text": "Each node holds a lock in a shared store, and only the node whose lock timestamp is newer can accept writes.",
              "isCorrect": false,
              "feedback": "Raft has no external lock. Safety comes from votes and terms among the nodes themselves, not from a shared timestamp."
            },
            {
              "id": "tdq-consensus-quorums-recommended-2",
              "text": "A leader must heartbeat every node, and a node that misses one heartbeat immediately steps down and rejoins as a follower.",
              "isCorrect": false,
              "feedback": "Leaders need only a majority alive, and a missed heartbeat triggers a new election on the followers, not an automatic step down."
            },
            {
              "id": "tdq-consensus-quorums-recommended-3",
              "text": "Any two majorities share at least one node, and a node votes once per term, so two leaders cannot both win a term.",
              "isCorrect": true,
              "feedback": "Correct. Quorum intersection is the mechanism. A stale leader without a majority cannot commit, and higher terms make old leaders step down."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic grows 10x on the Raft cluster. What limits it first?",
          "options": [
            {
              "id": "stq-consensus-quorums-recommended-1",
              "text": "Election frequency, since more traffic triggers more leader elections as followers give up waiting on heartbeats.",
              "isCorrect": false,
              "feedback": "Normal load does not trigger elections. Heartbeats are small and independent of client load, unless the leader is so saturated it misses them."
            },
            {
              "id": "stq-consensus-quorums-recommended-2",
              "text": "The one leader orders writes, fsyncs its log and awaits a majority ack, capping commit latency and throughput.",
              "isCorrect": true,
              "feedback": "Correct. Raft writes funnel through one leader, and latency follows the slowest node needed for quorum. Batching, pipelining or sharding into several Raft groups scales it."
            },
            {
              "id": "stq-consensus-quorums-recommended-3",
              "text": "Followers refuse reads under load, since only the leader holds a copy of the committed data.",
              "isCorrect": false,
              "feedback": "Followers hold replicated committed data. They can serve stale reads or use read-index techniques; they are not empty."
            }
          ]
        }
      },
      {
        "id": "opt-consensus-quorums-alternative",
        "title": "Allow Any Single Surviving Node to Claim Leader",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "consensus-quorums",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you choose \"Allow Any Single Surviving Node to Claim Leader\" over a strict majority quorum?",
          "options": [
            {
              "id": "tdq-consensus-quorums-alternative-1",
              "text": "When a stale leader must never accept a write, since a single node claim gives the fastest conflict-free failover.",
              "isCorrect": false,
              "feedback": "A single-node claim allows exactly the stale writes you want to prevent. A majority quorum is what stops them."
            },
            {
              "id": "tdq-consensus-quorums-alternative-2",
              "text": "When leader work is idempotent (cache warming, cron dispatch) and downtime costs more than a duplicate run.",
              "isCorrect": true,
              "feedback": "Correct. Two active leaders only cause repeated work there, which can be tolerated. It is unsafe for state that must not diverge."
            },
            {
              "id": "tdq-consensus-quorums-alternative-3",
              "text": "When the cluster has only three nodes, because with three nodes a majority is impossible to reach during a network flap.",
              "isCorrect": false,
              "feedback": "Three nodes tolerate one failure: two form a majority. A quorum is fully practical at N=3."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Traffic and partitions grow 5x with \"Allow Any Single Surviving Node to Claim Leader\". What fails first?",
          "options": [
            {
              "id": "stq-consensus-quorums-alternative-1",
              "text": "More flaps mean more windows with several leaders, so divergent writes multiply and merges discard some.",
              "isCorrect": true,
              "feedback": "Correct. Each split produces simultaneous leaders, and write volume decides how much diverges. Nothing in the design forces stale leaders to yield."
            },
            {
              "id": "stq-consensus-quorums-alternative-2",
              "text": "The election protocol runs out of node IDs, and the cluster cannot pick a unique leader after many rounds.",
              "isCorrect": false,
              "feedback": "IDs are not consumed by elections. The design has no real election, which is the underlying flaw."
            },
            {
              "id": "stq-consensus-quorums-alternative-3",
              "text": "The leader's disk saturates because each claim forces a full log replay across the cluster from the beginning.",
              "isCorrect": false,
              "feedback": "A claim does not trigger a cluster-wide replay. The trouble is competing leaders, not replay cost."
            }
          ]
        }
      },
      {
        "id": "opt-consensus-quorums-antipattern",
        "title": "Broadcast Writes to All Nodes with No Election",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "consensus-quorums",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Broadcast Writes to All Nodes with No Election\" not resolve the split-brain outage?",
          "options": [
            {
              "id": "tdq-consensus-quorums-antipattern-1",
              "text": "Broadcast adds too much bandwidth, so the leader detects its followers late and still starts a second election.",
              "isCorrect": false,
              "feedback": "There are no elections in this design. The problem is not bandwidth but the absence of any ordering authority."
            },
            {
              "id": "tdq-consensus-quorums-antipattern-2",
              "text": "Broadcast forces every write through a single sequencer node, which recreates the single point of failure that leaders had.",
              "isCorrect": false,
              "feedback": "There is no sequencer in it. Writes go straight to all nodes, which is exactly why ordering is lost."
            },
            {
              "id": "tdq-consensus-quorums-antipattern-3",
              "text": "Concurrent writes reach nodes in different orders, and with no ordering authority replicas apply them differently.",
              "isCorrect": true,
              "feedback": "Correct. Replicated state machines require the same total order. Broadcasting without a leader or quorum removes agreement on order."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does broadcasting to all nodes without an election degrade at 10x?",
          "options": [
            {
              "id": "stq-consensus-quorums-antipattern-1",
              "text": "Broadcast traffic drops packets at 10x, so nodes silently miss writes and the quorum shrinks below a majority.",
              "isCorrect": false,
              "feedback": "Nothing here depends on a quorum, so nothing shrinks. Divergence occurs even with zero packet loss, due to ordering."
            },
            {
              "id": "stq-consensus-quorums-antipattern-2",
              "text": "Same-key writes multiply, fan out to N-1 nodes, and interleavings differ per node, so replicas diverge.",
              "isCorrect": true,
              "feedback": "Correct. Traffic amplifies by N, and the odds that two writers race on a key rise with load. No mechanism repairs the divergent order."
            },
            {
              "id": "stq-consensus-quorums-antipattern-3",
              "text": "Election timers start counting faster as the request rate goes up, so nodes crash in a loop of premature elections.",
              "isCorrect": false,
              "feedback": "No election timers exist in the design, and timers do not run faster with load. The failure is data inconsistency."
            }
          ]
        }
      }
    ]
  },
  "storage-engines": {
    "patternId": "storage-engines",
    "incidentTitle": "150,000 sensor telemetry metrics/sec saturate B-Tree page IOPS",
    "primaryConstraintSummary": "Write throughput dominates; point queries target recent ranges.",
    "recommendedOptionId": "opt-storage-engines-recommended",
    "options": [
      {
        "id": "opt-storage-engines-recommended",
        "title": "LSM-Tree Engine with MemTable Sequential Writes",
        "tagline": "Industry-standard architectural pattern for high-volume time-series ingestion.",
        "patternId": "storage-engines",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"LSM-Tree Engine with MemTable Sequential Writes\" the right call for 150,000 sensor metrics/sec?",
          "options": [
            {
              "id": "tdq-storage-engines-recommended-1",
              "text": "Reads get faster because SSTables are sorted, so a point query always touches exactly one file no matter how many flushes have happened since.",
              "isCorrect": false,
              "feedback": "Not true. A read may check the MemTable and several SSTables per level. Bloom filters and block caches cut the cost, but LSM trades read amplification for cheaper writes."
            },
            {
              "id": "tdq-storage-engines-recommended-2",
              "text": "One WAL append plus a MemTable insert per write, flushed later as sorted SSTables, so the SSD sees sequential I/O, not 150k random page writes/sec.",
              "isCorrect": true,
              "feedback": "Correct. B+ tree inserts dirty random pages (plus splits), which burns IOPS. LSM batches writes into large sequential flushes, which suits write-dominated telemetry."
            },
            {
              "id": "tdq-storage-engines-recommended-3",
              "text": "LSM engines write in place like a B+ tree but skip the WAL, so each metric costs one disk write rather than two.",
              "isCorrect": false,
              "feedback": "Wrong on both counts. LSM never updates in place, and it keeps a WAL so the MemTable survives a crash. The gain is sequential batching, not skipping the log."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "At 10x load (1.5M metrics/sec), what does \"LSM-Tree Engine with MemTable Sequential Writes\" hit first?",
          "options": [
            {
              "id": "stq-storage-engines-recommended-1",
              "text": "Compaction cannot merge SSTables as fast as flushes create them, so L0 files pile up, reads slow and writes stall.",
              "isCorrect": true,
              "feedback": "Right. Compaction rewrites data in the background and competes for the same disk. When it falls behind, read amplification climbs and stalls protect the tree."
            },
            {
              "id": "stq-storage-engines-recommended-2",
              "text": "Each fsync of the WAL is a random write, so at 1.5M writes/sec the SSD's random IOPS becomes the hard ceiling for ingestion.",
              "isCorrect": false,
              "feedback": "WAL writes are sequential appends, and group commit batches many writes into one fsync. The ceiling is compaction bandwidth, not random IOPS."
            },
            {
              "id": "stq-storage-engines-recommended-3",
              "text": "Bloom filters stop working once the dataset is 10x larger, so every point query has to scan all of the SSTables on disk.",
              "isCorrect": false,
              "feedback": "Bloom filters scale with the data and still skip most files. What degrades reads is too many un-compacted L0 files, which follows from compaction falling behind."
            }
          ]
        }
      },
      {
        "id": "opt-storage-engines-alternative",
        "title": "Traditional B+ Tree Engine with In-Place Disk Pages",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "storage-engines",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would you choose \"Traditional B+ Tree Engine with In-Place Disk Pages\" over an LSM engine?",
          "options": [
            {
              "id": "tdq-storage-engines-alternative-1",
              "text": "When write volume is extreme and append-only, since in-place updates need no compaction and never amplify writes at all.",
              "isCorrect": false,
              "feedback": "Backwards. In-place B+ trees suffer write amplification from page splits and double-writes, and each insert is a random page write. LSM is the write-heavy choice."
            },
            {
              "id": "tdq-storage-engines-alternative-2",
              "text": "When you need lower storage cost, since B+ trees compress data far better than immutable sorted files on the same disk.",
              "isCorrect": false,
              "feedback": "Not so. LSM SSTables are written sorted in large blocks and compress well, while B+ tree pages carry free space. Cost is not the reason to pick a B+ tree."
            },
            {
              "id": "tdq-storage-engines-alternative-3",
              "text": "When the workload is read-heavy with random updates and strict ACID, so predictable read latency matters more than ingest rate.",
              "isCorrect": true,
              "feedback": "Right. A B+ tree reads a key in about 3-4 page fetches from one place and updates in place. It suits OLTP; at 150k inserts/sec it becomes IOPS-bound."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "If traffic grows another 5x, what breaks first on \"Traditional B+ Tree Engine with In-Place Disk Pages\"?",
          "options": [
            {
              "id": "stq-storage-engines-alternative-1",
              "text": "The tree grows from 4 levels to 20 levels, so every lookup needs about 5x more page reads than before the surge.",
              "isCorrect": false,
              "feedback": "B+ trees are very wide (hundreds of keys per page), so depth grows logarithmically; 5x more data adds at most one level. The bottleneck is write IOPS, not depth."
            },
            {
              "id": "stq-storage-engines-alternative-2",
              "text": "Random page writes, WAL and checkpoint flushes saturate SSD IOPS, so dirty pages back up and inserts stall.",
              "isCorrect": true,
              "feedback": "Correct. Every insert touches a random leaf page, and when flushing lags, backends block on page eviction and latency spikes, even on $1,200 hardware."
            },
            {
              "id": "stq-storage-engines-alternative-3",
              "text": "Page locks on the root node serialize all inserts, so throughput stays flat however many CPU cores you add to the box.",
              "isCorrect": false,
              "feedback": "Modern engines use latch coupling and only briefly latch the root; concurrent inserts go to different leaves. The limit is random write I/O, not root contention."
            }
          ]
        }
      },
      {
        "id": "opt-storage-engines-antipattern",
        "title": "Store Raw Unindexed Log Files on Local Virtual Disk",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "storage-engines",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Store Raw Unindexed Log Files on Local Virtual Disk\" fail to fix the telemetry outage?",
          "options": [
            {
              "id": "tdq-storage-engines-antipattern-1",
              "text": "Appends are cheap, but with no index every point query on a recent range scans the log, and local disk loses data if the instance dies.",
              "isCorrect": true,
              "feedback": "Right. It moves the bottleneck from write IOPS to full-file read scans, and the ephemeral local volume gives no durability guarantee."
            },
            {
              "id": "tdq-storage-engines-antipattern-2",
              "text": "Appending to a file still issues one random page write per metric, so write IOPS stays exactly as saturated as it was with the B+ tree.",
              "isCorrect": false,
              "feedback": "Appends to a log file are sequential and coalesced by the OS. The write side is fine; the problem is that reads have no index."
            },
            {
              "id": "tdq-storage-engines-antipattern-3",
              "text": "A log file must be rewritten in full whenever a new metric is added, so throughput collapses after a few thousand writes.",
              "isCorrect": false,
              "feedback": "Appends only extend the end of the file; nothing is rewritten. The failure is on the read side, where queries must scan everything to find recent ranges."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Store Raw Unindexed Log Files on Local Virtual Disk\" collapse at 10x load?",
          "options": [
            {
              "id": "stq-storage-engines-antipattern-1",
              "text": "Once the file grows past the size of RAM, appends turn into random writes, so write IOPS suddenly spikes and ingestion slows down badly.",
              "isCorrect": false,
              "feedback": "Appends stay sequential regardless of file size; the OS just flushes dirty pages. Reads are what get worse, since scans no longer fit in the page cache."
            },
            {
              "id": "stq-storage-engines-antipattern-2",
              "text": "A single log file hits the filesystem's maximum file size within seconds at 1.5M metrics/sec and refuses further writes.",
              "isCorrect": false,
              "feedback": "Modern filesystems allow multi-terabyte files and rotation is trivial. What fails is query time, since every lookup scans the whole log."
            },
            {
              "id": "stq-storage-engines-antipattern-3",
              "text": "Scan cost is data size times query rate, so 10x data and 10x queries means about 100x more bytes read and saturated disk bandwidth.",
              "isCorrect": true,
              "feedback": "Yes. Without an index, query cost is O(total bytes). More writes enlarge the log while more readers re-scan it, so read load grows multiplicatively."
            }
          ]
        }
      }
    ]
  },
  "id-generation": {
    "patternId": "id-generation",
    "incidentTitle": "Database shards generate duplicate auto-increment integer IDs",
    "primaryConstraintSummary": "64-bit unique IDs sorting chronologically without network sync.",
    "recommendedOptionId": "opt-id-generation-recommended",
    "options": [
      {
        "id": "opt-id-generation-recommended",
        "title": "64-Bit Snowflake ID Generator",
        "tagline": "Industry-standard architectural pattern for distributed primary key collisions.",
        "patternId": "id-generation",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"64-Bit Snowflake ID Generator\" the right fix for duplicate auto-increment IDs across shards?",
          "options": [
            {
              "id": "tdq-id-generation-recommended-1",
              "text": "Synchronized NTP clocks guarantee strict global ordering, so a smaller ID value was always created first on any node.",
              "isCorrect": false,
              "feedback": "No. Clocks skew by milliseconds, so IDs from different workers are only roughly (k-)sorted. Uniqueness comes from worker ID and sequence bits, not clock exactness."
            },
            {
              "id": "tdq-id-generation-recommended-2",
              "text": "Making the auto-increment column 64 bits wide means that the independent shard counters can never overlap with each other.",
              "isCorrect": false,
              "feedback": "Width does not help: each shard still counts 1, 2, 3... on its own, so they collide immediately. Uniqueness needs disjoint ID spaces such as worker bits."
            },
            {
              "id": "tdq-id-generation-recommended-3",
              "text": "Each node builds 41-bit time + 10-bit worker + 12-bit sequence locally, so IDs are unique and time-sortable with no network call.",
              "isCorrect": true,
              "feedback": "Correct. Worker ID makes each node's ID space disjoint, the sequence handles up to 4,096 IDs per ms per worker, and the timestamp prefix gives chronological order."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "At 10x traffic, what does \"64-Bit Snowflake ID Generator\" run into first?",
          "options": [
            {
              "id": "stq-id-generation-recommended-1",
              "text": "A worker with 12 sequence bits can issue 4,096 IDs per ms, so a hot node exhausts the sequence and must wait for the next ms; add workers.",
              "isCorrect": true,
              "feedback": "Right. Load raises the per-worker rate, not the worker count. At the limit the generator blocks until the clock ticks, so capacity means more workers (up to 1,024)."
            },
            {
              "id": "stq-id-generation-recommended-2",
              "text": "The 10-bit worker ID space is exhausted, because 10x traffic means 10x more distinct workers must be registered with the cluster.",
              "isCorrect": false,
              "feedback": "Worker IDs scale with the number of generator nodes, not with request volume. 10x traffic per node does not consume more worker IDs."
            },
            {
              "id": "stq-id-generation-recommended-3",
              "text": "The 41-bit timestamp overflows sooner because IDs are consumed faster, forcing the generator to wrap around to old values.",
              "isCorrect": false,
              "feedback": "The timestamp encodes elapsed milliseconds, not IDs issued, so load does not advance it. 41 bits lasts about 69 years regardless of traffic."
            }
          ]
        }
      },
      {
        "id": "opt-id-generation-alternative",
        "title": "Centralized Single PostgreSQL Sequence Counter",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "id-generation",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"Centralized Single PostgreSQL Sequence Counter\" beat a Snowflake generator?",
          "options": [
            {
              "id": "tdq-id-generation-alternative-1",
              "text": "When shards must keep issuing IDs during a network partition, since a database sequence keeps working offline on every node.",
              "isCorrect": false,
              "feedback": "Reverse. A central sequence needs a network path to that one server; during a partition, cut-off shards cannot get IDs. Snowflake works offline."
            },
            {
              "id": "tdq-id-generation-alternative-2",
              "text": "With modest volume and one owning service, a strictly increasing integer with no clock dependency is worth a hop.",
              "isCorrect": true,
              "feedback": "Right. A sequence needs no worker IDs or clock-skew handling and gives compact integers. It only works while the single node can serve all callers."
            },
            {
              "id": "tdq-id-generation-alternative-3",
              "text": "When you want IDs that cannot be guessed, since sequence values are hard to predict without direct database access.",
              "isCorrect": false,
              "feedback": "Sequence values are the most guessable IDs possible (n, n+1, n+2). If unpredictability matters, use random or encrypted IDs, not a counter."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "If traffic grows another 5x, what fails first for \"Centralized Single PostgreSQL Sequence Counter\"?",
          "options": [
            {
              "id": "stq-id-generation-alternative-1",
              "text": "nextval holds a table-level lock until the calling transaction commits, so concurrent inserts queue behind one another.",
              "isCorrect": false,
              "feedback": "Sequences are non-transactional: nextval never holds a lock until commit. Contention exists, but the real limit is one node's capacity and reachability."
            },
            {
              "id": "stq-id-generation-alternative-2",
              "text": "The sequence overflows its 32-bit range, since 5x more traffic burns through integer values five times faster than before.",
              "isCorrect": false,
              "feedback": "A BIGINT sequence goes to 9.2 quintillion, so overflow is nowhere near. The trouble is that all ID requests funnel through one server."
            },
            {
              "id": "stq-id-generation-alternative-3",
              "text": "Every insert needs a round trip to one primary, so its capacity and availability cap all shards, and an outage blocks every insert.",
              "isCorrect": true,
              "feedback": "Correct. The single counter is both a throughput bottleneck and a single point of failure, and one bigger node cannot keep pace with 5x more callers."
            }
          ]
        }
      },
      {
        "id": "opt-id-generation-antipattern",
        "title": "Generate Random 32-Bit Math.random() Floats",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "id-generation",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Generate Random 32-Bit Math.random() Floats\" not solve the duplicate-ID outage?",
          "options": [
            {
              "id": "tdq-id-generation-antipattern-1",
              "text": "Math.random is seeded identically on every server, so each shard emits exactly the same sequence of IDs as the others.",
              "isCorrect": false,
              "feedback": "Modern JS engines seed each process from entropy, so sequences differ. The real issue is that a 32-bit space collides by the birthday paradox."
            },
            {
              "id": "tdq-id-generation-antipattern-2",
              "text": "Only 2^32 values exist, so birthday collisions are likely near 77,000 IDs, and they have no time order.",
              "isCorrect": true,
              "feedback": "Correct. Random IDs swap guaranteed collisions for probable ones, and they also miss the 64-bit and chronologically sortable requirements."
            },
            {
              "id": "tdq-id-generation-antipattern-3",
              "text": "Floating-point values cannot be used as primary keys, so the database would reject every insert into the shard tables.",
              "isCorrect": false,
              "feedback": "Databases accept float columns as keys, and you could scale to integers anyway. The flaw is the tiny random space: duplicates and no time order."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Generate Random 32-Bit Math.random() Floats\" get worse at 10x volume?",
          "options": [
            {
              "id": "stq-id-generation-antipattern-1",
              "text": "Collisions grow with IDs squared (about n^2 / 2^33), so 10x IDs gives about 100x more duplicates.",
              "isCorrect": true,
              "feedback": "Yes. Collision pairs scale quadratically. At tens of millions of IDs duplicates are routine, so inserts fail on the unique constraint or rows get overwritten."
            },
            {
              "id": "stq-id-generation-antipattern-2",
              "text": "Math.random blocks when the system entropy pool runs dry, so ID generation slows to a crawl at high request rates.",
              "isCorrect": false,
              "feedback": "Math.random uses a userland PRNG and never blocks on entropy. The scaling problem is statistical collisions in a 32-bit space."
            },
            {
              "id": "stq-id-generation-antipattern-3",
              "text": "Random keys land in random index pages, so page splits slow every insert, and that split cost becomes the outage.",
              "isCorrect": false,
              "feedback": "Random keys do fragment indexes, but that only slows writes. The failure that breaks correctness is duplicate IDs, which grow quadratically with volume."
            }
          ]
        }
      }
    ]
  },
  "search-indexing": {
    "patternId": "search-indexing",
    "incidentTitle": "SQL queries with LIKE '%query%' force 30-second full table scans",
    "primaryConstraintSummary": "Fast full-text keyword search across 10M product documents.",
    "recommendedOptionId": "opt-search-indexing-recommended",
    "options": [
      {
        "id": "opt-search-indexing-recommended",
        "title": "Inverted-Index Engine with Async CDC Ingestion",
        "tagline": "Industry-standard architectural pattern for wildcard text search slowdown.",
        "patternId": "search-indexing",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why is \"Inverted-Index Engine with Async CDC Ingestion\" better than SQL for keyword search over 10M products?",
          "options": [
            {
              "id": "tdq-search-indexing-recommended-1",
              "text": "A B-tree index on the product name column would give the same speed, since the real gap is just a missing index on that table.",
              "isCorrect": false,
              "feedback": "A B-tree cannot serve LIKE '%query%': a leading wildcard has no sorted prefix to seek. Only structures indexed by term, like an inverted index, avoid the scan."
            },
            {
              "id": "tdq-search-indexing-recommended-2",
              "text": "Each term maps to a sorted posting list, so a query reads only matching lists instead of scanning all ~10M rows as LIKE '%query%' does.",
              "isCorrect": true,
              "feedback": "Correct. A leading wildcard cannot use B-tree order, forcing a full scan. Term lookups plus posting-list intersection touch only candidates, turning 30 s into milliseconds."
            },
            {
              "id": "tdq-search-indexing-recommended-3",
              "text": "CDC ingestion makes search results strongly consistent with the database because every change is read directly from the WAL.",
              "isCorrect": false,
              "feedback": "CDC reads the WAL, but shipping and indexing it is asynchronous, so search lags the DB by seconds. It is eventually consistent, an accepted tradeoff."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "At 10x load, what is the first thing to break in \"Inverted-Index Engine with Async CDC Ingestion\"?",
          "options": [
            {
              "id": "stq-search-indexing-recommended-1",
              "text": "Term dictionary lookups turn linear with 10x more documents, so each keyword query becomes about 10x slower than before.",
              "isCorrect": false,
              "feedback": "Term dictionaries are sorted structures (such as FSTs), so lookups are logarithmic in vocabulary size. Query cost grows slowly; ingestion is what strains."
            },
            {
              "id": "stq-search-indexing-recommended-2",
              "text": "CDC polls the primary with SELECT queries, so 10x more changes add heavy read load on the OLTP database itself.",
              "isCorrect": false,
              "feedback": "CDC tails the write-ahead log rather than running queries, so the primary's cost is small. The pressure lands on the indexing pipeline."
            },
            {
              "id": "stq-search-indexing-recommended-3",
              "text": "The ingestion side: CDC lag grows and segment merges compete with queries for disk I/O, so results go stale and p99 latency rises.",
              "isCorrect": true,
              "feedback": "Right. Search reads scale by adding replicas, but heavy write bursts stress index refresh and merges. Consumer lag is the key metric to watch."
            }
          ]
        }
      },
      {
        "id": "opt-search-indexing-alternative",
        "title": "Execute Full Table Scans on Primary OLTP Database",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "search-indexing",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "In what situation would \"Execute Full Table Scans on Primary OLTP Database\" be acceptable instead of a search engine?",
          "options": [
            {
              "id": "tdq-search-indexing-alternative-1",
              "text": "When the table is small or searches are rare internal queries, a millisecond scan does not justify a separate index cluster.",
              "isCorrect": true,
              "feedback": "Right. Scan cost is proportional to row count. At tens of thousands of rows it is cheap; at 10M rows it takes 30 s, and that is the outage."
            },
            {
              "id": "tdq-search-indexing-alternative-2",
              "text": "When users need typo tolerance and relevance ranking, since LIKE with wildcards scores matches more accurately than an index.",
              "isCorrect": false,
              "feedback": "LIKE returns unranked boolean matches with no fuzziness. Ranking (BM25) and typo tolerance are strengths of inverted-index engines."
            },
            {
              "id": "tdq-search-indexing-alternative-3",
              "text": "When you need search results that are always current, since a scan of the primary avoids replication and index lag.",
              "isCorrect": false,
              "feedback": "Freshness is a real upside, but at 10M rows a 30 s scan makes it moot. It is only a valid reason when the table is small enough to scan fast."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "If search traffic grows another 5x, what happens to \"Execute Full Table Scans on Primary OLTP Database\"?",
          "options": [
            {
              "id": "stq-search-indexing-alternative-1",
              "text": "Postgres caches the LIKE result set across sessions, so repeated searches after the first one are nearly free for later users.",
              "isCorrect": false,
              "feedback": "Postgres has no cross-session query result cache. Each scan re-reads the table (possibly from the OS page cache), so cost still grows with concurrency."
            },
            {
              "id": "stq-search-indexing-alternative-2",
              "text": "5x more concurrent scans each read all 10M rows and compete with transactions for CPU, I/O and buffer pool.",
              "isCorrect": true,
              "feedback": "Correct. Scans evict hot pages and occupy connections. Because search shares the primary with OLTP, a search spike becomes an outage for everything."
            },
            {
              "id": "stq-search-indexing-alternative-3",
              "text": "Parallel query automatically adds workers to match demand, so scan latency stays flat as the number of concurrent users grows.",
              "isCorrect": false,
              "feedback": "Parallel workers come from a small fixed pool (max_parallel_workers) shared by everyone. Under concurrency they run out, and scans fall back to slower plans."
            }
          ]
        }
      },
      {
        "id": "opt-search-indexing-antipattern",
        "title": "Download Complete Catalog Into Client Browser RAM",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "search-indexing",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Download Complete Catalog Into Client Browser RAM\" fail as a fix for the 30-second search?",
          "options": [
            {
              "id": "tdq-search-indexing-antipattern-1",
              "text": "JavaScript string matching is inherently slower than SQL, so an in-browser scan over the catalog would take longer than 30 seconds.",
              "isCorrect": false,
              "feedback": "In-memory scans are fast (millions of strings/sec). The problem is moving 10 GB to every client, not the speed of matching."
            },
            {
              "id": "tdq-search-indexing-antipattern-2",
              "text": "Browsers block any single fetch above 1 MB, so the catalog could never be delivered to the client at all in one piece.",
              "isCorrect": false,
              "feedback": "There is no such hard limit; large downloads work but are slow and memory-heavy. The catalog is too big to be practical, not blocked."
            },
            {
              "id": "tdq-search-indexing-antipattern-3",
              "text": "10M products at about 1 KB each is roughly 10 GB per client, more than browsers or phones can fetch or hold, and stale on arrival.",
              "isCorrect": true,
              "feedback": "Right. Client-side search is fast only once data is loaded, and it cannot be loaded here. The size and staleness make it unworkable at this catalog scale."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Download Complete Catalog Into Client Browser RAM\" collapse at 10x users?",
          "options": [
            {
              "id": "stq-search-indexing-antipattern-1",
              "text": "Each client re-runs its LIKE queries against the server, so 10x users means 10x full scans hitting the primary database.",
              "isCorrect": false,
              "feedback": "Client-side search runs locally on the downloaded copy, so the server never sees the LIKE. The load is on bandwidth and client memory instead."
            },
            {
              "id": "stq-search-indexing-antipattern-2",
              "text": "Each session re-pulls a multi-GB catalog, so 10x users means 10x egress, and clients run out of memory first.",
              "isCorrect": true,
              "feedback": "Yes. Cost scales with users times catalog size, so bandwidth bills and load times explode, and tabs crash on low-memory devices."
            },
            {
              "id": "stq-search-indexing-antipattern-3",
              "text": "A CDN cannot cache the catalog file, so every download hits the database directly and exhausts its connection pool.",
              "isCorrect": false,
              "feedback": "A static snapshot is cacheable at a CDN. The trouble is its size: transferring GBs to each user costs bandwidth and time, even from cache."
            }
          ]
        }
      }
    ]
  },
  "stream-processing": {
    "patternId": "stream-processing",
    "incidentTitle": "Batch cron job detects payment fraud 10 minutes too late",
    "primaryConstraintSummary": "Must evaluate transaction velocity over sliding 5-minute windows.",
    "recommendedOptionId": "opt-stream-processing-recommended",
    "options": [
      {
        "id": "opt-stream-processing-recommended",
        "title": "Stateful Stream Engine with Event-Time Windows",
        "tagline": "Industry-standard architectural pattern for real-time sliding window fraud.",
        "patternId": "stream-processing",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Stateful Stream Engine with Event-Time Windows\" fit the need to score transaction velocity over sliding 5-minute windows?",
          "options": [
            {
              "id": "tdq-stream-processing-recommended-1",
              "text": "Event-time windows make the pipeline exactly-once on their own, so no checkpointing, state snapshots or replayable source such as Kafka is required.",
              "isCorrect": false,
              "feedback": "Windowing and delivery guarantees are separate. Exactly-once needs checkpointed state plus a replayable log such as Kafka; event-time only decides which window an event belongs to."
            },
            {
              "id": "tdq-stream-processing-recommended-2",
              "text": "Per-card counters live in keyed state updated on every event, so a velocity verdict takes milliseconds, not a 10-minute wait.",
              "isCorrect": true,
              "feedback": "Right. Incremental keyed state means each event updates a running window instead of rescanning history, closing the 10-minute detection gap."
            },
            {
              "id": "tdq-stream-processing-recommended-3",
              "text": "A sliding window needs only the current event, so the engine can discard all history and keep almost no state between events.",
              "isCorrect": false,
              "feedback": "Wrong. A 5-minute count needs the events (or per-slice aggregates) still inside the window; that retained state is why checkpointing and state backends exist."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When transaction volume grows 10x, what is the first thing likely to break in \"Stateful Stream Engine with Event-Time Windows\"?",
          "options": [
            {
              "id": "stq-stream-processing-recommended-1",
              "text": "Watermarks stop advancing because event time is taken from each server's wall clock, and that clock drifts more at high volume.",
              "isCorrect": false,
              "feedback": "Watermarks track the max event timestamp seen minus an allowed lateness, not server clocks. Volume does not make them stall; idle or skewed partitions do."
            },
            {
              "id": "stq-stream-processing-recommended-2",
              "text": "RocksDB keyed state must fit entirely in JVM heap memory, so 10x more active cards means out-of-memory crashes.",
              "isCorrect": false,
              "feedback": "Embedded RocksDB state spills to local disk with an in-memory block cache, so state can exceed RAM. It costs read latency, not an immediate OOM."
            },
            {
              "id": "stq-stream-processing-recommended-3",
              "text": "Key skew: state is keyed by card or merchant, so one hot key pins to a single task whose backlog backpressures the job.",
              "isCorrect": true,
              "feedback": "Yes. Adding parallelism cannot split one key. Fix with salting or pre-aggregation of hot keys before the keyed stage."
            }
          ]
        }
      },
      {
        "id": "opt-stream-processing-alternative",
        "title": "Scheduled Batch SQL Cron Job Every 10 Minutes",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "stream-processing",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"Scheduled Batch SQL Cron Job Every 10 Minutes\" be a defensible pick over the stream engine for this fraud workload?",
          "options": [
            {
              "id": "tdq-stream-processing-alternative-1",
              "text": "When you need exactly-once results, since a SQL batch job is transactional and stream engines can only be at-least-once.",
              "isCorrect": false,
              "feedback": "Modern stream engines reach effectively-once via checkpoints and transactional sinks. Batch is not required for correctness."
            },
            {
              "id": "tdq-stream-processing-alternative-2",
              "text": "When throughput is very high, because a single batched query always processes events more cheaply than any streaming job could.",
              "isCorrect": false,
              "feedback": "Batch is efficient per row, but that is a cost argument, not a fit here: the constraint is 5-minute sliding windows, which a 10-minute schedule cannot serve."
            },
            {
              "id": "tdq-stream-processing-alternative-3",
              "text": "When decisions are retrospective, like chargeback reports or reconciliation, and a 10-minute lag is fine for a team without stream ops.",
              "isCorrect": true,
              "feedback": "Correct. If nobody must block a payment in-flight, batch SQL is simpler to run and audit. It fails only when the verdict must beat the fraudster."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Scheduled Batch SQL Cron Job Every 10 Minutes\" when transaction volume grows another 5x?",
          "options": [
            {
              "id": "stq-stream-processing-alternative-1",
              "text": "Each run scans 5x more rows and outlasts the 10-minute interval, so runs overlap or queue and detection lag grows past 10 minutes.",
              "isCorrect": true,
              "feedback": "Yes. Batch runtime grows with data volume while the schedule stays fixed, so lag grows beyond the interval and the aggregation also competes with OLTP traffic."
            },
            {
              "id": "stq-stream-processing-alternative-2",
              "text": "Nothing changes, because SQL aggregations parallelize across every core and node and so take roughly constant time regardless of rows.",
              "isCorrect": false,
              "feedback": "Aggregation cost grows with rows scanned; parallel query only divides it by the core count. On one primary it is bounded by that machine."
            },
            {
              "id": "stq-stream-processing-alternative-3",
              "text": "Cron drops runs when the load average is high, so some windows are silently skipped but the remaining runs stay accurate and complete.",
              "isCorrect": false,
              "feedback": "Standard cron does not consult load average. Runs pile up or overlap, and a skipped window would create blind spots rather than accuracy."
            }
          ]
        }
      },
      {
        "id": "opt-stream-processing-antipattern",
        "title": "Store Stream Events in Flat CSV Files on S3",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "stream-processing",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Store Stream Events in Flat CSV Files on S3\" fail to fix the late fraud detection?",
          "options": [
            {
              "id": "tdq-stream-processing-antipattern-1",
              "text": "S3 is only eventually consistent, so newly written CSV objects may be invisible to the reader for minutes.",
              "isCorrect": false,
              "feedback": "S3 has offered strong read-after-write consistency since 2020. Visibility is not the issue; the missing piece is windowed computation."
            },
            {
              "id": "tdq-stream-processing-antipattern-2",
              "text": "S3 stores bytes but runs no windowed state or per-event compute, so velocity still needs a scan-and-parse batch job.",
              "isCorrect": true,
              "feedback": "Right. Object storage is durable and cheap, but a 5-minute sliding count still requires something to read, parse and aggregate, which is batch latency again."
            },
            {
              "id": "tdq-stream-processing-antipattern-3",
              "text": "S3 caps a bucket at roughly 10 writes per second, so the event stream cannot even be persisted at fraud-relevant transaction volume.",
              "isCorrect": false,
              "feedback": "Wrong. S3 supports thousands of PUTs per second per prefix. The limit is not throughput; the design has no incremental compute over the events."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Store Stream Events in Flat CSV Files on S3\" collapse when event volume grows 10x?",
          "options": [
            {
              "id": "stq-stream-processing-antipattern-1",
              "text": "S3 hard-throttles every client at about 100 requests per second, so ingestion of the event files stalls almost immediately at 10x.",
              "isCorrect": false,
              "feedback": "S3 scales to thousands of requests per second per prefix, so this is not the first failure. The scan cost is."
            },
            {
              "id": "stq-stream-processing-antipattern-2",
              "text": "CSV rows containing commas or embedded newlines get misparsed more often as volume rises, corrupting the velocity counts.",
              "isCorrect": false,
              "feedback": "Parsing errors are a data-quality issue independent of volume; quoting rules handle them. It is not why load breaks this design."
            },
            {
              "id": "stq-stream-processing-antipattern-3",
              "text": "Each scan reads and parses 10x more bytes across many small files, so a scan outlasts the 5-minute window it tries to score.",
              "isCorrect": true,
              "feedback": "Exactly. Scan time scales with data while the window stays fixed, so detection lag grows and the list-and-parse small-file overhead compounds it."
            }
          ]
        }
      }
    ]
  },
  "observability": {
    "patternId": "observability",
    "incidentTitle": "API gateway p99 latency spikes to 3s with zero CPU on ingress",
    "primaryConstraintSummary": "Need exact downstream RPC call latency breakdown per trace.",
    "recommendedOptionId": "opt-observability-recommended",
    "options": [
      {
        "id": "opt-observability-recommended",
        "title": "Distributed Tracing with Correlated Trace IDs",
        "tagline": "Industry-standard architectural pattern for microservice latency pinpointing.",
        "patternId": "observability",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Distributed Tracing with Correlated Trace IDs\" suit a gateway showing 3s p99 latency while ingress CPU is idle?",
          "options": [
            {
              "id": "tdq-observability-recommended-1",
              "text": "A trace ID propagated on every RPC lets each hop record a timed span, so a slow request shows which downstream call took the 3s.",
              "isCorrect": true,
              "feedback": "Correct. Idle ingress CPU means the time is spent waiting on a dependency. Per-request spans attribute the wait to a specific call."
            },
            {
              "id": "tdq-observability-recommended-2",
              "text": "Per-service p99 metric dashboards already give the same per-request breakdown, so tracing only adds prettier graphs.",
              "isCorrect": false,
              "feedback": "Histograms aggregate across requests. They can show a service is slow but cannot say which downstream call one specific 3s request waited on."
            },
            {
              "id": "tdq-observability-recommended-3",
              "text": "Merging every service's logs by timestamp reconstructs the call chain exactly, because NTP keeps all host clocks in perfect sync.",
              "isCorrect": false,
              "feedback": "NTP still leaves millisecond-level skew between hosts, and timestamps carry no causality. A propagated ID links requests deterministically."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When request rate grows 10x, what is the first thing to strain in \"Distributed Tracing with Correlated Trace IDs\"?",
          "options": [
            {
              "id": "stq-observability-recommended-1",
              "text": "Trace ID collisions, because 128-bit random IDs stop being unique once request rate reaches ten times the current level.",
              "isCorrect": false,
              "feedback": "A 128-bit random ID collides with negligible probability even at billions of traces. Uniqueness is not the failure mode."
            },
            {
              "id": "stq-observability-recommended-2",
              "text": "The traceparent header adds kilobytes to every RPC and saturates ingress network bandwidth once request rate grows tenfold.",
              "isCorrect": false,
              "feedback": "The W3C traceparent header is about 55 bytes. Even at 10x traffic it is a rounding error next to payloads."
            },
            {
              "id": "stq-observability-recommended-3",
              "text": "Span volume: exporting 100% of traces overloads the collector and storage, so use tail sampling that keeps slow, errored traces.",
              "isCorrect": true,
              "feedback": "Yes. Span count grows with requests times hops. Tail-based sampling keeps the interesting 3s outliers while dropping most healthy traces."
            }
          ]
        }
      },
      {
        "id": "opt-observability-alternative",
        "title": "Increase Frequency of Network Ping ICMP Packets",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "observability",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When would \"Increase Frequency of Network Ping ICMP Packets\" be the right first move instead of tracing?",
          "options": [
            {
              "id": "tdq-observability-alternative-1",
              "text": "When you want per-RPC latency from application code, because ICMP round-trip time includes handler execution.",
              "isCorrect": false,
              "feedback": "ICMP is answered by the kernel network stack, never by the application. It measures host-to-host RTT and says nothing about handler time."
            },
            {
              "id": "tdq-observability-alternative-2",
              "text": "When you need finer numbers than TCP-based probes give, since ICMP is prioritized by routers ahead of ordinary application traffic.",
              "isCorrect": false,
              "feedback": "Routers often deprioritize or rate-limit ICMP. It is not more accurate than TCP; it just tests reachability and path RTT."
            },
            {
              "id": "tdq-observability-alternative-3",
              "text": "When you suspect the network path, such as packet loss or a bad cross-AZ link, and need RTT and loss data between hosts.",
              "isCorrect": true,
              "feedback": "Right. Ping isolates path health and packet loss. It is a fair first check for network hypotheses but cannot explain latency inside application calls."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Increase Frequency of Network Ping ICMP Packets\" as traffic grows another 5x and p99 gets worse?",
          "options": [
            {
              "id": "stq-observability-alternative-1",
              "text": "Ping traffic itself saturates the ingress network bandwidth, so the health probes become the cause of additional request latency.",
              "isCorrect": false,
              "feedback": "Ping packets are tiny, tens of bytes each. Even at high frequency they use a negligible share of bandwidth."
            },
            {
              "id": "stq-observability-alternative-2",
              "text": "Ping RTT stays at a few milliseconds because replies never touch the app's thread pool or queues, so it stays green while p99 climbs.",
              "isCorrect": true,
              "feedback": "Exactly. ICMP bypasses application queueing, so it cannot reflect saturation in the services where the 3s is actually spent."
            },
            {
              "id": "stq-observability-alternative-3",
              "text": "ICMP replies wait in the same accept backlog as HTTP requests, so ping RTT rises in step with the gateway's p99 latency.",
              "isCorrect": false,
              "feedback": "The kernel answers ICMP directly; it does not use the TCP accept queue. That is why ping can look healthy during application overload."
            }
          ]
        }
      },
      {
        "id": "opt-observability-antipattern",
        "title": "Log Raw Customer Payment Records to Console Output",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "observability",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Log Raw Customer Payment Records to Console Output\" not help find the source of the 3s gateway latency?",
          "options": [
            {
              "id": "tdq-observability-antipattern-1",
              "text": "Container runtimes drop console output under load, so the payment lines are never recorded anywhere that an engineer could search.",
              "isCorrect": false,
              "feedback": "Runtimes do capture stdout, though often lossy at the extremes. The main problem is content: the lines cannot show where time went."
            },
            {
              "id": "tdq-observability-antipattern-2",
              "text": "Logging is equivalent to tracing as long as you grep by timestamp, so the only real downside of console payment logs is compliance risk.",
              "isCorrect": false,
              "feedback": "Timestamps do not prove causality across services, and clocks skew. Without a shared ID and durations you cannot tie one slow request to one downstream RPC."
            },
            {
              "id": "tdq-observability-antipattern-3",
              "text": "The records carry no shared trace ID or per-hop duration, so the delay cannot be pinned on a downstream RPC, and card data leaks.",
              "isCorrect": true,
              "feedback": "Correct. Payload logs describe what happened, not where time was spent. Card data in logs also creates a PCI exposure."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Log Raw Customer Payment Records to Console Output\" get worse at 10x request volume?",
          "options": [
            {
              "id": "stq-observability-antipattern-1",
              "text": "Synchronous stdout writes block request threads once the pipe or log driver buffer fills, adding latency to the p99 under debug.",
              "isCorrect": true,
              "feedback": "Yes. Console logging is inline I/O. When the container log driver cannot drain fast enough, writers block and tail latency rises."
            },
            {
              "id": "stq-observability-antipattern-2",
              "text": "Console buffers live in RAM and silently discard the oldest lines when full, which actually reduces request latency as volume grows.",
              "isCorrect": false,
              "feedback": "Some drivers can drop logs, but blocking is the common failure, and dropping still leaves no diagnostic data. Neither reduces request latency."
            },
            {
              "id": "stq-observability-antipattern-3",
              "text": "The autoscaler reads log volume as a load signal and scales the gateway down to zero replicas while the surge is happening.",
              "isCorrect": false,
              "feedback": "Autoscalers use metrics like CPU or request rate, not log volume. This is not a real failure path."
            }
          ]
        }
      }
    ]
  },
  "auth-at-scale": {
    "patternId": "auth-at-scale",
    "incidentTitle": "100,000 req/s repeatedly query auth DB to validate session cookies",
    "primaryConstraintSummary": "Microservices must verify identity with sub-ms local overhead.",
    "recommendedOptionId": "opt-auth-at-scale-recommended",
    "options": [
      {
        "id": "opt-auth-at-scale-recommended",
        "title": "Stateless Asymmetric Signed JWTs with Public JWKS",
        "tagline": "Industry-standard architectural pattern for auth gateway database saturation.",
        "patternId": "auth-at-scale",
        "costEstimateDeltaUsd": 300,
        "latencyProfileMs": -120,
        "operationalComplexity": 2,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Scales throughput reliably under pressure",
          "Eliminates the single point of failure"
        ],
        "cons": [
          "Introduces distributed operational complexity",
          "Requires monitoring and automated alerting"
        ],
        "isRecommendedForConstraints": true,
        "tradeoffDefenseQuestion": {
          "question": "Why do \"Stateless Asymmetric Signed JWTs with Public JWKS\" fit 100,000 req/s that need sub-ms identity checks?",
          "options": [
            {
              "id": "tdq-auth-at-scale-recommended-1",
              "text": "Asymmetric signature checks are cheaper CPU than HMAC ones, so RS256 is the fastest verification method available.",
              "isCorrect": false,
              "feedback": "HMAC is faster than RSA or ECDSA verification. Asymmetric wins because verifiers hold only the public key and cannot mint tokens."
            },
            {
              "id": "tdq-auth-at-scale-recommended-2",
              "text": "Because services hold no session state, a stolen or revoked JWT stops working across every service on the very next request.",
              "isCorrect": false,
              "feedback": "Stateless means no server-side lookup, so a JWT stays valid until it expires unless you add a denylist. Short expiry is the mitigation."
            },
            {
              "id": "tdq-auth-at-scale-recommended-3",
              "text": "Each service verifies the signature locally with a cached JWKS public key, so no auth DB call sits on the hot path.",
              "isCorrect": true,
              "feedback": "Correct. Verification is pure CPU on a cached key, measured in microseconds, and only the issuer holds the private key to sign."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "When traffic grows 10x, what is a realistic first failure in \"Stateless Asymmetric Signed JWTs with Public JWKS\"?",
          "options": [
            {
              "id": "stq-auth-at-scale-recommended-1",
              "text": "On key rotation every instance sees an unknown kid and refetches the JWKS together, stampeding the issuer without jittered caches.",
              "isCorrect": true,
              "feedback": "Yes. Verification stays local, but rotation creates a synchronized cache miss across the fleet. Use stale-while-revalidate and overlap old and new keys."
            },
            {
              "id": "stq-auth-at-scale-recommended-2",
              "text": "The private key becomes the bottleneck because every request must be re-signed as it passes through each downstream service.",
              "isCorrect": false,
              "feedback": "Tokens are signed once at login or refresh, not per request. Request-path work is verification only."
            },
            {
              "id": "stq-auth-at-scale-recommended-3",
              "text": "Signature verification cost grows superlinearly with request count, so CPU saturates on every service well before the database would.",
              "isCorrect": false,
              "feedback": "Verification is constant cost per request, tens of microseconds, so it scales linearly and horizontally with instances."
            }
          ]
        }
      },
      {
        "id": "opt-auth-at-scale-alternative",
        "title": "Query Monolithic Auth Database on Every API Call",
        "tagline": "Alternative approach with higher operational cost or hardware bounds.",
        "patternId": "auth-at-scale",
        "costEstimateDeltaUsd": 1200,
        "latencyProfileMs": -40,
        "operationalComplexity": 4,
        "consistencyGuarantee": "Strict ACID",
        "durabilityTier": "Durable SSD",
        "pros": [
          "Simpler mental model in the short term",
          "Avoids changing existing application code"
        ],
        "cons": [
          "Quickly hits a hard vertical ceiling",
          "Significantly more expensive on monthly billing"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "When is \"Query Monolithic Auth Database on Every API Call\" a better choice than signed JWTs?",
          "options": [
            {
              "id": "tdq-auth-at-scale-alternative-1",
              "text": "When an indexed DB lookup is faster than verifying a signature locally, which holds for any well-tuned PostgreSQL over a network.",
              "isCorrect": false,
              "feedback": "A network round trip to a database costs hundreds of microseconds to milliseconds, which is slower than local signature verification in tens of microseconds."
            },
            {
              "id": "tdq-auth-at-scale-alternative-2",
              "text": "When a revoked session must fail on the very next request, as in a low-volume admin console, where a DB lookup per call is acceptable.",
              "isCorrect": true,
              "feedback": "Correct. A live lookup gives instant revocation. The price is a DB hit per call, which only works at modest request rates."
            },
            {
              "id": "tdq-auth-at-scale-alternative-3",
              "text": "When you must exceed 100k req/s without caching, since one database primary scales writes and reads horizontally.",
              "isCorrect": false,
              "feedback": "A single primary does not scale horizontally. Its connection pool and CPU cap the throughput of session lookups."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "What happens to \"Query Monolithic Auth Database on Every API Call\" when traffic grows another 5x?",
          "options": [
            {
              "id": "stq-auth-at-scale-alternative-1",
              "text": "The B-tree index on session ID becomes about 5x deeper, so each lookup takes five times as long and latency climbs linearly.",
              "isCorrect": false,
              "feedback": "B-tree depth grows logarithmically, so 5x more rows adds at most a level. Lookups stay fast; the constraint is connections."
            },
            {
              "id": "stq-auth-at-scale-alternative-2",
              "text": "Every session read forces a WAL fsync on the auth database, so disk IOPS is exhausted before connections or CPU are.",
              "isCorrect": false,
              "feedback": "Reads do not write WAL and never trigger an fsync. The pressure is connection slots and CPU, not disk writes."
            },
            {
              "id": "stq-auth-at-scale-alternative-3",
              "text": "The connection pool saturates and checks queue for seconds, and since every service depends on it, all APIs time out together.",
              "isCorrect": true,
              "feedback": "Yes. About 500k lookups/s exceeds max_connections, and because auth sits on every request path, one saturated DB becomes a total outage."
            }
          ]
        }
      },
      {
        "id": "opt-auth-at-scale-antipattern",
        "title": "Store User Passwords in Plaintext Browser Cookies",
        "tagline": "Naive mitigation that fails to address the root constraint.",
        "patternId": "auth-at-scale",
        "costEstimateDeltaUsd": 50,
        "latencyProfileMs": 150,
        "operationalComplexity": 1,
        "consistencyGuarantee": "Eventual Consistency",
        "durabilityTier": "Ephemeral (RAM)",
        "pros": [
          "Cheap and fast to configure",
          "No major infrastructure to provision"
        ],
        "cons": [
          "Fails to resolve the underlying bottleneck",
          "Risk of data corruption or client timeouts"
        ],
        "isRecommendedForConstraints": false,
        "tradeoffDefenseQuestion": {
          "question": "Why does \"Store User Passwords in Plaintext Browser Cookies\" not relieve the auth database load?",
          "options": [
            {
              "id": "tdq-auth-at-scale-antipattern-1",
              "text": "Browsers refuse to keep passwords in cookies, so the client never sends any credential back and every request arrives unauthenticated.",
              "isCorrect": false,
              "feedback": "Browsers will store and send any cookie value. The problem is what the server must then do with it."
            },
            {
              "id": "tdq-auth-at-scale-antipattern-2",
              "text": "Cookies are limited to 4KB each, so a password cannot fit inside one and authentication fails for every single client that logs in.",
              "isCorrect": false,
              "feedback": "A password easily fits in 4KB. The size limit is irrelevant to why this design fails."
            },
            {
              "id": "tdq-auth-at-scale-antipattern-3",
              "text": "The server must still look up and verify the credential each request, and a password hash check costs more CPU than a session lookup.",
              "isCorrect": true,
              "feedback": "Right. Nothing is cached or signed, so the DB is still consulted each time, and it also exposes passwords to XSS and network capture."
            }
          ]
        },
        "stressTest10xQuestion": {
          "question": "Why does \"Store User Passwords in Plaintext Browser Cookies\" collapse at 10x request volume?",
          "options": [
            {
              "id": "stq-auth-at-scale-antipattern-1",
              "text": "Browsers cap cookies at 50 per domain, so a 10x traffic increase evicts the older cookies and users are logged out mid-session.",
              "isCorrect": false,
              "feedback": "The per-domain cookie cap depends on the number of cookies set, not on request volume."
            },
            {
              "id": "stq-auth-at-scale-antipattern-2",
              "text": "Each request needs a password hash check such as bcrypt at roughly 100ms of CPU, so authentication CPU saturates and the tier melts.",
              "isCorrect": true,
              "feedback": "Yes. Deliberately slow hashes cost about 10 checks per second per core. At 1M req/s that is unaffordable, on top of the DB lookup."
            },
            {
              "id": "stq-auth-at-scale-antipattern-3",
              "text": "The Cookie header grows with traffic volume, pushing requests past the reverse proxy's header size limit and getting them rejected.",
              "isCorrect": false,
              "feedback": "Header size is fixed per user and independent of request rate, so volume does not push requests over that limit."
            }
          ]
        }
      }
    ]
  }
};

export function getTradeoffsForPattern(patternId: string): PatternTradeoffSet | undefined {
  return PATTERN_TRADEOFFS[patternId];
}
