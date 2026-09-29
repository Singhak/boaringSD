import type { DefensePoolPart } from "./types";

export const PART: DefensePoolPart = {
  "opt-sharding-recommended": [
    {
      "tradeoffDefenseQuestion": {
        "question": "How should tenants map to physical shards so you can add shards later without re-hashing every row?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Hash tenant_id to a large fixed set of logical buckets, and map buckets to shards, so growth moves whole buckets.",
            "isCorrect": true,
            "feedback": "Correct. A stable bucket-to-shard map means adding a shard relocates only some buckets, online, while routing stays a simple lookup."
          },
          {
            "id": "tq-a2",
            "text": "Use tenant_id modulo the current shard count, since the same formula keeps working when the count changes.",
            "isCorrect": false,
            "feedback": "Changing the divisor remaps almost every tenant, which forces a near-total data move. That is why a fixed bucket layer is used."
          },
          {
            "id": "tq-a3",
            "text": "Range-partition tenant_id so new tenants always fill the newest shard and old shards never need to move.",
            "isCorrect": false,
            "feedback": "Sequential ranges send all new writes to one shard, creating a hot spot, and old ranges can still outgrow their node."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "At 10x traffic, which kind of query gets slowest under \"Hash Sharding by Tenant ID\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Single-tenant lookups, because the router must ask every shard which one holds the tenant, adding a hop.",
            "isCorrect": false,
            "feedback": "Routing is a deterministic hash or map lookup on tenant_id, so single-tenant queries touch exactly one shard and stay fast."
          },
          {
            "id": "sq-a2",
            "text": "Cross-tenant reports and admin queries, which fan out to every shard and wait for the slowest one.",
            "isCorrect": true,
            "feedback": "Correct. Scatter-gather latency is set by the slowest shard and the load multiplies by shard count, so these need a separate analytics copy."
          },
          {
            "id": "sq-a3",
            "text": "Tenant-scoped transactions, because each one now needs a two-phase commit across all shards.",
            "isCorrect": false,
            "feedback": "A transaction scoped to one tenant lives on one shard and commits locally. Distributed commit only appears for cross-tenant writes."
          }
        ]
      }
    }
  ],
  "opt-sharding-alternative": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What makes \"Vertical Partitioning by Table Columns\" cheaper to adopt than sharding by tenant?",
        "options": [
          {
            "id": "tq-a1",
            "text": "It moves cold columns to cheaper storage tiers automatically, which cuts the bill more than adding shards would.",
            "isCorrect": false,
            "feedback": "Partitioning by column does not tier storage by itself. Any tiering is a separate feature, and the data still lives on one node."
          },
          {
            "id": "tq-a2",
            "text": "It splits data by tenant, so each migration copies only a small share of rows at a time.",
            "isCorrect": false,
            "feedback": "Vertical partitioning splits columns, not tenants. Every tenant's rows stay together in each column group."
          },
          {
            "id": "tq-a3",
            "text": "Every query still goes to one database, so no routing layer is needed and joins between column groups stay local.",
            "isCorrect": true,
            "feedback": "Correct. The split is a schema change on one node. There is no shard key, no router and no cross-node transaction to introduce."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "At 5x traffic, what cost grows on reads that need columns from both partitions of \"Vertical Partitioning by Table Columns\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Each such read needs a second lookup or join by primary key, adding round trips on the hot path.",
            "isCorrect": true,
            "feedback": "Correct. Reassembling a row from two tables costs extra I/O per read, and that overhead scales with request volume."
          },
          {
            "id": "sq-a2",
            "text": "Every read needs a distributed transaction coordinator, because the column groups live on different nodes.",
            "isCorrect": false,
            "feedback": "The column groups stay on the same node, so no distributed coordinator is involved. The cost is the extra join, not cross-node commits."
          },
          {
            "id": "sq-a3",
            "text": "The router re-hashes each request across all tenants, so latency rises with the tenant count.",
            "isCorrect": false,
            "feedback": "There is no router or hash here. Vertical partitioning changes the schema, not how requests are distributed."
          }
        ]
      }
    }
  ],
  "opt-sharding-antipattern": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What risk does \"Single Monolithic Database Instance Upsize\" leave for a 12 TB dataset, beyond raw throughput?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Very large instances cannot run replication, so the database has no standby at all.",
            "isCorrect": false,
            "feedback": "Large instances support replicas like any other. The issue is how long a failover or rebuild takes with that much data."
          },
          {
            "id": "tq-a2",
            "text": "Restoring 12 TB takes hours, so one node failure stops every tenant at once.",
            "isCorrect": true,
            "feedback": "Correct. A single volume means a single blast radius, and recovery time grows with data size regardless of instance size."
          },
          {
            "id": "tq-a3",
            "text": "Cloud providers throttle disks above 8 TB, so extra storage is slower than the first 8 TB.",
            "isCorrect": false,
            "feedback": "Larger volumes normally get more IOPS and throughput, not less. The concern is recovery time and blast radius."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "When data grows 10x on \"Single Monolithic Database Instance Upsize\", what happens to routine maintenance?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Autovacuum is switched off on large instances, so table bloat grows without limit.",
            "isCorrect": false,
            "feedback": "Large instances keep autovacuum on. The trouble is that it has far more data to process."
          },
          {
            "id": "sq-a2",
            "text": "Index sizes shrink as the table grows, because the planner merges tenants into fewer pages.",
            "isCorrect": false,
            "feedback": "Indexes grow with the table. Nothing merges tenants into fewer pages, so maintenance gets heavier."
          },
          {
            "id": "sq-a3",
            "text": "Vacuum, index builds and schema changes on giant tables run for hours and slow live writes.",
            "isCorrect": true,
            "feedback": "Correct. Maintenance work scales with table size on the same single node, so it steals the IOPS that live traffic needs."
          }
        ]
      }
    }
  ],
  "opt-consistency-recommended": [
    {
      "tradeoffDefenseQuestion": {
        "question": "How should the atomic decrement be paired with payment so abandoned carts do not lock stock forever?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Treat the decrement as a reservation with a TTL, and release it if payment fails or times out.",
            "isCorrect": true,
            "feedback": "Correct. The atomic step guarantees no oversell, and the expiry returns abandoned units to sellable stock."
          },
          {
            "id": "tq-a2",
            "text": "Decrement only after the payment is captured, because that keeps the counter free of pending holds.",
            "isCorrect": false,
            "feedback": "Deciding stock after payment reopens the race: many buyers pay, then some find nothing left and need refunds."
          },
          {
            "id": "tq-a3",
            "text": "Never restore stock automatically, and let a nightly job correct the counter after failed payments.",
            "isCorrect": false,
            "feedback": "Without automatic release, abandoned carts hide real stock for hours and the store sells out while units are unsold."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "When the Redis primary holding the stock counter fails over at peak, what is the risk for \"Linearizable Quorum or Atomic Lua Decrement\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The Lua script replays on the replica, so every decrement is applied twice and stock drops too fast.",
            "isCorrect": false,
            "feedback": "Replicas receive the resulting writes, and failover does not replay scripts. Double decrement is not the failure mode."
          },
          {
            "id": "sq-a2",
            "text": "The promoted replica may lack the latest decrements, so it shows extra stock and can oversell.",
            "isCorrect": true,
            "feedback": "Correct. Redis replicates asynchronously, so recent writes can be lost on failover. Use WAIT, a quorum store or a post-failover recount."
          },
          {
            "id": "sq-a3",
            "text": "The counter freezes at zero until an operator resets it, so all purchases are refused.",
            "isCorrect": false,
            "feedback": "A failover promotes a replica with a real, if slightly stale, value. It does not reset the counter to zero."
          }
        ]
      }
    }
  ],
  "opt-consistency-alternative": [
    {
      "tradeoffDefenseQuestion": {
        "question": "Which page is a reasonable use of \"Async Replication with Client-Side Retry Loops\" in a shop?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Confirming remaining stock at the final checkout click, since retries will catch any stale number.",
            "isCorrect": false,
            "feedback": "Retries re-read the same lagging replicas, so a stale count can still pass the check at the moment it matters most."
          },
          {
            "id": "tq-a2",
            "text": "Deducting a wallet balance just before charging, since retries reconcile the value between replicas.",
            "isCorrect": false,
            "feedback": "Money movement needs a single authoritative balance. A stale replica read could allow a double spend."
          },
          {
            "id": "tq-a3",
            "text": "Rendering product descriptions and reviews, where a slightly stale replica is harmless.",
            "isCorrect": true,
            "feedback": "Correct. Staleness is harmless when a slightly old value costs nothing, unlike stock or balances."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "As traffic grows another 5x, what do shoppers see with \"Async Replication with Client-Side Retry Loops\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Retries land on replicas with different lag, so the displayed stock jumps up and down between refreshes.",
            "isCorrect": true,
            "feedback": "Correct. Each replica applies writes at its own pace, so successive reads can return different, inconsistent values."
          },
          {
            "id": "sq-a2",
            "text": "Retries trigger read repair, so every replica converges to the true stock after the first failed attempt.",
            "isCorrect": false,
            "feedback": "A client retry only re-reads. It does not push data between replicas, so it cannot force convergence."
          },
          {
            "id": "sq-a3",
            "text": "Replicas apply writes out of order, so the counter permanently ends below zero after the sale.",
            "isCorrect": false,
            "feedback": "Replicas apply the primary's log in order. The visible problem is stale, varying reads rather than a corrupted final value."
          }
        ]
      }
    }
  ],
  "opt-consistency-antipattern": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What is \"Periodic Cron Reconciliation Batch Script\" actually good for in a flash sale?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Preventing oversells, because it corrects each stock count before the next buyer reads it.",
            "isCorrect": false,
            "feedback": "It runs on a schedule, not per purchase, so buyers still read uncorrected counts between runs."
          },
          {
            "id": "tq-a2",
            "text": "Detecting drift after the fact, such as measuring how many orders were oversold.",
            "isCorrect": true,
            "feedback": "Correct. Reconciliation is an audit and repair step. It tells you what went wrong but cannot stop it happening."
          },
          {
            "id": "tq-a3",
            "text": "Guaranteeing that order confirmation emails always show the right stock at send time.",
            "isCorrect": false,
            "feedback": "Emails go out at purchase time, before any batch job runs, so the job cannot make them accurate."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "At 10x flash-sale traffic, what happens to the reconciliation job itself in \"Periodic Cron Reconciliation Batch Script\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "It finishes faster, because a sold-out SKU has fewer distinct rows left to compare.",
            "isCorrect": false,
            "feedback": "Sold-out items still carry every order row. Volume of orders, not remaining stock, drives the scan."
          },
          {
            "id": "sq-a2",
            "text": "The primary rejects its correction writes, because they conflict with checkout's live writes.",
            "isCorrect": false,
            "feedback": "Correction writes are ordinary updates and are not rejected. They just arrive long after the oversell."
          },
          {
            "id": "sq-a3",
            "text": "Its scan over 10x more orders runs longer, so the uncorrected window grows and runs overlap.",
            "isCorrect": true,
            "feedback": "Correct. The job's work scales with order volume, so the gap between an oversell and its fix stretches further."
          }
        ]
      }
    }
  ],
  "opt-rate-limiting-recommended": [
    {
      "tradeoffDefenseQuestion": {
        "question": "Why does \"Edge Redis Token Bucket Limiter\" key on the API key rather than the client IP address?",
        "options": [
          {
            "id": "tq-a1",
            "text": "A key identifies the customer whatever network path they use, while IPs are shared behind NAT and easy to rotate.",
            "isCorrect": true,
            "feedback": "Correct. The policy is 100 req/min per key, so counting per key matches the contract and avoids blocking neighbours or missing rotators."
          },
          {
            "id": "tq-a2",
            "text": "The edge never sees client IPs once TLS is terminated, so an IP-based counter cannot be built.",
            "isCorrect": false,
            "feedback": "Edge proxies see the source address or a forwarded header. IP limits are possible, just a poor match for a per-key policy."
          },
          {
            "id": "tq-a3",
            "text": "Counters keyed by API key are cheaper for Redis to update than counters keyed by IP address.",
            "isCorrect": false,
            "feedback": "Both are single small keys, so the cost is the same. The real difference is what each identifies."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "If Redis becomes unreachable at 10x load, what decides the outcome for \"Edge Redis Token Bucket Limiter\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Redis queues every limit check until it recovers, so no request is delayed or lost during the outage.",
            "isCorrect": false,
            "feedback": "A client cannot wait out an outage. Checks time out, and the gateway must choose what to do with each request."
          },
          {
            "id": "sq-a2",
            "text": "Whether the limiter fails open or closed, ideally with a small local budget as a fallback.",
            "isCorrect": true,
            "feedback": "Correct. Fail open risks overload, fail closed rejects everyone. A per-instance fallback keeps abuse bounded while Redis is down."
          },
          {
            "id": "sq-a3",
            "text": "On reconnect, every bucket refills to full, so all keys get a free burst regardless of past use.",
            "isCorrect": false,
            "feedback": "Buckets keep their stored state when Redis returns. Only a data-loss event would reset them."
          }
        ]
      }
    }
  ],
  "opt-rate-limiting-alternative": [
    {
      "tradeoffDefenseQuestion": {
        "question": "Which legitimate customers suffer even when \"Client IP Socket Throttling on App Instances\" works as designed?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Customers on IPv6, because every address is unique and gets its own separate allowance.",
            "isCorrect": false,
            "feedback": "Unique addresses are not a problem; they just each get a budget. Shared addresses are the unfair case."
          },
          {
            "id": "tq-a2",
            "text": "Customers who authenticate with more than one API key, since each key resets their IP allowance.",
            "isCorrect": false,
            "feedback": "The throttle ignores keys entirely, so extra keys change nothing about the IP count."
          },
          {
            "id": "tq-a3",
            "text": "Many users behind one corporate NAT, who share one address and get throttled together.",
            "isCorrect": true,
            "feedback": "Correct. One noisy user can exhaust the address budget for an entire office, an unfair outcome with per-IP counting."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "If the scraper spreads 500,000 req/s across tens of thousands of IPs, what happens to \"Client IP Socket Throttling on App Instances\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Each IP stays under its threshold, so the total flood passes through untouched.",
            "isCorrect": true,
            "feedback": "Correct. Per-IP limits cap each source, not the credential, so a distributed scraper simply stays below the line everywhere."
          },
          {
            "id": "sq-a2",
            "text": "The counters expire too quickly to matter, so no IP can ever be throttled at all.",
            "isCorrect": false,
            "feedback": "Counters live for the window and work fine. They just measure the wrong identity for a distributed attacker."
          },
          {
            "id": "sq-a3",
            "text": "The socket layer detects the botnet and shares counts between instances to block them.",
            "isCorrect": false,
            "feedback": "Nothing in a local per-instance counter aggregates across sources or instances."
          }
        ]
      }
    }
  ],
  "opt-rate-limiting-antipattern": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What happens to a paying customer whose key leaks under \"Permanent Account Suspension Database Flag\"?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Their key is restored at the next window, since suspension flags expire with the rate limit.",
            "isCorrect": false,
            "feedback": "A permanent flag has no window and never expires on its own. Lifting it takes a manual step."
          },
          {
            "id": "tq-a2",
            "text": "Access is cut until support steps in, so the abuser's traffic becomes the victim's outage.",
            "isCorrect": true,
            "feedback": "Correct. A permanent ban punishes the account owner and has no gradual response. A quota would only slow the abuse."
          },
          {
            "id": "tq-a3",
            "text": "Traffic from the leaked key is throttled to 100 req/min while the account stays usable.",
            "isCorrect": false,
            "feedback": "That would be a rate limit. A suspension flag is all-or-nothing and enforces no per-minute budget."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "As scraping scales 10x, why does manual suspension in \"Permanent Account Suspension Database Flag\" fall behind?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Suspension flags are cached in the CDN, so updates take days to reach the API.",
            "isCorrect": false,
            "feedback": "Flags are read from the application database. The lag comes from the manual step, not from a CDN."
          },
          {
            "id": "sq-a2",
            "text": "Each flag write locks the accounts table, so more suspensions block sign-ins for everyone.",
            "isCorrect": false,
            "feedback": "Setting a flag is a single-row update and does not lock the table."
          },
          {
            "id": "sq-a3",
            "text": "The scraper mints new keys faster than people can flag them, so enforcement lags.",
            "isCorrect": true,
            "feedback": "Correct. Nothing limits new keys automatically, so every fresh key gets a full-speed window until someone notices."
          }
        ]
      }
    }
  ],
  "opt-circuit-breaker-recommended": [
    {
      "tradeoffDefenseQuestion": {
        "question": "Why is a breaker better than only shortening the 30s timeout for the fraud API?",
        "options": [
          {
            "id": "tq-a1",
            "text": "A short timeout still spends its full duration on every call to a dead service, while an open breaker skips the call entirely.",
            "isCorrect": true,
            "feedback": "Correct. A breaker converts repeated slow failures into instant ones, which frees threads and stops piling load on the dependency."
          },
          {
            "id": "tq-a2",
            "text": "Timeouts can only be set on the dependency's side, so the calling service cannot change them.",
            "isCorrect": false,
            "feedback": "Client-side timeouts are set by the caller in the HTTP client. They just do not stop repeated calls to a failing service."
          },
          {
            "id": "tq-a3",
            "text": "A shorter timeout makes the fraud API respond faster, which shrinks the outage itself.",
            "isCorrect": false,
            "feedback": "The dependency's speed is unaffected by the caller's timeout. It only changes when the caller gives up."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "When the fraud API recovers, what can go wrong at 10x traffic for \"Deploy Circuit Breaker with Fallback\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The breaker stays half-open forever, since a healthy API can never satisfy the probe condition.",
            "isCorrect": false,
            "feedback": "Successful probes are exactly what close the breaker. A healthy service is the normal way out of half-open."
          },
          {
            "id": "sq-a2",
            "text": "Closing the breaker sends the full 10x load at a fragile API at once, so it trips again.",
            "isCorrect": true,
            "feedback": "Correct. Ramp back up gradually, with more half-open probes and a growing share of traffic, so recovery is not undone."
          },
          {
            "id": "sq-a3",
            "text": "Fallback responses are cached permanently, so users keep receiving old fraud verdicts.",
            "isCorrect": false,
            "feedback": "Fallbacks are returned while the breaker is open. They are not stored as if they were real verdicts."
          }
        ]
      }
    }
  ],
  "opt-circuit-breaker-alternative": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What does \"Increase Upstream Request Timeout to 60s\" do to the user-facing checkout latency?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Nothing visible, because the timeout only applies inside the server after the user gave up.",
            "isCorrect": false,
            "feedback": "Users wait during the server-side call, so its length is directly part of the request time they experience."
          },
          {
            "id": "tq-a2",
            "text": "It shortens typical latency, since slow calls now finish instead of being cut off and restarted.",
            "isCorrect": false,
            "feedback": "Only calls that would have finished between 30s and 60s benefit. A hung dependency just makes everyone wait longer."
          },
          {
            "id": "tq-a3",
            "text": "The worst case doubles to 60s, past the client's own timeout, so users leave first.",
            "isCorrect": true,
            "feedback": "Correct. Server work continues for an abandoned request, wasting capacity and delivering no value."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "With client retries at 30s, what happens as traffic grows 5x under \"Increase Upstream Request Timeout to 60s\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Clients retry while the first call is pending, so each user holds several server threads.",
            "isCorrect": true,
            "feedback": "Correct. The 60s server timeout outlasts the 30s client retry, so duplicated requests stack up on the same thread pool."
          },
          {
            "id": "sq-a2",
            "text": "Retries reuse the original call's thread, so the extra requests add no load to the pool.",
            "isCorrect": false,
            "feedback": "A retry is a new request and takes its own thread. It does not merge with the still-running one."
          },
          {
            "id": "sq-a3",
            "text": "The server cancels the pending call when the client disconnects, so retries cost nothing extra.",
            "isCorrect": false,
            "feedback": "Many servers keep processing after a disconnect until their own timeout, so the work is not automatically cancelled."
          }
        ]
      }
    }
  ],
  "opt-circuit-breaker-antipattern": [
    {
      "tradeoffDefenseQuestion": {
        "question": "If you must keep retries around the fraud API, what makes them safe next to a breaker?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Fixed 100 ms intervals across all clients, so the retries stay predictable for the fraud API.",
            "isCorrect": false,
            "feedback": "Identical fixed delays keep clients in sync, so retries arrive in bursts and overload a struggling service."
          },
          {
            "id": "tq-a2",
            "text": "Exponential backoff with jitter, a small attempt cap and a shared retry budget.",
            "isCorrect": true,
            "feedback": "Correct. Spreading and limiting retries prevents synchronized waves, and the breaker stops them entirely during a sustained outage."
          },
          {
            "id": "tq-a3",
            "text": "Unlimited attempts until one succeeds, so no user request is ever dropped.",
            "isCorrect": false,
            "feedback": "Unbounded retries turn a partial outage into a storm and pin threads indefinitely."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "After the first failure spike at 10x traffic, what does the fraud API's request graph show under \"Retry Every Request 5 Times Immediately\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Traffic decays smoothly, since each retry replaces a request that would otherwise have been made.",
            "isCorrect": false,
            "feedback": "Retries add to the load. They do not replace original requests, which keep arriving at the normal rate."
          },
          {
            "id": "sq-a2",
            "text": "Requests are spread evenly across the 30s window, so the API sees a constant steady rate.",
            "isCorrect": false,
            "feedback": "Immediate retries cluster right after each failure rather than spreading evenly."
          },
          {
            "id": "sq-a3",
            "text": "Synchronized waves as clients retry at the same instants, keeping the service saturated.",
            "isCorrect": true,
            "feedback": "Correct. With no backoff or jitter, failures and retries line up, so the API never gets a quiet moment to recover."
          }
        ]
      }
    }
  ],
  "opt-connection-pooling-recommended": [
    {
      "tradeoffDefenseQuestion": {
        "question": "Which workload behavior makes \"Transaction-Mode PgBouncer Pooler\" unsafe?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Session state kept across transactions, like SET values, temp tables or advisory locks.",
            "isCorrect": true,
            "feedback": "Correct. In transaction mode the next transaction may land on a different backend, so anything stored in the session can vanish or leak."
          },
          {
            "id": "tq-a2",
            "text": "Transactions that finish in a few milliseconds, since the backend is handed back too quickly to reuse.",
            "isCorrect": false,
            "feedback": "Short transactions are what this mode is best at. Fast release is exactly why it multiplexes so well."
          },
          {
            "id": "tq-a3",
            "text": "Read-only queries, since a shared backend cannot tell which client asked for which row set.",
            "isCorrect": false,
            "feedback": "Read-only queries are safe. Each result is returned within its own transaction."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "What happens if you raise default_pool_size to match the client count in \"Transaction-Mode PgBouncer Pooler\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Latency improves in proportion, because every client gets its own dedicated backend.",
            "isCorrect": false,
            "feedback": "More active backends than cores adds context switching and contention, so latency and throughput usually get worse."
          },
          {
            "id": "sq-a2",
            "text": "You recreate the original problem: too many active backends contend for cores and throughput drops.",
            "isCorrect": true,
            "feedback": "Correct. The pool size is the throttle on Postgres. Keeping it near the core count is what protects the database."
          },
          {
            "id": "sq-a3",
            "text": "PgBouncer crashes, because it cannot hold more server connections than clients.",
            "isCorrect": false,
            "feedback": "It can hold any pool size up to its limits. The problem is the load on Postgres, not on PgBouncer."
          }
        ]
      }
    }
  ],
  "opt-connection-pooling-alternative": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What does each idle connection cost that makes 20,000 of them wasteful under \"Raise PostgreSQL max_connections to 20,000\"?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Nothing on the server, only a file descriptor on the client, so idle sessions are free.",
            "isCorrect": false,
            "feedback": "Every connection is a full server process on Postgres. It uses memory and adds bookkeeping even when idle."
          },
          {
            "id": "tq-a2",
            "text": "A row lock on the accounts table for each open session, blocking other writers.",
            "isCorrect": false,
            "feedback": "Idle sessions do not hold row locks unless they left a transaction open."
          },
          {
            "id": "tq-a3",
            "text": "A dedicated backend process with its own memory, so RAM goes to idle sessions instead of cache.",
            "isCorrect": true,
            "feedback": "Correct. Each backend holds private memory and catalog caches, and it counts toward snapshot and lock-table work."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "After a failover at 5x load, what is the risk for \"Raise PostgreSQL max_connections to 20,000\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Thousands of clients reconnect together, and the fork and authentication storm stalls recovery.",
            "isCorrect": true,
            "feedback": "Correct. A huge pool means a huge simultaneous reconnect, which can saturate the new primary before it serves normal traffic."
          },
          {
            "id": "sq-a2",
            "text": "Clients keep their existing sockets, so the new primary needs no reconnection work at all.",
            "isCorrect": false,
            "feedback": "The old sockets die with the old primary, so every client has to open a new connection."
          },
          {
            "id": "sq-a3",
            "text": "Replicas absorb the reconnects, because they accept unlimited connections during promotion.",
            "isCorrect": false,
            "feedback": "Replicas have their own limits, and the promoted node is the one that must accept the writers."
          }
        ]
      }
    }
  ],
  "opt-connection-pooling-antipattern": [
    {
      "tradeoffDefenseQuestion": {
        "question": "For a 2 ms query, what dominates the latency when \"Open New Raw TCP Socket on Every Single Query\" is used?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Query planning, because a fresh connection always forces a full replan of the statement.",
            "isCorrect": false,
            "feedback": "Planning is small compared to connection setup. The setup steps are what dwarf a 2 ms query."
          },
          {
            "id": "tq-a2",
            "text": "Connection setup, with TCP, TLS, auth and a backend fork, often several times the query time.",
            "isCorrect": true,
            "feedback": "Correct. The overhead per query is much larger than the work itself, which wastes both latency and database CPU."
          },
          {
            "id": "tq-a3",
            "text": "The write-ahead log flush, because each new socket forces its own commit to disk.",
            "isCorrect": false,
            "feedback": "Commits happen per transaction and do not depend on whether the socket is new."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "When connection attempts start getting rejected at 10x, what makes \"Open New Raw TCP Socket on Every Single Query\" worse?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Rejected clients wait quietly, which frees the postmaster to process the remaining requests.",
            "isCorrect": false,
            "feedback": "Rejected clients do not wait quietly; a rejection is an error the client must handle."
          },
          {
            "id": "sq-a2",
            "text": "Rejections corrupt the client's open transaction, leaving locks held on the primary.",
            "isCorrect": false,
            "feedback": "A rejected connect never starts a transaction, so nothing is left locked."
          },
          {
            "id": "sq-a3",
            "text": "Clients retry rejected connects, feeding a retry storm at the postmaster.",
            "isCorrect": true,
            "feedback": "Correct. Retrying failed connects multiplies the rate of new connections, which is the resource already exhausted."
          }
        ]
      }
    }
  ],
  "opt-backpressure-recommended": [
    {
      "tradeoffDefenseQuestion": {
        "question": "How should the in-flight limit for \"Apply Reactive Pull Backpressure\" be chosen?",
        "options": [
          {
            "id": "tq-a1",
            "text": "From measured processing rate times the target latency, so memory holds only what can finish in time.",
            "isCorrect": true,
            "feedback": "Correct. This is Little's law: it caps queued work to what the consumer can drain quickly, keeping memory small and predictable."
          },
          {
            "id": "tq-a2",
            "text": "As large as the heap allows, so the consumer never has to pause fetching.",
            "isCorrect": false,
            "feedback": "A heap-sized buffer just moves the OOM risk later and gives GC and rebalances more to work with."
          },
          {
            "id": "tq-a3",
            "text": "Equal to the partition count, so every partition has exactly one record in flight.",
            "isCorrect": false,
            "feedback": "Partition count says nothing about record size or processing speed, so it is an arbitrary limit."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "When one hot partition takes most of the 10x burst, what limits \"Apply Reactive Pull Backpressure\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The broker spreads the hot partition across all consumers, so lag is always shared evenly.",
            "isCorrect": false,
            "feedback": "Kafka assigns each partition to one consumer in a group. It does not split a partition between them."
          },
          {
            "id": "sq-a2",
            "text": "Only one consumer in the group reads that partition, so its lag grows and more consumers do not help.",
            "isCorrect": true,
            "feedback": "Correct. Within a consumer group a partition has a single reader, so parallelism stops at the partition count."
          },
          {
            "id": "sq-a3",
            "text": "Backpressure ignores partitions, so the hot one is fetched at unlimited speed.",
            "isCorrect": false,
            "feedback": "Fetching is limited per consumer, and the hot partition's reader is throttled like any other."
          }
        ]
      }
    }
  ],
  "opt-backpressure-alternative": [
    {
      "tradeoffDefenseQuestion": {
        "question": "What change makes \"Allocate Unbounded RAM Queues in Memory\" safe to run?",
        "options": [
          {
            "id": "tq-a1",
            "text": "Give the node a much bigger heap, so the burst always fits in memory.",
            "isCorrect": false,
            "feedback": "A larger heap only delays the limit. A bigger burst still ends in an out-of-memory kill."
          },
          {
            "id": "tq-a2",
            "text": "Put a second unbounded queue in front, so the first one never receives more than it can hold.",
            "isCorrect": false,
            "feedback": "Chaining unbounded queues just moves the memory problem to the next stage."
          },
          {
            "id": "tq-a3",
            "text": "Bound the queue and pause fetching when it is full, which is backpressure.",
            "isCorrect": true,
            "feedback": "Correct. A fixed bound stops memory growth, and pausing the consumer moves the waiting to Kafka's log."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "As traffic grows another 5x, what does the growing heap do to a consumer using \"Allocate Unbounded RAM Queues in Memory\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "Long GC pauses make it miss poll deadlines and get evicted from the group, adding more lag.",
            "isCorrect": true,
            "feedback": "Correct. A rebalance follows the eviction, so consumption stalls and the backlog gets even bigger."
          },
          {
            "id": "sq-a2",
            "text": "A bigger heap speeds up collection, since GC cost falls as more memory is available.",
            "isCorrect": false,
            "feedback": "GC pauses tend to grow with live heap size, particularly with many objects retained in a queue."
          },
          {
            "id": "sq-a3",
            "text": "The queue is spilled to disk by the JVM once it grows, keeping every event safe.",
            "isCorrect": false,
            "feedback": "Nothing spills an in-memory queue to disk automatically, and an OOM kill loses buffered events."
          }
        ]
      }
    }
  ],
  "opt-backpressure-antipattern": [
    {
      "tradeoffDefenseQuestion": {
        "question": "Where should low-value telemetry be shed instead of \"Randomly Drop 80% of Inbound Network Packets\"?",
        "options": [
          {
            "id": "tq-a1",
            "text": "In the network layer, with a higher drop percentage, so overload never reaches the application.",
            "isCorrect": false,
            "feedback": "Packet loss is blind to event importance and TCP simply retries it."
          },
          {
            "id": "tq-a2",
            "text": "In the application, by event priority or sampling, with a counter of what was dropped.",
            "isCorrect": true,
            "feedback": "Correct. Shedding in the app lets you keep important events and see exactly what was discarded."
          },
          {
            "id": "tq-a3",
            "text": "At the broker, by deleting the oldest log segments early to keep the backlog short.",
            "isCorrect": false,
            "feedback": "That deletes unread data indiscriminately, including high-value events, without any control."
          }
        ]
      },
      "stressTest10xQuestion": {
        "question": "At 10x, how would operators know how much data was lost under \"Randomly Drop 80% of Inbound Network Packets\"?",
        "options": [
          {
            "id": "sq-a1",
            "text": "The broker logs each dropped packet with the event id, so the lost data can be listed exactly.",
            "isCorrect": false,
            "feedback": "The broker never sees packets dropped before they arrive, so it has no record of them."
          },
          {
            "id": "sq-a2",
            "text": "Producers receive an explicit rejection for each drop, so their own metrics track the loss.",
            "isCorrect": false,
            "feedback": "Dropped packets produce timeouts and retransmits, not explicit rejections."
          },
          {
            "id": "sq-a3",
            "text": "They would not: network drops are uncounted, so dashboards silently under-report.",
            "isCorrect": true,
            "feedback": "Correct. Silent, uncounted loss makes every downstream metric untrustworthy, which is worse than controlled shedding."
          }
        ]
      }
    }
  ]
};
