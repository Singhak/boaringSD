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

export interface ConceptReveal {
  title: string;
  principle: string;
  tradeoff: string;
  takeaway: string;
}

const CONCEPT_REVEALS: Record<string, ConceptReveal> = {
  "load-balancer": {
    title: "Traffic Distribution",
    principle:
      "A load balancer spreads incoming requests across healthy backend servers so no single machine becomes the bottleneck under traffic spikes.",
    tradeoff:
      "You gain better availability and utilization, but you also add a network entry point that must be monitored and kept healthy.",
    takeaway:
      "When a single app server is saturated, distribute traffic before adding more layers of complexity.",
  },
  cache: {
    title: "Cache as a Read Optimization Layer",
    principle:
      "Caching stores repeated data in memory so the system avoids hitting the database for the same read-heavy workloads over and over.",
    tradeoff:
      "You gain huge latency reductions and lower database pressure, but stale cache entries must be invalidated carefully to avoid serving outdated data.",
    takeaway:
      "Use caching for hot, repeated reads when the cost of a database hit is much higher than the risk of temporary staleness.",
  },
  "database-scaling": {
    title: "Read Replication",
    principle:
      "A primary database handles writes while read replicas serve the majority of read-heavy traffic, reducing pressure on the write path.",
    tradeoff:
      "This improves throughput and resilience, but replicas can lag behind the primary and must be treated as eventually consistent for some workloads.",
    takeaway:
      "When a workload is mostly read-heavy, replicate the read path so the primary stays fast and reliable.",
  },
};

export function getConceptReveal(lessonId: string): ConceptReveal {
  const lesson = getLessonById(lessonId);
  const conceptTitle = lesson?.concept ?? "System Design Thinking";
  const reveal = CONCEPT_REVEALS[lessonId];

  if (reveal) {
    return reveal;
  }

  return {
    title: conceptTitle,
    principle: `The key idea behind ${conceptTitle.toLowerCase()} is to reduce the bottleneck without sacrificing reliability or observability.`,
    tradeoff:
      "Every architecture choice introduces a tradeoff between throughput, simplicity, consistency, and operational cost.",
    takeaway: `Use ${conceptTitle.toLowerCase()} when the real bottleneck is recurring load or repeated work, and the design must scale predictably under pressure.`,
  };
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

