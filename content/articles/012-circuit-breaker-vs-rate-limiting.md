---
title: Circuit breaker vs rate limiting: what is the difference?
summary: Rate limiting caps how much traffic is allowed, regardless of health. A circuit breaker stops calling a dependency because it is failing. One is a quota, the other is a failure detector.
topic: Reliability
tags: circuit-breaker, rate-limiting, resilience, load-shedding, interview
date: 2026-10-05
post: 012-circuit-breaker-vs-rate-limiting
---

**Short answer:** rate limiting caps *how much* traffic is allowed, whether or not anything is broken. A circuit breaker stops calling a dependency *because it is broken*. One is a quota, the other is a failure detector.

## 1. Rate limiting

- It limits requests per time window, for example 100 requests per minute per user, IP or API key.
- It is **proactive**. It works from a policy, not from the health of your system.
- It usually sits on the **receiving** side (API gateway, server), and can also be applied client-side.
- The response is usually `429 Too Many Requests`, often with a `Retry-After` header.
- It protects against abuse, noisy neighbours, bursts and accidental overload.
- Common algorithms: fixed window, sliding window, token bucket, leaky bucket.

## 2. Circuit breaker

- It wraps calls to a dependency (a database, Redis, another service) and tracks failures and latency.
- It is **reactive**. It acts on observed health.
- It sits on the **calling** side.
- It has three states:
  - **Closed:** normal. Calls go through and failures are counted.
  - **Open:** the failure rate crossed a threshold, so calls fail immediately without touching the dependency, for a cool-down period.
  - **Half-open:** after the cool-down, a few trial calls go through. If they succeed it closes, otherwise it opens again.
- Typical settings: open at 50 percent failures over the last 20 calls, wait 30 seconds, allow 5 trial calls.
- It protects the **caller** (no threads or connections stuck waiting on timeouts, fast failure) and gives the **dependency** room to recover.

## 3. Side by side

| | Rate limiting | Circuit breaker |
|---|---|---|
| Trigger | Request count over a window | Failure rate or slow responses |
| Based on | Policy or quota | Observed health |
| Applied by | Server or gateway | The caller |
| Protects | A service from too much traffic | The caller and a failing dependency |
| Typical response | `429`, queue or delay | Fast error or fallback |
| Resets | When the window or tokens refill | After cool-down plus successful probes |

## 4. How they work together (the cache-down case)

- A rate limiter at the edge keeps total traffic, and per-client traffic, within what the system can handle.
- A circuit breaker around the database opens when the database starts timing out, so requests fail fast or use a fallback (stale or default data) while it recovers.
- Add **load shedding** (drop low-priority work when the whole system is overloaded) and **bulkheads** (limit concurrent calls to one dependency) for full protection.

## 5. Common mistakes

- **Breaker without a fallback:** users just get fast errors. Decide what to return.
- **Thresholds too sensitive:** the breaker flaps open and closed. Use a minimum number of calls and a sensible window.
- **Per-IP rate limits behind NAT or proxies:** many users share one IP. Prefer per-user or per-API-key limits.
- **Retries without backoff and jitter:** they multiply load on a struggling dependency. A breaker plus bounded retries prevents a retry storm.
- **Only rate limiting:** it does not help when the limit is fine but the dependency is down.
- **Only a breaker:** it does not stop a single abusive client.

## Interview one-liner

> Rate limiting is proactive and policy-based: it caps requests per client or window and returns 429, protecting a service from too much traffic. A circuit breaker is reactive and health-based: it watches failures and latency of a dependency, opens to fail fast, then half-opens to probe recovery, protecting the caller and letting the dependency recover. I use both, plus bulkheads and load shedding.

## Cross questions to expect

1. Circuit breaker vs retry vs timeout: how do they fit together?
2. Rate limiting vs load shedding?
3. Where do you rate limit: client, gateway or service?
4. How do you implement a distributed rate limiter in Redis?
