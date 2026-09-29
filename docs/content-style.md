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
- **Every distractor is something a real engineer might try under pressure.** Good distractors: the right tool in the wrong place, the fix for a neighbouring problem, a band-aid that helps for 10 minutes, or over-engineering. Never an absurd option ("Disable the internet"). The gate rejects distractors that start with "Blame", "Assume", "Attempt" or "Rely solely", and "disk corruption" / "schema migration" scapegoats when the incident isn't about disks or schemas.
- **Similar length**: every label must be within ±25% of the incident's median label length, and the correct label may not be more than 1.1× the longest distractor. Across all incidents the correct label should be the longest in at most 40% of them, so in most incidents make a distractor the longest.
- **The lazy answer sometimes wins**: every pack needs at least one incident where a bigger box, vertical scaling or a restart is the right call (for example, a short spike on a small box that is cheaper to upsize for a day). Otherwise players learn "never pick the bigger box" instead of reading the numbers.
- **Each choice has its own `resultTitle` and `resultBody`**, written as what happened after the deploy:
  - Correct: why it works *and* what it costs ("…at the price of one Redis round-trip, ~0.5 ms, per request").
  - Wrong: the specific way it failed, tied to this incident's numbers ("Locks now serialize 12k writes/s on one row; p99 climbs to 3 s").
  - No two wrong choices in one incident share a `resultTitle`. `resultBody` never just repeats the label.
- **Numbers after the deploy** (`metricsAfter`) must be plausible: the right fix recovers, a band-aid partially helps, a wrong fix makes it worse.
- Optional but encouraged: `approach` (`optimal` | `viable_with_tradeoffs` | `anti_pattern`) and a `tradeoffs` object (`costMonthlyDelta`, `latencyP99DeltaMs`, `complexityScore` 1–5, `consistencyGuarantee` `strong` | `eventual` | `session` | `weak`, `tradeoffSummary`).

## Stakes and consequences

- **Wrong answers change the system.** Give wrong choices a `graphPatch` (a node goes `bad`, its `cpu` climbs, a `sub` note like "queue 40k deep" appears, or `addNodes` adds the new hot spot) that matches the `resultBody`. Every incident needs at least one.
- **Every choice has a cost.** `tradeoffs.costMonthlyDelta` (USD/month) feeds the run's credit wallet. The budget defaults to max($200, 1.5× the correct fix), so over-engineering costs a star.
- **Cascades** (≥ 2 per pack): a correct choice's `cascadeIncidentId` points to an `isCascade` incident, the smaller problem the fix creates. The player chooses "Handle it now" or "Log a ticket" (−1 star).
- **Delayed bills** (≥ 1 per pack): a wrong band-aid's `consequenceIncidentId` points to an `isCascade` incident where the real problem pages you. Write the band-aid's result as a partial recovery with one warning sign; the UI shows it as "Holding" and hides its rating.

## Formats

`format` is `pick` (default), `culprit`, `knob`, `two-step`, `bad-pr` or `budget-cut`. Each pack needs ≥ 2 startable incidents in a non-pick format, and first-run formats must rotate across levels (≥ 4 formats, none more than 3 levels in a row).

- **culprit**: `culprit` + `logs` for every node (2–4 lines). The culprit's logs hold the clue; it must not be the only red node.
- **knob**: `knob` replaces the cards (keep the 3 choices for the gate). Both sides of the target must fail for a real reason; the metrics preview live along `curve`.
- **two-step**: `mitigation` (3 choices) stops the bleeding first; the incident's own choices then fix the root cause.
- **bad-pr**: "Spot the bad PR". The 3 choices are PRs the player can revert, each with a 2–8 line `diff` (`-`/`+` lines). Exactly one caused the outage, and it must be findable by reading the diff against the metrics. Innocent diffs look risky but are unrelated, so the lesson is reasoning, not "pick the scariest diff".
- **budget-cut**: the system is healthy (no red metric) but the bill is too high. `metricsBefore` needs a `cost` metric, and every choice has a negative `tradeoffs.costMonthlyDelta`. One removal keeps the SLO; the other two break a named number.

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
npx tsx scripts/check-packs.ts caching        # per-incident report for one pack (omit the id for all packs)
npx tsx --test src/data/scenarioPacks.test.ts
npx tsx --test src/lib/optionLint.test.ts     # answer-length lint across every question source
npx tsx scripts/check-run-content.ts caching  # stakes, cascades, bills and format data for one pack
```

The test runs the quality gate in `src/data/incidentQuality.ts` over every incident, canonical and cascade ones included (there is no bypass), and fails the build on any issue. Incidents that fail the gate are also hidden from play at runtime.
