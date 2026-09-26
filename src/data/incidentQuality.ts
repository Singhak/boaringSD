import type { IncidentPackV2, IncidentV2 } from "@/types";

/**
 * Automatic content-quality gate for scenario-pack incidents. Incidents that
 * fail it are hidden from play until rewritten (see docs/content-style.md).
 */
export type IncidentQualityIssue =
  | "no-correct-choice"
  | "reused-answer-label"
  | "answer-is-pattern-name"
  | "truncated-label"
  | "result-repeats-label"
  | "shared-wrong-feedback"
  | "answer-is-longest"
  | "too-few-choices";

// Words a complete option label should not end on; the generator cut labels mid-phrase.
const DANGLING_WORDS = new Set([
  "a", "all", "an", "and", "accept", "because", "by", "every", "for", "in",
  "nothing", "of", "on", "or", "single", "the", "to", "with",
]);

function normalize(text: string | undefined): string {
  return (text ?? "").trim().toLowerCase();
}

/** Correct-answer labels reused across a pack (a sign of templated incidents). */
function correctLabelCounts(pack: Pick<IncidentPackV2, "incidents">): Map<string, number> {
  const counts = new Map<string, number>();
  for (const inc of pack.incidents) {
    for (const c of inc.choices ?? []) {
      if (c.correct) counts.set(normalize(c.label), (counts.get(normalize(c.label)) ?? 0) + 1);
    }
  }
  return counts;
}

export function incidentQualityIssues(
  incident: IncidentV2,
  pack: Pick<IncidentPackV2, "incidents" | "patternName">,
  labelCounts: Map<string, number> = correctLabelCounts(pack)
): IncidentQualityIssue[] {
  const issues = new Set<IncidentQualityIssue>();
  const choices = incident.choices ?? [];
  const correct = choices.filter((c) => c.correct);
  const wrong = choices.filter((c) => !c.correct);

  if (choices.length < 3) issues.add("too-few-choices");
  if (correct.length === 0) issues.add("no-correct-choice");

  for (const c of choices) {
    const label = normalize(c.label);
    const lastWord = label.split(/\s+/).pop() ?? "";
    if (DANGLING_WORDS.has(lastWord) || label.split(/\s+/).length < 2) issues.add("truncated-label");
    if (normalize(c.resultBody) === label) issues.add("result-repeats-label");
    if (c.correct && (labelCounts.get(label) ?? 0) > 1) issues.add("reused-answer-label");
    if (c.correct && label === normalize(pack.patternName)) issues.add("answer-is-pattern-name");
  }

  const wrongTitles = wrong.map((c) => normalize(c.resultTitle));
  if (new Set(wrongTitles).size < wrongTitles.length) issues.add("shared-wrong-feedback");

  // An answer much longer than every distractor can be picked without reading.
  const longestWrong = Math.max(0, ...wrong.map((c) => c.label.length));
  if (correct.some((c) => c.label.length > longestWrong * 1.4)) issues.add("answer-is-longest");

  return [...issues];
}

/** Hand-written canonical and cascade incidents are always playable; others must pass the gate. */
export function isPlayableIncident(
  incident: IncidentV2,
  pack: Pick<IncidentPackV2, "incidents" | "patternName" | "canonicalId">,
  labelCounts?: Map<string, number>
): boolean {
  if (incident.canonical || incident.id === pack.canonicalId || incident.isCascade) return true;
  return incidentQualityIssues(incident, pack, labelCounts).length === 0;
}

export function getPlayableIncidents(pack: Pick<IncidentPackV2, "incidents" | "patternName" | "canonicalId">): IncidentV2[] {
  const counts = correctLabelCounts(pack);
  return pack.incidents.filter((inc) => isPlayableIncident(inc, pack, counts));
}
