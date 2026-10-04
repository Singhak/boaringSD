---
title: What is epoll, and how is it better than select?
summary: select re-checks every socket on every call. epoll remembers your sockets and returns only the ready ones, which is how one thread serves thousands of connections.
topic: Redis
tags: redis, epoll, select, linux, networking, interview
date: 2026-10-04
post: 003-epoll-vs-select
---

**Short answer:** both let one thread wait on many sockets and find out which are ready. `select` makes the kernel re-check every socket on every call. `epoll` remembers the sockets you registered and hands back only the ready ones, so its cost grows with *active* connections, not *total* connections.

## 1. The problem they solve

- A server with 10,000 clients can't use one blocking `read()` per client, because that blocks on the first idle socket. One thread per client is expensive.
- I/O multiplexing means: ask the OS "which of these sockets have data (or room to write) right now?", then touch only those.

## 2. How `select` works, and why it does not scale

- You pass a bitmask of file descriptors (`fd_set`).
- On **every call** the kernel copies that set from user space and scans all the fds.
- It overwrites the set with the result, so you must **rebuild the set before every call**.
- After it returns, you **scan all your fds** again to find which bits are set.
- Hard limit: `FD_SETSIZE`, typically **1,024** fds.
- Cost per call: **O(n)** in the number of watched fds, even if only one is ready.

`poll` is a middle step. It uses an array instead of a bitmask, so the 1,024 limit is gone, but it still copies and scans all fds on each call: O(n).

## 3. How `epoll` works

Three system calls (Linux):

```text
epoll_create1()          create an epoll instance in the kernel
epoll_ctl(ADD/MOD/DEL)   register or change interest in an fd, once
epoll_wait()             block until something is ready, return only ready fds
```

- The kernel keeps the interest list (a red-black tree) and a **ready list**.
- When a socket receives data, the kernel's network code adds it to the ready list directly (via a callback).
- `epoll_wait` just returns that ready list. You do not pass the whole set every time.
- Cost: registration is O(log n) once per fd, and each wait is **O(number of ready fds)**.
- No fixed 1,024 limit. The limit is memory and the process fd limit (`ulimit -n`).

## 4. Side by side

- **fd limit:** `select` 1,024, `poll` none, `epoll` none.
- **Pass the fd list each call:** `select` yes, `poll` yes, `epoll` no (register once).
- **Per-call cost:** `select` O(n), `poll` O(n), `epoll` O(ready).
- **Finding ready fds:** `select` and `poll` scan all, `epoll` returns them already.
- **Portability:** `select` everywhere, `poll` POSIX, `epoll` Linux only.

Equivalents on other systems: `kqueue` (BSD, macOS), IOCP (Windows, a different model), `evport` (Solaris).

## 5. Level-triggered vs edge-triggered

- **Level-triggered (default):** `epoll_wait` keeps reporting an fd as ready as long as data remains unread. Simple and safe.
- **Edge-triggered (`EPOLLET`):** reports only when the state *changes*. Fewer wake-ups, but you must read until `EAGAIN` or you can miss data.
- Redis uses the level-triggered mode.

## 6. How Redis uses it

- Redis has its own small event library, `ae`. At startup it picks the best backend available: `epoll` on Linux, `kqueue` on BSD/macOS, `evport` on Solaris, `select` as a fallback.
- The main loop: wait for events, run ready read handlers (parse and execute commands), queue replies, and run write handlers. This is why one thread can serve 10,000 clients.

## 7. Honest caveats

- With a **small number of fds** (say under 100), `select` and `epoll` perform about the same. The win appears with many mostly-idle connections.
- `epoll` tells you a socket is *ready*; you still do the `read()`/`write()` yourself. It is readiness notification, not true async I/O. (Linux `io_uring` is the newer async approach.)
- `epoll` does not work for regular files, which are always reported ready.

## Interview one-liner

> `select` and `poll` take the full list of fds on each call, so the kernel copies and scans all of them, O(n), and `select` is capped at 1,024. `epoll` registers fds once with `epoll_ctl`, the kernel keeps a ready list, and `epoll_wait` returns only the ready ones, O(ready). That makes it scale to tens of thousands of mostly idle connections, which is why Redis, Nginx and Node.js use it on Linux.

## Cross questions to expect

1. Level-triggered vs edge-triggered: when would you pick edge-triggered?
2. What is the C10K problem?
3. How is `epoll` different from `io_uring`?
4. How does Node.js's event loop (libuv) relate to this?
5. What happens if one handler in the Redis event loop is slow?
