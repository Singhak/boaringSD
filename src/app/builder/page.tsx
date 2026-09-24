"use client";

import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react";
import Navbar from "@/components/Navbar";
import { ArchNode } from "@/components/builder/CustomNodes";
import {
  Users,
  Server,
  Layers,
  Zap,
  Database,
  HardDrive,
  Globe,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Flame,
  X,
} from "lucide-react";
import { playBlipSound, playSuccessSound, playErrorSound } from "@/lib/sound";
import { evaluateArchitectureScore } from "@/lib/builderScore";
import { RemovableEdge } from "@/components/builder/RemovableEdge";

const nodeTypes = {
  customNode: ArchNode,
};

const edgeTypes = {
  removableEdge: RemovableEdge,
};

const rawInitialNodes: Node[] = [
  {
    id: "clients-1",
    type: "customNode",
    position: { x: 50, y: 150 },
    data: { label: "10,000 Users", type: "client", status: "healthy", cpu: 15 },
  },
  {
    id: "lb-1",
    type: "customNode",
    position: { x: 260, y: 150 },
    data: { label: "Nginx LB", type: "load_balancer", status: "healthy", cpu: 32 },
  },
  {
    id: "server-1",
    type: "customNode",
    position: { x: 480, y: 80 },
    data: { label: "API Server 1", type: "server", status: "healthy", cpu: 45 },
  },
  {
    id: "server-2",
    type: "customNode",
    position: { x: 480, y: 220 },
    data: { label: "API Server 2", type: "server", status: "healthy", cpu: 40 },
  },
  {
    id: "cache-1",
    type: "customNode",
    position: { x: 700, y: 80 },
    data: { label: "Redis Cluster", type: "cache", status: "healthy", cpu: 20 },
  },
  {
    id: "db-1",
    type: "customNode",
    position: { x: 700, y: 220 },
    data: { label: "Postgres Master", type: "database", status: "healthy", cpu: 38 },
  },
];

const rawInitialEdges: Edge[] = [
  { id: "e1-2", source: "clients-1", target: "lb-1", type: "removableEdge", animated: true },
  { id: "e2-3", source: "lb-1", target: "server-1", type: "removableEdge", animated: true },
  { id: "e2-4", source: "lb-1", target: "server-2", type: "removableEdge", animated: true },
  { id: "e3-5", source: "server-1", target: "cache-1", type: "removableEdge", animated: true },
  { id: "e4-5", source: "server-2", target: "cache-1", type: "removableEdge", animated: true },
  { id: "e3-6", source: "server-1", target: "db-1", type: "removableEdge", animated: true },
  { id: "e4-6", source: "server-2", target: "db-1", type: "removableEdge", animated: true },
];

export default function BuilderPage() {
  const [trafficRps, setTrafficRps] = useState<number>(10000);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<{
    type: "node" | "edge";
    id: string;
    label?: string;
  } | null>(null);

  const removeNode = useCallback((nodeId: string) => {
    playBlipSound();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedElement((prev) => (prev?.id === nodeId ? null : prev));
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    playBlipSound();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedElement((prev) => (prev?.id === edgeId ? null : prev));
  }, []);

  const [nodes, setNodes] = useState<Node[]>(() =>
    rawInitialNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onRemove: () => removeNode(n.id),
      },
    }))
  );

  const [edges, setEdges] = useState<Edge[]>(() =>
    rawInitialEdges.map((e) => ({
      ...e,
      type: "removableEdge",
      data: { onRemove: (id: string) => removeEdge(id) },
    }))
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      playBlipSound();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "removableEdge",
            animated: true,
            data: { onRemove: (id: string) => removeEdge(id) },
          },
          eds
        )
      );
    },
    [removeEdge]
  );

  const addComponent = (type: string, label: string) => {
    playBlipSound();
    const newId = `${type}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: "customNode",
      position: {
        x: 200 + Math.floor(Math.random() * 200),
        y: 100 + Math.floor(Math.random() * 200),
      },
      data: {
        label,
        type,
        status: "healthy",
        cpu: 25,
        onRemove: () => removeNode(newId),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };


  // Recompute node statuses dynamically when traffic or topology changes
  const evaluateTopology = useCallback((rps: number, currentNodes: Node[]) => {
    const hasLB = currentNodes.some((n) => (n.data as any).type === "load_balancer");
    const serverNodes = currentNodes.filter((n) => (n.data as any).type === "server");
    const hasCache = currentNodes.some((n) => (n.data as any).type === "cache");
    const hasDB = currentNodes.some((n) => (n.data as any).type === "database");
    const hasCDN = currentNodes.some((n) => (n.data as any).type === "cdn");

    const serverCount = Math.max(1, serverNodes.length);
    // If no LB, server 1 takes 100% of traffic
    const effectiveTrafficPerServer = hasLB ? rps / serverCount : rps;
    const baseServerCpu = Math.min(100, Math.round((effectiveTrafficPerServer / 2500) * 40));

    return currentNodes.map((n) => {
      const type = (n.data as any).type;
      let cpu = 15;
      let status: "healthy" | "warning" | "overloaded" = "healthy";

      if (type === "server") {
        cpu = baseServerCpu;
        if (cpu > 85) status = "overloaded";
        else if (cpu > 55) status = "warning";
      } else if (type === "database") {
        // Cache intercepts 90% of traffic
        const dbHits = hasCache ? rps * 0.08 : rps;
        cpu = Math.min(100, Math.round((dbHits / 1500) * 35));
        if (cpu > 85) status = "overloaded";
        else if (cpu > 60) status = "warning";
      } else if (type === "load_balancer") {
        cpu = Math.min(75, Math.round((rps / 5000) * 20));
      } else if (type === "cache") {
        cpu = Math.min(60, Math.round((rps / 10000) * 15));
      }

      return {
        ...n,
        data: {
          ...n.data,
          cpu,
          status,
        },
      };
    });
  }, []);

  const handleSliderChange = (newRps: number) => {
    setTrafficRps(newRps);
    setNodes((prev) => evaluateTopology(newRps, prev));
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    playBlipSound();
    setNodes((prev) => evaluateTopology(trafficRps, prev));

    const serverNodes = nodes.filter((n) => (n.data as any).type === "server");
    const hasCache = nodes.some((n) => (n.data as any).type === "cache");
    const hasLB = nodes.some((n) => (n.data as any).type === "load_balancer");

    if ((serverNodes.length === 1 && trafficRps > 10000) || (!hasCache && trafficRps > 20000) || !hasLB && serverNodes.length > 1) {
      playErrorSound();
    } else {
      playSuccessSound();
    }
  };

  // Build - Break - Fix: Chaos Trigger
  const triggerChaosBreak = () => {
    playErrorSound();
    const extremeRps = 100000;
    setTrafficRps(extremeRps);
    setNodes((prev) => evaluateTopology(extremeRps, prev));
  };

  const handleReset = () => {
    setNodes(
      rawInitialNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onRemove: () => removeNode(n.id),
        },
      }))
    );
    setEdges(
      rawInitialEdges.map((e) => ({
        ...e,
        type: "removableEdge",
        data: { onRemove: (id: string) => removeEdge(id) },
      }))
    );
    setTrafficRps(10000);
    setIsSimulating(false);
    setSelectedElement(null);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setIsSimulating(false);
    setSelectedElement(null);
  };

  // Diagnostics check
  const serverCount = nodes.filter((n) => (n.data as any).type === "server").length;
  const hasLB = nodes.some((n) => (n.data as any).type === "load_balancer");
  const hasCache = nodes.some((n) => (n.data as any).type === "cache");
  const hasDB = nodes.some((n) => (n.data as any).type === "database");
  const architectureScore = evaluateArchitectureScore(nodes, trafficRps);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold text-xs uppercase tracking-wider border border-cyan-500/30">
                Sandbox Mode
              </span>
              <h1 className="text-xl font-black text-white">
                Architecture Builder Playground
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag, connect, and stress-test custom distributed systems in real time.
            </p>
          </div>

          {/* Traffic Simulator Slider (Enhancement 4) */}
          <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Traffic Load
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {trafficRps.toLocaleString()} req/s
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="100000"
              step="500"
              value={trafficRps}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-32 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Action Buttons: Simulate, Chaos Break, Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulate}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                Simulate
              </button>
              <button
                onClick={triggerChaosBreak}
                className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                title="Break System (Traffic Spike to 100k RPS)"
              >
                <Flame className="w-3.5 h-3.5 fill-rose-500" />
                Break System
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset to Template"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Boss Challenge</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${architectureScore.canPass ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
                {architectureScore.canPass ? "Pass" : "Needs Fix"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{architectureScore.score}</span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
            <div className="mt-2 text-lg font-black text-cyan-300">Grade {architectureScore.grade}</div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">{architectureScore.summary}</p>
            <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${architectureScore.canPass ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : "bg-gradient-to-r from-amber-400 to-rose-500"}`}
                style={{ width: `${architectureScore.score}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2 text-[11px] text-slate-300">
              {architectureScore.findings.map((finding) => (
                <li key={finding} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Builder Workspace: Sidebar Palette + React Flow Canvas */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
          {/* Component Palette Toolbar */}
          <div className="lg:col-span-3 p-4 rounded-2xl glass-card border border-white/10 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Component Palette
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => addComponent("client", "Users Fleet")}
                className="w-full p-2.5 rounded-xl bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-cyan-300 transition-all"
              >
                <Users className="w-4 h-4 text-cyan-400" />
                <span>+ Users Client</span>
              </button>

              <button
                onClick={() => addComponent("load_balancer", "HAProxy LB")}
                className="w-full p-2.5 rounded-xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-emerald-300 transition-all"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>+ Load Balancer</span>
              </button>

              <button
                onClick={() => addComponent("server", `Server ${serverCount + 1}`)}
                className="w-full p-2.5 rounded-xl bg-blue-950/20 hover:bg-blue-950/40 border border-blue-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-blue-300 transition-all"
              >
                <Server className="w-4 h-4 text-blue-400" />
                <span>+ Web/API Server</span>
              </button>

              <button
                onClick={() => addComponent("cache", "Redis Cache")}
                className="w-full p-2.5 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-amber-300 transition-all"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>+ In-Memory Cache</span>
              </button>

              <button
                onClick={() => addComponent("database", "Postgres Master")}
                className="w-full p-2.5 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-purple-300 transition-all"
              >
                <Database className="w-4 h-4 text-purple-400" />
                <span>+ SQL Database</span>
              </button>

              <button
                onClick={() => addComponent("replica", "Read Replica")}
                className="w-full p-2.5 rounded-xl bg-teal-950/20 hover:bg-teal-950/40 border border-teal-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-teal-300 transition-all"
              >
                <HardDrive className="w-4 h-4 text-teal-400" />
                <span>+ Read Replica</span>
              </button>

              <button
                onClick={() => addComponent("cdn", "Cloudflare CDN")}
                className="w-full p-2.5 rounded-xl bg-sky-950/20 hover:bg-sky-950/40 border border-sky-500/30 flex items-center gap-2.5 text-left text-xs font-semibold text-sky-300 transition-all"
              >
                <Globe className="w-4 h-4 text-sky-400" />
                <span>+ Edge CDN</span>
              </button>
            </div>

            {/* Architecture Diagnostics & Fix Suggestions (Build-Break-Fix Loop) */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  System Diagnostics
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Phase 3: Fix</span>
              </div>

              <div className="space-y-2 text-xs">
                {!hasLB && serverCount > 1 && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Multiple servers need a Load Balancer to balance traffic.</span>
                    </div>
                    <button
                      onClick={() => addComponent("load_balancer", "HAProxy LB")}
                      className="w-full py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold text-amber-200 border border-amber-500/40 transition-colors"
                    >
                      + Fix: Deploy Load Balancer
                    </button>
                  </div>
                )}

                {trafficRps > 12000 && !hasCache && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>High traffic without cache risks database disk bottleneck!</span>
                    </div>
                    <button
                      onClick={() => addComponent("cache", "Redis Cache")}
                      className="w-full py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-bold text-rose-200 border border-rose-500/40 transition-colors"
                    >
                      + Fix: Deploy In-Memory Cache
                    </button>
                  </div>
                )}

                {serverCount === 1 && trafficRps > 8000 && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Single compute node is overheating under traffic load.</span>
                    </div>
                    <button
                      onClick={() => addComponent("server", `Server ${serverCount + 1}`)}
                      className="w-full py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-[11px] font-bold text-cyan-200 border border-cyan-500/40 transition-colors"
                    >
                      + Fix: Scale Web Server
                    </button>
                  </div>
                )}

                {hasLB && hasCache && serverCount >= 2 && hasDB && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Fault-tolerant Tier-3 design! System survives 100k+ RPS spikes.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* React Flow Canvas with Node & Connection Removal Options */}
          <div className="lg:col-span-9 h-[580px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
            {/* Contextual Selection Action Bar */}
            {selectedElement && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md animate-fadeIn text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-slate-400">Selected {selectedElement.type}:</span>
                  <span className="font-bold text-white font-mono">{selectedElement.label}</span>
                </div>
                <button
                  onClick={() => {
                    if (selectedElement.type === "node") {
                      removeNode(selectedElement.id);
                    } else {
                      removeEdge(selectedElement.id);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete {selectedElement.type === "node" ? "Node" : "Connection"}</span>
                </button>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Deselect"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: "removableEdge", animated: true }}
              onNodeClick={(_, node) =>
                setSelectedElement({
                  type: "node",
                  id: node.id,
                  label: (node.data as any)?.label || node.id,
                })
              }
              onEdgeClick={(_, edge) =>
                setSelectedElement({
                  type: "edge",
                  id: edge.id,
                  label: `${edge.source} ➔ ${edge.target}`,
                })
              }
              onPaneClick={() => setSelectedElement(null)}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
            >
              <Background color="#1e293b" gap={20} />
              <Controls className="!bg-slate-900 !border-slate-800 !text-white" />
            </ReactFlow>

            {/* Instruction Tag */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 backdrop-blur pointer-events-none flex items-center gap-2">
              <span className="font-semibold text-cyan-400">Controls:</span>
              <span>Click ✕ on connection or 🗑 on node to remove. Or select &amp; press Delete/Backspace.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
