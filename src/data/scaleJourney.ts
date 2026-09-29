import type { ScenarioSpec } from "@/lib/builderScore";

/**
 * The Scale Journey: one system grown from a front-page spike to ten million users.
 * The learner's design carries over from stage to stage, so every early shortcut is
 * paid for later. Each week brings a twist that changes which components matter.
 */
export interface JourneyStage {
  id: string;
  title: string;
  users: string;
  /** What just happened, in one or two sentences. */
  story: string;
  /** What the stress test checks, in plain words. */
  goal: string;
  /** A nudge towards the mechanism, never the component list. */
  hint: string;
  spec: ScenarioSpec;
}

const base = {
  cacheHitRate: 0.85,
  requiredComponents: [],
  acceptedArchetypes: undefined,
  passThreshold: 60,
} satisfies Partial<ScenarioSpec>;

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "front-page",
    title: "Front page",
    users: "50k users",
    story: "A post about your app hit the front page. Traffic jumped from a trickle to 15,000 req/s on one server.",
    goal: "App servers under 80% CPU.",
    hint: "One machine has a ceiling. What lets you add a second one without clients noticing?",
    spec: {
      ...base,
      trafficRps: 15000,
      readRatio: 0.9,
      staticAssetShare: 0.2,
      globalUsers: false,
      slowDownstream: false,
      killOneServer: false,
      targets: { maxServerCpu: 80 },
      budget: 2700,
    },
  },
  {
    id: "series-a",
    title: "Series A",
    users: "500k users",
    story: "The feed is popular: 40,000 req/s, 90% of them reads of the same hot posts. The database is the next wall.",
    goal: "App servers under 80% CPU, database under 75%, p95 under 300 ms.",
    hint: "Most reads ask for the same few rows. Where can a repeated answer come from without asking the database?",
    spec: {
      ...base,
      trafficRps: 40000,
      readRatio: 0.9,
      staticAssetShare: 0.2,
      globalUsers: false,
      slowDownstream: false,
      killOneServer: false,
      targets: { maxServerCpu: 80, maxDbCpu: 75, maxLatencyMs: 300 },
      budget: 4800,
    },
  },
  {
    id: "global",
    title: "Going global",
    users: "2M users",
    story: "You launched in Europe and Asia. 70,000 req/s, half of it images and scripts, and users far from your region see slow pages.",
    goal: "App servers under 80% CPU, database under 75%, p95 under 200 ms.",
    hint: "Half the bytes never change. Could they be served from somewhere closer to the user than your servers?",
    spec: {
      ...base,
      trafficRps: 70000,
      readRatio: 0.9,
      staticAssetShare: 0.5,
      globalUsers: true,
      slowDownstream: false,
      killOneServer: false,
      targets: { maxServerCpu: 80, maxDbCpu: 75, maxLatencyMs: 200 },
      budget: 5000,
    },
  },
  {
    id: "black-friday",
    title: "Black Friday",
    users: "5M users",
    story: "Checkout traffic peaks at 90,000 req/s and the payment provider answers in 2 seconds. A server will die mid-sale.",
    goal: "Survive losing a server, keep servers under 80% CPU and p95 under 300 ms while payments are slow.",
    hint: "Nobody needs to wait for the payment provider in the request itself, and one spare server is cheaper than an outage.",
    spec: {
      ...base,
      trafficRps: 90000,
      readRatio: 0.85,
      staticAssetShare: 0.5,
      globalUsers: true,
      slowDownstream: true,
      killOneServer: true,
      targets: { maxServerCpu: 80, maxDbCpu: 75, maxLatencyMs: 300 },
      budget: 6800,
    },
  },
  {
    id: "ten-million",
    title: "Ten million users",
    users: "10M users",
    story: "120,000 req/s worldwide, payments still slow, and hardware still fails. Everything you built so far is under load at once.",
    goal: "Survive losing a server with servers under 75% CPU, database under 70% and p95 under 250 ms.",
    hint: "Look at each tier in turn: edge, compute, data, async. Which one is closest to its limit?",
    spec: {
      ...base,
      trafficRps: 120000,
      readRatio: 0.9,
      staticAssetShare: 0.6,
      globalUsers: true,
      slowDownstream: true,
      killOneServer: true,
      targets: { maxServerCpu: 75, maxDbCpu: 70, maxLatencyMs: 250 },
      budget: 7500,
    },
  },
];

export interface JourneyTwist {
  id: string;
  label: string;
  brief: string;
  apply: (spec: ScenarioSpec, stageIndex: number) => ScenarioSpec;
}

export const JOURNEY_TWISTS: JourneyTwist[] = [
  {
    id: "steady",
    label: "Steady growth",
    brief: "No surprises this week: the classic path from one server to ten million users.",
    apply: (spec) => spec,
  },
  {
    id: "write-heavy",
    label: "Write-heavy week",
    brief: "Users post far more than usual. A third of traffic is writes, so caches and replicas help less.",
    apply: (spec) => ({ ...spec, readRatio: Math.max(0.6, spec.readRatio - 0.25) }),
  },
  {
    id: "flaky-hardware",
    label: "Flaky hardware week",
    brief: "The cloud region is unstable: from stage 2 on, a server dies during every stress test.",
    apply: (spec, i) => (i >= 1 ? { ...spec, killOneServer: true } : spec),
  },
  {
    id: "global-first",
    label: "Global from day one",
    brief: "Your first users are spread across three continents, and most of every page is static media.",
    apply: (spec, i) =>
      i >= 1 ? { ...spec, globalUsers: true, staticAssetShare: Math.min(0.7, spec.staticAssetShare + 0.2) } : spec,
  },
];

/** ISO-8601 week key ("2026-W40"), so the weekly boss rolls over on Monday for everyone. */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** This week's twist: the same for every player, rotating week by week. */
export function twistForWeek(weekKey: string): JourneyTwist {
  const [year, week] = weekKey.split("-W").map(Number);
  return JOURNEY_TWISTS[(year * 53 + week) % JOURNEY_TWISTS.length];
}

export function stageSpec(stageIndex: number, twist: JourneyTwist): ScenarioSpec {
  return twist.apply(JOURNEY_STAGES[stageIndex].spec, stageIndex);
}
