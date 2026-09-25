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
  // Pattern Mastery Game (schema v2)
  schemaVersion?: number;
  patternProgress?: Partial<Record<PatternId, PatternEvidence>>;
  awardedEvents?: string[]; // idempotency keys for rewards
  lastPracticeDate?: string; // YYYY-MM-DD of last meaningful practice
  practiceDays?: string[]; // recent YYYY-MM-DD practice days
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
  down?: boolean; // killed by failure injection
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

export interface InterviewFollowUp {
  id: string;
  interviewerPrompt: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

export interface InterviewProblem {
  id: string;
  title: string;
  tier: "Tier 1: Beginner" | "Tier 2: Intermediate" | "Tier 3: Advanced" | "Tier 4: Staff";
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Staff" | "Medium" | "Hard";
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
  followUpQuestions?: InterviewFollowUp[];
  requiredDesign?: {
    needsLB?: boolean;
    minServers?: number;
    needsCache?: boolean;
    needsDatabase?: boolean;
    needsReplica?: boolean;
    needsCDN?: boolean;
    needsQueue?: boolean;
    rationale?: Record<string, string>;
  };
}


// ============================================================================
// Pattern Mastery Game Types
// ============================================================================

export interface ReplayVariant {
  variantId: string;
  label: string;
  scenario: string;
  constraint: string;
  expectedFix: string;
}

export type PatternId =
  | "horizontal-scaling"
  | "load-balancing"
  | "read-replicas"
  | "caching"
  | "cdn-edge"
  | "async-queues"
  | "sharding"
  | "consistency"
  | "rate-limiting"
  | "circuit-breaker"
  | "connection-pooling"
  | "backpressure"
  | "idempotency"
  | "multi-region"
  | "health-checks";

/**
 * Honest progress labels. A pattern is never "mastered" after one activity:
 * Reliable requires application, transfer, a builder pass, and a later recall.
 */
export type MasteryState =
  | "unseen"
  | "introduced"
  | "applied_once"
  | "passed_transfer"
  | "reliable"
  | "needs_review";

export type RunStage = "observe" | "diagnose" | "choose" | "counter" | "transfer" | "result";

export interface PatternQuestion {
  question: string;
  options: QuizOption[];
}

export interface PatternObjective {
  id: string;
  stage: RunStage;
  label: string;
}

export interface SystemDesignPattern {
  id: PatternId;
  levelNumber: number;
  title: string;
  levelGoal: string; // e.g. "survive overload"
  chapterId: string;
  lessonId?: string;
  prerequisites: PatternId[];
  inherits: PatternId[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
  skillTags: string[];
  newConstraint: string;
  objectives: PatternObjective[];
  diagnosis: PatternQuestion;
  intervention: PatternQuestion;
  transfer: PatternQuestion;
  review: PatternQuestion;
  tradeoff: {
    whatFailed: string;
    whyFixWorked: string;
    insufficientWhen: string;
  };
  builderScenarioId: string;
  rewards: {
    firstClearXp: number;
    replayXp: number;
    builderXp: number;
    reviewXp: number;
  };
  nextHook: string;
  replayFamily?: ReplayVariant[];
}

export interface PatternEvidence {
  runsStarted: number;
  applied: number; // times the correct fix was deployed in a run
  runsCleared: number;
  diagnosisFirstTry: number;
  interventionFirstTry: number;
  transferAttempts: number;
  transferPasses: number;
  builderAttempts: number;
  builderPasses: number;
  hintsUsed: number;
  reviewsPassed: number;
  reviewsFailed: number;
  reviewStage: number; // 0..3 → next review at 1, 3, 7 days
  scenariosPassed: string[];
  failureReasons: string[];
  firstClearedAt?: string;
  lastPracticedAt?: string;
  reviewDueAt?: string;
}

export interface PatternRunResult {
  patternId: PatternId;
  diagnosisFirstTry: boolean;
  interventionFirstTry: boolean;
  transferFirstTry: boolean;
  hintsUsed: number;
  failureReasons: string[];
}

export interface BuilderScenario {
  id: string;
  patternId: PatternId;
  title: string;
  userScale: string;
  trafficRps: number;
  trafficPattern: string;
  failureCondition: string;
  objective: string;
  winCondition: string;
  readRatio: number; // share of traffic that is reads
  cacheHitRate: number; // hit rate a cache achieves for this workload
  staticAssetShare: number; // share of traffic a CDN can serve at the edge
  globalUsers: boolean;
  slowDownstream: boolean;
  killOneServer: boolean;
  targets: {
    maxServerCpu: number;
    maxDbCpu?: number;
    maxLatencyMs?: number;
    minServers?: number;
  };
  requiredComponents: ArchitectureNodeType[];
  inheritsFrom?: string;
  startingNodes: { id: string; label: string; type: ArchitectureNodeType; x: number; y: number }[];
  startingEdges: { source: string; target: string }[];
  explain: PatternQuestion;
  hints: [string, string, string]; // question → concept → component
  passThreshold: number;
}

export interface RunProgress {
  chapterId: string;
  stage: RunStage;
  diagnosisAttempts: number;
  interventionAttempts: number;
  counterAttempts: number;
  transferAttempts: number;
  hintsUsed: number;
  failureReasons: string[];
  updatedAt: string;
}

// ============================================================================
// Incident Schema v2 Types (Playable, Simulation-driven Game Loop)
// ============================================================================

export type SystemTone = "good" | "bad" | "warn" | "neutral";

export type ComponentKind =
  | "users"
  | "server"
  | "lb"
  | "cache"
  | "db"
  | "replica"
  | "cdn"
  | "queue"
  | "worker"
  | "gpu";

export interface IncidentMetric {
  key: "rps" | "cpu" | "p95" | "errors" | string;
  label?: string;
  value: number;
  unit?: string;
  tone: SystemTone;
}

export interface IncidentNode {
  id: string;
  kind: ComponentKind;
  label: string;
  tone?: SystemTone;
  cpu?: number;
  sub?: string;
}

export interface IncidentEdge {
  from: string;
  to: string;
}

export interface IncidentGraph {
  nodes: IncidentNode[];
  edges: IncidentEdge[];
}

export type ApproachKind = "optimal" | "viable_with_tradeoffs" | "anti_pattern";

export interface TradeoffVector {
  costMonthlyDelta?: number;
  latencyP99DeltaMs?: number;
  complexityScore?: 1 | 2 | 3 | 4 | 5;
  consistencyGuarantee?: "strong" | "eventual" | "session";
  tradeoffSummary?: string;
}

export interface IncidentChoice {
  id: string;
  label: string;
  correct: boolean;
  approach?: ApproachKind;
  tradeoffs?: TradeoffVector;
  cascadeIncidentId?: string;
  cascadeDelayMs?: number;
  retry?: boolean;
  resultTitle: string;
  resultBody: string;
  nextId?: string;
  metricsAfter?: IncidentMetric[];
  graphAfter?: IncidentGraph;
}

export interface IncidentV2 {
  id: string;
  incidentCode: string;
  level: number;
  patternId: string;
  canonical?: boolean;
  isCascade?: boolean;
  parentIncidentCode?: string;
  severity: "P0" | "P1" | "P2";
  xp: number;
  title: string;
  brief: string;
  constraint: string;
  question: string;
  metricsBefore: IncidentMetric[];
  graphBefore: IncidentGraph;
  choices: IncidentChoice[];
  hints: string[];
  nextId?: string;
}

export interface IncidentPackV2 {
  version: number;
  patternId: string;
  patternName: string;
  level: number;
  phase: "Foundation" | "Resilience" | "Mastery";
  canonicalId: string;
  nextCanonicalId?: string | null;
  incidents: IncidentV2[];
  variants: {
    id: string;
    title: string;
    context: string;
    constraint: string;
    question: string;
    expectedPattern: string;
    wrongChoices: string[];
  }[];
}


