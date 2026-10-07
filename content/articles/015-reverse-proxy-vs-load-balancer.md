---
title: Reverse proxy vs load balancer: what is the difference?
summary: A reverse proxy is a position, standing in front of servers. A load balancer is a job, spreading traffic across them. L7 load balancers are reverse proxies, and tools like Nginx and Envoy do both.
topic: Architecture
tags: reverse-proxy, load-balancer, nginx, envoy, l4, l7, interview
date: 2026-10-07
post: 015-reverse-proxy-vs-load-balancer
---

**Short answer:** a reverse proxy is a **position**: it stands in front of servers and talks to clients on their behalf. A load balancer is a **job**: it spreads traffic across several servers. Most L7 load balancers are reverse proxies, but a reverse proxy with one backend does no balancing, and some L4 load balancers are not proxies at all.

## 1. Reverse proxy

- It terminates the client connection and opens its own connection to a backend.
- Jobs: TLS termination, caching, compression, static files, hiding the backend, basic security (WAF, IP filtering).
- It works with one backend or many.

```flow
# Reverse proxy with one backend
Client -> Reverse proxy (TLS, cache, compress) -> Server
```

## 2. Load balancer

- It distributes requests across multiple backends and runs health checks to drop failed ones.
- Algorithms: round robin, least connections, weighted, IP hash, consistent hashing. It can also pin a client to one server (session persistence).
- **L4** balancers route on IP and port. Some forward packets without terminating the connection (IPVS, direct server return), so they are not proxies.
- **L7** balancers read HTTP, so they are reverse proxies.

```flow
# Load balancer with many backends
Client -> Load balancer -> Server 1
Load balancer -> Server 2
Load balancer -> Server 3
```

## 3. Why they get confused

Nginx, HAProxy and Envoy do both. People say "proxy" and "load balancer" for the same box. The useful question is which role you are using it for: hiding and shielding the backend (proxy), or spreading and failing over (balancing).

```flow
# The usual reality: one tool, both roles
Client -> ok: Nginx / Envoy -> Server 1
Nginx / Envoy -> Server 2
```

## 4. Side by side

| | Reverse proxy | Load balancer |
|---|---|---|
| What it is | A position in the path | A job: spread load |
| Needs many backends | No | Yes |
| Health checks and failover | Optional | Core feature |
| TLS, caching, compression | Yes | Only on L7 |
| Hides backends | Yes | Yes, for L7 |
| Terminates the connection | Always | L7 yes, L4 sometimes not |
| Examples | Nginx, Caddy, Varnish | HAProxy, AWS NLB and ALB, IPVS |

## 5. When to use which

- **Reverse proxy only:** one app server that needs TLS, caching or compression.
- **Load balancer:** several instances and you need scale and failover.
- **Both roles in one tool:** the common case. Nginx or Envoy in front of several app servers.

## 6. Common mistakes

- **Calling every proxy a load balancer:** or assuming a proxy gives high availability. It is one more box that can fail, so run two.
- **Caching user-specific responses:** one user may see another user's data.
- **No health checks:** a dead server keeps receiving traffic.

## Interview one-liner

> A reverse proxy sits in front of servers and handles TLS, caching, compression and hiding the backend. A load balancer distributes traffic across multiple servers with health checks. L7 load balancers are reverse proxies, and tools like Nginx and Envoy do both jobs.

## Cross questions to expect

1. L4 vs L7 load balancing?
2. Forward proxy vs reverse proxy?
3. How do you make the load balancer itself highly available?
