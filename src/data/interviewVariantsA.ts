import type { EstimationVariantMap } from "./interviewVariants";

export const VARIANTS: EstimationVariantMap = {
  "est-url-qps": [
    {
      parameterContext: "300 Million new URLs created per month with a 50:1 Read-to-Write ratio.",
      inputs: { writesM: 300, ratio: 50 },
      compute: (i) => ((i.writesM * 1e6) / 2.5e6) * 10 * i.ratio,
      stepByStepDerivation: [
        "300M writes/month ÷ 2.5M seconds/month = 120 writes/second average",
        "Peak write multiplier (10x burst) = 120 × 10 = 1,200 writes/second",
        "Read-to-Write ratio is 50:1",
        "Peak Read QPS = 1,200 × 50 = 60,000 Read RPS",
      ],
    },
    {
      parameterContext: "40 Million new URLs created per month with a 500:1 Read-to-Write ratio.",
      inputs: { writesM: 40, ratio: 500 },
      compute: (i) => ((i.writesM * 1e6) / 2.5e6) * 10 * i.ratio,
      stepByStepDerivation: [
        "40M writes/month ÷ 2.5M seconds/month = 16 writes/second average",
        "Peak write multiplier (10x burst) = 16 × 10 = 160 writes/second",
        "Read-to-Write ratio is 500:1",
        "Peak Read QPS = 160 × 500 = 80,000 Read RPS",
      ],
    },
  ],
  "est-url-storage": [
    {
      parameterContext: "250M URLs/month, average record size = 300 bytes (hash, URL, timestamp), retained for 10 years.",
      inputs: { recordsM: 250, bytes: 300, years: 10 },
      compute: (i) => (i.recordsM * 1e6 * i.bytes * 12 * i.years) / 1e12,
      prompt: "Estimate the 10-Year persistent storage required for URLs (in Terabytes)",
      stepByStepDerivation: [
        "250M records/month × 300 bytes = 75 GB new storage / month",
        "75 GB/month × 12 months = 900 GB / year",
        "900 GB/year × 10 years = 9,000 GB = 9 Terabytes (TB)",
      ],
    },
    {
      parameterContext: "40M URLs/month, average record size = 1000 bytes (hash, long URL, metadata), retained for 3 years.",
      inputs: { recordsM: 40, bytes: 1000, years: 3 },
      compute: (i) => (i.recordsM * 1e6 * i.bytes * 12 * i.years) / 1e12,
      prompt: "Estimate the 3-Year persistent storage required for URLs (in Terabytes)",
      stepByStepDerivation: [
        "40M records/month × 1000 bytes = 40 GB new storage / month",
        "40 GB/month × 36 months (3 years) = 1,440 GB",
        "1,440 GB = 1.44 TB ≈ 1.4 Terabytes (TB)",
      ],
    },
  ],
  "est-url-cache": [
    {
      parameterContext: "Daily active URLs = 400M visited. 10% of them generate 90% of daily redirects. Each cached record is 300 bytes.",
      inputs: { activeM: 400, hotPct: 10, bytes: 300 },
      compute: (i) => (i.activeM * 1e6 * (i.hotPct / 100) * i.bytes) / 1e9,
      stepByStepDerivation: [
        "400M active daily URLs × 10% hot set = 40M hot URLs to cache",
        "40M URLs × 300 bytes = 12,000,000,000 bytes",
        "12,000,000,000 bytes = 12 GB RAM",
      ],
    },
    {
      parameterContext: "Daily active URLs = 250M visited. 20% generate 80% of daily redirects. Each cached record is 1000 bytes.",
      inputs: { activeM: 250, hotPct: 20, bytes: 1000 },
      compute: (i) => (i.activeM * 1e6 * (i.hotPct / 100) * i.bytes) / 1e9,
      stepByStepDerivation: [
        "250M active daily URLs × 20% hot set = 50M hot URLs to cache",
        "50M URLs × 1000 bytes = 50,000,000,000 bytes",
        "50,000,000,000 bytes = 50 GB RAM",
      ],
    },
  ],
  "est-tw-read-qps": [
    {
      parameterContext: "120 Million DAU. Each active user visits their timeline 10 times per day.",
      inputs: { dauM: 120, visits: 10 },
      compute: (i) => (i.dauM * 1e6 * i.visits) / 86400,
      stepByStepDerivation: [
        "120M DAU × 10 visits/day = 1.2 Billion timeline reads / day",
        "1.2B reads ÷ 86,400 seconds/day ≈ 13,889 reads/sec",
        "≈ 14,000 average Read RPS",
      ],
    },
    {
      parameterContext: "500 Million DAU. Each active user visits their timeline 4 times per day.",
      inputs: { dauM: 500, visits: 4 },
      compute: (i) => (i.dauM * 1e6 * i.visits) / 86400,
      stepByStepDerivation: [
        "500M DAU × 4 visits/day = 2 Billion timeline reads / day",
        "2B reads ÷ 86,400 seconds/day ≈ 23,148 reads/sec",
        "≈ 23,000 average Read RPS",
      ],
    },
  ],
  "est-tw-storage": [
    {
      parameterContext: "200 Million tweets/day, average text & metadata size = 400 bytes, retained for 3 years.",
      inputs: { tweetsM: 200, bytes: 400, years: 3 },
      compute: (i) => (i.tweetsM * 1e6 * i.bytes * 365 * i.years) / 1e12,
      prompt: "Estimate 3-Year persistent storage for raw tweet text and metadata (in Terabytes)",
      stepByStepDerivation: [
        "200M tweets/day × 400 bytes = 80 GB raw text/day",
        "80 GB/day × 365 days = 29,200 GB = 29.2 TB / year",
        "29.2 TB/year × 3 years = 87.6 TB (round to ~88 TB)",
      ],
    },
    {
      parameterContext: "800 Million tweets/day, average text & metadata size = 280 bytes, retained for 5 years.",
      inputs: { tweetsM: 800, bytes: 280, years: 5 },
      compute: (i) => (i.tweetsM * 1e6 * i.bytes * 365 * i.years) / 1e12,
      stepByStepDerivation: [
        "800M tweets/day × 280 bytes = 224 GB raw text/day",
        "224 GB/day × 365 days = 81,760 GB ≈ 81.76 TB / year",
        "81.76 TB/year × 5 years = 408.8 TB (round to ~410 TB)",
      ],
    },
  ],
  "est-tw-cache": [
    {
      parameterContext: "Each tweet ID is 8 bytes (64-bit int). 500 IDs per user timeline list, for 150M active users.",
      inputs: { usersM: 150, ids: 500, bytes: 8 },
      compute: (i) => (i.usersM * 1e6 * i.ids * i.bytes) / 1e9,
      prompt: "Calculate RAM cache needed to store the latest 500 tweet IDs for all 150M active users (in Gigabytes)",
      stepByStepDerivation: [
        "500 tweet IDs × 8 bytes = 4,000 bytes (4 KB) per user timeline",
        "150M active users × 4 KB = 600,000,000 KB",
        "600,000,000 KB = 600 GB RAM",
      ],
    },
    {
      parameterContext: "Each tweet ID is 8 bytes (64-bit int). 1200 IDs per user timeline list, for 500M active users.",
      inputs: { usersM: 500, ids: 1200, bytes: 8 },
      compute: (i) => (i.usersM * 1e6 * i.ids * i.bytes) / 1e9,
      prompt: "Calculate RAM cache needed to store the latest 1200 tweet IDs for all 500M active users (in Gigabytes)",
      stepByStepDerivation: [
        "1200 tweet IDs × 8 bytes = 9,600 bytes (9.6 KB) per user timeline",
        "500M active users × 9.6 KB = 4,800,000,000 KB",
        "4,800,000,000 KB = 4,800 GB (≈ 4.8 TB RAM)",
      ],
    },
  ],
  "est-ub-write-qps": [
    {
      parameterContext: "2 Million active drivers in the region, each sending a GPS ping every 5 seconds.",
      inputs: { drivers: 2000000, interval: 5 },
      compute: (i) => i.drivers / i.interval,
      stepByStepDerivation: [
        "2,000,000 active drivers ÷ 5 seconds interval",
        "= 400,000 writes/second",
      ],
    },
    {
      parameterContext: "8 Million active drivers worldwide, each sending a GPS ping every 2 seconds.",
      inputs: { drivers: 8000000, interval: 2 },
      compute: (i) => i.drivers / i.interval,
      stepByStepDerivation: [
        "8,000,000 active drivers ÷ 2 seconds interval",
        "= 4,000,000 writes/second",
      ],
    },
  ],
  "est-ub-ram": [
    {
      parameterContext: "Each driver record is ≈ 80 bytes (fields plus overhead). There are 2 Million drivers.",
      inputs: { drivers: 2000000, bytes: 80 },
      compute: (i) => (i.drivers * i.bytes) / 1e6,
      prompt: "Estimate RAM needed to hold live coordinates of all 2M drivers in memory (in Megabytes)",
      stepByStepDerivation: [
        "2,000,000 drivers × 80 bytes = 160,000,000 bytes",
        "160,000,000 bytes = 160 MB",
      ],
    },
    {
      parameterContext: "Each driver record is ≈ 65 bytes (fields plus overhead). There are 12 Million drivers.",
      inputs: { drivers: 12000000, bytes: 65 },
      compute: (i) => (i.drivers * i.bytes) / 1e6,
      prompt: "Estimate RAM needed to hold live coordinates of all 12M drivers in memory (in Megabytes)",
      stepByStepDerivation: [
        "12,000,000 drivers × 65 bytes = 780,000,000 bytes",
        "780,000,000 bytes = 780 MB",
      ],
    },
  ],
  "est-ub-read-qps": [
    {
      parameterContext: "200,000 riders open the app at peak, and each one issues 1 ride search per second.",
      inputs: { riders: 200000, perSec: 1 },
      compute: (i) => i.riders * i.perSec,
      stepByStepDerivation: [
        "200,000 concurrent riders × 1 search/second each",
        "= 200,000 spatial lookups/second",
      ],
    },
    {
      parameterContext: "120,000 riders open the app at peak, and each one issues 1 ride search every 4 seconds (0.25 searches per second).",
      inputs: { riders: 120000, perSec: 0.25 },
      compute: (i) => i.riders * i.perSec,
      stepByStepDerivation: [
        "120,000 concurrent riders × 0.25 searches/second each",
        "120,000 ÷ 4 = 30,000 spatial lookups/second",
      ],
    },
  ],
  "est-ec-catalog-qps": [
    {
      parameterContext: "20 Million concurrent shoppers. Each browses 12 pages/minute. The edge CDN absorbs 95% of requests.",
      inputs: { users: 20000000, pages: 12, cdnPct: 95 },
      compute: (i) => ((i.users * i.pages) / 60) * (1 - i.cdnPct / 100),
      stepByStepDerivation: [
        "20,000,000 users × (12 requests ÷ 60 seconds) = 4,000,000 page requests/second",
        "Edge CDN absorbs 95%, leaving 5% for the origin",
        "4,000,000 × 0.05 = 200,000 dynamic catalog requests/sec",
      ],
    },
    {
      parameterContext: "80 Million concurrent shoppers. Each browses 6 pages/minute. The edge CDN absorbs 90% of requests.",
      inputs: { users: 80000000, pages: 6, cdnPct: 90 },
      compute: (i) => ((i.users * i.pages) / 60) * (1 - i.cdnPct / 100),
      stepByStepDerivation: [
        "80,000,000 users × (6 requests ÷ 60 seconds) = 8,000,000 page requests/second",
        "Edge CDN absorbs 90%, leaving 10% for the origin",
        "8,000,000 × 0.10 = 800,000 dynamic catalog requests/sec",
      ],
    },
  ],
  "est-ec-checkout-qps": [
    {
      parameterContext: "8 Million active shoppers; 5% attempt checkout, all within a 20-second burst window at the start of a flash drop.",
      inputs: { shoppers: 8000000, pct: 5, window: 20 },
      compute: (i) => (i.shoppers * (i.pct / 100)) / i.window,
      stepByStepDerivation: [
        "8,000,000 shoppers × 5% = 400,000 checkouts",
        "400,000 checkouts ÷ 20 seconds",
        "= 20,000 orders/sec burst",
      ],
    },
    {
      parameterContext: "3 Million active shoppers; 20% attempt checkout, all within a 5-second burst window at the start of a flash drop.",
      inputs: { shoppers: 3000000, pct: 20, window: 5 },
      compute: (i) => (i.shoppers * (i.pct / 100)) / i.window,
      stepByStepDerivation: [
        "3,000,000 shoppers × 20% = 600,000 checkouts",
        "600,000 checkouts ÷ 5 seconds",
        "= 120,000 orders/sec burst",
      ],
    },
  ],
  "est-ec-cdn-cache": [
    {
      parameterContext: "400 Million SKUs, each has an 80 KB compressed WebP thumbnail image.",
      inputs: { skusM: 400, kb: 80 },
      compute: (i) => (i.skusM * 1e6 * i.kb * 1000) / 1e12,
      prompt: "Estimate Edge CDN storage required for 400 Million product thumbnail images (in Terabytes)",
      stepByStepDerivation: [
        "400,000,000 SKUs × 80,000 bytes (80 KB) = 32,000,000,000,000 bytes",
        "32,000,000,000,000 bytes = 32 Terabytes (TB)",
      ],
    },
    {
      parameterContext: "2.5 Billion SKUs, each has a 30 KB compressed WebP thumbnail image.",
      inputs: { skusM: 2500, kb: 30 },
      compute: (i) => (i.skusM * 1e6 * i.kb * 1000) / 1e12,
      prompt: "Estimate Edge CDN storage required for 2.5 Billion product thumbnail images (in Terabytes)",
      stepByStepDerivation: [
        "2,500,000,000 SKUs × 30,000 bytes (30 KB) = 75,000,000,000,000 bytes",
        "75,000,000,000,000 bytes = 75 Terabytes (TB)",
      ],
    },
  ],
  "est-chat-qps": [
    {
      parameterContext: "20 Billion messages sent per day across 200M DAU, with a 4x peak burst multiplier.",
      inputs: { msgsB: 20, peak: 4 },
      compute: (i) => ((i.msgsB * 1e9) / 86400) * i.peak,
      stepByStepDerivation: [
        "20B messages / 86,400 seconds ≈ 231,481 messages/sec average",
        "Applying 4x peak traffic burst multiplier = 231,481 × 4 ≈ 925,926",
        "≈ 930,000 peak msg/sec",
      ],
    },
    {
      parameterContext: "120 Billion messages sent per day across 1.2B DAU, with a 3x peak burst multiplier.",
      inputs: { msgsB: 120, peak: 3 },
      compute: (i) => ((i.msgsB * 1e9) / 86400) * i.peak,
      stepByStepDerivation: [
        "120B messages / 86,400 seconds ≈ 1,388,889 messages/sec average",
        "Applying 3x peak traffic burst multiplier = 1,388,889 × 3 ≈ 4,166,667",
        "≈ 4,200,000 peak msg/sec",
      ],
    },
  ],
  "est-chat-connections": [
    {
      parameterContext: "200M DAU, with 15% active and maintaining an open connection at peak hours.",
      inputs: { dauM: 200, pct: 15 },
      compute: (i) => i.dauM * 1e6 * (i.pct / 100),
      stepByStepDerivation: [
        "200M DAU × 15% peak concurrency",
        "= 30 Million active connections",
      ],
    },
    {
      parameterContext: "900M DAU, with 8% active and maintaining an open connection at peak hours.",
      inputs: { dauM: 900, pct: 8 },
      compute: (i) => i.dauM * 1e6 * (i.pct / 100),
      stepByStepDerivation: [
        "900M DAU × 8% peak concurrency",
        "= 72 Million active connections",
      ],
    },
  ],
  "est-chat-storage": [
    {
      parameterContext: "20 Billion messages/day, average message metadata + text payload = 350 bytes.",
      inputs: { msgsB: 20, bytes: 350 },
      compute: (i) => (i.msgsB * 1e9 * i.bytes) / 1e12,
      stepByStepDerivation: [
        "20B messages × 350 bytes = 7,000,000,000,000 bytes",
        "7,000,000,000,000 bytes = 7,000 GB = 7 TB/day",
      ],
    },
    {
      parameterContext: "120 Billion messages/day, average message metadata + text payload = 150 bytes.",
      inputs: { msgsB: 120, bytes: 150 },
      compute: (i) => (i.msgsB * 1e9 * i.bytes) / 1e12,
      stepByStepDerivation: [
        "120B messages × 150 bytes = 18,000,000,000,000 bytes",
        "18,000,000,000,000 bytes = 18,000 GB = 18 TB/day",
      ],
    },
  ],
};
