# Redis and DB System Design: Topic List

Pick a topic number, ask a question, and the answer becomes an Instagram carousel post.

## Redis
1. Why Redis is fast (single thread, in-memory, I/O multiplexing)
    1.1. If Redis is single-threaded, how does it use a multi-core machine? (Cluster, sharding, io-threads.)
    1.2. What happens to the data if Redis crashes? (RDB vs AOF, topic 6.)
    1.3. What exactly is epoll, and how is it better than select?
    1.4. Is Redis really faster than a DB with a good cache, and where is the real bottleneck?
    1.5. Why a skip list for sorted sets instead of a balanced tree?
    
2. Data structures and when to use each (String, Hash, List, Set, ZSet, Stream, HyperLogLog, Bitmap)
3. Caching patterns (cache-aside, write-through, write-back, read-through)
4. Cache invalidation, TTL and eviction policies (LRU, LFU)
5. Cache stampede, penetration and avalanche, and their fixes
6. Persistence (RDB vs AOF)
7. Replication, Sentinel and Cluster (hash slots)
8. Distributed lock (SETNX, Redlock, and its criticisms)
9. Rate limiter (fixed window, sliding window, token bucket)
10. Leaderboard with sorted sets
11. Pub/Sub vs Streams vs Kafka
12. Hot key and big key problems

## Database design
13. Indexing (B-tree vs LSM, composite and covering indexes)
14. ACID and isolation levels (dirty read, phantom read, MVCC)
15. SQL vs NoSQL: how to choose
16. Sharding vs partitioning, and consistent hashing
17. Replication (leader-follower, lag, failover)
18. CAP and PACELC
19. Normalization vs denormalization
20. Connection pooling and N+1 queries
21. Idempotency and the transactional outbox
22. Read-heavy vs write-heavy design, CQRS
23. Generating unique IDs (Snowflake, UUID, ULID)
24. Bloom filters and probabilistic structures

Suggested start: 1, 3, 5, 13, 14.

## Post pipeline (planned)
- One folder per post: `posts/NNN-slug/` with `slides/*.png` (1080x1350), `caption.md`, `content.json`
- `posts/INDEX.md` tracks status (draft or posted)
- Open decisions: slide style, language, handle or brand, folder location
