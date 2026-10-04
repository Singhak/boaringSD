How does ONE thread watch 10,000 sockets? The answer is epoll 🔌

❌ select: copies and scans every fd on every call, max 1,024
✅ epoll: register once, get back only the ready sockets
📈 Cost follows active connections, not total connections
🟰 Level vs edge triggered: Redis uses level
⚠️ Not magic: under ~100 sockets select is just as fast

This is the engine behind Redis, Nginx and Node.js on Linux.

Save this for your next system design interview 📌
Full article: link in bio 🔗
Follow for the Redis and DB design series.

#redis #linux #epoll #systemdesign #backend #networking #softwareengineering #interviewprep #coding #developers
