---
title: Caching patterns: cache-aside, read-through, write-through, write-back
summary: Four ways to put a cache between your app and your database, what each does on reads and writes, and how to choose.
topic: Redis
tags: redis, caching, cache-aside, write-through, write-back, interview
date: 2026-10-04
post: 007-caching-patterns
---

**Short answer:** the patterns differ in two things: who loads the cache on a read miss (your app or the cache layer), and how writes reach the database (immediately, or later). **Cache-aside** is the default for most Redis setups.

## 1. Cache-aside (lazy loading)

The app talks to both the cache and the database.

**Read:**

1. Check the cache. If it is a hit, return it.
2. On a miss, read the database.
3. Put the value in the cache with a TTL, then return it.

**Write:** update the database, then **delete** the cache key.

```text
read:   GET key -> miss -> SELECT from DB -> SET key value EX 300
write:  UPDATE DB -> DEL key
```

Why delete instead of updating the cache? Two concurrent writers can update the database in one order and the cache in the other, leaving a stale value in the cache. Deleting is simpler and safer: the next read repopulates it.

### Pros

- Only data that is actually requested gets cached.
- If the cache goes down, the app still works (slower), by reading from the database.
- Simple, and the most common pattern.

### Cons

- The first request for each key is a miss.
- A stale window exists. Example race: reader A misses and reads the old row, writer B updates the database and deletes the key, then A puts the old value into the cache. It stays stale until the TTL expires. Mitigations: a TTL, a short delayed second delete, or versioned values.
- A cache stampede is possible when a hot key expires.

## 2. Read-through

The app only talks to the cache. On a miss, the **cache layer itself** loads from the database and stores the value.

- It is cache-aside with the loading logic moved out of the app.
- Redis does not load from your database by itself. You need a library or layer that does it (for example a framework cache abstraction, or a data-integration product).
- Pros: cleaner app code. Cons: needs that extra layer, and the first read is still a miss.

## 3. Write-through

Every write goes to the cache and the database **synchronously**, through the cache layer, before the app gets an acknowledgement.

- Pros: the cache is always consistent with the database, and reads are hits right after writes.
- Cons: higher write latency (two writes), and you may cache data that is never read.
- Often paired with read-through.

## 4. Write-back (write-behind)

The write goes to the cache, the app is acknowledged immediately, and the cache **flushes to the database later**, often in batches.

- Pros: very fast writes, and batching reduces database load.
- Cons: if the cache fails before flushing, you **lose data**. The database is temporarily out of date, and the design is more complex.
- Good for counters, view counts and analytics where small loss is acceptable.

## 5. Write-around

Writes go straight to the database and skip the cache. The cache fills only when data is read. It avoids filling the cache with data that is written once and rarely read. The first read after a write is a miss.

## 6. Choosing

- **Default for most apps:** cache-aside with a TTL and delete-on-write.
- **Cleaner app code, read-heavy:** read-through.
- **Need strong cache-database consistency:** write-through.
- **Write-heavy, loss tolerable:** write-back.
- **Data written once, rarely read:** write-around.

## Interview one-liner

> Cache-aside: the app checks the cache, loads from the database on a miss, and on writes updates the database then deletes the key. Read-through moves the loading into the cache layer. Write-through writes cache and database synchronously for consistency at the cost of latency. Write-back acknowledges after the cache write and flushes later, which is fast but can lose data. I would default to cache-aside with a TTL.

## Cross questions to expect

1. Why delete the key on write instead of updating it?
2. What is a cache stampede and how do you prevent it?
3. How do you handle the cache-aside race condition?
4. What TTL should you pick?
5. How would you keep a cache and database consistent across services?
