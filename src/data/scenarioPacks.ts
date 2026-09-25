import horizontalScalingPack from "@/data/scenarioPacks/horizontal-scaling.json";
import loadBalancingPack from "@/data/scenarioPacks/load-balancing.json";
import readReplicasPack from "@/data/scenarioPacks/read-replicas.json";
import cachingPack from "@/data/scenarioPacks/caching.json";
import cdnEdgePack from "@/data/scenarioPacks/cdn-edge.json";
import asyncQueuesPack from "@/data/scenarioPacks/async-queues.json";
import shardingPack from "@/data/scenarioPacks/sharding.json";
import consistencyPack from "@/data/scenarioPacks/consistency.json";

export interface ScenarioVariant {
  id: string;
  title: string;
  context: string;
  constraint: string;
  question: string;
  expectedPattern: string;
  wrongChoices: string[];
}

export interface ScenarioPack {
  patternId: string;
  patternName: string;
  variants: ScenarioVariant[];
}

const SCENARIO_PACKS: Record<string, ScenarioPack> = {
  "horizontal-scaling": horizontalScalingPack as ScenarioPack,
  "load-balancing": loadBalancingPack as ScenarioPack,
  "read-replicas": readReplicasPack as ScenarioPack,
  caching: cachingPack as ScenarioPack,
  "cdn-edge": cdnEdgePack as ScenarioPack,
  "async-queues": asyncQueuesPack as ScenarioPack,
  sharding: shardingPack as ScenarioPack,
  consistency: consistencyPack as ScenarioPack,
};

export function getScenarioPackByPatternId(patternId: string): ScenarioPack | undefined {
  return SCENARIO_PACKS[patternId];
}

export function getScenarioVariantForPattern(patternId: string, rotationIndex: number): ScenarioVariant {
  const pack = getScenarioPackByPatternId(patternId);

  if (!pack || pack.variants.length === 0) {
    throw new Error(`No scenario pack found for pattern: ${patternId}`);
  }

  const safeIndex = Math.abs(rotationIndex) % pack.variants.length;
  return pack.variants[safeIndex];
}

export function getPatternReplayVariant(patternId: string, runsStarted: number): ScenarioVariant {
  return getScenarioVariantForPattern(patternId, runsStarted);
}

export function getAllScenarioPacks(): ScenarioPack[] {
  return Object.values(SCENARIO_PACKS);
}
