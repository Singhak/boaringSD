---
title: Why is Redis so fast?
summary: Five design choices let Redis serve 100K+ operations per second on a single thread, and one catch that can freeze it.
topic: Redis
tags: redis, caching, performance, interview
date: 2026-10-04
post: 001-why-redis-is-fast
---

Redis can serve 100K+ operations per second on one core. This comes from five design choices working together.

## 1. Data lives in RAM

- RAM access takes about 100 ns, an SSD read about 100 µs, and a disk seek about 10 ms.
- Redis never reads from disk to answer a request. Persistence (RDB/AOF) writes data out in the background.
- The cost is that your dataset must fit in memory, and memory is expensive.

## 2. Commands run on a single thread

- Only one command executes at a time, so Redis needs no locks or mutexes.
- There are no race conditions inside Redis, and no thread context-switch overhead.
- Each command is **atomic**. `INCR`, `LPUSH` and `SETNX` are safe without any extra locking.
- A multi-threaded design would need synchronisation on every shared structure. That cost is often higher than what you gain from extra cores, because each Redis operation is already tiny (microseconds).

## 3. I/O multiplexing (event loop)

- One thread serves thousands of connections using `epoll` (Linux), `kqueue` (BSD/macOS) or `select`.
- The OS says which sockets have data ready, and Redis reads, executes and replies. It never blocks on an idle client.
- This is the same idea as the Node.js event loop.

## 4. Efficient data structures

- The main keyspace is a hash table with O(1) lookup.
- Sorted sets use a **skip list** plus a hash table, which gives O(log n) range and rank queries.
- Small collections use compact encodings (`listpack`, `intset`). They are cache-friendly and use less memory. Redis switches to the full structure when the collection grows.

## 5. A simple protocol

- RESP is very cheap to parse.
- **Pipelining** lets a client send many commands in one network round trip. Network round trips are usually the real bottleneck, not Redis.

```text
SET user:1 "anil"
+OK

GET user:1
$4
anil
```

## The catch: one slow command blocks everyone

`KEYS *`, a huge `LRANGE`, a big `DEL`, `SMEMBERS` on a large set, or a long Lua script will stall all clients.

Alternatives:

- `SCAN`: iterates in small steps instead of one blocking call.
- `UNLINK`: frees memory in the background.
- Smaller values, and keys split across smaller structures.

### Threads in modern Redis

- Since Redis 6, extra threads handle network read/write (`io-threads`). This is off by default.
- Command execution is still on one thread.
- Since Redis 4, background threads handle lazy freeing, AOF fsync and similar jobs.
- To use more CPU cores, run multiple instances or use **Redis Cluster**.

## Interview one-liner

> Redis is fast because it is in-memory, executes commands on a single thread with no locking, uses epoll to multiplex many clients, and has efficient data structures behind a simple protocol.

## Cross questions to expect

1. If Redis is single-threaded, how does it use a multi-core machine? (Cluster, sharding, `io-threads`.)
2. What happens to the data if Redis crashes? (RDB vs AOF.)
3. What exactly is `epoll`, and how is it better than `select`?
4. Is Redis really faster than a DB with a good cache, and where is the real bottleneck?
5. Why a skip list for sorted sets instead of a balanced tree?
