---
title: API gateway vs service mesh: north-south vs east-west
summary: An API gateway manages traffic from outside clients into your system. A service mesh manages traffic between services inside it. The gateway is the front door, the mesh is the internal road network.
topic: Architecture
tags: api-gateway, service-mesh, istio, envoy, microservices, mtls, interview
date: 2026-10-07
post: 016-api-gateway-vs-service-mesh
---

**Short answer:** a gateway manages **north-south** traffic: outside clients coming into your system. A service mesh manages **east-west** traffic: service-to-service calls inside it. The gateway is the front door. The mesh is the internal road network.

## 1. API gateway

- It handles external clients: auth (JWT, OAuth, API keys), quotas, versioning, request transformation and a developer portal.
- It is one logical entry point, run as a small cluster.

## 2. Service mesh

- Every service gets a sidecar proxy (usually Envoy) that handles its network traffic. A control plane (Istio, Linkerd, Consul) pushes config to all of them.
- Features: **mTLS** between services, retries, timeouts, circuit breaking, canary and traffic splitting, service discovery, uniform metrics and tracing.
- App code does not change.
- Some meshes now run without sidecars (Istio ambient mode uses per-node proxies), so the sidecar is the classic model, not the only one.

```flow
# Where each one works
Client -> API gateway -> Orders -> Payments
API gateway -> warn: north-south: auth, quotas, versioning
Orders -> Payments -> ok: east-west: mTLS, retries, tracing
```

```flow
# Mesh internals
Control plane -> Sidecar (Orders)
Control plane -> Sidecar (Payments)
Sidecar (Orders) -> ok: mTLS -> Sidecar (Payments)
```

## 3. Where they overlap

Both route, both can rate limit, both give observability. Meshes also have their own ingress gateway for traffic entering the mesh. The test: is the caller an outside client who needs API policy, or an internal service that needs secure, reliable calls?

## 4. Side by side

| | API gateway | Service mesh |
|---|---|---|
| Traffic | North-south (client to system) | East-west (service to service) |
| Caller | External clients, partners | Your own services |
| Main features | Auth, API keys, quotas, versioning, transformation | mTLS, retries, timeouts, circuit breaking, canary |
| Runs as | Central cluster at the edge | Sidecar or node proxy next to every service |
| App changes | Clients call the gateway | None |
| Cost | One extra hop at the edge | Extra hop per call, plus a control plane |
| Examples | Kong, Apigee, AWS API Gateway | Istio, Linkerd, Consul |

## 5. When to use which

- **Gateway:** always, when you expose APIs to external clients.
- **Mesh:** many microservices where you need mTLS, uniform retries and timeouts, canaries and tracing without changing every service.
- **Neither:** a monolith or a handful of services. A mesh adds cost, latency per hop and operational complexity.

## 6. Common mistakes

- **A mesh for 5 services:** the operational cost outweighs the benefit.
- **Retries in both gateway and mesh:** retries multiply into a retry storm.
- **The gateway for internal service-to-service calls:** it becomes a bottleneck.
- **Ignoring the control plane:** it is now critical infrastructure.

## Interview one-liner

> An API gateway handles north-south traffic: external clients, auth, quotas, routing and versioning. A service mesh handles east-west traffic between services with sidecar or node proxies, giving mTLS, retries, circuit breaking, traffic splitting and observability without code changes. I use a gateway at the edge and add a mesh only when the number of services justifies it.

## Cross questions to expect

1. Sidecar vs sidecar-less (ambient) mesh?
2. What is mTLS and why use it between services?
3. Mesh vs client-side libraries like Resilience4j?
