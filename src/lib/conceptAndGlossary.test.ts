import test from "node:test";
import assert from "node:assert/strict";

import { CONCEPT_INTEL_REGISTRY, getConceptIntel } from "@/data/conceptIntel";
import { getAllPatterns } from "@/data/patterns";
import { GLOSSARY, findGlossaryMatches } from "@/data/glossary";
import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { formatOf } from "@/lib/incidentFormat";

test("every PatternId has Concept Intel registered", () => {
  const patterns = getAllPatterns();
  assert.equal(patterns.length, 23);
  assert.ok(Object.keys(CONCEPT_INTEL_REGISTRY).length >= 23);

  const missing: string[] = [];
  for (const p of patterns) {
    const intel = getConceptIntel(p.id);
    if (!intel) {
      missing.push(p.id);
      continue;
    }
    // Each entry needs a 1-sentence analogy, a 3-step dataflow, and "when it fails"
    assert.ok(intel.eli5Analogy.story.length > 10, `${p.id} analogy story too short`);
    assert.ok(intel.visualFlow.includes("──►"), `${p.id} visualFlow should be a multi-step flow`);
    assert.ok(intel.whenItFails && intel.whenItFails.length > 10, `${p.id} missing whenItFails`);

    // Under 80 words guardrail
    const whyWords = intel.whyItWorks.split(/\s+/).length;
    assert.ok(whyWords <= 80, `${p.id} whyItWorks exceeds 80 words (${whyWords})`);
    const analogyWords = intel.eli5Analogy.story.split(/\s+/).length;
    assert.ok(analogyWords <= 80, `${p.id} analogy exceeds 80 words (${analogyWords})`);
    const failWords = intel.whenItFails.split(/\s+/).length;
    assert.ok(failWords <= 80, `${p.id} whenItFails exceeds 80 words (${failWords})`);
  }

  assert.deepEqual(missing, []);
});

test("glossary defines jargon terms and finds matches in option labels", () => {
  assert.ok(GLOSSARY.length >= 20);

  // Key terms required in 4.2
  const pacelc = GLOSSARY.find((g) => g.term === "PACELC");
  assert.ok(pacelc);
  assert.ok(pacelc.definition.length > 10);

  const quorum = GLOSSARY.find((g) => g.term === "Quorum");
  assert.ok(quorum);
  assert.ok(quorum.definition.length > 10);

  const cacheAside = GLOSSARY.find((g) => g.term === "Cache-Aside");
  assert.ok(cacheAside);
  assert.ok(cacheAside.definition.length > 10);

  // Each glossary entry must have a concise 1-sentence definition
  for (const entry of GLOSSARY) {
    const sentenceCount = entry.definition.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(
      sentenceCount <= 2,
      `Glossary term ${entry.term} definition should be 1 sentence, got: ${entry.definition}`
    );
  }

  // Matching in text
  const text = "Deploy Redis with cache-aside in front of Postgres to prevent cache stampede under strict quorum";
  const matches = findGlossaryMatches(text);
  const matchedTerms = matches.map((m) => m.entry.term);
  assert.ok(matchedTerms.includes("Cache-Aside"));
  assert.ok(matchedTerms.includes("Cache Stampede"));
  assert.ok(matchedTerms.includes("Quorum"));
});

test("every pattern includes 1-line tradeoff lessons for the debrief", () => {
  const patterns = getAllPatterns();
  for (const p of patterns) {
    assert.ok(p.tradeoff.whatFailed, `${p.id} missing tradeoff.whatFailed`);
    assert.ok(p.tradeoff.whyFixWorked, `${p.id} missing tradeoff.whyFixWorked`);
    assert.ok(p.tradeoff.insufficientWhen, `${p.id} missing tradeoff.insufficientWhen`);
  }
});

test("every Find the Culprit incident has authored logs for its nodes", () => {
  const packs = getAllScenarioPacks();
  let culpritCount = 0;
  for (const pack of packs) {
    for (const inc of pack.incidents) {
      if (formatOf(inc) === "culprit") {
        culpritCount++;
        assert.ok(inc.culprit, `${inc.id} missing culprit spec`);
        assert.ok(inc.logs, `${inc.id} missing authored logs`);
        for (const node of inc.graphBefore.nodes) {
          const lines = inc.logs[node.id];
          assert.ok(lines && lines.length >= 2, `${inc.id} node ${node.id} needs at least 2 log lines`);
        }
      }
    }
  }
  assert.ok(culpritCount > 0, "there must be culprit incidents in the packs");
});
