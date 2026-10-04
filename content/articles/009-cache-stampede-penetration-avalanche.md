---
title: Cache stampede, penetration and avalanche, and how to fix them
summary: Three ways a cache failure can flood your database, and the practical fixes for each: locking, caching misses, Bloom filters and TTL jitter.
topic: Redis
tags: redis, caching, cache-stampede, bloom-filter, reliability, interview
date: 2026-10-04
post: 009-cache-stampede-penetration-avalanche
---

**Short answer:** all three are cache failures that send a burst of traffic to the database. They differ in the cause: **stampede** is one hot key expiring, **penetration** is requests for keys that do not exist, and **avalanche** is many keys (or the whole cache) failing at once.

## 1. Cache stampede (also called dogpile, thundering herd or hot-key breakdown)

**What happens:** a very popular key expires. Thousands of concurrent requests miss at the same moment and all query the database to rebuild the same value. The database slows down, rebuilds take longer, and more requests pile up.

**Fixes:**

- **Lock so only one rebuilds.** The first request takes a lock, loads the data and fills the cache. Others wait briefly and retry, or are served the old value.
- **Serve stale while refreshing.** Store the value with a soft expiry. When it is past the soft expiry, return the stale value immediately and refresh in the background.
- **Probabilistic early refresh.** Each reader has a small random chance of refreshing a key shortly before it expires, with the chance rising as expiry nears. Refreshes are spread out instead of all happening at expiry.
- **Single-flight in the app.** Within one process, merge concurrent requests for the same key into one database call.
- **Pre-warm or never expire** the few extremely hot keys, and refresh them with a background job.

A simple lock with Redis:

```text
SET lock:user:42 <random-token> NX PX 5000
  OK   -> I rebuild: load DB, SET cache, release the lock
  nil  -> someone else is rebuilding: wait a little, then re-read the cache
Release: delete the lock only if the token matches (use a Lua script)
```

Details that matter: give the lock a TTL so a crashed worker cannot block everyone, check the cache again after getting the lock, and use a random token so you never delete someone else's lock.

## 2. Cache penetration

**What happens:** requests ask for keys that exist **nowhere**, for example invalid IDs or an attacker scanning random IDs. They always miss the cache and always hit the database, so the cache gives no protection.

**Fixes:**

- **Cache the empty result.** Store a "not found" marker with a short TTL (for example 30 to 60 seconds).
- **Bloom filter.** Keep a Bloom filter of valid IDs in front of the cache. If it says "definitely not present", return immediately. It can have false positives (a few misses still reach the DB) but never false negatives. New IDs must be added to it.
- **Validate input** (format and range checks) and **rate limit** abusive clients.

## 3. Cache avalanche

**What happens:** many keys expire at the same time (for example you bulk-loaded them with the same TTL), or the cache itself goes down. A huge share of requests fall through to the database at once.

**Fixes:**

- **TTL jitter:** add a random offset so keys written together do not expire together.
- **High availability for the cache:** replicas with failover, or a cluster, so losing one node does not lose everything.
- **Protect the database:** rate limiting, load shedding and circuit breakers, so the database degrades gracefully instead of falling over.
- **Multi-level caching:** a small in-process cache in front of Redis absorbs bursts.
- **Staggered warm-up** when restarting or deploying a cold cache.

## 4. Telling them apart

- **Stampede:** one hot key, many concurrent misses.
- **Penetration:** keys that do not exist, so they always miss.
- **Avalanche:** many keys or the whole cache, failing together.

## Interview one-liner

> Stampede is one hot key expiring and everyone rebuilding it, fixed by a lock so one request rebuilds, serving stale data, or early refresh. Penetration is requests for non-existent keys, fixed by caching empty results with a short TTL, a Bloom filter, and validation. Avalanche is mass expiry or cache failure, fixed with TTL jitter, a highly available cache, and rate limiting or circuit breakers to protect the database.

## Cross questions to expect

1. Is a Redis lock safe for this? What about lock expiry while the holder is still working?
2. What is the false-positive rate of a Bloom filter and how do you size one?
3. What does "serve stale while revalidate" look like in code?
4. How do you protect the database if the whole cache goes down?
