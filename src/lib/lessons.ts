import lessonsData from "@/data/lessons.json";
import { Lesson, LessonChallenge } from "@/types";

export const LESSONS: Lesson[] = lessonsData as Lesson[];

export function getLessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getAllLessons(): Lesson[] {
  return LESSONS;
}

export function getChallengeById(id: string): LessonChallenge | undefined {
  for (const lesson of LESSONS) {
    if (lesson.challenge && lesson.challenge.id === id) {
      return lesson.challenge;
    }
  }
  return undefined;
}

export const BADGES = [
  {
    id: "pushpa_first_responder",
    title: "Twitter Saver",
    description: "Stabilized Twitter feed under 100k req/s traffic in Pushpa Mode.",
    icon: "ShieldAlert",
  },
  {
    id: "first_node",
    title: "Traffic Controller",
    description: "Deployed your first Load Balancer and balanced live traffic.",
    icon: "Network",
  },
  {
    id: "cache_master",
    title: "Speed Demon",
    description: "Slashed database latency down to under 20ms using Redis.",
    icon: "Zap",
  },
  {
    id: "db_architect",
    title: "Cluster Engineer",
    description: "Configured Primary-Replica database replication.",
    icon: "Database",
  },
  {
    id: "challenge_hero",
    title: "Outage Hero",
    description: "Solved your first production outage triage challenge.",
    icon: "ShieldAlert",
  },
  {
    id: "system_thinker",
    title: "Guided Architect",
    description: "Mastered the 4-step framework from requirements to high-level architecture.",
    icon: "Compass",
  },
  {
    id: "interview_ace",
    title: "Interview Ready",
    description: "Successfully passed a timed 10-minute System Design technical interview simulation.",
    icon: "Award",
  },
  {
    id: "grandmaster",
    title: "System Design Ace",
    description: "Earned 500+ XP and built a fault-tolerant distributed system.",
    icon: "Crown",
  },
];

