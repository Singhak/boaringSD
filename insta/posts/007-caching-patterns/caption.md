Where does the cache sit between your app and your DB? 🧠 4 patterns:

1️⃣ Cache-aside: app checks cache, loads DB on a miss, deletes the key on write. The default.
2️⃣ Read-through: the cache layer loads the DB for you
3️⃣ Write-through: cache + DB written together. Consistent but slower.
4️⃣ Write-back: ack from cache, flush to DB later. Fast, but can lose data.

Why delete on write instead of updating the cache? Racing writers can leave a stale value.

Save this for your next system design interview 📌
Full article: link in bio 🔗
Follow for the Redis and DB design series.

#redis #caching #systemdesign #backend #cacheaside #database #softwareengineering #interviewprep #coding #developers
