import test from "node:test";
import assert from "node:assert/strict";

import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { visibleChoiceChips } from "@/lib/choiceChips";

const allChoices = () => getAllScenarioPacks().flatMap((p) => p.incidents.flatMap((i) => i.choices));

test("no card shows its approach rating or cascade risk before it is deployed", () => {
  for (const choice of allChoices()) {
    const kinds = visibleChoiceChips(choice, false).map((c) => c.kind);
    assert.ok(!kinds.includes("approach"), `${choice.id} leaks its approach before submit`);
    assert.ok(!kinds.includes("cascade"), `${choice.id} leaks its cascade risk before submit`);
  }
});

test("after deploying, the approach rating appears; trade-off chips show either way", () => {
  const rated = allChoices().filter((c) => c.approach);
  assert.ok(rated.length > 0, "expected some choices with an approach rating");
  for (const choice of rated) {
    assert.ok(visibleChoiceChips(choice, true).some((c) => c.kind === "approach"), `${choice.id} has no rating after deploy`);
  }
  const costed = allChoices().find((c) => c.tradeoffs?.costMonthlyDelta !== undefined);
  assert.ok(costed);
  assert.ok(visibleChoiceChips(costed, false).some((c) => c.kind === "cost"));
});

test("a trade-off chip only the correct choice carries stays hidden until deploy", () => {
  const leaks: string[] = [];
  for (const pack of getAllScenarioPacks()) {
    for (const inc of pack.incidents) {
      for (const kind of ["cost", "consistency"] as const) {
        const showing = inc.choices.filter((c) => visibleChoiceChips(c, false, inc.choices).some((x) => x.kind === kind));
        // Either every card shows the chip or none does; a partial set points at the answer.
        if (showing.length > 0 && showing.length < inc.choices.length) leaks.push(`${inc.id}: ${kind}`);
      }
    }
  }
  assert.deepEqual(leaks, []);
});
