/**
 * Content-gate report for scenario packs.
 *   npx tsx scripts/check-packs.ts                 # every pack
 *   npx tsx scripts/check-packs.ts caching cdn-edge
 */
import { getAllScenarioPacks } from "@/data/scenarioPacks";
import { TROPE_LABEL, incidentQualityIssues, packQualityIssues } from "@/data/incidentQuality";
import { correctIsLongest, correctLengthRank, lengthRatio, MAX_CORRECT_IS_LONGEST_SHARE } from "@/lib/optionLint";

const wanted = new Set(process.argv.slice(2));
const packs = getAllScenarioPacks().filter((p) => wanted.size === 0 || wanted.has(p.patternId));

let failing = 0;
let longest = 0;
let total = 0;
let ratioSum = 0;
const ranks = { shortest: 0, middle: 0, longest: 0 };
for (const pack of packs) {
  console.log(`\n== ${pack.patternId} (${pack.incidents.length} incidents)`);
  for (const inc of pack.incidents) {
    const issues = incidentQualityIssues(inc, pack);
    const q = { id: inc.id, options: inc.choices.map((c) => ({ text: c.label, correct: c.correct })) };
    const isLongest = correctIsLongest(q);
    total++;
    ratioSum += lengthRatio(q) ?? 1;
    if (isLongest) longest++;
    const rank = correctLengthRank(q);
    if (rank) ranks[rank]++;
    if (issues.length > 0) {
      failing++;
      const lens = inc.choices.map((c) => `${c.correct ? "*" : ""}${c.label.length}`).join("/");
      console.log(`  FAIL ${inc.id} [${issues.join(", ")}] lengths ${lens}`);
    }
  }
  const tropes = pack.incidents.flatMap((i) => i.choices).filter((c) => TROPE_LABEL.test(c.label));
  const packIssues = packQualityIssues(pack);
  console.log(
    `  tropes: ${tropes.length} (${tropes.filter((c) => c.correct).length} correct)` +
      (packIssues.length ? `  PACK FAIL [${packIssues.join(", ")}]` : "")
  );
}
console.log(
  `\n${failing} failing incidents. Correct is longest in ${longest}/${total} (${((longest / total) * 100).toFixed(0)}%, ` +
    `target <= ${MAX_CORRECT_IS_LONGEST_SHARE * 100}%). Avg length ratio ${(ratioSum / total).toFixed(2)}x (target <= 1.1x).
` +
    `Correct by length rank: shortest ${ranks.shortest}, middle ${ranks.middle}, longest ${ranks.longest} ` +
    `(each must be <= 50% of ${total}; aim for roughly a third each).`
);
