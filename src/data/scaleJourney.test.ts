import test from "node:test";
import assert from "node:assert/strict";

import { designMonthlyCost, evaluateScenario } from "@/lib/builderScore";
import { JOURNEY_STAGES, JOURNEY_TWISTS, isoWeekKey, stageSpec, twistForWeek } from "./scaleJourney";

type Opts = { servers: number; cache: boolean; replicas: number; cdn: boolean; queue: boolean };

/** A conventional wiring: users → (cdn →) lb → servers → cache/queue/db, db → replicas. */
function design(o: Opts) {
  const nodes: { id: string; data: { type: string; label: string } }[] = [];
  const edges: { source: string; target: string }[] = [];
  const add = (id: string, type: string) => nodes.push({ id, data: { type, label: id } });
  add("users", "client");
  add("lb", "load_balancer");
  add("db", "database");
  if (o.cdn) {
    add("cdn", "cdn");
    edges.push({ source: "users", target: "cdn" }, { source: "cdn", target: "lb" });
  } else edges.push({ source: "users", target: "lb" });
  if (o.cache) add("cache", "cache");
  if (o.queue) add("queue", "queue");
  for (let i = 1; i <= o.servers; i++) {
    add(`s${i}`, "server");
    edges.push({ source: "lb", target: `s${i}` }, { source: `s${i}`, target: "db" });
    if (o.cache) edges.push({ source: `s${i}`, target: "cache" });
    if (o.queue) edges.push({ source: `s${i}`, target: "queue" });
  }
  for (let r = 1; r <= o.replicas; r++) {
    add(`r${r}`, "replica");
    edges.push({ source: "db", target: `r${r}` });
    for (let i = 1; i <= o.servers; i++) edges.push({ source: `s${i}`, target: `r${r}` });
  }
  return { nodes, edges };
}

function cheapestPass(stageIndex: number, twistIndex: number, allow: (o: Opts) => boolean = () => true) {
  const spec = stageSpec(stageIndex, JOURNEY_TWISTS[twistIndex]);
  let best: { cost: number; nodes: number } | null = null;
  for (let servers = 1; servers <= 14; servers++)
    for (const cache of [false, true])
      for (let replicas = 0; replicas <= 2; replicas++)
        for (const cdn of [false, true])
          for (const queue of [false, true]) {
            const o = { servers, cache, replicas, cdn, queue };
            if (!allow(o)) continue;
            const d = design(o);
            if (!evaluateScenario(d.nodes as never, d.edges, spec).canPass) continue;
            const cost = designMonthlyCost(d.nodes as never);
            if (!best || cost < best.cost) best = { cost, nodes: d.nodes.length };
          }
  return best;
}

test("every stage is winnable under every weekly twist, within budget, on a normal-sized canvas", () => {
  JOURNEY_STAGES.forEach((stage, i) => {
    JOURNEY_TWISTS.forEach((twist, t) => {
      const best = cheapestPass(i, t);
      assert.ok(best, `${stage.id} / ${twist.id} has no passing design`);
      assert.ok(best.cost <= stageSpec(i, twist).budget!, `${stage.id} / ${twist.id} costs ${best.cost}`);
      assert.ok(best.nodes <= 16, `${stage.id} / ${twist.id} needs ${best.nodes} nodes`);
    });
  });
});

test("each stage asks for a new idea: read offload, then the edge, then async work", () => {
  JOURNEY_TWISTS.forEach((twist, t) => {
    assert.equal(cheapestPass(1, t, (o) => !o.cache && o.replicas === 0), null, `series-a/${twist.id} passes with no read offload`);
    assert.equal(cheapestPass(2, t, (o) => !o.cdn), null, `global/${twist.id} passes without a CDN`);
    assert.equal(cheapestPass(3, t, (o) => !o.queue), null, `black-friday/${twist.id} passes without a queue`);
  });
});

test("the week key follows ISO-8601 and the twist rotates week to week", () => {
  assert.equal(isoWeekKey(new Date(Date.UTC(2026, 8, 29))), "2026-W40");
  assert.equal(isoWeekKey(new Date(Date.UTC(2027, 0, 1))), "2026-W53");
  assert.equal(isoWeekKey(new Date(Date.UTC(2026, 0, 1))), "2026-W01");
  assert.notEqual(twistForWeek("2026-W40").id, twistForWeek("2026-W41").id);
});
