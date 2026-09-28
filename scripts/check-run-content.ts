/**
 * Phase 2 content report (graph changes, costs, cascades, delayed bills, formats) per pack.
 *   npx tsx scripts/check-run-content.ts                  # every pack
 *   npx tsx scripts/check-run-content.ts caching cdn-edge
 */
import { getAllScenarioPacks, getWarRoomIncident } from "@/data/scenarioPacks";
import { incidentQualityIssues } from "@/data/incidentQuality";
import { applyGraphPatch, graphChanged, unknownPatchNodes } from "@/lib/graphPatch";
import { formatOf, formatProblems } from "@/lib/incidentFormat";
import { creditBudgetFor } from "@/lib/runEconomy";

const wanted = new Set(process.argv.slice(2));
const packs = getAllScenarioPacks().filter((p) => wanted.size === 0 || wanted.has(p.patternId));
let total = 0;

for (const pack of packs) {
  const lines: string[] = [];
  const ids = new Set(pack.incidents.map((i) => i.id));
  let cascades = 0;
  let bills = 0;
  for (const inc of pack.incidents) {
    const problems: string[] = [];
    const wrong = inc.choices.filter((c) => !c.correct);
    const changes = wrong.some(
      (c) =>
        (c.graphPatch && graphChanged(inc.graphBefore, applyGraphPatch(inc.graphBefore, c.graphPatch))) ||
        (c.graphAfter && graphChanged(inc.graphBefore, c.graphAfter))
    );
    if (!changes) problems.push("no wrong choice changes the graph");
    for (const c of wrong) {
      if (c.graphPatch) {
        const unknown = unknownPatchNodes(inc.graphBefore, c.graphPatch);
        if (unknown.length) problems.push(`${c.id} patch names unknown nodes ${unknown.join(",")}`);
      }
    }
    const noCost = [...inc.choices, ...(inc.mitigation?.choices ?? [])].filter(
      (c) => typeof c.tradeoffs?.costMonthlyDelta !== "number"
    );
    if (noCost.length) problems.push(`no costMonthlyDelta on ${noCost.map((c) => c.id).join(",")}`);
    const correct = inc.choices.find((c) => c.correct);
    if ((correct?.tradeoffs?.costMonthlyDelta ?? 0) > creditBudgetFor(inc)) problems.push("correct fix exceeds creditBudget");
    for (const c of inc.choices) {
      const target = c.cascadeIncidentId ?? c.consequenceIncidentId;
      if (c.correct && c.cascadeIncidentId) cascades++;
      if (!c.correct && c.consequenceIncidentId) bills++;
      if (target) {
        const t = pack.incidents.find((i) => i.id === target);
        if (!ids.has(target)) problems.push(`${c.id} -> ${target} not in pack`);
        else if (!t?.isCascade) problems.push(`${c.id} -> ${target} is not isCascade`);
      }
    }
    problems.push(...formatProblems(inc));
    problems.push(...incidentQualityIssues(inc, pack).map((i) => `gate: ${i}`));
    if (problems.length) {
      total += problems.length;
      lines.push(`  ${inc.id} [${formatOf(inc)}${inc.isCascade ? ", cascade" : ""}]: ${problems.join("; ")}`);
    }
  }
  const nonPick = pack.incidents.filter((i) => !i.isCascade && formatOf(i) !== "pick").length;
  const first = getWarRoomIncident(pack.patternId, 0);
  const packProblems: string[] = [];
  if (cascades < 2) packProblems.push(`${cascades}/2 cascades`);
  if (bills < 1) packProblems.push("no delayed bill");
  if (nonPick < 2) packProblems.push(`${nonPick}/2 non-pick startable incidents`);
  total += packProblems.length;
  console.log(
    `\n== L${pack.level} ${pack.patternId}: first run ${first?.id} is "${first ? formatOf(first) : "?"}"` +
      (packProblems.length ? `  PACK: ${packProblems.join("; ")}` : "")
  );
  lines.forEach((l) => console.log(l));
}
console.log(`\n${total} problems.`);
