import { Award, Calculator, Compass, GitBranch, Sparkles, type LucideIcon } from "lucide-react";
import { getFeatureUnlockStatus } from "@/lib/storage";
import type { UserStats } from "@/types";

export type LabId = "builder" | "interview" | "caseStudies" | "evolution" | "estimation";

export interface PracticeLab {
  id: LabId;
  name: string;
  /** Short line for menus. */
  hint: string;
  /** Longer line for dashboard cards. */
  desc: string;
  href: string;
  icon: LucideIcon;
  unlocked: boolean;
  /** Shown while locked, e.g. "Unlocks at Level 2". */
  unlockHint: string;
}

/** The practice modes beside the level campaign. One source for the navbar, dashboard and page gates. */
export function getPracticeLabs(stats: UserStats): PracticeLab[] {
  const unlock = getFeatureUnlockStatus(stats);
  return [
    {
      id: "builder",
      name: "Architecture Sandbox",
      hint: "Build and break anything",
      desc: "Build any topology, change traffic, and watch what breaks.",
      href: "/builder",
      icon: Sparkles,
      unlocked: unlock.builder.unlocked,
      unlockHint: "Unlocks after Level 1",
    },
    {
      id: "interview",
      name: "Interview Arena",
      hint: "Timed design practice",
      desc: "Design a system against the pager countdown and get graded pillar by pillar.",
      href: "/interview",
      icon: Award,
      unlocked: unlock.interview.unlocked,
      unlockHint: "Unlocks after Level 1",
    },
    {
      id: "caseStudies",
      name: "Case Studies",
      hint: "Requirements → APIs → design",
      desc: "Classic products (TinyURL, WhatsApp, Uber…) one design step at a time.",
      href: "/guided",
      icon: Compass,
      unlocked: unlock.challengeLab.unlocked,
      unlockHint: "Unlocks after Level 2",
    },
    {
      id: "evolution",
      name: "Architecture Evolution",
      hint: "How systems grow",
      desc: "See how one architecture changes from 100 to 10M users.",
      href: "/evolution",
      icon: GitBranch,
      unlocked: true,
      unlockHint: "",
    },
    {
      id: "estimation",
      name: "Estimation Gym",
      hint: "Back-of-the-envelope drills",
      desc: "QPS, storage and cache sizing drills, plus 60-second speed sprints.",
      href: "/math",
      icon: Calculator,
      unlocked: true,
      unlockHint: "",
    },
  ];
}
