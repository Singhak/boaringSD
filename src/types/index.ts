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
  /** @deprecated mock account fields, removed by the v3 migration */
  isLoggedIn?: boolean;
  /** @deprecated */
  userEmail?: string | null;
  /** @deprecated */
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
  // Measured results (schema v3) — these feed the competency radar
  estimationResults?: Record<string, EstimationResult>;
  interviewResults?: Record<string, InterviewResult>;
  reasoningResults?: Record<string, ReasoningResult>;
  defenseStats?: { attempts: number; firstTry: number };
}

export interface EstimationResult {
  best: number;
  last: number;
  attempts: number;
}

/** Pillar scores (0–100) from a mock interview; a pillar is omitted when the stage was skipped. */
export interface InterviewResult {
  scope?: number;
  math?: number;
  design?: number;
  deepDive?: number;
  total: number;
  at: string;
}

export interface ReasoningResult {
  score: number;
  /** True when the learner graded themselves because no grader was available. */
  selfAssessed: boolean;
  patternId?: PatternId;
  at: string;
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
  queueDepth?: number;
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
  scopeItems?: InterviewScopeItem[];
  estimationTargets?: InterviewEstimationTarget[];
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
  | "health-checks"
  | "cap-pacelc"
  | "consensus-quorums"
  | "storage-engines";

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
  /** Best "defend your call" score for this pattern (self-assessed counts half). */
  reasoningBest?: number;
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
  /** null when the run had no transfer question; only a first-try pass counts as a transfer pass. */
  transferFirstTry: boolean | null;
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
  /** Monthly cloud-credit budget; derived from a lean passing design when omitted. */
  budget?: number;
  /** Alternative valid designs (e.g. cache path vs queue path) that also pass. */
  acceptedArchetypes?: ArchitecturalArchetype[];
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
  consistencyGuarantee?: "strong" | "eventual" | "session" | "weak";
  tradeoffSummary?: string;
}

export interface IncidentChoice {
  id: string;
  label: string;
  correct: boolean;
  approach?: ApproachKind;
  tradeoffs?: TradeoffVector;
  conceptIntelId?: string;
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
  /** Rewritten to docs/content-style.md and passes the quality gate. */
  reviewed?: boolean;
  isCascade?: boolean;
  parentIncidentCode?: string;
  severity: "P0" | "P1" | "P2";
  xp: number;
  title: string;
  brief: string;
  constraint: string;
  question: string;
  conceptIntelId?: string;
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
  phase: "Foundation" | "Resilience" | "Mastery" | "Depth";
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

// ============================================================================
// Just-In-Time Concept Intel (Pillar 1)
// ============================================================================

export interface ConceptIntel {
  id: string;
  name: string;
  category: "caching" | "scaling" | "database" | "resilience" | "consistency" | "networking";
  oneLiner: string;
  eli5Analogy: {
    title: string;
    story: string;
  };
  visualFlow: string;
  whyItWorks: string;
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
  interviewPlaybook: {
    whenToUse: string;
    sampleDialogue: string;
  };
}

// ============================================================================
// Telemetry Inspector & Operational Knobs (Pillar 3)
// ============================================================================

export interface TelemetryLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "FATAL";
  source: string;
  message: string;
  durationMs?: number;
  highlight?: boolean;
}

export interface OperationalKnob {
  id: string;
  label: string;
  description: string;
  type: "slider" | "toggle" | "select";
  value: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: string }[];
}

export interface NodeTelemetry {
  nodeId: string;
  nodeName: string;
  role: ComponentKind;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL" | "IDLE";
  cpuUsage: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  activeConnections: number;
  maxConnections: number;
  workerThreadsUsed: number;
  workerThreadsTotal: number;
  p99LatencyMs: number;
  errorRate: number;
  logs: TelemetryLogEntry[];
  knobs: OperationalKnob[];
}

// ============================================================================
// 6-Axis Engineering Competency Mastery Radar (Pillar 6)
// ============================================================================

export type CompetencyArea =
  | "bottleneck_diagnosis"
  | "pattern_selection"
  | "capacity_estimation"
  | "tradeoff_defense"
  | "end_to_end_design"
  | "resilience_recovery";

export type CompetencyTier = "Novice" | "Proficient" | "Advanced" | "Staff Architect";

export interface CompetencyScore {
  area: CompetencyArea;
  label: string;
  score: number; // 0 to 100
  tier: CompetencyTier;
  /** Attempts measured for this axis. */
  evidencesCount: number;
  /** False while the axis has fewer than RADAR_MIN_SAMPLES attempts ("scouting"). */
  hasEnoughData: boolean;
  highlightTip: string;
}

export interface UserSkillRadar {
  scores: Record<CompetencyArea, CompetencyScore>;
  overallIndex: number; // 0 to 100
  strongestArea: CompetencyArea;
  growthArea: CompetencyArea;
}

// ============================================================================
// 4-Stage FAANG Mock Interview Arena (Pillar 1)
// ============================================================================

export type InterviewStage = "scope" | "math" | "design" | "deepdive" | "scorecard";

export interface InterviewScopeItem {
  id: string;
  label: string;
  category: "functional" | "non_functional" | "out_of_scope";
  isCore: boolean;
  explanation: string;
}

export interface InterviewEstimationTarget {
  id: string;
  prompt: string;
  parameterContext: string;
  canonicalAnswer: number;
  unit: string;
  magnitudeLabel: string; // e.g. "RPS", "TB/year", "GB RAM"
  tolerancePercent: number; // e.g. 25%
  stepByStepDerivation: string[];
  ruleOfThumbTip: string;
}

export interface InterviewStageScorecard {
  scopeScore: number;       // 0 - 25%
  estimationScore: number;  // 0 - 25%
  architectureScore: number;// 0 - 25%
  deepDiveScore: number;    // 0 - 25%
  overallScore: number;     // 0 - 100%
  tierRating: "Needs Improvement" | "Hire · Senior Engineer" | "Strong Hire · Staff Architect";
  detailedRubric: {
    stage: string;
    passed: boolean;
    strengths: string[];
    improvements: string[];
  }[];
}

// ============================================================================
// Multi-Attribute Tradeoff Cards & Architectural Defense (Pillars 2 & 3)
// ============================================================================

export interface TradeoffCardOption {
  id: string;
  title: string;
  tagline: string;
  patternId: string;
  costEstimateDeltaUsd: number;      // e.g. +450
  latencyProfileMs: number;          // e.g. -120ms
  operationalComplexity: 1 | 2 | 3 | 4 | 5; // 1 = Low, 5 = Extreme
  // "Not applicable" is for stateless components (e.g. a load balancer) that store no data.
  consistencyGuarantee: "Strict ACID" | "Eventual Consistency" | "Read-Your-Writes" | "Not applicable (stateless)";
  durabilityTier: "Ephemeral (RAM)" | "Durable SSD" | "Multi-Region Distributed" | "Not applicable (stateless)";
  pros: string[];
  cons: string[];
  isRecommendedForConstraints: boolean;
  tradeoffDefenseQuestion: {
    question: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
    }[];
  };
  stressTest10xQuestion: {
    question: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
    }[];
  };
}

// ============================================================================
// Multi-Path Production Boss Fights (Pillar 5)
// ============================================================================

export interface ArchitecturalArchetype {
  id: string;
  name: string;
  description: string;
  requiredComponents: ArchitectureNodeType[];
  optionalComponents?: ArchitectureNodeType[];
  forbiddenComponents?: ArchitectureNodeType[];
  maxLatencyP99Ms: number;
  maxMonthlyCostUsd: number;
  tradeoffSummary: string;
}
