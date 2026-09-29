import { Award, Calculator, Compass, Flag, Sparkles, type LucideIcon } from "lucide-react";
import { getFeatureUnlockStatus } from "@/lib/storage";
import type { UserStats } from "@/types";

export type LabId = "builder" | "interview" | "caseStudies" | "journey" | "estimation";

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
      unlockHint: "Unlocks after Level 2",
    },
    {
      id: "interview",
      name: "Interview Arena",
      hint: "Timed design practice",
      desc: "Design a system against the pager countdown and get graded pillar by pillar.",
      href: "/interview",
      icon: Award,
      unlocked: unlock.interview.unlocked,
      unlockHint: "Unlocks after Level 8",
    },
    {
      id: "caseStudies",
      name: "Case Studies",
      hint: "Requirements → APIs → design",
      desc: "Classic products (TinyURL, WhatsApp, Uber…) one design step at a time.",
      href: "/guided",
      icon: Compass,
      unlocked: unlock.challengeLab.unlocked,
      unlockHint: "Unlocks after Level 3",
    },
    {
      id: "journey",
      name: "Scale Journey",
      hint: "Weekly boss",
      desc: "Grow one system from a front-page spike to 10M users, with a new twist every week.",
      href: "/journey",
      icon: Flag,
      unlocked: unlock.journey.unlocked,
      unlockHint: "Unlocks after Level 5",
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
