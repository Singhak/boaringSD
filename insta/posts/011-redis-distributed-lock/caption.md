Two servers run the same job. Who gets the lock? 🔐

❌ SETNX then EXPIRE: crash in between = locked forever
✅ SET key token NX PX ttl is atomic. Release with a Lua script that checks the token.
⚠️ It can still lie: TTL expiry during a pause, or failover losing the lock
🖥️ Redlock: lock on a majority of 5 independent masters
🧐 Kleppmann's critique: timing assumptions, no fencing tokens
🛡️ Fencing tokens make the storage reject stale writers

Efficiency only? One Redis lock is fine. Correctness? Use etcd/ZooKeeper with fencing, or skip the lock with a DB row lock or version check.

Save this for your next system design interview 📌
Full article: link in bio 🔗
Follow for the Redis and DB design series.

#redis #distributedsystems #redlock #concurrency #systemdesign #backend #softwareengineering #interviewprep #coding #developers
