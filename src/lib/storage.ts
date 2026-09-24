import { UserStats } from "@/types";

const STORAGE_KEY = "sd_quest_user_stats_v1";

const DEFAULT_STATS: UserStats = {
  level: 1,
  currentXp: 0,
  nextLevelXp: 150,
  streakDays: 1,
  completedLessons: [],
  completedChallenges: [],
  completedGuided: [],
  completedInterviews: [],
  completedMissions: [],
  completedChapters: [],
  systemsSaved: 0,
  incidentsSolved: 0,
  isLoggedIn: false,
  userEmail: null,
  userName: null,
  totalScore: 0,
  soundEnabled: true,
  unlockedBadges: [],
};

export function getUserStats(): UserStats {
  if (typeof window === "undefined") {
    return DEFAULT_STATS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new Event("sd_quest_stats_updated"));
    
    // Asynchronously sync with DB API
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stats),
    }).catch(() => {
      // Quiet fallback if offline or in development
    });
  } catch (err) {
    console.error("Failed to save user stats:", err);
  }
}

export function addXp(amount: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const newXp = current.currentXp + amount;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const updated: UserStats = {
    ...current,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp: nextLevelXp,
    totalScore: current.totalScore + amount,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function completeLesson(lessonId: string, xpReward: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const alreadyCompleted = current.completedLessons.includes(lessonId);
  const updatedLessons = alreadyCompleted
    ? current.completedLessons
    : [...current.completedLessons, lessonId];

  // Award XP if not previously completed
  const xpToAdd = alreadyCompleted ? Math.floor(xpReward * 0.2) : xpReward;
  const newXp = current.currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const newBadges = [...current.unlockedBadges];
  if (lessonId === "load-balancer" && !newBadges.includes("first_node")) {
    newBadges.push("first_node");
  }
  if (lessonId === "cache" && !newBadges.includes("cache_master")) {
    newBadges.push("cache_master");
  }
  if (lessonId === "database-scaling" && !newBadges.includes("db_architect")) {
    newBadges.push("db_architect");
  }
  if (newXp >= 500 && !newBadges.includes("grandmaster")) {
    newBadges.push("grandmaster");
  }

  const updated: UserStats = {
    ...current,
    completedLessons: updatedLessons,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp,
    unlockedBadges: newBadges,
    totalScore: current.totalScore + xpToAdd,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function completeChallenge(challengeId: string, rewardXp: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const alreadyCompleted = current.completedChallenges.includes(challengeId);
  const updatedChallenges = alreadyCompleted
    ? current.completedChallenges
    : [...current.completedChallenges, challengeId];

  const xpToAdd = alreadyCompleted ? 20 : rewardXp;
  const newXp = current.currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const newBadges = [...current.unlockedBadges];
  if (!newBadges.includes("challenge_hero")) {
    newBadges.push("challenge_hero");
  }

  const updated: UserStats = {
    ...current,
    completedChallenges: updatedChallenges,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp,
    unlockedBadges: newBadges,
    totalScore: current.totalScore + xpToAdd,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function completeGuided(scenarioId: string, rewardXp: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const completedGuided = current.completedGuided || [];
  const alreadyCompleted = completedGuided.includes(scenarioId);
  const updatedGuided = alreadyCompleted
    ? completedGuided
    : [...completedGuided, scenarioId];

  const xpToAdd = alreadyCompleted ? 25 : rewardXp;
  const newXp = current.currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const newBadges = [...current.unlockedBadges];
  if (!newBadges.includes("system_thinker")) {
    newBadges.push("system_thinker");
  }

  const updated: UserStats = {
    ...current,
    completedGuided: updatedGuided,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp,
    unlockedBadges: newBadges,
    totalScore: current.totalScore + xpToAdd,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function completeInterview(interviewId: string, rewardXp: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const completedInterviews = current.completedInterviews || [];
  const alreadyCompleted = completedInterviews.includes(interviewId);
  const updatedInterviews = alreadyCompleted
    ? completedInterviews
    : [...completedInterviews, interviewId];

  const xpToAdd = alreadyCompleted ? 30 : rewardXp;
  const newXp = current.currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const newBadges = [...current.unlockedBadges];
  if (!newBadges.includes("interview_ace")) {
    newBadges.push("interview_ace");
  }

  const updated: UserStats = {
    ...current,
    completedInterviews: updatedInterviews,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp,
    unlockedBadges: newBadges,
    totalScore: current.totalScore + xpToAdd,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function recordMissionComplete(missionId: string, xpReward: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const missions = current.completedMissions || [];
  const alreadyDone = missions.includes(missionId);
  const updatedMissions = alreadyDone ? missions : [...missions, missionId];
  const xpToAdd = alreadyDone ? 15 : xpReward;
  const newXp = current.currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const newBadges = [...current.unlockedBadges];
  if (!newBadges.includes("pushpa_first_responder")) {
    newBadges.push("pushpa_first_responder");
  }

  const updated: UserStats = {
    ...current,
    completedMissions: updatedMissions,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp,
    systemsSaved: (current.systemsSaved || 0) + (alreadyDone ? 0 : 1),
    incidentsSolved: (current.incidentsSolved || 0) + (alreadyDone ? 0 : 1),
    unlockedBadges: newBadges,
    totalScore: current.totalScore + xpToAdd,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function recordChapterComplete(chapterId: string, xpReward: number): { stats: UserStats; leveledUp: boolean } {
  const current = getUserStats();
  const chapters = current.completedChapters || [];
  const alreadyDone = chapters.includes(chapterId);
  const updatedChapters = alreadyDone ? chapters : [...chapters, chapterId];
  const xpToAdd = alreadyDone ? 20 : xpReward;
  const newXp = current.currentXp + xpToAdd;
  const newLevel = Math.floor(newXp / 150) + 1;
  const nextLevelXp = newLevel * 150;
  const leveledUp = newLevel > current.level;

  const updated: UserStats = {
    ...current,
    completedChapters: updatedChapters,
    currentXp: newXp,
    level: newLevel,
    nextLevelXp,
    totalScore: current.totalScore + xpToAdd,
  };

  saveUserStats(updated);
  return { stats: updated, leveledUp };
}

export function loginUser(email: string, name: string): UserStats {
  const current = getUserStats();
  const updated: UserStats = {
    ...current,
    isLoggedIn: true,
    userEmail: email,
    userName: name,
  };
  saveUserStats(updated);
  return updated;
}

export function logoutUser(): UserStats {
  const current = getUserStats();
  const updated: UserStats = {
    ...current,
    isLoggedIn: false,
    userEmail: null,
    userName: null,
  };
  saveUserStats(updated);
  return updated;
}

export function getFeatureUnlockStatus(stats: UserStats) {
  const level = stats.level || 1;
  const chapters = stats.completedChapters || [];
  const missions = stats.completedMissions || [];
  const isExperienced = level >= 2 || chapters.length >= 1 || missions.length >= 2;

  return {
    campaign: { unlocked: true, minLevel: 1, label: "Campaign" },
    builder: { unlocked: isExperienced, minLevel: 2, label: "Architecture Sandbox" },
    interview: { unlocked: isExperienced, minLevel: 2, label: "Interview Arena" },
    challengeLab: { unlocked: level >= 3 || chapters.length >= 2, minLevel: 3, label: "Challenge Lab" },
  };
}

