import { scoreEstimate } from "@/lib/estimation";

export type MathCategory =
  | "qps"
  | "storage"
  | "bandwidth"
  | "cache_ram"
  | "shard_count"
  | "replica_count"
  | "availability"
  | "cost";

export type MathDifficulty = "beginner" | "intermediate" | "advanced";

export interface MathProblem {
  id: string;
  templateId?: string;
  title: string;
  category: MathCategory;
  difficulty: MathDifficulty;
  prompt: string;
  scenarioContext: string;
  parameters: {
    label: string;
    value: string;
  }[];
  canonicalAnswer: number;
  unit: string;
  magnitudeLabel: string; // e.g., "RPS", "TB/year", "GB RAM", "minutes/year", "Shards", "Replicas"
  stepByStepDerivation: string[];
  ruleOfThumbTip: string;
}

export interface MathEvaluationResult {
  score: number; // 0 to 100
  grade: "perfect" | "acceptable" | "order_of_magnitude" | "incorrect";
  userAnswer: number;
  canonicalAnswer: number;
  percentageError: number;
  feedback: string;
}

/**
 * Ratio-based scoring for back-of-the-envelope estimates: interviews reward
 * order-of-magnitude intuition, not calculator precision.
 */
export function evaluateMathAnswer(problem: MathProblem, userAnswer: number): MathEvaluationResult {
  const target = problem.canonicalAnswer;
  const { score, grade, factor, percentageError } = scoreEstimate(userAnswer, target);
  const base = { score, grade, userAnswer, canonicalAnswer: target, percentageError };

  if (!Number.isFinite(userAnswer) || userAnswer <= 0) {
    return { ...base, feedback: "Answer must be a positive number (shorthand like 12k or 1.5M works)." };
  }
  switch (grade) {
    case "perfect":
      return {
        ...base,
        feedback: `Outstanding precision! Your estimate of ${userAnswer.toLocaleString()} ${problem.magnitudeLabel} matches the canonical figure (${target.toLocaleString()} ${problem.magnitudeLabel}).`,
      };
    case "acceptable":
      return {
        ...base,
        feedback: `Solid estimate (${percentageError}% off). In an interview this sanity check passes with full credit.`,
      };
    case "order_of_magnitude":
      return {
        ...base,
        feedback: `Right ballpark, but ${factor.toFixed(1)}x off. Check your conversion factors (e.g. 86,400 seconds/day).`,
      };
    default:
      return {
        ...base,
        feedback: `Off by a factor of ${factor.toFixed(1)} (${userAnswer < target ? "too low" : "too high"}). Revisit the unit conversions.`,
      };
  }
}

// ---------------------------------------------------------------------------
// Dynamic Problem Generator Templates (Phase 5.5)
// ---------------------------------------------------------------------------

export interface MathTemplate {
  templateId: string;
  title: string;
  category: MathCategory;
  difficulty: MathDifficulty;
  scenarioContext: string;
  generate: (seed: number) => MathProblem;
}

export const MATH_TEMPLATES: MathTemplate[] = [
  // 1. QPS: DAU to Average QPS
  {
    templateId: "tpl-dau-qps",
    title: "Daily Active Users to Average QPS",
    category: "qps",
    difficulty: "beginner",
    scenarioContext: "Standard interview opener for Twitter, Threads, or Instagram feed design.",
    generate: (seed: number) => {
      const dauChoices = [50_000_000, 100_000_000, 200_000_000, 400_000_000];
      const actionsChoices = [10, 20, 25, 40];
      const dau = dauChoices[Math.abs(seed) % dauChoices.length];
      const actions = actionsChoices[Math.abs(Math.floor(seed / 7)) % actionsChoices.length];
      const dauMillions = dau / 1_000_000;
      const totalDaily = dau * actions;
      const qps = Math.round(totalDaily / 86_400);

      return {
        id: `math-dau-qps-${dauMillions}m-${actions}`,
        templateId: "tpl-dau-qps",
        title: "Daily Active Users to Average QPS",
        category: "qps",
        difficulty: "beginner",
        prompt: `A social platform has ${dauMillions} Million Daily Active Users (DAU). Each user performs an average of ${actions} API requests per day. What is the average Queries Per Second (QPS)?`,
        scenarioContext: "Standard interview opener for Twitter, Threads, or Instagram feed design.",
        parameters: [
          { label: "Daily Active Users", value: `${dau.toLocaleString()} (${dauMillions}M)` },
          { label: "Requests per User/Day", value: `${actions}` },
          { label: "Seconds in a Day", value: "86,400 (approx. 100,000)" },
        ],
        canonicalAnswer: qps,
        unit: "requests/sec",
        magnitudeLabel: "RPS",
        stepByStepDerivation: [
          `Total daily requests = ${dau.toLocaleString()} × ${actions} = ${(totalDaily / 1_000_000_000).toFixed(1)} Billion req/day`,
          `Exact: ${totalDaily.toLocaleString()} ÷ 86,400 ≈ ${qps.toLocaleString()} RPS`,
          `Rule-of-Thumb Shortcut: ${totalDaily.toLocaleString()} ÷ 100,000 = ${Math.round(totalDaily / 100_000).toLocaleString()} RPS`,
        ],
        ruleOfThumbTip: `1 Million requests/day ≈ 11.6 RPS (round to 12 RPS). So ${(totalDaily / 1_000_000).toLocaleString()} Million ≈ ${Math.round((totalDaily / 1_000_000) * 11.6).toLocaleString()} RPS.`,
      };
    },
  },

  // 2. QPS: Peak Multiplier
  {
    templateId: "tpl-peak-qps",
    title: "Flash Sale Peak QPS Multiplier",
    category: "qps",
    difficulty: "beginner",
    scenarioContext: "High-traffic retail event planning (Amazon Prime Day, Alibaba 11.11).",
    generate: (seed: number) => {
      const avgChoices = [20_000, 40_000, 60_000, 80_000];
      const multChoices = [2.5, 3.0, 3.5, 4.0];
      const avg = avgChoices[Math.abs(seed) % avgChoices.length];
      const mult = multChoices[Math.abs(Math.floor(seed / 5)) % multChoices.length];
      const peak = Math.round(avg * mult);

      return {
        id: `math-peak-qps-${avg}-${mult}x`,
        templateId: "tpl-peak-qps",
        title: "Flash Sale Peak QPS Multiplier",
        category: "qps",
        difficulty: "beginner",
        prompt: `An e-commerce service runs at an average of ${avg.toLocaleString()} QPS. During a flash sale, traffic spikes by ${mult}×. What peak QPS must the ingress load balancer be provisioned to handle?`,
        scenarioContext: "High-traffic retail event planning (Amazon Prime Day, Alibaba 11.11).",
        parameters: [
          { label: "Average QPS", value: `${avg.toLocaleString()} RPS` },
          { label: "Peak Multiplier", value: `${mult}×` },
        ],
        canonicalAnswer: peak,
        unit: "requests/sec",
        magnitudeLabel: "Peak RPS",
        stepByStepDerivation: [
          `Peak QPS = Average QPS × Peak Factor`,
          `${avg.toLocaleString()} × ${mult} = ${peak.toLocaleString()} RPS`,
        ],
        ruleOfThumbTip: "Always design for 2.5× to 4× of average traffic to handle diurnal peaks and sudden promotional flash events.",
      };
    },
  },

  // 3. Storage: Yearly Projection
  {
    templateId: "tpl-storage-yearly",
    title: "Multi-Year Database Storage Projection",
    category: "storage",
    difficulty: "intermediate",
    scenarioContext: "Database capacity planning for write-heavy services (TinyURL, Message Store).",
    generate: (seed: number) => {
      const monthlyChoices = [50_000_000, 100_000_000, 200_000_000];
      const bytesChoices = [400, 500, 600, 800];
      const yearsChoices = [3, 5];
      const monthly = monthlyChoices[Math.abs(seed) % monthlyChoices.length];
      const bytes = bytesChoices[Math.abs(Math.floor(seed / 3)) % bytesChoices.length];
      const years = yearsChoices[Math.abs(Math.floor(seed / 7)) % yearsChoices.length];
      const monthlyM = monthly / 1_000_000;
      const totalRecords = monthly * 12 * years;
      const totalBytes = totalRecords * bytes;
      const tb = Math.round((totalBytes / 1_000_000_000_000) * 10) / 10;

      return {
        id: `math-storage-${monthlyM}m-${bytes}b-${years}y`,
        templateId: "tpl-storage-yearly",
        title: `${years}-Year Disk Storage Projection`,
        category: "storage",
        difficulty: "intermediate",
        prompt: `A service generates ${monthlyM} Million new records per month. Each database row totals ${bytes} bytes. How many Terabytes (TB) of persistent database storage will be needed over ${years} years?`,
        scenarioContext: "Database capacity planning for write-heavy services.",
        parameters: [
          { label: "New Records / Month", value: `${monthlyM}M (${monthly.toLocaleString()})` },
          { label: "Record Size", value: `${bytes} Bytes` },
          { label: "Timeframe", value: `${years} Years (${years * 12} Months)` },
        ],
        canonicalAnswer: tb,
        unit: "TB",
        magnitudeLabel: "TB",
        stepByStepDerivation: [
          `Total records over ${years} years = ${monthlyM}M/mo × ${years * 12} mo = ${(totalRecords / 1_000_000_000).toFixed(1)} Billion records`,
          `Total raw storage = ${totalRecords.toLocaleString()} × ${bytes} Bytes = ${totalBytes.toLocaleString()} Bytes`,
          `Convert to TB: ${totalBytes.toLocaleString()} ÷ 10^12 = ${tb} TB`,
        ],
        ruleOfThumbTip: `${monthlyM}M records of ${bytes}B = ${(monthlyM * bytes) / 1000} GB/mo × ${years * 12} mo = ${tb} TB.`,
      };
    },
  },

  // 4. Bandwidth: Video Streaming Egress
  {
    templateId: "tpl-bandwidth-video",
    title: "Video Streaming Egress Bandwidth",
    category: "bandwidth",
    difficulty: "advanced",
    scenarioContext: "Netflix, YouTube, or Twitch CDN egress sizing.",
    generate: (seed: number) => {
      const viewerChoices = [2_000_000, 5_000_000, 8_000_000, 10_000_000];
      const bitrateChoices = [3, 4, 5, 8]; // Mbps
      const viewers = viewerChoices[Math.abs(seed) % viewerChoices.length];
      const bitrate = bitrateChoices[Math.abs(Math.floor(seed / 4)) % bitrateChoices.length];
      const viewersM = viewers / 1_000_000;
      const totalMbps = viewers * bitrate;
      const tbps = Math.round(totalMbps / 1_000_000);

      return {
        id: `math-bandwidth-video-${viewersM}m-${bitrate}mbps`,
        templateId: "tpl-bandwidth-video",
        title: "Video Streaming Egress Bandwidth",
        category: "bandwidth",
        difficulty: "advanced",
        prompt: `A video streaming platform has ${viewersM} Million concurrent active viewers. Each viewer streams video encoded at an average bitrate of ${bitrate} Megabits per second (Mbps). What is the total egress network throughput in Terabits per second (Tbps)?`,
        scenarioContext: "Netflix, YouTube, or Twitch CDN egress sizing.",
        parameters: [
          { label: "Concurrent Viewers", value: `${viewers.toLocaleString()} (${viewersM}M)` },
          { label: "Stream Bitrate", value: `${bitrate} Mbps` },
        ],
        canonicalAnswer: tbps,
        unit: "Tbps",
        magnitudeLabel: "Tbps",
        stepByStepDerivation: [
          `Total throughput = ${viewers.toLocaleString()} viewers × ${bitrate} Mbps = ${totalMbps.toLocaleString()} Mbps`,
          `Convert Mbps to Gbps: ${totalMbps.toLocaleString()} ÷ 1,000 = ${(totalMbps / 1000).toLocaleString()} Gbps`,
          `Convert Gbps to Tbps: ${(totalMbps / 1000).toLocaleString()} ÷ 1,000 = ${tbps} Tbps`,
        ],
        ruleOfThumbTip: `1 Million streams at ${bitrate} Mbps = ${bitrate} Tbps. Therefore ${viewersM}M streams = ${tbps} Tbps.`,
      };
    },
  },

  // 5. Cache RAM: 80/20 Pareto
  {
    templateId: "tpl-cache-pareto",
    title: "RAM Cache Sizing (80/20 Pareto Rule)",
    category: "cache_ram",
    difficulty: "intermediate",
    scenarioContext: "Essential sizing calculation before drawing a Redis or Memcached node in any interview.",
    generate: (seed: number) => {
      const readChoices = [200_000_000, 500_000_000, 1_000_000_000];
      const payloadChoices = [250, 500, 1000]; // bytes
      const reads = readChoices[Math.abs(seed) % readChoices.length];
      const payload = payloadChoices[Math.abs(Math.floor(seed / 3)) % payloadChoices.length];
      const readsM = reads / 1_000_000;
      const hotRatio = 0.2;
      const hotItems = reads * hotRatio;
      const ramGb = Math.round((hotItems * payload) / 1_000_000_000);

      return {
        id: `math-cache-pareto-${readsM}m-${payload}b`,
        templateId: "tpl-cache-pareto",
        title: "RAM Cache Sizing (80/20 Pareto Rule)",
        category: "cache_ram",
        difficulty: "intermediate",
        prompt: `Your system receives ${readsM} Million read requests per day. The average response object size is ${payload} bytes. Following the 80/20 Pareto principle (caching top 20% of hot daily items), how many Gigabytes (GB) of RAM are required for the Redis cluster?`,
        scenarioContext: "Essential sizing calculation before drawing a Redis node in any interview.",
        parameters: [
          { label: "Daily Reads", value: `${reads.toLocaleString()} (${readsM}M)` },
          { label: "Payload Size", value: `${payload} Bytes` },
          { label: "Hot Cache Ratio", value: "20% (0.20)" },
        ],
        canonicalAnswer: ramGb,
        unit: "GB",
        magnitudeLabel: "GB RAM",
        stepByStepDerivation: [
          `Hot items to cache = ${reads.toLocaleString()} × 0.20 = ${hotItems.toLocaleString()} keys`,
          `Raw RAM = ${hotItems.toLocaleString()} × ${payload} Bytes = ${(hotItems * payload).toLocaleString()} Bytes`,
          `Convert to GB: ${(hotItems * payload).toLocaleString()} ÷ 10^9 = ${ramGb} GB RAM`,
        ],
        ruleOfThumbTip: `Always remember to add 25-30% buffer for Redis hash-table pointer overhead in production.`,
      };
    },
  },

  // 6. Shard Count: Write Throughput
  {
    templateId: "tpl-shard-count-write",
    title: "Database Shard Count for Write Sizing",
    category: "shard_count",
    difficulty: "intermediate",
    scenarioContext: "Horizontal partitioning sizing when a single primary database saturates IOPS.",
    generate: (seed: number) => {
      const writeQpsChoices = [30_000, 50_000, 80_000, 100_000];
      const nodeCapacityChoices = [5_000, 10_000];
      const writeQps = writeQpsChoices[Math.abs(seed) % writeQpsChoices.length];
      const cap = nodeCapacityChoices[Math.abs(Math.floor(seed / 4)) % nodeCapacityChoices.length];
      const shards = Math.ceil(writeQps / cap);

      return {
        id: `math-shard-write-${writeQps}-${cap}`,
        templateId: "tpl-shard-count-write",
        title: "Database Shard Count for Write Sizing",
        category: "shard_count",
        difficulty: "intermediate",
        prompt: `An online ledger requires sustained write throughput of ${writeQps.toLocaleString()} inserts/sec. Benchmarks confirm a single database node sustains at most ${cap.toLocaleString()} writes/sec before disk IOPS and lock queue saturation. What is the minimum number of database shards required?`,
        scenarioContext: "Horizontal partitioning sizing when a single primary database saturates IOPS.",
        parameters: [
          { label: "Total Write Traffic", value: `${writeQps.toLocaleString()} writes/sec` },
          { label: "Max Node Throughput", value: `${cap.toLocaleString()} writes/sec` },
        ],
        canonicalAnswer: shards,
        unit: "shards",
        magnitudeLabel: "Shards",
        stepByStepDerivation: [
          `Required Shards = Total Write QPS ÷ Max Node Capacity`,
          `${writeQps.toLocaleString()} ÷ ${cap.toLocaleString()} = ${shards} shards`,
        ],
        ruleOfThumbTip: "Always round up to power of 2 or consistent hashing virtual nodes to simplify future resharding.",
      };
    },
  },

  // 7. Replica Count: Read Splitting
  {
    templateId: "tpl-replica-count",
    title: "Read Replica Fleet Sizing",
    category: "replica_count",
    difficulty: "intermediate",
    scenarioContext: "Relational database read-scaling and read/write splitting architecture.",
    generate: (seed: number) => {
      const readQpsChoices = [40_000, 60_000, 90_000, 120_000];
      const replicaCapChoices = [10_000, 15_000];
      const readQps = readQpsChoices[Math.abs(seed) % readQpsChoices.length];
      const cap = replicaCapChoices[Math.abs(Math.floor(seed / 3)) % replicaCapChoices.length];
      const replicas = Math.ceil(readQps / cap);

      return {
        id: `math-replica-read-${readQps}-${cap}`,
        templateId: "tpl-replica-count",
        title: "Read Replica Fleet Sizing",
        category: "replica_count",
        difficulty: "intermediate",
        prompt: `Your application receives ${readQps.toLocaleString()} read queries per second. Read queries are split across PostgreSQL read replicas. Each replica instance comfortably serves ${cap.toLocaleString()} QPS at P99 < 20ms. What is the minimum number of read replicas needed?`,
        scenarioContext: "Relational database read-scaling and read/write splitting architecture.",
        parameters: [
          { label: "Total Read QPS", value: `${readQps.toLocaleString()} reads/sec` },
          { label: "Replica Safe Capacity", value: `${cap.toLocaleString()} reads/sec` },
        ],
        canonicalAnswer: replicas,
        unit: "replicas",
        magnitudeLabel: "Replicas",
        stepByStepDerivation: [
          `Required Replicas = Total Read QPS ÷ Replica Safe Capacity`,
          `${readQps.toLocaleString()} ÷ ${cap.toLocaleString()} = ${replicas} replicas`,
        ],
        ruleOfThumbTip: "In production, add N+1 or N+2 redundancy so a replica node failure or restart does not trigger a cascading overload.",
      };
    },
  },

  // 8. Availability: Four Nines Downtime
  {
    templateId: "tpl-sla-nines",
    title: "SLA Downtime Budget (Nines)",
    category: "availability",
    difficulty: "beginner",
    scenarioContext: "Site Reliability Engineering (SRE) error budget allocation.",
    generate: (seed: number) => {
      const targets = [
        { label: "99.9%", nines: 0.999, minutes: 525.6 },
        { label: "99.99%", nines: 0.9999, minutes: 52.6 },
        { label: "99.999%", nines: 0.99999, minutes: 5.3 },
      ];
      const item = targets[Math.abs(seed) % targets.length];

      return {
        id: `math-sla-${item.label.replace("%", "").replace(".", "-")}`,
        templateId: "tpl-sla-nines",
        title: `${item.label} Availability Downtime Budget`,
        category: "availability",
        difficulty: "beginner",
        prompt: `Your Service Level Objective promises ${item.label} availability across a 365-day year. How many minutes of total unplanned downtime are permitted before breaching the SLA?`,
        scenarioContext: "Site Reliability Engineering (SRE) error budget allocation.",
        parameters: [
          { label: "Availability Target", value: item.label },
          { label: "Minutes per Year", value: "525,600 (365 × 24 × 60)" },
        ],
        canonicalAnswer: item.minutes,
        unit: "minutes",
        magnitudeLabel: "minutes/year",
        stepByStepDerivation: [
          `Downtime allowed = 100% - ${item.label} = ${(1 - item.nines).toFixed(5)}`,
          `Total minutes in a year = 365 × 24 × 60 = 525,600 minutes`,
          `Allowed downtime = 525,600 × ${(1 - item.nines).toFixed(5)} ≈ ${item.minutes} minutes/year`,
        ],
        ruleOfThumbTip: "Rule of Nines: 99% = 3.65 days/yr; 99.9% = 8.76 hours/yr; 99.99% = 52.6 minutes/yr; 99.999% = 5.26 minutes/yr.",
      };
    },
  },

  // 9. Cost: S3 Object Storage
  {
    templateId: "tpl-s3-storage-cost",
    title: "Object Storage (S3) Cost Projection",
    category: "cost",
    difficulty: "beginner",
    scenarioContext: "Cloud infrastructure budgeting in system design interviews.",
    generate: (seed: number) => {
      const pbChoices = [1, 2, 4, 5];
      const pb = pbChoices[Math.abs(seed) % pbChoices.length];
      const gb = pb * 1_000_000;
      const rate = 0.023;
      const cost = Math.round(gb * rate);

      return {
        id: `math-s3-${pb}pb`,
        templateId: "tpl-s3-storage-cost",
        title: `${pb}PB Object Storage Monthly Cost`,
        category: "cost",
        difficulty: "beginner",
        prompt: `Your media service stores ${pb} Petabytes (PB) of raw video files in AWS S3 Standard storage. The price is $0.023 per GB per month. What is the monthly storage bill in Dollars ($)?`,
        scenarioContext: "Cloud infrastructure budgeting in system design interviews.",
        parameters: [
          { label: "Data Volume", value: `${pb} PB (${gb.toLocaleString()} GB)` },
          { label: "Cost per GB/Month", value: `$${rate}` },
        ],
        canonicalAnswer: cost,
        unit: "USD/month",
        magnitudeLabel: "$/month",
        stepByStepDerivation: [
          `Convert PB to GB: ${pb} PB = ${gb.toLocaleString()} GB`,
          `Monthly cost = ${gb.toLocaleString()} GB × $0.023 = $${cost.toLocaleString()} per month`,
        ],
        ruleOfThumbTip: `1 PB of S3 Standard costs roughly $23,000/month. Moving colder archive tiers to S3 Glacier ($0.004/GB) saves ~80%.`,
      };
    },
  },
];

/** Generates a problem from a specific template or random selection using a seed. */
export function generateMathProblem(templateId?: string, seed: number = Date.now()): MathProblem {
  const tpl = templateId
    ? MATH_TEMPLATES.find((t) => t.templateId === templateId) || MATH_TEMPLATES[0]
    : MATH_TEMPLATES[Math.abs(seed) % MATH_TEMPLATES.length];
  return tpl.generate(seed);
}

/** Generates a complete set of problems covering all categories with varied numbers. */
export function generateAllMathProblems(seed: number = 42): MathProblem[] {
  return MATH_TEMPLATES.map((t, idx) => t.generate(seed + idx * 31));
}

// Initial statically exported problems generated from templates for backward compatibility
export const MATH_PROBLEMS: MathProblem[] = generateAllMathProblems(2026);
