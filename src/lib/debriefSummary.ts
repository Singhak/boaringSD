export interface DebriefInput {
  /** XP each solved incident actually awarded (0 on a same-day replay). */
  incidentXp: number[];
  /** XP the pattern run itself awarded. */
  runXp: number;
  /** Aftershock (transfer) answered right on the first try. */
  transferFirstTry: boolean;
}

export interface DebriefSummary {
  xpAwarded: number;
  xpLabel: string;
  /** Shown next to the XP when nothing was paid. */
  xpNote: string | null;
  masteryVerified: boolean;
  masteryTitle: string;
  masteryBody: string;
}

/** What the campaign debrief shows: the XP really paid, and mastery only when it was earned. */
export function buildDebriefSummary({ incidentXp, runXp, transferFirstTry }: DebriefInput): DebriefSummary {
  const xpAwarded = incidentXp.reduce((a, b) => a + b, 0) + runXp;
  return {
    xpAwarded,
    xpLabel: `+${xpAwarded} XP`,
    xpNote: xpAwarded === 0 ? "Replay XP resets tomorrow" : null,
    masteryVerified: transferFirstTry,
    masteryTitle: transferFirstTry ? "Mastery Verified" : "Progress saved",
    masteryBody: transferFirstTry
      ? "You fixed the outage and solved the aftershock on the first try."
      : "The aftershock took more than one try, so this run doesn't verify mastery yet. Replay the level to prove it.",
  };
}
