"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, RotateCcw, X, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import QuestionCard from "@/components/run/QuestionCard";
import ScenarioTabs from "@/components/run/ScenarioTabs";
import SelectTile, { TileState } from "@/components/run/SelectTile";
import { Stepper, T, Topology } from "@/components/run/RunVisuals";
import { GUIDED_SCENARIOS } from "@/data/guided";
import { completeGuided } from "@/lib/storage";
import { playBlipSound, playErrorSound, playLevelUpSound, playSuccessSound } from "@/lib/sound";
import type { ArchitectureNodeType, GuidedScenario } from "@/types";

const STEPS = [
  { id: "requirements", label: "Requirements" },
  { id: "entities", label: "Entities" },
  { id: "apis", label: "APIs" },
  { id: "architecture", label: "Architecture" },
];

const COMPONENTS: { type: ArchitectureNodeType; label: string; desc: string }[] = [
  { type: "cdn", label: "Edge CDN", desc: "Caches video chunks, images, and static assets globally" },
  { type: "load_balancer", label: "Load balancer", desc: "Spreads HTTP/TCP requests across app servers" },
  { type: "server", label: "Stateless app servers", desc: "Executes API business logic and socket sessions" },
  { type: "cache", label: "In-memory cache", desc: "Answers repeated reads from RAM (Redis / Memcached)" },
  { type: "queue", label: "Message queue", desc: "Decouples async jobs, fan-out, and transcoding" },
  { type: "database", label: "Primary database", desc: "Durable ACID source of truth for persistent data" },
  { type: "replica", label: "Read replicas", desc: "Offloads read queries horizontally from primary DB" },
];

const stripStep = (s: string) => s.replace(/^Step \d+:\s*/i, "");

export default function GuidedThinkingPage() {
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState(GUIDED_SCENARIOS[0].id);
  const [attempt, setAttempt] = useState(0); // bump to remount the steps on reset
  const [step, setStep] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const scenario = GUIDED_SCENARIOS.find((s) => s.id === scenarioId) ?? GUIDED_SCENARIOS[0];

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
              items={scenario.entitiesDiscovery.availableEntities.map((e) => ({
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
              items={scenario.apiDesignDiscovery.availableApis.map((a) => ({
                id: a.id,
                content: (
                  <span className="flex items-start gap-3">
                    <span
                      className={`num text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
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
          {step >= 3 && <ArchitectureStep scenario={scenario} onPass={finish} done={done} />}
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
    const missing = correctIds.filter((id) => !selected.includes(id)).length;
    const extra = exact ? selected.filter((id) => !correctIds.includes(id)).length : 0;
    const pass = missing === 0 && extra === 0;
    setResult({ pass, missing, extra });
    if (pass) playSuccessSound();
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

function ArchitectureStep({ scenario, onPass, done }: { scenario: GuidedScenario; onPass: () => void; done: boolean }) {
  const a = scenario.architectureDiscovery;
  return (
    <div className="space-y-5">
      <PickStep
        eyebrow="Step 4 of 4 · Architecture"
        title={stripStep(a.instruction)}
        help="Pick the building blocks a fault-tolerant, horizontally scalable version needs. The diagram updates as you go."
        noun="component"
        items={COMPONENTS.map((c) => ({
          id: c.type,
          content: (
            <span className="block">
              <span className="block text-[13px] font-semibold text-white">{c.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{c.desc}</span>
            </span>
          ),
        }))}
        correctIds={a.requiredComponents}
        grid
        submitLabel="Submit architecture"
        continueLabel="Finish challenge"
        passNote={a.explanation}
        onPass={onPass}
        locked={done}
      >
        {(selected) => {
          const has = (t: ArchitectureNodeType) => selected.includes(t);
          const slot = (t: ArchitectureNodeType, label: string, note?: string) =>
            has(t) ? T(label, "new", note) : T(label, "idle", "not added");

          const tiers = [[T("Users")]];
          if (has("cdn")) {
            tiers.push([T("Edge CDN", "new", "global POPs")]);
          }
          tiers.push([slot("load_balancer", "Load balancer")]);
          tiers.push([slot("server", "App servers", "stateless fleet")]);

          const asyncRow = [];
          if (has("cache")) asyncRow.push(T("In-Memory Cache", "new", "RAM"));
          if (has("queue")) asyncRow.push(T("Message Queue", "new", "async"));
          if (asyncRow.length > 0) tiers.push(asyncRow);

          const storageRow = [slot("database", "Database", "primary")];
          if (has("replica")) storageRow.push(T("Read Replicas", "new", "read pool"));
          tiers.push(storageRow);

          return (
            <Topology
              caption={<span className="eyebrow">Your architectural topology</span>}
              tiers={tiers}
            />
          );
        }}
      </PickStep>

      {done && (
        <div className="flex flex-wrap items-center gap-3 pt-1 animate-fadeIn">
          <span className="chip chip-ok">
            <Check className="w-3 h-3" /> Challenge complete
          </span>
          <Link href="/builder" className="btn btn-primary">
            Build it in the sandbox
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/evolution" className="btn btn-ghost">
            See how it evolves
          </Link>
        </div>
      )}
    </div>
  );
}
