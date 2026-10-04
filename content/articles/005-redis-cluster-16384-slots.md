---
title: Why does Redis Cluster use 16,384 slots and not more?
summary: The slot map is sent inside every heartbeat. 16,384 slots keeps it at 2 KB while still giving enough granularity for clusters of up to about 1,000 masters.
topic: Redis
tags: redis, cluster, sharding, hash-slots, interview
date: 2026-10-04
post: 005-redis-cluster-16384-slots
---

**Short answer:** the slot map is sent inside every heartbeat message between nodes. 16,384 slots keeps that map small (2 KB), and it is still plenty of granularity for the cluster sizes Redis Cluster is designed for.

## 1. The slot map travels with every ping

- Cluster nodes talk over a **cluster bus** using gossip. They send `PING` and `PONG` messages to each other all the time.
- Each message header includes the sender's **bitmap of the slots it owns**: one bit per slot.
- 16,384 slots: 16,384 / 8 = **2 KB** per message.
- 65,536 slots: 65,536 / 8 = **8 KB** per message.
- With hundreds of nodes pinging each other constantly, 8 KB headers would waste a lot of bandwidth for no real gain.
- The bitmap compresses poorly when a node owns many slots, so you cannot count on compression to fix this.

## 2. Redis Cluster is not designed for huge clusters

- The practical recommended limit is around **1,000 master nodes**.
- With 1,000 masters and 16,384 slots, each master still owns about 16 slots. That is enough granularity to balance load and to move slots between nodes.
- More slots would only matter beyond that size, which Cluster does not aim for.

## 3. Why not fewer?

- Fewer slots means coarser balancing. With very few slots per node, you cannot spread data evenly or move small pieces when resharding.
- 16,384 is a balance: small enough for cheap heartbeats, large enough for even distribution.

## 4. The hashing detail

- CRC16 produces a 16-bit value, so there are 65,536 possible hashes.
- Redis uses only the lower 14 bits: `slot = CRC16(key) & 16383` (equal to `mod 16384`).
- It could have used all 65,536 values. This was a deliberate choice for the bandwidth reason above. It was explained by Redis's creator, Salvatore Sanfilippo (antirez), in a GitHub discussion.

```text
CRC16("user:42") = 16-bit number
slot = number & 16383     (0 to 16383)
```

## 5. Trade-off

- You get cheap gossip and good-enough balancing.
- The cost is an upper limit on useful cluster size, and a fixed slot count.
- Other systems choose differently. Some use consistent hashing with virtual nodes, and others use many more partitions.

## Interview one-liner

> The cluster bus sends each node's slot ownership as a bitmap in every heartbeat. 16,384 slots makes that bitmap 2 KB; 65,536 would make it 8 KB. Since Redis Cluster targets up to about 1,000 masters, 16,384 slots still gives each master enough slots to balance and reshard, so it is the sweet spot between message size and granularity.

## Cross questions to expect

1. What is the cluster bus and how does gossip work?
2. How does Redis Cluster detect a failed node (`PFAIL` vs `FAIL`)?
3. How does resharding move a slot live (`MIGRATING`/`IMPORTING`, `ASK`)?
4. How is this different from consistent hashing with virtual nodes?
