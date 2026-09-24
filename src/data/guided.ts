import { GuidedScenario } from "@/types";

export const GUIDED_SCENARIOS: GuidedScenario[] = [
  {
    id: "design-twitter",
    title: "Design Twitter (X)",
    subtitle: "Master the 4-step framework: Requirements → Entities → APIs → Architecture",
    category: "Social Network & Feed",
    estimatedTime: "8 mins",
    xpReward: 150,
    problemStatement:
      "You are asked in a System Design interview: 'Design Twitter'. You have 45 minutes. Instead of jumping blindly into drawing boxes, structured thinking wins the offer.",
    requirementsDiscovery: {
      question: "Step 1: In your initial clarification with the interviewer, what should users be able to do in scope for MVP?",
      options: [
        {
          id: "req-opt-1",
          text: "Direct Video Calls & Live Audio Spaces with 50,000 listeners",
          isCorrect: false,
          feedback: "Premature scope creep! In an interview, always lock down core functional MVP capabilities before proposing heavy secondary streaming features.",
        },
        {
          id: "req-opt-2",
          text: "Post Tweets, Read Chronological/Home Feed, and Follow other users",
          isCorrect: true,
          feedback: "Spot on! The golden rule of Twitter design: (1) Post Tweet (Write path), (2) Read Feed (Read path), (3) Follow Graph.",
        },
        {
          id: "req-opt-3",
          text: "Build an ad auction bidding engine and machine learning recommender",
          isCorrect: false,
          feedback: "Too complex for MVP foundation. Focus on core user actions first.",
        },
        {
          id: "req-opt-4",
          text: "Only allow users to edit already posted tweets within 24 hours",
          isCorrect: false,
          feedback: "Edge case detail. You need the foundational write and fanout paths first.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Select the indispensable data entities required for the core data model:",
      availableEntities: [
        {
          id: "entity-user",
          name: "User",
          attributes: ["id: UUID", "username: string", "email: string", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "entity-tweet",
          name: "Tweet",
          attributes: ["id: UUID", "author_id: UUID", "content: text(280)", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "entity-follow",
          name: "Follow",
          attributes: ["follower_id: UUID", "followee_id: UUID", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "entity-like",
          name: "Like",
          attributes: ["user_id: UUID", "tweet_id: UUID", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "entity-blockchain",
          name: "CryptoWallet",
          attributes: ["wallet_hash: string", "balance: bigint"],
          isEssential: false,
        },
        {
          id: "entity-theme",
          name: "DarkThemePreferences",
          attributes: ["contrast_level: int", "accent_color: hex"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["entity-user", "entity-tweet", "entity-follow", "entity-like"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Define the core REST endpoints for MVP write and read paths:",
      availableApis: [
        {
          id: "api-post-tweet",
          method: "POST",
          path: "/api/v1/tweets",
          description: "Publishes a new tweet and triggers feed fan-out to followers.",
          isInitialCore: true,
        },
        {
          id: "api-get-feed",
          method: "GET",
          path: "/api/v1/feed?page=1&limit=20",
          description: "Fetches reverse-chronological timeline of tweets from followed users.",
          isInitialCore: true,
        },
        {
          id: "api-post-follow",
          method: "POST",
          path: "/api/v1/users/:id/follow",
          description: "Establishes a follow edge in social graph.",
          isInitialCore: true,
        },
        {
          id: "api-delete-backup",
          method: "DELETE",
          path: "/api/admin/raw-storage/purge",
          description: "Administrative bulk database purge.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["api-post-tweet", "api-get-feed", "api-post-follow"],
    },
    architectureDiscovery: {
      instruction: "Step 4: High-Level Architecture Assembly. Pick the required building blocks to handle 50,000 read QPS and low-latency feed generation.",
      requiredComponents: ["load_balancer", "server", "cache", "database"],
      explanation:
        "Twitter is extremely read-heavy (ratio ~100:1). Load Balancer distributes web traffic to stateless App Servers. Redis Caches pre-computed timeline feeds in RAM. PostgreSQL / DynamoDB stores user & tweet relational data persistently.",
    },
  },
  {
    id: "design-url-shortener",
    title: "Design TinyURL (URL Shortener)",
    subtitle: "High-throughput 100:1 read-to-write redirect infrastructure",
    category: "High Throughput Web Services",
    estimatedTime: "6 mins",
    xpReward: 140,
    problemStatement:
      "A classic interview benchmark: Given a long URL like `https://example.com/very/long/path?id=123`, generate a unique 7-character alias like `tinyurl.com/xyz1234` and redirect with sub-15ms latency.",
    requirementsDiscovery: {
      question: "Step 1: Which requirements represent the core functional scope?",
      options: [
        {
          id: "url-req-1",
          text: "Shorten Long URL into 7-char hash + HTTP 301/302 Redirect upon visit",
          isCorrect: true,
          feedback: "Exact match! 1. Generate short key for long URL. 2. Redirect short key back to long destination with high availability.",
        },
        {
          id: "url-req-2",
          text: "Full-page visual web archive crawler with OCR scanning",
          isCorrect: false,
          feedback: "Unrelated scope. Focus on the core mapping and redirect engine.",
        },
        {
          id: "url-req-3",
          text: "Host full website assets and run serverside PHP scripts on domain",
          isCorrect: false,
          feedback: "A URL shortener does not host third-party websites; it strictly performs key redirection.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Choose the primary entities required for URL persistence:",
      availableEntities: [
        {
          id: "url-entity-mapping",
          name: "UrlMapping",
          attributes: ["short_key: varchar(7) PRIMARY KEY", "original_url: text", "created_at: timestamp", "expires_at: timestamp"],
          isEssential: true,
        },
        {
          id: "url-entity-user",
          name: "UserAccount",
          attributes: ["user_id: UUID", "api_key: string", "rate_limit: int"],
          isEssential: true,
        },
        {
          id: "url-entity-printer",
          name: "PrinterSpool",
          attributes: ["job_id: int", "paper_tray: string"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["url-entity-mapping", "url-entity-user"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Select the essential public REST API endpoints:",
      availableApis: [
        {
          id: "url-api-create",
          method: "POST",
          path: "/api/v1/shorten",
          description: "Accepts JSON `{ longUrl: string }`, returns `{ shortUrl: string }`.",
          isInitialCore: true,
        },
        {
          id: "url-api-redirect",
          method: "GET",
          path: "/:shortKey",
          description: "Looks up key and responds with HTTP 302 Found redirect.",
          isInitialCore: true,
        },
        {
          id: "url-api-mining",
          method: "POST",
          path: "/api/crypto/proof-of-work",
          description: "Hash mining protocol endpoint.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["url-api-create", "url-api-redirect"],
    },
    architectureDiscovery: {
      instruction: "Step 4: Assemble the system. Over 99% of requests are GET redirects. What components are necessary?",
      requiredComponents: ["load_balancer", "server", "cache", "database"],
      explanation:
        "Because redirects follow the 80/20 Pareto principle (the top 20% of links account for 80% of redirects), caching hot shortKey->longUrl pairs in Redis RAM delivers sub-5ms redirects without overwhelming the relational database.",
    },
  },
];
