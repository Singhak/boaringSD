import type { DefensePoolPart, DefenseQuestionPair } from "./types";

type A = [text: string, feedback: string, correct?: true];

function build(prefix: "tq" | "sq", question: string, answers: [A, A, A]) {
  return {
    question,
    options: answers.map(([text, feedback, correct], i) => ({
      id: `${prefix}-a${i + 1}`,
      text,
      isCorrect: correct === true,
      feedback,
    })),
  };
}

function pair(d: [string, [A, A, A]], s: [string, [A, A, A]]): DefenseQuestionPair[] {
  return [
    {
      tradeoffDefenseQuestion: build("tq", d[0], d[1]),
      stressTest10xQuestion: build("sq", s[0], s[1]),
    },
  ];
}

export const PART: DefensePoolPart = {
  "opt-storage-engines-recommended": pair(
    [
      "Why is the read-amplification cost of an LSM engine acceptable for this write-heavy telemetry workload?",
      [
        ["Reads may check several SSTables, but Bloom filters and block caches skip most of them, which is a fair price for sequential writes.", "Right. LSM trades some read work for cheap ingest, and Bloom filters plus caches keep point reads reasonable when writes dominate.", true],
        ["Reads never check more than one SSTable because compaction runs synchronously inside every write, so read amplification is always exactly one.", "Wrong. Compaction is a background process; between compactions a read can touch the MemTable and many SSTables."],
        ["Telemetry is never read, so read cost can be ignored entirely and the engine can drop indexes and Bloom filters to speed up flushes.", "Wrong. Dashboards and alerts read the metrics constantly, and without Bloom filters every point query would probe every SSTable."],
      ],
    ],
    [
      "At 10x load, what disk-space problem shows up first when old metrics are deleted through TTL expiry on an LSM engine?",
      [
        ["Deleted metrics stay on disk as tombstones and stale versions until compaction reaches them, so space use and range scans lag behind deletes.", "Correct. LSM deletes are just new writes. Space is reclaimed only when compaction merges the affected SSTables.", true],
        ["The WAL keeps every deleted row forever, so disk fills with log segments that can never be truncated after a MemTable flush.", "Wrong. WAL segments are recycled once the MemTable they cover has been flushed to an SSTable."],
        ["Each delete rewrites the whole SSTable it touched in place, so 10x deletes cost 10x full-file rewrites on the critical write path.", "Wrong. SSTables are immutable and are never rewritten in place; deletes are appended as tombstones."],
      ],
    ],
  ),
  "opt-storage-engines-alternative": pair(
    [
      "Why can a B+ tree engine beat an LSM engine when a small set of hot rows is updated over and over?",
      [
        ["An in-place update rewrites one page and keeps one version; an LSM stacks stale versions until compaction runs.", "Correct. Repeated updates to the same key create many stale versions in an LSM, adding read and compaction cost that a B+ tree avoids.", true],
        ["A B+ tree turns repeated updates into pure sequential appends, so it needs no random I/O even for the hottest rows.", "Wrong. In-place page updates are random writes; that is the B+ tree's cost, not an advantage."],
        ["B+ trees keep hot rows in a MemTable that never reaches disk, so the updates cost no I/O at all.", "Wrong. MemTables belong to LSM engines. A B+ tree relies on the buffer pool and still logs to a WAL."],
      ],
    ],
    [
      "If the dataset grows 5x past RAM, what degrades first on a B+ tree engine with in-place pages?",
      [
        ["The tree switches to a linked list of pages once it passes RAM size, so every lookup becomes a linear scan of the leaf level.", "Wrong. A B+ tree stays balanced on disk; height grows only logarithmically with data size."],
        ["Checkpointing stops working because dirty pages can only be flushed while the whole tree fits in memory, so the WAL grows without bound.", "Wrong. Checkpoints flush dirty pages regardless of the total data size, which is exactly how the tree lives on disk."],
        ["The buffer pool hit rate falls, so lookups that used to hit memory now pay real disk reads on the lower tree levels.", "Correct. Once the working set outgrows the buffer pool, cache misses turn logical page reads into physical I/O.", true],
      ],
    ],
  ),
  "opt-storage-engines-antipattern": pair(
    [
      "Why does an unindexed log file fail the requirement to query the last few minutes of one sensor's metrics?",
      [
        ["Log files cannot be read while they are being appended to, so queries must wait until the file is rotated at midnight.", "Wrong. Files can be read during appends; the real problem is the absence of any index to narrow the read."],
        ["The filesystem sorts a log file by sensor ID on close, which destroys the time order that range queries depend on.", "Wrong. Filesystems do not reorder file contents; the data simply has no index for lookups."],
        ["Appends are fast, but nothing is sorted or indexed by sensor or time, so finding one sensor's recent range means reading the whole file.", "Correct. Without an index or sorted structure, every range query degenerates to a full scan of the growing log.", true],
      ],
    ],
    [
      "At 10x data volume, what is the biggest durability risk of keeping the raw logs on a local virtual disk?",
      [
        ["Virtual disks silently compress data as they fill up, which corrupts the appended records once the volume passes 80% used.", "Wrong. Block devices do not compress or corrupt data as they fill; the issue is running out of space and having no replica."],
        ["Growth fills the volume, and losing the instance loses every unreplicated metric, since nothing copies the log.", "Correct. A local disk is bound to one instance, so capacity and durability both hinge on a single node with no replication.", true],
        ["The operating system rotates the log after 1 GB and discards the oldest half, so 10x volume means losing data much faster.", "Wrong. Rotation only happens if you configure it, and it does not by itself discard data."],
      ],
    ],
  ),
  "opt-id-generation-recommended": pair(
    [
      "Why is a time-prefixed Snowflake ID a better primary key than a random 128-bit UUID for insert-heavy tables?",
      [
        ["New IDs roughly increase, so inserts land at the right edge of the B-tree index, and the key is 8 bytes, not 16.", "Correct. Sequential-ish keys keep index pages hot and avoid random page splits, and the smaller key shrinks every secondary index.", true],
        ["A random UUID has to be looked up in a central registry to prove it is unique, adding one network hop to each insert.", "Wrong. UUIDs are unique by probability and need no registry; their cost is random index placement and a larger key."],
        ["Snowflake IDs are encrypted with a per-shard key, so they cannot be guessed, which UUIDs cannot promise.", "Wrong. Snowflake IDs are plain bit fields and are quite guessable; nothing about them is encrypted."],
      ],
    ],
    [
      "A worker's clock steps backward by 2 seconds after an NTP correction. What must a Snowflake generator do?",
      [
        ["Keep issuing IDs with the new smaller timestamp, because the 12-bit sequence counter makes every ID unique on its own.", "Wrong. The sequence resets each millisecond, so a repeated timestamp with a fresh sequence can produce a duplicate ID."],
        ["Switch to a random worker ID for the affected window, since the worker bits alone guarantee uniqueness across nodes.", "Wrong. Changing the worker ID risks colliding with another live worker and does not fix the duplicated timestamp and sequence."],
        ["Refuse or wait until the clock passes the last used timestamp, otherwise it could reissue IDs it already handed out.", "Correct. Uniqueness depends on a monotonic timestamp, so a backward step must pause issuance or fail fast.", true],
      ],
    ],
  ),
  "opt-id-generation-alternative": pair(
    [
      "Which concrete property does a single database sequence give you that Snowflake IDs do not?",
      [
        ["Availability during outages, because every shard keeps a local copy of the sequence and continues issuing IDs offline.", "Wrong. The sequence lives on one primary; if it is unreachable, no shard can get new IDs."],
        ["A strictly increasing allocation order with compact integers, and no worker-ID assignment or clock to manage.", "Correct. A sequence hands out values in one global order without clock or worker bookkeeping, at the cost of a central hop.", true],
        ["Horizontal write scaling, because nextval calls are spread automatically across all the replicas of the database.", "Wrong. nextval must run on the primary, so ID allocation does not scale out across replicas."],
      ],
    ],
    [
      "Shards are added in a second region. What happens to insert latency with a central PostgreSQL sequence?",
      [
        ["Nothing changes, because sequences are replicated to every region and nextval is served locally by each replica.", "Wrong. Replicas are read-only and cannot advance a sequence; nextval always goes to the primary."],
        ["The sequence splits itself into one range per region and hands out IDs locally without any coordination.", "Wrong. PostgreSQL does not partition a sequence by region on its own; you would have to build that scheme yourself."],
        ["Every insert from the remote region pays a WAN round trip to get its ID, adding tens to hundreds of milliseconds.", "Correct. Each ID requires a call to the one primary, so remote shards inherit the cross-region network latency.", true],
      ],
    ],
  ),
  "opt-id-generation-antipattern": pair(
    [
      "Why does adding a retry-on-conflict loop fail to make random 32-bit IDs safe across shards?",
      [
        ["Retrying makes the random generator repeat its last value, so a retry is guaranteed to collide with the earlier attempt.", "Wrong. Each call draws a fresh value; the trouble is that no shard can see the IDs used on other shards."],
        ["A unique index only sees its own shard, so a cross-shard collision surfaces later, after both rows are referenced elsewhere.", "Correct. Conflicts across independent shards are invisible at insert time and cause corruption once data is joined or merged.", true],
        ["Databases reject a retry after a unique violation until the connection is closed and reopened, which stalls each shard for seconds.", "Wrong. A failed insert can simply be retried; the retry loop is cheap but only checks local uniqueness."],
      ],
    ],
    [
      "At 10x volume, what happens downstream when two entities receive the same random ID?",
      [
        ["The database automatically renames the newer entity's ID and updates every reference, so the collision is repaired without errors.", "Wrong. Databases do not rewrite keys or foreign references; a collision is either rejected or silently shared."],
        ["Only the newer row is lost, and the older row stays intact everywhere, so the damage is limited to a single record.", "Wrong. Caches, indexes and downstream consumers can hold either version, so damage spreads beyond one row."],
        ["Caches, joins and event streams keyed by ID mix up the two entities, so one silently overwrites or leaks into the other.", "Correct. Any system that trusts the ID as identity will merge or overwrite records, and more IDs make it happen more often.", true],
      ],
    ],
  ),
  "opt-search-indexing-recommended": pair(
    [
      "Besides speed, why does an inverted-index engine beat SQL LIKE for a shopper typing 'runing shoes'?",
      [
        ["Analyzers tokenize and stem terms, and scoring such as BM25 plus fuzzy matching returns ranked, typo-tolerant results.", "Correct. Search engines add analysis, relevance scoring and fuzziness that plain wildcard matching cannot provide.", true],
        ["The index stores each query the user has ever typed, so it simply replays the closest earlier query instead of searching.", "Wrong. An inverted index maps terms to documents; it is not a cache of past queries."],
        ["LIKE with wildcards is case-sensitive only, and this is the only reason it misses typos, so lowercasing the column would fix it.", "Wrong. Case is unrelated to typos or ranking; LIKE has no notion of relevance or fuzzy matching."],
      ],
    ],
    [
      "As the index grows 10x across many shards, what hurts query latency first?",
      [
        ["The coordinator must copy the whole index to itself before each query, so latency grows with total index size.", "Wrong. The coordinator only merges top-k results from shards; it never copies the index."],
        ["Every query fans out to all shards, so the slowest shard sets the p99 and more shards mean more chances of a slow one.", "Correct. Scatter-gather latency is bounded by the slowest response, so tail latency worsens as the fan-out grows.", true],
        ["Posting lists get unsorted as they grow, so every lookup must sort them at query time before intersecting terms.", "Wrong. Posting lists are stored sorted; segment merges keep them that way."],
      ],
    ],
  ),
  "opt-search-indexing-alternative": pair(
    [
      "Even for occasional searches, why can a full scan on the primary OLTP database hurt checkout traffic?",
      [
        ["The scan drags cold pages through the buffer pool and eats I/O, evicting hot pages that checkouts need.", "Correct. A big sequential scan pollutes the cache and competes for I/O, so unrelated OLTP queries slow down.", true],
        ["Scans force the primary to switch to read-only mode until the result has been sent to the client.", "Wrong. Databases never flip to read-only for a scan; they keep serving writes."],
        ["A scan takes a lock on the whole table for its duration, so no checkout can write until the search finishes.", "Wrong. Reads in MVCC databases do not block writers; the harm comes from cache and I/O contention."],
      ],
    ],
    [
      "As the catalog and search traffic both grow 5x, why do long scans on the primary also bloat tables?",
      [
        ["Scans write a temporary copy of the table into the main heap, so the table doubles in size for every concurrent search.", "Wrong. A read scan does not copy the table into the heap; the bloat comes from vacuum being blocked."],
        ["Long-running scans hold old snapshots open, which stops vacuum from reclaiming dead rows, so tables and indexes bloat.", "Correct. Old snapshots pin dead tuples, so cleanup is delayed and storage and scan cost keep growing.", true],
        ["Each scan updates a hit counter on every row it reads, which creates a new row version per search.", "Wrong. Reads do not create new row versions; a read query leaves the data unchanged."],
      ],
    ],
  ),
  "opt-search-indexing-antipattern": pair(
    [
      "Even if the whole catalog somehow fit in the browser, why would it still show shoppers wrong results?",
      [
        ["Browsers sort search results by the order the tabs were opened in, which ignores relevance for the current query.", "Wrong. Browsers do no such thing; the ordering comes from whatever your own script does."],
        ["JavaScript numbers cannot represent prices exactly, so every price would be rounded incorrectly on screen.", "Wrong. Prices can be stored as integers or strings; the real problem is stale data, not number formats."],
        ["The downloaded copy is a snapshot, so sold-out items and changed prices stay wrong until the user reloads everything.", "Correct. A client-side copy has no way to receive updates, so freshness is lost the moment the download finishes.", true],
      ],
    ],
    [
      "With 10x more sessions, what happens to time-to-first-search when every visit must load the full catalog?",
      [
        ["Each session downloads and parses the whole catalog first, so 10x sessions repeat that cost 10x.", "Correct. The load happens per session, so more sessions multiply the download and CPU work with no shared benefit.", true],
        ["The browser shares the catalog across all users on the same network, so 10x sessions re-download it only once.", "Wrong. Browser caches are per user; there is no network-wide sharing of the download."],
        ["Time-to-first-search improves as the catalog is cached in the CDN, because later sessions get an already parsed in-memory index.", "Wrong. A CDN caches bytes, not a parsed index; every browser still has to parse and build its own."],
      ],
    ],
  ),
  "opt-stream-processing-recommended": pair(
    [
      "Why use event-time windows instead of processing-time windows for scoring transaction velocity?",
      [
        ["Event time places each transaction in the window it happened in, so late events count; watermarks close windows.", "Correct. Event-time semantics keep results stable when events arrive late or out of order, unlike processing time.", true],
        ["Processing-time windows need a replayable source and event-time windows do not, so event time skips the checkpointing.", "Wrong. Both kinds of window still need checkpointed state for recovery; the difference is which clock assigns windows."],
        ["Event time gives lower latency because the engine emits every result the moment the first event arrives.", "Wrong. Event-time windows wait for the watermark, which adds delay rather than reducing it."],
      ],
    ],
    [
      "At 10x volume, one Kafka partition goes quiet while the others stay busy. What happens to windowed scoring?",
      [
        ["The engine reassigns the quiet partition's events to the busy ones, which duplicates the counts of the busy cards.", "Wrong. Partitions are not reassigned by content; a quiet partition simply contributes no watermark progress."],
        ["The keyed state of that partition is deleted after a minute, so the cards it held lose their velocity history.", "Wrong. State is retained by key and TTL settings, not because a source partition is idle."],
        ["The idle partition holds the watermark back, so windows stay open and velocity alerts are delayed until it advances or is marked idle.", "Correct. The watermark is the minimum across inputs, so a silent partition stalls window output unless idleness is handled.", true],
      ],
    ],
  ),
  "opt-stream-processing-alternative": pair(
    [
      "What fraud pattern does a 10-minute batch job miss that a stream engine catches?",
      [
        ["Duplicate transactions, because a batch job cannot compare two rows in one table with a SQL self-join.", "Wrong. SQL self-joins and group-bys handle duplicates well; the weakness is detection delay."],
        ["Card testing bursts: a stolen card can make dozens of purchases before the next run flags it.", "Correct. Batch detection has a blind window up to the interval length, which fraudsters exploit with quick bursts.", true],
        ["Fraud on cards issued by another bank, since SQL cannot filter by issuer and only streams can.", "Wrong. Issuer filtering is trivial in SQL; the issue is that the answer arrives minutes late."],
      ],
    ],
    [
      "If the 10-minute batch aggregates run against the primary payments database, what happens as volume grows 5x?",
      [
        ["The database pauses new payments until the batch finishes, so every run causes a hard outage lasting the full 10 minutes.", "Wrong. Reads do not stop writes; the harm is resource contention that slows payments."],
        ["Nothing, because SQL aggregations run entirely in the client's memory and never touch the database's CPU.", "Wrong. Aggregations execute inside the database and consume its CPU and I/O."],
        ["Each run scans and aggregates 5x more rows on the same database serving payments, so checkout latency rises during every run.", "Correct. Analytic scans share CPU, I/O and cache with transactional traffic, so bigger runs hurt live customers.", true],
      ],
    ],
  ),
  "opt-stream-processing-antipattern": pair(
    [
      "Why can't you build low-latency velocity counters by appending each event to a single CSV file on S3?",
      [
        ["S3 objects are immutable, so appending means rewriting the object or writing tiny files, never a per-card view in ms.", "Correct. Object storage has no append or keyed-state primitive, so real-time counters need something else on top.", true],
        ["CSV rows cannot hold numbers, so amounts must be stored as pictures before velocity can be computed.", "Wrong. CSV holds numbers as text without trouble; the real gap is missing stateful, low-latency compute."],
        ["S3 rejects files with more than 1,000 rows, so CSV batches must be split across so many buckets that they cannot be read again.", "Wrong. S3 has no row limit; objects can be up to 5 TB, and the limit is not the issue."],
      ],
    ],
    [
      "With overlapping 5-minute windows and 10x events, why does scoring by re-reading CSV files get slower and costlier?",
      [
        ["S3 charges nothing for reads inside the same region, so extra scanning only costs time and never money.", "Wrong. S3 bills per request and, for query engines, by bytes scanned, so repeated reads add cost."],
        ["Each window re-reads the same files, so bytes scanned and requests multiply with volume and window overlap.", "Correct. Without incremental state, every overlapping window pays the full read cost again, so cost and latency climb quickly.", true],
        ["The CSV files merge themselves into one large object as they are read, which makes each later window faster.", "Wrong. Reading an object does not change it; files stay as separate small objects."],
      ],
    ],
  ),
  "opt-observability-recommended": pair(
    [
      "How does a trace show a retry storm inside a gateway request that a p99 metric cannot?",
      [
        ["Each attempt is a span in one trace, so repeated calls to the same downstream service show up with their time.", "Correct. A trace keeps per-request structure, showing retries and waits that an aggregate percentile hides.", true],
        ["Tracing disables retries while it records, so the storm stops and the trace shows only the final healthy call.", "Wrong. Tracing observes calls and does not change their retry behavior."],
        ["A p99 metric already records the number of retries per request, so the trace only repeats the same numbers.", "Wrong. A latency percentile has no per-request breakdown and cannot show how many attempts happened."],
      ],
    ],
    [
      "At 10x load with more async fan-out through queues, what commonly breaks traces first?",
      [
        ["Trace context is lost at queue or thread hops, so traces fragment and the slow path can't be followed.", "Correct. Context must be explicitly propagated across async boundaries; missing propagation breaks the causal chain.", true],
        ["The trace ID runs out of digits after ten times more requests, so new requests reuse IDs of old traces.", "Wrong. Trace IDs are 128-bit random values and do not run out with load."],
        ["Queues strip timestamps from messages, so every span reports the same duration of zero milliseconds.", "Wrong. Span timestamps are recorded by the service, not stripped by the queue; the problem is lost context."],
      ],
    ],
  ),
  "opt-observability-alternative": pair(
    [
      "Users see 3-second requests but pings between hosts show 1 ms. Why does this not clear the application?",
      [
        ["ICMP is encrypted end to end, so router delays are hidden and the real latency is never reported in the ping result.", "Wrong. ICMP is not encrypted, and its RTT does include network delays; it simply excludes application time."],
        ["ICMP only measures the network path to the host, so it misses TCP setup, queueing and handler time above that layer.", "Correct. A fast ping proves the wire is fine but says nothing about time spent inside the application stack.", true],
        ["Ping measures only the first hop from the client, so delays deeper in the data center are never included in its results.", "Wrong. A ping to a host measures the full path to it; what it lacks is anything above the network layer."],
      ],
    ],
    [
      "If teams ping every second on thousands of hosts as traffic grows 5x, what misleading signal appears?",
      [
        ["Ping replies get slower in proportion to request latency, so the probes reproduce the 3-second p99 exactly.", "Wrong. ICMP is handled by the kernel network stack, not by the application queues that produce p99."],
        ["The extra probes are counted as user requests, so p99 latency falls as their fast replies dilute the data.", "Wrong. Probes do not enter the application's request metrics unless you send them through the gateway."],
        ["Routers and hosts rate-limit or deprioritize ICMP, so the probes show phantom loss that real user traffic does not experience.", "Correct. ICMP handling differs from application traffic, so heavy probing can create noise that looks like network trouble.", true],
      ],
    ],
  ),
  "opt-observability-antipattern": pair(
    [
      "Why can raw payment logs on the console not answer 'what is our p99 latency and where does it come from'?",
      [
        ["Percentiles need aggregated durations, and raw lines carry no timing or shared ID, so it must be rebuilt by hand.", "Correct. Latency analysis needs structured timings that can be aggregated; free-form logs do not provide them.", true],
        ["Console output is sorted by customer name, so all timestamps are out of order and percentiles cannot be calculated.", "Wrong. Console output is written in arrival order; the problem is missing timings and correlation, not sorting."],
        ["Percentiles can only be computed from a sample of one request, so aggregated logs always give a wrong result.", "Wrong. Percentiles are computed over many requests; logs just lack the data needed to do it."],
      ],
    ],
    [
      "At 10x traffic, what happens to the cost of keeping payload-sized log lines for every request?",
      [
        ["Log volume stays flat, because the console driver deduplicates identical payment records before storing them.", "Wrong. Payment records differ per request, and console drivers do not deduplicate."],
        ["Storage cost falls, because bigger log streams compress much better and can be kept indefinitely for free.", "Wrong. Compression helps a little but cannot offset a tenfold volume rise, and it does not remove the compliance exposure."],
        ["Ingest and retention volume grows tenfold, logs rotate out before anyone searches them, and card data spreads across more copies.", "Correct. Verbose payload logging scales linearly with traffic in cost while adding more places where sensitive data lives.", true],
      ],
    ],
  ),
  "opt-auth-at-scale-recommended": pair(
    [
      "Why use asymmetric signing instead of a shared HMAC secret when many services validate tokens?",
      [
        ["Public-key signatures produce shorter tokens than HMAC, which saves header bytes on every one of the 100k req/s.", "Wrong. RSA signatures are usually longer than HMAC ones, so the tokens are not smaller."],
        ["Only the issuer holds the private key, so services verify with a public key and a compromised service cannot mint valid tokens.", "Correct. Asymmetric keys separate signing from verifying, shrinking the blast radius of any single service breach.", true],
        ["Services can revoke individual tokens by deleting the matching public key from their local cache.", "Wrong. Public keys cover all tokens signed with that key, so they cannot revoke a single token."],
      ],
    ],
    [
      "At 10x users, what risk grows with a stolen JWT that is valid for 24 hours?",
      [
        ["The JWKS endpoint rejects the token as soon as a second request uses it, which logs the user out everywhere.", "Wrong. JWKS only publishes keys; it does not track token usage or detect replays."],
        ["The token's signature weakens over time as it is repeatedly verified, making forgery easier for later requests.", "Wrong. Verification does not weaken a signature; the risk is that a stolen token keeps working."],
        ["Nothing can invalidate it before expiry, so more users means more exposed tokens; use short TTLs plus refresh tokens.", "Correct. Stateless tokens are valid until they expire, so exposure scales with user count and lifetime unless TTLs are short.", true],
      ],
    ],
  ),
  "opt-auth-at-scale-alternative": pair(
    [
      "What is the tradeoff of putting a short-TTL cache in front of per-call auth database lookups?",
      [
        ["It makes every revocation instant, because cached entries are deleted the moment the database row changes.", "Wrong. A plain TTL cache does not know about database changes unless you add explicit invalidation."],
        ["It cuts database reads sharply, but a revoked session still passes until its cache entry expires.", "Correct. Caching brings back a staleness window equal to the TTL, trading revocation speed for load.", true],
        ["It removes the dependency on the auth database, so a database outage has no effect on any request.", "Wrong. Cache misses and expired entries still need the database, so an outage eventually breaks logins and refreshes."],
      ],
    ],
    [
      "When each API call also updates a last-seen timestamp on the session row, what breaks first at 5x traffic?",
      [
        ["The session table's primary key must be rebuilt after every update, blocking all reads for a few seconds.", "Wrong. An update does not rebuild a primary key; the problem is contention and write volume."],
        ["Timestamps are stored as text, so each update rewrites the string in every index across all replicas at once.", "Wrong. Timestamp type is not the issue; updates on hot rows are."],
        ["Reads become writes on hot rows, causing row lock contention and replication lag on the auth primary.", "Correct. Writing on every request serializes updates for busy sessions and floods the write path and replicas.", true],
      ],
    ],
  ),
  "opt-auth-at-scale-antipattern": pair(
    [
      "Beyond load, why is keeping the user's plaintext password in a cookie a security failure?",
      [
        ["Cookies are always encrypted with the server's private key, so the password is unreadable but also unverifiable.", "Wrong. Cookies are plain data unless you encrypt them yourself, and the browser simply sends the value back."],
        ["Any XSS bug, proxy log or shared browser exposes the real password, and it cannot be revoked without changing it.", "Correct. A password is a long-lived secret with wide reuse; a session token would be short-lived and revocable.", true],
        ["Browsers delete cookies containing letters and digits, so the password disappears before the next request.", "Wrong. Browsers keep such cookies without inspecting their content, which is precisely the danger."],
      ],
    ],
    [
      "At 10x request volume, how does exposure grow if the password travels in the Cookie header on every request?",
      [
        ["Each request is another chance for the secret to leak into logs, proxies and traces, and one leak is permanent.", "Correct. Sending the credential constantly multiplies the places it can be captured, and a leaked password stays valid.", true],
        ["The password is hashed by the browser after 1,000 requests, so later requests are safe while earlier ones stay exposed.", "Wrong. Browsers do not hash cookie values; the same plaintext is sent every time."],
        ["Exposure stays constant, because the server rotates the password after each successful request to keep it fresh.", "Wrong. Servers do not silently rotate user passwords; the same secret is reused on every call."],
      ],
    ],
  ),
};
