"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, RotateCcw, X, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import FeatureGate from "@/components/FeatureGate";
import LevelUpModal from "@/components/LevelUpModal";
import QuestionCard from "@/components/run/QuestionCard";
import ScenarioTabs from "@/components/run/ScenarioTabs";
import SelectTile, { TileState } from "@/components/run/SelectTile";
import { Stepper } from "@/components/run/RunVisuals";
import ArchitectureCanvas, { makeArchNode } from "@/components/builder/ArchitectureCanvas";
import type { Node, Edge } from "@xyflow/react";
import { GUIDED_SCENARIOS } from "@/data/guided";
import { completeGuided, nextShuffleSeed } from "@/lib/storage";
import { checkPicks, orderPicks, type PickResult } from "@/lib/guidedPicks";
import { playBlipSound, playErrorSound, playLevelUpSound, playSuccessSound } from "@/lib/sound";
import type { ArchitectureNodeType, GuidedScenario } from "@/types";

const STEPS = [
  { id: "requirements", label: "Requirements" },
  { id: "entities", label: "Entities" },
  { id: "apis", label: "APIs" },
  { id: "architecture", label: "Architecture" },
];

const stripStep = (s: string) => s.replace(/^Step \d+:\s*/i, "");

function GuidedThinkingPageContent() {
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState(GUIDED_SCENARIOS[0].id);
  const [attempt, setAttempt] = useState(0); // bump to remount the steps on reset
  const [step, setStep] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const scenario = GUIDED_SCENARIOS.find((s) => s.id === scenarioId) ?? GUIDED_SCENARIOS[0];
  // Rendered client-side only (behind FeatureGate), so the seed can come from localStorage.
  const [baseSeed] = useState(() => nextShuffleSeed("guided"));
  const seed = `${baseSeed}|${scenario.id}|${attempt}`;

  const reset = (id?: string) => {
    if (id) setScenarioId(id);
    setStep(0);
    setAttempt((a) => a + 1);
  };

  const advance = () => {
    playBlipSound();
    setStep((s) => s + 1);
  };

  const finish = () => {
    playLevelUpSound();
    completeGuided(scenario.id, scenario.xpReward);
    setStep(STEPS.length);
    setTimeout(() => setCelebrate(true), 600);
  };

  const done = step >= STEPS.length;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="btn btn-ghost !px-1 text-xs">
            <ArrowLeft className="w-4 h-4" />
            Progress
          </Link>
          <ScenarioTabs
            items={GUIDED_SCENARIOS.map((s) => ({ id: s.id, label: s.title.replace(/^Design /, "") }))}
            activeId={scenario.id}
            onSelect={(id) => id !== scenario.id && reset(id)}
          />
        </div>

        <header className="space-y-4">
          <div className="space-y-2 max-w-3xl">
            <span className="eyebrow text-cyan-300/80">Lab · Challenge · {scenario.category}</span>
            <h1 className="text-3xl sm:text-4xl display">{scenario.title}</h1>
            <p className="text-[15px] text-slate-400 leading-relaxed">{scenario.problemStatement}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              <Clock className="w-3 h-3" /> ~{scenario.estimatedTime}
            </span>
            <span className="chip chip-warn">
              <Zap className="w-3 h-3" /> <span className="num">+{scenario.xpReward} XP</span>
            </span>
            {step > 0 && (
              <button onClick={() => reset()} className="btn btn-ghost !py-1 text-xs ml-auto">
                <RotateCcw className="w-3.5 h-3.5" />
                Start over
              </button>
            )}
          </div>
        </header>

        <Stepper steps={STEPS} current={step} label="Challenge steps" />

        <section key={`${scenario.id}-${attempt}-${Math.min(step, 3)}`} className="surface p-5 sm:p-7 animate-fadeIn">
          {step === 0 && <RequirementsStep scenario={scenario} onContinue={advance} />}
          {step === 1 && (
            <PickStep
              eyebrow="Step 2 of 4 · Data model"
              title={stripStep(scenario.entitiesDiscovery.instruction)}
              help="Pick only what the MVP needs. Extra tables are extra work you'll have to defend."
              noun="entity"
              exact
              items={orderPicks(scenario.entitiesDiscovery.availableEntities, `${seed}|entities`).map((e) => ({
                id: e.id,
                content: (
                  <span className="block space-y-2">
                    <span className="block text-[13px] font-semibold text-white">{e.name}</span>
                    <span className="block num text-[11px] text-slate-500 leading-relaxed">{e.attributes.join(" · ")}</span>
                  </span>
                ),
              }))}
              correctIds={scenario.entitiesDiscovery.correctEntityIds}
              grid
              submitLabel="Check data model"
              continueLabel="Next: APIs"
              onPass={advance}
            />
          )}
          {step === 2 && (
            <PickStep
              eyebrow="Step 3 of 4 · API contract"
              title={stripStep(scenario.apiDesignDiscovery.instruction)}
              help="One endpoint per core write and read. Leave nice-to-haves for later."
              noun="endpoint"
              exact
              items={orderPicks(scenario.apiDesignDiscovery.availableApis, `${seed}|apis`).map((a) => ({
                id: a.id,
                content: (
                  <span className="flex items-start gap-3">
                    <span
                      className={`num text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                        a.method === "GET" ? "border-cyan-300/30 text-cyan-200" : "border-amber-300/30 text-amber-200"
                      }`}
                    >
                      {a.method}
                    </span>
                    <span className="min-w-0">
                      <span className="block num text-[13px] text-white break-all">{a.path}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{a.description}</span>
                    </span>
                  </span>
                ),
              }))}
              correctIds={scenario.apiDesignDiscovery.correctApiIds}
              submitLabel="Check endpoints"
              continueLabel="Next: architecture"
              onPass={advance}
            />
          )}
          {step >= 3 && <ArchitectureStep scenario={scenario} seed={seed} onPass={finish} done={done} />}
        </section>
      </main>

      <LevelUpModal
        isOpen={celebrate}
        onClose={() => setCelebrate(false)}
        title="Challenge complete"
        subtitle={`You went from raw requirements to a scalable architecture for ${scenario.title}.`}
        xpEarned={scenario.xpReward}
        badgeEarned="Guided Architect"
        nextLabel="Try Architecture Evolution"
        onNext={() => router.push("/evolution")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function RequirementsStep({ scenario, onContinue }: { scenario: GuidedScenario; onContinue: () => void }) {
  const q = scenario.requirementsDiscovery;
  return (
    <div className="max-w-2xl">
      <QuestionCard
        eyebrow="Step 1 of 4 · Scope"
        context="The first five minutes decide whether you design what matters or get lost in details. Pick the smallest scope that is still the product."
        question={{
          question: q.question,
          options: q.options.map((o) => ({ id: o.id, label: o.text, isCorrect: o.isCorrect, explanation: o.feedback })),
        }}
        submitLabel="Lock in scope"
        continueLabel="Next: entities"
        onContinue={onContinue}
      />
    </div>
  );
}

interface PickItem {
  id: string;
  content: React.ReactNode;
}

/**
 * Multi-select step. `exact`: the picks must equal the answer set.
 * Otherwise the picks only need to include every required item.
 * A failed check marks wrong picks but does not reveal missing ones.
 */
function PickStep({
  eyebrow,
  title,
  help,
  noun,
  items,
  correctIds,
  exact = false,
  grid = false,
  submitLabel,
  continueLabel,
  onPass,
  passNote,
  locked = false,
  children,
}: {
  eyebrow: string;
  title: string;
  help: string;
  noun: string;
  items: PickItem[];
  correctIds: string[];
  exact?: boolean;
  grid?: boolean;
  submitLabel: string;
  continueLabel: string;
  onPass: () => void;
  passNote?: string;
  /** Hide the continue button once the step's outcome is final. */
  locked?: boolean;
  children?: (selected: string[]) => React.ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<null | { pass: boolean; missing: number; extra: number }>(null);

  const toggle = (id: string) => {
    if (result) return;
    playBlipSound();
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const check = () => {
    const outcome = checkPicks(selected, correctIds, exact);
    setResult(outcome);
    if (outcome.pass) playSuccessSound();
    else playErrorSound();
  };

  const stateOf = (id: string): TileState => {
    const picked = selected.includes(id);
    if (!result) return picked ? "selected" : "idle";
    const needed = correctIds.includes(id);
    if (result.pass) return needed ? "right" : picked ? "selected" : "dim";
    if (picked && exact && !needed) return "wrong";
    return picked ? "selected" : "idle";
  };

  const plural = (n: number) => `${n} ${noun === "entity" && n !== 1 ? "entities" : n !== 1 ? `${noun}s` : noun}`;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="eyebrow text-cyan-300/80">{eyebrow}</span>
        <h2 className="text-lg display">{title}</h2>
        <p className="text-[13px] text-slate-400 leading-relaxed">{help}</p>
      </div>

      <div className={grid ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" : "space-y-2"}>
        {items.map((it) => (
          <SelectTile
            key={it.id}
            state={stateOf(it.id)}
            pressed={selected.includes(it.id)}
            disabled={!!result}
            onClick={() => toggle(it.id)}
            className={grid ? "h-full" : ""}
          >
            {it.content}
          </SelectTile>
        ))}
      </div>

      {children?.(selected)}

      {!result ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="num text-xs text-slate-500">{selected.length} selected</span>
          <button onClick={check} disabled={selected.length === 0} className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl p-4 space-y-3 text-[13px] leading-relaxed animate-fadeIn border ${
            result.pass ? "bg-emerald-400/[0.06] border-emerald-400/25" : "bg-rose-400/[0.06] border-rose-400/25"
          }`}
        >
          <p className={`font-semibold flex items-center gap-2 ${result.pass ? "text-emerald-300" : "text-rose-300"}`}>
            {result.pass ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {result.pass ? "That's the core set" : "Not quite"}
          </p>
          {result.pass ? (
            passNote && <p className="text-slate-300">{passNote}</p>
          ) : (
            <p className="text-slate-300">
              {[
                result.extra > 0 && `${plural(result.extra)} marked in red ${result.extra === 1 ? "isn't" : "aren't"} needed for the MVP`,
                result.missing > 0 && `${plural(result.missing)} the MVP needs ${result.missing === 1 ? "is" : "are"} still missing`,
              ]
                .filter(Boolean)
                .join(", and ")}
              .
            </p>
          )}
          {result.pass ? (
            !locked && <button onClick={onPass} className="btn btn-primary">
              {continueLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setResult(null)} className="btn btn-secondary">
              <RotateCcw className="w-3.5 h-3.5" />
              Adjust and retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ArchitectureStep({
  scenario,
  onPass,
  done,
}: {
  scenario: GuidedScenario;
  seed: string;
  onPass: () => void;
  done: boolean;
}) {
  const a = scenario.architectureDiscovery;
  const initialNodes = useMemo<Node[]>(
    () => [
      makeArchNode("users", "client", "Users", 40, 220),
      makeArchNode("db", "database", "Primary DB", 560, 220),
    ],
    []
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [, setEdges] = useState<Edge[]>([]);
  const [checkResult, setCheckResult] = useState<PickResult | null>(null);

  const handleGraphChange = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
    setCheckResult(null);
  }, []);

  const handleSubmit = () => {
    const placedTypes = Array.from(
      new Set(
        nodes
          .map((n) => (n.data as { type?: ArchitectureNodeType })?.type)
          .filter((t): t is ArchitectureNodeType => Boolean(t) && t !== "client")
      )
    );

    const result = checkPicks(placedTypes, a.requiredComponents, true);
    setCheckResult(result);

    if (result.pass) {
      playSuccessSound();
      onPass();
    } else {
      playErrorSound();
    }
  };

  const currentTypes = Array.from(
    new Set(
      nodes
        .map((n) => (n.data as { type?: ArchitectureNodeType })?.type)
        .filter((t): t is ArchitectureNodeType => Boolean(t) && t !== "client")
    )
  );

  return (
    <div className="surface p-6 sm:p-7 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="chip chip-accent text-[11px]">Step 4 of 4 · Architecture</span>
          <span className="chip">Canvas Builder</span>
        </div>
        <h2 className="text-2xl display">{stripStep(a.instruction)}</h2>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          Assemble the required system architecture on the canvas. Add components from the palette, wire the flow of traffic, and eliminate bottlenecks. Extra over-provisioned components will be rejected.
        </p>
      </header>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden border border-[var(--line)]">
        <ArchitectureCanvas
          initialNodes={initialNodes}
          initialEdges={[]}
          onChange={handleGraphChange}
          className="h-[480px] w-full"
        />
      </div>

      {/* Readout & Submit */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="eyebrow">Placed components ({currentTypes.length}):</span>
          {currentTypes.length === 0 ? (
            <span className="text-slate-500 italic">None added yet</span>
          ) : (
            currentTypes.map((t) => (
              <span key={t} className="chip chip-ghost text-slate-300">
                {t.replace(/_/g, " ")}
              </span>
            ))
          )}
        </div>

        {!done && (
          <button type="button" onClick={handleSubmit} className="btn btn-primary">
            Submit architecture
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {checkResult && !checkResult.pass && (
        <div className="surface-2 p-4 rounded-xl border border-rose-500/40 text-sm space-y-1 animate-fadeIn">
          <p className="font-semibold text-rose-300 flex items-center gap-2">
            <X className="w-4 h-4" /> Architecture review failed
          </p>
          <p className="text-slate-300 text-xs">
            {checkResult.missing > 0 && `${checkResult.missing} required component(s) are missing from your architecture. `}
            {checkResult.extra > 0 && `${checkResult.extra} unneeded or over-provisioned component(s) were added. Keep the design lean.`}
          </p>
        </div>
      )}

      {(done || (checkResult && checkResult.pass)) && (
        <div className="surface-2 p-5 rounded-xl border border-emerald-500/40 space-y-3 animate-fadeIn">
          <p className="font-semibold text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" /> Architecture approved
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">{a.explanation}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/builder" className="btn btn-primary btn-sm">
              Build it in the sandbox
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/campaign" className="btn btn-ghost btn-sm">
              Return to Campaign
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuidedThinkingPage() {
  return (
    <FeatureGate lab="caseStudies">
      <GuidedThinkingPageContent />
    </FeatureGate>
  );
}
