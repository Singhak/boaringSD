---
title: API gateway vs load balancer: what is the difference?
summary: A load balancer spreads traffic across copies of one service. An API gateway fronts many services and applies API policy. One picks an instance, the other picks a service and checks the client.
topic: Architecture
tags: api-gateway, load-balancer, l4, l7, microservices, interview
date: 2026-10-07
post: 014-api-gateway-vs-load-balancer
---

**Short answer:** a load balancer spreads traffic across identical copies of one service so no server is overloaded. An API gateway sits in front of many different services and applies API policy: auth, rate limits, routing and transformation. The load balancer answers "which instance?". The gateway answers "which service, and is this client allowed?".

## 1. Load balancer

- It distributes requests across multiple instances of the **same** service.
- It runs health checks and removes bad instances, which gives availability and horizontal scaling.
- It works at **L4** (TCP/UDP: fast, does not read the request) or **L7** (HTTP: can route by path or header).
- Algorithms: round robin, least connections, weighted, IP hash, consistent hashing.
- Examples: AWS ALB and NLB, HAProxy, Nginx, Envoy, F5.

```flow
# Load balancer: one service, many copies
Client -> Load balancer -> Instance 1
Load balancer -> Instance 2
Load balancer -> Instance 3
```

## 2. API gateway

- It is one entry point for **many different** services.
- It handles auth, rate limiting and quotas, path and version routing, transformation, aggregation, API keys and analytics.
- It still has to pick an instance of the target service. It usually does that with service discovery and a built-in balancer, or hands off to a load balancer.

```flow
# API gateway: many services, one front door
Client -> API gateway
API gateway -> warn: Auth -> warn: Rate limit -> warn: Route
Route -> ok: Orders service
Route -> ok: Users service
```

## 3. Why they get confused

- An L7 load balancer also routes by path, so it looks like a gateway. It lacks API keys, per-client quotas, transformation and developer features.
- A gateway also balances load. That is a side feature, not its purpose.
- Cloud products blur the line. AWS ALB is a load balancer. AWS API Gateway is a gateway. Kong and Envoy can act as either, depending on config.

## 4. Side by side

| | Load balancer | API gateway |
|---|---|---|
| Main purpose | Spread load, keep availability | Manage and secure APIs |
| Fronts | Copies of one service | Many different services |
| Decides | Which instance | Which service, and whether the client may call it |
| Layer | L4 or L7 | L7 (HTTP, gRPC) |
| Health checks | Core feature | Often delegated |
| Auth, quotas, keys | No | Yes |
| Request transformation | No | Yes |
| Examples | ALB, NLB, HAProxy | Kong, Apigee, AWS API Gateway |

## 5. When to use which

- **Load balancer only:** one service, or a few, with many instances. You need availability and scale, with no per-client API policy.
- **API gateway:** many services, public or third-party consumers, central auth, quotas, versioning.
- **Both (standard):** a load balancer at the edge, the gateway behind it, and a balancer in front of each service's instances. The gateway is itself a service, so it needs a load balancer in front or it becomes a single point of failure.

```flow
# Typical production path
Client -> L4/L7 load balancer -> API gateway (x3) -> Internal balancer -> Orders (x5)
```

## 6. Common mistakes

- **A gateway when you only need to spread traffic:** it adds latency and cost.
- **One gateway instance with no load balancer in front:** it is a single point of failure.
- **Expecting a load balancer to enforce per-client quotas or API keys:** it does not.
- **Sticky sessions that hide stateful servers:** they scale badly and unbalance load.

## Interview one-liner

> A load balancer distributes traffic across instances of one service for scale and availability, at L4 or L7. An API gateway fronts many services and adds auth, rate limiting, routing and transformation. In practice I put a load balancer at the edge and in front of the gateway, so the gateway is not a single point of failure.

## Cross questions to expect

1. L4 vs L7 load balancing?
2. Is the API gateway a single point of failure, and how do you avoid it?
3. Which load balancing algorithm for which workload?
