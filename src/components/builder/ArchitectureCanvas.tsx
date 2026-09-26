"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { Database, Globe, HardDrive, Layers, ListFilter, Plus, Server, Trash2, Users, X, Zap } from "lucide-react";
import { ArchNode } from "@/components/builder/CustomNodes";
import { RemovableEdge } from "@/components/builder/RemovableEdge";
import { playBlipSound } from "@/lib/sound";
import type { ArchitectureNodeType } from "@/types";

const nodeTypes = { customNode: ArchNode };
const edgeTypes = { removableEdge: RemovableEdge };

export const PALETTE: { type: ArchitectureNodeType; name: string; icon: React.ElementType }[] = [
  { type: "client", name: "Users", icon: Users },
  { type: "cdn", name: "Edge CDN", icon: Globe },
  { type: "load_balancer", name: "Load Balancer", icon: Layers },
  { type: "server", name: "App Server", icon: Server },
  { type: "cache", name: "Redis Cache", icon: Zap },
  { type: "queue", name: "Message Queue", icon: ListFilter },
  { type: "database", name: "Primary DB", icon: Database },
  { type: "replica", name: "Read Replica", icon: HardDrive },
];

/** Builds a canvas node in the shape ArchNode renders. */
export function makeArchNode(id: string, type: ArchitectureNodeType, label: string, x: number, y: number): Node {
  return { id, type: "customNode", position: { x, y }, data: { label, type, status: "idle" } };
}

function freeSpot(nodes: Node[], near?: Node): { x: number; y: number } {
  const taken = (x: number, y: number) =>
    nodes.some((n) => Math.abs(n.position.x - x) < 190 && Math.abs(n.position.y - y) < 95);
  const base = near ? { x: near.position.x + 230, y: near.position.y } : { x: 0, y: 260 };
  for (let col = 0; col < 12; col++) {
    for (const dy of [0, 110, -110, 220, -220]) {
      const spot = { x: base.x + col * 230, y: base.y + dy };
      if (!taken(spot.x, spot.y)) return spot;
    }
  }
  return { x: base.x, y: base.y + nodes.length * 40 };
}

const labelOf = (n: Node) => String((n.data as { label?: string }).label ?? n.id);

interface Props {
  initialNodes: Node[];
  initialEdges?: Edge[];
  /** Fires when components or wires change and when a drag ends, not on every drag frame. */
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * Self-contained React Flow canvas for drawing a topology: component palette,
 * drag-to-wire handles, and a "Connect to…" select for keyboard and touch users.
 * Remount it (change its `key`) to reset it to the initial graph.
 */
export default function ArchitectureCanvas({ initialNodes, initialEdges = [], onChange, readOnly = false, className = "" }: Props) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counter = useRef(0);

  const commit = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
      onChange?.(nextNodes, nextEdges);
    },
    [onChange]
  );

  const removeNode = useCallback(
    (id: string) => {
      playBlipSound();
      commit(
        nodes.filter((n) => n.id !== id),
        edges.filter((e) => e.source !== id && e.target !== id)
      );
      setSelectedId((s) => (s === id ? null : s));
    },
    [commit, nodes, edges]
  );

  const removeEdge = useCallback(
    (id: string) => {
      playBlipSound();
      commit(nodes, edges.filter((e) => e.id !== id));
      setSelectedId((s) => (s === id ? null : s));
    },
    [commit, nodes, edges]
  );

  const connect = useCallback(
    (params: Connection) => {
      if (readOnly || params.source === params.target) return;
      if (edges.some((e) => e.source === params.source && e.target === params.target)) return;
      playBlipSound();
      commit(nodes, addEdge({ ...params, type: "removableEdge", animated: true }, edges));
    },
    [commit, nodes, edges, readOnly]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const safe = readOnly ? changes.filter((c) => c.type === "select" || c.type === "dimensions") : changes;
      const next = applyNodeChanges(safe, nodes);
      if (safe.some((c) => c.type === "remove")) {
        const ids = new Set(next.map((n) => n.id));
        commit(next, edges.filter((e) => ids.has(e.source) && ids.has(e.target)));
      } else if (safe.some((c) => c.type === "position" && c.dragging === false)) {
        commit(next, edges); // keep the layout when the parent persists the graph
      } else {
        setNodes(next);
      }
    },
    [commit, nodes, edges, readOnly]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const safe = readOnly ? changes.filter((c) => c.type === "select") : changes;
      const next = applyEdgeChanges(safe, edges);
      if (safe.some((c) => c.type === "remove")) commit(nodes, next);
      else setEdges(next);
    },
    [commit, nodes, edges, readOnly]
  );

  const selectedNode = nodes.find((n) => n.id === selectedId);
  const selectedEdge = selectedNode ? undefined : edges.find((e) => e.id === selectedId);

  /** Adds a component; with a node selected, it is wired straight after it. */
  const addComponent = (type: ArchitectureNodeType, name: string) => {
    playBlipSound();
    let id = "";
    do {
      counter.current += 1;
      id = `${type}-${counter.current}`;
    } while (nodes.some((n) => n.id === id));
    const sameType = nodes.filter((n) => (n.data as { type?: string }).type === type).length;
    const label = type === "server" || type === "replica" || sameType > 0 ? `${name} ${sameType + 1}` : name;
    const pos = freeSpot(nodes, selectedNode);
    const node = makeArchNode(id, type, label, pos.x, pos.y);
    const nextEdges = selectedNode
      ? addEdge({ source: selectedNode.id, target: id, sourceHandle: null, targetHandle: null, type: "removableEdge", animated: true }, edges)
      : edges;
    commit([...nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }], nextEdges);
    setSelectedId(id);
  };

  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, onRemove: readOnly ? undefined : () => removeNode(n.id) } })),
    [nodes, removeNode, readOnly]
  );
  const displayEdges = useMemo(
    () => edges.map((e) => ({ ...e, data: { ...(e.data ?? {}), onRemove: readOnly ? undefined : removeEdge } })),
    [edges, removeEdge, readOnly]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {!readOnly && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Add a component">
            {PALETTE.map(({ type, name, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => addComponent(type, name)}
                className="btn btn-secondary !py-1 !px-2.5 text-xs"
              >
                <Plus className="w-3 h-3" aria-hidden />
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500" aria-live="polite">
            {selectedNode
              ? `New components wire in after ${labelOf(selectedNode)}. Click empty canvas to add unwired.`
              : "Drag from a node's right handle to another node's left handle to wire traffic, or select a node and use Connect to…"}
          </p>
        </div>
      )}

      <div className="relative h-[440px] rounded-xl border border-[var(--line)] bg-[#080b12] overflow-hidden">
        {!readOnly && (selectedNode || selectedEdge) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pl-3 pr-1.5 py-1.5 surface !rounded-full shadow-2xl text-xs animate-fadeIn max-w-[calc(100%-1.5rem)]">
            <span className="text-slate-400 truncate">
              {selectedNode ? labelOf(selectedNode) : "Connection"}
            </span>
            {selectedNode && (
              <label className="flex items-center gap-1.5 text-slate-400">
                <span className="sr-only">Connect {labelOf(selectedNode)} to</span>
                <span aria-hidden>→</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    connect({ source: selectedNode.id, target: e.target.value, sourceHandle: null, targetHandle: null });
                  }}
                  className="bg-black/50 border border-[var(--line-strong)] rounded-full px-2 py-1 text-xs text-white max-w-[9rem]"
                >
                  <option value="">Connect to…</option>
                  {nodes
                    .filter((n) => n.id !== selectedNode.id && !edges.some((e) => e.source === selectedNode.id && e.target === n.id))
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {labelOf(n)}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => (selectedNode ? removeNode(selectedNode.id) : selectedEdge && removeEdge(selectedEdge.id))}
              className="btn btn-danger !py-1 !px-2 !rounded-full text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button type="button" onClick={() => setSelectedId(null)} className="p-1 text-slate-400 hover:text-white" aria-label="Deselect">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={connect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "removableEdge", animated: true }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onEdgeClick={(_, edge) => setSelectedId(edge.id)}
          onPaneClick={() => setSelectedId(null)}
          onSelectionChange={({ nodes: sn, edges: se }) => {
            const id = sn[0]?.id ?? se[0]?.id;
            if (id) setSelectedId(id);
          }}
          deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        >
          <Background color="#1a2234" gap={22} size={1.2} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
