# System Design Quest MVP 🚀

A gamified learning platform that helps developers master System Design through visual simulations, drag-and-drop architecture building, interactive challenges, and instant feedback.

---

## 🌟 Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Cyber Glassmorphic Theme
- **Interactive Canvas**: React Flow (`@xyflow/react`)
- **Animation & Physics**: Framer Motion + Web Audio API Sound Generator + Confetti
- **Persistence**: browser `localStorage` (player progress); optional PostgreSQL + Prisma for the lesson catalogue only
- **Icons**: Lucide React

---

## 🚀 Quick Start Guide

### 1. Install and start the development server
```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. That's all you need: player progress lives in `localStorage`, so no database is required.

### 2. Run the checks
```bash
npm test            # 249 unit tests (tsx --test, plain Node, no DOM)
npx tsc --noEmit
npx eslint src
```

### 3. (Optional) PostgreSQL for the lesson catalogue
Only `/api/lessons` uses the database, and it falls back to bundled JSON without one.
```bash
docker compose up -d
npx prisma db push
npx prisma db seed
```

### 4. (Optional) Enable "Defend your call" grading
Free-text answers are graded by an LLM against a server-side rubric. Copy `.env.example` to `.env.local` and set:
```bash
LLM_PROVIDER=gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash   # optional
```
Without a key, learners grade themselves against the model answer and rubric (self-assessment pays half and never counts toward Reliable). New providers plug in by implementing `GradingProvider` in `src/lib/grading/`.

### 5. (Optional) Collect anonymous product events
Events such as `session_start`, `daily_complete` and `run_complete` are always kept in a local ring buffer (`src/lib/events.ts`), under a random anonymous id with no personal data. Set `NEXT_PUBLIC_EVENTS_URL` to also send them to your own collector with `navigator.sendBeacon`. `summarizeEvents()` computes the retention metrics: active days, sessions per week, modes played per week, week-2 return and replay share.

### 6. Writing scenario content
See [`docs/content-style.md`](docs/content-style.md). Every incident must pass the automatic quality gate (`src/data/incidentQuality.ts`), and `npx tsx --test src/data/scenarioPacks.test.ts` fails the build otherwise. Constraint variants are checked by `src/lib/incidentSkin.test.ts`.

---

## 🎯 23-Level Pattern Mastery Campaign

The core curriculum is structured into 23 cumulative distributed systems patterns across 5 tiers:

- **Tier 1: Foundation (Levels 01–05)**: Horizontal Scaling, Load Balancing, Read Replicas, In-Memory Caching, CDN & Edge Delivery.
- **Tier 2: Resilience (Levels 06–10)**: Asynchronous Queues, Database Sharding, Distributed Consistency, Rate Limiting, Circuit Breakers.
- **Tier 3: Mastery (Levels 11–15)**: Connection Pooling, Backpressure & Throttling, Idempotency & Outbox, Multi-Region DR, Health Checks & Eviction.
- **Tier 4: Depth (Levels 16–18)**: CAP & PACELC, Consensus & Quorums, Storage Engines & Indexing.
- **Tier 5: Operate (Levels 19–23)**: ID Generation, Search & Inverted Indexes, Streams & Event Processing, Observability & SLOs, Auth at Scale.

### The Learning & Evidence Loop:
1. **Level Run** (`/campaign/[chapterId]`):
   - **War Room** (default): live SVG topology, real-time telemetry, and wrong answers that visibly damage the system. Levels 1–2 also offer the "Kinetic Sim" flight simulator.
   - **Guided study** (`?mode=study`): 6-stage evidence loop: Observe → Diagnose → Deploy fix → Tradeoff counter-strike → Transfer question → Post-mortem.
2. **Builder Boss** (`/builder?scenario=<id>`): 23 predefined broken systems (`src/data/builderScenarios.ts`). The player builds, stress-tests, defends tradeoffs, and submits. `evaluateScenario` in `src/lib/builderScore.ts` is the single scoring authority.
3. **Spaced Review** (`/campaign/[chapterId]?mode=review`): Scheduled spaced recall at 1, 3, 7, and 30 days.

**Evidence Progression Model**:
Progress is tracked as verified evidence, not superficial completion percentages:
`Unseen → Introduced → Applied Once → Passed Transfer → Reliable` (or `Needs Review`). Achieving `Reliable` requires passing the pattern run, a first-try transfer ("Aftershock") question, a builder boss challenge with a first-try explanation, a later spaced review, and a graded "Defend your call" answer scoring 60+.

**Persistence**:
Browser `localStorage` only, with staged v1 → v2 → v3 migrations. There are no accounts or cross-device sync yet.

---

## 🕹️ Core Modules & Features

### 1. First-Run "No Thinking" Outage Onboarding (`/`)
- Zero friction entry: first-time visitors are paged with an urgent P0 live production outage (*"The feed is down — 100,000 req/s, 98% CPU, 4,200ms latency, 504 errors"*).
- Resolving the canonical incidents (`hs-01` Horizontal Scaling $\rightarrow$ `lb-01` Load Balancing) awards +150 XP, unlocks Level 1, and reveals the Next Action home screen.

### 2. Campaign Map & Level Hub (`/campaign`)
- 23-level visual map grouped into the 5 tiers above, with tier and matrix views.
- Real-time mastery badges and prerequisite locking.

### 3. Incident War Room Engine (`/campaign/[chapterId]`)
- 23 data-driven scenario packs (`src/data/scenarioPacks/*.json`, Incident Schema v2) with 462 incidents (15–25 per level), all passing the quality gate.
- **Stakes**: an SLA error budget burns while you read (about 1% per 5 s) and drops 15% per wrong deploy; at 0% a SEV-0 post-mortem ends the run with an instant restart. A cloud-credit wallet costs a star when you over-spend, and a combo multiplier rewards clean first-try fixes.
- **Formats**: pick the fix, find the culprit (flag the failing node from its logs), tune the knob (a slider), and two-step (mitigate, then fix the root cause).
- **Consequences**: every wrong choice changes the topology; band-aids "hold" and then page you with the real problem; correct fixes can cascade into a smaller follow-up incident.
- **Replays**: incidents rotate, options are shuffled per attempt, and 69 constraint variants (3 per pack) change a business constraint so that a different option becomes correct.
- Concept Intel (30-second ELI5) for all 23 patterns and glossary tooltips on jargon in answer labels.
- Each level ends with a rotating "Aftershock" transfer question and an optional "Defend your call" free-text reply.

### 4. Daily Outage (`/daily`)
- One incident per day, the same for every player, rolling over at 00:00 UTC.
- It walks through the constraint variants in a fixed shuffled order, so no variant repeats until all have been played.
- +75 XP bonus (scaled by stars) once per day, a result card, and a Wordle-style share card.

### 5. Interactive Architecture Builder & Boss Loop (`/builder`)
- React Flow canvas with 16 component types: Users, CDN, Load Balancer, App Server, Redis Cache, Message Queue, Primary DB, Read Replica, PgBouncer, Snowflake ID, Observability, Auth Gateway, Search Index, Stream Worker, Raft Cluster, Shard Router (keyboard "Connect to…" control included).
- Grading follows the wiring, and a cloud-credit budget plus unneeded-component penalties stop "place everything".
- Traffic stress slider from 1,000 to 120,000 req/s with live bottleneck diagnostics.
- 23 boss challenges, one per level (`boss-scale`, `boss-lb`, `boss-replicas`, …).
- Each boss attempt comes with a stated business priority (cut cost, lowest latency, or survive failures). Missing it costs a star but never blocks a pass (`src/lib/designPriority.ts`).
- After a pass, "Your design vs a strong design" compares your components with the lean reference and any other accepted designs.

### 6. Scale Journey: the weekly boss (`/journey`)
- Grow one system through 5 stages, from a 15,000 req/s front-page spike to 120,000 req/s at ten million users. Your design carries over from stage to stage.
- Each ISO week brings a twist that changes which components matter (steady growth, write-heavy, flaky hardware, global from day one).
- +150 XP once per week for clearing all 5 stages. Unlocks after Level 5.
- Every stage is calibrated against the simulator: winnable under every twist within budget, and each stage needs a new idea (`src/data/scaleJourney.test.ts`).
- `/evolution` permanently redirects here.

### 7. System Design Interview Arena (`/interview`)
- 10 timed mock interviews: TinyURL, Twitter Feed, Uber Dispatch, Global E-Commerce, Real-Time Messaging, Video Streaming, Web Crawler, Distributed Rate Limiter, Typeahead Search, Notification System.
- Stages: requirements scoping, capacity estimation, a design canvas (only components wired on a path from users count; unjustified extras and overtime are penalized), and staff-level follow-ups.
- The scorecard compares your drawn design with the staff benchmark architecture.

### 8. Home, Dashboard & Streaks (`/`, `/dashboard`)
- `selectNextAction()` picks one next step in this order: onboarding → resume an unfinished run → due review → builder boss → tier-final interview (after Levels 5, 10, 15 and 23) → Estimation Gym (when that skill is weak) → next level → practise the weakest pattern.
- The home screen also shows today's Daily Outage and, once unlocked, this week's Scale Journey.
- The streak counts only real progress: a solved incident, the daily outage, a Scale Journey stage, a finished case study, or a passed builder boss, estimate, review or "Defend your call" answer. Failed attempts, lessons and interviews don't count.
- A streak freeze is earned every 7 streak days (at most 2 banked); each covers one missed day automatically. Streak milestones at 3, 7, 30 and 100 days unlock badges.
- XP ranks grow progressively (150, 300, 500, 750, …), and side modes have daily XP caps so the campaign stays the main source.

### 9. Auxiliary Engineering Labs
- **Case Studies** (`/guided`, after Level 3): 16 scenarios broken down methodically (Requirements $\rightarrow$ Entities $\rightarrow$ APIs $\rightarrow$ Architecture on a canvas).
- **Estimation Gym** (`/math`): back-of-the-envelope drills and 60-second sprints; results feed the Capacity Estimation radar axis.
- Builder unlocks after Level 2 and the Interview Arena after Level 8. The old `/learn/[lessonId]` and `/challenge/[challengeId]` routes redirect to `/campaign`.
