"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Flame,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Scale,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import ConceptIntelDrawer from "@/components/incident/ConceptIntelDrawer";
import TelemetryInspector from "@/components/incident/TelemetryInspector";
import ArchitecturalDefenseModal from "@/components/incident/ArchitecturalDefenseModal";
import { getTradeoffsForPattern } from "@/data/tradeoffScenarios";
import { getMockTelemetryForNode } from "@/data/telemetryData";
import { StatStrip, Stepper, Topology } from "@/components/run/RunVisuals";
import type { Stat } from "@/components/run/RunVisuals";
import { getCanonicalIncident, getIncidentById, graphToTiers } from "@/data/scenarioPacks";
import { getAllPatterns } from "@/data/patterns";
import {
  playAlarmSound,
  playBlipSound,
  playDeploySound,
  playErrorSound,
  playLevelUpSound,
  playSuccessSound,
} from "@/lib/sound";
import {
  completePatternRun,
  getUserStats,
  markFixApplied,
  markTransferMiss,
  nextShuffleSeed,
  recordMissionComplete,
  saveDefenseResult,
  saveUserStats,
} from "@/lib/storage";
import QuestionCard from "@/components/run/QuestionCard";
import ReasoningCard from "@/components/run/ReasoningCard";
import { getPatternReasoningPrompt } from "@/data/reasoningPrompts";
import { deterministicShuffle, hashSeed } from "@/lib/shuffle";
import { applySkin, pickSkin } from "@/lib/incidentSkin";
import { useUserStats } from "@/lib/useUserStats";
import type { CampaignChapter, ComponentKind, IncidentChoice, IncidentGraph, IncidentMetric, IncidentV2, SystemDesignPattern } from "@/types";

interface IncidentWarRoomProps {
  initialIncidentId?: string;
  pattern?: SystemDesignPattern;
  chapter?: CampaignChapter;
  onClose?: () => void;
  onAllClear?: () => void;
  /** Campaign replays: start a fresh incident instead of rolling back this one. */
  onNewRun?: () => void;
  /** Replays only: reskins traffic, region and occasion so the page feels new. */
  skinSeed?: string;
  standalone?: boolean;
}

const ONBOARDING_FLOW_IDS = ["hs-01", "lb-01"];

export default function IncidentWarRoom({
  initialIncidentId = "hs-01",
  pattern,
  chapter,
  onClose,
  onAllClear,
  onNewRun,
  skinSeed,
}: IncidentWarRoomProps) {
  const stats = useUserStats();
  const soundOn = stats?.soundEnabled ?? true;

  // Track the sequence of incidents (defaults to canonical onboarding: hs-01 -> lb-01)
  const [incidentId, setIncidentId] = useState<string>(initialIncidentId);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [solvedIncidents, setSolvedIncidents] = useState<Record<string, number>>({});
  const [isDebrief, setIsDebrief] = useState(false);
  // Campaign runs end with an "Aftershock": the same pattern on a different system (transfer check).
  const [isAftershock, setIsAftershock] = useState(false);
  // Optional "Defend your call" chat after the Aftershock; skippable, pays a bonus.
  const [isDefendingCall, setIsDefendingCall] = useState(false);
  // Honest run evidence: every wrong deploy and hint across the run's incidents counts.
  const [wrongDeploys, setWrongDeploys] = useState(0);
  const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
  const [fixRecorded, setFixRecorded] = useState(false);
  const [cascadePendingId, setCascadePendingId] = useState<string | null>(null);
  const [cascadeCountdown, setCascadeCountdown] = useState<number | null>(null);
  const [survivedCascades, setSurvivedCascades] = useState<string[]>([]);
  // Rendered client-side only (after stats load), so the seed can come from localStorage.
  const [shuffleSeed] = useState(() => nextShuffleSeed(`warroom:${initialIncidentId}`));

  // Synchronize when initialIncidentId prop changes across levels
  const [prevInitialIncidentId, setPrevInitialIncidentId] = useState(initialIncidentId);
  if (prevInitialIncidentId !== initialIncidentId) {
    setPrevInitialIncidentId(initialIncidentId);
    setIncidentId(initialIncidentId);
    setCurrentStep(0);
    setIsDebrief(false);
  }

  // Active incident state
  const baseIncident: IncidentV2 | undefined =
    getIncidentById(incidentId) || getCanonicalIncident(pattern?.levelNumber || 1);
  const skin = useMemo(() => (skinSeed ? pickSkin(skinSeed) : null), [skinSeed]);
  const incident = useMemo(
    () => (baseIncident && skin ? applySkin(baseIncident, skin) : baseIncident),
    [baseIncident, skin]
  );

  const [activeGraph, setActiveGraph] = useState<IncidentGraph | null>(
    incident ? incident.graphBefore : null
  );
  const [activeMetrics, setActiveMetrics] = useState<IncidentMetric[]>(
    incident ? incident.metricsBefore : []
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [hintsRevealed, setHintsRevealed] = useState<number>(0);
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);
  const [inspectedRole, setInspectedRole] = useState<ComponentKind | null>(null);

  // SRE Architectural Defense Gate state (Pillars 2 & 3)
  const [defenseModalOpen, setDefenseModalOpen] = useState(false);
  const [defenseVerified, setDefenseVerified] = useState(false);
  const [pendingSuccessChoice, setPendingSuccessChoice] = useState<IncidentChoice | null>(null);
  const tradeoffSet = pattern ? getTradeoffsForPattern(pattern.id) : undefined;
  const activeDefenseOption = tradeoffSet?.options.find((o) => o.id === tradeoffSet.recommendedOptionId) || tradeoffSet?.options[0];

  // Synchronize graph and metrics during render when incidentId changes
  const [prevIncidentId, setPrevIncidentId] = useState(incidentId);
  if (prevIncidentId !== incidentId) {
    setPrevIncidentId(incidentId);
    if (incident) {
      setActiveGraph(incident.graphBefore);
      setActiveMetrics(incident.metricsBefore);
    }
    setSelectedChoiceId(null);
    setIsSubmitted(false);
    setHintsRevealed(0);
    setCascadePendingId(null);
    setCascadeCountdown(null);
  }

  // Play alarm sound on mount or when incidentId changes
  useEffect(() => {
    playAlarmSound();
  }, [incidentId]);

  // Second-order cascade trigger handler
  const triggerCascade = React.useCallback((targetId: string) => {
    if (incident) {
      setSurvivedCascades((prev) => [...prev, incident.id]);
    }
    setIncidentId(targetId);
    setCascadePendingId(null);
    setCascadeCountdown(null);
    playAlarmSound();
  }, [incident]);

  // Fast-forward countdown timer into second-order outage
  useEffect(() => {
    if (!cascadePendingId || cascadeCountdown === null) return;
    if (cascadeCountdown <= 0) {
      const timeout = setTimeout(() => {
        triggerCascade(cascadePendingId);
      }, 0);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => {
      setCascadeCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cascadePendingId, cascadeCountdown, triggerCascade]);

  const orderedChoices = incident ? deterministicShuffle(incident.choices, `${shuffleSeed}|${incident.id}`) : [];
  const selectedChoice: IncidentChoice | undefined = incident?.choices.find(
    (c) => c.id === selectedChoiceId
  );
  const isSolved = isSubmitted && selectedChoice?.correct === true;
  const isWrong = isSubmitted && selectedChoice?.correct === false;

  // Toggle sound
  const toggleSound = () => {
    const current = getUserStats();
    saveUserStats({ ...current, soundEnabled: !current.soundEnabled });
  };

  const executeDeploySuccess = (choice: IncidentChoice) => {
    // SUCCESS PHYSICS: Mutate topology & metrics to stabilized architecture
    if (choice.graphAfter) {
      setActiveGraph(choice.graphAfter);
    }
    if (choice.metricsAfter && incident) {
      setActiveMetrics(applyMetricUpdates(incident.metricsBefore, choice.metricsAfter));
    }
    playDeploySound();
    setTimeout(() => playSuccessSound(), 200);

    // Check if this choice triggers a second-order cascade outage!
    if (choice.cascadeIncidentId) {
      setCascadePendingId(choice.cascadeIncidentId);
      setCascadeCountdown(choice.cascadeDelayMs ? Math.round(choice.cascadeDelayMs / 1000) : 5);
    }

    // Record XP reward for this incident
    if (incident && !(incident.id in solvedIncidents)) {
      const outcome = recordMissionComplete(incident.id, incident.xp);
      setSolvedIncidents((prev) => ({ ...prev, [incident.id]: outcome.xpAwarded }));
    }

    if (pattern && !fixRecorded) {
      markFixApplied(pattern.id);
      setFixRecorded(true);
    }
  };

  const handleDefenseSuccess = (firstTry: boolean) => {
    saveDefenseResult(firstTry);
    setDefenseVerified(true);
    setDefenseModalOpen(false);
    if (pendingSuccessChoice) {
      executeDeploySuccess(pendingSuccessChoice);
    }
  };

  // Choice selection & simulation physics
  const handleDeployChoice = (choice: IncidentChoice) => {
    if (isSubmitted && selectedChoice?.correct) return; // already solved

    setSelectedChoiceId(choice.id);
    setIsSubmitted(true);

    if (choice.correct) {
      // If an architectural tradeoff scenario exists and defense not yet verified, open defense modal
      if (tradeoffSet && !defenseVerified) {
        setPendingSuccessChoice(choice);
        setDefenseModalOpen(true);
        return;
      }
      executeDeploySuccess(choice);
    } else {
      setWrongDeploys((n) => n + 1);
      // WRONG ANSWER PHYSICS: Physically impact the live system!
      if (choice.graphAfter) {
        setActiveGraph(choice.graphAfter);
      } else if (incident) {
        // Fallback: make overloaded nodes pulse hotter
        setActiveGraph({
          ...incident.graphBefore,
          nodes: incident.graphBefore.nodes.map((n) =>
            n.tone === "bad" ? { ...n, tone: "bad", cpu: Math.min(100, (n.cpu || 90) + 5) } : n
          ),
        });
      }
      if (choice.metricsAfter && incident) {
        setActiveMetrics(applyMetricUpdates(incident.metricsBefore, choice.metricsAfter));
      }
      playErrorSound();
    }
  };

  // Roll back failed deployment and retry
  const handleRollback = () => {
    if (!incident) return;
    playBlipSound();
    setActiveGraph(incident.graphBefore);
    setActiveMetrics(incident.metricsBefore);
    setSelectedChoiceId(null);
    setIsSubmitted(false);
    setIsDebrief(false);
    setCascadePendingId(null);
    setCascadeCountdown(null);
    setCurrentStep(0);
    setDefenseVerified(false);
    setDefenseModalOpen(false);
    setPendingSuccessChoice(null);
  };

  // Alternates "why this" and "10x" prompts across runs.
  const reasoningPrompt = pattern ? getPatternReasoningPrompt(pattern.id, hashSeed(shuffleSeed)) : undefined;

  // Aftershock answered: record the run with what actually happened, then debrief.
  const finishCampaignRun = (transferFirstTry: boolean) => {
    if (!pattern) return;
    const firstTryFix = wrongDeploys === 0;
    completePatternRun(pattern, {
      patternId: pattern.id,
      diagnosisFirstTry: firstTryFix,
      interventionFirstTry: firstTryFix,
      transferFirstTry,
      hintsUsed: hintsUsedTotal,
      failureReasons: [...(firstTryFix ? [] : ["intervention"]), ...(transferFirstTry ? [] : ["transfer"])],
    });
    setIsAftershock(false);
    if (reasoningPrompt) {
      setIsDefendingCall(true);
      playBlipSound();
      return;
    }
    openDebrief();
  };

  const openDebrief = () => {
    setIsDefendingCall(false);
    setIsDebrief(true);
    setCurrentStep(2);
    playLevelUpSound();
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#38d6e8", "#34d399", "#fbbf24"],
      });
    } catch {}
    onAllClear?.();
  };

  // Advance to next incident or debrief
  const handleNextIncident = () => {
    playBlipSound();

    if (cascadePendingId) {
      triggerCascade(cascadePendingId);
      return;
    }

    if (pattern) {
      // In campaign mode, a different system pages you before the level clears.
      setIsAftershock(true);
      setCurrentStep(1);
      playAlarmSound();
      return;
    }

    // Onboarding flow: only traverse within ONBOARDING_FLOW_IDS
    if (selectedChoice?.nextId) {
      setIncidentId(selectedChoice.nextId);
      setCurrentStep((s) => s + 1);
    } else if (incident?.nextId && currentStep < ONBOARDING_FLOW_IDS.length - 1) {
      setIncidentId(incident.nextId);
      setCurrentStep((s) => s + 1);
    } else {
      // Debrief reached
      setIsDebrief(true);
      setCurrentStep(stepsList.length - 1);
      playLevelUpSound();
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#38d6e8", "#34d399", "#fbbf24"],
        });
      } catch {}
      onAllClear?.();
    }
  };

  if (!incident) {
    return (
      <div className="surface p-8 text-center text-slate-400">
        Incident not found.
      </div>
    );
  }

  // Convert active graph into live tiers for visualizer
  const tiers = activeGraph ? graphToTiers(activeGraph) : [];

  // Map active metrics to StatStrip display with animated deltas
  const statStripData: Stat[] = activeMetrics.map((m) => {
    const beforeMetric = incident.metricsBefore.find((b) => b.key === m.key);
    let sub: string | undefined;

    if (isSubmitted && beforeMetric && beforeMetric.value !== m.value) {
      const delta = m.value - beforeMetric.value;
      const sign = delta > 0 ? "+" : "";
      const unitStr = m.unit ? (m.unit.startsWith("%") ? m.unit : ` ${m.unit}`) : "";
      if (m.key === "cpu" || m.key === "errors" || m.key === "p95") {
        sub = delta < 0 ? `was ${beforeMetric.value.toLocaleString()}${unitStr}` : `${sign}${delta.toLocaleString()}${unitStr}`;
      } else {
        sub = `was ${beforeMetric.value.toLocaleString()}${unitStr}`;
      }
    }

    return {
      label: m.label || m.key.toUpperCase(),
      value: m.value.toLocaleString(),
      unit: m.unit,
      tone: m.tone === "bad" ? "bad" : m.tone === "good" ? "ok" : m.tone === "warn" ? "warn" : "neutral",
      sub,
    };
  });

  const stepsList = pattern
    ? [
        { id: incident.id, label: incident.incidentCode ? `${incident.incidentCode} · Incident` : "Incident 01" },
        { id: "aftershock", label: "Aftershock" },
        { id: "debrief", label: "Level Cleared" },
      ]
    : ONBOARDING_FLOW_IDS.map((id, idx) => ({
        id,
        label: `Incident 0${idx + 1}`,
      })).concat([{ id: "debrief", label: "Debrief" }]);

  const totalXp = Object.values(solvedIncidents).reduce((a, b) => a + b, 0);

  return (
    <article
      className={`surface overflow-hidden w-full h-full max-h-full flex flex-col text-left transition-[border-color,box-shadow] duration-700 rounded-xl ${
        isWrong
          ? "!border-rose-500/40 shadow-[0_30px_90px_-30px_rgba(244,63,94,0.45)]"
          : isSolved
          ? "!border-emerald-400/30 shadow-[0_30px_90px_-30px_rgba(52,211,153,0.3)]"
          : "!border-rose-400/25 shadow-[0_30px_80px_-30px_rgba(251,113,133,0.35)]"
      }`}
      aria-label="Interactive Incident War Room"
    >
      {/* Pager Header */}
      <header
        className={`flex items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b border-[var(--line)] shrink-0 transition-colors duration-500 ${
          isWrong
            ? "bg-rose-500/[0.08]"
            : isSolved
            ? "bg-emerald-400/[0.04]"
            : "bg-rose-400/[0.04]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isDebrief ? (
            <span className="chip chip-ok">
              <Check className="w-3 h-3" aria-hidden /> All clear
            </span>
          ) : isAftershock ? (
            <span className="chip chip-warn animate-pulse">
              <Zap className="w-3 h-3" aria-hidden /> Aftershock
            </span>
          ) : isDefendingCall ? (
            <span className="chip chip-accent">
              <Sparkles className="w-3 h-3" aria-hidden /> Defend your call
            </span>
          ) : isWrong ? (
            <span className="chip chip-bad animate-pulse">
              <AlertTriangle className="w-3 h-3" aria-hidden /> Failed attempt
            </span>
          ) : isSolved ? (
            <span className="chip chip-ok">
              <Check className="w-3 h-3" aria-hidden /> Mitigated
            </span>
          ) : (
            <span className="chip chip-bad">
              <span className="dot animate-pulse-glow" aria-hidden /> {incident.severity} · Live outage
            </span>
          )}
          <span className="num text-[11px] text-slate-400 truncate">
            {incident.incidentCode} · Level {incident.level} ({incident.patternId})
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="btn btn-ghost !p-1.5"
            aria-label={soundOn ? "Mute sound effects" : "Turn sound effects on"}
            title={soundOn ? "Mute" : "Sound on"}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-ghost !py-1.5 text-xs">
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col justify-between overflow-hidden gap-2 sm:gap-3">
        {/* Step tracker */}
        <div className="shrink-0">
          <Stepper steps={stepsList} current={isDebrief ? stepsList.length - 1 : currentStep} label="Progress" />
        </div>

        {isDefendingCall && reasoningPrompt ? (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-2">
            <ReasoningCard prompt={reasoningPrompt} onDone={openDebrief} />
          </div>
        ) : isAftershock && pattern ? (
          <AftershockPanel
            pattern={pattern}
            shuffleSeed={shuffleSeed}
            onMiss={() => markTransferMiss(pattern.id)}
            onResolved={finishCampaignRun}
          />
        ) : !isDebrief ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 sm:gap-4 flex-1 min-h-0 items-stretch overflow-hidden animate-fadeIn">
            {/* Left: What the system is physically doing */}
            <section className="flex flex-col min-h-0 gap-3 overflow-y-auto pr-1 pb-3" aria-label="Live System State">
              <div className="space-y-0.5 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="eyebrow text-cyan-300 !text-[11px]">
                    {incident.isCascade ? "⚡ Cascade Outage" : "Live Incident"}
                  </span>
                  <span className="chip !text-[11px] !py-0 !px-1.5">{incident.constraint}</span>
                  {skin && (
                    <span className="chip chip-accent !text-[11px] !py-0 !px-1.5">
                      {skin.region} · {skin.occasion}
                    </span>
                  )}
                  {incident.isCascade && (
                    <span className="chip chip-warn !text-[11px] !py-0 !px-1.5">
                      <Flame className="w-2.5 h-2.5 text-amber-400 mr-1 inline" /> Second-Order Consequence
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl display font-bold leading-tight">{incident.title}</h2>
                <p className="text-[12px] sm:text-[13px] text-slate-300 leading-snug line-clamp-2">{incident.brief}</p>
              </div>

              {/* Dynamic metrics strip */}
              <div className="shrink-0">
                <StatStrip stats={statStripData} />
              </div>

              {/* Architectural Tradeoff Ledger (When deployed choice has tradeoffs) */}
              {isSubmitted && selectedChoice?.tradeoffs && (
                <div className="surface p-4 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.03] space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-cyan-300 flex items-center gap-1.5 !text-[11px]">
                      <Scale className="w-3.5 h-3.5" /> Architectural Tradeoff Ledger
                    </span>
                    {selectedChoice.approach && (
                      <span
                        className={`chip !py-0 !text-[11px] ${
                          selectedChoice.approach === "optimal"
                            ? "chip-ok"
                            : selectedChoice.approach === "viable_with_tradeoffs"
                            ? "chip-warn"
                            : "chip-bad"
                        }`}
                      >
                        {selectedChoice.approach === "optimal"
                          ? "Optimal Pattern"
                          : selectedChoice.approach === "viable_with_tradeoffs"
                          ? "Viable with Tradeoffs"
                          : "Anti-Pattern"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
                      <span className="text-slate-400 block text-[11px] uppercase font-mono">Monthly Cost</span>
                      <span
                        className={`num font-semibold text-sm ${
                          (selectedChoice.tradeoffs.costMonthlyDelta ?? 0) > 0 ? "text-amber-300" : "text-emerald-400"
                        }`}
                      >
                        {(selectedChoice.tradeoffs.costMonthlyDelta ?? 0) > 0
                          ? `+$${selectedChoice.tradeoffs.costMonthlyDelta}/mo`
                          : "$0/mo"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
                      <span className="text-slate-400 block text-[11px] uppercase font-mono">p99 Latency</span>
                      <span className="num font-semibold text-sm text-cyan-300">
                        {selectedChoice.tradeoffs.latencyP99DeltaMs ? `${selectedChoice.tradeoffs.latencyP99DeltaMs}ms` : "Neutral"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
                      <span className="text-slate-400 block text-[11px] uppercase font-mono">Consistency</span>
                      <span className="num font-semibold text-sm capitalize text-slate-200">
                        {selectedChoice.tradeoffs.consistencyGuarantee ?? "Eventual"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
                      <span className="text-slate-400 block text-[11px] uppercase font-mono">Complexity</span>
                      <span className="num font-semibold text-sm text-slate-200">
                        Tier {selectedChoice.tradeoffs.complexityScore ?? 2} / 5
                      </span>
                    </div>
                  </div>

                  {selectedChoice.tradeoffs.tradeoffSummary && (
                    <p className="text-xs text-slate-300 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/[0.03]">
                      <span className="font-semibold text-cyan-300/90 font-mono">Tradeoff Analysis: </span>
                      {selectedChoice.tradeoffs.tradeoffSummary}
                    </p>
                  )}
                </div>
              )}

              {/* Live topology simulation */}
              <div className="shrink-0">
                <Topology
                  tiers={tiers}
                  caption={
                    <>
                      <span className="eyebrow !text-[11px]">Topology Simulation</span>
                      {isSolved ? (
                        <span className="chip chip-ok !py-0 !text-[11px]">
                          <span className="dot" aria-hidden /> Balanced & Stable
                        </span>
                      ) : isWrong ? (
                        <span className="chip chip-bad !py-0 !text-[11px]">
                          <span className="dot animate-pulse-glow" aria-hidden /> Degradation
                        </span>
                      ) : (
                        <span className="chip chip-bad !py-0 !text-[11px]">
                          <span className="dot animate-pulse-glow" aria-hidden /> Bottleneck
                        </span>
                      )}
                    </>
                  }
                />
              </div>

              {/* Digital Detective Telemetry Shortcuts */}
              <div className="shrink-0 flex flex-wrap items-center gap-1.5 pt-1 pb-1">
                <span className="text-[11px] text-slate-400 font-mono">Inspect Logs:</span>
                <button
                  type="button"
                  onClick={() => setInspectedRole("server")}
                  className="btn btn-ghost !py-0.5 !px-2 !text-[11px] border border-white/10 hover:border-cyan-400 text-cyan-300 cursor-pointer"
                >
                  🖥️ App Server Logs
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedRole("db")}
                  className="btn btn-ghost !py-0.5 !px-2 !text-[11px] border border-white/10 hover:border-purple-400 text-purple-300 cursor-pointer"
                >
                  🗄️ PostgreSQL Slow Queries
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedRole("cache")}
                  className="btn btn-ghost !py-0.5 !px-2 !text-[11px] border border-white/10 hover:border-amber-400 text-amber-300 cursor-pointer"
                >
                  ⚡ Redis Cache Vitals
                </button>
              </div>
            </section>

            {/* Right: Tactical Command (The Choice) */}
            <section
              className="lg:border-l lg:border-[var(--line)] lg:pl-4 flex flex-col justify-between min-h-0 space-y-2 overflow-y-auto pr-1 pb-2"
              aria-label="Tactical Command"
            >
              <div className="space-y-0.5 shrink-0">
                <span className="eyebrow text-cyan-300/90 !text-[11px]">Your Move</span>
                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">{incident.question}</h3>
              </div>

              {/* 3 Short Choice Cards */}
              <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
                {orderedChoices.map((choice) => {
                  const isSelected = selectedChoiceId === choice.id;
                  let stateClass = "border-[var(--line)] bg-[var(--surface-2)] text-slate-200 hover:border-slate-500 hover:bg-white/[0.04]";

                  if (isSelected && isSubmitted) {
                    stateClass = choice.correct
                      ? "border-emerald-400/80 bg-emerald-400/10 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                      : "border-rose-400/80 bg-rose-400/10 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]";
                  }

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isSolved}
                      onClick={() => handleDeployChoice(choice)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all duration-300 flex flex-col gap-1 group cursor-pointer ${stateClass}`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-5 h-5 rounded-full border grid place-items-center text-[11px] font-mono shrink-0 mt-0.5 ${
                              isSelected && isSubmitted
                                ? choice.correct
                                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                                  : "border-rose-400 bg-rose-400/20 text-rose-300"
                                : "border-[var(--line)] text-slate-400 group-hover:border-slate-400"
                            }`}
                          >
                            {isSelected && isSubmitted ? (
                              choice.correct ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />
                            ) : (
                              "▶"
                            )}
                          </span>
                          <span className="text-xs sm:text-sm font-medium leading-snug break-words">{choice.label}</span>
                        </div>

                        <span className="text-[11px] text-slate-500 group-hover:text-cyan-300 transition-colors shrink-0 mt-0.5">
                          Deploy
                        </span>
                      </div>

                      {/* Tradeoff Vector & Approach Micro-badges */}
                      {(choice.approach || choice.tradeoffs) && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-7 text-[11px]">
                          {choice.approach && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                                choice.approach === "optimal"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : choice.approach === "viable_with_tradeoffs"
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {choice.approach === "optimal"
                                ? "Optimal"
                                : choice.approach === "viable_with_tradeoffs"
                                ? "Viable"
                                : "Anti-Pattern"}
                            </span>
                          )}
                          {choice.tradeoffs?.costMonthlyDelta !== undefined && (
                            <span className="text-slate-400 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/[0.04]">
                              {choice.tradeoffs.costMonthlyDelta > 0
                                ? `+$${choice.tradeoffs.costMonthlyDelta}/mo`
                                : "$0/mo"}
                            </span>
                          )}
                          {choice.tradeoffs?.consistencyGuarantee && (
                            <span className="text-slate-400 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/[0.04] capitalize">
                              {choice.tradeoffs.consistencyGuarantee}
                            </span>
                          )}
                          {choice.cascadeIncidentId && (
                            <span className="text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Cascade Risk
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hints & Concept Intel toggle */}
              <div className="shrink-0 pt-0.5 flex flex-wrap items-center gap-2.5">
                {incident.hints && incident.hints.length > 0 && !isSolved && (
                  hintsRevealed < incident.hints.length ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHintsRevealed((n) => n + 1);
                        setHintsUsedTotal((n) => n + 1);
                      }}
                      className="text-xs text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Hint ({hintsRevealed + 1}/{incident.hints.length})
                    </button>
                  ) : null
                )}

                <button
                  type="button"
                  onClick={() => setSelectedIntelId(incident.patternId || pattern?.id || "caching")}
                  className="text-xs text-amber-300/90 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  30s ELI5 Concept Intel
                </button>
              </div>

              {hintsRevealed > 0 && incident.hints && (
                <div className="shrink-0 p-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] space-y-0.5 animate-fadeIn">
                  {incident.hints.slice(0, hintsRevealed).map((h, i) => (
                    <p key={i} className="text-[11px] text-cyan-200/90 leading-tight">
                      • {h}
                    </p>
                  ))}
                </div>
              )}

              {/* Post-Mortem HUD (Consequences of Action) */}
              {isSubmitted && selectedChoice && (
                <div
                  className={`shrink-0 p-2.5 sm:p-3 rounded-xl border space-y-2 animate-fadeIn ${
                    isSolved
                      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
                      : "border-rose-400/30 bg-rose-400/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                        isSolved ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {isSolved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          {selectedChoice.resultTitle || "Incident Solved"}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          {selectedChoice.resultTitle || "Still On Fire"}
                        </>
                      )}
                    </span>
                    {isSolved && (
                      <span className="num text-xs text-amber-300 font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> +{incident.xp} XP
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {selectedChoice.resultBody}
                  </p>

                  {/* Actions */}
                  {cascadePendingId ? (
                    <div className="space-y-1.5">
                      <div className="p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-center justify-between text-xs text-amber-200 animate-pulse">
                        <span className="flex items-center gap-1.5 font-medium text-[11px]">
                          <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          Cascade in {cascadeCountdown}s...
                        </span>
                        <span className="font-mono text-[11px] text-amber-300/80">
                          {cascadePendingId}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => triggerCascade(cascadePendingId)}
                          className="btn btn-primary btn-sm flex-1 justify-center bg-gradient-to-r from-amber-600 to-rose-600 border-amber-500 hover:brightness-110 group cursor-pointer text-xs"
                        >
                          <Flame className="w-3.5 h-3.5 mr-1 text-amber-200" />
                          Trigger Cascade Now ⏩
                        </button>
                        <button
                          type="button"
                          onClick={handleRollback}
                          className="btn btn-secondary btn-sm text-slate-300 border-slate-700 hover:bg-slate-800 cursor-pointer"
                          title="Roll back deployment"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : isSolved ? (
                    <button
                      type="button"
                      onClick={handleNextIncident}
                      className="btn btn-primary btn-sm w-full justify-center group text-xs !py-1.5"
                    >
                      {pattern ? "View debrief & complete level" : "Deploy next fix"}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ml-1" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRollback}
                      className="btn btn-secondary btn-sm w-full justify-center text-rose-200 border-rose-400/30 hover:bg-rose-400/10 cursor-pointer text-xs !py-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Roll back deployment & retry
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* ================= DEBRIEF SCREEN ================= */
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {pattern ? (
              <CampaignDebriefScreen
                pattern={pattern}
                chapter={chapter}
                incident={incident}
                selectedChoice={selectedChoice}
                totalXp={totalXp || incident.xp}
                survivedCascades={survivedCascades}
                onReplay={onNewRun ?? handleRollback}
                replayLabel={onNewRun ? "Next incident" : "Replay Incident"}
              />
            ) : (
              <DebriefScreen totalXp={totalXp} />
            )}
          </div>
        )}
      </div>

      <ConceptIntelDrawer intelId={selectedIntelId} onClose={() => setSelectedIntelId(null)} />

      {inspectedRole && (
        <TelemetryInspector
          telemetry={telemetryForIncident(inspectedRole, activeGraph, activeMetrics)}
          onClose={() => setInspectedRole(null)}
        />
      )}

      {defenseModalOpen && activeDefenseOption && (
        <ArchitecturalDefenseModal
          isOpen={defenseModalOpen}
          option={activeDefenseOption}
          onSuccess={handleDefenseSuccess}
          onClose={() => {
            // Backing out of the defense cancels the deploy; the fix only lands once defended.
            setDefenseModalOpen(false);
            setPendingSuccessChoice(null);
            setSelectedChoiceId(null);
            setIsSubmitted(false);
          }}
        />
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Helper: Merge metric deltas into baseline metrics
// ---------------------------------------------------------------------------

function applyMetricUpdates(
  baseline: IncidentMetric[],
  updates?: IncidentMetric[]
): IncidentMetric[] {
  if (!updates || updates.length === 0) return baseline;
  const updateMap = new Map(updates.map((u) => [u.key, u]));
  return baseline.map((b) => {
    const updated = updateMap.get(b.key);
    return updated ? { ...b, ...updated } : b;
  });
}

// ---------------------------------------------------------------------------
// Campaign Debrief Screen: Level Cleared & Next Level Navigation
// ---------------------------------------------------------------------------

/** Transfer check framed as a second page: same pattern, different product. */
function AftershockPanel({
  pattern,
  shuffleSeed,
  onMiss,
  onResolved,
}: {
  pattern: SystemDesignPattern;
  shuffleSeed: string;
  onMiss: () => void;
  onResolved: (firstTry: boolean) => void;
}) {
  const [firstTry, setFirstTry] = useState<boolean | null>(null);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1 animate-fadeIn">
      <div className="max-w-2xl mx-auto space-y-4 py-2">
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-3 flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-100">Aftershock: a different team is paging you</p>
            <p className="text-xs text-slate-300">
              Your fix held. Now a different system hits the same kind of wall. Get it on the first try to earn the
              &ldquo;transfer&rdquo; evidence for this pattern.
            </p>
          </div>
        </div>
        <QuestionCard
          eyebrow="⚡ Aftershock · Same pattern, different product"
          question={pattern.transfer}
          shuffleSeed={shuffleSeed}
          submitLabel="Deploy answer"
          continueLabel="Close the incident"
          onAnswer={(option, attempt) => {
            if (attempt === 1) setFirstTry(option.isCorrect);
            if (!option.isCorrect) onMiss();
          }}
          onContinue={() => onResolved(firstTry === true)}
        />
      </div>
    </div>
  );
}

/**
 * Telemetry for the inspected node, seeded from the incident's own graph and
 * metrics so the numbers match what the player sees. Knobs are omitted: in the
 * War Room the fix is deployed from the choice cards, not from sliders.
 */
function telemetryForIncident(role: ComponentKind, graph: IncidentGraph | null, metrics: IncidentMetric[]) {
  const node = graph?.nodes.find((n) => n.kind === role);
  const metric = (key: string) => metrics.find((m) => m.key === key)?.value;
  const overloaded = node ? node.tone === "bad" || (node.cpu ?? 0) > 85 : false;
  const p95 = metric("p95");
  const errors = metric("errors");
  return getMockTelemetryForNode(node?.id ?? `node-${role}`, role, overloaded, {
    ...(node?.label ? { nodeName: node.label } : {}),
    ...(typeof node?.cpu === "number" ? { cpuUsage: node.cpu } : {}),
    ...(p95 !== undefined ? { p99LatencyMs: p95 } : {}),
    ...(errors !== undefined ? { errorRate: errors } : {}),
    knobs: [],
  });
}

function CampaignDebriefScreen({
  pattern,
  incident,
  selectedChoice,
  totalXp,
  survivedCascades,
  onReplay,
  replayLabel,
}: {
  pattern: SystemDesignPattern;
  chapter?: CampaignChapter;
  incident: IncidentV2;
  selectedChoice?: IncidentChoice;
  totalXp: number;
  survivedCascades?: string[];
  onReplay: () => void;
  replayLabel: string;
}) {
  const nextPattern = getAllPatterns().find((p) => p.levelNumber === pattern.levelNumber + 1);

  return (
    <div className="space-y-6 animate-fadeIn py-2">
      <div className="space-y-2 max-w-2xl">
        <span className="eyebrow text-emerald-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Level {pattern.levelNumber} Stabilized & Cleared
        </span>
        <h2 className="text-3xl sm:text-4xl display">{pattern.levelGoal}</h2>
        <p className="text-[15px] text-slate-300 leading-relaxed">
          {selectedChoice?.resultBody || `You resolved the bottleneck for ${pattern.title} under live outage conditions.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Architecture accomplishments */}
        <section className="surface !rounded-xl overflow-hidden" aria-label="Architecture Upgrades">
          <header className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2">
            <span className="eyebrow">Stabilized Component</span>
            <span className="num text-xs text-amber-200/90">+{totalXp || incident.xp} XP</span>
          </header>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full grid place-items-center shrink-0 border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                <Check className="w-4 h-4" />
              </span>
              <div className="space-y-1">
                <p className="text-[14px] text-slate-200 font-medium">
                  Level {pattern.levelNumber}: {pattern.title}
                </p>
                <p className="text-xs text-slate-400">
                  <span className="text-slate-300 font-mono">Incident:</span> {incident.incidentCode} · {incident.title}
                </p>
                <p className="text-xs text-emerald-300/90">
                  <span className="text-slate-400">Fix deployed:</span> {selectedChoice?.label || "Stateless scaling"}
                </p>
              </div>
            </div>

            {survivedCascades && survivedCascades.length > 0 && (
              <div className="p-3.5 rounded-lg border border-purple-500/40 bg-purple-500/10 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 grid place-items-center shrink-0">
                    <Scale className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-purple-200">
                    Staff Engineering Defense: Second-Order Cascades Survived
                  </span>
                  <span className="ml-auto text-[11px] font-mono text-purple-300/80 bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500/30">
                    +{survivedCascades.length * 150} Bonus XP
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 leading-relaxed pl-8">
                  You successfully navigated multi-attribute trade-offs and arrested downstream cascade failure{" "}
                  <code className="text-purple-300 font-mono">({survivedCascades.join(", ")})</code> triggered by initial mitigation.
                </p>
              </div>
            )}

            {pattern.nextHook && (
              <p className="text-xs text-amber-200/80 pt-2 border-t border-[var(--line)]">
                {pattern.nextHook}
              </p>
            )}
          </div>
        </section>

        {/* Practice and Progression */}
        <section className="surface !rounded-xl p-5 space-y-4" aria-label="Next Actions">
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold text-white">Mastery Verified</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Progress saved. You can advance directly to the next level or stress-test your design in the architecture sandbox.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onReplay}
              className="btn btn-secondary text-xs flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {replayLabel}
            </button>
            <Link
              href={`/builder?scenario=${pattern.builderScenarioId}`}
              className="btn btn-ghost border border-[var(--line)] text-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" /> Test in Architecture Sandbox
            </Link>
          </div>
        </section>
      </div>

      {/* Campaign Navigation CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        {nextPattern ? (
          <Link
            href={`/campaign/${nextPattern.chapterId}?mode=incident`}
            className="btn btn-primary btn-lg group"
          >
            Proceed to Level {nextPattern.levelNumber}: {nextPattern.title}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link href="/campaign" className="btn btn-primary btn-lg">
            All Levels Completed! Explore Map
          </Link>
        )}
        <Link href={`/campaign/${pattern.chapterId}`} className="btn btn-ghost">
          Guided Mode
        </Link>
        <Link href="/campaign" className="btn btn-ghost">
          Return to Level Map
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Debrief Screen: Campaign Map Unlocked!
// ---------------------------------------------------------------------------

function DebriefScreen({ totalXp }: { totalXp: number }) {
  return (
    <div className="space-y-6 animate-fadeIn py-2">
      <div className="space-y-2 max-w-2xl">
        <span className="eyebrow text-emerald-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Campaign Map Unlocked
        </span>
        <h2 className="text-3xl sm:text-4xl display">Production is stabilized.</h2>
        <p className="text-[15px] text-slate-300 leading-relaxed">
          You diagnosed and resolved two chained production outages. First you scaled stateless app servers; then you added a load balancer to balance incoming traffic.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Architecture accomplishments */}
        <section className="surface !rounded-xl overflow-hidden" aria-label="Architecture Upgrades">
          <header className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2">
            <span className="eyebrow">Stabilized Components</span>
            <span className="num text-xs text-amber-200/90">+{totalXp} XP</span>
          </header>
          <ol className="divide-y divide-[var(--line)]">
            <li className="px-5 py-3.5 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-[13px] text-slate-200 font-medium">Horizontal Scaling (Level 01)</p>
                <p className="text-xs text-slate-400">1 server → 3 identical stateless servers. Single-point-of-failure eliminated.</p>
              </div>
            </li>
            <li className="px-5 py-3.5 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-[13px] text-slate-200 font-medium">Load Balancing (Level 02)</p>
                <p className="text-xs text-slate-400">Reverse proxy distributor deployed. Request load split evenly across compute instances.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* Progress saving */}
        <section className="surface !rounded-xl p-5 space-y-4" aria-label="Keep Progress">
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold text-white">Your badge & streak are saved</h3>
            <p role="status" className="flex items-start gap-2 text-[13px] text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
              XP and unlocked levels are kept in this browser. No sign-up needed.
            </p>
          </div>
        </section>
      </div>

      {/* Campaign Map CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <Link href="/campaign" className="btn btn-primary btn-lg">
          Explore the Level Map
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/dashboard" className="btn btn-ghost">
          View Mastered Patterns
        </Link>
      </div>
    </div>
  );
}
