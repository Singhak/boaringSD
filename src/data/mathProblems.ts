import { scoreEstimate } from "@/lib/estimation";

export type MathCategory = "qps" | "storage" | "bandwidth" | "cache_ram" | "availability" | "cost";
export type MathDifficulty = "beginner" | "intermediate" | "advanced";

export interface MathProblem {
  id: string;
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
  magnitudeLabel: string; // e.g., "RPS", "TB/year", "GB RAM", "minutes/year"
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

export const MATH_PROBLEMS: MathProblem[] = [
  {
    id: "math-dau-qps-1",
    title: "Daily Active Users to Average QPS",
    category: "qps",
    difficulty: "beginner",
    prompt: "A social media platform has 100 Million Daily Active Users (DAU). Each user performs an average of 20 API requests per day. What is the average Queries Per Second (QPS)?",
    scenarioContext: "Standard interview opener for Twitter, Threads, or Instagram feed design.",
    parameters: [
      { label: "Daily Active Users", value: "100,000,000" },
      { label: "Requests per User/Day", value: "20" },
      { label: "Seconds in a Day", value: "86,400 (approx. 100,000)" },
    ],
    canonicalAnswer: 23150,
    unit: "requests/sec",
    magnitudeLabel: "RPS",
    stepByStepDerivation: [
      "Total daily requests = 100,000,000 × 20 = 2,000,000,000 (2 Billion req/day)",
      "Exact: 2,000,000,000 ÷ 86,400 ≈ 23,148 RPS",
      "Rule-of-Thumb Shortcut: 2B ÷ 100,000 = 20,000 RPS (acceptable in fast interview)",
    ],
    ruleOfThumbTip: "1 Million requests/day ≈ 11.6 RPS (round to 12 RPS). So 2,000 Million = 2,000 × 12 ≈ 24,000 RPS.",
  },
  {
    id: "math-peak-qps-2",
    title: "Flash Sale Peak QPS Multiplier",
    category: "qps",
    difficulty: "beginner",
    prompt: "An e-commerce service runs at an average of 40,000 QPS during business hours. During a Black Friday flash sale, traffic spikes by 2.5×. What peak QPS must the load balancer and ingress gateway be provisioned to handle?",
    scenarioContext: "High-traffic retail event planning (Amazon Prime Day, Alibaba 11.11).",
    parameters: [
      { label: "Average QPS", value: "40,000 RPS" },
      { label: "Peak Multiplier", value: "2.5×" },
    ],
    canonicalAnswer: 100000,
    unit: "requests/sec",
    magnitudeLabel: "Peak RPS",
    stepByStepDerivation: [
      "Peak QPS = Average QPS × Peak Factor",
      "40,000 × 2.5 = 100,000 RPS",
    ],
    ruleOfThumbTip: "Always design for 2× to 3× of average traffic to handle diurnal peaks and sudden flash events.",
  },
  {
    id: "math-cache-pareto-3",
    title: "RAM Cache Sizing (80/20 Pareto Rule)",
    category: "cache_ram",
    difficulty: "intermediate",
    prompt: "Your system receives 500 Million read requests per day. The average response object size is 500 bytes. Following the 80/20 Pareto principle (caching the top 20% of hot daily items to satisfy 80% of traffic), how many Gigabytes (GB) of RAM are required for the Redis cluster?",
    scenarioContext: "Essential sizing calculation before drawing a Redis or Memcached node in any interview.",
    parameters: [
      { label: "Daily Reads", value: "500,000,000" },
      { label: "Payload Size", value: "500 Bytes" },
      { label: "Hot Cache Ratio", value: "20% (0.20)" },
    ],
    canonicalAnswer: 50,
    unit: "GB",
    magnitudeLabel: "GB RAM",
    stepByStepDerivation: [
      "Hot items to cache = 500,000,000 × 0.20 = 100,000,000 keys",
      "Raw RAM = 100,000,000 × 500 Bytes = 50,000,000,000 Bytes",
      "Convert to GB: 50,000,000,000 ÷ 10^9 = 50 GB RAM (or ~46.5 GiB)",
    ],
    ruleOfThumbTip: "100 Million items × 500 Bytes = 50 GB. Always remember to add 25-30% buffer for Redis dict pointer overhead in production.",
  },
  {
    id: "math-storage-yearly-4",
    title: "5-Year Disk Storage Projection (TinyURL)",
    category: "storage",
    difficulty: "intermediate",
    prompt: "TinyURL generates 100 Million new shortened URLs per month. Each record in PostgreSQL stores the 7-character Base62 key, the original long URL (avg 500 bytes), user ID, and timestamp metadata totaling 600 bytes. How many Terabytes (TB) of persistent database storage will be needed over 5 years?",
    scenarioContext: "Database capacity planning for write-heavy services.",
    parameters: [
      { label: "New URLs / Month", value: "100,000,000" },
      { label: "Record Size", value: "600 Bytes" },
      { label: "Timeframe", value: "5 Years (60 Months)" },
    ],
    canonicalAnswer: 36,
    unit: "TB",
    magnitudeLabel: "TB",
    stepByStepDerivation: [
      "Total records over 5 years = 100,000,000/month × 60 months = 6,000,000,000 records (6 Billion)",
      "Total Storage = 6,000,000,000 × 600 Bytes = 3,600,000,000,000 Bytes",
      "Convert Bytes to TB: 3.6 × 10^12 ÷ 10^12 = 3.6 TB (Wait, 6B * 600B = 3.6 TB)",
      "Correction: 100M * 600B = 60 GB/month. 60 GB * 60 months = 3,600 GB = 3.6 TB",
    ],
    ruleOfThumbTip: "100M records of 600 bytes = 60 GB per month. 60 GB × 12 = 720 GB/year × 5 years = 3.6 TB.",
  },
  {
    id: "math-bandwidth-video-5",
    title: "Video Streaming Egress Bandwidth",
    category: "bandwidth",
    difficulty: "advanced",
    prompt: "A video streaming platform has 5 Million concurrent active viewers. Each viewer streams 1080p HD video encoded at an average bitrate of 4 Megabits per second (Mbps). What is the total egress network throughput in Terabits per second (Tbps)?",
    scenarioContext: "Netflix, YouTube, or Twitch CDN egress sizing.",
    parameters: [
      { label: "Concurrent Viewers", value: "5,000,000" },
      { label: "Stream Bitrate", value: "4 Mbps" },
    ],
    canonicalAnswer: 20,
    unit: "Tbps",
    magnitudeLabel: "Tbps",
    stepByStepDerivation: [
      "Total throughput = 5,000,000 viewers × 4 Mbps = 20,000,000 Mbps",
      "Convert Mbps to Gbps: 20,000,000 ÷ 1,000 = 20,000 Gbps",
      "Convert Gbps to Tbps: 20,000 ÷ 1,000 = 20 Tbps",
    ],
    ruleOfThumbTip: "1 Million streams at 4 Mbps = 4,000 Gbps = 4 Tbps. Therefore 5M streams = 20 Tbps. This proves why CDNs and ISP OpenConnect appliances are mandatory.",
  },
  {
    id: "math-sla-nines-6",
    title: "Four Nines (99.99%) Downtime Budget",
    category: "availability",
    difficulty: "beginner",
    prompt: "Your Service Level Objective (SLO) promises 99.99% availability ('Four Nines') across a 365-day calendar year. How many minutes of total unplanned downtime are permitted before breaching the SLA?",
    scenarioContext: "Site Reliability Engineering (SRE) error budget allocation.",
    parameters: [
      { label: "Availability Target", value: "99.99%" },
      { label: "Minutes per Year", value: "525,600 (365 × 24 × 60)" },
    ],
    canonicalAnswer: 52.6,
    unit: "minutes",
    magnitudeLabel: "minutes/year",
    stepByStepDerivation: [
      "Downtime allowed = 100% - 99.99% = 0.01% = 0.0001",
      "Total minutes in a year = 365 × 24 × 60 = 525,600 minutes",
      "Allowed downtime = 525,600 × 0.0001 = 52.56 minutes ≈ 52.6 minutes/year",
    ],
    ruleOfThumbTip: "Rule of Nines: 99% = 3.65 days/yr; 99.9% = 8.76 hours/yr; 99.99% = 52.6 minutes/yr; 99.999% = 5.26 minutes/yr.",
  },
  {
    id: "math-db-connection-pool-7",
    title: "Connection Pool Sizing & Exhaustion",
    category: "qps",
    difficulty: "intermediate",
    prompt: "A microservice fleet consists of 50 Kubernetes application pods. Each pod runs a web server with 30 worker threads, each opening direct database connections to a single PostgreSQL primary. The database has max_connections set to 500. How many total connections will the app fleet attempt to open, and what will the surplus/deficit be?",
    scenarioContext: "Root cause analysis for Level 11 (Connection Pooling).",
    parameters: [
      { label: "App Pods", value: "50" },
      { label: "Threads/Pod", value: "30" },
      { label: "DB max_connections", value: "500" },
    ],
    canonicalAnswer: 1500,
    unit: "connections",
    magnitudeLabel: "Connections",
    stepByStepDerivation: [
      "Total connections requested = 50 pods × 30 threads = 1,500 connections",
      "Database limit = 500 connections",
      "1,500 > 500: Database connection pool immediately exhausts, rejecting 1,000 connections with 'FATAL: sorry, too many clients already'.",
    ],
    ruleOfThumbTip: "Postgres forks a process per connection (~10MB RAM each). Never connect hundreds of stateless app servers directly to Postgres; place PgBouncer or AWS RDS Proxy in between.",
  },
  {
    id: "math-cdn-cost-savings-8",
    title: "CDN Offload & Cloud Egress Cost",
    category: "cost",
    difficulty: "intermediate",
    prompt: "An application serves 200 Terabytes (TB) of static image and video assets each month. Direct cloud egress from origin AWS servers costs $0.08 per GB. By deploying Cloudflare or CloudFront with an 85% cache hit ratio ($0.02/GB for CDN egress, and origin traffic drops to 15%), what are the monthly bandwidth savings in Dollars ($)?",
    scenarioContext: "Architectural justification for adding CDN (Level 5 / Sprint 4).",
    parameters: [
      { label: "Monthly Egress", value: "200 TB (200,000 GB)" },
      { label: "Origin Cost / GB", value: "$0.08" },
      { label: "CDN Cache Hit Rate", value: "85%" },
      { label: "CDN Egress Cost / GB", value: "$0.02" },
    ],
    canonicalAnswer: 10200,
    unit: "USD/month",
    magnitudeLabel: "$ savings/mo",
    stepByStepDerivation: [
      "Cost without CDN = 200,000 GB × $0.08 = $16,000/month",
      "With CDN: 85% served at edge (170,000 GB × $0.02 = $3,400)",
      "Origin fetches for remaining 15% (30,000 GB × $0.08 = $2,400)",
      "Total cost with CDN = $3,400 + $2,400 = $5,800/month",
      "Monthly Savings = $16,000 - $5,800 = $10,200/month (63.75% cost reduction)",
    ],
    ruleOfThumbTip: "CDNs not only reduce latency by 10x, they also dramatically cut multi-cloud egress transit bills.",
  },
  {
    id: "math-kafka-partitions-9",
    title: "Kafka Partitioning Throughput Sizing",
    category: "bandwidth",
    difficulty: "advanced",
    prompt: "A real-time telemetry pipeline ingests 200,000 events per second. Each event payload is 1 Kilobyte (KB). In Kafka, a single topic partition comfortably sustains 10 Megabytes per second (MB/s) of write throughput without producer backpressure. What is the minimum number of partitions required for this topic?",
    scenarioContext: "Message broker sizing for distributed event streams (Level 6 & Uber Dispatch).",
    parameters: [
      { label: "Event Rate", value: "200,000 events/sec" },
      { label: "Event Size", value: "1 KB" },
      { label: "Single Partition Max Throughput", value: "10 MB/sec" },
    ],
    canonicalAnswer: 20,
    unit: "partitions",
    magnitudeLabel: "Partitions",
    stepByStepDerivation: [
      "Total throughput = 200,000 events/sec × 1 KB = 200,000 KB/sec",
      "Convert KB/sec to MB/sec: 200,000 ÷ 1,000 = 200 MB/sec",
      "Minimum partitions = 200 MB/sec ÷ 10 MB/sec per partition = 20 partitions",
    ],
    ruleOfThumbTip: "Partitions are the unit of parallelism in Kafka. Always add 25-50% headroom for spikes (e.g. provision 24 or 32 partitions).",
  },
  {
    id: "math-s3-storage-cost-10",
    title: "Object Storage (S3) Cost Projection",
    category: "cost",
    difficulty: "beginner",
    prompt: "Your media startup stores 2 Petabytes (PB) of video raw files in AWS S3 Standard storage. The price is $0.023 per GB per month. What is the monthly storage bill in Dollars ($)?",
    scenarioContext: "Cloud infrastructure budgeting in system design interviews.",
    parameters: [
      { label: "Data Volume", value: "2 PB (2,000,000 GB)" },
      { label: "Cost per GB/Month", value: "$0.023" },
    ],
    canonicalAnswer: 46000,
    unit: "USD/month",
    magnitudeLabel: "$/month",
    stepByStepDerivation: [
      "Convert PB to GB: 2 PB = 2,000 TB = 2,000,000 GB",
      "Monthly cost = 2,000,000 GB × $0.023 = $46,000 per month ($552,000/year)",
    ],
    ruleOfThumbTip: "1 PB of S3 Standard costs roughly $23,000/month. Moving cold data to S3 Glacier ($0.004/GB) saves ~80%.",
  },
];
