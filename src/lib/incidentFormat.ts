import type { IncidentChoice, IncidentFormat, IncidentV2 } from "@/types";
import { knobSpecProblems } from "@/lib/knob";
import { answerIsLongest, lengthSpreadTooWide } from "@/data/incidentQuality";

export const FORMATS: IncidentFormat[] = ["pick", "culprit", "knob", "two-step", "bad-pr", "budget-cut"];

/** Levels must rotate formats: at least this many distinct, and no format more than this many levels in a row. */
export const MIN_FORMATS_ACROSS_LEVELS = 4;
export const MAX_SAME_FORMAT_RUN = 3;

export function formatOf(incident: Pick<IncidentV2, "format">): IncidentFormat {
  return incident.format ?? "pick";
}

function choiceProblems(prefix: string, choices: IncidentChoice[]): string[] {
  const problems: string[] = [];
  if (choices.length !== 3) problems.push(`${prefix}: needs exactly 3 choices`);
  if (choices.filter((c) => c.correct).length !== 1) problems.push(`${prefix}: needs exactly one correct choice`);
  for (const c of choices) {
    if (!c.resultTitle?.trim()) problems.push(`${prefix}/${c.id}: no resultTitle`);
    if ((c.resultBody?.trim().split(/\s+/).length ?? 0) < 8) problems.push(`${prefix}/${c.id}: resultBody too thin`);
  }
  if (answerIsLongest(choices)) problems.push(`${prefix}: correct label is the longest by more than 10%`);
  if (lengthSpreadTooWide(choices.map((c) => c.label))) problems.push(`${prefix}: label lengths spread wider than ±25%`);
  return problems;
}

/** Authoring problems with an incident's format data; empty when it is playable in its format. */
export function formatProblems(incident: IncidentV2): string[] {
  const format = formatOf(incident);
  const problems: string[] = [];
  const nodeIds = incident.graphBefore.nodes.map((n) => n.id);

  if (format === "culprit") {
    const c = incident.culprit;
    if (!c) return ["culprit format without a culprit spec"];
    if (!nodeIds.includes(c.nodeId)) problems.push(`culprit node ${c.nodeId} is not in graphBefore`);
    if (!c.explanation?.trim()) problems.push("culprit has no explanation");
    // The culprit must be found through the logs, not by spotting the only red box.
    const culpritNode = incident.graphBefore.nodes.find((n) => n.id === c.nodeId);
    const otherLoud = incident.graphBefore.nodes.filter((n) => n.id !== c.nodeId && (n.tone === "bad" || n.tone === "warn"));
    if (culpritNode?.tone === "bad" && otherLoud.length === 0) problems.push("culprit is the only red node; the topology gives it away");
    if (nodeIds.length < 3) problems.push("culprit needs at least 3 nodes to choose from");
  }

  if (format === "culprit" || incident.logs) {
    for (const id of nodeIds) {
      const lines = incident.logs?.[id];
      if (format === "culprit" && (!lines || lines.length < 2 || lines.length > 4)) {
        problems.push(`logs for ${id} need 2–4 lines`);
      }
    }
  }

  if (format === "knob") {
    if (!incident.knob) return ["knob format without a knob spec"];
    problems.push(...knobSpecProblems(incident.knob, incident.metricsBefore.map((m) => m.key)));
    for (const k of ["low", "high", "good"] as const) {
      if ((incident.knob[k]?.body?.trim().split(/\s+/).length ?? 0) < 8) problems.push(`knob ${k} result too thin`);
    }
  }

  if (format === "bad-pr") {
    for (const c of incident.choices) {
      const lines = c.diff?.split(/\r?\n/).filter((l) => l.trim()).length ?? 0;
      if (lines < 2 || lines > 8) problems.push(`bad-pr choice ${c.id} needs a diff of 2-8 lines`);
    }
    // The diffs are what the player reads; the outage must be traceable to exactly one of them.
    if (incident.choices.some((c) => !c.diff)) problems.push("bad-pr: every choice needs a diff");
  }

  if (format === "budget-cut") {
    // The system is healthy: nothing on the dashboard is red, the pressure is the bill.
    if (incident.metricsBefore.some((m) => m.tone === "bad")) problems.push("budget-cut: no metric may start red");
    if (!incident.metricsBefore.some((m) => m.key === "cost")) problems.push("budget-cut: needs a cost metric");
    for (const c of incident.choices) {
      if ((c.tradeoffs?.costMonthlyDelta ?? 0) >= 0) problems.push(`budget-cut choice ${c.id} must save money (negative costMonthlyDelta)`);
    }
  }

  if (format === "two-step") {
    if (!incident.mitigation) return ["two-step format without a mitigation step"];
    if (!incident.mitigation.question?.trim()) problems.push("mitigation has no question");
    problems.push(...choiceProblems("mitigation", incident.mitigation.choices));
  }

  return problems;
}

/** Problems with the per-level format rhythm; `formats` is ordered by level. */
export function rhythmProblems(formats: IncidentFormat[]): string[] {
  const problems: string[] = [];
  const distinct = new Set(formats).size;
  if (distinct < MIN_FORMATS_ACROSS_LEVELS) problems.push(`only ${distinct} formats across levels`);
  let run = 1;
  for (let i = 1; i < formats.length; i++) {
    run = formats[i] === formats[i - 1] ? run + 1 : 1;
    if (run > MAX_SAME_FORMAT_RUN) problems.push(`"${formats[i]}" runs more than ${MAX_SAME_FORMAT_RUN} levels in a row at level ${i + 1}`);
  }
  return problems;
}
