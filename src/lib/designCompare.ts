import type { ArchitectureNodeType } from "@/types";

/** Where a component sits in a request's path; used to group the comparison. */
export type DesignTier = "edge" | "compute" | "data" | "async";

export const TIER_OF: Record<ArchitectureNodeType, DesignTier> = {
  client: "edge",
  cdn: "edge",
  load_balancer: "edge",
  auth_gateway: "edge",
  server: "compute",
  id_service: "compute",
  stream_processor: "compute",
  cache: "data",
  database: "data",
  replica: "data",
  connection_pooler: "data",
  search_index: "data",
  consensus_cluster: "data",
  shard_router: "data",
  queue: "async",
  observability: "async",
};

export interface DesignDiff {
  matched: ArchitectureNodeType[];
  missing: ArchitectureNodeType[];
  extra: ArchitectureNodeType[];
  /** 0–100: overlap of distinct component types (Jaccard). */
  overlap: number;
}

/**
 * Compares the kinds of components in two designs. Counts are ignored (3 servers vs 5 is a
 * sizing question, not a design one) and so are clients, which every design has.
 */
export function compareDesigns(yours: readonly ArchitectureNodeType[], reference: readonly ArchitectureNodeType[]): DesignDiff {
  const a = new Set(yours.filter((t) => t !== "client"));
  const b = new Set(reference.filter((t) => t !== "client"));
  const order = (types: ArchitectureNodeType[]) =>
    types.sort((x, y) => Object.keys(TIER_OF).indexOf(x) - Object.keys(TIER_OF).indexOf(y));
  const matched = order([...a].filter((t) => b.has(t)));
  const missing = order([...b].filter((t) => !a.has(t)));
  const extra = order([...a].filter((t) => !b.has(t)));
  const union = new Set([...a, ...b]).size;
  return { matched, missing, extra, overlap: union === 0 ? 100 : Math.round((matched.length / union) * 100) };
}

/** Of several valid reference designs, the one closest to the learner's (ties keep the first). */
export function closestReference<T extends { components: readonly ArchitectureNodeType[] }>(
  yours: readonly ArchitectureNodeType[],
  references: readonly T[]
): T | undefined {
  let best: T | undefined;
  let bestOverlap = -1;
  for (const ref of references) {
    const { overlap } = compareDesigns(yours, ref.components);
    if (overlap > bestOverlap) {
      best = ref;
      bestOverlap = overlap;
    }
  }
  return best;
}
