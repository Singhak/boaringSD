import { GuidedScenario } from "@/types";

export const GUIDED_SCENARIOS: GuidedScenario[] = [
  {
    id: "design-whatsapp",
    title: "Design WhatsApp",
    subtitle: "Real-time bi-directional messaging, WebSocket connections, and offline queuing",
    category: "Messaging & Real-Time Chat",
    estimatedTime: "8 mins",
    xpReward: 200,
    problemStatement:
      "You are tasked with designing WhatsApp: a globally distributed messaging platform serving 2 billion users. How do you deliver messages between two online clients in under ~100ms while properly handling offline users, delivery receipts, and connection state?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What belongs in the core functional MVP scope for real-time messaging?",
      options: [
        {
          id: "wa-req-1",
          text: "1-on-1 messages, delivery/read receipts, presence, and offline storage",
          isCorrect: true,
          feedback: "Perfect! Lock down the core communication loop first: send/receive messages, delivery/read acks, user presence, and durable offline queueing before tackling media or 1,000-person group chats.",
        },
        {
          id: "wa-req-2",
          text: "Group video calls for up to 32 people with end-to-end encryption",
          isCorrect: false,
          feedback: "Scope trap! It's a real WhatsApp feature, but calls run on a separate WebRTC media path (relays, jitter buffers, bandwidth adaptation) with very different constraints. Nail the text pipeline first; receipts and offline delivery depend on it.",
        },
        {
          id: "wa-req-3",
          text: "Server-side full-text search across each user's entire message history",
          isCorrect: false,
          feedback: "With end-to-end encryption the server only stores ciphertext, so it can't index message bodies. Search runs on-device. Server-side indexing would break the security model and isn't MVP.",
        },
        {
          id: "wa-req-4",
          text: "Photo, voice-note and video sharing with server-generated thumbnails",
          isCorrect: false,
          feedback: "Important for v2, but media rides on blob storage plus a CDN, with the message carrying only a pointer and key. Design the message pipeline first. With E2E encryption, thumbnails are generated on the sender's device, not the server.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the indispensable data entities required for messaging and presence:",
      availableEntities: [
        {
          id: "wa-entity-user",
          name: "User",
          attributes: ["id: UUID", "phone_number: string", "public_key: text", "last_seen: timestamp"],
          isEssential: true,
        },
        {
          id: "wa-entity-message",
          name: "Message",
          attributes: ["id: UUID", "chat_id: UUID", "sender_id: UUID", "recipient_id: UUID", "content_cipher: text", "status: enum(sent,delivered,read)", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "wa-entity-session",
          name: "UserSession",
          attributes: ["user_id: UUID", "gateway_server_id: string", "connection_id: string", "is_connected: boolean"],
          isEssential: true,
        },
        {
          id: "wa-entity-offline",
          name: "OfflineMessageQueue",
          attributes: ["message_id: UUID", "recipient_id: UUID", "queued_at: timestamp", "retry_count: int"],
          isEssential: true,
        },
        {
          id: "wa-entity-sticker",
          name: "MessageReaction",
          attributes: ["message_id: UUID", "user_id: UUID", "emoji: string"],
          isEssential: false,
        },
        {
          id: "wa-entity-theme",
          name: "GroupAdminRole",
          attributes: ["chat_id: UUID", "user_id: UUID", "role: enum(admin,member)"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["wa-entity-user", "wa-entity-message", "wa-entity-session", "wa-entity-offline"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Protocol & API Contracts. Identify the essential communication protocols and endpoints:",
      availableApis: [
        {
          id: "wa-api-ws",
          method: "GET",
          path: "/ws/v1/chat (WebSocket Upgrade)",
          description: "Full-duplex persistent TCP/WebSocket connection for instant message delivery and receipt frames.",
          isInitialCore: true,
        },
        {
          id: "wa-api-offline",
          method: "GET",
          path: "/api/v1/messages/sync?since=timestamp",
          description: "Pulls unacknowledged messages queued while the user device was offline or disconnected.",
          isInitialCore: true,
        },
        {
          id: "wa-api-ack",
          method: "POST",
          path: "/api/v1/messages/:id/receipt",
          description: "Emits delivered or read status update back to the sender via server push.",
          isInitialCore: true,
        },
        {
          id: "wa-api-ad-auction",
          method: "POST",
          path: "/api/v1/status",
          description: "Posts a 24-hour Status (story) update visible to the user's contacts.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["wa-api-ws", "wa-api-offline", "wa-api-ack"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the building blocks to sustain 10M concurrent WebSocket connections and fast delivery:",
      requiredComponents: ["load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "WhatsApp requires a Layer-4 Load Balancer to terminate long-lived TCP/WebSocket connections. Gateway Servers hold the long-lived sockets (stateful per connection, so a gateway crash forces its clients to reconnect elsewhere). Redis Cache stores live user sessions (User ID → Gateway ID) and presence. A distributed Message Queue (Kafka/RabbitMQ) routes cross-server messages. Cassandra/DynamoDB persists messages and buffers offline queues.",
    },
  },
  {
    id: "design-netflix",
    title: "Design Netflix",
    subtitle: "Global video streaming, adaptive bitrate chunking, and origin shielding",
    category: "Video & Content Streaming",
    estimatedTime: "8 mins",
    xpReward: 210,
    problemStatement:
      "You are designing Netflix: a global streaming service with 250M+ subscribers streaming petabytes of video data daily. How do you ingest raw video, transcode into multiple resolutions, and deliver buffer-free streaming worldwide while tracking user progress?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Scope. What are the indispensable functional requirements for video streaming?",
      options: [
        {
          id: "nf-req-1",
          text: "Upload, offline multi-bitrate transcoding, CDN playback, watch progress",
          isCorrect: true,
          feedback: "Accurate! Netflix separates the Control Plane (catalog browsing, user auth, watch checkpointing) from the Data Plane (CDN edge chunk delivery).",
        },
        {
          id: "nf-req-2",
          text: "Peer-assisted delivery between nearby viewers to offload CDN bandwidth",
          isCorrect: false,
          feedback: "Peer assist has been tried, but on TVs and phones it's unreliable (NAT traversal, weak upload bandwidth, battery), it complicates DRM, and you still need a CDN as the baseline. Netflix instead places caches (Open Connect) inside ISP networks.",
        },
        {
          id: "nf-req-3",
          text: "Transcode each stream on the fly at request time to fit the exact device",
          isCorrect: false,
          feedback: "Per-viewer real-time transcoding at 250M subscribers would need an enormous GPU/CPU fleet and adds startup delay. Encode a bitrate ladder once, offline, and let the player's ABR logic pick a rendition.",
        },
        {
          id: "nf-req-4",
          text: "Live sports streaming with sub-5-second latency and a live chat",
          isCorrect: false,
          feedback: "Live is a different pipeline: real-time encoding, short segments, and nothing to pre-position on edge caches. The core Netflix problem is on-demand, pre-encoded delivery.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Identify the primary entities required for video catalog and playback:",
      availableEntities: [
        {
          id: "nf-entity-video",
          name: "VideoTitle",
          attributes: ["id: UUID", "title: string", "synopsis: text", "release_year: int", "master_manifest_url: string"],
          isEssential: true,
        },
        {
          id: "nf-entity-chunk",
          name: "VideoChunk",
          attributes: ["id: UUID", "video_id: UUID", "resolution: enum(4k,1080p,720p)", "bitrate_kbps: int", "chunk_index: int", "s3_url: string"],
          isEssential: true,
        },
        {
          id: "nf-entity-progress",
          name: "WatchProgress",
          attributes: ["user_id: UUID", "video_id: UUID", "last_position_seconds: int", "completed: boolean", "updated_at: timestamp"],
          isEssential: true,
        },
        {
          id: "nf-entity-user",
          name: "SubscriberAccount",
          attributes: ["id: UUID", "email: string", "subscription_tier: string", "max_streams: int"],
          isEssential: true,
        },
        {
          id: "nf-entity-merch",
          name: "TitleRating",
          attributes: ["user_id: UUID", "video_id: UUID", "thumbs: enum(up,down)"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["nf-entity-video", "nf-entity-chunk", "nf-entity-progress", "nf-entity-user"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Core API Endpoints. Select the primary endpoints powering playback and transcode pipelines:",
      availableApis: [
        {
          id: "nf-api-manifest",
          method: "GET",
          path: "/api/v1/videos/:id/playback-manifest",
          description: "Generates master m3u8 playlist containing signed CDN chunk URLs for Adaptive Bitrate (ABR) streaming.",
          isInitialCore: true,
        },
        {
          id: "nf-api-heartbeat",
          method: "POST",
          path: "/api/v1/videos/:id/progress",
          description: "Client sends periodic playback checkpoint every 10s to sync resume position across devices.",
          isInitialCore: true,
        },
        {
          id: "nf-api-upload",
          method: "POST",
          path: "/api/v1/admin/videos/upload",
          description: "Ingests raw high-bitrate master file to object storage and enqueues transcode jobs.",
          isInitialCore: true,
        },
        {
          id: "nf-api-dvd",
          method: "GET",
          path: "/api/v1/profiles/:id/recommendations",
          description: "Returns personalized ranked rows from the ML recommendation service.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["nf-api-manifest", "nf-api-heartbeat", "nf-api-upload"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. What components are necessary to stream petabytes worldwide without origin collapse?",
      requiredComponents: ["cdn", "load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "CDN Edge Caching (Open Connect) absorbs 95%+ of video bandwidth by serving chunks near users. Load Balancers route metadata traffic to App Servers. Redis Caches hot catalog titles and active playback tokens. An Asynchronous Task Queue (SQS/Kafka) drives distributed worker fleets transcoding multi-bitrate video chunks. PostgreSQL stores durable billing, user, and catalog records.",
    },
  },
  {
    id: "design-uber",
    title: "Design Uber",
    subtitle: "High-frequency geospatial telemetry, driver dispatch, and dynamic trip matching",
    category: "Geospatial & Real-Time Mobility",
    estimatedTime: "9 mins",
    xpReward: 220,
    problemStatement:
      "You are asked to design Uber: a real-time ride hailing network with 5M active drivers sending GPS updates every 4 seconds. How do you find nearby available drivers in under 500ms and coordinate atomic ride dispatch without race conditions?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What constitutes the foundational ride-hailing MVP?",
      options: [
        {
          id: "ub-req-1",
          text: "Live driver locations, nearby-driver search, and atomic trip dispatch",
          isCorrect: true,
          feedback: "Direct hit! Driver GPS ingestion, spatial indexing (GeoHash / QuadTree), and trip lifecycle state transitions form the core dispatch engine.",
        },
        {
          id: "ub-req-2",
          text: "Surge pricing recomputed per city block every second",
          isCorrect: false,
          feedback: "Surge is real, but it's a pricing layer fed by supply and demand signals from the core dispatch system. Per-block, per-second recompute is over-engineering before matching even works.",
        },
        {
          id: "ub-req-3",
          text: "Ride pooling that matches several riders along overlapping routes",
          isCorrect: false,
          feedback: "Pooling is a hard routing and matching optimization that assumes single-rider dispatch already works. It's a v2 feature.",
        },
        {
          id: "ub-req-4",
          text: "Scheduled rides booked up to 30 days in advance",
          isCorrect: false,
          feedback: "Scheduled rides are a job-scheduling problem that ends by triggering a normal real-time dispatch. Build the real-time matching first.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the primary entities required for real-time ride matching:",
      availableEntities: [
        {
          id: "ub-entity-driver",
          name: "Driver",
          attributes: ["id: UUID", "name: string", "vehicle_plate: string", "status: enum(offline,available,busy)", "rating: float"],
          isEssential: true,
        },
        {
          id: "ub-entity-location",
          name: "DriverLocation",
          attributes: ["driver_id: UUID", "latitude: float", "longitude: float", "geohash: string(6)", "updated_at: timestamp"],
          isEssential: true,
        },
        {
          id: "ub-entity-trip",
          name: "Trip",
          attributes: ["id: UUID", "rider_id: UUID", "driver_id: UUID", "pickup_lat_lng: point", "dropoff_lat_lng: point", "status: enum(requested,accepted,en_route,completed)", "fare_cents: int"],
          isEssential: true,
        },
        {
          id: "ub-entity-rider",
          name: "Rider",
          attributes: ["id: UUID", "name: string", "phone: string", "payment_method_id: string"],
          isEssential: true,
        },
        {
          id: "ub-entity-music",
          name: "DriverEarningsStatement",
          attributes: ["driver_id: UUID", "week_start: date", "total_cents: int"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["ub-entity-driver", "ub-entity-location", "ub-entity-trip", "ub-entity-rider"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Core API Endpoints. Select the primary endpoints for location updates and ride booking:",
      availableApis: [
        {
          id: "ub-api-location",
          method: "POST",
          path: "/api/v1/drivers/location",
          description: "High-frequency GPS telemetry update: `{ lat, lng, bearing }` received every 4 seconds from driver apps.",
          isInitialCore: true,
        },
        {
          id: "ub-api-request-ride",
          method: "POST",
          path: "/api/v1/trips/request",
          description: "Rider requests ride; triggers geospatial query for top 5 closest available drivers.",
          isInitialCore: true,
        },
        {
          id: "ub-api-accept-ride",
          method: "POST",
          path: "/api/v1/trips/:id/accept",
          description: "Driver accepts dispatch; atomically transitions trip to accepted and locks driver status.",
          isInitialCore: true,
        },
        {
          id: "ub-api-lottery",
          method: "POST",
          path: "/api/v1/promotions/apply-code",
          description: "Applies a promo code discount to the rider's next trip.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["ub-api-location", "ub-api-request-ride", "ub-api-accept-ride"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the architecture capable of sub-second driver matching and location updates:",
      requiredComponents: ["load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "High-velocity GPS pings hit the Load Balancer and Location Ingestion Servers. Redis with Geospatial indexing (GEOADD / GEOSEARCH) or an In-Memory QuadTree stores live driver coordinates for sub-5ms neighbor queries. An Event Queue (Kafka) coordinates ride request broadcasts, dispatch timeouts, and push notifications. PostgreSQL handles ACID trip state transitions and payment auditing.",
    },
  },
  {
    id: "design-amazon-flash-sale",
    title: "Design Amazon Flash Sale",
    subtitle: "High-concurrency inventory reservation, atomic stock counters, and no-oversell checkout",
    category: "Commerce & High Concurrency",
    estimatedTime: "7 mins",
    xpReward: 200,
    problemStatement:
      "Design an Amazon Flash Sale checkout engine: 100,000 buyers attempt to purchase 1,000 limited Playstation consoles within 5 seconds. How do you prevent inventory overselling while keeping stock reservation under ~50ms and handling payment failures?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Constraints. What is the fundamental challenge of a Flash Sale?",
      options: [
        {
          id: "amz-req-1",
          text: "Atomic stock reservation, idempotent checkout, release on payment timeout",
          isCorrect: true,
          feedback: "Exactly right! Under high concurrency, one hot inventory row serializes every checkout on its lock. You need atomic stock reservation (e.g. a Redis Lua decrement or sharded counters) with leased TTLs that release unpaid stock.",
        },
        {
          id: "amz-req-2",
          text: "Accept every order, then cancel the extras once the warehouse reconciles stock",
          isCorrect: false,
          feedback: "Some retailers oversell and reconcile, but with 1,000 consoles and 100,000 buyers you'd cancel ~99% of orders after charging cards. That's a support and trust disaster. Stock has to be reserved at purchase time.",
        },
        {
          id: "amz-req-3",
          text: "Personalized accessory recommendations on the sale page to raise basket size",
          isCorrect: false,
          feedback: "Good for revenue, but it adds personalized load at the exact peak and does nothing for the core problem. At peak, serve a static, cached sale page.",
        },
        {
          id: "amz-req-4",
          text: "Serialize all 100,000 buyers through one row lock on the inventory table",
          isCorrect: false,
          feedback: "It won't oversell, but every buyer queues on one row. At ~5-10ms per transaction that's roughly 100-200 purchases/s, so most buyers time out, the connection pool fills, and 504s spread to other pages.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the primary entities required for inventory reservation and checkout:",
      availableEntities: [
        {
          id: "amz-entity-inventory",
          name: "ProductInventory",
          attributes: ["product_id: UUID", "total_stock: int", "available_stock: int", "version: int (Optimistic Lock)"],
          isEssential: true,
        },
        {
          id: "amz-entity-reservation",
          name: "StockReservation",
          attributes: ["reservation_id: UUID", "user_id: UUID", "product_id: UUID", "expires_at: timestamp", "status: enum(reserved,confirmed,expired)"],
          isEssential: true,
        },
        {
          id: "amz-entity-order",
          name: "OrderRecord",
          attributes: ["order_id: UUID", "user_id: UUID", "idempotency_key: string", "total_cents: int", "status: enum(pending,paid,failed)"],
          isEssential: true,
        },
        {
          id: "amz-entity-payment",
          name: "PaymentTransaction",
          attributes: ["transaction_id: UUID", "order_id: UUID", "gateway_ref: string", "status: string"],
          isEssential: true,
        },
        {
          id: "amz-entity-review",
          name: "RestockWaitlistEntry",
          attributes: ["user_id: UUID", "product_id: UUID", "joined_at: timestamp"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["amz-entity-inventory", "amz-entity-reservation", "amz-entity-order", "amz-entity-payment"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Core API Endpoints. Choose the endpoints that prevent double purchases and lock inventory safely:",
      availableApis: [
        {
          id: "amz-api-reserve",
          method: "POST",
          path: "/api/v1/flash-sale/reserve",
          description: "Atomically decrements temporary stock in Redis using Lua scripts; grants a 10-minute reservation lease.",
          isInitialCore: true,
        },
        {
          id: "amz-api-checkout",
          method: "POST",
          path: "/api/v1/flash-sale/checkout",
          description: "Confirms order using Idempotency Key, charges payment gateway, and persists permanent order record.",
          isInitialCore: true,
        },
        {
          id: "amz-api-stock",
          method: "GET",
          path: "/api/v1/flash-sale/stock/:productId",
          description: "Returns cached live inventory count for UI real-time counter.",
          isInitialCore: true,
        },
        {
          id: "amz-api-survey",
          method: "POST",
          path: "/api/v1/flash-sale/notify-me",
          description: "Subscribes a buyer who missed out to restock email alerts.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["amz-api-reserve", "amz-api-checkout", "amz-api-stock"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the stack capable of preventing deadlocks and overselling during a 100x traffic spike:",
      requiredComponents: ["load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "The Load Balancer incorporates rate-limiting to protect against bot scripts. Stateless Checkout Servers execute atomic stock reservations in Redis RAM via atomic Lua scripts (`redis.call('DECR')`), shielding the database from 100k QPS locks. A Message Queue decouples payment webhooks, invoice generation, and fulfillment dispatch. A transactional ACID Database (PostgreSQL/Aurora) maintains immutable order ledgers.",
    },
  },
  {
    id: "design-instagram",
    title: "Design Instagram Feed",
    subtitle: "Hybrid push/pull fan-out, image delivery caching, and social graph timeline generation",
    category: "Social Media & Feed",
    estimatedTime: "8 mins",
    xpReward: 190,
    problemStatement:
      "Design Instagram's home timeline feed: 500 Million Daily Active Users browsing photos and videos. How do you generate personalized feeds in sub-200ms when ordinary users have 200 followers but celebrities like Cristiano Ronaldo have 600 Million followers?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Scope. What is the fundamental requirement for the Instagram home feed?",
      options: [
        {
          id: "ig-req-1",
          text: "Post photos, follow users, and load a fast ranked or chronological feed",
          isCorrect: true,
          feedback: "Spot on! The core social engine consists of photo publishing (write path), following users (graph path), and viewing the aggregated feed (read path).",
        },
        {
          id: "ig-req-2",
          text: "Live video broadcasts to followers with real-time comments",
          isCorrect: false,
          feedback: "Instagram Live is a separate real-time media pipeline (ingest, transcoding, low-latency delivery). It doesn't help you design the photo timeline, which is the core problem here.",
        },
        {
          id: "ig-req-3",
          text: "Direct messages between users with typing indicators and read receipts",
          isCorrect: false,
          feedback: "DMs are a separate messaging system (think WhatsApp: persistent connections, per-conversation ordering). Different data model, different scaling problem, not the feed.",
        },
        {
          id: "ig-req-4",
          text: "Build each feed on app open by joining follows with posts across all users",
          isCorrect: false,
          feedback: "Fan-out-on-read with a SQL join means scanning recent posts from hundreds of followees on every open. At ~300,000 feed QPS, DB CPU and latency explode. Precompute feeds for normal users (fan-out on write) and merge in celebrity posts at read time.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Identify the primary entities for Instagram's feed generation:",
      availableEntities: [
        {
          id: "ig-entity-user",
          name: "UserProfile",
          attributes: ["id: UUID", "username: string", "follower_count: int", "is_celebrity: boolean"],
          isEssential: true,
        },
        {
          id: "ig-entity-post",
          name: "Post",
          attributes: ["id: UUID", "author_id: UUID", "media_url: string", "caption: text", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "ig-entity-follow",
          name: "FollowEdge",
          attributes: ["follower_id: UUID", "followee_id: UUID", "created_at: timestamp"],
          isEssential: true,
        },
        {
          id: "ig-entity-feed-cache",
          name: "UserFeedCache",
          attributes: ["user_id: UUID", "post_ids: list<UUID>", "last_refreshed: timestamp"],
          isEssential: true,
        },
        {
          id: "ig-entity-filter",
          name: "StoryItem",
          attributes: ["id: UUID", "author_id: UUID", "media_url: string", "expires_at: timestamp"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["ig-entity-user", "ig-entity-post", "ig-entity-follow", "ig-entity-feed-cache"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Core API Endpoints. Select the primary endpoints for publishing and feed consumption:",
      availableApis: [
        {
          id: "ig-api-post",
          method: "POST",
          path: "/api/v1/posts",
          description: "Uploads media metadata and dispatches async feed fan-out to followers.",
          isInitialCore: true,
        },
        {
          id: "ig-api-feed",
          method: "GET",
          path: "/api/v1/feed?page=1&limit=20",
          description: "Fetches pre-computed list of post IDs from Redis cache and hydrates post metadata.",
          isInitialCore: true,
        },
        {
          id: "ig-api-follow",
          method: "POST",
          path: "/api/v1/users/:id/follow",
          description: "Creates follow relation in social graph and invalidates recipient's feed cache.",
          isInitialCore: true,
        },
        {
          id: "ig-api-print",
          method: "GET",
          path: "/api/v1/explore",
          description: "Returns a personalized Explore grid of posts from accounts the user doesn't follow.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["ig-api-post", "ig-api-feed", "ig-api-follow"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the components needed to solve the Celebrity Fan-out problem and deliver sub-200ms feeds:",
      requiredComponents: ["cdn", "load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "Edge CDN caches image and video files close to users. The Load Balancer directs traffic to App Servers. Redis RAM Cache stores pre-computed feed timelines for active users. Message Queues (Kafka) handle background Fan-out-on-Write for normal users (pushing post IDs into followers' feeds). For celebrities with millions of followers, a Hybrid Pull model merges celebrity posts at query time to prevent queue bottlenecks. Sharded Databases store persistent post and graph data.",
    },
  },
  {
    id: "design-pastebin",
    title: "Design Pastebin",
    subtitle: "High-volume text storage, Base62 hash generation, and automated TTL expiration",
    category: "Utility & Document Persistence",
    estimatedTime: "6 mins",
    xpReward: 160,
    problemStatement:
      "Design Pastebin: a text snippet storage tool where users paste plain text or code, receive a short URL (e.g., `pastebin.com/aB39z`), and can specify an expiration time (10 minutes, 1 day, never). How do you scale storage and ensure sub-10ms retrieval?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Scope. What are the indispensable functional requirements of a text storage paste service?",
      options: [
        {
          id: "pb-req-1",
          text: "Store a paste, return a unique short key, fetch by key, expire on TTL",
          isCorrect: true,
          feedback: "Spot on! The core functionality is fast key-based text retrieval and automated TTL purging.",
        },
        {
          id: "pb-req-2",
          text: "Real-time collaborative editing of a paste by multiple users",
          isCorrect: false,
          feedback: "That's a collaborative editor (OT/CRDTs, presence, persistent connections). Pastes are write-once, read-many blobs, which is why they're so easy to cache.",
        },
        {
          id: "pb-req-3",
          text: "Run submitted code in a sandbox and display its output next to the paste",
          isCorrect: false,
          feedback: "Code execution needs isolated sandboxes, CPU/memory limits and abuse controls (crypto miners, fork bombs). That's a separate product, like an online judge, not paste storage.",
        },
        {
          id: "pb-req-4",
          text: "Full-text search across all public pastes",
          isCorrect: false,
          feedback: "Needs a separate search index (e.g. Elasticsearch) and raises abuse and privacy issues, since pastes often leak secrets. Not core to store-and-retrieve-by-key.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the primary entities for text paste persistence:",
      availableEntities: [
        {
          id: "pb-entity-paste",
          name: "PasteRecord",
          attributes: ["short_key: varchar(8) PRIMARY KEY", "storage_path: string", "user_id: UUID?", "created_at: timestamp", "expires_at: timestamp", "size_bytes: int"],
          isEssential: true,
        },
        {
          id: "pb-entity-key-gen",
          name: "PreGeneratedKeyRange",
          attributes: ["range_start: bigint", "range_end: bigint", "server_id: string"],
          isEssential: true,
        },
        {
          id: "pb-entity-user",
          name: "Account",
          attributes: ["id: UUID", "api_key: string", "tier: enum(free,pro)"],
          isEssential: true,
        },
        {
          id: "pb-entity-font",
          name: "PasteViewAnalytics",
          attributes: ["short_key: varchar(8)", "view_count: int", "last_viewed_at: timestamp"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["pb-entity-paste", "pb-entity-key-gen", "pb-entity-user"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Core API Endpoints. Select the primary endpoints for creating and viewing pastes:",
      availableApis: [
        {
          id: "pb-api-create",
          method: "POST",
          path: "/api/v1/pastes",
          description: "Accepts text payload and optional TTL; returns short key URL.",
          isInitialCore: true,
        },
        {
          id: "pb-api-get",
          method: "GET",
          path: "/:shortKey",
          description: "Fetches paste text content; returns HTTP 404/410 if expired.",
          isInitialCore: true,
        },
        {
          id: "pb-api-delete",
          method: "DELETE",
          path: "/api/v1/pastes/:shortKey",
          description: "Deletes paste before expiration if authenticated creator requests it.",
          isInitialCore: true,
        },
        {
          id: "pb-api-fax",
          method: "POST",
          path: "/api/v1/pastes/:shortKey/fork",
          description: "Creates an editable copy of an existing paste under a new key.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["pb-api-create", "pb-api-get", "pb-api-delete"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the components needed for 100M pastes with sub-10ms lookup and TTL cleanup:",
      requiredComponents: ["load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "The Load Balancer distributes reads and writes across stateless App Servers. Redis Caches hot pastes (the top 20% most accessed) in RAM for sub-5ms lookups. An Object Store (S3 / Blob) or NoSQL storage holds the raw text bodies. PostgreSQL/DynamoDB holds metadata and expiration indexes. An Asynchronous Worker Queue periodically purges expired pastes from storage without impacting active read traffic.",
    },
  },
  {
    id: "design-twitter",
    title: "Design Twitter (X)",
    subtitle: "Master the 4-step framework: Requirements → Entities → APIs → Architecture",
    category: "Social Network & Timeline",
    estimatedTime: "8 mins",
    xpReward: 150,
    problemStatement:
      "You are asked in a System Design interview: 'Design Twitter'. You have 45 minutes. Instead of jumping blindly into drawing boxes, structured thinking wins the offer.",
    requirementsDiscovery: {
      question: "Step 1: In your initial clarification with the interviewer, what should users be able to do in scope for MVP?",
      options: [
        {
          id: "req-opt-1",
          text: "Direct messages and live audio Spaces with up to 50,000 listeners",
          isCorrect: false,
          feedback: "Premature scope creep! DMs are a separate messaging system and Spaces is real-time audio streaming. In an interview, lock down the core post/read/follow loop before proposing heavy secondary features.",
        },
        {
          id: "req-opt-2",
          text: "Post Tweets, Read Chronological/Home Feed, and Follow other users",
          isCorrect: true,
          feedback: "Spot on! The golden rule of Twitter design: (1) Post Tweet (Write path), (2) Read Feed (Read path), (3) Follow Graph.",
        },
        {
          id: "req-opt-3",
          text: "An ad auction engine plus an ML-ranked 'For You' timeline",
          isCorrect: false,
          feedback: "Ranking is a layer on top of candidate posts pulled from the follow graph, and ads need auctions and budget pacing. Both assume posting and the basic feed already exist.",
        },
        {
          id: "req-opt-4",
          text: "Let users edit a tweet within 30 minutes of posting it",
          isCorrect: false,
          feedback: "Edit needs versioning plus either re-fan-out or read-time lookup of the latest version. It's a fair follow-up, but only after the core write and fan-out paths exist.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the indispensable data entities required for the core data model:",
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
          name: "TrendingHashtag",
          attributes: ["hashtag: string", "window_start: timestamp", "tweet_count: int"],
          isEssential: false,
        },
        {
          id: "entity-theme",
          name: "DirectMessage",
          attributes: ["id: UUID", "sender_id: UUID", "recipient_id: UUID", "body: text"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["entity-user", "entity-tweet", "entity-follow", "entity-like"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Core API Endpoints. Define the core REST endpoints for MVP write and read paths:",
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
          method: "GET",
          path: "/api/v1/search?q=",
          description: "Full-text search across all public tweets.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["api-post-tweet", "api-get-feed", "api-post-follow"],
    },
    architectureDiscovery: {
      instruction: "Step 4: High-Level Architecture Assembly. Pick the required building blocks to handle 50,000 read QPS and low-latency feed generation:",
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
          text: "Click analytics dashboard with per-link geography and referrer breakdowns",
          isCorrect: false,
          feedback: "Valuable (it's what paid shorteners sell), but it's an async pipeline: log each click to a queue and aggregate offline. It's v2 and must never slow the redirect path.",
        },
        {
          id: "url-req-3",
          text: "Custom vanity aliases and branded short domains for every user",
          isCorrect: false,
          feedback: "Custom aliases are a small add-on (a uniqueness check on the key space), and branded domains add DNS and TLS certificate management. Neither is the core shorten-and-redirect loop.",
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
          name: "LinkClickEvent",
          attributes: ["short_key: varchar(7)", "clicked_at: timestamp", "country: string", "referrer: string"],
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
          method: "GET",
          path: "/api/v1/links/:shortKey/stats",
          description: "Returns daily click counts for a link.",
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
  {
    id: "design-rate-limiter",
    title: "Design a Distributed Rate Limiter",
    subtitle: "Token buckets in shared memory, consistent limits across 40 gateways, and fail-open safety",
    category: "Infrastructure & Traffic Control",
    estimatedTime: "7 mins",
    xpReward: 200,
    problemStatement:
      "Your public API gateway runs on 40 nodes and handles 2M requests/s. Each API key gets a plan limit (e.g. 1,000 requests/minute with bursts up to 100). How do you enforce the same limit no matter which node a request lands on, while adding under 1 ms p99 and never taking the API down if the limiter itself breaks?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What belongs in the core scope of the rate limiter?",
      options: [
        {
          id: "rl-req-1",
          text: "Each gateway node enforces the full per-key limit with its own in-memory counter",
          isCorrect: false,
          feedback: "Fast, but with 40 nodes behind a round-robin balancer a client effectively gets up to 40x its limit (40,000 req/min instead of 1,000). Local counters are a good first tier for obvious floods, not the source of truth.",
        },
        {
          id: "rl-req-2",
          text: "Shared per-key limits on every node, 429 + Retry-After, <1 ms added",
          isCorrect: true,
          feedback: "Locked in. The limit must be global per key, rejections must tell well-behaved clients when to come back, and the check sits on every request, so its latency budget is tiny. Also decide the failure policy up front: fail open for most APIs.",
        },
        {
          id: "rl-req-3",
          text: "Exact counts via a transactional increment on a Postgres row per API key",
          isCorrect: false,
          feedback: "Correct counts, wrong tool. 2M increments/s turn hot keys into row-lock queues, and each check costs a few ms of commit latency. Counters belong in an in-memory store with atomic ops.",
        },
        {
          id: "rl-req-4",
          text: "Queue over-limit requests and replay them once the key has quota again",
          isCorrect: false,
          feedback: "That's traffic shaping, not limiting. Queues grow without bound during an abusive burst, held requests time out anyway, and clients retry on top. Reject fast with 429 and let the client back off.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the entities the limiter needs to decide allow or deny:",
      availableEntities: [
        {
          id: "rl-entity-rule",
          name: "RateLimitRule",
          attributes: ["id: UUID", "plan: enum(free,pro,enterprise)", "route_pattern: string", "refill_per_sec: float", "burst_capacity: int"],
          isEssential: true,
        },
        {
          id: "rl-entity-bucket",
          name: "TokenBucketState",
          attributes: ["bucket_key: string (api_key:route)", "tokens: float", "last_refill_ms: bigint", "ttl_seconds: int"],
          isEssential: true,
        },
        {
          id: "rl-entity-client",
          name: "ApiClient",
          attributes: ["api_key: string", "account_id: UUID", "plan: enum(free,pro,enterprise)", "overrides: json"],
          isEssential: true,
        },
        {
          id: "rl-entity-log",
          name: "RequestAuditLog",
          attributes: ["request_id: UUID", "api_key: string", "route: string", "decision: enum(allow,deny)", "at: timestamp"],
          isEssential: false,
        },
        {
          id: "rl-entity-invoice",
          name: "UsageInvoice",
          attributes: ["account_id: UUID", "month: date", "billable_requests: bigint", "amount_cents: int"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["rl-entity-rule", "rl-entity-bucket", "rl-entity-client"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: API Contracts. Select the endpoints the limiter must expose for the MVP:",
      availableApis: [
        {
          id: "rl-api-check",
          method: "POST",
          path: "/internal/v1/ratelimit/check",
          description: "Gateway sends `{ key, route, cost }`; returns allow/deny plus remaining tokens and reset time for the X-RateLimit headers.",
          isInitialCore: true,
        },
        {
          id: "rl-api-rules",
          method: "PUT",
          path: "/api/v1/rate-limit-rules/:id",
          description: "Creates or updates a plan's limit; gateways pick up the change within ~30 s via a cached rules snapshot.",
          isInitialCore: true,
        },
        {
          id: "rl-api-quota",
          method: "GET",
          path: "/api/v1/clients/:apiKey/quota",
          description: "Lets a customer see how much of their current window they have left.",
          isInitialCore: true,
        },
        {
          id: "rl-api-report",
          method: "GET",
          path: "/api/v1/analytics/throttled?range=30d",
          description: "Dashboard of which keys were throttled most over the last month.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["rl-api-check", "rl-api-rules", "rl-api-quota"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the components that give one consistent limit across 40 gateways:",
      requiredComponents: ["load_balancer", "server", "cache", "database"],
      explanation:
        "The Load Balancer spreads traffic over the gateway Servers, which run the limiter in-process. Bucket state lives in a sharded Redis Cluster: a Lua script refills and decrements the token bucket atomically in one round-trip (~0.3-0.8 ms in-region), keyed by api_key:route so each key lands on one shard. Rules live in a small Database and are cached in each gateway's memory, so rule reads never hit the network. If Redis is unreachable the gateway fails open (or falls back to a conservative local limit) instead of rejecting everyone. A sliding-window counter is a fine alternative when you need smoother edges than fixed windows.",
    },
  },
  {
    id: "design-kv-store",
    title: "Design a Distributed Key-Value Store",
    subtitle: "Consistent hashing, N-way replication, R+W>N quorums, hinted handoff, and anti-entropy repair",
    category: "Storage & Databases",
    estimatedTime: "10 mins",
    xpReward: 240,
    problemStatement:
      "Design a Dynamo-style key-value store holding 50 TB across 60 nodes in 3 availability zones, serving 500k operations/s at p99 under 10 ms. It must keep accepting writes when a node or even a whole AZ is down. How do you place data, replicate it, and heal after failures?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What is the core scope of a highly available key-value store?",
      options: [
        {
          id: "kv-req-1",
          text: "Multi-key ACID transactions and secondary indexes on fields inside values",
          isCorrect: false,
          feedback: "Those turn a KV store into a database. Cross-partition transactions need 2PC or consensus on every write, which blocks when a participant is down, exactly what 'always writable' rules out. Keep the API to single-key get/put/delete.",
        },
        {
          id: "kv-req-2",
          text: "One leader node for the whole cluster so every read is linearizable",
          isCorrect: false,
          feedback: "A single leader caps throughput at one machine and stops all writes while a new one is elected. Per-partition leaders with Raft are a valid design, but this brief prioritises availability, which points to leaderless quorums.",
        },
        {
          id: "kv-req-3",
          text: "Single-key get/put, partitioning, N-way replicas, quorums, and repair",
          isCorrect: true,
          feedback: "That's the core. Decide how keys map to nodes, how many copies exist, how many acks a read and write need (R and W), and how replicas that missed writes catch up. Everything else builds on those four.",
        },
        {
          id: "kv-req-4",
          text: "Keep the full dataset in RAM on every node and rebuild from peers on restart",
          isCorrect: false,
          feedback: "50 TB doesn't fit in RAM on one node, and full copies everywhere waste 60x the storage. Each node owns a slice on disk (commit log + LSM tree) with hot keys in the page cache.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the structures every storage node needs:",
      availableEntities: [
        {
          id: "kv-entity-record",
          name: "VersionedRecord",
          attributes: ["key: bytes", "value: bytes", "version: vector_clock | hlc_timestamp", "tombstone: boolean"],
          isEssential: true,
        },
        {
          id: "kv-entity-ring",
          name: "TokenRing",
          attributes: ["vnode_token: uint64", "owner_node_id: string", "zone: string", "ring_version: int"],
          isEssential: true,
        },
        {
          id: "kv-entity-member",
          name: "NodeMembership",
          attributes: ["node_id: string", "address: string", "status: enum(up,suspect,down)", "heartbeat_gen: int"],
          isEssential: true,
        },
        {
          id: "kv-entity-hint",
          name: "HintedWrite",
          attributes: ["intended_node_id: string", "key: bytes", "value: bytes", "version: vector_clock", "stored_at: timestamp"],
          isEssential: true,
        },
        {
          id: "kv-entity-merkle",
          name: "MerkleRangeTree",
          attributes: ["token_range: (start,end)", "leaf_hashes: list<bytes>", "root_hash: bytes", "built_at: timestamp"],
          isEssential: true,
        },
        {
          id: "kv-entity-index",
          name: "SecondaryIndexEntry",
          attributes: ["field_name: string", "field_value: bytes", "primary_key: bytes"],
          isEssential: false,
        },
        {
          id: "kv-entity-schema",
          name: "TableSchema",
          attributes: ["table: string", "columns: list<(name,type)>", "primary_key: string"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["kv-entity-record", "kv-entity-ring", "kv-entity-member", "kv-entity-hint", "kv-entity-merkle"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: API Contracts. Select the client operations for the MVP:",
      availableApis: [
        {
          id: "kv-api-get",
          method: "GET",
          path: "/v1/kv/:key?r=2",
          description: "Coordinator reads from R of the N replicas, returns the newest version (or siblings) and repairs stale replicas in the background.",
          isInitialCore: true,
        },
        {
          id: "kv-api-put",
          method: "PUT",
          path: "/v1/kv/:key?w=2",
          description: "Writes value with the version context from the last read; succeeds once W replicas have it on their commit log.",
          isInitialCore: true,
        },
        {
          id: "kv-api-delete",
          method: "DELETE",
          path: "/v1/kv/:key",
          description: "Writes a tombstone (not an immediate erase) so replicas that missed the delete don't resurrect the key.",
          isInitialCore: true,
        },
        {
          id: "kv-api-scan",
          method: "GET",
          path: "/v1/kv?prefix=user:42&limit=100",
          description: "Range scan by key prefix. Hash partitioning scatters adjacent keys, so this hits every node.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["kv-api-get", "kv-api-put", "kv-api-delete"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble a store that survives the loss of an AZ without refusing writes:",
      requiredComponents: ["load_balancer", "server", "database", "replica"],
      explanation:
        "Clients hit a Load Balancer (or a partition-aware client) that reaches any coordinator Server. Keys are placed with consistent hashing over ~256 virtual nodes per machine, so adding a node moves only ~1/60 of the data. Each key is stored on N=3 storage nodes in different AZs (Database + Replicas), each using a commit log plus LSM tree. With W=2 and R=2, R+W>N means every read quorum overlaps the latest write quorum. When a replica is down, a sloppy quorum writes to the next healthy node with a hint, and hinted handoff replays it on recovery (note: sloppy quorums weaken the R+W>N overlap until hints drain). Read repair fixes stale copies on the read path, and background anti-entropy compares Merkle trees per token range so only divergent ranges are streamed. Gossip spreads membership and failure suspicion.",
    },
  },
  {
    id: "design-payments-ledger",
    title: "Design a Payments Ledger",
    subtitle: "Double-entry bookkeeping, idempotency keys, effectively-once processing, and reconciliation",
    category: "Fintech & Correctness",
    estimatedTime: "9 mins",
    xpReward: 230,
    problemStatement:
      "Design the ledger for a payments platform processing 3,000 payments/s at peak. Mobile clients retry on timeouts, the card processor sometimes sends the same webhook twice or hours late, and finance must match a daily settlement file to the cent. How do you guarantee money is never created, lost, or charged twice?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What is the core scope for a correct payments ledger?",
      options: [
        {
          id: "pay-req-1",
          text: "A mutable balance column per account, updated in place on every payment",
          isCorrect: false,
          feedback: "It's how many first versions start, and it breaks audits: there's no record of why a balance changed, concurrent updates can overwrite each other, and you can't reconcile against the processor. Balances should be derived from immutable entries.",
        },
        {
          id: "pay-req-2",
          text: "Double-entry postings, idempotency keys, async calls, daily reconciliation",
          isCorrect: true,
          feedback: "Right. Every movement is a debit and a matching credit that sum to zero, retries with the same idempotency key return the stored result, calls to the processor happen off the request path, and a daily job proves the ledger matches the outside world.",
        },
        {
          id: "pay-req-3",
          text: "Exactly-once delivery guaranteed end to end between us and the card network",
          isCorrect: false,
          feedback: "Over an unreliable network nobody can guarantee exactly-once delivery: a timeout can't tell you whether the charge happened. What you can build is at-least-once delivery plus idempotent processing, which looks exactly-once from the outside.",
        },
        {
          id: "pay-req-4",
          text: "Two-phase commit spanning our database, the card processor, and the bank",
          isCorrect: false,
          feedback: "External processors and banks don't join your XA transaction, and 2PC blocks when any participant stalls. Use a saga: record intent locally, call the processor with its idempotency key, and post or reverse entries when the result arrives.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the entities needed to move money correctly and prove it:",
      availableEntities: [
        {
          id: "pay-entity-account",
          name: "LedgerAccount",
          attributes: ["id: UUID", "owner_id: UUID", "type: enum(asset,liability,revenue,expense)", "currency: char(3)"],
          isEssential: true,
        },
        {
          id: "pay-entity-journal",
          name: "JournalEntry",
          attributes: ["id: UUID", "payment_id: UUID", "description: string", "created_at: timestamp", "reverses_entry_id: UUID?"],
          isEssential: true,
        },
        {
          id: "pay-entity-posting",
          name: "Posting",
          attributes: ["journal_entry_id: UUID", "account_id: UUID", "direction: enum(debit,credit)", "amount_minor: bigint", "currency: char(3)"],
          isEssential: true,
        },
        {
          id: "pay-entity-idem",
          name: "IdempotencyRecord",
          attributes: ["key: string UNIQUE", "request_hash: bytes", "response_body: json", "status: enum(in_progress,done)", "expires_at: timestamp"],
          isEssential: true,
        },
        {
          id: "pay-entity-settlement",
          name: "SettlementLine",
          attributes: ["processor_ref: string", "amount_minor: bigint", "settled_on: date", "matched_journal_id: UUID?"],
          isEssential: true,
        },
        {
          id: "pay-entity-points",
          name: "RewardPointsBalance",
          attributes: ["user_id: UUID", "points: int", "tier: enum(silver,gold)"],
          isEssential: false,
        },
        {
          id: "pay-entity-statement",
          name: "MonthlyStatementPdf",
          attributes: ["account_id: UUID", "month: date", "pdf_url: string"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["pay-entity-account", "pay-entity-journal", "pay-entity-posting", "pay-entity-idem", "pay-entity-settlement"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: API Contracts. Select the endpoints that keep the ledger correct under retries:",
      availableApis: [
        {
          id: "pay-api-create",
          method: "POST",
          path: "/api/v1/payments (Idempotency-Key header)",
          description: "Creates a payment once per key; a retry with the same key returns the original response instead of charging again.",
          isInitialCore: true,
        },
        {
          id: "pay-api-balance",
          method: "GET",
          path: "/api/v1/accounts/:id/balance",
          description: "Returns the balance derived from postings (served from a snapshot plus postings since).",
          isInitialCore: true,
        },
        {
          id: "pay-api-webhook",
          method: "POST",
          path: "/webhooks/processor",
          description: "Receives capture/refund events; dedupes on the processor's event id before posting entries.",
          isInitialCore: true,
        },
        {
          id: "pay-api-edit",
          method: "PUT",
          path: "/api/v1/postings/:id",
          description: "Edits the amount on an existing posting so support can fix a mistaken charge.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["pay-api-create", "pay-api-balance", "pay-api-webhook"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble the stack that survives retries, duplicates, and processor outages:",
      requiredComponents: ["load_balancer", "server", "queue", "database"],
      explanation:
        "A Load Balancer fronts stateless payment Servers. PostgreSQL is the source of truth: a journal entry and its postings are written in one ACID transaction with a check that debits equal credits, and the idempotency key has a UNIQUE constraint, so a concurrent retry fails the insert instead of double-posting. The ledger is append-only: mistakes are fixed with a reversing entry, never an UPDATE. A transactional outbox publishes 'charge requested' to a Queue (Kafka); workers call the processor with its own idempotency key and retry with backoff, so delivery is at-least-once while processing is effectively-once. Webhooks are deduped by event id. A nightly reconciliation job matches SettlementLines to journal entries and parks any mismatch in a suspense account for a human to resolve.",
    },
  },
  {
    id: "design-web-crawler",
    title: "Design a Web Crawler",
    subtitle: "URL frontier, per-host politeness, Bloom-filter dedupe, and crawler-trap defence",
    category: "Data Pipelines & Search",
    estimatedTime: "9 mins",
    xpReward: 220,
    problemStatement:
      "Design a crawler that fetches 1 billion pages a month (~400 pages/s average, ~1,000/s peak, ~100 KB each) to feed a search index. It must obey robots.txt, hit no host more than once per second, avoid refetching URLs it has seen, and not get stuck in infinite calendar pages. How do you build it?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What belongs in the crawler's core scope?",
      options: [
        {
          id: "wc-req-1",
          text: "Render every page's JavaScript in headless Chrome before extracting links",
          isCorrect: false,
          feedback: "Rendering costs roughly 10-50x the CPU and time of a plain HTTP fetch. Most pages expose their links in raw HTML, so render selectively (for hosts known to need it) as a later tier.",
        },
        {
          id: "wc-req-2",
          text: "Fetch breadth-first from one global FIFO queue as fast as bandwidth allows",
          isCorrect: false,
          feedback: "Links cluster by site, so a plain FIFO sends bursts of requests to the same host. You'd break the 1 req/s politeness rule within seconds and get your IPs blocked. The frontier has to be organised per host.",
        },
        {
          id: "wc-req-3",
          text: "Prioritised frontier, per-host politeness, robots.txt, dedupe, recrawl",
          isCorrect: true,
          feedback: "That's the core loop: pick the next URL worth fetching, only when its host is due, skip anything seen or disallowed, store the content, and schedule a revisit based on how often the page changes.",
        },
        {
          id: "wc-req-4",
          text: "Rank fetched pages and answer user search queries over the results",
          isCorrect: false,
          feedback: "Indexing and ranking are downstream consumers of the crawl. Keep the crawler focused on fetching, deduping, and storing; the indexer reads from its output.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the entities the crawler needs:",
      availableEntities: [
        {
          id: "wc-entity-frontier",
          name: "FrontierUrl",
          attributes: ["url: string", "host: string", "priority: float", "depth: int", "discovered_at: timestamp"],
          isEssential: true,
        },
        {
          id: "wc-entity-host",
          name: "HostPolicy",
          attributes: ["host: string", "robots_rules: text", "crawl_delay_ms: int", "next_allowed_at: timestamp", "resolved_ip: string"],
          isEssential: true,
        },
        {
          id: "wc-entity-page",
          name: "CrawledPage",
          attributes: ["url_hash: bytes", "content_hash: bytes", "simhash: uint64", "http_status: int", "fetched_at: timestamp", "blob_path: string"],
          isEssential: true,
        },
        {
          id: "wc-entity-bloom",
          name: "SeenUrlFilter",
          attributes: ["bit_array: ~1.2 GB for 1B URLs", "hash_functions: 7", "target_fp_rate: 1%"],
          isEssential: true,
        },
        {
          id: "wc-entity-rank",
          name: "PageRankScore",
          attributes: ["url_hash: bytes", "score: float", "computed_at: timestamp"],
          isEssential: false,
        },
        {
          id: "wc-entity-query",
          name: "SearchQueryLog",
          attributes: ["query: string", "user_id: UUID", "clicked_url: string"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["wc-entity-frontier", "wc-entity-host", "wc-entity-page", "wc-entity-bloom"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: Internal Contracts. Select the interfaces between frontier, fetchers, and storage:",
      availableApis: [
        {
          id: "wc-api-enqueue",
          method: "POST",
          path: "/internal/v1/frontier/urls",
          description: "Adds newly discovered URLs after normalisation and a Bloom-filter seen check.",
          isInitialCore: true,
        },
        {
          id: "wc-api-lease",
          method: "GET",
          path: "/internal/v1/frontier/next?worker=:id&batch=50",
          description: "Leases URLs only from hosts whose next_allowed_at has passed; unacked leases return to the frontier.",
          isInitialCore: true,
        },
        {
          id: "wc-api-store",
          method: "POST",
          path: "/internal/v1/pages",
          description: "Stores fetched content and extracted links; skips storage if the content hash is already known.",
          isInitialCore: true,
        },
        {
          id: "wc-api-search",
          method: "GET",
          path: "/api/v1/search?q=",
          description: "Returns ranked results for a user's keyword query.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["wc-api-enqueue", "wc-api-lease", "wc-api-store"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble a crawler that stays polite at 1,000 pages/s:",
      requiredComponents: ["server", "queue", "cache", "database"],
      explanation:
        "The frontier is a set of Queues in the Mercator style: front queues by priority, back queues one per host, and a heap of next-allowed times so a fetcher only pulls from hosts that are due. Fetcher Servers (a few hundred async connections each) download pages and extract links. A Cache holds robots.txt and DNS results (DNS lookups otherwise become the bottleneck) plus the Bloom filter of seen URLs: at 1% false positives that's ~9.6 bits per URL, about 1.2 GB for 1B URLs, and a false positive only means skipping one new page. Content dedupe uses an exact hash plus SimHash for near-duplicates (mirrors and tracking parameters). Raw pages go to object storage (~100 TB/month), URL metadata to a Database. Trap guards cap depth, URL length, and pages per host.",
    },
  },
  {
    id: "design-typeahead",
    title: "Design Search Autocomplete",
    subtitle: "Prefix tries with precomputed top-k, offline aggregation, and edge caching per keystroke",
    category: "Search & Low Latency",
    estimatedTime: "8 mins",
    xpReward: 210,
    problemStatement:
      "Design autocomplete for a search box used for 500M searches/day. Each search fires about 6 suggestion requests after debouncing, so that's roughly 35k requests/s on average and ~100k/s at peak. Suggestions must appear in under 100 ms end to end, and a breaking-news term should start showing up within ~15 minutes. How do you serve top-10 suggestions per prefix?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What belongs in the core autocomplete MVP?",
      options: [
        {
          id: "ta-req-1",
          text: "Top-10 per prefix by popularity, <100 ms, trends visible in minutes",
          isCorrect: true,
          feedback: "Correct. Serving a ranked top-k per prefix, fast, with fresh-enough popularity is the whole product. Note that 'minutes' of freshness, not seconds, is what lets you precompute.",
        },
        {
          id: "ta-req-2",
          text: "Fuzzy matching with edit distance up to 3 on every prefix the user types",
          isCorrect: false,
          feedback: "Distance 3 on a 4-letter prefix matches almost anything, and the candidate set explodes per keystroke. Typo tolerance (usually distance 1-2, on longer prefixes) is a later layer on top of exact prefix lookup.",
        },
        {
          id: "ta-req-3",
          text: "Update the suggestion index synchronously every time a search is submitted",
          isCorrect: false,
          feedback: "That's ~6k writes/s landing on the same hot prefix nodes ('a', 'th', ...) that serve 100k reads/s. Log searches asynchronously, aggregate in batches, and publish a new snapshot every few minutes.",
        },
        {
          id: "ta-req-4",
          text: "Personalise every suggestion from each user's complete search history",
          isCorrect: false,
          feedback: "Personalisation is a good v2 blend (a few recent queries of this user on top), but a per-user index for every user multiplies storage and kills cacheability. Start with global top-k per prefix and locale.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the entities needed to build and serve suggestions:",
      availableEntities: [
        {
          id: "ta-entity-prefix",
          name: "PrefixTopK",
          attributes: ["prefix: string", "locale: string", "suggestions: list<(term, score)> (k=10)", "snapshot_version: int"],
          isEssential: true,
        },
        {
          id: "ta-entity-stats",
          name: "QueryTermStats",
          attributes: ["term: string", "locale: string", "decayed_score: float", "count_24h: bigint", "last_seen: timestamp"],
          isEssential: true,
        },
        {
          id: "ta-entity-event",
          name: "SearchEvent",
          attributes: ["query: string", "locale: string", "submitted_at: timestamp", "session_id: string"],
          isEssential: true,
        },
        {
          id: "ta-entity-history",
          name: "UserSearchHistory",
          attributes: ["user_id: UUID", "queries: list<string>", "updated_at: timestamp"],
          isEssential: false,
        },
        {
          id: "ta-entity-ads",
          name: "SponsoredKeywordBid",
          attributes: ["keyword: string", "advertiser_id: UUID", "bid_cents: int"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["ta-entity-prefix", "ta-entity-stats", "ta-entity-event"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: API Contracts. Select the endpoints for serving and learning suggestions:",
      availableApis: [
        {
          id: "ta-api-suggest",
          method: "GET",
          path: "/api/v1/suggest?q=wea&locale=en-US&limit=10",
          description: "Returns the precomputed top-10 for the prefix; cacheable at the edge with a short TTL.",
          isInitialCore: true,
        },
        {
          id: "ta-api-log",
          method: "POST",
          path: "/api/v1/search-events",
          description: "Fire-and-forget log of a submitted query into the aggregation stream.",
          isInitialCore: true,
        },
        {
          id: "ta-api-publish",
          method: "POST",
          path: "/internal/v1/suggest-index/publish",
          description: "Atomically swaps serving nodes to a newly built trie snapshot version.",
          isInitialCore: true,
        },
        {
          id: "ta-api-history",
          method: "DELETE",
          path: "/api/v1/users/me/search-history",
          description: "Clears the user's personal search history used for personalised suggestions.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["ta-api-suggest", "ta-api-log", "ta-api-publish"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble a stack that answers 100k prefix lookups/s in milliseconds:",
      requiredComponents: ["cdn", "load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "The browser debounces (~100-150 ms) and caches recent answers. A CDN caches responses for short, very popular prefixes with a TTL of a few minutes. The Load Balancer routes misses to suggestion Servers that hold a trie in memory where every node already stores its top-10, so a lookup is O(prefix length) with no ranking at request time; the trie is sharded by prefix range, with hot short prefixes replicated. A Redis Cache holds hot prefixes across servers. Submitted searches flow through a Queue (Kafka) into a stream job that updates time-decayed scores every few minutes; a builder writes a new trie snapshot to the Database/object store, and servers swap to it atomically. An inverted index over terms is the alternative when you need mid-word or multi-token matching.",
    },
  },
  {
    id: "design-notification-system",
    title: "Design a Notification System",
    subtitle: "Multi-channel fan-out, priority queues, user preferences, retries, and deduplication",
    category: "Messaging & Delivery",
    estimatedTime: "8 mins",
    xpReward: 210,
    problemStatement:
      "Design the notification platform for an app with 100M users: push (APNs/FCM), SMS, and email. Normal load is 5k notifications/s, but a breaking-news alert must reach 20M devices within about 5 minutes (~67k/s) without delaying login codes. Users set channel preferences and quiet hours, and nobody should get the same alert twice. How do you build it?",
    requirementsDiscovery: {
      question: "Step 1: Clarifying Requirements. What belongs in the core notification MVP?",
      options: [
        {
          id: "nt-req-1",
          text: "Exactly-once delivery to the device across push, SMS, and email",
          isCorrect: false,
          feedback: "APNs, FCM, and SMS gateways don't confirm that the user's device displayed the message, and a timeout leaves you guessing. Aim for at-least-once sends with a dedupe key per notification, plus collapse ids so the device shows one copy.",
        },
        {
          id: "nt-req-2",
          text: "Call the push provider inside the API request that triggered the alert",
          isCorrect: false,
          feedback: "Provider calls take 100-500 ms and sometimes fail for minutes. Doing it inline makes the caller slow and loses the notification when the provider is down. Accept, persist, enqueue, and send asynchronously.",
        },
        {
          id: "nt-req-3",
          text: "Hold our own persistent socket to every phone instead of using APNs/FCM",
          isCorrect: false,
          feedback: "Mobile OSes suspend background apps and their sockets, so it wouldn't reach phones that aren't in use, and it drains battery. APNs and FCM exist precisely because the OS keeps one shared connection per device.",
        },
        {
          id: "nt-req-4",
          text: "Queued fan-out per channel, preferences, retries with dedupe, tracking",
          isCorrect: true,
          feedback: "That's the core. Accept requests fast, fan out through queues per channel and priority, respect opt-outs, quiet hours, and frequency caps, retry failed sends without duplicating them, and record what was delivered.",
        },
      ],
    },
    entitiesDiscovery: {
      instruction: "Step 2: Core Data Model. Select the entities needed to decide what to send, where, and whether it arrived:",
      availableEntities: [
        {
          id: "nt-entity-notification",
          name: "Notification",
          attributes: ["id: UUID", "user_id: UUID", "type: string", "priority: enum(critical,high,bulk)", "dedupe_key: string", "payload: json"],
          isEssential: true,
        },
        {
          id: "nt-entity-prefs",
          name: "UserPreference",
          attributes: ["user_id: UUID", "channels: map<type, list<channel>>", "quiet_hours: (start,end)", "timezone: string"],
          isEssential: true,
        },
        {
          id: "nt-entity-device",
          name: "DeviceToken",
          attributes: ["user_id: UUID", "platform: enum(apns,fcm)", "token: string", "last_active_at: timestamp"],
          isEssential: true,
        },
        {
          id: "nt-entity-attempt",
          name: "DeliveryAttempt",
          attributes: ["notification_id: UUID", "channel: enum(push,sms,email)", "provider_msg_id: string", "status: enum(sent,failed,bounced)", "attempt: int"],
          isEssential: true,
        },
        {
          id: "nt-entity-abtest",
          name: "CopyExperimentVariant",
          attributes: ["experiment_id: UUID", "variant: string", "template_text: text"],
          isEssential: false,
        },
        {
          id: "nt-entity-badge",
          name: "InboxTheme",
          attributes: ["user_id: UUID", "accent_color: string", "sound: string"],
          isEssential: false,
        },
      ],
      correctEntityIds: ["nt-entity-notification", "nt-entity-prefs", "nt-entity-device", "nt-entity-attempt"],
    },
    apiDesignDiscovery: {
      instruction: "Step 3: API Contracts. Select the endpoints the platform needs on day one:",
      availableApis: [
        {
          id: "nt-api-send",
          method: "POST",
          path: "/api/v1/notifications",
          description: "Internal services submit a notification with a dedupe_key; returns 202 Accepted after it's persisted and enqueued.",
          isInitialCore: true,
        },
        {
          id: "nt-api-prefs",
          method: "PUT",
          path: "/api/v1/users/:id/preferences",
          description: "Updates channel opt-ins and quiet hours per notification type.",
          isInitialCore: true,
        },
        {
          id: "nt-api-device",
          method: "POST",
          path: "/api/v1/devices",
          description: "Registers or refreshes a device's push token after app install or token rotation.",
          isInitialCore: true,
        },
        {
          id: "nt-api-callback",
          method: "POST",
          path: "/webhooks/providers/:provider",
          description: "Receives delivery, bounce, and 'token unregistered' callbacks from email/SMS/push providers.",
          isInitialCore: true,
        },
        {
          id: "nt-api-analytics",
          method: "GET",
          path: "/api/v1/campaigns/:id/open-rates",
          description: "Dashboard of open and click-through rates per campaign.",
          isInitialCore: false,
        },
      ],
      correctApiIds: ["nt-api-send", "nt-api-prefs", "nt-api-device", "nt-api-callback"],
    },
    architectureDiscovery: {
      instruction: "Step 4: System Architecture. Assemble a pipeline that absorbs a 20M-device burst without delaying login codes:",
      requiredComponents: ["load_balancer", "server", "cache", "queue", "database"],
      explanation:
        "A Load Balancer fronts stateless API Servers that validate, persist the Notification to the Database, and enqueue it. Separate Queue topics per priority (critical OTPs never wait behind a bulk news blast) and per channel, partitioned by user_id, let each worker pool scale on its own. Workers read preferences and frequency caps from a Redis Cache, claim the dedupe_key with SET NX and a 24 h TTL so retries can't double-send, then call APNs/FCM/SMS/email with exponential backoff and a dead-letter queue. A broadcast is expanded into batches of ~500 tokens, so 20M devices become ~40k send jobs spread across the worker pool. Provider callbacks update DeliveryAttempt and prune dead tokens.",
    },
  },
];
