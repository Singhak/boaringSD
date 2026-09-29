import type { EstimationVariantMap } from "./interviewVariants";

export const VARIANTS: EstimationVariantMap = {
  "est-yt-ingest-bandwidth": [
    {
      parameterContext: "300 hours of video uploaded per minute, average raw video bitrate = 8 Mbps.",
      inputs: { hoursPerMin: 300, mbps: 8 },
      compute: (i) => (i.hoursPerMin * 60 * i.mbps) / 1000,
      stepByStepDerivation: [
        "300 hours of video per minute = 300 × 3,600 s / 60 s = 18,000 video seconds arriving every real second",
        "18,000 concurrent streams × 8 Mbps = 144,000 Mbps",
        "144,000 Mbps = 144 Gbps ingress bandwidth (≈ 140 Gbps)",
      ],
    },
    {
      parameterContext: "800 hours of video uploaded per minute, average raw video bitrate = 15 Mbps.",
      inputs: { hoursPerMin: 800, mbps: 15 },
      compute: (i) => (i.hoursPerMin * 60 * i.mbps) / 1000,
      stepByStepDerivation: [
        "800 hours of video per minute = 800 × 3,600 s / 60 s = 48,000 video seconds arriving every real second",
        "48,000 concurrent streams × 15 Mbps = 720,000 Mbps",
        "720,000 Mbps = 720 Gbps ingress bandwidth",
      ],
    },
  ],
  "est-yt-daily-storage": [
    {
      parameterContext: "1,200,000 hours of video/day, average compressed transcoded output across all resolutions = 1.5 GB/hour.",
      inputs: { hoursPerDay: 1200000, gbPerHour: 1.5 },
      compute: (i) => (i.hoursPerDay * i.gbPerHour) / 1e6,
      stepByStepDerivation: [
        "1,200,000 hours/day × 1.5 GB/hour = 1,800,000 GB/day",
        "1,800,000 GB ÷ 1,000 = 1,800 TB/day",
        "1,800 TB ÷ 1,000 = 1.8 PB/day",
      ],
    },
    {
      parameterContext: "1,500,000 hours of video/day, average compressed transcoded output across all resolutions = 3 GB/hour.",
      inputs: { hoursPerDay: 1500000, gbPerHour: 3 },
      compute: (i) => (i.hoursPerDay * i.gbPerHour) / 1e6,
      stepByStepDerivation: [
        "1,500,000 hours/day × 3 GB/hour = 4,500,000 GB/day",
        "4,500,000 GB ÷ 1,000 = 4,500 TB/day",
        "4,500 TB ÷ 1,000 = 4.5 PB/day (≈ 4.5 PB)",
      ],
    },
  ],
  "est-yt-streaming-cdn": [
    {
      parameterContext: "500 Million views/day, average view duration = 8 minutes, average stream bitrate = 4 Mbps, peak-to-average ratio = 2.5x.",
      inputs: { views: 500e6, minutes: 8, mbps: 4, peak: 2.5 },
      compute: (i) => ((i.views / 86400) * i.minutes * 60 * i.peak * i.mbps) / 1e6,
      stepByStepDerivation: [
        "500M views/day ÷ 86,400s ≈ 5,787 new views started per second",
        "Concurrent viewers = 5,787 × 480s (8 min) ≈ 2.78 Million average concurrent streams",
        "Peak viewers (2.5x) ≈ 6.94 Million concurrent streams",
        "6.94M streams × 4 Mbps ≈ 27,800,000 Mbps ≈ 28 Tbps egress bandwidth",
      ],
    },
    {
      parameterContext: "2 Billion views/day, average view duration = 3 minutes, average stream bitrate = 2.5 Mbps, peak-to-average ratio = 1.5x.",
      inputs: { views: 2e9, minutes: 3, mbps: 2.5, peak: 1.5 },
      compute: (i) => ((i.views / 86400) * i.minutes * 60 * i.peak * i.mbps) / 1e6,
      stepByStepDerivation: [
        "2B views/day ÷ 86,400s ≈ 23,148 new views started per second",
        "Concurrent viewers = 23,148 × 180s (3 min) ≈ 4.17 Million average concurrent streams",
        "Peak viewers (1.5x) ≈ 6.25 Million concurrent streams",
        "6.25M streams × 2.5 Mbps ≈ 15,625,000 Mbps ≈ 16 Tbps egress bandwidth",
      ],
    },
  ],
  "est-crawl-qps": [
    {
      prompt: "Estimate average page fetch throughput required to crawl 40 Billion pages per month (pages/sec)",
      parameterContext: "40 Billion pages per month, crawling runs continuously 24/7 (2.6 million seconds/month).",
      inputs: { pages: 40e9, secondsPerMonth: 2.6e6 },
      compute: (i) => i.pages / i.secondsPerMonth,
      stepByStepDerivation: [
        "40,000,000,000 pages ÷ 2,600,000 seconds/month",
        "≈ 15,385 pages/second",
        "Round to ~15,000 fetches/sec sustained (peak burst should support 30,000+).",
      ],
    },
    {
      prompt: "Estimate average page fetch throughput required to crawl 3 Billion pages per month (pages/sec)",
      parameterContext: "3 Billion pages per month, crawling runs continuously 24/7 (2.6 million seconds/month).",
      inputs: { pages: 3e9, secondsPerMonth: 2.6e6 },
      compute: (i) => i.pages / i.secondsPerMonth,
      stepByStepDerivation: [
        "3,000,000,000 pages ÷ 2,600,000 seconds/month",
        "≈ 1,154 pages/second",
        "Round to ~1,200 fetches/sec sustained.",
      ],
    },
  ],
  "est-crawl-storage": [
    {
      prompt: "Estimate monthly raw storage volume for 25 Billion web pages (in Petabytes)",
      parameterContext: "25 Billion pages per month, average compressed web page (HTML + metadata) = 200 KB.",
      inputs: { pages: 25e9, kb: 200 },
      compute: (i) => (i.pages * i.kb * 1e3) / 1e15,
      stepByStepDerivation: [
        "25 Billion pages × 200 KB = 5,000,000,000,000 KB",
        "5,000,000,000,000 KB = 5,000,000,000 MB = 5,000,000 GB = 5,000 TB",
        "5,000 TB = 5 PB of storage per month.",
      ],
    },
    {
      prompt: "Estimate monthly raw storage volume for 4 Billion web pages (in Petabytes)",
      parameterContext: "4 Billion pages per month, average compressed web page (HTML + metadata) = 150 KB.",
      inputs: { pages: 4e9, kb: 150 },
      compute: (i) => (i.pages * i.kb * 1e3) / 1e15,
      stepByStepDerivation: [
        "4 Billion pages × 150 KB = 600,000,000,000 KB",
        "600,000,000,000 KB = 600,000,000 MB = 600,000 GB = 600 TB",
        "600 TB = 0.6 PB of storage per month.",
      ],
    },
  ],
  "est-crawl-bloom": [
    {
      prompt: "Estimate RAM required for a Bloom Filter tracking 4B visited URLs with a 0.1% false positive rate (in GB)",
      parameterContext: "4 Billion visited URLs. A Bloom filter needs ~15 bits per element for a 0.1% false positive probability.",
      inputs: { urls: 4e9, bitsPerUrl: 15 },
      compute: (i) => (i.urls * i.bitsPerUrl) / 8 / 1e9,
      stepByStepDerivation: [
        "15 bits × 4,000,000,000 URLs = 60 Billion bits",
        "60 Billion bits ÷ 8 = 7.5 Billion bytes",
        "7.5 Billion bytes = 7.5 GB RAM",
      ],
    },
    {
      prompt: "Estimate RAM required for a Bloom Filter tracking 30B visited URLs with a 2% false positive rate (in GB)",
      parameterContext: "30 Billion visited URLs. A Bloom filter needs ~8 bits per element for a ~2% false positive probability.",
      inputs: { urls: 30e9, bitsPerUrl: 8 },
      compute: (i) => (i.urls * i.bitsPerUrl) / 8 / 1e9,
      stepByStepDerivation: [
        "8 bits × 30,000,000,000 URLs = 240 Billion bits",
        "240 Billion bits ÷ 8 = 30 Billion bytes",
        "30 Billion bytes = 30 GB RAM",
      ],
    },
  ],
  "est-rl-qps": [
    {
      parameterContext: "System processes 400,000 API requests/sec average, with a 3x peak burst factor.",
      inputs: { avg: 400000, peak: 3 },
      compute: (i) => i.avg * i.peak,
      stepByStepDerivation: [
        "400,000 requests/sec average × 3.0 peak multiplier",
        "= 1,200,000 requests/sec",
        "Total rate limiter throughput at peak = 1.2M checks/second.",
      ],
    },
    {
      parameterContext: "System processes 5,000,000 API requests/sec average, with a 1.5x peak burst factor.",
      inputs: { avg: 5000000, peak: 1.5 },
      compute: (i) => i.avg * i.peak,
      stepByStepDerivation: [
        "5,000,000 requests/sec average × 1.5 peak multiplier",
        "= 7,500,000 requests/sec",
        "Total rate limiter throughput at peak = 7.5M checks/second.",
      ],
    },
  ],
  "est-rl-ram": [
    {
      prompt: "Estimate Redis cluster RAM required to track 50M active sliding window counters (in GB)",
      parameterContext: "50 Million concurrent active client keys. Each Redis key-value counter + metadata overhead = 200 bytes.",
      inputs: { keys: 50e6, bytes: 200 },
      compute: (i) => (i.keys * i.bytes) / 1e9,
      stepByStepDerivation: [
        "50,000,000 keys × 200 bytes/key = 10,000,000,000 bytes",
        "10,000,000,000 bytes = 10,000 MB",
        "= 10 GB RAM",
      ],
    },
    {
      prompt: "Estimate Redis cluster RAM required to track 4M active sliding window counters (in GB)",
      parameterContext: "4 Million concurrent active client keys. Each Redis key-value counter + metadata overhead = 150 bytes.",
      inputs: { keys: 4e6, bytes: 150 },
      compute: (i) => (i.keys * i.bytes) / 1e9,
      stepByStepDerivation: [
        "4,000,000 keys × 150 bytes/key = 600,000,000 bytes",
        "600,000,000 bytes = 600 MB",
        "= 0.6 GB RAM",
      ],
    },
  ],
  "est-rl-bandwidth": [
    {
      parameterContext: "500,000 requests/sec, average Redis check request + response packet = 200 bytes.",
      inputs: { rps: 500000, bytes: 200 },
      compute: (i) => (i.rps * i.bytes * 8) / 1e9,
      stepByStepDerivation: [
        "500,000 req/sec × 200 bytes/req = 100,000,000 bytes/sec",
        "100 MB/sec × 8 bits/byte = 800 Mbps",
        "800 Mbps = 0.8 Gbps",
      ],
    },
    {
      parameterContext: "6,000,000 requests/sec, average Redis check request + response packet = 96 bytes.",
      inputs: { rps: 6000000, bytes: 96 },
      compute: (i) => (i.rps * i.bytes * 8) / 1e9,
      stepByStepDerivation: [
        "6,000,000 req/sec × 96 bytes/req = 576,000,000 bytes/sec",
        "576 MB/sec × 8 bits/byte = 4,608 Mbps",
        "4,608 Mbps ≈ 4.6 Gbps",
      ],
    },
  ],
  "est-ta-qps": [
    {
      parameterContext: "120,000 search queries/second, average user types 8 characters with instant typeahead enabled.",
      inputs: { searches: 120000, keystrokes: 8 },
      compute: (i) => i.searches * i.keystrokes,
      stepByStepDerivation: [
        "120,000 completed searches/sec × 8 keystrokes/search",
        "= 960,000 prefix lookups/sec",
        "Peak capacity must support ~960k QPS, served from in-memory caches.",
      ],
    },
    {
      parameterContext: "20,000 search queries/second, average user types 4 characters with instant typeahead enabled.",
      inputs: { searches: 20000, keystrokes: 4 },
      compute: (i) => i.searches * i.keystrokes,
      stepByStepDerivation: [
        "20,000 completed searches/sec × 4 keystrokes/search",
        "= 80,000 prefix lookups/sec",
        "Peak capacity must support ~80k QPS, served from in-memory caches.",
      ],
    },
  ],
  "est-ta-trie-ram": [
    {
      prompt: "Estimate memory required to store a Trie index of 500M unique search phrases with precomputed top 5 (in GB)",
      parameterContext: "500 Million unique phrases, average phrase length = 20 characters, top 5 suggestions cached at nodes. Estimated Trie node overhead = 200 bytes/phrase.",
      inputs: { phrases: 500e6, bytes: 200 },
      compute: (i) => (i.phrases * i.bytes) / 1e9,
      stepByStepDerivation: [
        "500,000,000 phrases × 200 bytes = 100,000,000,000 bytes",
        "100,000,000,000 bytes = 100 GB",
        "100 GB RAM must be sharded by prefix across several nodes.",
      ],
    },
    {
      prompt: "Estimate memory required to store a Trie index of 40M unique search phrases with precomputed top 5 (in GB)",
      parameterContext: "40 Million unique phrases, average phrase length = 20 characters, top 5 suggestions cached at nodes. Estimated Trie node overhead = 120 bytes/phrase.",
      inputs: { phrases: 40e6, bytes: 120 },
      compute: (i) => (i.phrases * i.bytes) / 1e9,
      stepByStepDerivation: [
        "40,000,000 phrases × 120 bytes = 4,800,000,000 bytes",
        "4,800,000,000 bytes = 4.8 GB",
        "4.8 GB RAM fits on a single server.",
      ],
    },
  ],
  "est-ta-bandwidth": [
    {
      prompt: "Estimate network bandwidth required to return top 5 suggestions at 600,000 QPS (in Gbps)",
      parameterContext: "600,000 lookups/sec, JSON response payload for top 5 phrases + metadata = 400 bytes.",
      inputs: { qps: 600000, bytes: 400 },
      compute: (i) => (i.qps * i.bytes * 8) / 1e9,
      stepByStepDerivation: [
        "600,000 req/sec × 400 bytes = 240,000,000 bytes/sec",
        "240 MB/sec × 8 bits/byte = 1,920,000,000 bits/sec",
        "= 1.92 Gbps (≈ 1.9 Gbps)",
      ],
    },
    {
      prompt: "Estimate network bandwidth required to return top 5 suggestions at 80,000 QPS (in Gbps)",
      parameterContext: "80,000 lookups/sec, JSON response payload for top 5 phrases + metadata = 150 bytes.",
      inputs: { qps: 80000, bytes: 150 },
      compute: (i) => (i.qps * i.bytes * 8) / 1e9,
      stepByStepDerivation: [
        "80,000 req/sec × 150 bytes = 12,000,000 bytes/sec",
        "12 MB/sec × 8 bits/byte = 96,000,000 bits/sec",
        "= 0.096 Gbps (≈ 96 Mbps)",
      ],
    },
  ],
  "est-notif-qps": [
    {
      parameterContext: "500 Million notifications/day, with a 5x peak burst multiplier during flash sales or breaking news.",
      inputs: { perDay: 500e6, peak: 5 },
      compute: (i) => (i.perDay / 86400) * i.peak,
      stepByStepDerivation: [
        "500M notifications ÷ 86,400 seconds ≈ 5,787 notifications/sec average",
        "Peak burst multiplier of 5x = 5,787 × 5 ≈ 28,935 events/sec",
        "≈ 29,000 events/sec at peak.",
      ],
    },
    {
      parameterContext: "30 Million notifications/day, with a 10x peak burst multiplier during flash sales or breaking news.",
      inputs: { perDay: 30e6, peak: 10 },
      compute: (i) => (i.perDay / 86400) * i.peak,
      stepByStepDerivation: [
        "30M notifications ÷ 86,400 seconds ≈ 347 notifications/sec average",
        "Peak burst multiplier of 10x = 347 × 10 ≈ 3,472 events/sec",
        "≈ 3,500 events/sec at peak.",
      ],
    },
  ],
  "est-notif-sms-cost": [
    {
      prompt: "Estimate daily provider cost if 6% of daily notifications are delivered via SMS (in USD)",
      parameterContext: "400M total notifications, 6% sent via SMS, Twilio SMS rate = $0.0075 per message.",
      inputs: { total: 400e6, smsPercent: 6, rate: 0.0075 },
      compute: (i) => i.total * (i.smsPercent / 100) * i.rate,
      stepByStepDerivation: [
        "400M total notifications × 6% SMS = 24,000,000 SMS messages/day",
        "24M messages × $0.0075/message = $180,000 USD per day",
        "≈ $5.4M/month, so prefer push notifications whenever possible.",
      ],
    },
    {
      prompt: "Estimate daily provider cost if 5% of daily notifications are delivered via SMS (in USD)",
      parameterContext: "30M total notifications, 5% sent via SMS, Twilio SMS rate = $0.02 per message.",
      inputs: { total: 30e6, smsPercent: 5, rate: 0.02 },
      compute: (i) => i.total * (i.smsPercent / 100) * i.rate,
      stepByStepDerivation: [
        "30M total notifications × 5% SMS = 1,500,000 SMS messages/day",
        "1.5M messages × $0.02/message = $30,000 USD per day",
        "≈ $900K/month, dominated by the per-message SMS rate.",
      ],
    },
  ],
  "est-notif-storage": [
    {
      parameterContext: "400M notifications/day, average audit log record (recipient, channel, timestamp, status) = 800 bytes.",
      inputs: { perDay: 400e6, bytes: 800 },
      compute: (i) => (i.perDay * i.bytes) / 1e9,
      stepByStepDerivation: [
        "400,000,000 records × 800 bytes = 320,000,000,000 bytes",
        "320,000,000,000 bytes = 320 GB/day",
        "320 GB/day × 30 days ≈ 9.6 TB/month.",
      ],
    },
    {
      parameterContext: "25M notifications/day, average audit log record (recipient, channel, timestamp, status) = 300 bytes.",
      inputs: { perDay: 25e6, bytes: 300 },
      compute: (i) => (i.perDay * i.bytes) / 1e9,
      stepByStepDerivation: [
        "25,000,000 records × 300 bytes = 7,500,000,000 bytes",
        "7,500,000,000 bytes = 7.5 GB/day",
        "7.5 GB/day × 30 days = 225 GB/month.",
      ],
    },
  ],
};
