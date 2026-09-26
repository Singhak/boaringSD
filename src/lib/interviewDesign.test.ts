import test from "node:test";
import assert from "node:assert/strict";

import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { EMPTY_DESIGN, evaluateArchitecture, type Design } from "@/lib/interviewDesign";
import type { InterviewProblem } from "@/types";

/** The design an interviewer expects: exactly the required components, one spare server. */
function leanDesign(problem: InterviewProblem): Design {
  const req = problem.requiredDesign ?? {};
  return {
    ...EMPTY_DESIGN,
    hasLB: !!req.needsLB,
    hasCache: !!req.needsCache,
    hasCDN: !!req.needsCDN,
    hasQueue: !!req.needsQueue,
    hasReplica: !!req.needsReplica,
    serverCount: req.minServers ?? 2,
  };
}

const EVERYTHING_ON: Design = {
  hasCDN: true,
  hasLB: true,
  serverCount: 4,
  hasCache: true,
  hasQueue: true,
  hasDatabase: true,
  hasReplica: true,
};

test("the lean design that meets each problem's requirements scores 100", () => {
  for (const problem of INTERVIEW_PROBLEMS) {
    const result = evaluateArchitecture(problem, leanDesign(problem));
    assert.equal(result.score, 100, `${problem.id}: ${result.issues.join(" | ")}`);
  }
});

test("switching every component on never beats the lean design", () => {
  for (const problem of INTERVIEW_PROBLEMS) {
    const lean = evaluateArchitecture(problem, leanDesign(problem)).score;
    const everything = evaluateArchitecture(problem, EVERYTHING_ON);
    const req = problem.requiredDesign ?? {};
    const extras = [req.needsCDN, req.needsCache, req.needsQueue, req.needsReplica].filter((n) => !n).length;
    if (extras > 0 || (req.minServers ?? 2) + 1 < 4) {
      assert.ok(everything.score < lean, `${problem.id}: everything-on scored ${everything.score}`);
      assert.ok(everything.issues.some((i) => /Over-/.test(i)));
    }
  }
});

test("a missing required component still fails", () => {
  const problem = INTERVIEW_PROBLEMS.find((p) => p.requiredDesign?.needsLB);
  assert.ok(problem);
  const result = evaluateArchitecture(problem, { ...leanDesign(problem), hasLB: false });
  assert.ok(result.score < 100);
});
