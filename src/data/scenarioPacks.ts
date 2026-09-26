import horizontalScalingPack from "@/data/scenarioPacks/horizontal-scaling.json";
import loadBalancingPack from "@/data/scenarioPacks/load-balancing.json";
import readReplicasPack from "@/data/scenarioPacks/read-replicas.json";
import cachingPack from "@/data/scenarioPacks/caching.json";
import cdnEdgePack from "@/data/scenarioPacks/cdn-edge.json";
import asyncQueuesPack from "@/data/scenarioPacks/async-queues.json";
import shardingPack from "@/data/scenarioPacks/sharding.json";
import consistencyPack from "@/data/scenarioPacks/consistency.json";
import rateLimitingPack from "@/data/scenarioPacks/rate-limiting.json";
import circuitBreakerPack from "@/data/scenarioPacks/circuit-breaker.json";
import connectionPoolingPack from "@/data/scenarioPacks/connection-pooling.json";
import backpressurePack from "@/data/scenarioPacks/backpressure.json";
import idempotencyPack from "@/data/scenarioPacks/idempotency.json";
import multiRegionPack from "@/data/scenarioPacks/multi-region.json";
import healthChecksPack from "@/data/scenarioPacks/health-checks.json";
import indexData from "@/data/scenarioPacks/index.json";
import type { IncidentGraph, IncidentNode, IncidentPackV2, IncidentV2 } from "@/types";
import type { Health, Tier } from "@/components/run/RunVisuals";
import { getPlayableIncidents } from "@/data/incidentQuality";

// Backward compatibility interfaces
export interface ScenarioVariant {
  id: string;
  title: string;
  context: string;
  constraint: string;
  question: string;
  expectedPattern: string;
  wrongChoices: string[];
  /** The incident's own choices, with the pack's result text as the explanation. */
  choices: ScenarioVariantChoice[];
}

export interface ScenarioVariantChoice {
  id: string;
  label: string;
  correct: boolean;
  explanation: string;
}

function toVariant(inc: IncidentV2, patternName: string): ScenarioVariant {
  const choices = inc.choices || [];
  return {
    id: inc.id,
    title: inc.title,
    context: inc.brief,
    constraint: inc.constraint,
    question: inc.question,
    expectedPattern: patternName,
    wrongChoices: choices.filter((c) => !c.correct).map((c) => c.label),
    choices: choices.map((c) => ({
      id: c.id,
      label: c.label,
      correct: c.correct,
      explanation: [c.resultTitle, c.resultBody].filter(Boolean).join(": "),
    })),
  };
}

export interface ScenarioPack {
  patternId: string;
  patternName: string;
  variants: ScenarioVariant[];
}

const RAW_PACKS = [
  horizontalScalingPack,
  loadBalancingPack,
  readReplicasPack,
  cachingPack,
  cdnEdgePack,
  asyncQueuesPack,
  shardingPack,
  consistencyPack,
  rateLimitingPack,
  circuitBreakerPack,
  connectionPoolingPack,
  backpressurePack,
  idempotencyPack,
  multiRegionPack,
  healthChecksPack,
] as unknown as IncidentPackV2[];

export type ScenarioPackV2 = IncidentPackV2 & {
  variants: ScenarioVariant[];
};

const PACKS_BY_PATTERN: Record<string, ScenarioPackV2> = {};

for (const raw of RAW_PACKS) {
  const pack = {
    ...raw,
    /** Replay variants: only incidents that pass the content-quality gate. */
    get variants(): ScenarioVariant[] {
      return getPlayableIncidents(raw).map((inc) => toVariant(inc, raw.patternName));
    },
  };
  PACKS_BY_PATTERN[raw.patternId] = pack as ScenarioPackV2;
}

const PACKS_BY_LEVEL: Record<number, ScenarioPackV2> = Object.values(PACKS_BY_PATTERN).reduce(
  (acc, pack) => {
    acc[pack.level] = pack;
    return acc;
  },
  {} as Record<number, ScenarioPackV2>
);


export function getAllScenarioPacks(): IncidentPackV2[] {
  return Object.values(PACKS_BY_PATTERN);
}

export function getScenarioPackByPatternId(patternId: string): IncidentPackV2 | undefined {
  return PACKS_BY_PATTERN[patternId];
}

export function getScenarioPackByLevel(level: number): IncidentPackV2 | undefined {
  return PACKS_BY_LEVEL[level];
}

export function getCanonicalIncident(levelOrPatternId: number | string): IncidentV2 | undefined {
  const pack =
    typeof levelOrPatternId === "number"
      ? getScenarioPackByLevel(levelOrPatternId)
      : getScenarioPackByPatternId(levelOrPatternId);

  if (!pack) return undefined;
  return pack.incidents.find((i) => i.canonical || i.id === pack.canonicalId) || pack.incidents[0];
}

/**
 * Incident for the Nth War Room run of a level: the canonical incident first,
 * then a rotation through the other playable, non-cascade incidents. Cascades
 * are reached from a parent incident's choice, so they are not started directly.
 */
export function getWarRoomIncident(patternId: string, runIndex: number): IncidentV2 | undefined {
  const pack = getScenarioPackByPatternId(patternId);
  if (!pack) return undefined;
  const canonical = getCanonicalIncident(patternId);
  const rotation = [
    ...(canonical ? [canonical] : []),
    ...getPlayableIncidents(pack).filter((inc) => !inc.isCascade && inc.id !== canonical?.id),
  ];
  if (rotation.length === 0) return undefined;
  return rotation[Math.abs(runIndex) % rotation.length];
}

export function getIncidentById(incidentId: string): IncidentV2 | undefined {
  for (const pack of Object.values(PACKS_BY_PATTERN)) {
    const found = pack.incidents.find((i) => i.id === incidentId);
    if (found) return found;
  }
  return undefined;
}

export function getCanonicalCampaign() {
  return indexData.canonicalCampaign;
}

/**
 * Converts any IncidentGraph (nodes + edges) into horizontal Tier columns
 * for live visual rendering in RunVisuals / Topology.
 */
export function graphToTiers(graph: IncidentGraph): Tier[] {
  if (!graph || !graph.nodes || graph.nodes.length === 0) return [];

  const LAYER_ORDER: Record<string, number> = {
    users: 0,
    cdn: 1,
    lb: 2,
    server: 3,
    cache: 4,
    queue: 4,
    worker: 4,
    gpu: 4,
    db: 5,
    replica: 5,
  };

  const layers: Map<number, IncidentNode[]> = new Map();
  for (const node of graph.nodes) {
    const layer = LAYER_ORDER[node.kind] ?? 3;
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(node);
  }

  const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);

  return sortedLayerKeys.map((key) => {
    const nodes = layers.get(key)!;
    return nodes.map((node) => {
      let health: Health = "ok";
      if (node.tone === "bad") health = "hot";
      else if (node.tone === "warn") health = "warn";
      else if (node.tone === "good") health = "new";
      else if (node.tone === "neutral") health = "ok";

      let note = node.sub;
      if (!note && node.cpu !== undefined) {
        note = `${node.cpu}% CPU`;
      }

      return {
        label: node.label,
        health,
        note,
      };
    });
  });
}

// ---------------------------------------------------------------------------
// Backward Compatibility for legacy callers / tests
// ---------------------------------------------------------------------------

export function getScenarioVariantForPattern(patternId: string, rotationIndex: number): ScenarioVariant {
  const pack = getScenarioPackByPatternId(patternId);
  if (!pack || pack.incidents.length === 0) {
    throw new Error(`No scenario pack found for pattern: ${patternId}`);
  }

  const playable = getPlayableIncidents(pack);
  const safeIndex = Math.abs(rotationIndex) % playable.length;
  return toVariant(playable[safeIndex], pack.patternName);
}

export function getPatternReplayVariant(patternId: string, runsStarted: number): ScenarioVariant {
  return getScenarioVariantForPattern(patternId, runsStarted);
}
