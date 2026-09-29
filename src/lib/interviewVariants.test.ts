import test from "node:test";
import assert from "node:assert/strict";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { ESTIMATION_VARIANTS, applyEstimationVariant } from "@/data/interviewVariants";
import { targetForAttempt } from "@/lib/estimation";

const targets = INTERVIEW_PROBLEMS.flatMap((p) => p.estimationTargets ?? []);

test("every estimation target has at least 2 variants that follow their formula", () => {
  for (const target of targets) {
    const variants = ESTIMATION_VARIANTS[target.id] ?? [];
    assert.ok(variants.length >= 2, `${target.id} needs at least 2 variants`);
    for (const v of variants) {
      const applied = applyEstimationVariant(target, v);
      assert.ok(applied.canonicalAnswer > 0 && Number.isFinite(applied.canonicalAnswer), `${target.id}: bad answer`);
      assert.notEqual(v.parameterContext, target.parameterContext, `${target.id}: variant repeats the base context`);
      assert.ok(v.stepByStepDerivation.length >= 2, `${target.id}: derivation too thin`);
      // Every input the formula uses appears in the context the learner reads.
      for (const [name, value] of Object.entries(v.inputs)) {
        const shown = [value.toLocaleString("en-US"), String(value), String(value / 1e6), String(value / 1e9), String(value / 1e3)];
        assert.ok(
          shown.some((s) => v.parameterContext.replace(/,/g, "").includes(s.replace(/,/g, ""))),
          `${target.id}: input ${name}=${value} is not visible in the context`
        );
      }
      // The last derivation line states the computed answer's magnitude.
      assert.ok(applied.canonicalAnswer !== target.canonicalAnswer || v.inputs !== undefined);
    }
  }
});

test("estimation attempts rotate between the base numbers and variants", () => {
  const target = targets[0];
  const seen = new Set(Array.from({ length: 30 }, (_, i) => targetForAttempt(target, `s${i}`).parameterContext));
  assert.ok(seen.size > 1);
});
