---
title: If Redis is single-threaded, how does it use a multi-core machine?
summary: One Redis process runs commands on one core. You use more cores by running more processes and sharding the data, with a few helper threads on the side.
topic: Redis
tags: redis, cluster, sharding, scaling, interview
date: 2026-10-04
post: 002-redis-multi-core
---

**Short answer:** one Redis process uses one core to execute commands. To use many cores you run many Redis processes and split the data across them (sharding). A few helper threads exist, but they do not run your commands.

## 1. What actually runs on other threads

- **Main thread:** executes all commands, one at a time.
- **Background threads:** closing files, AOF `fsync`, lazy freeing (`UNLINK`, `FLUSHALL ASYNC`).
- **I/O threads (`io-threads`, Redis 6.0+):** read and parse client requests and write replies.
- **Forked child process:** writes the RDB snapshot or rewrites the AOF. It is a separate process, so it uses another core.

### I/O threads in detail

- At high load, a lot of CPU goes on socket reads, writes and protocol parsing, not on the command itself.
- With `io-threads 4` (and `io-threads-do-reads yes` in Redis 6), those parts are spread over threads. The main thread still executes every command, so atomicity and the no-locks property are unchanged.
- It is **off by default**. It helps only when you are CPU-bound on network I/O, for example many connections with large replies.
- Redis 8 reworked the I/O threading. Check the docs for your version before relying on specific numbers.

## 2. Real horizontal use of cores: more processes

### Option A: several instances on one machine

Run 8 instances on ports 6379 to 6386, one per core, and let the client decide which instance owns which key. You can pin each one to a CPU (`server_cpulist`, or `taskset`). This is simple, but you manage the key routing yourself.

### Option B: Redis Cluster (the standard answer)

- The keyspace is divided into **16,384 hash slots**.
- A key's slot is `CRC16(key) mod 16384`.
- Each master node owns a range of slots. The client learns the map and talks to the right node. If it asks the wrong node, it gets a `MOVED` redirect.
- Each master has replicas for failover.
- Cluster works across machines and across cores on one machine. Add nodes and move slots to scale out.

```text
key "user:42" -> CRC16 -> slot 5474 -> node B (slots 5461-10922)
```

### Hash tags

Only the part inside `{}` is hashed. `{user:42}:cart` and `{user:42}:profile` land in the same slot, so you can use multi-key operations on them.

## 3. Trade-offs of sharding

- **Multi-key commands break across slots.** `MGET`, `SUNION` and transactions fail with `CROSSSLOT` unless all keys share a slot. Lua scripts have the same restriction.
- **Hot keys do not scale.** One very popular key lives on one node, and that node's single thread is the limit. Fixes: client-side caching, copying the value under several keys (`key:1` to `key:N`), or reading from replicas.
- **Resharding costs.** Moving slots migrates keys live, which adds load and is operationally delicate.
- **Memory.** Forking for RDB uses copy-on-write. Under heavy writes it can nearly double memory use, so leave headroom.

## 4. Replicas are for reads and availability

- Replicas can serve reads (`READONLY` in Cluster), which spreads read load across more cores.
- They are also single-threaded for commands.
- Replication is asynchronous, so replica reads can be stale.

## 5. Alternatives

Some Redis-compatible systems (Dragonfly, KeyDB) use a multi-threaded, shared-nothing design to use all cores in one process. That trades away some of the simplicity Redis gets from a single execution thread.

## Interview one-liner

> Redis executes commands on a single thread, so one instance uses one core. We scale across cores by running multiple instances and sharding with Redis Cluster, where 16,384 hash slots are split between masters. Since Redis 6 optional I/O threads parallelise network read/write, and background threads and forked children handle persistence and lazy freeing. But command execution stays single-threaded.

## Cross questions to expect

1. How does a Cluster client find the right node, and what is `MOVED` vs `ASK`?
2. Why 16,384 slots and not more?
3. How do you handle a hot key in a cluster?
4. Cluster vs Sentinel: what problem does each solve?
5. What happens to a cluster when a master dies?
