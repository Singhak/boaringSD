"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Zap,
  RotateCcw,
  Sparkles,
  Server,
  Layers,
  Database,
  Users,
  Code2,
  FileCode,
  ShieldCheck,
  Check,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LevelUpModal from "@/components/LevelUpModal";
import { GUIDED_SCENARIOS } from "@/data/guided";
import { completeGuided } from "@/lib/storage";
import { playSuccessSound, playErrorSound, playBlipSound, playLevelUpSound } from "@/lib/sound";
import { ArchitectureNodeType } from "@/types";

const componentIcons: Record<string, React.ElementType> = {
  client: Users,
  load_balancer: Layers,
  server: Server,
  cache: Zap,
  database: Database,
  replica: Database,
};

export default function GuidedThinkingPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(GUIDED_SCENARIOS[0].id);
  const scenario = GUIDED_SCENARIOS.find((s) => s.id === selectedScenarioId) || GUIDED_SCENARIOS[0];

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Requirements Discovery State
  const [selectedReqOption, setSelectedReqOption] = useState<string | null>(null);
  const [reqSubmitted, setReqSubmitted] = useState<boolean>(false);

  // Step 2: Entities Discovery State
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [entitiesSubmitted, setEntitiesSubmitted] = useState<boolean>(false);

  // Step 3: API Design Discovery State
  const [selectedApiIds, setSelectedApiIds] = useState<string[]>([]);
  const [apisSubmitted, setApisSubmitted] = useState<boolean>(false);

  // Step 4: Architecture Assembly State
  const [selectedComponents, setSelectedComponents] = useState<ArchitectureNodeType[]>([]);
  const [archSubmitted, setArchSubmitted] = useState<boolean>(false);

  // Modal celebration
  const [showCelebration, setShowCelebration] = useState(false);

  const resetAllSteps = (newScenarioId?: string) => {
    if (newScenarioId) setSelectedScenarioId(newScenarioId);
    setCurrentStep(1);
    setSelectedReqOption(null);
    setReqSubmitted(false);
    setSelectedEntityIds([]);
    setEntitiesSubmitted(false);
    setSelectedApiIds([]);
    setApisSubmitted(false);
    setSelectedComponents([]);
    setArchSubmitted(false);
  };

  // Step 1 Validation
  const handleReqSubmit = () => {
    if (!selectedReqOption) return;
    setReqSubmitted(true);
    const chosen = scenario.requirementsDiscovery.options.find((o) => o.id === selectedReqOption);
    if (chosen?.isCorrect) {
      playSuccessSound();
    } else {
      playErrorSound();
    }
  };

  // Step 2 Validation
  const toggleEntity = (id: string) => {
    if (entitiesSubmitted) return;
    playBlipSound();
    setSelectedEntityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleEntitiesSubmit = () => {
    setEntitiesSubmitted(true);
    const correctCount = selectedEntityIds.filter((id) =>
      scenario.entitiesDiscovery.correctEntityIds.includes(id)
    ).length;
    const isSuccess =
      correctCount === scenario.entitiesDiscovery.correctEntityIds.length &&
      selectedEntityIds.length === scenario.entitiesDiscovery.correctEntityIds.length;

    if (isSuccess) {
      playSuccessSound();
    } else {
      playErrorSound();
    }
  };

  // Step 3 Validation
  const toggleApi = (id: string) => {
    if (apisSubmitted) return;
    playBlipSound();
    setSelectedApiIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApisSubmit = () => {
    setApisSubmitted(true);
    const correctCount = selectedApiIds.filter((id) =>
      scenario.apiDesignDiscovery.correctApiIds.includes(id)
    ).length;
    const isSuccess =
      correctCount === scenario.apiDesignDiscovery.correctApiIds.length &&
      selectedApiIds.length === scenario.apiDesignDiscovery.correctApiIds.length;

    if (isSuccess) {
      playSuccessSound();
    } else {
      playErrorSound();
    }
  };

  // Step 4 Validation
  const toggleComponent = (type: ArchitectureNodeType) => {
    if (archSubmitted) return;
    playBlipSound();
    setSelectedComponents((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleArchSubmit = () => {
    setArchSubmitted(true);
    const hasRequired = scenario.architectureDiscovery.requiredComponents.every((c) =>
      selectedComponents.includes(c)
    );

    if (hasRequired) {
      playLevelUpSound();
      completeGuided(scenario.id, scenario.xpReward);
      setTimeout(() => {
        setShowCelebration(true);
      }, 700);
    } else {
      playErrorSound();
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Scenario Selector Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Scenario tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {GUIDED_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => resetAllSteps(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  s.id === scenario.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Guided Mode Hero Banner */}
        <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-white/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-cyan-500/10 via-emerald-500/5 to-transparent pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> Guided Thinking Framework
                </span>
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> +{scenario.xpReward} XP
                </span>
                <span className="text-xs text-slate-400 font-mono">~{scenario.estimatedTime}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {scenario.title}
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl">{scenario.problemStatement}</p>
            </div>

            <button
              onClick={() => resetAllSteps()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Steps
            </button>
          </div>

          {/* 4-Step Progress Bar Navigator */}
          <div className="grid grid-cols-4 gap-2 pt-6 mt-6 border-t border-slate-800">
            {[
              { num: 1, title: "1. Requirements", isDone: reqSubmitted },
              { num: 2, title: "2. Core Entities", isDone: entitiesSubmitted },
              { num: 3, title: "3. API Design", isDone: apisSubmitted },
              { num: 4, title: "4. Architecture", isDone: archSubmitted },
            ].map((step) => {
              const isActive = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10"
                      : step.isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{step.title}</span>
                    {step.isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 1: REQUIREMENTS DISCOVERY */}
        {currentStep === 1 && (
          <div className="p-6 sm:p-8 rounded-2xl glass-card border border-white/10 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Step 1 of 4 • Scope Clarification
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {scenario.requirementsDiscovery.question}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Avoid premature complexity. The first 5 minutes of an interview determine whether you design what matters or get trapped in minor details.
              </p>
            </div>

            <div className="space-y-3">
              {scenario.requirementsDiscovery.options.map((opt, idx) => {
                const isSelected = selectedReqOption === opt.id;
                let cardStyle = "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300";

                if (isSelected && !reqSubmitted) {
                  cardStyle = "bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-md";
                }
                if (reqSubmitted) {
                  if (opt.isCorrect) {
                    cardStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                  } else if (isSelected && !opt.isCorrect) {
                    cardStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                  } else {
                    cardStyle = "bg-slate-900/40 border-slate-800/40 opacity-40";
                  }
                }

                return (
                  <button
                    key={opt.id}
                    disabled={reqSubmitted}
                    onClick={() => setSelectedReqOption(opt.id)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${cardStyle}`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{opt.text}</p>
                      {reqSubmitted && isSelected && (
                        <p className="text-xs mt-2 text-slate-300 font-mono">{opt.feedback}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-500">Pick the core MVP scope</span>
              {!reqSubmitted ? (
                <button
                  disabled={!selectedReqOption}
                  onClick={handleReqSubmit}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    selectedReqOption
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>Lock In Scope</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <span>Proceed to Step 2: Entity Modeling</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: ENTITIES DISCOVERY */}
        {currentStep === 2 && (
          <div className="p-6 sm:p-8 rounded-2xl glass-card border border-white/10 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Step 2 of 4 • Data Modeling
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {scenario.entitiesDiscovery.instruction}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose only the core data schemas needed to support the functional MVP.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {scenario.entitiesDiscovery.availableEntities.map((entity) => {
                const isSelected = selectedEntityIds.includes(entity.id);
                const isCorrect = scenario.entitiesDiscovery.correctEntityIds.includes(entity.id);

                let cardStyle = "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300";
                if (isSelected && !entitiesSubmitted) {
                  cardStyle = "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-md";
                }
                if (entitiesSubmitted) {
                  if (isCorrect) {
                    cardStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                  } else if (isSelected && !isCorrect) {
                    cardStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                  } else {
                    cardStyle = "bg-slate-900/40 border-slate-800/40 opacity-40";
                  }
                }

                return (
                  <button
                    key={entity.id}
                    disabled={entitiesSubmitted}
                    onClick={() => toggleEntity(entity.id)}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${cardStyle}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">{entity.name}</span>
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border ${
                            isSelected
                              ? "bg-cyan-500 border-cyan-500 text-slate-950"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="space-y-1 font-mono text-[11px] text-slate-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
                        {entity.attributes.map((attr, i) => (
                          <div key={i}>{attr}</div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                {selectedEntityIds.length} of {scenario.entitiesDiscovery.correctEntityIds.length}{" "}
                entities selected
              </span>

              {!entitiesSubmitted ? (
                <button
                  disabled={selectedEntityIds.length === 0}
                  onClick={handleEntitiesSubmit}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    selectedEntityIds.length > 0
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>Verify Data Model</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <span>Proceed to Step 3: API Design</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: API DESIGN DISCOVERY */}
        {currentStep === 3 && (
          <div className="p-6 sm:p-8 rounded-2xl glass-card border border-white/10 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Step 3 of 4 • API Contract
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {scenario.apiDesignDiscovery.instruction}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Specify clear HTTP methods and RESTful URI patterns for write and read operations.
              </p>
            </div>

            <div className="space-y-3">
              {scenario.apiDesignDiscovery.availableApis.map((api) => {
                const isSelected = selectedApiIds.includes(api.id);
                const isCorrect = scenario.apiDesignDiscovery.correctApiIds.includes(api.id);

                let cardStyle = "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300";
                if (isSelected && !apisSubmitted) {
                  cardStyle = "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-md";
                }
                if (apisSubmitted) {
                  if (isCorrect) {
                    cardStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                  } else if (isSelected && !isCorrect) {
                    cardStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                  } else {
                    cardStyle = "bg-slate-900/40 border-slate-800/40 opacity-40";
                  }
                }

                return (
                  <button
                    key={api.id}
                    disabled={apisSubmitted}
                    onClick={() => toggleApi(api.id)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between gap-4 transition-all ${cardStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded font-mono text-xs font-black uppercase ${
                          api.method === "POST"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}
                      >
                        {api.method}
                      </span>
                      <div>
                        <span className="font-mono text-sm font-bold text-white">{api.path}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{api.description}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-500 text-slate-950"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                {selectedApiIds.length} of {scenario.apiDesignDiscovery.correctApiIds.length} APIs
                selected
              </span>

              {!apisSubmitted ? (
                <button
                  disabled={selectedApiIds.length === 0}
                  onClick={handleApisSubmit}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    selectedApiIds.length > 0
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>Confirm API Specs</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <span>Proceed to Step 4: High-Level Architecture</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: HIGH-LEVEL ARCHITECTURE */}
        {currentStep === 4 && (
          <div className="p-6 sm:p-8 rounded-2xl glass-card border border-white/10 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Step 4 of 4 • Architecture Assembly
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {scenario.architectureDiscovery.instruction}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select the structural components required for a fault-tolerant, horizontally scalable deployment.
              </p>
            </div>

            {/* Component Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { type: "load_balancer", label: "Load Balancer", desc: "Reverse Proxy & TLS" },
                { type: "server", label: "Stateless App Servers", desc: "API compute workers" },
                { type: "cache", label: "Redis RAM Cache", desc: "Sub-millisecond reads" },
                { type: "database", label: "Relational DB", desc: "ACID persistence" },
              ].map((comp) => {
                const Icon = componentIcons[comp.type] || Server;
                const isSelected = selectedComponents.includes(comp.type as any);

                return (
                  <button
                    key={comp.type}
                    disabled={archSubmitted}
                    onClick={() => toggleComponent(comp.type as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="font-bold text-sm text-white">{comp.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{comp.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Architecture Flow Preview */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-3 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Generated Topology Flow
              </span>
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <span className="px-2 py-1 rounded bg-slate-800 text-cyan-300">Users</span>
                <span>→</span>
                <span
                  className={`px-2 py-1 rounded border ${
                    selectedComponents.includes("load_balancer")
                      ? "bg-cyan-950/50 border-cyan-500 text-cyan-300"
                      : "bg-slate-900/60 border-dashed border-slate-700 text-slate-600"
                  }`}
                >
                  Load Balancer
                </span>
                <span>→</span>
                <span
                  className={`px-2 py-1 rounded border ${
                    selectedComponents.includes("server")
                      ? "bg-cyan-950/50 border-cyan-500 text-cyan-300"
                      : "bg-slate-900/60 border-dashed border-slate-700 text-slate-600"
                  }`}
                >
                  App Servers
                </span>
                <span>→</span>
                <span
                  className={`px-2 py-1 rounded border ${
                    selectedComponents.includes("cache")
                      ? "bg-amber-950/50 border-amber-500 text-amber-300"
                      : "bg-slate-900/60 border-dashed border-slate-700 text-slate-600"
                  }`}
                >
                  Redis Cache
                </span>
                <span>+</span>
                <span
                  className={`px-2 py-1 rounded border ${
                    selectedComponents.includes("database")
                      ? "bg-emerald-950/50 border-emerald-500 text-emerald-300"
                      : "bg-slate-900/60 border-dashed border-slate-700 text-slate-600"
                  }`}
                >
                  Database
                </span>
              </div>
            </div>

            {archSubmitted && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed animate-fadeIn">
                <div className="font-bold text-emerald-400 text-sm mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Architecture Approved for Production!</span>
                </div>
                {scenario.architectureDiscovery.explanation}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                {selectedComponents.length} components selected
              </span>

              {!archSubmitted ? (
                <button
                  disabled={selectedComponents.length < 2}
                  onClick={handleArchSubmit}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                    selectedComponents.length >= 2
                      ? "bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>Submit Architecture</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/builder"
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <span>Explore Interactive Builder</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Celebration Modal */}
      <LevelUpModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Guided Quest Mastered! 🧭"
        subtitle={`You successfully navigated from raw requirements to a fully scaled architecture for ${scenario.title}.`}
        xpEarned={scenario.xpReward}
        badgeEarned="Guided Architect"
        nextLabel="Try Evolution Mode"
        onNext={() => {
          setShowCelebration(false);
          window.location.href = "/evolution";
        }}
      />
    </div>
  );
}
