/** Minimal node/edge shapes shared by the builder scorer and topology validator. */
export interface BuilderNodeLike {
  id?: string;
  data?: {
    type?: string;
    label?: string;
    cpu?: number;
    status?: string;
    down?: boolean;
  };
}

export interface BuilderEdgeLike {
  source: string;
  target: string;
}

export interface Adjacency {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

export function nodeId(node: BuilderNodeLike, index: number): string {
  return node.id ?? `node-${index}`;
}

/** Directed adjacency lists. Edges touching unknown node ids are ignored. */
export function buildAdjacency(nodes: BuilderNodeLike[], edges: BuilderEdgeLike[]): Adjacency {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  nodes.forEach((n, idx) => {
    const id = nodeId(n, idx);
    outgoing.set(id, []);
    incoming.set(id, []);
  });

  edges.forEach((e) => {
    if (outgoing.has(e.source) && incoming.has(e.target)) {
      outgoing.get(e.source)!.push(e.target);
      incoming.get(e.target)!.push(e.source);
    }
  });

  return { outgoing, incoming };
}

/** BFS over outgoing edges; the start ids are included in the result. */
export function reachableFrom(startIds: string[], outgoing: Map<string, string[]>): Set<string> {
  const reachable = new Set<string>(startIds);
  const queue = [...startIds];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const nxt of outgoing.get(curr) ?? []) {
      if (!reachable.has(nxt)) {
        reachable.add(nxt);
        queue.push(nxt);
      }
    }
  }

  return reachable;
}
