---
title: Cache invalidation, TTL and eviction policies (LRU vs LFU)
summary: How to keep a cache from serving stale data, how Redis expires keys, and what it does when memory is full.
topic: Redis
tags: redis, caching, ttl, eviction, lru, lfu, interview
date: 2026-10-04
post: 008-cache-invalidation-ttl-eviction
---

**Short answer:** invalidation decides *when a cached value is no longer valid* (TTL, delete on write, versioning, events). Eviction decides *which keys to throw away when memory is full* (LRU, LFU and others). They solve different problems and you usually need both.

## 1. Invalidation strategies

- **TTL (time-based):** every key expires after a set time. Simple, and it bounds how stale data can be.
- **Delete on write:** when the source of truth changes, delete the cached key (see cache-aside). Fresh, but you must remember to do it everywhere data changes.
- **Versioned keys:** put a version in the key, for example `user:42:v7`. A change bumps the version, so old keys are simply never read again and expire on their own.
- **Event-driven:** publish change events (a message queue, or change data capture such as Debezium) and let a consumer invalidate or refresh keys. Good when many services write to the same data.

In practice: TTL as a safety net plus delete on write for freshness.

## 2. Choosing a TTL

- Base it on your **staleness budget**: how long can users see old data? Seconds for prices or stock, minutes for profiles, hours for static content.
- Consider how often the data changes and how costly a miss is.
- Add **jitter** (a random offset, for example plus or minus 10 to 20 percent) so keys written together do not all expire together.

```text
SET user:42 "<json>" EX 300       expires in 300 seconds
TTL user:42                        seconds left
PERSIST user:42                    remove the TTL
```

## 3. How Redis expires keys

- **Lazy expiry:** when a key is accessed, Redis checks its TTL and deletes it if it has expired.
- **Active expiry:** several times a second Redis samples a small batch of keys that have TTLs (around 20), deletes the expired ones, and repeats if more than about 25 percent were expired.
- Together these mean an expired key may linger briefly in memory, but it is never returned to a client.
- Replicas do not expire keys on their own. The master sends a `DEL` to them.

## 4. Eviction when memory is full

- Set a memory cap with `maxmemory`. When it is reached, `maxmemory-policy` decides what happens.
- The default policy is `noeviction`: writes that need more memory fail with an error, and reads still work.

Policies:

- `allkeys-lru`: evict the least recently used key among all keys.
- `allkeys-lfu`: evict the least frequently used key among all keys.
- `volatile-lru` / `volatile-lfu`: the same, but only among keys that have a TTL.
- `volatile-ttl`: evict keys with the shortest remaining TTL first.
- `allkeys-random` / `volatile-random`: pick at random.
- If no key qualifies (for example `volatile-*` and no keys have TTLs), Redis behaves like `noeviction`.

For a pure cache, `allkeys-lru` or `allkeys-lfu` is the usual choice.

## 5. LRU vs LFU

- **LRU** keeps what was used most recently. It works well when recent use predicts future use. A one-time big scan can push out genuinely hot keys.
- **LFU** keeps what is used most often. It protects hot keys from scans and suits skewed popularity (a few keys get most traffic). Its weakness is adapting when popularity changes, so Redis decays the counters over time.
- Redis does not track exact LRU, because that costs memory. It **samples** a few keys (`maxmemory-samples`, default 5) and evicts the best candidate from the sample. More samples is closer to true LRU but costs CPU.
- Redis LFU (4.0 and later) uses a small logarithmic counter per key, tuned by `lfu-log-factor` and `lfu-decay-time`.

## 6. Operating it

- Watch `evicted_keys`, `expired_keys` and the hit ratio in `INFO stats`.
- Many evictions plus a falling hit ratio means the cache is too small for the working set.
- Leave memory headroom for forks (RDB snapshots) and replication buffers.

## Interview one-liner

> Invalidation keeps data fresh: TTLs bound staleness, and deleting on write or using versioned keys keeps it accurate, with jitter on TTLs to avoid mass expiry. Eviction handles a full cache: with maxmemory set, I would use allkeys-lru or allkeys-lfu for a cache. LRU favours recency and is hurt by scans, LFU favours frequency and suits skewed traffic, and Redis approximates both by sampling.

## Cross questions to expect

1. What happens if many keys expire at the same moment?
2. Why does Redis approximate LRU instead of tracking it exactly?
3. What does `noeviction` do and when would you want it?
4. How would you invalidate a cache shared by many services?
