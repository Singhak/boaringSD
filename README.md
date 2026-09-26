# System Design Quest MVP 🚀

A gamified learning platform that helps developers master System Design through visual simulations, drag-and-drop architecture building, interactive challenges, and instant feedback.

---

## 🌟 Tech Stack

- **Framework**: Next.js 15 / 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Cyber Glassmorphic Theme
- **Interactive Canvas**: React Flow (`@xyflow/react`)
- **Animation & Physics**: Framer Motion + Web Audio API Sound Generator + Confetti
- **Database**: PostgreSQL (Docker container) + Prisma ORM
- **Icons**: Lucide React

---

## 🚀 Quick Start Guide

### 1. Start PostgreSQL with Docker
```bash
docker compose up -d
```

### 2. Push Schema & Seed Curriculum Data
```bash
npx prisma db push
npx prisma db seed
```

### 3. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser!

### 4. Run tests
```bash
npm test
```

### 5. (Optional) Enable "Defend your call" grading
Free-text answers are graded by an LLM against a server-side rubric. Copy `.env.example` to `.env.local` and set:
```bash
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash   # optional
```
Without a key, learners grade themselves against the model answer and rubric (self-assessment counts half toward progress). New providers plug in by implementing `GradingProvider` in `src/lib/grading/`.

### 6. Writing scenario content
See [`docs/content-style.md`](docs/content-style.md). Incidents that fail the automatic quality gate (`src/data/incidentQuality.ts`) are hidden from play; `npx tsx --test src/data/scenarioPacks.test.ts` checks your work.

---

## 🎯 15-Level Pattern Mastery Campaign

The core curriculum is structured into 15 cumulative distributed systems patterns across 3 tiers:

- **Tier 1: Foundation (Levels 01–05)**: Horizontal Scaling, Load Balancing, Read Replicas, In-Memory Caching, CDN & Edge Delivery.
- **Tier 2: Resilience (Levels 06–10)**: Asynchronous Queues, Database Sharding, Distributed Consistency, Rate Limiting, Circuit Breakers.
- **Tier 3: Mastery (Levels 11–15)**: Connection Pooling, Backpressure & Throttling, Idempotency & Outbox, Multi-Region DR, Health Checks & Eviction.

### The Learning & Evidence Loop:
1. **Level Run** (`/campaign/[chapterId]`):
   - **Simulation War Room Mode (`?mode=incident`)**: Live SVG topology, real-time telemetry deltas, and physical wrong-answer degradation.
   - **Structured Pattern Run Mode**: 6-stage evidence loop: Observe → Diagnose → Deploy fix → Tradeoff counter-strike → Transfer question → Post-mortem.
2. **Builder Boss** (`/builder?scenario=<id>`): 15 predefined broken systems (`src/data/builderScenarios.ts`). The player builds, stress-tests, defends tradeoffs, and submits. `evaluateScenario` in `src/lib/builderScore.ts` is the single scoring authority.
3. **Spaced Review** (`/campaign/[chapterId]?mode=review`): Scheduled spaced recall at 1, 3, 7, and 30 days.

**Evidence Progression Model**:
Progress is tracked as verified evidence, not superficial completion percentages:
`Unseen → Introduced → Applied Once → Passed Transfer → Reliable` (or `Needs Review`). Achieving `Reliable` requires passing the pattern run, a first-try transfer ("Aftershock") question, a builder boss challenge, a later spaced review, and a "Defend your call" answer scoring 60+.

**Persistence**:
Browser `localStorage` only, with staged v1 → v2 → v3 migrations. There are no accounts or cross-device sync yet. PostgreSQL is used only for the lesson catalogue (`/api/lessons`, which falls back to bundled JSON).

---

## 🕹️ Core Modules & Features

### 1. First-Run "No Thinking" Outage Onboarding (`/`)
- Zero friction entry: first-time visitors are paged with an urgent P0 live production outage (*"The feed is down — 100,000 req/s, 98% CPU, 4,200ms latency, 504 errors"*).
- Resolving the canonical incidents (`hs-01` Horizontal Scaling $\rightarrow$ `lb-01` Load Balancing) awards +150 XP, unlocks Level 1, and reveals the dynamic Next Action dashboard.

### 2. Campaign Map & Level Hub (`/campaign`)
- 15-level visual map grouped by Foundation, Resilience, and Mastery tiers.
- Matrix view and tier view with real-time mastery badges and prerequisite locking.

### 3. Incident War Room Engine (`/campaign/[chapterId]`)
- 15 data-driven scenario packs (`src/data/scenarioPacks/*.json`) powered by Incident Schema v2; 114 incidents pass the quality gate, and every level has 6+ playable.
- Replays rotate incidents with procedural skins (traffic scale, region, occasion); options are shuffled per attempt.
- Each level ends with an "Aftershock" transfer question and an optional "Defend your call" free-text reply.
- Dynamic SVG network topologies with animated packet flows and node status tones (`good`, `bad`, `warn`, `neutral`).
- Wrong-answer physics: incorrect deployments visibly spike node CPU, trigger 504 gateway timeouts, and cascade failure states.

### 4. Interactive Architecture Builder & Boss Loop (`/builder`)
- React Flow drag-and-drop design canvas supporting Clients, Load Balancers, Servers, Caches, Databases, Read Replicas, CDNs, and Queues (keyboard "Connect to…" control included).
- Grading follows the wiring, and a cloud-credit budget penalizes over-building.
- Real-time traffic load stress slider (1,000 to 50,000 req/s) with live bottleneck diagnostics.
- 15 scenario boss challenges (`boss-scale`, `boss-lb`, `boss-replicas`, ..., `boss-health-checks`).

### 5. System Design Interview Arena (`/interview`)
- Timed real-world mock interview challenges (TinyURL, Twitter Feed, Uber Dispatch, Global E-Commerce).
- Component selection graded on requirements, with penalties for unjustified extras and an overtime penalty on the pager countdown.
- Staff-level follow-up interview questions testing race conditions, failovers, and architectural tradeoff defenses.

### 6. Engineering Dashboard & Profile (`/dashboard`)
- Dynamic Next Action recommender (`selectNextAction()`) directing users to the highest-priority action (Onboarding $\rightarrow$ Next Run $\rightarrow$ Builder Boss $\rightarrow$ Spaced Review).
- Daily learning streak tracker, XP leveling meter, and unlocked achievement badges.

### 7. Auxiliary Engineering Labs
- **Architecture Evolution** (`/evolution`): 5-stage scaling simulation from 1 to 10M users.
- **Case Studies** (`/guided`): Methodical breakdown (Requirements $\rightarrow$ Entities $\rightarrow$ APIs $\rightarrow$ Architecture).
- **Estimation Gym** (`/math`): Back-of-the-envelope drills; results feed the Capacity Estimation radar axis.
- **Concept Lessons** (`/learn/[lessonId]`): Interactive concept deep-dives.
