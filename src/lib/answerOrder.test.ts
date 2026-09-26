import test from "node:test";
import assert from "node:assert/strict";

import { getAllPatterns } from "@/data/patterns";
import { getAllCampaignChapters } from "@/data/campaign";
import { getAllScenarioPacks, getScenarioVariantForPattern } from "@/data/scenarioPacks";
import { deterministicShuffle } from "@/lib/shuffle";

const SEEDS = Array.from({ length: 12 }, (_, i) => `run:test#${i + 1}`);

/** Positions the correct option lands in across attempts of the same question. */
function correctPositions<T>(options: T[], isCorrect: (o: T) => boolean, key: string): Set<number> {
  const positions = new Set<number>();
  for (const seed of SEEDS) {
    const shuffled = deterministicShuffle(options, `${seed}|${key}`);
    assert.equal(shuffled.length, options.length);
    assert.equal(shuffled.filter(isCorrect).length, options.filter(isCorrect).length);
    shuffled.forEach((o, i) => isCorrect(o) && positions.add(i));
  }
  return positions;
}

test("pattern questions: the correct option does not sit in a fixed slot across attempts", () => {
  for (const pattern of getAllPatterns()) {
    for (const q of [pattern.diagnosis, pattern.intervention, pattern.transfer, pattern.review]) {
      const positions = correctPositions(q.options, (o) => o.isCorrect, q.question);
      assert.ok(positions.size > 1, `${pattern.id}: "${q.question}" always shows the answer in one slot`);
    }
  }
});

test("campaign counter-strike questions move the correct option between attempts", () => {
  for (const chapter of getAllCampaignChapters()) {
    const q = chapter.challenge;
    const positions = correctPositions(q.options, (o) => o.isCorrect, q.question);
    assert.ok(positions.size > 1, `${chapter.id} counter question is positionally guessable`);
  }
});

test("incident choices move the correct option between attempts", () => {
  for (const pack of getAllScenarioPacks()) {
    for (const incident of pack.incidents) {
      const positions = correctPositions(incident.choices, (c) => c.correct, incident.id);
      assert.ok(positions.size > 1, `${incident.id} choices are positionally guessable`);
    }
  }
});

test("replay variants carry the incident's own choice text, not the pattern name", () => {
  for (const pack of getAllScenarioPacks()) {
    const variant = getScenarioVariantForPattern(pack.patternId, 0);
    const correct = variant.choices.filter((c) => c.correct);
    assert.ok(correct.length >= 1, `${variant.id} has no correct choice`);
    for (const c of variant.choices) {
      assert.ok(c.explanation.length > 0, `${variant.id}/${c.id} has no explanation`);
    }
    assert.ok(
      correct.every((c) => c.label !== pack.patternName),
      `${variant.id} labels its answer with the pattern name`
    );
  }
});
