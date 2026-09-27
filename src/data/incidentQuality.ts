import type { IncidentChoice, IncidentPackV2, IncidentV2 } from "@/types";

/**
 * Automatic content-quality gate for scenario-pack incidents. Incidents that
 * fail it are hidden from play until rewritten (see docs/content-style.md).
 * Canonical and cascade incidents get no bypass: they must pass too.
 */
export type IncidentQualityIssue =
  | "no-correct-choice"
  | "reused-answer-label"
  | "answer-is-pattern-name"
  | "truncated-label"
  | "result-repeats-label"
  | "shared-wrong-feedback"
  | "answer-is-longest"
  | "answer-length-spread"
  | "strawman-distractor"
  | "too-few-choices";

/** Pack-level findings. `always-wrong-trope` blocks; `approach-badge-mismatch` is informational. */
export type PackQualityIssue = "always-wrong-trope";

// Words a complete option label should not end on; the generator cut labels mid-phrase.
const DANGLING_WORDS = new Set([
  "a", "all", "an", "and", "accept", "because", "by", "every", "for", "in",
  "nothing", "of", "on", "or", "single", "the", "to", "with",
]);

/** The correct label may be the longest only if it is at most this much longer than the longest distractor. */
export const LONGEST_ANSWER_MARGIN = 1.1;
/** Every option's length must be within this fraction of the median option length. */
export const LENGTH_SPREAD = 0.25;

/** Distractor openings nobody would deploy under pressure. */
const STRAWMAN_OPENINGS = /^(blame|assume|attempt|rely solely)\b/i;

/**
 * Off-topic scapegoats: a distractor may only name these when the incident itself
 * mentions the subject (matched against title, brief, constraint and question).
 */
const OFF_TOPIC_DISTRACTORS: { phrase: RegExp; topic: RegExp }[] = [
  { phrase: /disk corruption/i, topic: /\b(disk|storage|ssd|nvme|fsync|wal|sstable|compaction)\b/i },
  { phrase: /schema migration/i, topic: /\b(schema|migration|ddl|alter table|column)\b/i },
];

/**
 * "Bigger box / restart / more RAM" answers. If a pack only ever uses them as
 * distractors, players learn to avoid them without reading.
 */
export const TROPE_LABEL =
  /\b(bigger|larger) (box|instance|machine|server|node)|vertical(ly)?[ -]scal|scale (it |the \w+ )?up\b|upsiz|resiz(e|ing) the (instance|box|node|machine|server)|more (ram|memory|cpu|cores)|restart|reboot|\d+[- ]core|upgrade (the |to a )?(instance|box|machine|server|node)/i;

function normalize(text: string | undefined): string {
  return (text ?? "").trim().toLowerCase();
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
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

/** True if the correct label is the longest option and noticeably longer than every distractor. */
export function answerIsLongest(choices: Pick<IncidentChoice, "label" | "correct">[]): boolean {
  const wrong = choices.filter((c) => !c.correct);
  if (wrong.length === 0) return false;
  const longestWrong = Math.max(...wrong.map((c) => c.label.length));
  return choices.some((c) => c.correct && c.label.length > longestWrong * LONGEST_ANSWER_MARGIN);
}

/** True if some option is much shorter or longer than the median option. */
export function lengthSpreadTooWide(labels: string[]): boolean {
  if (labels.length < 2) return false;
  const med = median(labels.map((l) => l.length));
  return labels.some((l) => Math.abs(l.length - med) > med * LENGTH_SPREAD);
}

export function isStrawmanDistractor(label: string, incidentText: string): boolean {
  if (STRAWMAN_OPENINGS.test(label.trim())) return true;
  return OFF_TOPIC_DISTRACTORS.some((d) => d.phrase.test(label) && !d.topic.test(incidentText));
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

  // An answer longer than every distractor, or options of very different lengths, can be picked without reading.
  if (answerIsLongest(choices)) issues.add("answer-is-longest");
  if (lengthSpreadTooWide(choices.map((c) => c.label))) issues.add("answer-length-spread");

  const incidentText = [incident.title, incident.brief, incident.constraint, incident.question].join(" ");
  if (wrong.some((c) => isStrawmanDistractor(c.label, incidentText))) issues.add("strawman-distractor");

  return [...issues];
}

/** Pack-level checks that no single incident can reveal. */
export function packQualityIssues(pack: Pick<IncidentPackV2, "incidents">): PackQualityIssue[] {
  const tropeChoices = pack.incidents.flatMap((i) => i.choices ?? []).filter((c) => TROPE_LABEL.test(c.label));
  // Tropes that never win teach "never pick the bigger box" instead of "read the numbers",
  // so every pack needs at least one incident where upsizing or a restart is the right call.
  if (!tropeChoices.some((c) => c.correct)) return ["always-wrong-trope"];
  return [];
}

/** Informational: incidents whose correct choice is not rated `optimal`. The result panel still shows the rating. */
export function approachBadgeMismatches(pack: Pick<IncidentPackV2, "incidents">): string[] {
  return pack.incidents
    .filter((i) => i.choices.some((c) => c.correct && c.approach && c.approach !== "optimal"))
    .map((i) => i.id);
}

export function isPlayableIncident(
  incident: IncidentV2,
  pack: Pick<IncidentPackV2, "incidents" | "patternName">,
  labelCounts?: Map<string, number>
): boolean {
  return incidentQualityIssues(incident, pack, labelCounts).length === 0;
}

export function getPlayableIncidents(pack: Pick<IncidentPackV2, "incidents" | "patternName">): IncidentV2[] {
  const counts = correctLabelCounts(pack);
  return pack.incidents.filter((inc) => isPlayableIncident(inc, pack, counts));
}
