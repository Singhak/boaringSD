---
title: What happens to the data if Redis crashes? RDB vs AOF
summary: Redis lives in RAM, so a crash loses everything unless persistence is on. RDB snapshots and the AOF log trade off speed, file size and how much data you can lose.
topic: Redis
tags: redis, persistence, rdb, aof, durability, interview
date: 2026-10-04
post: 004-redis-rdb-vs-aof
---

**Short answer:** Redis lives in RAM, so a crash loses everything unless persistence is on. There are two mechanisms: **RDB** (periodic snapshots) and **AOF** (a log of every write). They trade off speed, file size, and how much data you can lose.

## 1. RDB: point-in-time snapshots

- A compact binary file (`dump.rdb`) of the whole dataset at one moment.
- Triggers:
  - `save <seconds> <changes>` rules (defaults are roughly: 1 hour if at least 1 change, 5 minutes if at least 100, 1 minute if at least 10,000).
  - Manual `BGSAVE`, or a snapshot on shutdown.
- **How it works:** Redis calls `fork()`. The child process writes the snapshot while the parent keeps serving. The OS uses **copy-on-write**, so the child sees a frozen view.

### Pros

- Compact single file, easy backups.
- Very fast restart.
- Little impact on normal operation.

### Cons

- You lose everything since the last snapshot (minutes of writes).
- `fork()` on a big dataset can pause Redis for a noticeable time.
- Under heavy writes, copy-on-write can nearly double memory use.

## 2. AOF: append-only file

- Every write command is appended to a log. On restart, Redis **replays** it to rebuild the data.
- `appendfsync` decides how often the log is flushed to disk:
  - `always`: you lose at most the last write. Slowest, because it calls `fsync` on each write.
  - `everysec` (the usual recommendation): you lose about 1 second. Small cost.
  - `no`: you lose whatever the OS has not flushed (often up to about 30 seconds). Fastest.
- **AOF rewrite** (`BGREWRITEAOF`): the log grows forever (for example 1,000 `INCR` calls on one key), so Redis periodically writes a compact version in the background.
- **Redis 7+:** the AOF is split into a base file plus incremental files, tracked by a manifest.

```text
SET user:1 anil
INCR visits
LPUSH jobs a
(replayed in order on restart)
```

### Pros

- Much less data loss (about 1 second with `everysec`).
- Human-readable log. A bad tail can be repaired (`redis-check-aof`).

### Cons

- Larger files than RDB.
- Slower restart, because the log is replayed.
- Slightly more write overhead.

## 3. Hybrid (RDB preamble + AOF)

- With `aof-use-rdb-preamble yes` (the default in modern Redis), the rewritten AOF starts with an RDB snapshot, followed by the recent commands.
- You get fast loading and low data loss.

## 4. Defaults and restart behaviour

- RDB snapshots are **on** by default. AOF is **off** by default (`appendonly no`).
- If both are enabled, Redis loads the **AOF** on startup, because it is more complete.

## 5. Which one should you use?

- **Pure cache, data can be rebuilt:** no persistence (fastest).
- **Can tolerate losing a few minutes:** RDB only.
- **Data matters, can lose about 1 second:** AOF `everysec`, usually with the hybrid format.
- **Cannot lose acknowledged writes:** AOF `always` plus replication. Still consider whether Redis should be the primary store.

## 6. Common misconceptions

- **Persistence is not high availability.** If the machine dies, the files are on the dead machine. You need **replicas** (and Sentinel or Cluster) for failover, and copies of RDB files **off the box** for backups.
- **Even `always` is not a guarantee with replication.** Replication is asynchronous. `WAIT` (and `WAITAOF` in Redis 7.2+) lets a client wait for replica or local fsync acknowledgement.
- **Persistence work has a cost.** `fork()` latency and disk I/O can create latency spikes, so monitor `latest_fork_usec`.

## Interview one-liner

> Redis is in-memory, so a crash loses data unless persistence is on. RDB takes periodic point-in-time snapshots by forking a child: compact and fast to load, but you can lose minutes of writes. AOF logs every write and fsyncs, typically every second, so you lose about one second at most, at the cost of bigger files and slower restart. Most production setups use AOF `everysec` with the RDB-preamble hybrid, plus replicas for availability and off-box RDB backups.

## Cross questions to expect

1. What exactly happens during `fork()` and copy-on-write, and why can it double memory?
2. What if the AOF is corrupted or truncated at the end?
3. Why is `everysec` the default recommendation?
4. How does replication use RDB when a replica first syncs? (full vs partial resync)
5. Can Redis be your only database? When is that a bad idea?
