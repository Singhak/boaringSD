import test from "node:test";
import assert from "node:assert/strict";

import { getConceptReveal } from "./lessons";

test("load balancer concept reveal teaches traffic distribution", () => {
  const reveal = getConceptReveal("load-balancer");

  assert.equal(reveal.title, "Traffic Distribution");
  assert.match(reveal.principle, /load balancer/i);
  assert.match(reveal.takeaway, /distribute traffic/i);
});

test("cache reveal focuses on read optimization and staleness tradeoff", () => {
  const reveal = getConceptReveal("cache");

  assert.equal(reveal.title, "Cache as a Read Optimization Layer");
  assert.match(reveal.tradeoff, /stale|staleness/i);
  assert.match(reveal.takeaway, /caching/i);
});

test("database scaling reveal explains read replicas", () => {
  const reveal = getConceptReveal("database-scaling");

  assert.equal(reveal.title, "Read Replication");
  assert.match(reveal.principle, /read replicas/i);
  assert.match(reveal.takeaway, /read-heavy/i);
});
