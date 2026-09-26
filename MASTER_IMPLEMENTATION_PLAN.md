# System Design Quest: Master Implementation Plan
> **Unified Single Source of Truth**  
> Consolidating all architectural roadmaps, gameplay designs, MVP specifications, and future tracks.  
> Clearly divided into **Part I: Already Implemented** and **Part II: Future Roadmap & Unimplemented Tracks**.

---

## Executive Summary & Core Philosophy

### Product Vision & Single Core Motive
> **"One who comes to the website learns system design without being bored. He not only plays a game, but actually learns the concepts deeply."**

**BoaringSD** transforms system design learning from passive textbook reading into an indispensable, tactical engineering flight simulator:
```
Outage Fire ──► Concept Intel (ELI5 Analogy) ──► Architectural Deploy ──► Tradeoff Ledger ──► Second-Order Cascade ──► FAANG Post-Mortem ──► Boss Builder
```

### The 6 Unified Product Pillars
1. **Just-In-Time Concept Intel**: 30-second ELI5 analogies (e.g. *The Carpool Analogy for Singleflight*, *The Bathroom Key for Mutex*) and visual dataflows on every choice card so engineers never guess blindly.
2. **Concept-Guarded Procedural Synthesizer (Every Level is a Surprise)**: Dynamic outage archetypes, fluctuating traffic scales (20k–350k req/s), and mid-flight chaos curveballs ensure no two runs are identical while mastering that level's core pattern.
3. **Tactical War Room & Telemetry Inspector**: Real digital detective work—click topology nodes to inspect PostgreSQL slow query logs, Redis memory stats, and tweak live operational knobs (TTL sliders, mutex toggles).
4. **4-Stage FAANG Interview Arena**: Standard FAANG 4-stage interview simulation (*Requirements Scoping & Distractor Trap Detection $\rightarrow$ Back-of-the-Envelope Capacity Math $\rightarrow$ High-Level Architecture $\rightarrow$ Staff Deep Dive & Concurrency Defense*).
5. **Architectural Tradeoff Cards & SRE Defense Gates**: Replaces binary guessing with multi-dimensional engineering cards balancing Monthly Cloud Cost ($\Delta$), Latency Impact, Operational Complexity (1-5), and Consistency Guarantees, paired with a mandatory SRE verification gate.
6. **6-Axis Engineering Competency Mastery Radar**: Verified competency tracking across *Bottleneck Diagnosis, Pattern Selection, Capacity Estimation, Tradeoff Defense, End-to-End Design, and Resilience & Recovery*.

### The Cardinal Rule
```
Abstract Pattern First  ──►  Identify Bottleneck  ──►  Defend Tradeoff & Scale  ──►  Deploy Cloud Service
```
Learners master foundational distributed systems principles (Horizontal Scaling, Caching, Read Replicas, Queues, Sharding) before being introduced to cloud provider implementations (AWS, Azure, GCP) or advanced infrastructure tracks.

### Action Before Authentication ("No Thinking UX")
Users must never be paralyzed by onboarding forms or complex navigation menus. On their very first visit, they are immediately placed into a production incident, resolve it with interactive decisions, and only then save their progress.

---

## Honest Status (updated 2026-09-26)
> The earlier self-scores in this section (9.3/10 overall) were not backed by the code. A learner-eyes review scored the app about **4.5/10**: answers were guessable (the correct option was always first), most scenario-pack incidents were machine-templated with broken labels, nothing required reasoning, progress evidence was inflated, and several "shipped" features were cosmetic. This table records what is actually live after the quality-fix pass.

| Area | Status | Notes |
| :--- | :--- | :--- |
| Answer integrity | **Live** | Every multiple-choice surface shuffles options per attempt (`src/lib/shuffle.ts`); answer leaks removed; `answerOrder.test.ts` guards it. |
| Scenario content | **Live, growing** | 132 of 302 incidents pass the content-quality gate (`src/data/incidentQuality.ts`); the other 170 are hidden until rewritten per `docs/content-style.md`. Every level has 6+ playable War Room incidents. |
| Replay variety | **Live** | War Room replays rotate incidents and apply procedural skins (traffic scale, region, occasion) via `src/lib/incidentSkin.ts`. |
| Transfer check | **Live** | "Aftershock" question closes every War Room level; only a first-try pass counts as transfer evidence. |
| Free-text reasoning | **Live** | "Defend your call" (≤280 chars) graded by an LLM against a server-side rubric (`/api/grade`, Gemini provider), with self-assessment fallback. Required for the Reliable tier. |
| Progress evidence | **Live** | Run results report real first-try/hint data; the radar is computed only from measured results and shows "Scouting" until an axis has 3+ attempts. |
| Builder grading | **Live** | Simulation follows the wiring; cloud-credit budgets and unneeded-component penalties stop "place everything"; accepted archetypes let alternate designs pass. |
| Interview arena | **Live** | The design stage is a canvas (`ArchitectureCanvas`); only components wired on a path from the client count (`designFromGraph`). Over-engineering and overtime penalties, first-attempt follow-up scoring, pillar results saved. |
| Estimation | **Live** | One ratio-based scorer (`src/lib/estimation.ts`) for the gym and the interview; accepts "12k", "1.5M", "1e4". |
| Telemetry inspector | **Illustrative** | Seeded from the incident's own graph and metrics and labelled illustrative; knobs removed from the War Room (they only work in the flight sim). |
| Accounts / sync | **Not built** | Progress is local to the browser. The fake sign-in and the demo-user `/api/progress` mirror were removed. |
| Procedural outage synthesizer | **Not built** | Replaced by incident rotation, skins and curveballs: on replays, a seeded 50% chance fires a second incident from the same pack after the fix. |
| Coverage | **Growing** | Added levels 16–18 (Depth tier: CAP & PACELC, Consensus & Quorums, Storage Engines & Indexing), each with a 6-incident pack, a builder boss and 2 reasoning prompts. Added case studies: rate limiter, KV store, payments ledger, web crawler, typeahead, notifications (14 total). Still missing: ID generation, search, streams, observability, auth; chat and feed ranking case studies. |

---

## Document Structure & Status Overview

```mermaid
graph TD
    subgraph Part1["PART I: ALREADY IMPLEMENTED (LIVE IN CODEBASE)"]
        A1["1. First-Run Incident Onboarding (Pushpa Mode)"]
        A2["2. War Room Engine, Tradeoff Cards & SRE Defense Gates"]
        A3["3. 18-Level 4-Tier Pattern Campaign"]
        A4["4. Architecture Builder & Multi-Path Boss Battles"]
        A5["5. 4-Stage FAANG Mock Interview Arena"]
        A6["6. 6-Axis Engineering Competency Mastery Radar"]
        A7["7. Progression, Evidence Model & Local Persistence"]
        A8["8. Auxiliary Labs & Math Capacity Gym"]
    end

    subgraph Part2["PART II: FUTURE ROADMAP (PLANNED / BACKLOG)"]
        F1["Phase 1: Auth, Real Database Sync & Route Consolidation"]
        F2["Phase 2: Expanded Real-World Problem Catalog (V3)"]
        F3["Phase 3: Cloud Service Application Layer (V4 Multi-Cloud)"]
        F4["Phase 4: Production Cloud Architecture Missions (V5)"]
        F5["Phase 5: Tradeoff & Vendor Lock-In Simulators (V6 & V7)"]
        F6["Phase 6: Chaos Engineering & Live Outage Track (V8)"]
        F7["Phase 7: Observability & Security Tracks (V9 & V10)"]
        F8["Phase 8: SRE Reliability & AI Interview Grilling (V11 & V12)"]
        F9["Phase 9: Enterprise Career Paths & Diagnostic Engine (V13)"]
    end

    Part1 -->|Natural Evolution| Part2
```

---

# PART I: ALREADY IMPLEMENTED (LIVE IN CODEBASE)

This section documents all features, engines, data models, and UI surfaces that are fully implemented and functional in the active repository.

---

### 1. First-Run "No Thinking" Incident Onboarding (Pushpa Mode)
* **Status**: **Live**. `/mission` now redirects to `/`.
* **Primary Files**:
  * [`src/app/page.tsx`](file:///d:/03-React/boaringSD/src/app/page.tsx)
  * [`src/components/PushpaMissionWarRoom.tsx`](file:///d:/03-React/boaringSD/src/components/PushpaMissionWarRoom.tsx)
* **Capabilities**:
  * **Zero Friction Entry**: Unauthenticated users opening `/` bypass marketing fluff and are paged with a live P0 outage: *"The feed is down — 100,000 req/s, 98% CPU, 4,200ms latency, 504 errors"*.
  * **Interactive War Room Simulation**:
    * **Incident 1 (`hs-01` / INC-001 Horizontal Scaling)**: App CPU saturated at 98% under 100,000 req/s $\rightarrow$ Deploy stateless application server fleet $\rightarrow$ CPU normalizes.
    * **Incident 2 (`lb-01` / INC-002 Load Balancing)**: Severe traffic skew with Server 1 overloaded at 90% while other servers sit idle $\rightarrow$ Deploy Load Balancer reverse proxy with round-robin distribution $\rightarrow$ Traffic balanced evenly.
  * **Completion & Transition**: Fulfills `hasFinishedOnboarding()`, awards +150 XP, unlocks Level 1 on the campaign map, and transitions `/` to the dynamic next-action dashboard.

---

### 2. Playable Incident Schema v2 & War Room Engine
* **Status**: **Live**, with corrections: tradeoff defense sets exist for 2 of 15 patterns (caching, load balancing); the standalone `TradeoffCard` component was unused and has been removed (choice cards show tradeoff badges instead).
* **Primary Files**:
  * [`src/types/index.ts`](file:///d:/03-React/boaringSD/src/types/index.ts) (`IncidentV2`, `IncidentGraph`, `IncidentChoice`, `IncidentMetric`, `TradeoffCardOption`)
  * [`src/components/incident/IncidentWarRoom.tsx`](file:///d:/03-React/boaringSD/src/components/incident/IncidentWarRoom.tsx)
  * [`src/components/incident/ArchitecturalDefenseModal.tsx`](file:///d:/03-React/boaringSD/src/components/incident/ArchitecturalDefenseModal.tsx)
  * [`src/data/tradeoffScenarios.ts`](file:///d:/03-React/boaringSD/src/data/tradeoffScenarios.ts)
  * [`src/data/scenarioPacks.ts`](file:///d:/03-React/boaringSD/src/data/scenarioPacks.ts)
  * [`src/data/scenarioPacks/*.json`](file:///d:/03-React/boaringSD/src/data/scenarioPacks/) (15 scenario pack files)
* **Capabilities**:
  * **Data-Driven Incident Runtime**: Incidents load from declarative JSON specifications containing `metricsBefore`, `graphBefore`, interactive choices, and `metricsAfter` / `graphAfter` outcomes.
  * **Dynamic Topology Graphing**: Renders live SVG network topologies connecting `users`, `lb`, `server`, `cache`, `db`, `replica`, `cdn`, `queue`, `worker`, and `gpu` nodes with real-time status tones (`good`, `bad`, `warn`, `neutral`).
  * **Wrong-Answer Physics**: Submitting an incorrect option degrades the system (e.g. CPU spikes to 99%, 504 gateway timeouts worsen, nodes turn red/shake) and provides architectural remediation guidance rather than a static error toast.
  * **15 Incident Scenario Packs**:
    1. `horizontal-scaling.json` (INC-001)
    2. `load-balancing.json` (INC-002)
    3. `read-replicas.json` (INC-003)
    4. `caching.json` (INC-004)
    5. `cdn-edge.json` (INC-005)
    6. `async-queues.json` (INC-006)
    7. `sharding.json` (INC-007)
    8. `consistency.json` (INC-008)
    9. `rate-limiting.json` (INC-009)
    10. `circuit-breaker.json` (INC-010)
    11. `connection-pooling.json` (INC-011)
    12. `backpressure.json` (INC-012)
    13. `idempotency.json` (INC-013)
    14. `multi-region.json` (INC-014)
    15. `health-checks.json` (INC-015)
  * **Multi-Attribute Tradeoff Cards**: Replaces binary pass/fail mechanics with interactive engineering cards displaying **Monthly Cloud Cost ($\Delta$)**, **P99 Latency Impact**, **Operational Complexity (1–5)**, and **Consistency Guarantees** (`Strict ACID`, `Eventual Consistency`, `Read-Your-Writes`).
  * **SRE Architectural Defense Gate** (caching and load-balancing levels): a modal asks *"Why this pattern over X?"* and *"What fails at 10x?"*. It is scored on the first attempt; after feedback the learner may deploy anyway without the defense bonus.
  * **Second-Order Cascade Outage Engine**: Chained downstream incident propagation where initial fixes trigger realistic follow-up failures (e.g., naive TTL expiration $\rightarrow$ DB cache stampede; aggressive replica offloading $\rightarrow$ replication lag & dirty reads). Features impending countdown warnings, fast-forwarding, and "Staff Engineering Defense" debrief achievements.

---

### 3. 18-Level 4-Tier Pattern Campaign & Roadmap
* **Status**: **Live**. Guided study mode is `?mode=study` (`?mode=guided` still accepted).
* **Primary Files**:
  * [`src/app/campaign/page.tsx`](file:///d:/03-React/boaringSD/src/app/campaign/page.tsx)
  * [`src/app/campaign/[chapterId]/page.tsx`](file:///d:/03-React/boaringSD/src/app/campaign/[chapterId]/page.tsx)
  * [`src/data/campaign.ts`](file:///d:/03-React/boaringSD/src/data/campaign.ts)
  * [`src/data/patterns.ts`](file:///d:/03-React/boaringSD/src/data/patterns.ts)
  * [`src/components/PatternMap.tsx`](file:///d:/03-React/boaringSD/src/components/PatternMap.tsx)
* **Curriculum Structure**:
  * **Tier 1: Foundation (Levels 01–05)**
    * `01. Horizontal Scaling`: Stateless server replication, traffic saturation.
    * `02. Load Balancing`: Reverse proxy distribution, health routing algorithms.
    * `03. Read Replicas`: Master-replica replication, read/write splitting.
    * `04. In-Memory Caching`: Cache-aside, cache stampede, sub-5ms lookups.
    * `05. CDN & Edge Delivery`: Static asset offloading, Anycast DNS, edge caching.
  * **Tier 2: Resilience (Levels 06–10)**
    * `06. Asynchronous Queues`: Decoupling ingress bursts, worker fan-out.
    * `07. Database Sharding`: Hash-based partitioning, hotspot mitigations.
    * `08. Distributed Consistency`: CAP theorem, strong vs eventual consistency, quorum reads/writes.
    * `09. Rate Limiting`: Token bucket, leaky bucket, DDoS & API abuse mitigation.
    * `10. Circuit Breakers`: Cascading failure prevention, open/half-open/closed states.
  * **Tier 3: Mastery (Levels 11–15)**
    * `11. Connection Pooling`: PostgreSQL socket limits, TCP handshake reuse.
    * `12. Backpressure & Throttling`: Queue saturation defense, push vs pull flow control.
    * `13. Idempotency & Outbox`: Duplicate payment prevention, transactional outbox pattern.
    * `14. Multi-Region DR`: Cross-continent latency, active-active vs active-passive failover.
    * `15. Health Checks & Eviction`: Deep vs shallow probes, grey failure detection, automated pod eviction.
* **Dual Run Loop in `[chapterId]`**:
  * **Simulation War Room Mode**: Real-time interactive incident triage.
  * **Structured Pattern Run Mode**: 6-stage evidence loop (Observe $\rightarrow$ Diagnose $\rightarrow$ Deploy $\rightarrow$ Tradeoff Counter-Strike $\rightarrow$ Transfer Question $\rightarrow$ Spaced Review Post-Mortem).

---

### 4. Interactive Architecture Builder & Multi-Path Boss Battles
* **Status**: **Live**, with corrections: `bossBattles.ts` was never used by any page and has been removed. Multi-path support now lives on `BuilderScenario.acceptedArchetypes` (no shipped scenario uses it yet).
* **Primary Files**:
  * [`src/app/builder/page.tsx`](file:///d:/03-React/boaringSD/src/app/builder/page.tsx)
  * [`src/lib/builderScore.ts`](file:///d:/03-React/boaringSD/src/lib/builderScore.ts)
  * [`src/data/builderScenarios.ts`](file:///d:/03-React/boaringSD/src/data/builderScenarios.ts)
  * [`src/components/builder/CustomNodes.tsx`](file:///d:/03-React/boaringSD/src/components/builder/CustomNodes.tsx)
* **Capabilities**:
  * **React Flow Canvas**: Drag-and-drop design surface supporting Clients, Load Balancers, Servers, Caches, Databases, Read Replicas, CDNs, and Queues.
  * **Live Traffic Stress Simulation**: Slider injecting 1,000 to 50,000 req/s into the visual topology, calculating node CPU, queue backpressure, cache hits, and latency bottlenecks.
  * **Scenario Boss Mode (`/builder?scenario=<id>`)**: Launches predefined broken systems with concrete traffic parameters, required components, and win criteria.
  * **Wiring-aware grading**: traffic follows the edges (an LB only feeds servers it connects to; a cache only helps if a serving server uses it), and a cloud-credit budget plus unneeded-component penalties stop "place every component" from winning.

---

### 5. 4-Stage FAANG Mock Interview Arena
* **Status**: **Live**. The design stage is a drawable canvas graded on wiring (unwired parts are ignored and extras are penalized); the timer applies an overtime penalty rather than ending the interview.
* **Primary Files**:
  * [`src/app/interview/page.tsx`](file:///d:/03-React/boaringSD/src/app/interview/page.tsx)
  * [`src/components/interview/InterviewScopeStep.tsx`](file:///d:/03-React/boaringSD/src/components/interview/InterviewScopeStep.tsx)
  * [`src/components/interview/InterviewMathStep.tsx`](file:///d:/03-React/boaringSD/src/components/interview/InterviewMathStep.tsx)
  * [`src/data/interview.ts`](file:///d:/03-React/boaringSD/src/data/interview.ts)
* **Capabilities**:
  * **Stage 1: Requirements Scoping & Scope Creep Distractor Traps**: Candidates clarify functional goals, define non-functional SLOs, and identify deliberate out-of-scope traps (e.g. 4K video transcoding for TinyURL or biometric login gates).
  * **Stage 2: Capacity Estimation Workspace**: Interactive numeric inputs for Read QPS, 5-Year Storage Capacity (TB), and 80/20 RAM Cache sizing with logarithmic tolerance evaluation ($\pm 15\%$ perfect, $\pm 35\%$ acceptable) and collapsible step-by-step derivations.
  * **Stage 3: High-Level Architecture Design**: Component toggles (Edge CDN, Load Balancer, In-Memory Cache, Queue, Database, Replicas) and autoscaling server fleet with live topology rendering and SPOF detection.
  * **Stage 4: Staff-Level Deep-Dive Probing**: Interactive interviewer follow-ups probing race conditions (Base62 distributed counter ranges, token buckets, celebrity fanout push/pull hybrid models, transactional outbox).
  * **Stage 5: Comprehensive 4-Pillar Evaluation Scorecard**: Weighted hiring committee scorecard (*Scoping 25%, Capacity Math 25%, Topology & SPOF 25%, Staff Defense 25%*) with a practice verdict per pillar (the old "Strong Hire · Staff Architect" labels were removed; a practice score is not a hiring signal). An optional "Defend your design" free-text round follows.
  * **Implemented Problem Scenarios**:
    1. **Tier 1 (Beginner)**: *Design URL Shortener (TinyURL)* (100:1 read ratio, 40k Read QPS, 3 TB 5-yr storage, 10 GB RAM cache, Base62 token ranges).
    2. **Tier 2 (Intermediate)**: *Design Twitter Feed (Timeline & Fanout)* (300M DAU, 21k Read QPS, 270 TB 5-yr storage, 1.9 TB RAM cache, hybrid push/pull fanout).
    3. **Tier 3 (Advanced)**: *Design Uber (Geospatial Ride Dispatch)* (5M drivers, 1.25M GPS pings/sec write throughput, 325 MB RAM footprint, Redis GeoHash / S2 cells).
    4. **Tier 4 (Staff)**: *Design Global E-Commerce (Amazon Prime Day)* (50M concurrent shoppers, 500k catalog RPS, 50k orders/sec flash burst, Lua atomic inventory leasing).

---

### 6. 6-Axis Engineering Competency Mastery Radar
* **Status**: **Live, rebuilt**. Previously the axes counted activity (streaks, XP, interview count); they are now computed only from measured results, shrunk toward zero for small samples, and show "Scouting" until an axis has 3+ attempts.
* **Primary Files**:
  * [`src/components/dashboard/SkillRadarChart.tsx`](file:///d:/03-React/boaringSD/src/components/dashboard/SkillRadarChart.tsx)
  * [`src/lib/progression.ts`](file:///d:/03-React/boaringSD/src/lib/progression.ts) (`calculateSkillRadar`)
  * [`src/app/dashboard/page.tsx`](file:///d:/03-React/boaringSD/src/app/dashboard/page.tsx)
* **Capabilities**:
  * **Measured Competency Engine**: a 0–100 reading per axis from first-try diagnoses and fixes, transfer passes, estimate accuracy, defenses and reasoning scores, builder passes, reviews, and interview pillars:
    1. **Bottleneck Diagnosis**: Telemetry triage, slow query analysis, and log inspection.
    2. **Pattern Selection**: Choosing optimal distributed patterns under explicit constraints.
    3. **Capacity Estimation**: Back-of-the-envelope math intuition, QPS, storage, and RAM cache sizing.
    4. **Tradeoff Defense**: Defending cost vs latency vs complexity vs consistency tradeoffs.
    5. **End-to-End Design**: Assembling multi-tier architectures without single points of failure.
    6. **Resilience & Recovery**: Surviving cascading outages, circuit breakers, and disaster failovers.
  * **Cyber-Aesthetic SVG Polygon Visualization**: Native SVG polygon chart with glowing vertices, concentric 5-ring grid lines, competency drilldown cards, and automated personalized growth recommendations.
  * **Engineering Competency Tiers**: Candidates advance across *Novice*, *Proficient*, *Advanced*, and *Staff Architect* ranks based on proven mission evidence.

---

### 7. Progression, Evidence Model & Local Persistence
* **Status**: **Live**. Stats schema v3; localStorage only (no accounts).
* **Primary Files**:
  * [`src/lib/progression.ts`](file:///d:/03-React/boaringSD/src/lib/progression.ts)
  * [`src/lib/storage.ts`](file:///d:/03-React/boaringSD/src/lib/storage.ts)
  * [`src/lib/useUserStats.ts`](file:///d:/03-React/boaringSD/src/lib/useUserStats.ts)
  * [`src/lib/*.test.ts`](file:///d:/03-React/boaringSD/src/lib/) (157 automated tests: progression, builder wiring/budgets, answer order, content-quality gate, skins, estimation, grading, interview design, radar)
* **Capabilities**:
  * **Honest Evidence Model**: Replaces superficial percentage progress with verified mastery states:  
    `Unseen ──► Introduced ──► Applied Once ──► Passed Transfer ──► Reliable ──► Needs Review`
  * **Reliability Gate**: A pattern can only achieve `Reliable` after passing the pattern run, a first-try transfer question, an architecture builder boss, a later spaced review (1, 3, 7, 30 days), and a "Defend your call" answer scoring 60+ (self-assessment counts half).
  * **Pure Progression Functions**: Next-action recommendation (`selectNextAction()`), daily streak calculation, level thresholds, and XP award idempotency.
  * **LocalStorage v1 $\rightarrow$ v2 $\rightarrow$ v3 Migration**: Staged, versioned browser persistence with automatic fallback guards.

---

### 8. Auxiliary Labs & Math Capacity Gym
* **Status**: **Live**. Labs are defined once in `src/lib/labs.ts` (navbar, dashboard and page gates agree). Challenge Lab is now "Case Studies"; the math gym is the "Estimation Gym" and records results into the radar.
* **Primary Files**:
  * [`src/app/math/page.tsx`](file:///d:/03-React/boaringSD/src/app/math/page.tsx): Back-of-the-envelope estimation drills & 60-second speed sprints.
  * [`src/data/mathProblems.ts`](file:///d:/03-React/boaringSD/src/data/mathProblems.ts): Canonical problems for QPS, storage, bandwidth, RAM, availability, and cloud cost.
  * [`src/app/evolution/page.tsx`](file:///d:/03-React/boaringSD/src/app/evolution/page.tsx): 5-stage evolutionary scaling simulation (1 user $\rightarrow$ 10M users).
  * [`src/app/guided/page.tsx`](file:///d:/03-React/boaringSD/src/app/guided/page.tsx): Guided thinking mode (Requirements $\rightarrow$ Entities $\rightarrow$ APIs $\rightarrow$ Architecture).
  * [`src/app/learn/[lessonId]/page.tsx`](file:///d:/03-React/boaringSD/src/app/learn/[lessonId]/page.tsx): Foundational interactive concept lessons.
  * [`src/app/dashboard/page.tsx`](file:///d:/03-React/boaringSD/src/app/dashboard/page.tsx): Learner profile, rank title, XP breakdown, 6-Axis Skill Radar, and next mission CTA.

---

# PART II: FUTURE ROADMAP & UNIMPLEMENTED TRACKS

This section details all planned enhancements, technical refactors, and advanced curriculum tracks structured into prioritized implementation phases.

---

## Phase 1: Authentication, Real Database Sync & Route Consolidation
> **Priority: High | Focus: Technical Debt, Platform Reliability & Clean UX**

### 1.1 True Cross-Device Persistence (Prisma + PostgreSQL + NextAuth)
* **Current Limitation**: User progress lives only in browser `localStorage`. The current [`src/app/api/progress/route.ts`](file:///d:/03-React/boaringSD/src/app/api/progress/route.ts) writes all data to a single hardcoded demo user and does not sync cross-device.
* **Implementation Plan**:
  1. Update `prisma/schema.prisma` to store the Pattern Mastery Evidence model (`PatternEvidence`, `awardedEvents`, `practiceDays`, `streakDays`, `scenarioRotation`).
  2. Implement NextAuth with Google and GitHub OAuth providers.
  3. Create bi-directional sync on sign-in: merge unauthenticated guest progress into the authenticated user account without data loss.

### 1.2 Route & Navigation Cleanup
* **Current Limitation**: Redundant and orphaned routes clutter the navigation ([notes.md](file:///d:/03-React/boaringSD/notes.md)).
* **Implementation Plan**:
  1. Remove or redirect orphaned `/challenge/[challengeId]` routes to the corresponding level on `/campaign/[chapterId]`.
  2. Embed `/learn/[lessonId]` as a contextual *"Read Concept Deep-Dive"* drawer/modal inside the level run rather than a standalone disconnected page.
  3. Streamline Navbar into two distinct groupings:
     * **Core Quest**: Next Incident $\rightarrow$ 18-Level Map $\rightarrow$ Review Queue.
     * **Engineering Labs**: Architecture Builder Sandbox + Interview Arena.
  4. Update `README.md` to accurately document the 15-level pattern game, incident war rooms, and interview arena.

---

## Phase 2: Expanded Real-World Problem Catalog (V3 Scenarios)
> **Priority: High | Focus: Domain-Specific Distributed Systems**

Expand beyond the 4 existing interview problems to create reusable, dynamic scenario simulations across iconic internet architectures:

| Domain | Systems & Challenges | Core Architectural Focus |
| :--- | :--- | :--- |
| **Messaging & Chat** | • WhatsApp<br>• Discord Guilds<br>• Slack Workspace | Persistent WebSockets, message sequencing, push notification fanout, offline message store, delivery receipts. |
| **Content & Streaming** | • YouTube Video Ingestion<br>• Netflix Streaming<br>• Spotify Audio | Chunked video transcoding pipelines, adaptive bitrate streaming (HLS/DASH), origin shield caching, CDN egress optimization. |
| **Utility & Storage** | • Pastebin<br>• Google Drive Sync<br>• Dropbox File Block Store | Hash collision handling, chunked multipart uploads, content deduplication, metadata consistency. |
| **Fintech & Transacting** | • Stripe Payment Gateway<br>• Flash-Sale Inventory Engine<br>• Stock Trading Order Book | Distributed transactions (Saga / 2PC), idempotency keys, atomic balance checks, write-ahead logging (WAL). |
| **Real-Time Geospatial** | • Google Maps Route Finding<br>• Food Delivery Tracking (Doordash) | Graph traversal (A* / Dijkstra), driver clustering, push ETA estimation, geospatial fencing. |

---

## Phase 3: Cloud Service Application Layer (V4 Multi-Cloud)
> **Priority: Medium-High | Focus: Pattern-to-Cloud Service Mapping**

Bridge abstract computer science patterns with concrete public cloud services (AWS, Azure, GCP).

### 3.1 Cloud Service Mapping Matrix

```mermaid
graph LR
    subgraph Abstract["Abstract Architectural Pattern"]
        LB["Load Balancer"]
        C["In-Memory Cache"]
        Q["Message Queue"]
        DB["Relational Database"]
        NS["NoSQL Store"]
        OS["Object Storage"]
    end

    subgraph AWS["AWS Implementation"]
        alb["Application Load Balancer / NLB"]
        elc["Amazon ElastiCache (Redis/Valkey)"]
        sqs["Amazon SQS / SNS"]
        rds["Amazon Aurora / RDS"]
        dyn["Amazon DynamoDB"]
        s3["Amazon S3"]
    end

    subgraph Azure["Azure Implementation"]
        agw["Azure App Gateway / Load Balancer"]
        arc["Azure Managed Redis"]
        asb["Azure Service Bus / Event Grid"]
        adb["Azure Database for PostgreSQL"]
        cos["Azure Cosmos DB"]
        abs["Azure Blob Storage"]
    end

    subgraph GCP["Google Cloud Implementation"]
        glb["Cloud Load Balancing"]
        gms["Cloud Memorystore"]
        gpub["Cloud Pub/Sub"]
        gcs["Cloud SQL / AlloyDB / Spanner"]
        gbt["Cloud Bigtable / Firestore"]
        gss["Google Cloud Storage"]
    end

    LB --> alb & agw & glb
    C --> elc & arc & gms
    Q --> sqs & asb & gpub
    DB --> rds & adb & gcs
    NS --> dyn & cos & gbt
    OS --> s3 & abs & gss
```

### 3.2 Dynamic Cloud Configuration Panel
* **Service Sizing & Topology Configuration**: Learners select cluster sizes, read replica counts, multi-AZ deployment zones, and cache eviction policies.
* **Shared Responsibility Visualization**: Highlights what the managed cloud service handles (auto-patching, disk replication) vs what the engineer must configure (indexes, pool sizes, circuit breakers).
* **Cloud Cost Estimator**: Calculates real-time estimated monthly billing for compute instances, IOPS, managed storage tiers, and cross-AZ/cross-region network egress.

---

## Phase 4: Production Cloud Architecture Missions (V5)
> **Priority: Medium | Focus: End-to-End Concrete Cloud Deployments**

* **Mission 1: Multi-Region High-Throughput Cache**
  * *Scale*: 100,000 RPS, <50ms global latency.
  * *Challenges*: Multi-region cache synchronization, cache stampede / thundering herd mitigation, cross-region replication lag, regional failover without cache cold starts.
* **Mission 2: Global Content Delivery & Edge Invalidation**
  * *Scale*: Petabyte-scale static and media asset distribution.
  * *Challenges*: Edge TTL tuning, origin shield caching, surrogate key purge invalidation, egress bandwidth cost reduction.
* **Mission 3: High-Volume Asynchronous Processing**
  * *Scale*: 1,000,000 background jobs per hour.
  * *Challenges*: Queue depth monitoring, worker autoscaling policies, backpressure handling, dead-letter queues (DLQ), idempotent worker retries.
* **Mission 4: Database Scaling & High Availability**
  * *Scale*: 10,000,000 registered users, 80:20 read-to-write ratio.
  * *Challenges*: Connection pooling (PgBouncer), read replica lag mitigation, automated primary failover, horizontal table sharding.

---

## Phase 5: Tradeoff Simulator (V6) & Vendor Portability (V7)
> **Priority: Medium | Focus: Senior Engineering Decision-Making**

### 5.1 Standalone Tradeoff Comparison Labs (V6)
> *Note: Core multi-attribute tradeoff cards ($ Cost, Latency, Complexity, Consistency) are already live in Part I Section 2 for incident triage. Phase 5 extends this into dedicated standalone Tradeoff Comparison Labs.*

Structured decision-making scenarios where every choice incurs engineering tradeoffs:
1. **Cost vs Performance**: Provisioning peak hardware vs autoscaling with warm-up latency.
2. **Consistency vs Availability (CAP / PACELC)**: Strong linearizable consistency vs eventual consistency under network partition.
3. **Single-Region vs Multi-Region**: Operational simplicity vs geographic disaster tolerance and cross-region replication costs.
4. **SQL vs NoSQL**: Relational ACID integrity and multi-table joins vs horizontal partitioning and schema flexibility.
5. **Read vs Write Optimization**: CQRS, write-heavy LSM trees (Cassandra/RocksDB) vs read-optimized B-trees.

### 5.2 Vendor Lock-In & Portability Simulator (V7)
* **Cloud Migration Challenges**:
  * AWS to Azure: Migrating DynamoDB $\rightarrow$ Cosmos DB and SQS $\rightarrow$ Azure Service Bus.
  * Azure to GCP: Migrating Blob Storage $\rightarrow$ Google Cloud Storage and Azure SQL $\rightarrow$ Cloud Spanner.
* **Multi-Cloud Hybrid Failover**: Configuring active-active workloads across two cloud providers while avoiding cross-cloud egress cost traps.
* **Portability Scoring Engine**: Analyzes architecture topologies and assigns a Portability Score (0–100%) by detecting proprietary SDK dependencies (e.g. AWS AppSync, Step Functions) vs open standards (PostgreSQL wire protocol, Redis protocol, Docker/K8s).

---

## Phase 6: Chaos Engineering & Live Outage Track (V8)
> **Priority: Medium | Focus: Resilience & Incident Response Under Pressure**

* **Live Failure Injection Engine**:
  * **Traffic Spikes**: Sudden 10x–50x traffic surge during breaking news or flash sales.
  * **Compute Failures**: Random server crashes, memory leaks, and CPU throttling.
  * **Network Chaos**: Elevated packet loss, inter-service latency spikes, and cross-AZ partitions.
  * **Storage Degradation**: Database disk IOPS exhaustion, replica replication lag, and cache eviction storms.
  * **Dependency Failures**: Third-party payment gateway timeouts and DNS resolution failures.
* **Incident Command War Room**:
  * Live outage clock with active SLA error budget burn-down.
  * On-call runbooks: Learners toggle rate limiting, scale fleets, isolate failing zones, and shed load to save the system.

---

## Phase 7: Observability (V9) & Security Engineering (V10)
> **Priority: Low-Medium | Focus: Production Telemetry & Threat Defense**

### 7.1 Observability & Telemetry Track (V9)
* **The Telemetry Triad**:
  * **Metrics**: CPU, memory, RPS, p50/p95/p99 latency histograms, error rates (RED method).
  * **Structured Logs**: Correlated request IDs across distributed microservices.
  * **Distributed Tracing**: OpenTelemetry flame graphs highlighting downstream service latency bottlenecks.
* **Root Cause Analysis Challenges**: Learners inspect metrics dashboards and trace graphs to diagnose misconfigured connection pools, slow SQL queries, and upstream network timeouts.

### 7.2 Security Engineering Track (V10)
* **Authentication & Authorization**: OAuth 2.0 / OIDC flows, JWT validation, and RBAC / ABAC policies.
* **Rate Limiting & Abuse Protection**: IP-based throttling, API key quotas, and bot mitigation.
* **Secrets Management & Encryption**: HashiCorp Vault / AWS Secrets Manager, TLS in transit, and envelope encryption with KMS.
* **Edge Defense**: Web Application Firewall (WAF) rule configuration against SQL injection, cross-site scripting (XSS), and Layer 7 HTTP floods.
* **Multi-Tenant Isolation**: Row-Level Security (RLS) vs schema-per-tenant vs database-per-tenant models.

---

## Phase 8: SRE Reliability Operations (V11) & Interview Arena Expansion (V12)
> **Priority: Low-Medium | Focus: Operational Rigor & Interview Mastery**

### 8.1 SRE & Reliability Operations (V11)
* **Service Level Objectives (SLOs) & Error Budgets**: Defining 99.9% vs 99.99% availability targets and calculating allowable downtime per month.
* **Error Budget Burn Rate Alerts**: Distinguishing slow burns from rapid outages requiring immediate paging.
* **Blameless Post-Mortem Generator**: Interactive incident retrospectives compiling timeline of events, root cause analysis, and preventative action items.

### 8.2 System Design Interview Arena Expansion (V12)
> *Note: The initial 4-stage FAANG Arena with TinyURL, Twitter, Uber, and Global E-Commerce is live in Part I Section 5. Phase 8.2 scales the catalog to 15+ interactive problem suites.*

* **Expanded Problem Library**: Covering 15+ canonical interview problems (WhatsApp, Netflix, Dropbox, Stripe, Google Maps).
* **Simulated Interviewer Grilling Engine**: Dynamic follow-up questions challenging learner designs on cost, scale, and failure resilience.
* **Comprehensive Scoring Rubric**: Automated grading based on FAANG interview standards across Functional Requirements, Non-Functional Requirements, Architecture Diagram, and Deep Dive Defense.

---

## Phase 9: Engineering Career Paths & Skill Diagnostic Engine (V13)
> **Priority: Low | Focus: Career Progression & Gap Analysis**
> *Note: The 6-Axis Engineering Competency Mastery Radar (`SkillRadarChart.tsx`) is already live on `/dashboard` in Part I Section 6. Phase 9 expands this with personalized enterprise career tracks.*

* **Role-Based Engineering Roadmaps**:
  * **Junior SDE (L3)**: Core fundamentals (HTTP, Caching, Load Balancing, Basic CRUD).
  * **Mid-Level SDE (L4)**: System reliability (Replication, Queues, Rate Limiting, Connection Pools).
  * **Senior SDE (L5)**: Distributed architecture (Sharding, Consistency models, Multi-Region, Chaos tolerance).
  * **Staff / Principal Architect (L6+)**: Tradeoffs, multi-cloud strategy, cost optimization, vendor portability, and organizational technical leadership.
* **Enterprise Career Tracks & Certifications**: Deepening the active 6-Axis Competency Radar with external milestone badges, verified assessment exports, and portfolio artifacts.
* **Personalized Curriculum Generator**: Customized study paths targeting upcoming interview dates or role promotions.

---

# PART III: PLAN CONSOLIDATION & CLEANUP AUDIT

To eliminate documentation fragmentation and guarantee that this master document serves as the **single source of truth**, all previously scattered plan files and external reviews were merged into this document:

| Historical / Evaluated Artifact | Status | Consolidated Mapping |
| :--- | :--- | :--- |
| `APP_REVIEW_SYSTEM_DESIGN_LEARNING.md` | **Removed (Integrated into Core)** | App critique on depth, capacity math, tradeoff reasoning, and interview readiness addressed in **Part I (Sections 2, 4, 5, 6)** and the Architectural Depth Trajectory Scorecard. |
| `system_design_depth_plan.md` | **Integrated & Shipped** | 4-Stage FAANG interview arena, Tradeoff Cards, SRE Defense Gates, Multi-path Boss Battles, and 6-Axis Skill Radar fully implemented in **Part I (Sections 2, 4, 5, 6)**. |
| `Instruction.md` | **Removed (Superseded)** | Foundational vision & MVP features integrated into **Part I (Sections 1–4)** and Tech Stack. |
| `MVP_ENHANCEMENTS.md` | **Removed (Superseded)** | Guided thinking, interactive feedback, and scenario ideas integrated into **Part I (Section 5 & 7)** and **Part II (Phase 2)**. |
| `NO_THINKING_UX_PRINCIPLES.md` | **Removed (Superseded)** | Action Before Authentication & first-run incident flow integrated into **Part I (Section 1)**. |
| `PUSHPA_MODE_ONBOARDING.md` | **Removed (Superseded)** | Incident onboarding flow and war room mechanics integrated into **Part I (Section 1)**. |
| `patternMasteryGame.md` | **Removed (Superseded)** | 15-level pattern loop, evidence progression model, and builder scoring integrated into **Part I (Sections 2, 3, 4, 6)**. |
| `cloud_master_plan.md` | **Removed (Superseded)** | Phases V3–V13 multi-cloud tracks, mission specs, and life cycle integrated into **Part II (Phases 2–9)**. |
| `notes.md` | **Removed (Integrated)** | Reviewer gaps (auth, sync, route pruning, content depth) addressed in **Part II (Phase 1)**. |

> [!NOTE]
> All future engineering, architectural decisions, and feature development must reference and update this document: [MASTER_IMPLEMENTATION_PLAN.md](file:///D:/03-React/boaringSD/MASTER_IMPLEMENTATION_PLAN.md).
