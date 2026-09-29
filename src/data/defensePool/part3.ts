import type { DefensePoolPart, DefenseQuestionPair } from "./types";

type A = [text: string, feedback: string];
type Q = DefenseQuestionPair["tradeoffDefenseQuestion"];

/** Build a question: `right` is placed at index `pos` (0-2) among the wrong answers. */
function q(prefix: "tq" | "sq", question: string, right: A, wrong: [A, A], pos: 0 | 1 | 2): Q {
  const list: A[] = [...wrong];
  list.splice(pos, 0, right);
  return {
    question,
    options: list.map(([text, feedback], i) => ({
      id: `${prefix}-a${i + 1}`,
      text,
      isCorrect: i === pos,
      feedback,
    })),
  };
}

const d = (question: string, right: A, wrong: [A, A], pos: 0 | 1 | 2) => q("tq", question, right, wrong, pos);
const s = (question: string, right: A, wrong: [A, A], pos: 0 | 1 | 2) => q("sq", question, right, wrong, pos);

export const PART: DefensePoolPart = {
  "opt-idempotency-recommended": [
    {
      tradeoffDefenseQuestion: d(
        "Why must the idempotency key and the charge record be written in the same database transaction?",
        ["A crash between them cannot leave a key claiming success with no charge, or a charge with no key to stop the retry.", "Atomicity means the key and the charge either both exist or neither does, so a retry after a crash sees a consistent state."],
        [
          ["A single transaction makes the payment gateway idempotent too, so the card network rejects a second authorization by itself.", "The gateway is a separate system outside your transaction; it needs its own idempotency key to dedupe."],
          ["One transaction lets the key table drop its unique index, since row locks alone already stop duplicate inserts.", "Row locks are not a substitute; the unique constraint is what makes a duplicate insert fail."],
        ],
        1,
      ),
      stressTest10xQuestion: s(
        "At 10x volume, two retries of the same key arrive together. What strains first?",
        ["The duplicate waits on the first request's uncommitted key row, holding a pooled connection until the charge finishes.", "Concurrent duplicates block on the unique index, so retry storms tie up connections and can drain the pool."],
        [
          ["The unique index rejects concurrent inserts with an error, so every retry fails permanently and never returns the stored receipt.", "A well-built handler catches the conflict and returns the stored result; failing permanently is a bug, not the scaling limit."],
          ["Keys are evicted early as volume grows, so old keys vanish and late retries are treated as brand new purchases.", "Eviction depends on the TTL you set, not on request volume, so this does not follow from 10x traffic."],
        ],
        0,
      ),
    },
  ],
  "opt-idempotency-alternative": [
    {
      tradeoffDefenseQuestion: d(
        "Why does disabling the button fail to protect a payment when the phone loses signal right after the tap?",
        ["The request may have reached the server already, and an app retry after reconnecting bypasses the button.", "A disabled button only guards the UI; automatic retries after a lost response bypass it."],
        [
          ["Browsers ignore the disabled attribute when the network is unstable, so the click still fires a second request.", "The attribute is honored regardless of network state; the gap is that retries happen below the UI."],
          ["Disabling only works for GET requests, because browsers cache those and POST forms always submit twice.", "POST forms submit once per click; the problem is duplicates from retries, not a browser rule about methods."],
        ],
        2,
      ),
      stressTest10xQuestion: s(
        "As volume grows 5x, which duplicate source gets worse even if every user taps once?",
        ["Slower responses cause timeouts and auto-retries, each a fresh request the button never sees.", "Timeout-driven retries grow with latency, and a per-tab disable cannot see them."],
        [
          ["The page re-enables the button after a fixed lock period, so slow responses let users tap again and every tap is accepted.", "This is a user-tap issue, and it is a UX flaw in the timer, not the retry source that scales with load."],
          ["Disabled state is synced through the server, so at 5x the sync lags and the button stays enabled longer.", "Button state is local to the page and is not synced through the server."],
        ],
        1,
      ),
    },
  ],
  "opt-idempotency-antipattern": [
    {
      tradeoffDefenseQuestion: d(
        "Why is refunding after the fact a worse experience than preventing the duplicate charge?",
        ["The customer stays charged for days until the refund settles, and support fixes each one.", "The money is already taken, so the customer is out funds during settlement and the merchant does the cleanup."],
        [
          ["Card networks never reverse a refund for an amount under a minimum threshold, so small duplicates stay permanently.", "Refunds are not blocked by an amount minimum; the issue is delay and cleanup work."],
          ["Refunds show up instantly but as a second line item that customers always read as an extra charge.", "Refunds are not instant and the cost is settlement delay, not how the line item is read."],
        ],
        0,
      ),
      stressTest10xQuestion: s(
        "At 10x volume, which cost grows fastest with a refund-after-the-fact approach?",
        ["Detection, refunds and ledger fixes grow with every duplicate, and each refund can itself fail.", "Reconciliation and support work scale with duplicate count, and refunds add more gateway calls that need their own idempotency."],
        [
          ["The card network locks the merchant account automatically after a thousand refunds in a day, whatever the reason.", "Networks monitor abnormal refund ratios, but there is no fixed automatic lock at a thousand refunds."],
          ["Refund API rate limits reject every call above 100 per second, so extra duplicates become permanent charges.", "Rate limits vary by provider and are retried; they are not why the approach fails."],
        ],
        2,
      ),
    },
  ],
  "opt-multi-region-recommended": [
    {
      tradeoffDefenseQuestion: d(
        "Why does the pilot light replicate the database continuously but keep the app servers off or tiny?",
        ["Data is slow to rebuild; compute relaunches from images in minutes, so replication bounds loss.", "Replicating data bounds what you can lose; servers are rebuilt on demand from images during failover."],
        [
          ["Idle app servers make DNS failover fast, since GeoDNS only shifts traffic to regions with no running instances.", "GeoDNS routes by health and geography, not by whether instances are idle."],
          ["A live standby database would be corrupted by the primary's writes, so only compute can be kept warm.", "Replicas are built to receive the primary's writes; that is exactly how a standby stays current."],
        ],
        1,
      ),
      stressTest10xQuestion: s(
        "At 10x traffic, what most threatens the data loss window when the pilot light is promoted?",
        ["Async replication lag grows with write volume, so promotion loses more recent writes.", "Higher write rates widen replication lag, so promotion loses more of the latest writes."],
        [
          ["The idle standby database rejects replication after a long quiet period, so it must be rebuilt from a snapshot.", "A standby stays connected to replication; it does not drop out because it is idle."],
          ["GeoDNS caching multiplies with traffic, so clients keep hitting the dead region 10x longer.", "DNS TTL caching depends on TTL settings, not on how much traffic there is."],
        ],
        0,
      ),
    },
  ],
  "opt-multi-region-alternative": [
    {
      tradeoffDefenseQuestion: d(
        "Why does active-active need a conflict-resolution strategy that a pilot light can skip?",
        ["Both regions accept writes to the same data, so concurrent updates need a merge rule; pilot light has one primary.", "With two writable regions the same row can change in both at once, so there must be a deterministic way to merge."],
        [
          ["Global load balancers copy every request to both regions, so each write arrives twice and must be deduplicated.", "Load balancers send each request to one region; conflicts arise from different users writing in different places."],
          ["Cross-region links reorder packets and TCP cannot restore order, so databases need their own sequencing.", "TCP delivers bytes in order; conflicts come from concurrent writers, not from transport reordering."],
        ],
        2,
      ),
      stressTest10xQuestion: s(
        "As traffic grows 5x, what happens to the cost and health of the link between the two active regions?",
        ["Cross-region bandwidth and cost scale with writes, and a saturated link widens lag and conflicts.", "More writes mean more data crossing regions, so cost rises and lag and conflict risk grow together."],
        [
          ["Each region must hold 5x more data than the other, since sharding assigns each user to the busier region.", "Both regions hold the same replicated data set; growth does not skew it toward one side."],
          ["GeoDNS stops routing to the second region once traffic passes 5x, so it becomes a passive standby.", "GeoDNS does not turn a healthy region passive because of traffic volume."],
        ],
        1,
      ),
    },
  ],
  "opt-multi-region-antipattern": [
    {
      tradeoffDefenseQuestion: d(
        "What is the recovery point of a nightly backup, and why does it matter for this outage target?",
        ["Up to a full day of writes since the last backup are lost, and no restore speed can bring them back.", "A nightly schedule means the newest copy can be almost 24 hours old, which is data loss the restore cannot recover."],
        [
          ["It is near zero because backups are incremental snapshots, and only the restore time breaks the 10 minute target.", "Nightly snapshots do not capture writes made after they run, so data loss is not near zero."],
          ["It equals the restore time, so a two-hour restore means exactly two hours of writes are lost.", "Recovery point depends on when the last backup ran, while restore time is a separate measure."],
        ],
        0,
      ),
      stressTest10xQuestion: s(
        "At 10x data, what dominates a cold-tier restore even before the database begins loading?",
        ["Retrieval and transfer: thawing cold objects and pulling 10x more bytes takes hours however fast the database loads.", "Getting the archive out of the cold tier and across the network grows with size and is a fixed delay before any restore starts."],
        [
          ["Checksum validation, which re-reads the archive from the original region and doubles load on production.", "Integrity checks do not re-read from production, and they are not the dominant delay."],
          ["Encryption key rotation, which must re-encrypt every archived object before it can be read elsewhere.", "Rotation is not needed to read archives; the delay is retrieval and transfer."],
        ],
        1,
      ),
    },
  ],
  "opt-health-checks-recommended": [
    {
      tradeoffDefenseQuestion: d(
        "Why should the deep readiness probe use a short timeout and require several consecutive failures before a pod is removed?",
        ["A single slow query should not eject a healthy pod, so consecutive failures filter noise while still catching a dead pool quickly.", "Requiring repeated failures avoids flapping on blips but still removes a pod whose pool is truly dead."],
        [
          ["Kubernetes only evaluates a probe after three attempts, so the threshold is required for the probe to run at all.", "Probes run from the first attempt; the threshold is a setting you choose, not a prerequisite."],
          ["A long timeout lets the probe wait out a dead pool, which is how it proves the pool cannot serve queries.", "A long wait delays detection and ties up resources; short timeouts are what make failures visible fast."],
        ],
        0,
      ),
      stressTest10xQuestion: s(
        "If the shared database itself goes down at 10x load, what does the deep readiness probe do to the service?",
        ["All pods fail readiness together, leaving no endpoints, even for cacheable requests.", "A shared outage marks all pods unready at once, leaving nowhere to send traffic, not even for degraded responses."],
        [
          ["The probe restarts every pod at once, and the flood of new connections keeps the database down after it recovers.", "Readiness removes pods from routing; restarts come from liveness, which is a different probe."],
          ["The probe passes on pods with warm caches, so only cold pods are removed and load shifts unevenly.", "The probe tests database connectivity, not cache warmth, so it fails on all pods equally."],
        ],
        2,
      ),
    },
  ],
  "opt-health-checks-alternative": [
    {
      tradeoffDefenseQuestion: d(
        "Why is a liveness endpoint that returns 200 without any checks still useful alongside a readiness probe?",
        ["A hung or deadlocked server fails it and gets restarted, without tying restarts to the shared database.", "A hung process cannot answer even a trivial endpoint, so liveness catches it without tying restarts to a shared database."],
        [
          ["It tells the load balancer which pods hold warm caches, so routing prefers them after restarts.", "A static response carries no information about caches."],
          ["It checks the database connection indirectly, since a process with a dead pool cannot return an HTTP status.", "A process with a dead pool can still answer a static 200, which is exactly why this check misses it."],
        ],
        1,
      ),
      stressTest10xQuestion: s(
        "During a rolling deploy at 5x traffic, what is the risk of using the static check as the readiness gate as well?",
        ["New pods report ready at process start, before pools or caches are warm, and take traffic while failing.", "The check passes immediately, so unprepared pods get routed real requests and error."],
        [
          ["Rolling updates pause forever, since the controller waits for the check to prove the schema matches.", "A static 200 proves nothing about schema, and it never blocks a rollout."],
          ["The check returns 200 only to the first caller and then gets rate limited, so pods flap between ready and unready.", "A hardcoded response is not rate limited or stateful, so it does not flap."],
        ],
        0,
      ),
    },
  ],
  "opt-health-checks-antipattern": [
    {
      tradeoffDefenseQuestion: d(
        "Why is a heavy query a poor probe for detecting that a pod cannot reach the database?",
        ["It can fail for unrelated reasons like a slow table or lock, so healthy pods are removed wrongly for them.", "A complex query mixes connectivity with query performance, which produces false failures."],
        [
          ["Databases run heavy queries in read-only mode, so the probe fails even when the pool is perfectly healthy.", "Being a read has no effect on a healthy pool; the trouble is that query cost makes results noisy."],
          ["A probe is only valid if it returns an empty result set, and a JOIN across many tables never does.", "Probes judge by success within a timeout, not by an empty result."],
        ],
        2,
      ),
      stressTest10xQuestion: s(
        "As autoscaling adds pods to handle 10x traffic, what does the JOIN probe do to the database?",
        ["Each new pod adds its own probe, so scaling out multiplies heavy queries and makes the database slower for real traffic.", "Probe load grows with the pod count, so autoscaling adds work to the database it is trying to protect."],
        [
          ["Autoscaling removes pods when probes get slow, since latency signals low demand, so capacity shrinks as load grows.", "Autoscalers scale on load metrics and would not read slow probes as low demand."],
          ["The ingress controller caches probe responses, so failures are reported after the outage has already ended.", "Probe results are evaluated by the kubelet, and caching by ingress is not the failure mode."],
        ],
        1,
      ),
    },
  ],
  "opt-cap-pacelc-recommended": [
    {
      tradeoffDefenseQuestion: d(
        "How does CP mode keep the minority side honest with clients during the partition?",
        ["It refuses the write with an error, so the client knows it failed and can retry on the majority.", "The minority returns an explicit failure instead of pretending success, so no client believes a lost write was saved."],
        [
          ["It buffers the write locally and tells the client it succeeded, then replays it once the partition heals.", "Acknowledging a write that later may not commit breaks the consistency CP mode promises."],
          ["It serves reads and writes locally but marks them tentative so the client can discard them later.", "Tentative writes on both sides are AP behaviour and need merging; CP avoids that by refusing."],
        ],
        0,
      ),
      stressTest10xQuestion: s(
        "Even without a partition, what does choosing CP keep costing as load grows 10x?",
        ["Write latency: each write waits for a quorum round trip, and commit time grows with leader queue depth.", "Coordination costs latency all the time, not only during partitions, and it grows as the leader queues more writes."],
        [
          ["Nothing, because the extra latency exists only during a partition and CP mode is free the rest of the time.", "PACELC says the latency versus consistency trade-off applies even when the network is healthy."],
          ["Read throughput drops because every read is sent to all replicas, multiplying read traffic by the replication factor.", "CP reads can be served from the leader or a quorum-checked replica; they need not fan out to all replicas."],
        ],
        2,
      ),
    },
  ],
  "opt-cap-pacelc-alternative": [
    {
      tradeoffDefenseQuestion: d(
        "Why does AP mode need a deterministic merge rule such as version vectors or CRDTs, and not just timestamps?",
        ["Clocks drift, so last-timestamp-wins can silently drop a real update; merge rules flag conflicts instead.", "Clock skew makes timestamp ordering unreliable, so concurrent updates need a rule that keeps or surfaces both."],
        [
          ["Timestamps cannot be stored while a partition is active, so racks have no way to order writes at all.", "Timestamps can be stored during a partition; the trouble is that clocks differ across racks."],
          ["Timestamps are unique only per node, and the merge needs a global ID to decide which rack owns a record.", "Ownership is not what merging decides; it must reconcile concurrent updates to the same record."],
        ],
        1,
      ),
      stressTest10xQuestion: s(
        "At 5x write volume, which user-visible problem worsens most under AP mode during a partition?",
        ["Racks serve different values for longer, since more writes stay unreplicated until the partition ends.", "Divergent reads grow with write rate and partition length, so the two racks disagree about more data."],
        [
          ["Reads start failing with errors, since AP nodes refuse queries whenever they cannot reach the other rack.", "AP nodes keep answering during a partition; that is the availability they are chosen for."],
          ["Writes are acknowledged and then rolled back at once, since AP nodes wait for the other rack before answering.", "AP nodes ack locally without waiting; rollbacks do not occur at once."],
        ],
        0,
      ),
    },
  ],
  "opt-cap-pacelc-antipattern": [
    {
      tradeoffDefenseQuestion: d(
        "What does cutting the cross-rack link give up compared with choosing CP or AP on purpose?",
        ["It makes the split permanent with no quorum to reject stale writes and no plan to reconcile data.", "You keep the split but lose both designs' safeguards: neither a quorum rule nor a merge strategy exists."],
        [
          ["It keeps consistency but drops availability, so it is CP mode with extra steps and higher hardware cost.", "Without a quorum, racks keep accepting writes independently, so consistency is not kept."],
          ["It makes reads consistent since each rack sees only its own data, which removes the need to reconcile.", "Each rack having its own data is divergence, not consistency, and it must be reconciled eventually."],
        ],
        2,
      ),
      stressTest10xQuestion: s(
        "At 10x traffic, what do clients experience once the link is cut and racks run independently?",
        ["Clients that switch racks find recent writes missing, so visible loss grows with traffic.", "Each rack has only part of the history, so anyone routed to the other rack sees data vanish."],
        [
          ["Each rack tries to reach the other on every write, so timeouts stack up and write latency grows 10x.", "With the link cut, writes complete locally and do not wait on the other rack."],
          ["Both racks elect themselves leader more often as traffic rises, and elections consume most CPU.", "Election frequency is driven by failures and timeouts, not by request volume."],
        ],
        0,
      ),
    },
  ],
  "opt-consensus-quorums-recommended": [
    {
      tradeoffDefenseQuestion: d(
        "Why does Raft use randomized election timeouts?",
        ["So followers rarely time out together, letting one candidate win a majority instead of splitting votes.", "Randomness spreads out candidacies so one candidate usually wins a term before others start."],
        [
          ["So the node with the most recent hardware clock wins, which gives each term a leader with the correct time.", "Raft does not depend on clock accuracy to choose a leader."],
          ["So each node waits a different time before writing, which orders concurrent client writes without a leader.", "Timeouts govern elections; the leader's log orders the writes."],
        ],
        1,
      ),
      stressTest10xQuestion: s(
        "To handle 10x traffic you grow the cluster from 3 to 7 nodes. What happens to write performance?",
        ["It does not improve: the leader still orders every write and waits on a larger majority.", "Adding voters adds replication work and a bigger quorum, but write throughput stays limited by the one leader."],
        [
          ["Writes scale roughly linearly because each of the seven nodes can accept and order writes independently.", "In Raft only the leader orders writes, so more nodes do not add write capacity."],
          ["Latency drops because the quorum is smaller relative to the cluster, so slow nodes are simply outvoted.", "A 7-node cluster needs 4 acknowledgements, so the quorum is larger, not smaller."],
        ],
        0,
      ),
    },
  ],
  "opt-consensus-quorums-alternative": [
    {
      tradeoffDefenseQuestion: d(
        "Why is a single-node claim acceptable for a cache warming job but not for a job that debits accounts?",
        ["A duplicate cache warm-up is harmless, but two leaders debiting an account cause real double spends.", "Repeating idempotent work is safe, while repeating a debit changes real balances twice."],
        [
          ["Cache warming runs on read replicas, which have no leader, so leadership claims never conflict there.", "Warming jobs can still have leaders; the difference is that repeating them does no harm."],
          ["Accounts require a majority to be stored, whereas cache entries are not replicated and cannot be inconsistent.", "Cache entries can be stale or duplicated; the point is that this is harmless."],
        ],
        2,
      ),
      stressTest10xQuestion: s(
        "As partitions grow 5x, what happens to external side effects like emails or dispatched jobs?",
        ["Each extra simultaneous leader repeats them, so duplicate external actions grow with every flap.", "More windows with several leaders mean more repeated emails, jobs and calls to outside systems."],
        [
          ["Every claim invalidates the previous term's log, so committed entries disappear from followers that stored them.", "Without terms or a log there is nothing to invalidate; the problem is duplicated actions."],
          ["Nodes must wait for a majority to acknowledge each claim, so failover time grows with cluster size.", "This option skips majority acknowledgement entirely, which is why claims are fast."],
        ],
        0,
      ),
    },
  ],
  "opt-consensus-quorums-antipattern": [
    {
      tradeoffDefenseQuestion: d(
        "What does a leader's log provide that plain broadcast lacks?",
        ["One agreed order of writes, so every replica applies the same sequence and ends in the same state.", "A single sequence for all replicas to follow, which broadcast cannot guarantee."],
        [
          ["A guarantee that every packet is delivered, since broadcast without a leader can lose messages permanently.", "Delivery is handled by the transport and retries; the leader adds ordering, not delivery."],
          ["Faster fan-out, because only the leader sends over the network and followers never need to talk to each other.", "Replicating through a leader adds a hop; the benefit is agreement on order, not speed."],
        ],
        1,
      ),
      stressTest10xQuestion: s(
        "At 10x traffic, what happens when a node that was down comes back in a cluster with no log or leader?",
        ["It cannot tell which writes it missed or in what order, so it needs a full copy or stays permanently different.", "With no ordered log to compare, catch-up means a full resync, and the risk of divergence grows with the missed writes."],
        [
          ["It replays the broadcast queue in order, so it catches up faster at higher traffic because the queue is denser.", "Broadcast keeps no replayable ordered queue, and a bigger backlog does not speed up catch-up."],
          ["It asks for a majority vote on each missed write, so catch-up time grows quadratically with the backlog.", "There is no voting in this design; that is the absence of consensus."],
        ],
        0,
      ),
    },
  ],
};
