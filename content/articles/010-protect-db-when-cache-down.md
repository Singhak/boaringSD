---
title: How do you protect the database if the whole cache goes down?
summary: A dead cache can multiply database load by 20x. Prevent it, absorb it, limit what reaches the database, degrade gracefully, and recover slowly.
topic: Redis
tags: redis, caching, resilience, circuit-breaker, rate-limiting, interview
date: 2026-10-04
post: 010-protect-db-when-cache-down
---

**Short answer:** design so the database is protected even when the cache is gone. Use layers: keep the cache from failing, absorb traffic locally, limit what reaches the database, degrade gracefully, and bring the cache back slowly.

## 1. Why it is dangerous

- Your cache hides most of the load. With a 95 percent hit rate, the database sees only 5 percent of requests.
- At 10,000 requests per second, the database normally handles about 500. If the cache dies, it suddenly gets 10,000, which is **20 times more**.
- The database slows down, requests time out, clients retry, and it can spiral into a full outage.

## 2. Prevent: make total cache loss unlikely

- Run **replicas with automatic failover** (Redis Sentinel or Cluster), spread over multiple availability zones.
- Turn on **persistence** (RDB or AOF) so a restarted node comes back with its data instead of empty.
- Put **short timeouts** on cache calls and a circuit breaker around Redis itself, so a sick cache does not hang your app.

## 3. Absorb: keep serving without Redis

- Add a small **in-process cache** (L1) in each app instance with a short TTL. It soaks up repeated reads for the hottest keys.
- **Serve stale on error:** if the cache or the database fails, return the last known value instead of an error, where staleness is acceptable.
- **Single-flight / request coalescing:** many identical concurrent requests become one database query.

## 4. Limit: control what reaches the database

Put protective layers in front of the database:

- **Rate limiting and load shedding:** reject or delay excess requests early (HTTP 429 or 503) so the rest succeed. Shed low-priority traffic first.
- **Circuit breaker:** when database errors or latency rise, stop sending requests for a while and fail fast or use a fallback, then probe to see if it recovered.
- **Bulkheads and connection pool caps:** limit concurrent database queries per service so one hot path cannot use all connections. Queue with a timeout instead of piling up.
- **Timeouts and bounded retries** with exponential backoff and jitter, so retries do not create a storm.

## 5. Degrade gracefully

Decide in advance what you are willing to lose:

- Return defaults, static or precomputed content instead of live data.
- Turn off expensive features with feature flags (recommendations, search suggestions).
- Switch to read-only mode, or queue writes for later.
- Protect critical paths (login, checkout) before everything else.

## 6. Recover safely

- **Pre-warm** the hottest keys before sending full traffic to a new or restarted cache.
- **Ramp traffic gradually** instead of switching everything back at once.
- Use **TTL jitter** while refilling, and keep stampede protection (locks, stale-while-revalidate) on.
- Use **read replicas** to absorb read surges, remembering that adding replicas takes time.

## 7. Plan and test

- Know your **cache-miss capacity**: how much traffic can the database handle with no cache? If the answer is far below your peak, you rely on the cache for survival, and need the layers above.
- Run a game day: turn the cache off in a test environment under load and see what breaks.
- Alert on hit ratio, database CPU and connections, and cache errors.

## Interview one-liner

> The cache hides most of the load, so losing it can multiply database traffic about 20 times. I would first make that unlikely with replicas, failover and persistence. Then absorb with a local in-process cache and stale serving, and limit what reaches the database with rate limiting, load shedding, circuit breakers and connection caps. If it still happens, degrade gracefully, and when the cache returns, pre-warm it and ramp traffic up slowly.

## Cross questions to expect

1. What is the difference between a circuit breaker and rate limiting?
2. How do you decide what traffic to shed first?
3. Should the app fail open or fail closed when Redis is unreachable?
4. How would you load test this scenario?
