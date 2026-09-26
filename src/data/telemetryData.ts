import { ComponentKind, NodeTelemetry } from "@/types";

export function getMockTelemetryForNode(
  nodeId: string,
  role: ComponentKind,
  isOverloaded: boolean = false,
  overrides?: Partial<NodeTelemetry>
): NodeTelemetry {
  const now = new Date();
  const timeStr = (secondsAgo: number) => {
    const d = new Date(now.getTime() - secondsAgo * 1000);
    return d.toTimeString().split(" ")[0] + "." + String(d.getMilliseconds()).padStart(3, "0");
  };

  switch (role) {
    case "server":
      if (isOverloaded) {
        return {
          nodeId,
          nodeName: nodeId === "server-1" ? "App Server 1 (Monolith Fleet)" : "App Server 2",
          role: "server",
          status: "CRITICAL",
          cpuUsage: 98,
          memoryUsedMb: 7680,
          memoryTotalMb: 8192,
          activeConnections: 4850,
          maxConnections: 5000,
          workerThreadsUsed: 64,
          workerThreadsTotal: 64,
          p99LatencyMs: 4200,
          errorRate: 48.4,
          logs: [
            {
              timestamp: timeStr(1),
              level: "FATAL",
              source: "uvicorn.workers",
              message: "Worker thread starvation: all 64 async coroutines blocked waiting on socket I/O",
              durationMs: 4180,
              highlight: true,
            },
            {
              timestamp: timeStr(2),
              level: "ERROR",
              source: "kernel.tcp",
              message: "TCP accept queue syn_backlog overflow (limit 512). Dropping SYN packets",
              highlight: true,
            },
            {
              timestamp: timeStr(4),
              level: "WARN",
              source: "jvm.gc",
              message: "Stop-the-world major GC pause took 890ms. Memory pressure: 94.2%",
              durationMs: 890,
            },
            {
              timestamp: timeStr(6),
              level: "ERROR",
              source: "http.ingress",
              message: "504 Gateway Timeout emitted for request /api/v1/feed?cursor=991",
            },
          ],
          knobs: [
            {
              id: "worker_threads",
              label: "Worker Thread Pool",
              description: "Number of concurrent worker threads handling HTTP requests.",
              type: "slider",
              value: 64,
              min: 16,
              max: 128,
              step: 8,
              unit: "threads",
            },
            {
              id: "keepalive_timeout",
              label: "TCP Keep-Alive Timeout",
              description: "How long idle client sockets remain open.",
              type: "slider",
              value: 15,
              min: 5,
              max: 60,
              step: 5,
              unit: "sec",
            },
          ],
          ...overrides,
        };
      } else {
        return {
          nodeId,
          nodeName: nodeId === "server-1" ? "App Server 1" : "App Server 2",
          role: "server",
          status: "HEALTHY",
          cpuUsage: 45,
          memoryUsedMb: 3400,
          memoryTotalMb: 8192,
          activeConnections: 1240,
          maxConnections: 5000,
          workerThreadsUsed: 22,
          workerThreadsTotal: 64,
          p99LatencyMs: 38,
          errorRate: 0.0,
          logs: [
            {
              timestamp: timeStr(1),
              level: "INFO",
              source: "http.ingress",
              message: "GET /api/v1/feed completed with HTTP 200 OK",
              durationMs: 34,
            },
            {
              timestamp: timeStr(3),
              level: "INFO",
              source: "uvicorn.workers",
              message: "All 64 worker threads healthy. Average event loop lag: 1.2ms",
            },
            {
              timestamp: timeStr(5),
              level: "INFO",
              source: "health.probe",
              message: "Kubelet deep HTTP /healthz probe passed. Latency: 4ms",
            },
          ],
          knobs: [
            {
              id: "worker_threads",
              label: "Worker Thread Pool",
              description: "Number of concurrent worker threads handling HTTP requests.",
              type: "slider",
              value: 64,
              min: 16,
              max: 128,
              step: 8,
              unit: "threads",
            },
          ],
          ...overrides,
        };
      }

    case "lb":
      return {
        nodeId,
        nodeName: "Nginx Reverse Proxy / Load Balancer",
        role: "lb",
        status: isOverloaded ? "DEGRADED" : "HEALTHY",
        cpuUsage: isOverloaded ? 78 : 28,
        memoryUsedMb: 1100,
        memoryTotalMb: 4096,
        activeConnections: 9800,
        maxConnections: 50000,
        workerThreadsUsed: 8,
        workerThreadsTotal: 16,
        p99LatencyMs: isOverloaded ? 480 : 8,
        errorRate: isOverloaded ? 35.0 : 0.0,
        logs: isOverloaded
          ? [
              {
                timestamp: timeStr(1),
                level: "WARN",
                source: "nginx.upstream",
                message: "upstream server_1 failed (110: Operation timed out) while reading response header",
                highlight: true,
              },
              {
                timestamp: timeStr(2),
                level: "INFO",
                source: "nginx.access",
                message: "Traffic skew detected: upstream server_1 (100%), server_2 (0%)",
              },
            ]
          : [
              {
                timestamp: timeStr(1),
                level: "INFO",
                source: "nginx.upstream",
                message: "Round-robin distribution verified: 50.1% to server_1, 49.9% to server_2",
              },
              {
                timestamp: timeStr(3),
                level: "INFO",
                source: "nginx.core",
                message: "Active SSL sessions: 9,800. Epoll event loop latency < 1.0ms",
              },
            ],
        knobs: [
          {
            id: "lb_algorithm",
            label: "Routing Algorithm",
            description: "How incoming requests are distributed across healthy targets.",
            type: "select",
            value: "round_robin",
            options: [
              { label: "Round Robin (Equal Distribution)", value: "round_robin" },
              { label: "Least Connections (Dynamic Load)", value: "least_conn" },
              { label: "IP Hash (Sticky Client Sessions)", value: "ip_hash" },
            ],
          },
          {
            id: "upstream_retries",
            label: "Max Upstream Retries",
            description: "Number of retries to another target before returning 504.",
            type: "slider",
            value: 2,
            min: 0,
            max: 5,
            step: 1,
            unit: "retries",
          },
        ],
        ...overrides,
      };

    case "db":
      return {
        nodeId,
        nodeName: "PostgreSQL Primary (Master)",
        role: "db",
        status: isOverloaded ? "CRITICAL" : "HEALTHY",
        cpuUsage: isOverloaded ? 96 : 38,
        memoryUsedMb: isOverloaded ? 15200 : 8400,
        memoryTotalMb: 16384,
        activeConnections: isOverloaded ? 98 : 34,
        maxConnections: 100,
        workerThreadsUsed: isOverloaded ? 98 : 34,
        workerThreadsTotal: 100,
        p99LatencyMs: isOverloaded ? 3800 : 24,
        errorRate: isOverloaded ? 22.0 : 0.0,
        logs: isOverloaded
          ? [
              {
                timestamp: timeStr(1),
                level: "FATAL",
                source: "postgres.conn",
                message: "remaining connection slots are reserved for non-replication superuser connections (98/100)",
                highlight: true,
              },
              {
                timestamp: timeStr(2),
                level: "WARN",
                source: "pg_stat_activity",
                message: "Slow query: SELECT * FROM posts WHERE user_id = $1 ORDER BY id DESC LIMIT 20; (4,820ms)",
                durationMs: 4820,
                highlight: true,
              },
              {
                timestamp: timeStr(4),
                level: "WARN",
                source: "disk.iops",
                message: "EBS gp3 volume IOPS burst credit depleted. Disk wait latency spiked to 48ms",
              },
            ]
          : [
              {
                timestamp: timeStr(1),
                level: "INFO",
                source: "pg_stat_activity",
                message: "WAL write throughput: 14.2 MB/s. Replication stream sync in progress",
              },
              {
                timestamp: timeStr(3),
                level: "INFO",
                source: "postgres.engine",
                message: "Buffer cache hit ratio: 99.4%. Sequential scans: 0",
              },
            ],
        knobs: [
          {
            id: "max_connections",
            label: "Max Postgres Connections",
            description: "Hard limit on simultaneous client sockets.",
            type: "slider",
            value: 100,
            min: 50,
            max: 500,
            step: 50,
            unit: "sockets",
          },
          {
            id: "statement_timeout",
            label: "Statement Timeout",
            description: "Automatically cancels queries that exceed this duration.",
            type: "slider",
            value: 5000,
            min: 1000,
            max: 15000,
            step: 1000,
            unit: "ms",
          },
        ],
        ...overrides,
      };

    case "cache":
      return {
        nodeId,
        nodeName: "Redis In-Memory Cache (Cluster)",
        role: "cache",
        status: isOverloaded ? "DEGRADED" : "HEALTHY",
        cpuUsage: isOverloaded ? 84 : 22,
        memoryUsedMb: isOverloaded ? 3920 : 1800,
        memoryTotalMb: 4096,
        activeConnections: 1800,
        maxConnections: 10000,
        workerThreadsUsed: 1,
        workerThreadsTotal: 1,
        p99LatencyMs: isOverloaded ? 45 : 1.8,
        errorRate: isOverloaded ? 12.0 : 0.0,
        logs: isOverloaded
          ? [
              {
                timestamp: timeStr(1),
                level: "WARN",
                source: "redis.evict",
                message: "OOM command not allowed when used memory > 'maxmemory'. Evicted 45,200 keys/sec",
                highlight: true,
              },
              {
                timestamp: timeStr(3),
                level: "ERROR",
                source: "redis.cache_stampede",
                message: "Hot key 'feed:breaking_news' expired! 14,000 requests missed to database",
                highlight: true,
              },
            ]
          : [
              {
                timestamp: timeStr(1),
                level: "INFO",
                source: "redis.stats",
                message: "Cache hit ratio: 94.8%. 0 keys evicted in last 60 seconds",
              },
              {
                timestamp: timeStr(3),
                level: "INFO",
                source: "redis.singleflight",
                message: "Singleflight coalescing active: merged 8,200 concurrent requests into 1 query",
              },
            ],
        knobs: [
          {
            id: "cache_ttl",
            label: "Cache TTL (Expiration)",
            description: "How long cached items remain in RAM before invalidation.",
            type: "slider",
            value: 300,
            min: 10,
            max: 3600,
            step: 30,
            unit: "sec",
          },
          {
            id: "singleflight_enabled",
            label: "Singleflight Request Coalescing",
            description: "Merges duplicate concurrent requests for missing keys into 1 query.",
            type: "toggle",
            value: true,
          },
        ],
        ...overrides,
      };

    default:
      return {
        nodeId,
        nodeName: nodeId,
        role,
        status: "HEALTHY",
        cpuUsage: 25,
        memoryUsedMb: 1024,
        memoryTotalMb: 4096,
        activeConnections: 100,
        maxConnections: 1000,
        workerThreadsUsed: 4,
        workerThreadsTotal: 16,
        p99LatencyMs: 12,
        errorRate: 0.0,
        logs: [
          {
            timestamp: timeStr(1),
            level: "INFO",
            source: "system",
            message: "Node operating within nominal operational parameters",
          },
        ],
        knobs: [],
        ...overrides,
      };
  }
}
