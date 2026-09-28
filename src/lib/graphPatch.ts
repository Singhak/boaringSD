import type { GraphPatch, IncidentGraph } from "@/types";

/** Applies a wrong choice's patch on top of the incident's starting graph. */
export function applyGraphPatch(graph: IncidentGraph, patch: GraphPatch | undefined): IncidentGraph {
  if (!patch) return graph;
  const updates = new Map((patch.nodes ?? []).map((n) => [n.id, n]));
  const nodes = [...graph.nodes, ...(patch.addNodes ?? [])].map((n) => {
    const u = updates.get(n.id);
    return u ? { ...n, ...u } : n;
  });
  return { nodes, edges: [...graph.edges, ...(patch.addEdges ?? [])] };
}

/** Node ids a patch refers to that exist neither in the graph nor in its own addNodes. */
export function unknownPatchNodes(graph: IncidentGraph, patch: GraphPatch): string[] {
  const ids = new Set([...graph.nodes, ...(patch.addNodes ?? [])].map((n) => n.id));
  const referenced = [
    ...(patch.nodes ?? []).map((n) => n.id),
    ...(patch.addEdges ?? []).flatMap((e) => [e.from, e.to]),
  ];
  return [...new Set(referenced.filter((id) => !ids.has(id)))];
}

/** True if the graph after a wrong deploy visibly differs from the starting graph. */
export function graphChanged(before: IncidentGraph, after: IncidentGraph): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}
