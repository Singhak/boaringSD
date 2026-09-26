"use client";

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Flame,
  Globe,
  HardDrive,
  HelpCircle,
  Layers,
  ListFilter,
  Play,
  Plus,
  RotateCcw,
  Server,
  Swords,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import FeatureGate from "@/components/FeatureGate";
import { ArchNode } from "@/components/builder/CustomNodes";
import { RemovableEdge } from "@/components/builder/RemovableEdge";
import QuestionCard from "@/components/run/QuestionCard";
import PostMortemCard from "@/components/run/PostMortemCard";
import { playBlipSound, playErrorSound, playSuccessSound } from "@/lib/sound";
import {
  ScenarioEvaluation,
  applySimulation,
  designMonthlyCost,
  evaluateArchitectureScore,
  evaluateScenario,
  sandboxWorkload,
  scenarioBudget,
  simulateTopology,
} from "@/lib/builderScore";
import { getAllBuilderScenarios, getBuilderScenarioById } from "@/data/builderScenarios";
import { getAllPatterns, getPatternById } from "@/data/patterns";
import {
  SavedDesign,
  getScenarioDesigns,
  readScenarioRotationState,
  saveScenarioDesign,
  saveScenarioRotationState,
  submitBuilderResult,
} from "@/lib/storage";
import { ProgressionOutcome, getEvidence, isPatternCleared } from "@/lib/progression";
import { useUserStats } from "@/lib/useUserStats";
import type { ArchitectureNodeType, BuilderScenario, CustomNodeData, UserStats } from "@/types";

const nodeTypes = { customNode: ArchNode };
const edgeTypes = { removableEdge: RemovableEdge };

const PALETTE: { type: ArchitectureNodeType; label: string; name: string; icon: React.ElementType; tone: string }[] = [
  { type: "client", label: "Users", name: "Users", icon: Users, tone: "cyan" },
  { type: "load_balancer", label: "Load Balancer", name: "Load Balancer", icon: Layers, tone: "emerald" },
  { type: "server", label: "Web/API Server", name: "API Server", icon: Server, tone: "blue" },
  { type: "cache", label: "In-Memory Cache", name: "Redis Cache", icon: Zap, tone: "amber" },
  { type: "database", label: "SQL Database", name: "Postgres Primary", icon: Database, tone: "purple" },
  { type: "replica", label: "Read Replica", name: "Read Replica", icon: HardDrive, tone: "teal" },
  { type: "cdn", label: "Edge CDN", name: "Edge CDN", icon: Globe, tone: "sky" },
  { type: "queue", label: "Message Queue", name: "Message Queue", icon: ListFilter, tone: "indigo" },
];

const TONES: Record<string, string> = {
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  blue: "text-sky-300",
  amber: "text-amber-300",
  purple: "text-violet-300",
  teal: "text-teal-300",
  sky: "text-sky-300",
  indigo: "text-indigo-300",
};

const SANDBOX_START: SavedDesign = {
  nodes: [
    { id: "clients-1", label: "10,000 Users", type: "client", x: 50, y: 150 },
    { id: "lb-1", label: "Nginx LB", type: "load_balancer", x: 260, y: 150 },
    { id: "server-1", label: "API Server 1", type: "server", x: 480, y: 80 },
    { id: "server-2", label: "API Server 2", type: "server", x: 480, y: 220 },
    { id: "cache-1", label: "Redis Cluster", type: "cache", x: 700, y: 80 },
    { id: "db-1", label: "Postgres Master", type: "database", x: 700, y: 220 },
  ],
  edges: [
    { source: "clients-1", target: "lb-1" },
    { source: "lb-1", target: "server-1" },
    { source: "lb-1", target: "server-2" },
    { source: "server-1", target: "cache-1" },
    { source: "server-2", target: "cache-1" },
    { source: "server-1", target: "db-1" },
    { source: "server-2", target: "db-1" },
  ],
};

function scenarioStart(scenario: BuilderScenario): SavedDesign {
  return {
    nodes: scenario.startingNodes.map((n) => ({ ...n })),
    edges: scenario.startingEdges.map((e) => ({ ...e })),
  };
}

/** First grid slot inside (then just below) the current layout that doesn't overlap a node. */
function findFreeSpot(nodes: Node[]): { x: number; y: number } {
  const W = 190;
  const H = 95;
  if (nodes.length === 0) return { x: 0, y: 0 };
  const taken = (x: number, y: number) =>
    nodes.some((n) => Math.abs(n.position.x - x) < W && Math.abs(n.position.y - y) < H);
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let y = minY; y <= maxY + 2 * H; y += 55) {
    for (let x = minX; x <= Math.max(maxX, minX + 3 * W); x += 110) {
      if (!taken(x, y)) return { x, y };
    }
  }
  return { x: minX, y: maxY + H + 20 };
}

function designToNodes(design: SavedDesign): Node[] {
  return design.nodes.map((n) => ({
    id: n.id,
    type: "customNode",
    position: { x: n.x, y: n.y },
    data: { label: n.label, type: n.type, status: "idle" },
  }));
}

function designToEdges(design: SavedDesign): Edge[] {
  return design.edges.map((e) => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: "removableEdge",
    animated: true,
  }));
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function BuilderPageContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = use(searchParams);
  const allBosses = getAllBuilderScenarios();
  const scenarioId = typeof sp.scenario === "string" ? sp.scenario : undefined;
  const savedBossId = readScenarioRotationState()["builder:boss"] !== undefined ? allBosses[readScenarioRotationState()["builder:boss"] % allBosses.length]?.id : undefined;
  const resolvedScenarioId = scenarioId ?? savedBossId;
  const scenario = resolvedScenarioId ? getBuilderScenarioById(resolvedScenarioId) : undefined;
  const stats = useUserStats();

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
        {scenarioId && !scenario && (
          <p role="status" className="text-[13px] text-amber-200 px-4 py-2.5 rounded-xl bg-amber-300/[0.06] border border-amber-300/25">
            That scenario does not exist. You are in the free sandbox.
          </p>
        )}
        {scenario ? (
          stats === null ? (
            <p role="status" className="text-sm text-slate-400 py-16 text-center">
              Loading your saved design…
            </p>
          ) : !isScenarioUnlocked(scenario, stats) ? (
            <LockedBoss scenario={scenario} />
          ) : (
            <Workspace key={scenario.id} scenario={scenario} stats={stats} />
          )
        ) : (
          <Workspace key="sandbox" stats={stats} />
        )}
      </main>
    </div>
  );
}

function isScenarioUnlocked(scenario: BuilderScenario, stats: UserStats): boolean {
  const pattern = getPatternById(scenario.patternId);
  return pattern ? isPatternCleared(stats, pattern) : true;
}

function LockedBoss({ scenario }: { scenario: BuilderScenario }) {
  const pattern = getPatternById(scenario.patternId);
  return (
    <section className="surface p-10 text-center space-y-4 max-w-xl mx-auto">
      <span className="w-11 h-11 rounded-xl surface-2 grid place-items-center mx-auto"><Swords className="w-5 h-5 text-slate-400" /></span>
      <h1 className="text-2xl display">{scenario.title} is locked</h1>
      <p className="text-sm text-slate-400 max-w-lg mx-auto">
        This boss tests {pattern?.title ?? "a pattern"} under pressure. Clear the Level {pattern?.levelNumber} run first, then come
        back to build it yourself.
      </p>
      {pattern && (
        <Link
          href={`/campaign/${pattern.chapterId}`}
          className="btn btn-primary"
        >
          Go to Level {pattern.levelNumber} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
      <p>
        <Link href="/builder" className="btn btn-ghost text-xs">
          Open the free sandbox instead
        </Link>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

interface InitialDesign {
  design: SavedDesign;
  source: "draft" | "inherited" | "default";
}

function loadInitialDesign(scenario: BuilderScenario): InitialDesign {
  const own = getScenarioDesigns(scenario.id);
  if (own.draft) return { design: own.draft, source: "draft" };
  if (scenario.inheritsFrom) {
    const prev = getScenarioDesigns(scenario.inheritsFrom).passed;
    if (prev) return { design: prev, source: "inherited" };
  }
  return { design: scenarioStart(scenario), source: "default" };
}

function Workspace({ scenario, stats }: { scenario?: BuilderScenario; stats: UserStats | null }) {
  const router = useRouter();
  const isBoss = scenario !== undefined;
  const pattern = scenario ? getPatternById(scenario.patternId) : undefined;
  const [initial] = useState<InitialDesign>(() =>
    scenario ? loadInitialDesign(scenario) : { design: SANDBOX_START, source: "default" }
  );

  const [selected, setSelected] = useState<{ type: "node" | "edge"; id: string; label?: string } | null>(null);
  const [trafficRps, setTrafficRps] = useState<number>(scenario?.trafficRps ?? 10000);
  const [chaosSurge, setChaosSurge] = useState(false);
  const prevOverloadedRef = useRef(false);
  const [designVersion, setDesignVersion] = useState(0); // topology changes (invalidate a stress test)
  const [layoutVersion, setLayoutVersion] = useState(0); // node moves (only saved to the draft)
  const [tested, setTested] = useState<{ version: number; evaluation: ScenarioEvaluation } | null>(null);
  const [stressing, setStressing] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [explainPassed, setExplainPassed] = useState(false);
  const [outcome, setOutcome] = useState<ProgressionOutcome | null>(null);
  const counter = useRef(0);

  // The starting design is shown with its real load so the failure is visible before any change.
  const [baseline] = useState<ScenarioEvaluation | null>(() =>
    scenario ? evaluateScenario(designToNodes(initial.design), initial.design.edges, scenario) : null
  );

  const [nodes, setNodes] = useState<Node[]>(() => {
    const start = designToNodes(initial.design);
    if (baseline) return applySimulation(start, baseline.simulation);
    return applySimulation(start, simulateTopology(start, sandboxWorkload(10000), initial.design.edges));
  });
  const [edges, setEdges] = useState<Edge[]>(() => designToEdges(initial.design));
  // Latest wiring for the sandbox simulation, which runs from a state updater.
  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const removeNode = useCallback((nodeId: string) => {
    playBlipSound();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelected((prev) => (prev?.id === nodeId ? null : prev));
    setDesignVersion((v) => v + 1);
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    playBlipSound();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelected((prev) => (prev?.id === edgeId ? null : prev));
    setDesignVersion((v) => v + 1);
  }, []);

  // Remove handlers are attached at render time instead of being stored in state.
  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, onRemove: outcome ? undefined : () => removeNode(n.id) } })),
    [nodes, removeNode, outcome]
  );

  const displayEdges = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n.data as unknown as CustomNodeData | undefined]));
    return edges.map((e) => {
      const targetData = nodeMap.get(e.target);
      const isTargetOverloaded = targetData?.status === "overloaded";
      const isTargetWarning = targetData?.status === "warning";
      return {
        ...e,
        style: isTargetOverloaded
          ? { stroke: "#f43f5e", strokeWidth: 2.5 }
          : isTargetWarning
          ? { stroke: "#fbbf24", strokeWidth: 2 }
          : undefined,
        animated: true,
        data: {
          ...e.data,
          onRemove: outcome ? undefined : () => removeEdge(e.id),
        },
      };
    });
  }, [nodes, edges, removeEdge, outcome]);

  const currentDesign = useCallback(
    (): SavedDesign => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        label: String((n.data as { label?: string }).label ?? n.id),
        type: String((n.data as { type?: string }).type ?? "server"),
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    }),
    [nodes, edges]
  );

  // Resume anywhere: keep a draft of the boss design (not after it has been passed).
  useEffect(() => {
    if (!scenario || outcome || designVersion + layoutVersion === 0) return;
    const t = setTimeout(() => saveScenarioDesign(scenario.id, "draft", currentDesign()), 400);
    return () => clearTimeout(t);
  }, [scenario, outcome, designVersion, layoutVersion, currentDesign]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    if (changes.some((c) => c.type === "remove")) setDesignVersion((v) => v + 1);
    if (changes.some((c) => c.type === "position" && c.dragging === false)) setLayoutVersion((v) => v + 1);
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    if (changes.some((c) => c.type === "remove")) setDesignVersion((v) => v + 1);
  }, []);

  const onConnect: OnConnect = useCallback((params) => {
    playBlipSound();
    setEdges((eds) => addEdge({ ...params, type: "removableEdge", animated: true }, eds));
    setDesignVersion((v) => v + 1);
  }, []);

  const addComponent = (type: ArchitectureNodeType, name: string) => {
    playBlipSound();
    counter.current += 1;
    const sameType = nodes.filter((n) => (n.data as { type?: string }).type === type).length;
    let newId = `${type}-new-${counter.current}`;
    while (nodes.some((n) => n.id === newId)) {
      counter.current += 1;
      newId = `${type}-new-${counter.current}`;
    }
    const label = type === "server" || type === "replica" ? `${name} ${sameType + 1}` : name;
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        type: "customNode",
        position: findFreeSpot(nds),
        data: { label, type, status: "idle" },
      },
    ]);
    setDesignVersion((v) => v + 1);
  };

  // ---------------- Sandbox evaluation ----------------

  const runSandbox = useCallback((rps: number) => {
    setNodes((prev) => {
      const sim = simulateTopology(prev, sandboxWorkload(rps), edgesRef.current);
      const nextNodes = applySimulation(prev, sim);
      const isOverloaded = nextNodes.some((n) => (n.data as unknown as CustomNodeData)?.status === "overloaded");
      if (isOverloaded && !prevOverloadedRef.current) {
        playErrorSound();
        prevOverloadedRef.current = true;
      } else if (!isOverloaded && prevOverloadedRef.current) {
        playSuccessSound();
        prevOverloadedRef.current = false;
      }
      return nextNodes;
    });
  }, []);

  // Automatically recalculate simulation in sandbox whenever topology changes
  useEffect(() => {
    if (scenario) return;
    runSandbox(trafficRps);
  }, [designVersion, scenario, trafficRps, runSandbox]);

  const triggerChaosSpike = useCallback(() => {
    setChaosSurge(true);
    playErrorSound();
    setTrafficRps(120000);
    runSandbox(120000);
    const timer = setTimeout(() => {
      setChaosSurge(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [runSandbox]);

  const sandboxScore = useMemo(
    () => evaluateArchitectureScore(nodes, trafficRps, {}, edges),
    [nodes, trafficRps, edges]
  );
  // Cloud credits: live monthly cost of the design against the boss budget.
  const monthlyCost = designMonthlyCost(nodes);
  const budget = scenario ? scenarioBudget(scenario) : null;

  // ---------------- Boss evaluation ----------------

  const freshTest = tested && tested.version === designVersion ? tested.evaluation : null;

  const stressTest = () => {
    if (!scenario || stressing) return;
    setStressing(true);
    setEdges((eds) => eds.map((e) => ({ ...e, style: { stroke: "#f43f5e" } })));
    playErrorSound();
    const version = designVersion;
    setTimeout(() => {
      const evaluation = evaluateScenario(nodes, edges, scenario);
      setNodes((prev) => applySimulation(prev, evaluation.simulation));
      setEdges((eds) => eds.map((e) => ({ ...e, style: undefined })));
      setTested({ version, evaluation });
      setStressing(false);
      if (evaluation.canPass) {
        playSuccessSound();
      } else {
        playErrorSound();
        // Failures are practice evidence; they never award XP.
        submitBuilderResult(scenario, pattern?.rewards.builderXp ?? 0, false, evaluation.failureReasons);
      }
    }, 1200);
  };

  const submitDesign = () => {
    if (!scenario || !freshTest?.canPass || !explainPassed) return;
    const out = submitBuilderResult(scenario, pattern?.rewards.builderXp ?? 0, true, []);
    saveScenarioDesign(scenario.id, "passed", currentDesign());
    saveScenarioDesign(scenario.id, "draft", undefined);
    setOutcome(out);
    playSuccessSound();
  };

  const resetDesign = () => {
    const design = scenario ? scenarioStart(scenario) : SANDBOX_START;
    const start = designToNodes(design);
    setNodes(
      scenario
        ? applySimulation(start, evaluateScenario(start, design.edges, scenario).simulation)
        : applySimulation(start, simulateTopology(start, sandboxWorkload(10000), design.edges))
    );
    setEdges(designToEdges(design));
    setSelected(null);
    setTested(null);
    setOutcome(null);
    setExplainPassed(false);
    if (!scenario) setTrafficRps(10000);
    setDesignVersion((v) => v + 1);
    if (scenario) saveScenarioDesign(scenario.id, "draft", undefined);
  };

  // ---------------- Render ----------------

  const failing = freshTest?.checks.filter((c) => c.status === "fail") ?? [];
  const steps = [
    { label: "Inspect", done: designVersion > 0 || tested !== null },
    { label: "Build", done: designVersion > 0 },
    { label: "Stress test", done: freshTest !== null },
    { label: "Explain", done: explainPassed },
    { label: "Submit", done: outcome !== null },
  ];
  const activeStep = steps.findIndex((s) => !s.done);
  const alreadyPassed = scenario && stats ? getEvidence(stats, scenario.patternId).scenariosPassed.includes(scenario.id) : false;

  const overloadedNodes = useMemo(
    () => nodes.filter((n) => (n.data as unknown as CustomNodeData)?.status === "overloaded" && !(n.data as unknown as CustomNodeData)?.down),
    [nodes]
  );
  const warningNodes = useMemo(
    () => nodes.filter((n) => (n.data as unknown as CustomNodeData)?.status === "warning" && !(n.data as unknown as CustomNodeData)?.down),
    [nodes]
  );

  return (
    <>
      {scenario && pattern ? (
        <ScenarioBrief
          scenario={scenario}
          levelNumber={pattern.levelNumber}
          source={initial.source}
          alreadyPassed={alreadyPassed}
          onNextScenario={() => {
            const all = getAllBuilderScenarios();
            const index = all.findIndex((s) => s.id === scenario.id);
            const nextIndex = (index + 1 + all.length) % all.length;
            const next = all[nextIndex];
            saveScenarioRotationState("builder:boss", nextIndex);
            router.push(`/builder?scenario=${next.id}`);
          }}
        />
      ) : (
        <SandboxHeader
          trafficRps={trafficRps}
          onTraffic={(rps) => {
            setTrafficRps(rps);
            runSandbox(rps);
          }}
          onSimulate={() => {
            playBlipSound();
            runSandbox(trafficRps);
          }}
          onChaos={triggerChaosSpike}
          chaosActive={chaosSurge}
          onReset={resetDesign}
          onClear={() => {
            setNodes([]);
            setEdges([]);
            setSelected(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column: task rail, evidence, CTA, palette (comes first on mobile) */}
        <div className="lg:col-span-4 space-y-4">
          {isBoss && scenario && (
            <section className="surface p-5 space-y-5" aria-label="Boss tasks">
              <ol className="grid grid-cols-5 gap-1.5">
                {steps.map((s, i) => (
                  <li
                    key={s.label}
                    aria-current={i === activeStep ? "step" : undefined}
                    className="space-y-1.5 min-w-0"
                  >
                    <span
                      aria-hidden
                      className={`block h-1 rounded-full ${
                        s.done ? "bg-emerald-400/70" : i === activeStep ? "bg-[var(--accent)]" : "bg-white/[0.07]"
                      }`}
                    />
                    <span
                      className={`block text-[11px] font-medium truncate ${
                        s.done ? "text-emerald-300/80" : i === activeStep ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </li>
                ))}
              </ol>

              {outcome ? (
                <BossResult scenario={scenario} outcome={outcome} baseline={baseline} evaluation={freshTest} onReset={resetDesign} />
              ) : (
                <>
                  <EvidencePanel baseline={baseline} evaluation={freshTest} stale={tested !== null && !freshTest} />

                  {failing.length > 0 && (
                    <div className="space-y-2">
                      {hintsShown > 0 &&
                        scenario.hints.slice(0, hintsShown).map((h, i) => (
                          <p key={i} className="text-[13px] text-slate-300 pl-3 border-l-2 border-amber-300/40 animate-fadeIn">
                            <span className="text-slate-500">Hint {i + 1}. </span>
                            {h}
                          </p>
                        ))}
                      {hintsShown < scenario.hints.length && (
                        <button
                          type="button"
                          onClick={() => setHintsShown((n) => n + 1)}
                          className="btn btn-ghost !px-0 text-xs"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {hintsShown === 0 ? "Stuck? Get a hint" : "Another hint"}
                        </button>
                      )}
                    </div>
                  )}

                  {freshTest?.canPass && (
                    <div className="pt-5 border-t border-[var(--line)]">
                      <QuestionCard
                        eyebrow="Explain your design"
                        question={scenario.explain}
                        submitLabel="Submit explanation"
                        onAnswer={(opt) => opt.isCorrect && setExplainPassed(true)}
                      />
                    </div>
                  )}

                  {budget !== null && <CloudCredits cost={monthlyCost} budget={budget} />}

                  {/* One primary action */}
                  {!freshTest || !freshTest.canPass ? (
                    <button
                      type="button"
                      onClick={stressTest}
                      disabled={stressing || (freshTest !== null && !freshTest.canPass)}
                      className={`btn btn-lg w-full ${freshTest && !freshTest.canPass ? "btn-secondary" : "btn-danger"} ${
                        stressing ? "animate-pulse-glow" : ""
                      }`}
                    >
                      <Flame className="w-4 h-4" />
                      {stressing
                        ? `Flooding with ${scenario.trafficRps.toLocaleString()} req/s…`
                        : freshTest
                        ? "Change the design, then stress test again"
                        : "Stress test architecture"}
                    </button>
                  ) : explainPassed ? (
                    <button
                      type="button"
                      onClick={submitDesign}
                      className="btn btn-primary btn-lg w-full"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Submit design
                    </button>
                  ) : null}
                  <p role="status" aria-live="polite" className="sr-only">
                    {stressing ? "Stress test running" : freshTest ? (freshTest.canPass ? "Stress test passed" : `Stress test failed: ${failing.map((f) => f.message).join(" ")}`) : ""}
                  </p>
                </>
              )}
            </section>
          )}

          {!isBoss && <SandboxScore score={sandboxScore} />}

          <section className="surface p-5 space-y-3" aria-label="Component palette">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Components
              </h2>
              <button type="button" onClick={resetDesign} className="btn btn-ghost !py-1 text-[11px]">
                <RotateCcw className="w-3 h-3" /> {isBoss ? "Reset to start" : "Reset template"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PALETTE.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => addComponent(p.type, p.name)}
                    disabled={outcome !== null}
                    className="choice !p-2.5 !items-center !justify-start !text-xs disabled:opacity-40"
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${TONES[p.tone]}`} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Drag from a node&apos;s right handle to another node&apos;s left handle to connect them. Components only count when connected.
            </p>
          </section>

          {!isBoss && <ScenarioLibrary stats={stats} />}
        </div>

        {/* Canvas */}
        <div className={`lg:col-span-8 h-[440px] sm:h-[600px] surface overflow-hidden relative !bg-[#080b12] transition-all duration-300 ${
          chaosSurge ? "ring-2 ring-rose-500/80 shadow-[0_0_40px_rgba(244,63,94,0.35)]" : ""
        }`}>
          {chaosSurge && (
            <div className="absolute inset-x-0 top-0 z-30 py-2 px-4 bg-rose-600/95 text-white text-center text-xs font-mono font-bold tracking-wider uppercase animate-pulse shadow-lg flex items-center justify-center gap-2 backdrop-blur-md">
              <Flame className="w-4 h-4 text-amber-300 animate-flame" />
              CHAOS SURGE INJECTED: 120,000 req/s FLASH SALE FLOODING THE CLUSTER!
              <Flame className="w-4 h-4 text-amber-300 animate-flame" />
            </div>
          )}

          {!selected && !chaosSurge && overloadedNodes.length > 0 && (
            <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-3 z-10 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#140a12]/95 border border-rose-500/70 shadow-[0_0_24px_rgba(244,63,94,0.45)] backdrop-blur-md animate-fadeIn text-xs max-w-md">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 grid place-items-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-rose-400 animate-flame" />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-rose-200 font-mono text-[11px] leading-tight">
                  P0 CRITICAL OUTAGE ({overloadedNodes.length} NODE{overloadedNodes.length > 1 ? "S" : ""} SATURATED)
                </div>
                <div className="text-[11px] text-rose-300/90 leading-tight mt-0.5 truncate">
                  {overloadedNodes.map((n) => (n.data as unknown as CustomNodeData)?.label).join(", ")} queue full · 504 Timeouts!
                </div>
              </div>
            </div>
          )}

          {!selected && !chaosSurge && overloadedNodes.length === 0 && warningNodes.length === 0 && !isBoss && trafficRps >= 15000 && (
            <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-3 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 backdrop-blur-md text-[11px] text-emerald-300 animate-fadeIn pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-white font-medium">{trafficRps.toLocaleString()} req/s</span>
              <span>smoothly balanced · 0 drops</span>
            </div>
          )}

          {selected && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 pl-4 pr-2 py-1.5 surface !rounded-full shadow-2xl text-xs animate-fadeIn">
              <span className="text-slate-400">
                {selected.type === "node" ? "Node" : "Connection"} <span className="num text-white">{selected.label}</span>
              </span>
              {selected.type === "node" && outcome === null && (
                // Keyboard/touch alternative to dragging a connection handle.
                <label className="flex items-center gap-1.5 text-slate-400">
                  <span className="sr-only">Connect {selected.label} to</span>
                  <span aria-hidden>→</span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      onConnect({ source: selected.id, target: e.target.value, sourceHandle: null, targetHandle: null });
                    }}
                    className="bg-black/50 border border-[var(--line-strong)] rounded-full px-2 py-1 text-xs text-white"
                  >
                    <option value="">Connect to…</option>
                    {nodes
                      .filter(
                        (n) =>
                          n.id !== selected.id && !edges.some((e) => e.source === selected.id && e.target === n.id)
                      )
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {String((n.data as { label?: string })?.label ?? n.id)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => (selected.type === "node" ? removeNode(selected.id) : removeEdge(selected.id))}
                className="btn btn-danger !py-1 !px-2.5 !rounded-full text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button type="button" onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-white" aria-label="Deselect">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: "removableEdge", animated: true }}
            onNodeClick={(_, node) =>
              setSelected({ type: "node", id: node.id, label: String((node.data as { label?: string })?.label ?? node.id) })
            }
            onEdgeClick={(_, edge) => setSelected({ type: "edge", id: edge.id, label: `${edge.source} ➔ ${edge.target}` })}
            onPaneClick={() => setSelected(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            nodesDraggable={outcome === null}
            fitView
          >
            <Background color="#1a2234" gap={22} size={1.2} />
            <Controls showInteractive={false} />
          </ReactFlow>

          {isBoss && freshTest === null && !stressing && (
            <div className="absolute bottom-3 right-3 left-14 sm:left-auto px-3 py-1.5 rounded-full surface text-[11px] text-slate-400 pointer-events-none">
              Loads shown are from the last stress test. Change the design, then stress test to see the new result.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function ScenarioBrief({
  scenario,
  levelNumber,
  source,
  alreadyPassed,
  onNextScenario,
}: {
  scenario: BuilderScenario;
  levelNumber: number;
  source: InitialDesign["source"];
  alreadyPassed: boolean;
  onNextScenario: () => void;
}) {
  const facts = [
    { label: "Scale", value: scenario.userScale },
    { label: "Traffic", value: scenario.trafficPattern },
    { label: "Failure", value: scenario.failureCondition },
    { label: "Win condition", value: scenario.winCondition },
  ];
  return (
    <section className="surface-accent p-5 sm:p-6 space-y-4" aria-label="Scenario">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-bad">
          <Swords className="w-3.5 h-3.5" /> Level {levelNumber} builder boss
        </span>
        {alreadyPassed && (
          <span className="chip chip-ok">
            Passed before · replays pay a small bonus once a day
          </span>
        )}
        {source === "draft" && <span className="chip chip-accent">Resumed your saved draft.</span>}
        {source === "inherited" && <span className="chip chip-accent">Starting from the design you passed last level.</span>}
        <button type="button" onClick={onNextScenario} className="btn btn-ghost !px-2 !py-1 text-[11px]">
          Next boss
        </button>
      </div>
      <h1 className="space-y-1">
        <span className="block eyebrow">{scenario.title}</span>
        <span className="block text-2xl sm:text-3xl display">{scenario.objective}</span>
      </h1>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-xl overflow-hidden border border-[var(--line)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] bg-black/10">
        {facts.map((f) => (
          <div key={f.label} className="p-3.5">
            <dt className="eyebrow !text-[11px]">{f.label}</dt>
            <dd className="text-[13px] text-slate-200 mt-1 leading-snug">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MetricPair({ label, before, now, unit, bad }: { label: string; before?: number; now?: number; unit: string; bad: boolean }) {
  return (
    <div className="p-3 bg-[var(--surface)]">
      <div className="flex items-center gap-1.5"><span aria-hidden className={`dot ${bad ? "text-rose-400" : "text-emerald-400"}`} /><span className="eyebrow !text-[11px]">{label}</span></div>
      <div className={`num text-lg mt-1 ${bad ? "text-rose-300" : "text-white"}`}>
        {now !== undefined ? `${now.toLocaleString()}${unit}` : "—"}
      </div>
      {before !== undefined && now !== undefined && before !== now && (
        <div className="num text-[11px] text-slate-500">
          start: {before.toLocaleString()}
          {unit}
        </div>
      )}
    </div>
  );
}

function EvidencePanel({
  baseline,
  evaluation,
  stale,
}: {
  baseline: ScenarioEvaluation | null;
  evaluation: ScenarioEvaluation | null;
  stale: boolean;
}) {
  const shown = evaluation ?? baseline;
  if (!shown || !baseline) return null;
  const m = shown.simulation.metrics;
  const b = baseline.simulation.metrics;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="eyebrow">{evaluation ? "Stress test result" : "Starting design under load"}</span>
        {stale && <span className="chip chip-warn !py-0">Design changed · retest</span>}
      </div>
      <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden bg-[var(--line)] border border-[var(--line)]">
        <MetricPair label="Busiest server" before={evaluation ? b.maxServerCpu : undefined} now={m.maxServerCpu} unit="%" bad={m.maxServerCpu > 85} />
        <MetricPair label="Busiest DB node" before={evaluation ? b.maxDbCpu : undefined} now={m.maxDbCpu} unit="%" bad={m.maxDbCpu > 85} />
        <MetricPair label="p95 latency" before={evaluation ? b.latencyMs : undefined} now={m.latencyMs} unit="ms" bad={m.latencyMs > 500} />
        <MetricPair label="Error rate" before={evaluation ? b.errorRate : undefined} now={m.errorRate} unit="%" bad={m.errorRate > 0} />
      </div>
      {m.serverShares.length > 0 && (
        <p className="text-xs text-slate-500">
          Traffic split across live servers: <span className="num text-slate-200">{m.serverShares.map((s) => `${s}%`).join(" / ")}</span>
        </p>
      )}
      {evaluation && (
        <>
          <ul className="space-y-2 text-[13px] leading-snug">
            {evaluation.checks.map((c) => (
              <li
                key={c.id}
                className={`flex items-start gap-1.5 ${
                  c.status === "pass" ? "text-emerald-300" : c.status === "warn" ? "text-amber-300" : "text-rose-300"
                }`}
              >
                {c.status === "pass" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{c.message}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400">
            Design score {evaluation.score.score}/100 (grade {evaluation.score.grade}). Passing needs every check green and a score of at least 70.
          </p>
        </>
      )}
    </div>
  );
}

function BossResult({
  scenario,
  outcome,
  baseline,
  evaluation,
  onReset,
}: {
  scenario: BuilderScenario;
  outcome: ProgressionOutcome;
  baseline: ScenarioEvaluation | null;
  evaluation: ScenarioEvaluation | null;
  onReset: () => void;
}) {
  const pattern = getPatternById(scenario.patternId);
  const next = getAllPatterns().find((p) => pattern && p.levelNumber === pattern.levelNumber + 1);
  const b = baseline?.simulation.metrics;
  const a = evaluation?.simulation.metrics;
  return (
    <div className="space-y-4" role="status">
      <div className="p-4 rounded-xl bg-emerald-400/[0.06] border border-emerald-400/25 animate-fadeIn">
        <p className="text-[15px] font-semibold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Design passed
        </p>
        <p className="text-[13px] text-slate-300 mt-1">
          {outcome.xpAwarded > 0 ? `+${outcome.xpAwarded} XP. ` : "No XP this time (replay bonus is once a day). "}
          {pattern ? `Builder evidence recorded for ${pattern.title}.` : ""}
        </p>
      </div>
      {b && a && pattern && (
        <PostMortemCard
          data={{
            incidentId: `BOSS-${String(pattern.levelNumber).padStart(3, "0")}`,
            title: scenario.title,
            impact: `${scenario.userScale}. ${scenario.failureCondition}.`,
            rootCause: pattern.tradeoff.whatFailed,
            fix: pattern.tradeoff.whyFixWorked,
            followUp: pattern.tradeoff.insufficientWhen,
            before: { latencyMs: b.latencyMs, errorRate: b.errorRate, cpu: Math.max(b.maxServerCpu, b.maxDbCpu) },
            after: { latencyMs: a.latencyMs, errorRate: a.errorRate, cpu: Math.max(a.maxServerCpu, a.maxDbCpu) },
          }}
        />
      )}
      <div className="flex flex-col gap-2">
        {next ? (
          <Link
            href={`/campaign/${next.chapterId}`}
            className="btn btn-primary btn-lg w-full"
          >
            Level {next.levelNumber}: {next.levelGoal} <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/interview"
            className="btn btn-primary btn-lg w-full"
          >
            Try the Interview Arena <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        <Link href="/dashboard" className="btn btn-secondary w-full">
          Back to home
        </Link>
        <button type="button" onClick={onReset} className="btn btn-ghost w-full text-xs">
          Practice again from the start
        </button>
      </div>
    </div>
  );
}

function SandboxHeader({
  trafficRps,
  onTraffic,
  onSimulate,
  onChaos,
  onReset,
  onClear,
  chaosActive,
}: {
  trafficRps: number;
  onTraffic: (rps: number) => void;
  onSimulate: () => void;
  onChaos: () => void;
  onReset: () => void;
  onClear: () => void;
  chaosActive?: boolean;
}) {
  const isHighTraffic = trafficRps >= 35000;
  const isExtremeTraffic = trafficRps >= 70000;

  return (
    <section className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-cyan-300/80">Sandbox · Interactive Flight Simulator</span>
            {isExtremeTraffic ? (
              <span className="chip chip-bad !py-0 !text-[11px] animate-pulse">🔥 FLASH SURGE</span>
            ) : isHighTraffic ? (
              <span className="chip chip-warn !py-0 !text-[11px]">⚡ HEAVY LOAD</span>
            ) : null}
          </div>
          <h1 className="text-3xl display">Architecture Sandbox</h1>
        </div>
        <p className="text-[13px] text-slate-400 mt-1.5">
          Drag the traffic throttle live, watch servers heat up and melt down, and test your scaling under pressure.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className={`flex items-center gap-4 surface !rounded-xl px-4 py-2 border transition-all ${
          isExtremeTraffic
            ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.3)] bg-rose-950/20"
            : isHighTraffic
            ? "border-amber-400/40 bg-amber-950/20"
            : "border-[var(--line)]"
        }`}>
          <span className="flex flex-col">
            <span className="eyebrow !text-[11px]">Traffic Throttle</span>
            <span className={`num text-sm font-bold transition-colors ${
              isExtremeTraffic ? "text-rose-300" : isHighTraffic ? "text-amber-300" : "text-white"
            }`}>
              {trafficRps.toLocaleString()} <span className="text-xs font-normal text-slate-400">req/s</span>
            </span>
          </span>
          <input
            type="range"
            min="1000"
            max="120000"
            step="1000"
            value={trafficRps}
            onChange={(e) => onTraffic(Number(e.target.value))}
            className={`w-36 sm:w-48 cursor-pointer transition-all ${
              isExtremeTraffic ? "accent-rose-500" : isHighTraffic ? "accent-amber-400" : "accent-cyan-400"
            }`}
            aria-label="Traffic in requests per second"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSimulate}
            className="btn btn-primary"
            title="Recalculate architecture metrics"
          >
            <Play className="w-3.5 h-3.5" /> Simulate
          </button>
          <button
            type="button"
            onClick={onChaos}
            disabled={chaosActive}
            className={`btn btn-danger relative overflow-hidden ${
              chaosActive ? "animate-pulse" : ""
            }`}
            title="Inject a 120,000 req/s flash sale flood"
          >
            <Flame className="w-3.5 h-3.5 text-amber-300 animate-flame" />
            <span>{chaosActive ? "Surging 120k RPS…" : "Inject 10x Spike"}</span>
          </button>
          <button type="button" onClick={onReset} className="btn btn-secondary !px-2.5" aria-label="Reset to template" title="Reset template">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClear} className="btn btn-secondary !px-2.5" aria-label="Clear canvas" title="Clear canvas">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/** Budget meter: every component costs credits; finishing lean is part of the win. */
function CloudCredits({ cost, budget }: { cost: number; budget: number }) {
  const ratio = cost / budget;
  const tone = ratio > 1.5 ? "bg-rose-400" : ratio > 1 ? "bg-amber-400" : "bg-emerald-400";
  const label = ratio > 1.5 ? "Credits blown" : ratio > 1 ? "Over budget" : "Within budget";
  return (
    <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3 space-y-1.5" aria-label="Cloud credits">
      <div className="flex items-center justify-between text-xs">
        <span className="eyebrow !text-[11px]">Cloud credits</span>
        <span className="num text-slate-200">
          ${cost.toLocaleString()} <span className="text-slate-500">/ ${budget.toLocaleString()} per month</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <p className="text-[11px] text-slate-400">{label}: every component costs credits, so build only what the traffic needs.</p>
    </div>
  );
}

function SandboxScore({ score }: { score: ReturnType<typeof evaluateArchitectureScore> }) {
  return (
    <section className="surface p-5 space-y-3" aria-label="Design score">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Design score</span>
        <span className="chip chip-accent !py-0">Grade {score.grade}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="num text-4xl text-white">{score.score}</span>
        <span className="num text-sm text-slate-500">/ 100</span>
      </div>
      <p className="text-[13px] text-slate-300 leading-relaxed">{score.summary}</p>
      <ul className="space-y-1.5 text-xs text-slate-400">
        {score.findings.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden className="mt-1.5 dot text-slate-500" />
            {f}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-500">Scores reflect the last simulation. Press Simulate after changing the design.</p>
    </section>
  );
}

function ScenarioLibrary({ stats }: { stats: UserStats | null }) {
  const patterns = getAllPatterns();
  return (
    <section className="surface p-5 space-y-3" aria-label="Builder bosses">
      <h2 className="eyebrow flex items-center gap-1.5">
        <Swords className="w-3.5 h-3.5" /> Builder bosses
      </h2>
      <ul className="divide-y divide-[var(--line)]">
        {getAllBuilderScenarios().map((s) => {
          const pattern = patterns.find((p) => p.id === s.patternId);
          const unlocked = stats && pattern ? isPatternCleared(stats, pattern) : false;
          const passed = stats ? getEvidence(stats, s.patternId).scenariosPassed.includes(s.id) : false;
          return (
            <li key={s.id} className="flex items-center justify-between gap-2 text-[13px] py-2">
              <span className={unlocked ? "text-slate-200" : "text-slate-500"}>
                <span className="num text-slate-500 mr-2">{String(pattern?.levelNumber).padStart(2, "0")}</span>{s.title}
                <span className="sr-only">{passed ? " (passed)" : unlocked ? "" : " (locked)"}</span>
              </span>
              {unlocked ? (
                <Link href={`/builder?scenario=${s.id}`} className="text-xs font-medium text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                  {passed ? "Replay" : "Start"} <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <span className="text-[11px] text-slate-600">Clear L{pattern?.levelNumber} run</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-slate-500">Each boss unlocks after its level run.</p>
    </section>
  );
}

export default function BuilderPage(props: { searchParams: SearchParams }) {
  return (
    <FeatureGate lab="builder">
      <BuilderPageContent {...props} />
    </FeatureGate>
  );
}
