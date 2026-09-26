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
          text: "1-on-1 text messaging, delivery & read receipts, online presence, and offline message storage",
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
          text: "Upload & asynchronous multi-bitrate transcoding (HLS/DASH), global CDN playback, and watch progress tracking",
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
          text: "Real-time driver location tracking, geospatial radius search for available drivers, and atomic trip dispatch",
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
          text: "Strict atomic inventory reservation, idempotency against double charges, and automatic release on payment timeout",
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
          text: "Upload photos/captions, follow users, and deliver a fast reverse-chronological or ranked home feed",
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
          text: "Upload text paste, generate unique short URL key, retrieve content by key, and support automated expiration",
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
];
