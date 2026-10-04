Your cache is serving old data. How do you fix it? ⏳

🔄 Invalidation: TTL, delete on write, versioned keys, events
🎲 Add jitter to TTLs so keys don't expire together
😴 Redis expires keys lazily (on access) and actively (sampling)
📈 Memory full? maxmemory-policy decides what gets evicted
🕰️ LRU = recently used, 📊 LFU = frequently used
⚠️ Default policy is noeviction: writes fail when memory is full

For a cache, allkeys-lru or allkeys-lfu is the usual choice.

Save this for your next system design interview 📌
Full article: link in bio 🔗
Follow for the Redis and DB design series.

#redis #caching #ttl #lru #lfu #systemdesign #backend #softwareengineering #interviewprep #developers
