"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Send, CornerDownLeft, Sparkles, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { NodeTelemetry } from "@/types";
import { playBlipSound } from "@/lib/sound";

interface SRECommandShellProps {
  telemetry: NodeTelemetry;
}

interface CommandHistoryEntry {
  id: string;
  command: string;
  output: string | React.ReactNode;
  timestamp: string;
  isError?: boolean;
}

function buildWelcomeEntry(telemetry: NodeTelemetry, hostname: string): CommandHistoryEntry {
  return {
    id: "welcome",
    command: "uname -a && uptime",
    timestamp: new Date().toLocaleTimeString(),
    output: (
      <div className="space-y-1 text-slate-300">
        <div>Linux {hostname} 5.15.0-89-generic #99-Ubuntu SMP x86_64 GNU/Linux</div>
        <div className="text-cyan-300 font-semibold">
          System status: {telemetry.status} · Load average: {(telemetry.cpuUsage / 25).toFixed(2)}, {((telemetry.cpuUsage + 5) / 25).toFixed(2)}, {((telemetry.cpuUsage + 10) / 25).toFixed(2)}
        </div>
        <div className="text-slate-400 text-[11px]">
          Type <span className="text-amber-300">help</span> for available diagnostics or click the quick command chips below.
        </div>
      </div>
    ),
  };
}

function shellHostname(telemetry: NodeTelemetry): string {
  return `warroom-${telemetry.role}-${telemetry.nodeId.replace(/[^a-zA-Z0-9-]/g, "")}`;
}

export default function SRECommandShell({ telemetry }: SRECommandShellProps) {
  const [inputCmd, setInputCmd] = useState("");
  const [history, setHistory] = useState<CommandHistoryEntry[]>(() => [buildWelcomeEntry(telemetry, shellHostname(telemetry))]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hostname = shellHostname(telemetry);

  // Restart the session banner when the inspected node's state changes
  const welcomeKey = `${telemetry.nodeId}|${telemetry.role}|${telemetry.status}|${telemetry.cpuUsage}`;
  const [shownWelcomeKey, setShownWelcomeKey] = useState(welcomeKey);
  if (welcomeKey !== shownWelcomeKey) {
    setShownWelcomeKey(welcomeKey);
    setHistory([buildWelcomeEntry(telemetry, hostname)]);
  }

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    playBlipSound();
    const parts = trimmed.split(" ");
    const bin = parts[0].toLowerCase();
    const now = new Date().toLocaleTimeString();

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    let outputNode: React.ReactNode;
    let isErr = false;

    // Command Dispatcher
    switch (bin) {
      case "help":
        outputNode = (
          <div className="space-y-1 text-slate-300">
            <div className="text-cyan-300 font-bold">Standard SRE Diagnostic Utilities:</div>
            <div>  <span className="text-amber-300">top</span> / <span className="text-amber-300">htop</span> : Display running tasks and CPU core saturation</div>
            <div>  <span className="text-amber-300">netstat</span> / <span className="text-amber-300">ss</span> : Network socket connection backlog and drops</div>
            <div>  <span className="text-amber-300">curl</span> : Perform HTTP health probe (e.g. curl -Iv /health)</div>
            <div>  <span className="text-amber-300">uptime</span> : Load averages and system uptime</div>
            <div>  <span className="text-amber-300">df -h</span> : File system and volume disk space</div>
            <div>  <span className="text-amber-300">clear</span> : Clear terminal scrollback</div>
            {telemetry.role === "server" && (
              <div className="pt-1 text-sky-300">
                <div>  <span className="text-emerald-300">systemctl status app</span> : API worker process & thread pool status</div>
                <div>  <span className="text-emerald-300">dmesg | grep oom</span> : Kernel out-of-memory kill log</div>
              </div>
            )}
            {(telemetry.role === "db" || telemetry.role === "replica") && (
              <div className="pt-1 text-purple-300">
                <div>  <span className="text-emerald-300">psql -c &quot;SHOW max_connections;&quot;</span> : Database connection ceiling</div>
                <div>  <span className="text-emerald-300">psql pg_stat_activity</span> : Inspect active running queries and lock waits</div>
              </div>
            )}
            {telemetry.role === "cache" && (
              <div className="pt-1 text-amber-300">
                <div>  <span className="text-emerald-300">redis-cli info memory</span> : RAM usage, maxmemory, eviction policy</div>
                <div>  <span className="text-emerald-300">redis-cli info stats</span> : Keyspace hits and misses</div>
              </div>
            )}
          </div>
        );
        break;

      case "clear":
        setHistory([]);
        setInputCmd("");
        return;

      case "uptime":
        outputNode = (
          <div className="text-slate-200">
            {now} up 14 days, 3:42, 2 users, load average: {(telemetry.cpuUsage / 25).toFixed(2)}, {((telemetry.cpuUsage + 5) / 25).toFixed(2)}, {((telemetry.cpuUsage + 10) / 25).toFixed(2)}
          </div>
        );
        break;

      case "df":
        outputNode = (
          <div className="text-slate-200 font-mono text-[11px] whitespace-pre">
            Filesystem      Size  Used Avail Use% Mounted on{`\n`}
            /dev/nvme0n1p1   50G   14G   34G  30% /{`\n`}
            /dev/nvme1n1    200G   92G   98G  49% /var/log{`\n`}
            tmpfs           7.8G     0  7.8G   0% /dev/shm
          </div>
        );
        break;

      case "netstat":
      case "ss":
        outputNode = (
          <div className="text-slate-200 font-mono text-[11px] space-y-1">
            <div>Active Internet connections (servers and established)</div>
            <div className="text-cyan-300">
              TCP Established: {telemetry.activeConnections.toLocaleString()} sockets (Limit: {telemetry.maxConnections.toLocaleString()})
            </div>
            {telemetry.activeConnections >= telemetry.maxConnections * 0.85 ? (
              <div className="text-rose-400 font-bold">
                [ALERT] TCP backlog queue is at 98% capacity! TCP SYN packets are being dropped.
              </div>
            ) : (
              <div className="text-emerald-300">
                TCP backlog is healthy. No socket queue drops observed.
              </div>
            )}
          </div>
        );
        break;

      case "curl":
        const isHealthy = telemetry.status === "HEALTHY" || telemetry.cpuUsage < 80;
        outputNode = (
          <div className="text-slate-200 font-mono text-[11px] space-y-0.5">
            <div>* Connecting to 127.0.0.1:8080...</div>
            <div>* Connected to 127.0.0.1 (127.0.0.1) port 8080 (#0)</div>
            <div>&gt; GET /health HTTP/1.1</div>
            <div>&gt; Host: 127.0.0.1:8080</div>
            <div>&gt; User-Agent: curl/7.81.0</div>
            <div>&gt; Accept: */*</div>
            <div className="pt-1 text-slate-400">&lt; HTTP/1.1 {isHealthy ? "200 OK" : "504 Gateway Timeout"}</div>
            <div className="text-slate-400">&lt; Content-Type: application/json</div>
            <div className="text-slate-400">&lt; Server: Kestrel / Envoy</div>
            <div className="text-slate-400">&lt; X-Response-Time-Ms: {telemetry.p99LatencyMs}</div>
            <div className={`font-bold pt-1 ${isHealthy ? "text-emerald-400" : "text-rose-400"}`}>
              {isHealthy
                ? '{"status":"UP","database":"OK","cache":"OK","latency_ms":' + telemetry.p99LatencyMs + '}'
                : '{"status":"DOWN","error":"ThreadPoolExhausted","threads_locked":' + telemetry.workerThreadsUsed + '}'}
            </div>
          </div>
        );
        break;

      case "top":
      case "htop":
        outputNode = (
          <div className="text-slate-200 font-mono text-[11px] whitespace-pre leading-tight">
            Tasks: 142 total,   2 running, 140 sleeping,   0 stopped,   0 zombie{`\n`}
            %Cpu(s): <span className={telemetry.cpuUsage > 80 ? "text-rose-400 font-bold" : "text-emerald-400"}>{telemetry.cpuUsage}.0 us</span>,  4.2 sy,  0.0 ni, {Math.max(0, 100 - telemetry.cpuUsage - 4)}.2 id,  0.6 wa{`\n`}
            MiB Mem :  16000.0 total,   1200.2 free,  <span className="text-cyan-300">{telemetry.memoryUsedMb}.0 used</span>,   1400.0 buff/cache{`\n`}
{`\n`}
              PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND{`\n`}
             4812 app-srv   20   0   14.2g   8.4g  1200m R  <span className={telemetry.cpuUsage > 80 ? "text-rose-400 font-bold" : "text-emerald-400"}>{Math.min(99, telemetry.cpuUsage * 0.9).toFixed(1)}</span>  52.5  14:22.18 {telemetry.role === "server" ? "node /app/server.js" : telemetry.role === "db" ? "postgres: writer" : "redis-server"}{`\n`}
             4813 app-srv   20   0    2.1g   412m   180m S   4.5   2.6   1:05.42 {telemetry.role === "server" ? "nginx: worker" : "postgres: walwriter"}{`\n`}
              112 root      20   0       0      0      0 I   0.0   0.0   0:02.10 kworker/u16:1
          </div>
        );
        break;

      // PostgreSQL specific
      case "psql":
        if (trimmed.includes("max_connections")) {
          outputNode = (
            <div className="text-slate-200 font-mono text-[11px] whitespace-pre">
               name            | setting | unit | context{`\n`}
              -----------------+---------+------+---------{`\n`}
               max_connections | 100     |      | postmaster{`\n`}
              (1 row){`\n\n`}
              <span className={telemetry.activeConnections >= 95 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                Active Client Sockets: {telemetry.activeConnections} / 100 ({telemetry.activeConnections >= 95 ? "SATURATED - Connection pooling required" : "Healthy headroom"})
              </span>
            </div>
          );
        } else {
          outputNode = (
            <div className="text-slate-200 font-mono text-[11px] whitespace-pre leading-tight">
               pid  |    duration    | state  | query{`\n`}
              ------+----------------+--------+-------------------------------------------------{`\n`}
               4012 | 00:03:14.28101 | active | SELECT * FROM orders WHERE user_id = 91820 FOR UPDATE;{`\n`}
               4013 | 00:03:12.98102 | active | SELECT * FROM orders WHERE user_id = 91820 FOR UPDATE;{`\n`}
               4014 | 00:03:09.11294 | active | SELECT * FROM orders WHERE user_id = 91820 FOR UPDATE;{`\n`}
              <span className="text-amber-300">[24 identical queries waiting on row locks and sequential table scan]</span>
            </div>
          );
        }
        break;

      // Redis specific
      case "redis-cli":
        if (trimmed.includes("memory")) {
          const isOom = telemetry.cpuUsage > 85;
          outputNode = (
            <div className="text-slate-200 font-mono text-[11px] whitespace-pre">
              # Memory{`\n`}
              used_memory: {telemetry.memoryUsedMb * 1024 * 1024}{`\n`}
              used_memory_human: {(telemetry.memoryUsedMb / 1024).toFixed(2)}G{`\n`}
              maxmemory_human: 16.00G{`\n`}
              maxmemory_policy: noeviction{`\n`}
              mem_fragmentation_ratio: 1.18{`\n`}
              {isOom && (
                <span className="text-rose-400 font-bold">
                  # WARNING: (error) OOM command not allowed when used memory &gt; &apos;maxmemory&apos;!
                </span>
              )}
            </div>
          );
        } else {
          outputNode = (
            <div className="text-slate-200 font-mono text-[11px] whitespace-pre">
              # Stats{`\n`}
              total_connections_received: 2489102{`\n`}
              total_commands_processed: 19482012{`\n`}
              keyspace_hits: 1420912{`\n`}
              keyspace_misses: {telemetry.status === "HEALTHY" ? "4210" : "891204"}{`\n`}
              hit_ratio: <span className="text-cyan-300 font-bold">{telemetry.status === "HEALTHY" ? "99.4%" : "61.4% (Cache Stampede detected)"}</span>
            </div>
          );
        }
        break;

      // Systemctl / Services
      case "systemctl":
        outputNode = (
          <div className="text-slate-200 font-mono text-[11px] space-y-1">
            <div>● {telemetry.role}-service.service - Core {telemetry.role.toUpperCase()} Daemon</div>
            <div className="text-slate-400">     Loaded: loaded (/etc/systemd/system/{telemetry.role}.service; enabled)</div>
            <div className={telemetry.status === "HEALTHY" ? "text-emerald-400" : "text-amber-400"}>
              Active: active (running) since Thu 2026-09-26 09:12:00 UTC; 6h ago
            </div>
            <div>   Main PID: 4812 (app-srv)</div>
            <div>      Tasks: {telemetry.workerThreadsUsed} (limit: {telemetry.workerThreadsTotal})</div>
            <div>     Memory: {(telemetry.memoryUsedMb / 1024).toFixed(1)}G (max: {(telemetry.memoryTotalMb / 1024).toFixed(0)}G)</div>
            {telemetry.workerThreadsUsed >= telemetry.workerThreadsTotal && (
              <div className="text-rose-400 font-bold">
                Worker Pool Saturated: All {telemetry.workerThreadsTotal} worker threads are blocked on I/O.
              </div>
            )}
          </div>
        );
        break;

      default:
        isErr = true;
        outputNode = (
          <div className="text-rose-400 font-mono text-xs">
            bash: {bin}: command not found. Type <span className="text-amber-300">help</span> for available diagnostic utilities.
          </div>
        );
        break;
    }

    const newEntry: CommandHistoryEntry = {
      id: Math.random().toString(),
      command: trimmed,
      output: outputNode,
      timestamp: now,
      isError: isErr,
    };

    setHistory((prev) => [...prev, newEntry]);
    setInputCmd("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputCmd);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setInputCmd(commandHistory[commandHistory.length - 1 - nextIdx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCmd(commandHistory[commandHistory.length - 1 - nextIdx] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCmd("");
      }
    }
  };

  // Quick diagnostic badge click handler
  const handleQuickCmd = (cmd: string) => {
    executeCommand(cmd);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="flex flex-col h-[420px] rounded-xl bg-black/90 border border-cyan-500/30 overflow-hidden font-mono text-xs shadow-2xl">
      {/* Shell Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] text-slate-400 pl-2">
            sre@{hostname}:~ (Interactive Shell)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setHistory([])}
          className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
          title="Clear screen"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 select-text">
        {history.map((entry) => (
          <div key={entry.id} className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <span className="text-emerald-400">sre@{hostname}:~$</span>
              <span className="text-white">{entry.command}</span>
            </div>
            <div className="pl-4 text-slate-300">{entry.output}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick Diagnostic Chips Bar */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-t border-white/5 flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-slate-500 uppercase">Quick Diagnostics:</span>
        <button
          type="button"
          onClick={() => handleQuickCmd("top")}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-cyan-300 transition-colors"
        >
          📊 top
        </button>
        <button
          type="button"
          onClick={() => handleQuickCmd("netstat")}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-emerald-300 transition-colors"
        >
          🔌 netstat
        </button>
        <button
          type="button"
          onClick={() => handleQuickCmd("curl -Iv http://127.0.0.1:8080/health")}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-amber-300 transition-colors"
        >
          🌐 curl /health
        </button>
        {(telemetry.role === "db" || telemetry.role === "replica") && (
          <button
            type="button"
            onClick={() => handleQuickCmd("psql -c 'SHOW max_connections;'")}
            className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-[11px] text-purple-300 transition-colors"
          >
            🗄️ psql connections
          </button>
        )}
        {telemetry.role === "cache" && (
          <button
            type="button"
            onClick={() => handleQuickCmd("redis-cli info memory")}
            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-[11px] text-amber-300 transition-colors"
          >
            ⚡ redis memory
          </button>
        )}
      </div>

      {/* Terminal Input Prompt */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black border-t border-cyan-500/20 shrink-0">
        <span className="text-emerald-400 font-bold">sre@{hostname}:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type diagnostic command (e.g. top, netstat, curl, help)..."
          className="flex-1 bg-transparent text-white focus:outline-none font-mono text-xs placeholder-slate-600"
          autoFocus
        />
        <button
          type="button"
          onClick={() => executeCommand(inputCmd)}
          className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
          title="Send command"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
