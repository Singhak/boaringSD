import test from "node:test";
import assert from "node:assert/strict";
import { getAllPatterns, getRotatingTransferQuestion } from "@/data/patterns";
import { getAllCampaignChapters, getCampaignChapterById } from "@/data/campaign";
import { getScenarioPackByPatternId, getCanonicalIncident, getWarRoomIncident, getIncidentById } from "@/data/scenarioPacks";
import { getPlayableIncidents } from "@/data/incidentQuality";
import { getTradeoffsForPattern } from "@/data/tradeoffScenarios";
import { buildDefenseQuestions, pickDefenseOption } from "@/lib/defenseQuestions";
import { getBuilderScenarioById } from "@/data/builderScenarios";
import { DEFAULT_STATS, isPatternUnlocked, isPatternCleared, recordPatternRun } from "@/lib/progression";

test("Audit all 23 levels for content integrity and progression flow", () => {
  const patterns = getAllPatterns();
  assert.equal(patterns.length, 23, "Must have exactly 23 patterns/levels");

  const chapters = getAllCampaignChapters();
  assert.equal(chapters.length, 23, "Must have exactly 23 campaign chapters");

  const issues: string[] = [];

  for (let level = 1; level <= 23; level++) {
    const pattern = patterns.find((p) => p.levelNumber === level);
    if (!pattern) {
      issues.push(`Level ${level}: Missing pattern`);
      continue;
    }

    const chapter = getCampaignChapterById(pattern.chapterId);
    if (!chapter) {
      issues.push(`Level ${level} (${pattern.id}): Missing chapter ${pattern.chapterId}`);
    }

    const pack = getScenarioPackByPatternId(pattern.id);
    if (!pack) {
      issues.push(`Level ${level} (${pattern.id}): Missing scenario pack`);
      continue;
    }

    const canonical = getCanonicalIncident(pattern.id);
    if (!canonical) {
      issues.push(`Level ${level} (${pattern.id}): Missing canonical incident`);
    }

    const playable = getPlayableIncidents(pack);
    if (playable.length === 0) {
      issues.push(`Level ${level} (${pattern.id}): No playable incidents in pack`);
    }

    // Check War room incidents across runs 0 to 3
    for (let runIdx = 0; runIdx < 4; runIdx++) {
      const warRoomInc = getWarRoomIncident(pattern.id, runIdx);
      if (!warRoomInc) {
        issues.push(`Level ${level} (${pattern.id}): getWarRoomIncident returned undefined for runIndex ${runIdx}`);
      } else {
        const correct = warRoomInc.choices?.filter((c) => c.correct);
        if ((!correct || correct.length === 0) && !warRoomInc.knob) {
          issues.push(`Level ${level} (${pattern.id}): War Room incident ${warRoomInc.id} (run ${runIdx}) has no correct choice and no knob`);
        }
      }
    }

    // Check all incidents in pack
    for (const inc of pack.incidents) {
      if (!inc.choices || inc.choices.length === 0) {
        if (!inc.knob) {
          issues.push(`Level ${level} (${pattern.id}): Incident ${inc.id} has no choices and no knob`);
        }
      } else {
        const correctChoices = inc.choices.filter((c) => c.correct);
        if (correctChoices.length === 0) {
          issues.push(`Level ${level} (${pattern.id}): Incident ${inc.id} has NO correct choice`);
        }
      }

      // Check culprit format
      if (inc.culprit) {
        const nodeExists = inc.graphBefore?.nodes?.some((n) => n.id === inc.culprit?.nodeId);
        if (!nodeExists) {
          issues.push(`Level ${level} (${pattern.id}): Incident ${inc.id} culprit nodeId "${inc.culprit.nodeId}" not found in graphBefore`);
        }
      }

      // Check mitigation format
      if (inc.mitigation) {
        const correctMitigation = inc.mitigation.choices?.filter((c) => c.correct);
        if (!correctMitigation || correctMitigation.length === 0) {
          issues.push(`Level ${level} (${pattern.id}): Incident ${inc.id} mitigation has no correct choice`);
        }
      }

      // Check knob format
      if (inc.knob) {
        if (inc.knob.min >= inc.knob.max) {
          issues.push(`Level ${level} (${pattern.id}): Incident ${inc.id} knob min (${inc.knob.min}) >= max (${inc.knob.max})`);
        }
      }

      // Check cascade target if set
      for (const choice of inc.choices || []) {
        if (choice.cascadeIncidentId) {
          const target = getIncidentById(choice.cascadeIncidentId);
          if (!target) {
            issues.push(`Level ${level} (${pattern.id}): Choice ${choice.id} in ${inc.id} points to nonexistent cascadeIncidentId ${choice.cascadeIncidentId}`);
          }
        }
        if (choice.consequenceIncidentId) {
          const target = getIncidentById(choice.consequenceIncidentId);
          if (!target) {
            issues.push(`Level ${level} (${pattern.id}): Choice ${choice.id} in ${inc.id} points to nonexistent consequenceIncidentId ${choice.consequenceIncidentId}`);
          }
        }
      }

      // Check nextId
      if (inc.nextId) {
        const target = getIncidentById(inc.nextId);
        if (!target) {
          issues.push(`Level ${level} (${pattern.id}): Incident ${inc.id} points to nonexistent nextId ${inc.nextId}`);
        }
      }
    }

    // Tradeoff scenario & defense questions
    const tradeoffSet = getTradeoffsForPattern(pattern.id);
    if (!tradeoffSet) {
      issues.push(`Level ${level} (${pattern.id}): Missing tradeoffSet`);
    } else {
      if (!tradeoffSet.options || tradeoffSet.options.length === 0) {
        issues.push(`Level ${level} (${pattern.id}): TradeoffSet has no options`);
      } else {
        for (const opt of tradeoffSet.options) {
          if (!opt.tradeoffDefenseQuestion) {
            issues.push(`Level ${level} (${pattern.id}): Tradeoff option ${opt.id} missing tradeoffDefenseQuestion`);
          } else {
            const hasCorrect = opt.tradeoffDefenseQuestion.options.some((o) => o.isCorrect);
            if (!hasCorrect) {
              issues.push(`Level ${level} (${pattern.id}): Tradeoff option ${opt.id} Q1 has NO correct answer`);
            }
          }
          if (!opt.stressTest10xQuestion) {
            issues.push(`Level ${level} (${pattern.id}): Tradeoff option ${opt.id} missing stressTest10xQuestion`);
          } else {
            const hasCorrect = opt.stressTest10xQuestion.options.some((o) => o.isCorrect);
            if (!hasCorrect) {
              issues.push(`Level ${level} (${pattern.id}): Tradeoff option ${opt.id} Q2 has NO correct answer`);
            }
          }
        }

        // Test pickDefenseOption for all correct choices in the pack
        for (const inc of pack.incidents) {
          for (const choice of inc.choices || []) {
            if (choice.correct) {
              const defenseOpt = pickDefenseOption(tradeoffSet, choice.label);
              if (!defenseOpt) {
                issues.push(`Level ${level} (${pattern.id}): pickDefenseOption returned undefined for choice "${choice.label}" in ${inc.id}`);
              } else {
                const { q1, q2 } = buildDefenseQuestions(defenseOpt, choice.label, `test-seed-${inc.id}`);
                if (!q1.options.some((o) => o.isCorrect)) {
                  issues.push(`Level ${level} (${pattern.id}): Built Q1 for choice "${choice.label}" in ${inc.id} has no correct option`);
                }
                if (!q2.options.some((o) => o.isCorrect)) {
                  issues.push(`Level ${level} (${pattern.id}): Built Q2 for choice "${choice.label}" in ${inc.id} has no correct option`);
                }
              }
            }
          }
        }
      }
    }

    // Transfer questions across rotation runs
    for (let r = 0; r < 4; r++) {
      const tq = getRotatingTransferQuestion(pattern, r);
      if (!tq || !tq.options || !tq.options.some((o) => o.isCorrect)) {
        issues.push(`Level ${level} (${pattern.id}): Transfer question run ${r} has NO correct option`);
      }
    }

    // Builder scenario
    const builderScen = getBuilderScenarioById(pattern.builderScenarioId);
    if (!builderScen) {
      issues.push(`Level ${level} (${pattern.id}): Missing builder scenario ${pattern.builderScenarioId}`);
    }

    // Next Level Linkage
    if (level < 23) {
      const nextPat = patterns.find((p) => p.levelNumber === level + 1);
      if (!nextPat) {
        issues.push(`Level ${level} (${pattern.id}): Missing next pattern for level ${level + 1}`);
      } else {
        const nextChap = getCampaignChapterById(nextPat.chapterId);
        if (!nextChap) {
          issues.push(`Level ${level} (${pattern.id}): Next pattern ${nextPat.id} chapter ${nextPat.chapterId} not found`);
        }
      }
    }
  }

  if (issues.length > 0) {
    console.error("Found issues across levels:\n" + issues.join("\n"));
  }
  assert.equal(issues.length, 0, `Found ${issues.length} level integrity issues:\n${issues.join("\n")}`);
});

test("Simulate sequential level clearing 1 to 23 and verify unlocking", () => {
  const patterns = getAllPatterns();

  let stats = { ...DEFAULT_STATS };

  for (let level = 1; level <= 23; level++) {
    const pattern = patterns.find((p) => p.levelNumber === level)!;
    assert.ok(pattern, `Pattern for level ${level} must exist`);

    const unlocked = isPatternUnlocked(stats, pattern);
    assert.equal(unlocked, true, `Level ${level} (${pattern.id}) should be unlocked after clearing previous levels`);

    // Simulate clearing the pattern
    const outcome = recordPatternRun(
      stats,
      pattern,
      {
        patternId: pattern.id,
        diagnosisFirstTry: true,
        interventionFirstTry: true,
        transferFirstTry: true,
        hintsUsed: 0,
        failureReasons: [],
      },
      new Date()
    );

    stats = outcome.stats;
    assert.equal(isPatternCleared(stats, pattern), true, `Level ${level} (${pattern.id}) must be marked cleared`);
  }
});

