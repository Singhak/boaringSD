---
title: Distributed locks with Redis: SETNX, Redlock and the criticisms
summary: How to build a correct lock with SET NX PX, where it breaks, what Redlock adds, why Martin Kleppmann criticised it, and when fencing tokens or a consensus system are the better choice.
topic: Redis
tags: redis, distributed-lock, redlock, fencing-token, concurrency, interview
date: 2026-10-04
post: 011-redis-distributed-lock
---

**Short answer:** a Redis lock is good for avoiding duplicate work. For strict correctness, a lock alone is not enough, because a client can pause and lose the lock without knowing. You need a **fencing token** checked by the protected resource, or a consensus system such as etcd or ZooKeeper.

## 1. Why we need distributed locks

Several processes on different machines must not do the same thing at once: run a scheduled job twice, rebuild one cache entry, update the same inventory row. An in-process mutex cannot help across machines, so we need a shared lock.

## 2. The naive lock, and why it is wrong

```text
SETNX lock 1        take the lock if it does not exist
EXPIRE lock 30      then set a TTL
```

These are two commands. If the client crashes between them, the lock has no TTL and stays forever. This is the classic bug.

## 3. The correct single-instance lock

Acquire atomically, with a unique token and a TTL:

```text
SET lock:order:42 <random-token> NX PX 30000
```

- `NX`: set only if the key does not exist.
- `PX 30000`: expire after 30 seconds, so a crashed holder cannot block others forever.
- `<random-token>`: identifies the owner.

Release only if you still own it, using a Lua script so it is atomic:

```text
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
```

Never call a blind `DEL`. If your lock expired and another client took it, a blind `DEL` would remove their lock.

## 4. Where it breaks

- **TTL expires while the holder is still working.** A long GC pause, slow I/O or a stalled network can outlast the TTL. Now two clients believe they hold the lock. Mitigations: a TTL longer than the worst-case work time, and a renewal ("watchdog") that extends the TTL while the holder is alive.
- **Failover loses the lock.** Replication is asynchronous. If the master crashes before the lock reaches the replica, the replica is promoted without it, and another client can take the same lock.
- **Timing assumptions.** The lock is only safe if pauses and clock drift stay small compared with the TTL.

## 5. Redlock

Redlock is an algorithm for using several independent Redis masters (typically 5, with no replication between them):

1. Note the start time.
2. Try to acquire the lock (same key, same random token, same TTL) on all instances, with a short per-instance timeout.
3. The lock is held only if you got it on a **majority** (at least 3 of 5) and the time taken is less than the TTL.
4. The effective validity is the TTL minus the time spent acquiring, minus a clock-drift allowance.
5. If it fails, release the lock on all instances and retry after a random delay.

The idea is that losing one or two nodes does not lose the lock.

## 6. The criticism

Martin Kleppmann argued in 2016 that Redlock is neither simple enough for efficiency use nor safe enough for correctness use:

- It depends on **timing assumptions** (bounded network delay, bounded process pauses, bounded clock drift). Real systems break these: GC pauses, VM freezes, clock jumps.
- A client can acquire the lock, pause past the expiry, wake up, and write while another client also holds the lock.
- Redlock uses a random value, not a **monotonically increasing token**, so the protected resource cannot tell which holder is newer.
- His advice: use a single Redis lock if you only need efficiency (a duplicate run is harmless), and use a proper consensus system with fencing for correctness.

Redis's author, Salvatore Sanfilippo, replied that Redlock's assumptions are reasonable in practice. The disagreement is real, so be able to explain both sides.

## 7. Fencing tokens

A lock service hands out an increasing number with every grant. The storage system remembers the highest token it has seen and rejects older ones.

```text
A gets token 34, then pauses; its lock expires
B gets token 35 and writes -> storage records 35
A wakes up and writes with 34 -> storage rejects it
```

This protects the data even when the lock is violated. It needs the protected resource to check tokens, which a plain Redis lock does not provide.

## 8. Choosing

- **Efficiency only** (avoid duplicate work, harmless if it occasionally happens twice): a single Redis `SET NX PX` lock is fine.
- **Correctness** (money, inventory, exactly-once effects): use etcd, ZooKeeper or Consul leases with fencing tokens.
- **Often better, avoid the lock entirely:**
  - A database row lock (`SELECT ... FOR UPDATE`) or advisory lock.
  - Optimistic concurrency: a version column and compare-and-set.
  - Idempotent operations.
  - A queue partitioned by key so only one worker handles a key.

## Interview one-liner

> I take the lock with SET key token NX PX ttl, which is atomic, and release it with a Lua script that checks the token. It can fail if the TTL expires during a pause or if failover loses the lock. Redlock takes the lock on a majority of five independent masters, but Kleppmann criticised its timing assumptions and lack of fencing tokens. For efficiency a single Redis lock is fine; for correctness I would use etcd or ZooKeeper with fencing tokens, or avoid the lock with a database lock or optimistic concurrency.

## Cross questions to expect

1. Why is a blind DEL on release dangerous?
2. How does a lock watchdog (renewal) work, and what can still go wrong?
3. What is a fencing token and who has to check it?
4. When is optimistic concurrency better than a lock?
5. How does a lease in etcd differ from a Redis TTL lock?
