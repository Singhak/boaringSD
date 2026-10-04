Redis crashed. How much data did you lose? 💥

📸 RDB: periodic snapshots. Fast restart, but you can lose minutes.
📝 AOF: logs every write. With everysec you lose about 1 second.
🧬 Hybrid: RDB + AOF for fast load and low loss.
🛡️ Persistence is not high availability: add replicas and off-box backups.

Rule of thumb: pure cache = none, can lose minutes = RDB, data matters = AOF everysec + hybrid.

Save this for your next system design interview 📌
Full article: link in bio 🔗
Follow for the Redis and DB design series.

#redis #systemdesign #backend #database #persistence #devops #softwareengineering #interviewprep #coding #developers
