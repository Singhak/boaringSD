---
title: Is Redis really faster than a database with a good cache?
summary: A database already caches hot data in RAM. Redis wins by doing much less work per request, but the real bottleneck is usually the network round trip, not the engine.
topic: Redis
tags: redis, caching, database, latency, performance, interview
date: 2026-10-04
post: 006-redis-vs-db-with-cache
---

**Short answer:** yes for simple key lookups, but not because it is "in memory". A database with a warm cache also serves hot data from RAM. Redis is faster because each request does far less work, and in practice the biggest cost for both is the network round trip.

## 1. A database already has a cache

- PostgreSQL uses `shared_buffers` plus the OS page cache. MySQL InnoDB uses the buffer pool.
- If your hot data fits in memory, reads are served from RAM by the database too.
- So "RAM vs disk" is not the real gap once the database is warm.

## 2. What a database query pays for

A typical indexed read goes through several steps:

- Parse the SQL.
- Plan and optimise the query.
- Execute it, walking an index and checking row visibility (MVCC).
- Take locks or latches along the way.
- Build and send the result set.
- On writes, also write the WAL (log) and maintain indexes and constraints.

Redis does much less:

- Parse a tiny protocol message (RESP).
- Look up the key in a hash table, O(1).
- Reply.

There is no planner, no transaction machinery and no row versioning on the hot path. That is where the difference comes from.

## 3. The real bottleneck is often the network

Rough, typical numbers (they vary by hardware and setup):

- Redis command execution: around 10 microseconds.
- Network round trip inside one data centre: around 0.1 to 0.5 ms.
- Indexed database query: around 1 to several ms.

Consequences:

- For Redis, the network usually costs far more than the command itself. Use **pipelining** or `MGET` to batch, keep Redis close to the app, and reuse connections.
- For the database, the limits are usually connection counts, lock contention, cold reads from disk, and bad queries (N+1, missing indexes), not the raw engine speed.

## 4. Why put a cache in front of the database

Average latency with a cache:

```text
avg = cache_time + miss_rate x db_time
e.g. 0.5 ms + 0.05 x 5 ms = 0.75 ms     (95% hit rate)
vs   5 ms with no cache                   (about 6.7x faster)
```

- The cache absorbs the hot, repeated reads and protects the database from load spikes.
- Databases are expensive to scale. Cache nodes are cheap to add for the read-heavy hot set.
- The **hit ratio** drives everything. A low hit ratio gives you extra latency and extra infrastructure for little benefit.

## 5. What caching costs you

- **Stale data.** The cache can disagree with the database.
- **Invalidation is hard.** You need a clear strategy (TTL, delete on write).
- **More moving parts.** Another system to run, monitor and secure.
- **Cold start and stampede.** An empty or expired cache sends a burst of load to the database.

## 6. Measure before you cache

Try these first:

- Add or fix indexes and remove N+1 queries.
- Add read replicas.
- Use connection pooling.
- Cache only data that is hot and read-heavy, and track the hit ratio.

Also remember Redis is not automatically fast: very large values, `KEYS *`, long Lua scripts and huge collections can be slower than a well-indexed query.

## Interview one-liner

> A warm database also serves hot data from RAM, so in-memory alone is not the difference. Redis is faster for key lookups because it skips parsing, planning, MVCC and locking, and does an O(1) hash lookup over a tiny protocol. In practice the network round trip often dominates, so I would cache hot read-heavy data with a good hit ratio, but first fix indexes and queries, and I would measure before adding a cache.

## Cross questions to expect

1. How do you keep the cache consistent with the database?
2. What hit ratio makes a cache worthwhile?
3. What is a cache stampede and how do you prevent it?
4. When would you use a read replica instead of a cache?
