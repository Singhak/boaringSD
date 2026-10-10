# Fix plan v2: make every level a real decision, and make replays different

> Source: learner evaluation on 2026-09-27 (score about **5.5/10**, up from 4.5 after the first fix plan).
> Short version: the app is well built, but you win the campaign by reading badges and picking the longest answer. Every level is the same 3-click loop with nothing at stake, and replays are the same questions reskinned.

## Guiding rule: gameplay first

Every fix has to feel like a game mechanic, not like homework (see `gameplay-first-rule`). Each screen we touch must meet these guardrails:

- One decision every 20–40 seconds during a run.
- No more than about 120 words to read before an action.
- Never two text-entry steps in a row.
- Every correct action gets instant feedback: sound, animation, or metrics recovering.
- A level run takes 5 minutes or less.
- No mandatory step without a reward.
- A replay must feel different, not just look different.

**Ship rule:** each phase ships on its own. `npm test`, `npx tsc --noEmit` and `npx eslint src` must pass after each one. Before changing any route, redirect or route handler, read the matching guide in `node_modules/next/dist/docs/` (this is Next 16).

**Effort key:** S is under a day, M is 1–3 days, L is more than 3 days.

> **Difficulty warning:** hiding the approach badges (0.1), making option lengths even (1.2) and adding an error budget (2.1) will make the game noticeably harder. Players will no longer speed-click through levels without reading. To keep that from feeling like a wall, do these together:
> - Ship Phase 4 (glossary tooltips and Concept Intel) soon after Phase 1.
> - Keep wrong-deploy burn gentle (15%).
> - Always offer an instant restart.
> - Watch levels 3–5, where most players will first notice the change.

**Testing note:** tests run with `tsx --test` in plain Node, with no React testing library or DOM. UI rules such as "no badge before submit" must go into small pure functions (for example `visibleChoiceChips(choice, submitted)` in `src/lib/`) that the component calls and the tests assert on. Don't add a rendering test framework just for this.

---

## Phase 0: Quick wins (S), removing the biggest leaks in under a day

| # | Fix | Where | Done when |
|---|---|---|---|
| 0.1 | Hide the approach badges ("Optimal / Viable / Anti-Pattern") until after a choice is deployed. Show them in the result panel as "Senior engineer's rating". Cost and consistency chips can stay, because they are trade-off data, not the answer. | `src/components/incident/IncidentWarRoom.tsx:725-760`, new pure helper `src/lib/choiceChips.ts` | Before choosing, no card shows `approach`. After deploying, the badge appears in the trade-off ledger. A test on `visibleChoiceChips(choice, submitted)` asserts that no `approach` chip is returned while `submitted` is false. |
| 0.2 | Remove the "Optimal / Band-Aid / Overkill" chips from the flight-sim fix buttons. Make the stabilize loop check which fix was applied: a band-aid only buys time, and overkill blows the credit budget. Base the victory text and stars on the fix you actually chose. | `src/components/simulation/SystemFlightSim.tsx:283-307, 748-756, 840-915` | "Upgrade to 64 cores" no longer earns 3 stars. The victory copy matches the chosen fix. |
| 0.3 | Shuffle the Case Studies picks (entities, APIs, components). Make the architecture step `exact`. | `src/app/guided/page.tsx:285, 353-372` | In a new test, the correct picks are not always first. Selecting all 8 components fails. |
| 0.4 | Point the debrief's "Guided Mode" link at `?mode=study`. | `IncidentWarRoom.tsx:1167` | The link opens study mode. |
| 0.5 | Show the XP actually awarded in the debrief (0 on a same-day replay, with "Replay XP resets tomorrow"). Show "Mastery Verified" only when the transfer question was passed first try. | `IncidentWarRoom.tsx:907, 1078, 1129` | Unit test on the debrief summary builder. |
| 0.6 | Stop cutting off the lesson: replace the 3-line clamp on wrong-answer explanations with a "Read why" expander that is open by default. | `IncidentWarRoom.tsx:840` | The full explanation is visible. |
| 0.7 | Hide the "30s ELI5" button on levels that have no Concept Intel. It should never silently do nothing. Phase 4.1 fills the content. | `src/components/incident/ConceptIntelDrawer.tsx:37` | The button renders only when intel exists. |
| 0.8 | Randomise the Defense modal's option order per attempt. Build its questions around the option the player actually picked, not the recommended one. | `ArchitecturalDefenseModal.tsx:160`, `IncidentWarRoom.tsx:142` | Defense Q1 names the player's choice. |

---

## Phase 1: Answer integrity (M), so you can't win without knowing

### 1.1 Tighten the content gate (`src/data/incidentQuality.ts`)

Add these checks:

- `answer-is-longest`: flag an incident when the correct label is the longest option **and** more than 10% longer than the longest wrong option. Today's threshold is 1.4×.
- `answer-length-spread`: every option's length must be within ±25% of the median option.
- `strawman-distractor`: fail wrong labels that start with "Blame", "Assume", "Attempt", or "Rely solely", or that are on a banned list (for example "disk corruption" or "schema migration" when the incident isn't about storage).
- `always-wrong-trope`: flag a pack where "bigger box / restart / more RAM" appears only in wrong answers. Author at least one incident per pack where vertical scaling or a restart **is** the right call (for example a short-lived spike on a small box that is cheaper to upsize).
- `approach-badge-matches-correct`: once Phase 0.1 ships this is informational only. Keep the badge data, since the result panel uses it.

**Remove the gate bypass:** today canonical and cascade incidents skip the gate. They must pass it too.

**Test:** `scenarioPacks.test.ts` fails the build if any playable incident has a gate issue, and it prints a per-pack report.

### 1.2 Even out option lengths in all multiple-choice sources

Measured today (correct option = longest, and how much longer it is on average than the wrong options):

| Source | Longest | Avg length vs wrong |
|---|---|---|
| Incidents | 76% | 1.15× |
| `patterns.ts` | 86% | **1.8×** |
| `tradeoffScenarios.ts` | 8 of 8 | 1.25× |
| `interview.ts` | 7 of 8 | 1.35× |
| `campaign.ts` | 16 of 23 | 1.13× |

- Rewrite wrong options so they are **plausible and equally specific**. Each should be a real technique that fails for a reason tied to this incident's constraint (a wrong fit, not an absurd option).
- Add a shared lint, `src/lib/optionLint.ts`, and run it over every question source in one test. Target: the correct option is the longest in 40% of questions or fewer, and the average length ratio is at most 1.1×.

### 1.3 Make free-text answers impossible to game

- **Self-assessment fallback** (`ReasoningCard.tsx:150-182`): cap it at 50% of the XP a graded answer earns. Never let it count towards the "reliable" mastery tier. Ask the player to tick rubric items *before* the model answer is revealed, not after.
- **Builder explain gate** (`builder/page.tsx:606-611`): a wrong pick costs 1 star, the player can retry only once, and the gate counts towards "Reliable" only on a first-try pass.

### 1.4 Record hints and retries as evidence

- `submitBuilderResult` (`storage.ts:201`) must record hints used.
- Incident retries already clear the "first try" flag. Also show them as a visible **combo break** (see 2.2).

---

## Phase 2: Stakes and consequences (M/L), so each decision matters

This phase removes most of the "same loop 23 times" feeling.

### 2.1 Carry an error budget and a credit wallet through every run

Reuse the onboarding flight sim's burn mechanic in the War Room:

- **Error budget.** It starts at 100% and burns while the incident is unresolved: about 1% per 5 seconds of reading, and **15% per wrong deploy**. Reaching 0% opens a **SEV-0 "SLA Breach" screen**: a short, 3-line root-cause post-mortem. It covers what you deployed, why it made things worse, and which signal you missed. It gives no stars, and has a one-click **"Restart incident"** button. The failure becomes a lesson, not a dead end.
- **Cloud-credit wallet.** It uses each choice's existing `tradeoffs.costMonthlyDelta`. Every level has a budget, and overspending costs a star. The "Overkill" fix then really hurts.
- **Retries.** Keep "Roll back & retry", but each rollback burns budget, so a retry costs something without being a hard fail.

Files: `IncidentWarRoom.tsx`, and extract the burn and wallet logic from `SystemFlightSim.tsx` into `src/lib/runEconomy.ts` with unit tests.

### 2.2 Combo streak

Fixing incidents first try across a run, and across levels, builds a visible combo (×2, ×3), which multiplies XP. A wrong deploy or a hint breaks it with a sound and animation. This rewards thinking without adding reading.

### 2.3 Wrong answers change the system, not just the numbers

Today only 2 of 662 wrong choices change the graph. The target is at least 1 per incident:

- Add a `graphAfter` or `graphPatch` to each wrong choice. Examples: a node goes red, a new hot spot appears, an edge overloads, or a queue backs up.
- Add a `consequenceIncidentId` to at least 1 wrong choice per level. A band-aid "works", then 1 or 2 steps later the real problem pages you (a "delayed bill").

### 2.4 Cascades and aftershocks in every pack, not just Caching

- **Cascades:** each pack gets at least 2 cascade links. The correct fix creates a new, smaller problem: a cache causes stale reads, replicas cause lag, sharding causes a hot shard.
- **Real decision instead of a countdown:** replace the 5-second auto-countdown with a choice. **"Handle it now (+XP, keep combo)"** or **"Log a ticket (safe, lower stars)"**.

### 2.5 Vary the rhythm across levels

Not every level should be "read, then pick 1 of 3". Rotate between these formats (at least 4 used across the 23 levels, and no format more than 3 levels in a row):

| Format | What the player does |
|---|---|
| **Pick the fix** | Today's format. |
| **Find the culprit** | Click the failing node on the topology *before* any options appear. This reuses the telemetry inspector, and needs incident-specific logs (4.4). |
| **Tune the knob** | Drag a slider (TTL, pool size, replica count, shard count) until the metrics go green. |
| **Two-step** | Mitigate now (shed load or scale out), then fix the root cause. |
| **Spot the bad PR** | Pick which of 3 short design diffs will cause the outage. |
| **Budget cut** | The system is fine but costs too much; remove a component without breaking the SLO. |

Add `format` to `IncidentV2`. `IncidentWarRoom` switches the interaction by format. Start with **Find the culprit** and **Tune the knob**, because the telemetry and slider pieces already exist.

---

## Phase 3: Replays that are actually different (M)

### 3.1 Skins that change the right answer (`src/lib/incidentSkin.ts`)

Today a skin only changes the region, the occasion and the traffic scale. Add **constraint skins** that can change which option is correct:

- Each incident may declare `variants: [{ constraint, metricsPatch, correctChoiceId, resultOverrides }]`. Examples: "writes are 80% of traffic" (a cache stops being the answer), "budget $200/mo" (the cheap option wins), "strong consistency required" (async replicas lose).
- `pickSkin` chooses the cosmetic skin plus, where present, a constraint variant.
- The skin test asserts that at least one variant per pack flips the correct choice.

### 3.2 Rotate the aftershock (transfer) question

- Today each pattern has one `transfer` question. Change it to `transfer: TransferQuestion[]` with at least 4 per pattern.
- Rotate them without an immediate repeat (reuse the rotation logic from `scenarioRotation`).
- Also build a pool of at least 3 Defense question sets per pattern.

### 3.3 Bring levels 16–23 up to at least 15 playable incidents each

The packs for cap-pacelc, consensus-quorums, storage-engines, id-generation, search-indexing, stream-processing, observability and auth-at-scale have only 6 incidents each today.

- Write them following `docs/content-style.md`, the incident authoring guide, and the Phase 1.1 gate.
- About 72 new incidents are needed. Split them across Phase 5 batches.
- Each of these packs also gets at least 2 dedicated cascade paths (see 2.4).

### 3.4 Don't replay the tutorial incidents

The first clear of levels 1 and 2 should pick a non-canonical incident, because the player just played hs-01 and lb-01 in onboarding. Also fix the Kinetic Sim so it credits both levels it plays (`[chapterId]/page.tsx:156-168`).

---

## Phase 4: Teach just in time (M)

### 4.1 Concept Intel for all 23 patterns

Today it covers 5 of 23 (`src/data/conceptIntel.ts`). Each entry needs a 1-sentence analogy, a 3-step dataflow, and "when it fails". Keep each under 80 words, per the guardrail. A test asserts every `PatternId` has intel.

### 4.2 Glossary tooltips for jargon in option labels

- Terms like "PACELC", "quorum" and "cache-aside" get a tap-to-define tooltip, 1 sentence each, from `src/data/glossary.ts`.
- The first time a term appears in the campaign it is highlighted, and tapping it costs nothing.

### 4.3 Put the real lesson in the War Room debrief

Add the pattern's `tradeoff.whatFailed / whyFixWorked / insufficientWhen` to the War Room debrief as three 1-line cards. Today they appear only in Guided mode (`page.tsx:770-780`).

### 4.4 Incident-specific telemetry

- **"Inspect logs" nodes:** build them from `incident.graphBefore` instead of hardcoding server, Postgres and Redis (`IncidentWarRoom.tsx:645-665`).
- **Log clues:** add `logs?: Record<nodeId, string[]>` per incident, holding 2–4 lines that contain the real clue. Fall back to role-generic logs only when none are authored.
- **Requirement:** every **Find the culprit** incident (2.5) must have authored logs.

---

## Phase 5: Content repair and coverage (L, in batches)

### 5.1 Rewrite weak packs first

- **`horizontal-scaling.json`:** 17 of 20 incidents have 3-word labels and the same "scale out vs bigger box vs DNS" trio.
- **`load-balancing.json`, lb-01 to lb-05:** these use strawman "Blame / Assume" wrong options.
- **Canonical stub labels:** rewrite labels such as cdn-01's "Add CDN" and cons-01's "Fresh reads".

### 5.2 Remove duplicate scenarios

queue-18 is the same scenario as idemp-new-01, and shard-11 is the same as idg-01. Keep one of each pair and rewrite the other around a different constraint.

### 5.3 Fix technical errors

| Where | Problem | Fix |
|---|---|---|
| cache-01 | The brief says "150,000 reads in two minutes", but the metric shows 150k req/s. It also marks read replicas as a second correct answer. | Make the numbers agree. Have exactly one correct answer, or make replicas "Viable" with a real trade-off. |
| `patterns.ts`, caching diagnosis | "Identical reads go to disk every time". | Hot rows sit in the buffer pool. The real cost is per-query CPU and connection load. |
| shard-14 | Calls UUIDv1 monotonic. | Use UUIDv7 (or v6) as the time-ordered example. |
| Rate-limiting review | Says centralized Redis "guarantees global accuracy". | Say it needs atomic INCR or Lua, and that failover can lose counts. |
| cq-03 | Says R+W>N means the newest value is "always seen". | Add the caveats: sloppy quorums, hinted handoff, concurrent writes. |
| cons-03 | Says semi-sync "loses nothing confirmed". | Note that it falls back to async on timeout. |
| lb-03 | Gives Anycast BGP as the fix for mobile clients pinned to one host. | Use a DNS name plus a load balancer. |

### 5.4 Fill coverage gaps

These become new campaign levels, or new incidents inside existing packs:

- **Consistent hashing:** its own level.
- **API design:** pagination, versioning, REST vs gRPC, idempotency keys.
- **Data modeling:** SQL vs NoSQL, and choosing keys and indexes.
- **Blob / object storage.**
- **Geo-indexing.**
- **Trade-off scenarios:** `tradeoffScenarios.ts` covers 2 of 23 patterns today. Add at least 1 per pattern.

### 5.5 Generated estimation problems

- Replace the 10 fixed problems in `mathProblems.ts` with templates, for example: `{DAU} × {actions/day} ÷ 86,400 = QPS`, with randomised inputs.
- Cover these categories: QPS, storage over N years, bandwidth, cache RAM, shard count, and replica count.
- The sprint mode draws randomly and never runs the same order twice (`MentalMathTrainer.tsx:69-71`).

### 5.6 Grow the interview set

- Grow from 4 problems to at least 10.
- Randomise the numbers per attempt, for example DAU and read/write ratio. Estimates are then checked against a formula, not a fixed answer.

**Done when (whole phase):** all packs pass the Phase 1.1 gate, and a per-pack coverage report sits in `docs/`.

---

## Phase 6: Honest progression (S/M)

| # | Fix | Where |
|---|---|---|
| 6.1 | Make XP levels grow: 150, 300, 500, 750… so the tutorial doesn't immediately level you up. | `progression.ts:24, 82` |
| 6.2 | Lessons stop paying 100–200 XP for 3 clicks. Pay XP only for passing the lesson's check question. | `learn/[lessonId]/page.tsx:84-100` |
| 6.3 | Cap each side mode's XP per day, and make campaign clears the main XP source. | `progression.ts` |
| 6.4 | The streak counts only a **passed** action: a correct run, review, estimate or builder boss. A failed estimate, finishing an interview, or clicking through a lesson doesn't count. Make the dashboard copy match. | `progression.ts:199, 424, 439`, `dashboard/page.tsx:113` |
| 6.5 | Unlock the Builder and Interview by **campaign progress** (for example, Builder after clearing Level 2 and Interview after Level 8), not by XP level. Rename the UI so "Level" means one thing only: use "Rank" for XP and "Level" for the campaign. | `storage.ts:306`, `labs.ts:33` |
| 6.6 | Add a daily challenge: one seeded incident per day with a constraint skin (3.1), the same for everyone, bonus XP, and a share card. | new `src/lib/daily.ts` |
| 6.7 | A bad lesson or challenge ID should return a real 404 via `notFound()`, not silently show the first item. Read the Next 16 docs first. | `learn/[lessonId]/page.tsx:66`, `challenge/[challengeId]/page.tsx:26` |

---

## Phase 7: Fewer, deeper modes (M)

Too many modes are shallow and orphaned. Next action never routes to Interview, Estimation or Evolution.

| Mode | Decision |
|---|---|
| **Lessons and challenges** (3 lessons, 1 question each) | **Remove.** Fold their content into Concept Intel (4.1) and redirect the routes to `/campaign`. |
| **Evolution** (5-slide carousel) | **Turn into a playable "Scale Journey" boss** after each campaign tier. Grow one system from 100 users to 10M, with a builder step at each stage. If that's out of scope, remove it. |
| **Case Studies** | Keep the requirements and data-model steps, and replace the final multi-select with the Builder canvas. |
| **Estimation Gym** | Keep it with generated problems (5.5). Make next action suggest it every few runs, or when the estimation skill on the radar is weak. |
| **Interview Arena** | Keep it. Next action suggests it after each tier as the "tier final". |
| **Builder** | Keep it: it's the strongest mode. See Phase 8. |

Change `selectNextAction` (`progression.ts:597-718`) to rotate between runs, reviews, builder bosses, estimation (when that skill is weak) and interviews (at the end of a tier), and add tests for the rotation.

---

## Phase 8: Builder depth (L)

Today there are only 8 node types (`builderScore.ts:469`), so bosses from about Level 11 are won by the wrong pattern: connection pooling is won by adding a cache, idempotency by a cache, ID generation by a cache, and observability by a queue.

**New node types and properties:**

- Connection pooler (PgBouncer)
- ID service (Snowflake)
- Idempotency store, as a Redis property
- Metrics / tracing pipeline
- Auth gateway
- Search index
- Stream processor
- Consensus cluster (3 or 5 nodes)
- Shard router
- CDN edge

**Scoring:** make the stress test for each pattern fail unless the right node, or the right node property, is present (`builderScenarios.ts:606-615, 705-716, 1005-1016, 1155-1166`).

**Starting topologies:** vary them per boss instead of always `lbStack(3)`. Some bosses should start broken, others over-built (the "budget cut" format).

---

## Phase 9: Docs match reality (S)

- **README:**
  - The level and boss counts are wrong ("15" in places); the code has 23.
  - The next-action order the README gives doesn't match the code.
  - The builder slider range is wrong (the code allows up to 120,000).
  - Evolution says "1 to 10M"; update it once Phase 7 decides Evolution's fate.
  - Quick start should say Docker and Prisma are optional, since progress is stored in localStorage only.
- **`MASTER_IMPLEMENTATION_PLAN.md`:** update the Honest Status table to the 5.5/10 evaluation, and fix the contradiction between the interview's "Stage 3: toggles" and its "canvas" row.

---

## Order of work and expected effect

| Order | Phase | Effort | Why this order |
|---|---|---|---|
| 1 | Phase 0 | S | Removes the biggest leak (the badges) in hours. |
| 2 | Phase 1 | M | Makes knowing the material necessary to win. |
| 3 | Phase 2 | M/L | Adds stakes and variety, which is the biggest boredom fix. |
| 4 | Phase 4 | M | Newcomers can learn instead of guessing. |
| 5 | Phase 3 | M | Makes replays and the late levels fresh. |
| 6 | Phase 6 | S/M | Makes XP and the streak mean something, and adds the daily reason to return. |
| 7 | Phase 7 | M | Leaves fewer, better modes that are all reachable. |
| 8 | Phase 5 | L | Ongoing content work, run in batches alongside the other phases. |
| 9 | Phase 8 | L | Makes the builder able to express every pattern. |
| 10 | Phase 9 | S | Do this last, and again after each phase. |

**Target after Phases 0–4 and 6:** about 7.5/10. After all phases: 8.5 or more.

**How to verify each phase:**
1. Run the three checks from the ship rule.
2. Replay levels 3, 12 and 20 twice each, using only test-taking tricks: pick the longest answer and avoid "bigger box". That must **fail** most of the time.
3. Replay the same level twice: the second run must ask at least one different question or have a different correct answer.

**Manual checks, run in `npm run dev`:**

| Check | Steps | Expected |
|---|---|---|
| Blind War Room | Open `/campaign/chapter-1` and `/campaign/chapter-3`. | No "Optimal / Viable / Anti-Pattern" badges before choosing. After deploying, the badge and trade-off ledger appear. |
| Error budget | Deploy 2 wrong answers in a row, then keep going until the budget runs out. | The budget bar burns and the topology shows damaged nodes. At 0% the SEV-0 breach screen appears with a root cause and a restart button. |
| Flight sim | On a fresh profile (clear localStorage), take the onboarding incident and choose "Upgrade to 64 cores". | The fix buttons show no answer chips. You get no 3-star win, and the victory copy matches the fix you chose. |
| Case Studies | Open `/guided`. Check the order of entities, APIs and components. Then select every component. | The order differs between scenarios and attempts. The over-built design is rejected. |
| Debrief | Replay a cleared level on the same day, and miss the aftershock question. | "+0 XP (replay XP resets tomorrow)". No "Mastery Verified". The Guided Mode link opens `?mode=study`. |
| Replay variety | Replay one level three times. | At least one run has a different constraint and correct answer, and the aftershock question changes. |
| Concept Intel | Open a level from 16 to 23. | The ELI5 button is either hidden (before 4.1) or shows content (after 4.1). It never does nothing. |

## Open decisions for you

1. **Evolution:** rebuild it as a playable Scale Journey, or remove it? I recommend rebuilding it, but only after Phase 8.
2. **Lessons and challenges:** remove them and fold their content into Concept Intel? I recommend yes.
3. **SLA breach at 0% error budget:** does it end the run, or only cost stars? I recommend ending the run on the SEV-0 post-mortem screen, with an instant restart of the current incident so it isn't frustrating.
4. **New campaign levels** for consistent hashing, API design and data modeling: add them as levels 24–26, or as incidents inside existing packs?
5. **Rolling out the 72 new incidents for levels 16–23:** release them tier by tier, or all at once? I recommend tier by tier: first levels 16–18 (CAP, consensus, storage), then 19–21, then 22–23. Each batch must pass the Phase 1.1 gate before it ships.
