export interface GlossaryEntry {
  term: string;
  definition: string;
  aliases: string[];
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "PACELC",
    definition: "PACELC theorem states that in a partitioned system one must choose between Availability and Consistency (CAP), and Else between Latency and Consistency.",
    aliases: ["pacelc", "pacelc theorem"],
  },
  {
    term: "Quorum",
    definition: "A strict majority vote of nodes ((N/2) + 1) required to commit distributed state changes and prevent split-brain conflicts.",
    aliases: ["quorum", "quorums", "strict quorum"],
  },
  {
    term: "Cache-Aside",
    definition: "An application-level caching pattern where the application reads from cache first, queries the database on misses, and writes results back to cache.",
    aliases: ["cache-aside", "cache aside"],
  },
  {
    term: "Read Replica",
    definition: "A read-only database copy synchronized asynchronously from the primary writer to offload heavy query traffic.",
    aliases: ["read replica", "read replicas", "replica", "replicas"],
  },
  {
    term: "Single Point of Failure",
    definition: "Any individual system component whose breakdown directly causes the entire platform to halt due to lack of redundancy.",
    aliases: ["single point of failure", "spof"],
  },
  {
    term: "Cache Stampede",
    definition: "The simultaneous rush of concurrent requests querying the database when a popular cached key expires, also known as thundering herd.",
    aliases: ["cache stampede", "thundering herd"],
  },
  {
    term: "Singleflight",
    definition: "An in-process request coalescing mechanism ensuring only one backend query executes for duplicate concurrent missing keys.",
    aliases: ["singleflight", "request coalescing"],
  },
  {
    term: "Circuit Breaker",
    definition: "A resilience pattern that trips open on repeated downstream failures to fail fast without exhausting thread pools.",
    aliases: ["circuit breaker", "circuit breakers"],
  },
  {
    term: "Connection Pooling",
    definition: "Maintaining reusable open database sockets to eliminate per-request TCP and TLS handshake latency overhead.",
    aliases: ["connection pooling", "connection pool", "connection pooler"],
  },
  {
    term: "Idempotency",
    definition: "A property where executing an operation repeatedly produces the exact same outcome as running it a single time.",
    aliases: ["idempotency", "idempotent", "idempotency key", "idempotency keys"],
  },
  {
    term: "Backpressure",
    definition: "A flow-control signal sent upstream asking producers to slow down transmission before downstream consumer buffers overflow.",
    aliases: ["backpressure", "flow control"],
  },
  {
    term: "Sharding",
    definition: "Horizontally partitioning database rows across multiple independent servers using a partition key.",
    aliases: ["sharding", "shard", "shards", "sharded"],
  },
  {
    term: "Consistent Hashing",
    definition: "A distributed hashing technique that minimizes key migration when nodes join or leave a cluster.",
    aliases: ["consistent hashing", "hash ring"],
  },
  {
    term: "Write-Ahead Log",
    definition: "An append-only log on disk where transactions are durably persisted before modifying in-memory database pages.",
    aliases: ["write-ahead log", "wal", "write-ahead logging"],
  },
  {
    term: "LSM-Tree",
    definition: "A storage engine structure that converts random writes into sequential disk appends for maximum write throughput.",
    aliases: ["lsm-tree", "lsm", "log-structured merge-tree"],
  },
  {
    term: "B-Tree",
    definition: "A self-balancing search tree data structure optimized for fast random reads and sorted range queries on block storage.",
    aliases: ["b-tree", "b-trees", "btree"],
  },
  {
    term: "Snowflake",
    definition: "A distributed ID generator bit-packing timestamp, machine ID, and sequence counter into sortable 64-bit integers.",
    aliases: ["snowflake", "snowflake id", "snowflake ids"],
  },
  {
    term: "Inverted Index",
    definition: "A search index mapping keywords to lists of document IDs containing them for sub-second full-text lookups.",
    aliases: ["inverted index", "inverted indexes"],
  },
  {
    term: "Two-Phase Commit",
    definition: "An atomic commitment protocol where a coordinator asks participants to prepare before committing distributed transactions.",
    aliases: ["two-phase commit", "2pc"],
  },
  {
    term: "Raft",
    definition: "A distributed consensus algorithm using leader election and replicated logs to guarantee state machine consistency.",
    aliases: ["raft", "paxos"],
  },
  {
    term: "Token Bucket",
    definition: "A rate limiting algorithm where tokens refill at a steady rate and requests consume tokens to gain admission.",
    aliases: ["token bucket", "leaky bucket"],
  },
  {
    term: "Sliding Window",
    definition: "A rate limiting and streaming aggregation technique that calculates request rates across rolling time intervals.",
    aliases: ["sliding window", "sliding window counter"],
  },
  {
    term: "Bloom Filter",
    definition: "A space-efficient probabilistic data structure that tests set membership with possible false positives but zero false negatives.",
    aliases: ["bloom filter", "bloom filters"],
  },
  {
    term: "Reverse Proxy",
    definition: "An intermediary server that terminates client connections and directs requests across backend server pools.",
    aliases: ["reverse proxy", "reverse proxies"],
  },
  {
    term: "Stateless",
    definition: "An architecture where servers do not retain client session data locally, enabling any server to process any request.",
    aliases: ["stateless", "statelessness"],
  },
  {
    term: "Replication Lag",
    definition: "The time elapsed between a primary database write and its arrival on asynchronous replica nodes.",
    aliases: ["replication lag"],
  },
  {
    term: "Read-Your-Own-Writes",
    definition: "A consistency guarantee ensuring a client will always immediately see their own latest updates on subsequent reads.",
    aliases: ["read-your-own-writes", "read-your-writes"],
  },
  {
    term: "Split-Brain",
    definition: "A failure state where a network partition causes isolated cluster nodes to simultaneously believe they are the active primary.",
    aliases: ["split-brain", "split brain"],
  },
  {
    term: "Linearizability",
    definition: "The strongest consistency guarantee where every operation appears to take effect instantaneously across the entire cluster.",
    aliases: ["linearizability", "linearizable", "strong consistency"],
  },
  {
    term: "Dead Letter Queue",
    definition: "A dedicated queue that isolates poisoned or repeatedly failing messages for engineer investigation.",
    aliases: ["dead letter queue", "dlq"],
  },
  {
    term: "Change Data Capture",
    definition: "Streaming real-time database row mutations into event queues to keep caches and search indexes continuously synchronized.",
    aliases: ["change data capture", "cdc"],
  },
  {
    term: "TTL",
    definition: "Time To Live specifies the expiration duration after which cached records are automatically invalidated.",
    aliases: ["ttl", "time-to-live"],
  },
  {
    term: "Anycast",
    definition: "A network routing technique where multiple servers share a single IP address and routers deliver packets to the topologically closest node.",
    aliases: ["anycast", "anycast bgp"],
  },
  {
    term: "JWT",
    definition: "JSON Web Token is a compact, cryptographically signed token carrying verified claims for stateless authentication.",
    aliases: ["jwt", "jwts", "bearer token"],
  },
  {
    term: "Distributed Tracing",
    definition: "Propagating a unique request ID across microservice boundaries to reconstruct end-to-end call latency waterfalls.",
    aliases: ["distributed tracing", "trace context", "trace id"],
  },
  {
    term: "Sloppy Quorum",
    definition: "A write strategy accepting responses from any N reachable nodes, even if they are not the primary assigned key holders.",
    aliases: ["sloppy quorum", "sloppy quorums"],
  },
  {
    term: "Hinted Handoff",
    definition: "Temporarily storing a write on a surrogate node when the target node is unreachable, delivering it once the target recovers.",
    aliases: ["hinted handoff"],
  },
];

/**
 * Find matching glossary terms in a text string.
 * Returns sorted non-overlapping spans matching canonical terms or aliases.
 */
export function findGlossaryMatches(text: string): Array<{
  entry: GlossaryEntry;
  start: number;
  end: number;
  matchedText: string;
}> {
  if (!text) return [];

  // Build sorted list of search patterns, longest first to prioritize multi-word terms
  const searchItems: Array<{ pattern: string; entry: GlossaryEntry }> = [];
  for (const entry of GLOSSARY) {
    searchItems.push({ pattern: entry.term, entry });
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() !== entry.term.toLowerCase()) {
        searchItems.push({ pattern: alias, entry });
      }
    }
  }
  searchItems.sort((a, b) => b.pattern.length - a.pattern.length);

  const matchedSpans: Array<{ start: number; end: number; entry: GlossaryEntry; matchedText: string }> = [];

  for (const item of searchItems) {
    // Word boundary match, case insensitive
    const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Ensure no overlap with previously found spans
      const overlaps = matchedSpans.some((s) => !(end <= s.start || start >= s.end));
      if (!overlaps) {
        matchedSpans.push({
          start,
          end,
          entry: item.entry,
          matchedText: m[0],
        });
      }
    }
  }

  return matchedSpans.sort((a, b) => a.start - b.start);
}
