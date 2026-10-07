---
title: Is the API gateway a single point of failure?
summary: By default yes, because every request passes through it. You avoid it by running a stateless gateway cluster across availability zones, behind a highly available load balancer, with safe config rollout and a failure policy for each dependency.
topic: Reliability
tags: api-gateway, high-availability, spof, multi-region, resilience, interview
date: 2026-10-07
post: 018-api-gateway-single-point-of-failure
---

**Short answer:** it can be, and by default it is. Every request passes through it, so if it goes down, everything behind it looks down. You avoid that by running it as a **redundant, stateless cluster** across failure zones, with something above it that can route around a dead instance.

## 1. Why it is a risk

- All north-south traffic goes through it.
- It often depends on other things: an auth service, a rate-limit store (Redis), a config source.
- A bad config pushed to every instance at once can take all of them down together. This is a common real cause of outages.

## 2. How to avoid it

1. **Run many instances, not one.** At least 2 or 3, spread across availability zones, behind a load balancer.
2. **Keep it stateless.** Rate-limit counters go in Redis, sessions in a store, config in a control plane. Any instance can serve any request, so you can add, kill or replace instances freely.
3. **Health checks and autoscaling.** The load balancer removes bad instances and the group scales on load.
4. **Make the layer above it highly available too.** Use a managed load balancer, anycast, or a pair with failover (keepalived/VRRP). Otherwise the single point of failure just moves up one level.
5. **Go multi-region for critical systems.** Global DNS or a global load balancer fails traffic over to another region.
6. **Decide what happens when a dependency fails.** If the rate-limit store is down, fail open or fail closed? See the table below.
7. **Use timeouts and circuit breakers** towards backends, so one slow service cannot tie up all gateway workers.
8. **Roll out config safely.** Canary, validate, then spread. Keep the last known good config.
9. **Keep it thin.** No business logic and no heavy transformations. Less code means fewer ways to fail.
10. **Consider a managed gateway** (for example AWS API Gateway), where the provider runs it across zones.

```flow
# Highly available gateway
Client -> DNS / global LB -> Region A: LB -> Gateway x3 (AZ1, AZ2, AZ3) -> Services
DNS / global LB -> warn: Region B (failover) -> Gateway x3
Gateway -> Redis (shared rate limit state, replicated)
```

## 3. Fail open or fail closed?

| Dependency down | Fail open | Fail closed |
|---|---|---|
| Rate-limit store | Allow traffic, apply a local per-instance limit | Reject requests |
| Auth service | Never for protected routes | Reject requests (default) |
| Config source | Keep last known good config | Not applicable |
| One backend service | Serve a fallback or cached response | Return a fast error |

Public reads usually fail open. Sensitive writes and anything involving auth should fail closed.

## 4. Single instance vs redundant cluster

| | Single gateway | Redundant gateway |
|---|---|---|
| Instance failure | Total outage | Traffic shifts to others |
| Zone failure | Total outage | Survives if spread across zones |
| Deploys | Downtime or risk | Rolling or canary |
| State | Often local | Shared store, instances stateless |
| Cost | Lowest | Higher, but needed in production |

## 5. Common mistakes

- **A single gateway instance.**
- **All instances in one availability zone.**
- **Pushing config to every instance at once.**
- **A shared dependency (Redis, auth) with no failure policy.**
- **Heavy logic in the gateway:** it becomes slow and fragile.
- **A redundant gateway behind one load balancer:** the single point of failure just moved.

## Interview one-liner

> By default the gateway is a single point of failure, so I run it as a stateless cluster across availability zones behind a highly available load balancer, with health checks, autoscaling and safe config rollout. For critical systems I add multi-region failover, and I decide fail-open or fail-closed for each dependency, such as the rate-limit store.

## Cross questions to expect

1. How do you make the load balancer itself highly available?
2. Global load balancing: DNS vs anycast?
3. How do you roll out gateway config safely?
