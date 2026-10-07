---
title: Reverse proxy vs API gateway: when to use which
summary: A reverse proxy forwards requests to your servers. An API gateway is a reverse proxy with API policy on top: auth, rate limits, routing and transformation. Every gateway is a proxy, but not every proxy is a gateway.
topic: Architecture
tags: reverse-proxy, api-gateway, nginx, kong, microservices, interview
date: 2026-10-07
post: 013-reverse-proxy-vs-api-gateway
---

**Short answer:** a reverse proxy sits in front of your servers and forwards client requests to them. An API gateway is a reverse proxy with API-specific features added: authentication, rate limiting, request transformation and versioning. Every API gateway is a reverse proxy. Not every reverse proxy is an API gateway.

## 1. Reverse proxy

- It receives the client request and forwards it to one of the backend servers. The client never talks to a backend directly.
- Core jobs: load balancing, TLS termination, caching, compression, serving static files, and hiding the backend topology.
- It works at the HTTP level and mostly does not care what the API means.
- Examples: Nginx, HAProxy, Envoy, Caddy, Traefik.

```flow
# Reverse proxy
Client -> Reverse proxy -> Server A
Reverse proxy -> Server B
```

## 2. API gateway

- It is the single entry point for your APIs, usually in front of many services (microservices).
- It does what a reverse proxy does, plus API policy:
  - **Auth:** JWT, OAuth, API keys.
  - **Rate limiting** and quotas per client.
  - **Routing** by path, header or version (`/v2/orders` goes to the orders service).
  - **Transformation:** change request or response shape, translate REST to gRPC.
  - **Aggregation:** combine several service calls into one response.
  - **Analytics:** usage, logging, developer portal, billing.
- Examples: Kong, AWS API Gateway, Apigee, Azure API Management, Tyk, Spring Cloud Gateway.

```flow
# API gateway
Client -> API gateway
API gateway -> warn: Auth -> warn: Rate limit -> warn: Route
Route -> ok: Orders
Route -> ok: Users
Route -> ok: Payments
```

## 3. Side by side

| | Reverse proxy | API gateway |
|---|---|---|
| Main purpose | Forward and balance traffic | Manage and secure APIs |
| Knows about | Hosts, paths, HTTP | API clients, keys, versions, plans |
| Auth | Basic, or none | JWT, OAuth, API keys |
| Rate limiting | Simple, if configured | Per client, per plan, quotas |
| Transformation | Rare | Common (shape, protocol, aggregation) |
| Analytics | Access logs | Per-API and per-client usage |
| Typical setup | In front of one app or a few servers | In front of many services |
| Examples | Nginx, HAProxy, Caddy | Kong, Apigee, AWS API Gateway |

## 4. When to use which

- **Reverse proxy only:** one app or a few servers. You need load balancing, TLS, caching or static files, and no per-client API policy.
- **API gateway:** many services behind one public API, third-party consumers, per-client keys and quotas, central auth, versioning.
- **Both (common):** a reverse proxy or load balancer at the edge (TLS, DDoS protection), the API gateway behind it for API policy, and often a service mesh inside for service-to-service traffic.

```flow
# A common layered setup
Client -> CDN / WAF -> Load balancer -> API gateway -> Microservices
```

## 5. Why "both can be used"

Many reverse proxies can act as gateways through plugins or config. Kong is built on Nginx, and Nginx can do auth and rate limiting. So the line is about **purpose**, not product. If you only configure routing and balancing, it is a reverse proxy. If it enforces API policy, it is acting as an API gateway.

## 6. Common mistakes

- **Business logic in the gateway:** keep it to cross-cutting concerns such as auth, limits and routing.
- **Gateway as a single point of failure:** run several instances behind a load balancer.
- **A full gateway for one simple monolith:** a reverse proxy is enough.
- **Authorization only at the gateway:** services should still check what they need, in case traffic reaches them another way.
- **A fat gateway that everyone must change:** it becomes a bottleneck for every team.

## Interview one-liner

> A reverse proxy forwards client requests to backend servers and handles load balancing, TLS, caching and hiding the backend. An API gateway is a specialised reverse proxy for APIs: it adds authentication, rate limiting, routing, transformation and analytics, usually in front of microservices. I use a reverse proxy or load balancer at the edge and a gateway for API policy, and I do not add a gateway until I need those features.

## Cross questions to expect

1. API gateway vs load balancer?
2. API gateway vs service mesh?
3. Forward proxy vs reverse proxy?
4. Is the API gateway a single point of failure, and how do you avoid it?
5. What is the Backend-for-Frontend (BFF) pattern, and how does it differ from a gateway?
