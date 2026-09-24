export interface SystemMetrics {
  cpuUsage: number; // 0 - 100%
  latencyMs: number;
  requestsPerSec: number;
  databaseHits: number;
  cacheHitRate: number; // 0 - 100%
  errorRate: number; // 0 - 100%
}

export interface SimulationState {
  hasLoadBalancer: boolean;
  hasCache: boolean;
  hasReadReplica: boolean;
  serverCount: number;
  userCount: number;
  isSimulating: boolean;
  metrics: SystemMetrics;
  alert?: {
    type: "warning" | "danger" | "success" | "info";
    message: string;
  };
}

export interface QuizOption {
  id: string;
  label: string;
  isCorrect: boolean;
  explanation: string;
}

export interface LessonChallenge {
  id: string;
  lessonId: string;
  title: string;
  scenario: string;
  question: string;
  options: QuizOption[];
  rewardXp: number;
  hints?: string[];
}

export interface Lesson {
  id: string;
  level: number;
  title: string;
  tagline: string;
  concept: string;
  description: string;
  iconName: string;
  estimatedMinutes: number;
  xpReward: number;
  learningObjectives: string[];
  initialMetrics: SystemMetrics;
  targetMetrics: SystemMetrics;
  challenge: LessonChallenge;
  steps: {
    title: string;
    description: string;
    actionLabel: string;
    actionType: "add_load_balancer" | "add_cache" | "add_replica" | "scale_servers";
  }[];
}

export interface UserStats {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streakDays: number;
  completedLessons: string[];
  completedChallenges: string[];
  completedGuided?: string[];
  completedInterviews?: string[];
  completedMissions?: string[];
  completedChapters?: string[];
  systemsSaved?: number;
  incidentsSolved?: number;
  isLoggedIn?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  totalScore: number;
  soundEnabled: boolean;
  unlockedBadges: string[];
}

export interface CampaignChapter {
  id: string;
  chapterNumber: number;
  title: string;
  tagline: string;
  concept: string;
  description: string;
  iconName: string;
  estimatedMinutes: number;
  xpReward: number;
  unlockLevel: number;
  scenario: string;
  initialMetrics: SystemMetrics;
  targetMetrics: SystemMetrics;
  problem: string;
  solutionNarrative: string;
  solutionActionType: "add_load_balancer" | "add_cache" | "add_replica" | "scale_servers" | "add_cdn";
  challenge: LessonChallenge;
}

export interface PushpaMissionStep {
  id: string;
  stepNumber: number;
  incidentTitle: string;
  problemStatement: string;
  affectedService: string;
  architectureNodes: {
    id: string;
    label: string;
    status: "healthy" | "warning" | "danger";
    metricLabel?: string;
  }[];
  initialMetrics: {
    cpu: number;
    latency: string;
    rps: string;
    statusText: string;
  };
  question: string;
  options: {
    id: string;
    title: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  stabilizedMetrics: {
    cpu: number;
    latency: string;
    statusText: string;
  };
  stabilizedNodes: {
    id: string;
    label: string;
    status: "healthy" | "warning";
    metricLabel?: string;
  }[];
  xpReward: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export type ArchitectureNodeType =
  | "client"
  | "load_balancer"
  | "server"
  | "cache"
  | "database"
  | "replica"
  | "cdn"
  | "queue";

export interface CustomNodeData {
  label: string;
  type: ArchitectureNodeType;
  status: "idle" | "healthy" | "warning" | "overloaded";
  cpu?: number;
  requestsHandled?: number;
  cacheHits?: number;
  onRemove?: () => void;
}

// Guided Thinking Mode Types
export interface GuidedStepRequirement {
  id: string;
  label: string;
  isCore: boolean;
}

export interface GuidedEntity {
  id: string;
  name: string;
  attributes: string[];
  isEssential: boolean;
}

export interface GuidedApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  isInitialCore: boolean;
}

export interface GuidedScenario {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  estimatedTime: string;
  xpReward: number;
  problemStatement: string;
  requirementsDiscovery: {
    question: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
    }[];
  };
  entitiesDiscovery: {
    instruction: string;
    availableEntities: GuidedEntity[];
    correctEntityIds: string[];
  };
  apiDesignDiscovery: {
    instruction: string;
    availableApis: GuidedApiEndpoint[];
    correctApiIds: string[];
  };
  architectureDiscovery: {
    instruction: string;
    requiredComponents: ArchitectureNodeType[];
    explanation: string;
  };
}

// Architecture Evolution Mode Types
export interface EvolutionStage {
  stage: number;
  title: string;
  userCountLabel: string;
  userCountNumeric: number;
  status: "healthy" | "warning" | "danger";
  statusBadge: string;
  description: string;
  painPoint?: string;
  solutionNarrative: string;
  components: {
    id: string;
    type: ArchitectureNodeType;
    label: string;
    subtitle?: string;
    status: "healthy" | "warning" | "overloaded";
    cpu?: number;
  }[];
  metrics: SystemMetrics;
}

// Mini Interview Mode Types
export interface InterviewProblem {
  id: string;
  title: string;
  difficulty: "Medium" | "Hard";
  durationMinutes: number;
  rewardXp: number;
  scenario: string;
  trafficScale: string;
  latencyConstraint: string;
  storageScale: string;
  hints: string[];
  checklist: {
    id: string;
    label: string;
    category: "functional" | "non_functional" | "reliability";
  }[];
  benchmarkArchitecture: {
    nodes: { id: string; label: string; type: ArchitectureNodeType }[];
    summary: string;
    spofVulnerabilitiesWithout: string[];
  };
}

