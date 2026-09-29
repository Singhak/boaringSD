import type { DefensePoolPart } from "./types";

export const PART: DefensePoolPart = {
  "opt-cache-aside": [
    {
      tradeoffDefenseQuestion: {
        "question": "What consistency risk are you accepting by choosing Cache-Aside for this workload?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Stale entries: a reader can refill the cache with a value fetched just before a concurrent write; TTLs bound it.",
            "isCorrect": true,
            "feedback": "Correct: the read-then-populate race means a stale value can land after the delete, which a TTL eventually cleans up."
          },
          {
            "id": "tq-a2",
            "text": "Redis loses acknowledged writes on failover, so cache-aside can corrupt the rows stored in Postgres, which is the source of truth.",
            "isCorrect": false,
            "feedback": "Cache-aside writes go to Postgres first, so a Redis failover only costs cache entries, never the source of truth."
          },
          {
            "id": "tq-a3",
            "text": "Every write must wait for Redis to acknowledge before commit, so write latency doubles.",
            "isCorrect": false,
            "feedback": "In cache-aside the app writes to the database and just deletes the key; it does not block the commit on Redis."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "After a Redis restart empties the cache at 1,000,000 RPS, what hits the system first?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Key length grows with traffic, so hash collisions in the Redis keyspace start returning the wrong values to readers.",
            "isCorrect": false,
            "feedback": "Redis keys are looked up by exact match, and collisions do not scale with request rate."
          },
          {
            "id": "sq-a2",
            "text": "The Redis expiry cycle stops running above 500k ops per second, so old entries never leave the cache and go stale.",
            "isCorrect": false,
            "feedback": "Expiry is handled lazily and by a background sampler; it does not shut off at a request rate threshold."
          },
          {
            "id": "sq-a3",
            "text": "A cold cache turns nearly every read into a Postgres query; warm it up or ramp traffic.",
            "isCorrect": true,
            "feedback": "Correct: with zero hits every request is a miss, so the database sees full load until the hot set is repopulated."
          }
        ]
      },
    },
  ],
  "opt-read-replicas": [
    {
      tradeoffDefenseQuestion: {
        "question": "Which correctness risk do Read Replicas add that a single primary with a cache does not?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Replicas cannot use indexes or execute joins, so complex queries silently fall back to the primary.",
            "isCorrect": false,
            "feedback": "Hot standbys run the same planner and indexes as the primary; they do not fall back to it."
          },
          {
            "id": "tq-a2",
            "text": "A user can write, then read from a replica that has not replayed that commit yet and see old data.",
            "isCorrect": true,
            "feedback": "Correct: asynchronous replication lag causes read-after-write anomalies unless reads are routed carefully."
          },
          {
            "id": "tq-a3",
            "text": "Each write must be applied to every replica before the primary acknowledges it, so writes slow down.",
            "isCorrect": false,
            "feedback": "Postgres streaming replication is asynchronous by default, so commits do not wait for replicas."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "Under 10x reads, what happens to a replica that also runs a few long analytical queries?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Replicas switch to read-write mode once queued reads pass a threshold and start diverging from the primary.",
            "isCorrect": false,
            "feedback": "A hot standby stays read-only and never diverges because of load."
          },
          {
            "id": "sq-a2",
            "text": "Replica connections count against the primary's max_connections, so the primary runs out of slots.",
            "isCorrect": false,
            "feedback": "Replica sessions are separate servers with their own connection limits, not the primary's."
          },
          {
            "id": "sq-a3",
            "text": "Long queries clash with WAL replay: replay stalls and lag grows, or the queries are cancelled.",
            "isCorrect": true,
            "feedback": "Correct: hot standby must choose between delaying replay and cancelling the conflicting query."
          }
        ]
      },
    },
  ],
  "opt-scale-compute": [
    {
      tradeoffDefenseQuestion: {
        "question": "What is a better first fix than more web servers when requests wait on database locks?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Cut the work done in the database, for example by caching hot reads, adding indexes or pooling connections.",
            "isCorrect": true,
            "feedback": "Correct: reducing time spent in Postgres per request relieves the actual bottleneck instead of adding demand."
          },
          {
            "id": "tq-a2",
            "text": "Raise the autoscaling ceiling so queued requests spread across more idle web CPU and finish faster than they do today.",
            "isCorrect": false,
            "feedback": "The web tier is not the constraint; more nodes only push more concurrent work at the same locked tables."
          },
          {
            "id": "tq-a3",
            "text": "Move sessions from cookies into server memory so each node touches fewer database rows.",
            "isCorrect": false,
            "feedback": "Session placement does not change how many rows the queries lock, so the contention remains."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "At 10x traffic, what happens to p99 latency for requests that reach the saturated database?",
        "options": [
          {
            "id": "sq-a1",
            "text": "It stays flat, because the extra web servers each cache query plans locally and so take load off the database.",
            "isCorrect": false,
            "feedback": "Query plans are computed inside Postgres, and more app nodes do not lighten that load."
          },
          {
            "id": "sq-a2",
            "text": "It drops, since more nodes mean more parallel queries and a better shared buffers hit rate inside Postgres.",
            "isCorrect": false,
            "feedback": "More concurrent queries on the same resource increase contention rather than improving cache hits."
          },
          {
            "id": "sq-a3",
            "text": "Tail latency explodes: queueing delay grows nonlinearly as utilization nears 100%.",
            "isCorrect": true,
            "feedback": "Correct: waiting time rises steeply as a resource approaches saturation, so tail latency degrades first."
          }
        ]
      },
    },
  ],
  "opt-l7-lb": [
    {
      tradeoffDefenseQuestion: {
        "question": "What can a Layer 7 balancer do that a plain Layer 4 TCP balancer cannot?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Deliver packets faster, since it works below the IP layer and skips connection tracking.",
            "isCorrect": false,
            "feedback": "L7 inspects application data, so it does more work per connection than L4, not less."
          },
          {
            "id": "tq-a2",
            "text": "Guarantee zero dropped requests, because it replicates each acknowledgement to a standby before forwarding.",
            "isCorrect": false,
            "feedback": "No standard L7 balancer replicates every request to a standby; that would add latency and still not guarantee delivery."
          },
          {
            "id": "tq-a3",
            "text": "Route by URL path, headers or cookies, terminate TLS, and retry idempotent requests on another backend.",
            "isCorrect": true,
            "feedback": "Correct: reading the HTTP layer enables content-based routing, TLS termination and smarter retries."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "If the single L7 load balancer instance itself crashes at 500k RPS, what is the impact?",
        "options": [
          {
            "id": "sq-a1",
            "text": "All traffic fails despite healthy backends; run 2+ balancers with a floating IP or anycast.",
            "isCorrect": true,
            "feedback": "Correct: one balancer is a single point of failure, so redundancy is needed on the entry tier as well."
          },
          {
            "id": "sq-a2",
            "text": "Browsers bypass it by caching the backend IPs from the first response they received, so traffic keeps flowing.",
            "isCorrect": false,
            "feedback": "Clients only know the balancer's address and do not learn backend IPs from responses."
          },
          {
            "id": "sq-a3",
            "text": "Backends elect a leader to accept traffic directly, so only about 10% of requests are lost.",
            "isCorrect": false,
            "feedback": "Backends do not self-organize into an entry point; without another balancer nothing accepts the traffic."
          }
        ]
      },
    },
  ],
  "opt-dns-round-robin": [
    {
      tradeoffDefenseQuestion: {
        "question": "Why does lowering the DNS TTL to 30 seconds not fully solve failover for round-robin?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Many resolvers and clients cache beyond the TTL, so some users keep hitting a dead IP for minutes.",
            "isCorrect": true,
            "feedback": "Correct: TTLs are advisory for caches, and clients often hold connections or addresses far longer."
          },
          {
            "id": "tq-a2",
            "text": "DNS rejects TTLs under 60 seconds, so the record silently reverts to the one-hour default.",
            "isCorrect": false,
            "feedback": "The DNS protocol allows very short TTLs; the problem is that not every cache honors them."
          },
          {
            "id": "tq-a3",
            "text": "The TTL only affects billing at the DNS provider and has no effect on how long clients and resolvers cache records.",
            "isCorrect": false,
            "feedback": "TTL exists to control how long resolvers may cache a record, so it does affect caching, just not reliably."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "With four round-robin IPs at 10x load, one server dies. What do users see?",
        "options": [
          {
            "id": "sq-a1",
            "text": "DNS notices the dead server and drops its IP from the answer instantly, so users see only a slight blip.",
            "isCorrect": false,
            "feedback": "Plain round-robin has no health checks, so the record keeps handing out the dead address."
          },
          {
            "id": "sq-a2",
            "text": "About a quarter of new connections keep timing out, and retries hit the survivors.",
            "isCorrect": true,
            "feedback": "Correct: traffic keeps being sent to the dead IP, and the retry load can overload the remaining servers."
          },
          {
            "id": "sq-a3",
            "text": "The other three absorb load evenly because resolvers rebalance answers by observed latency.",
            "isCorrect": false,
            "feedback": "Resolvers do not measure server latency to reshape answers, so nothing rebalances the traffic."
          }
        ]
      },
    },
  ],
  "opt-hardcoded-ips": [
    {
      tradeoffDefenseQuestion: {
        "question": "What is a small step up from hardcoded IPs that needs no new infrastructure?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Ship a hostname and use DNS with a low TTL, so the IPs behind it change without a client release.",
            "isCorrect": true,
            "feedback": "Correct: indirection through DNS lets operators swap servers without touching clients."
          },
          {
            "id": "tq-a2",
            "text": "Add more IPs to the client list; clients automatically detect and skip the dead ones, so no release is needed.",
            "isCorrect": false,
            "feedback": "A static list has no health detection unless you build client logic, and it still needs a release to change."
          },
          {
            "id": "tq-a3",
            "text": "Move the IPs to a config file bundled inside the app so updating the file remaps them.",
            "isCorrect": false,
            "feedback": "A bundled file still ships with the app build, so every change still needs a client release."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "During the surge one hardcoded server dies. What do clients experience?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The remaining servers detect the failure and take over the dead IP with automatic failover.",
            "isCorrect": false,
            "feedback": "Taking over an IP requires floating IP tooling that is not implied by hardcoded addresses."
          },
          {
            "id": "sq-a2",
            "text": "Requests to that IP time out until client retries or a new release avoid it.",
            "isCorrect": true,
            "feedback": "Correct: nothing on the server side can redirect clients that address the dead machine directly."
          },
          {
            "id": "sq-a3",
            "text": "The dead server's neighbors notice and send clients redirects pointing at the healthy servers.",
            "isCorrect": false,
            "feedback": "A crashed server cannot answer, so it cannot send any redirect."
          }
        ]
      },
    },
  ],
  "opt-horizontal-scaling-recommended": [
    {
      tradeoffDefenseQuestion: {
        "question": "Why must the fleet be stateless for autoscaling to work safely?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Stateful nodes cannot receive IP addresses from the autoscaler, so they never register with the load balancer.",
            "isCorrect": false,
            "feedback": "Statefulness has no bearing on IP assignment or load balancer registration."
          },
          {
            "id": "tq-a2",
            "text": "Any node must handle any request, so session state lives in a shared store and nodes can join, leave or die freely.",
            "isCorrect": true,
            "feedback": "Correct: statelessness lets you add and remove nodes without losing users or pinning them to one machine."
          },
          {
            "id": "tq-a3",
            "text": "Stateless code runs fewer instructions per request, so each node absorbs more traffic before scaling.",
            "isCorrect": false,
            "feedback": "Statelessness changes where state lives, not how many CPU cycles each request costs."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "During a 10x spike, what can cause the autoscaling fleet to thrash instead of stabilize?",
        "options": [
          {
            "id": "sq-a1",
            "text": "New nodes join the pool before warm-up, take a full share, fail health checks and get replaced in a loop.",
            "isCorrect": true,
            "feedback": "Correct: cold nodes given full traffic time out, get killed, and the churn keeps capacity from stabilizing."
          },
          {
            "id": "sq-a2",
            "text": "The load balancer marks nodes unhealthy whenever CPU passes 50%, so the fleet shrinks under load.",
            "isCorrect": false,
            "feedback": "Health checks probe responsiveness, not a CPU threshold, so this is not standard behavior."
          },
          {
            "id": "sq-a3",
            "text": "Autoscalers never grow the fleet beyond 2x its current size in total, so the spike stays permanently truncated and unserved.",
            "isCorrect": false,
            "feedback": "Autoscalers can add capacity in repeated steps, so a cap on one step does not cap total size."
          }
        ]
      },
    },
  ],
  "opt-horizontal-scaling-alternative": [
    {
      tradeoffDefenseQuestion: {
        "question": "What operational cost does the single 64-core machine bring for routine maintenance?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Every kernel patch or restart is a full outage; there is no second node to take traffic.",
            "isCorrect": false,
            "feedback": "Bare metal is typically billed as a fixed instance price, not by cycles consumed."
          },
          {
            "id": "tq-a2",
            "text": "Every kernel patch or restart takes the whole service down because there is no second node to shift traffic to.",
            "isCorrect": true,
            "feedback": "Correct: a single host makes maintenance a full outage unless you add a standby."
          },
          {
            "id": "tq-a3",
            "text": "It cannot run containers, so each deploy needs a full OS reimage and a manual hardware reboot cycle.",
            "isCorrect": false,
            "feedback": "Bare metal runs containers fine; this is not a real limitation."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "The 64-core host fails while traffic is 5x higher. How long is the recovery?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Traffic fails over to spare cores inside the chassis within milliseconds.",
            "isCorrect": false,
            "feedback": "Cores in one chassis share the failure domain, so a host failure takes all of them at once."
          },
          {
            "id": "sq-a2",
            "text": "Nothing happens, because the provider live-migrates the workload with no downtime.",
            "isCorrect": false,
            "feedback": "Live migration does not rescue a machine that has already failed without a standby."
          },
          {
            "id": "sq-a3",
            "text": "Everything is down until a replacement is provisioned or restored.",
            "isCorrect": true,
            "feedback": "Correct: one failure domain means full outage until a new machine and its state are ready."
          }
        ]
      },
    },
  ],
  "opt-horizontal-scaling-antipattern": [
    {
      tradeoffDefenseQuestion: {
        "question": "In which situation would response compression actually help?",
        "options": [
          {
            "id": "tq-a1",
            "text": "When CPU is saturated, since compression offloads the work to the NIC hardware and frees the main CPU.",
            "isCorrect": false,
            "feedback": "Nginx compression runs in software on the same CPU, so it adds load in a CPU-bound case."
          },
          {
            "id": "tq-a2",
            "text": "When bandwidth is the limit and CPU has headroom, such as large text responses over slow links.",
            "isCorrect": true,
            "feedback": "Correct: compression trades CPU for fewer bytes, which pays off only if bytes are the scarce resource."
          },
          {
            "id": "tq-a3",
            "text": "When responses are JPEGs, since gzip shrinks them by about half.",
            "isCorrect": false,
            "feedback": "JPEG data is already compressed, so gzip gives negligible savings."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "At 10x traffic, which monitoring signature fits the compression change?",
        "options": [
          {
            "id": "sq-a1",
            "text": "CPU near 100% with a growing run queue and rising p99 latency, while bytes out look lower.",
            "isCorrect": true,
            "feedback": "Correct: bytes shrink but the CPU-bound node queues work, so latency and timeouts climb."
          },
          {
            "id": "sq-a2",
            "text": "Network egress pinned at line rate while CPU sits mostly idle and latency stays low across all requests.",
            "isCorrect": false,
            "feedback": "Compression reduces egress, and the node in question is CPU-bound, so this is the opposite picture."
          },
          {
            "id": "sq-a3",
            "text": "Memory swap climbs steadily because compressed buffers are cached forever in the worker processes.",
            "isCorrect": false,
            "feedback": "Compression buffers are short-lived and not kept forever, and swap is not the primary symptom."
          }
        ]
      },
    },
  ],
  "opt-read-replicas-recommended": [
    {
      tradeoffDefenseQuestion: {
        "question": "How should the app route a user's read right after that user writes?",
        "options": [
          {
            "id": "tq-a1",
            "text": "To any random replica, because streaming replication applies each commit before acknowledging the write.",
            "isCorrect": false,
            "feedback": "Streaming replication is asynchronous by default, so the replica may not have applied the commit yet."
          },
          {
            "id": "tq-a2",
            "text": "To every replica in turn until one returns the row, at the cost of extra load.",
            "isCorrect": false,
            "feedback": "Probing replicas multiplies read load and still gives no guarantee about freshness."
          },
          {
            "id": "tq-a3",
            "text": "To the primary, or a replica caught up to that commit, for a short window while other reads go to replicas.",
            "isCorrect": true,
            "feedback": "Correct: read-your-writes routing keeps the just-written row visible while most reads stay offloaded."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "At 10x reads, one replica's lag reaches five seconds. What should the router do?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Take it out of rotation until it catches up, sending its reads to the others.",
            "isCorrect": true,
            "feedback": "Correct: lag-aware health checks stop stale reads and let the healthy replicas absorb the traffic."
          },
          {
            "id": "sq-a2",
            "text": "Keep routing to it, since replication lag only ever affects writes on the primary, not reads.",
            "isCorrect": false,
            "feedback": "Lag means the replica serves old data, so reads from it become stale."
          },
          {
            "id": "sq-a3",
            "text": "Promote it to primary so it stops replaying WAL and can serve current data to readers.",
            "isCorrect": false,
            "feedback": "Promoting a lagging replica would discard writes it has not received and create a split brain."
          }
        ]
      },
    },
  ],
  "opt-read-replicas-alternative": [
    {
      tradeoffDefenseQuestion: {
        "question": "What evidence would justify upgrading the primary's NVMe storage as the fix?",
        "options": [
          {
            "id": "tq-a1",
            "text": "CPU at 96% with low iowait and few buffer cache misses, meaning the queries are compute-bound and CPU-limited.",
            "isCorrect": false,
            "feedback": "Compute-bound queries do not speed up with faster storage."
          },
          {
            "id": "tq-a2",
            "text": "High iowait and buffer cache misses with slow disk read latency, while CPU is not saturated.",
            "isCorrect": true,
            "feedback": "Correct: storage latency is the bottleneck only when the CPU waits on disk instead of working."
          },
          {
            "id": "tq-a3",
            "text": "Replication lag above 100ms on standbys, since faster primary disks shorten standby replay.",
            "isCorrect": false,
            "feedback": "Standby replay speed depends on the standby, so a faster primary disk does not fix lag there."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "The lone primary fails while reads are 5x higher. What is the recovery story?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The NVMe drives mirror to a hidden standby, so Postgres restarts on the twin with no data loss.",
            "isCorrect": false,
            "feedback": "A single-drive upgrade adds no hidden standby; mirroring requires separate hardware and setup."
          },
          {
            "id": "sq-a2",
            "text": "High iowait, buffer cache misses and slow disk read latency, while CPU is not saturated and queries wait on storage.",
            "isCorrect": true,
            "feedback": "Correct: the design has one copy of the running database, so failover requires rebuilding it."
          },
          {
            "id": "sq-a3",
            "text": "The app reads directly from the write-ahead log files until the primary returns.",
            "isCorrect": false,
            "feedback": "Applications cannot read WAL files as a query source; only a running database serves queries."
          }
        ]
      },
    },
  ],
  "opt-read-replicas-antipattern": [
    {
      tradeoffDefenseQuestion: {
        "question": "What new cost does sharding add to reads that do not include the shard key?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Every read first needs a global lock table lookup, adding a round trip.",
            "isCorrect": false,
            "feedback": "Shards do not need a global lock table for reads."
          },
          {
            "id": "tq-a2",
            "text": "Sharded tables lose their indexes, so all reads become sequential scans.",
            "isCorrect": false,
            "feedback": "Each shard keeps its own indexes, so queries by key still use them."
          },
          {
            "id": "tq-a3",
            "text": "They fan out to all shards and merge the results, and cross-shard joins get expensive.",
            "isCorrect": true,
            "feedback": "Correct: without the shard key the router cannot pick one host, so it queries every shard."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "What operational pain grows as the sharded cluster must expand under 10x reads?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Rebalancing: adding shards means migrating live rows with dual writes and careful cutover.",
            "isCorrect": true,
            "feedback": "Correct: moving data between shards while serving traffic is risky and slow."
          },
          {
            "id": "sq-a2",
            "text": "Shard count is capped at the CPU socket count of the first host, so capacity beyond it is refused.",
            "isCorrect": false,
            "feedback": "Shards live on separate hosts and are not bounded by one host's sockets."
          },
          {
            "id": "sq-a3",
            "text": "Each new shard rewrites the primary's WAL history, so old data is lost.",
            "isCorrect": false,
            "feedback": "Adding a shard does not rewrite WAL or delete historical data."
          }
        ]
      },
    },
  ],
  "opt-cdn-edge-recommended": [
    {
      tradeoffDefenseQuestion: {
        "question": "How should you roll out an updated photo that is already cached at edge PoPs?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Set the global TTL to 1 second so edges always fetch the latest photo.",
            "isCorrect": false,
            "feedback": "A tiny TTL sends most requests back to origin and defeats the reason for using a CDN."
          },
          {
            "id": "tq-a2",
            "text": "Purge the URL from every PoP each time, since purges are instant and free at any volume.",
            "isCorrect": false,
            "feedback": "Purges are rate limited and take time to propagate, so relying on them at volume is fragile."
          },
          {
            "id": "tq-a3",
            "text": "Publish it under a new versioned or content-hashed URL, so nothing needs purging and old copies just expire.",
            "isCorrect": true,
            "feedback": "Correct: a new URL is a new cache key, and old copies simply expire while long TTLs stay in place."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "At 10x image traffic, which metric first shows the CDN is being overwhelmed?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The number of anycast routes, since more routes mean more PoPs are serving.",
            "isCorrect": false,
            "feedback": "Route count reflects network topology, not whether requests are being served from cache."
          },
          {
            "id": "sq-a2",
            "text": "Cache hit ratio and origin request rate; a falling ratio means traffic is leaking to the origin.",
            "isCorrect": true,
            "feedback": "Correct: misses turn into origin fetches, so the ratio shows the origin load before it fails."
          },
          {
            "id": "sq-a3",
            "text": "The DNS TTL at the CDN, which shrinks automatically as load rises.",
            "isCorrect": false,
            "feedback": "CDNs do not shrink TTLs automatically with load, and TTL is not a health signal."
          }
        ]
      },
    },
  ],
  "opt-cdn-edge-alternative": [
    {
      tradeoffDefenseQuestion: {
        "question": "What does doubling origin egress still leave unsolved for overseas users?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Propagation delay: distance sets the round trip time.",
            "isCorrect": true,
            "feedback": "Correct: bandwidth adds capacity, but latency across oceans is set by distance and round trips."
          },
          {
            "id": "tq-a2",
            "text": "Nothing, because bandwidth is the only factor that determines latency.",
            "isCorrect": false,
            "feedback": "Latency depends on distance and round trips as well as bandwidth."
          },
          {
            "id": "tq-a3",
            "text": "Image format, since a wider link cannot serve WebP files.",
            "isCorrect": false,
            "feedback": "Link width does not restrict which image formats can be served."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "At 5x traffic, how does the bill for the doubled-origin design scale?",
        "options": [
          {
            "id": "sq-a1",
            "text": "It stays fixed, because the doubled bandwidth was prepaid for the whole term.",
            "isCorrect": false,
            "feedback": "Egress is typically metered by bytes served, so more traffic means a bigger bill."
          },
          {
            "id": "sq-a2",
            "text": "It grows roughly linearly, since every view is served from origin with no cached hits to absorb it.",
            "isCorrect": true,
            "feedback": "Correct: without an edge cache each view costs origin egress, unlike a CDN where hits are cheap."
          },
          {
            "id": "sq-a3",
            "text": "It falls, since browsers stop re-requesting images once the link is bigger.",
            "isCorrect": false,
            "feedback": "Browser caching depends on cache headers, not on the size of the origin link."
          }
        ]
      },
    },
  ],
  "opt-cdn-edge-antipattern": [
    {
      tradeoffDefenseQuestion: {
        "question": "How does inlining Base64 images hurt time to first render for overseas users?",
        "options": [
          {
            "id": "tq-a1",
            "text": "The HTML becomes very large, so the first paint waits until image bytes cross the ocean.",
            "isCorrect": true,
            "feedback": "Correct: images embedded in the HTML delay the document that everything else depends on."
          },
          {
            "id": "tq-a2",
            "text": "Every data URI opens a new TCP connection to the origin, adding a handshake per image.",
            "isCorrect": false,
            "feedback": "Data URIs are part of the document and do not open extra connections."
          },
          {
            "id": "tq-a3",
            "text": "Decoding Base64 happens on the origin server for each request, which blocks its worker threads and delays the first byte.",
            "isCorrect": false,
            "feedback": "Decoding happens in the browser, and there is no CDN edge involved in this design."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "At 10x traffic, what do slow mobile users experience with inlined images?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Nothing, since inlined images bypass the network entirely after the first load.",
            "isCorrect": false,
            "feedback": "Inline bytes are in the HTML, which is downloaded again on each view unless the whole page is cached."
          },
          {
            "id": "sq-a2",
            "text": "Browsers throttle data URIs to 1 KB per second once traffic spikes.",
            "isCorrect": false,
            "feedback": "Browsers do not throttle data URIs by traffic level."
          },
          {
            "id": "sq-a3",
            "text": "Timeouts and abandoned pages, since bloated HTML must fully download and retries fetch it all again.",
            "isCorrect": true,
            "feedback": "Correct: larger HTML plus retries multiplies bytes moved over weak connections."
          }
        ]
      },
    },
  ],
  "opt-async-queues-recommended": [
    {
      tradeoffDefenseQuestion: {
        "question": "What must the invoice workers do to stay safe under at-least-once delivery?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Nothing, since brokers redeliver only after a crash and that cannot create duplicates.",
            "isCorrect": false,
            "feedback": "A redelivery after a slow acknowledgement can duplicate work even when nothing crashed."
          },
          {
            "id": "tq-a2",
            "text": "Make the job idempotent, for example keyed by order ID, so a redelivered message creates no second PDF or email.",
            "isCorrect": true,
            "feedback": "Correct: idempotent handlers make duplicates harmless."
          },
          {
            "id": "tq-a3",
            "text": "Acknowledge before rendering so a message is never redelivered.",
            "isCorrect": false,
            "feedback": "Acknowledging first means a crash mid-render loses the invoice, trading duplicates for lost work."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "One order's data crashes the renderer on every attempt. What happens to the queue?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The broker drops it after one failed attempt automatically, so no action is needed from the team.",
            "isCorrect": false,
            "feedback": "Brokers redeliver until a policy limit; they do not drop after one failure by default."
          },
          {
            "id": "sq-a2",
            "text": "It retries forever; cap attempts, use a dead-letter queue and alert.",
            "isCorrect": true,
            "feedback": "Correct: poison messages need bounded retries and a place for humans to inspect them."
          },
          {
            "id": "sq-a3",
            "text": "It halts the entire broker until an operator manually deletes the offending message.",
            "isCorrect": false,
            "feedback": "A poison message affects the consumers that process it, not the broker as a whole."
          }
        ]
      },
    },
  ],
  "opt-async-queues-alternative": [
    {
      tradeoffDefenseQuestion: {
        "question": "How would you see how many invoices are pending under the thread-based design?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Pending work is spread across pod memories, so no single number exists, unlike queue depth and age.",
            "isCorrect": true,
            "feedback": "Correct: an in-process backlog is invisible from outside, while a broker exposes depth and age."
          },
          {
            "id": "tq-a2",
            "text": "The load balancer reports pending invoice counts across all pods through its health check statistics page.",
            "isCorrect": false,
            "feedback": "Load balancers see connections and requests, not jobs held in memory inside pods."
          },
          {
            "id": "tq-a3",
            "text": "Each pod automatically publishes its backlog into the database.",
            "isCorrect": false,
            "feedback": "That only happens if you build it, which amounts to writing your own queue."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "During a rolling deploy at 5x traffic, what happens to invoice threads still running?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Kubernetes waits indefinitely for threads to finish before terminating the pod.",
            "isCorrect": false,
            "feedback": "Pods get a bounded grace period after which they are killed."
          },
          {
            "id": "sq-a2",
            "text": "The threads migrate to the new pods together with their in-memory queue.",
            "isCorrect": false,
            "feedback": "In-memory state does not move between processes when a pod is replaced."
          },
          {
            "id": "sq-a3",
            "text": "Pods get SIGTERM, and unless drained within the grace period, in-flight and pending invoices are lost.",
            "isCorrect": true,
            "feedback": "Correct: the backlog lives in process memory, so it vanishes when the pod is terminated."
          }
        ]
      },
    },
  ],
  "opt-async-queues-antipattern": [
    {
      tradeoffDefenseQuestion: {
        "question": "What would actually fix the checkout stall, instead of a longer timeout?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Return quickly with 202 Accepted and render the PDF outside the request, for example via a job queue.",
            "isCorrect": true,
            "feedback": "Correct: moving the render off the request path frees threads and connections."
          },
          {
            "id": "tq-a2",
            "text": "Add client retries with backoff so failed checkouts resubmit until a render finishes.",
            "isCorrect": false,
            "feedback": "Retries add more renders to an already exhausted pool and can duplicate orders."
          },
          {
            "id": "tq-a3",
            "text": "Raise the server thread pool size to match the 300 second wait.",
            "isCorrect": false,
            "feedback": "A bigger pool only delays exhaustion, and each stuck thread still costs memory and connections."
          }
        ]
      },
      stressTest10xQuestion: {
        "question": "What happens to orders when impatient users retry a stuck checkout?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Retries are deduplicated by HTTP keep-alive, so the server only sees one.",
            "isCorrect": false,
            "feedback": "Keep-alive reuses a connection but does not deduplicate requests."
          },
          {
            "id": "sq-a2",
            "text": "Retries are harmless because the longer timeout makes the load balancer cache the first response.",
            "isCorrect": false,
            "feedback": "Load balancers do not cache POST checkout responses in this way."
          },
          {
            "id": "sq-a3",
            "text": "Retries add more renders to the stuck pool, and without idempotency keys users may be charged twice.",
            "isCorrect": true,
            "feedback": "Correct: retries amplify load and can duplicate side effects without idempotency."
          }
        ]
      },
    },
  ],
};
