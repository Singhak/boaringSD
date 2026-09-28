import test from "node:test";
import assert from "node:assert/strict";

import { getAllPatterns, getTransferQuestions } from "@/data/patterns";
import { getAllCampaignChapters } from "@/data/campaign";
import { INTERVIEW_PROBLEMS } from "@/data/interview";
import { PATTERN_TRADEOFFS } from "@/data/tradeoffScenarios";
import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { getPlayableIncidents } from "@/data/incidentQuality";
import {
  MAX_AVG_LENGTH_RATIO,
  MAX_CORRECT_IS_LONGEST_SHARE,
  MAX_RANK_SHARE,
  lintOptions,
  passesOptionLint,
  type LintQuestion,
} from "@/lib/optionLint";
import type { QuizOption } from "@/types";

const fromQuiz = (id: string, options: QuizOption[]): LintQuestion => ({
  id,
  options: options.map((o) => ({ text: o.label, correct: o.isCorrect })),
});

const fromTextOptions = (id: string, options: { text: string; isCorrect: boolean }[]): LintQuestion => ({
  id,
  options: options.map((o) => ({ text: o.text, correct: o.isCorrect })),
});

const SOURCES: Record<string, () => LintQuestion[]> = {
  incidents: () =>
    getAllScenarioPacks().flatMap((pack) =>
      getPlayableIncidents(pack).map((inc) => ({
        id: inc.id,
        options: inc.choices.map((c) => ({ text: c.label, correct: c.correct })),
      }))
    ),
  patterns: () =>
    getAllPatterns().flatMap((p) => [
      fromQuiz(`${p.id}.diagnosis`, p.diagnosis.options),
      fromQuiz(`${p.id}.intervention`, p.intervention.options),
      ...getTransferQuestions(p).map((t, idx) => fromQuiz(`${p.id}.transfer#${idx}`, t.options)),
      fromQuiz(`${p.id}.review`, p.review.options),
    ]),
  tradeoffScenarios: () =>
    Object.values(PATTERN_TRADEOFFS).flatMap((set) =>
      set.options.flatMap((o) => [
        fromTextOptions(`${o.id}.defense`, o.tradeoffDefenseQuestion.options),
        fromTextOptions(`${o.id}.stress10x`, o.stressTest10xQuestion.options),
      ])
    ),
  interview: () =>
    INTERVIEW_PROBLEMS.flatMap((p) => (p.followUpQuestions ?? []).map((q) => fromTextOptions(q.id, q.options))),
  campaign: () => getAllCampaignChapters().map((c) => fromQuiz(c.challenge.id, c.challenge.options)),
};

for (const [name, load] of Object.entries(SOURCES)) {
  test(`${name}: picking the longest option does no better than chance`, () => {
    const report = lintOptions(load());
    const pct = (report.correctIsLongestShare * 100).toFixed(0);
    assert.ok(
      passesOptionLint(report),
      `${name}: correct is longest in ${pct}% of ${report.questions} (max ${MAX_CORRECT_IS_LONGEST_SHARE * 100}%), ` +
        `avg length ratio ${report.avgLengthRatio.toFixed(2)}x (max ${MAX_AVG_LENGTH_RATIO}x), ` +
        `correct by length rank ${Object.entries(report.rankShares)
          .map(([rank, s]) => `${rank} ${(s * 100).toFixed(0)}%`)
          .join(" / ")} (max ${MAX_RANK_SHARE * 100}% each). ` +
        `Longest-answer questions: ${report.longestIds.join(", ")}`
    );
  });
}
