# Incident authoring guide

How to write a scenario-pack incident (`src/data/scenarioPacks/<pattern>.json`) that teaches, can't be guessed, and is fun to play.

The product rule: **learning happens through gameplay and must never feel boring or monotonous.** An incident is a 60–90 second puzzle: read the page, spot the bottleneck, deploy a fix, watch the system react.

## Anatomy

| Field | Rules |
|---|---|
| `title` | Symptom as a pager would say it: "Checkout double-charges on retry". Never name the fix. |
| `brief` | ≤ 35 words. Concrete numbers (req/s, p99, %, GB). Name the product so it feels real. |
| `constraint` | One sentence that rules out the lazy answer ("Budget is frozen", "Writes must stay in-region"). |
| `question` | Specific: "What stops the second charge?" — not "What is the correct design?" |
| `metricsBefore` | Must agree with `graphBefore` (a node at `cpu: 96` means the CPU metric is ~96%, not 40%). |
| `choices` | Exactly 3. See below. |
| `hints` | 3 hints, each narrower than the last. The last one points at the mechanism, never states the answer. |
| `reviewed` | Set `true` once the incident meets this guide and passes the lint test. |

## Choices

- **Exactly one `correct: true`** unless two answers are genuinely valid. If you do that, give them different `approach` values and honest tradeoffs.
- **Labels are 4–12 words and describe a mechanism**: "Per-key token bucket in a shared Redis at the gateway". Not a tag ("Rate limit") and never the pattern's name.
- **Every distractor is something a real engineer might try under pressure.** Good distractors: the right tool in the wrong place, the fix for a neighbouring problem, a band-aid that helps for 10 minutes, or over-engineering. Never an absurd option ("Disable the internet").
- **Similar length**: the correct label must not be noticeably longer than the distractors. The lint flags an answer longer than 1.4× the longest distractor.
- **Each choice has its own `resultTitle` and `resultBody`**, written as what happened after the deploy:
  - Correct: why it works *and* what it costs ("…at the price of one Redis round-trip, ~0.5 ms, per request").
  - Wrong: the specific way it failed, tied to this incident's numbers ("Locks now serialize 12k writes/s on one row; p99 climbs to 3 s").
  - No two wrong choices in one incident share a `resultTitle`. `resultBody` never just repeats the label.
- **Numbers after the deploy** (`metricsAfter`) must be plausible: the right fix recovers, a band-aid partially helps, a wrong fix makes it worse.
- Optional but encouraged: `approach` (`optimal` | `viable_with_tradeoffs` | `anti_pattern`) and a `tradeoffs` object (`costMonthlyDelta`, `latencyP99DeltaMs`, `complexityScore` 1–5, `consistencyGuarantee` `strong` | `eventual` | `session` | `weak`, `tradeoffSummary`).

## Accuracy checklist

- Latency ballparks: L1/RAM ~100 ns; NVMe random read ~100 µs; HDD seek ~5–10 ms; same-datacenter RTT ~0.5 ms; Redis GET incl. network ~0.2–1 ms; cross-region RTT 60–150 ms.
- Don't claim "linear scaling", "zero downtime", or "exactly-once" without the condition that makes it true.
- Name the real mechanism: singleflight/request coalescing, token bucket, consistent hashing with virtual nodes, idempotency key with a stored response, fencing tokens, etc.
- A hot single row is served from the buffer pool. Its problem is lock or connection contention, not disk IOPS.

## Variety (anti-monotony)

- Within a pack, each incident should teach a **different facet** of the pattern (failure mode, sizing, a tradeoff, an operational trap). Don't write five variants of the same bug.
- Vary products, scales (20k–350k req/s) and severities. Procedural skins add more variety at play time, so keep numbers consistent within an incident.

## Checking your work

```bash
npx tsx --test src/data/scenarioPacks.test.ts
```

The test runs the quality gate in `src/data/incidentQuality.ts` over every incident marked `reviewed: true`, and checks that every pack has enough playable incidents. Incidents that fail the gate are hidden from play automatically.
