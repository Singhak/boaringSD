---
title: Backend for Frontend (BFF) vs API gateway
summary: A gateway is one generic front door for all clients. A BFF is a separate backend per client experience, shaped for that client and owned by its team. The gateway handles cross-cutting concerns, the BFF handles client-specific shaping.
topic: Architecture
tags: bff, api-gateway, microservices, graphql, frontend, interview
date: 2026-10-07
post: 019-bff-vs-api-gateway
---

**Short answer:** a gateway is one generic front door for all clients. A Backend for Frontend (BFF) is a separate backend **per client experience** (web, mobile, TV), shaped for that client and usually owned by that client's team. The gateway handles cross-cutting concerns. The BFF handles client-specific data shaping.

## 1. The problem BFF solves

A web app, a phone app and a smart TV need different things from the same services:

- Different data shape and payload size (the phone wants less).
- Different number of calls (the phone wants one call, not five).
- Different auth and session flows.
- Different release speed.

One shared general API ends up either bloated with options for every client, or wrong for all of them. Sam Newman named the BFF pattern as the fix.

## 2. What a BFF does

- Aggregates calls to several services into one response.
- Trims, reshapes and renames data for that client.
- Handles client-specific logic: pagination style, formats, feature flags.
- For browser single-page apps, can keep OAuth tokens server-side and give the browser only a session cookie, so tokens never sit in JavaScript.
- Is owned by the same team as the frontend, so they can change it without waiting on a platform team.

```flow
# One BFF per client experience
Web app -> Web BFF -> Services
Mobile app -> Mobile BFF -> Services
TV app -> TV BFF -> Services
```

## 3. How they fit together

They are not rivals. A common setup is the gateway at the edge, BFFs behind it, and services behind those. GraphQL is an alternative way to let each client pick its own shape.

```flow
# A common layered setup
Client -> API gateway: auth, limits, TLS -> ok: BFF (per client) -> Orders / Users / Payments
```

## 4. BFF vs API gateway

| | API gateway | BFF |
|---|---|---|
| Count | One (a cluster) | One per client experience |
| Purpose | Cross-cutting edge concerns | Client-specific shaping and aggregation |
| Logic | Generic: auth, quotas, routing | Specific to one frontend |
| Owner | Platform or infra team | Frontend team |
| Knows about clients | No, treats all alike | Yes, built for one |
| Changes | Rarely, carefully | Often, with the UI |
| Typical tools | Kong, Apigee, AWS API Gateway | Node, Spring or GraphQL service per client |

## 5. When to use it

- Several very different clients with different needs.
- Frontend teams blocked on a shared backend team.
- The mobile app makes too many round trips.
- Skip it for one client, or clients with nearly identical needs.

## 6. Common mistakes

- **Business rules in the BFF:** they belong in the services, or each BFF reimplements them.
- **One BFF per team instead of per experience,** or too many tiny BFFs.
- **Duplicated code across BFFs** with no shared library or ownership.
- **Turning the BFF into a second shared monolith.**
- **Auth, rate limiting and TLS in every BFF** instead of once at the gateway.

## Interview one-liner

> A gateway is one generic edge that does auth, rate limiting and routing for every client. A Backend for Frontend is a separate backend per client type, owned by the frontend team, that aggregates and reshapes data for that client. I put the gateway at the edge and BFFs behind it, and keep business logic in the services.

## Cross questions to expect

1. BFF vs GraphQL?
2. How do you share code between BFFs without coupling them?
3. Where should auth live: gateway, BFF or services?
