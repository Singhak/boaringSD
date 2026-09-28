"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
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
import { getCanonicalIncident, getIncidentById, getScenarioPackByPatternId, graphToTiers } from "@/data/scenarioPacks";
import { getPlayableIncidents } from "@/data/incidentQuality";
import { getAllPatterns, getRotatingTransferQuestion } from "@/data/patterns";
import {
  playAlarmSound,
  playBlipSound,
  playComboBreakSound,
  playComboSound,
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
  readCombo,
  recordMissionComplete,
  saveCombo,
  saveDefenseResult,
  saveUserStats,
} from "@/lib/storage";
import QuestionCard from "@/components/run/QuestionCard";
import ReasoningCard from "@/components/run/ReasoningCard";
import { getPatternReasoningPrompt } from "@/data/reasoningPrompts";
import { deterministicShuffle, hashSeed } from "@/lib/shuffle";
import { applySkin, pickSkin } from "@/lib/incidentSkin";
import { useUserStats } from "@/lib/useUserStats";
import { approachRating } from "@/lib/choiceChips";
import {
  addCreditBudget,
  applyBandAid,
  applyRollback,
  applyWrongDeploy,
  applyWrongFlag,
  breachPostMortem,
  choiceCost,
  comboMultiplier,
  creditBudgetFor,
  logTicket,
  overBudget,
  runStars,
  spend,
  startEconomy,
  tickReading,
  type RunEconomy,
} from "@/lib/runEconomy";
import { applyGraphPatch } from "@/lib/graphPatch";
import { knobMetrics, knobZone } from "@/lib/knob";
import { formatOf } from "@/lib/incidentFormat";
import RunHud from "@/components/incident/RunHud";
import BreachScreen from "@/components/incident/BreachScreen";
import ChoiceCards from "@/components/incident/ChoiceCards";
import CulpritPanel, { CulpritFound } from "@/components/incident/CulpritPanel";
import KnobPanel from "@/components/incident/KnobPanel";
import { buildDebriefSummary } from "@/lib/debriefSummary";
import type { DebriefSummary } from "@/lib/debriefSummary";
import { pickDefenseOption } from "@/lib/defenseQuestions";
import { resolveConceptIntelId } from "@/data/conceptIntel";
import type { CampaignChapter, IncidentChoice, IncidentGraph, IncidentMetric, IncidentNode, IncidentV2, SystemDesignPattern, TelemetryLogEntry } from "@/types";

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

type Stage = "culprit" | "mitigate" | "fix";

function initialStage(incident: IncidentV2 | undefined): Stage {
  const format = incident ? formatOf(incident) : "pick";
  if (format === "culprit" && incident?.culprit) return "culprit";
  if (format === "two-step" && incident?.mitigation) return "mitigate";
  return "fix";
}

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
  const [runXp, setRunXp] = useState(0);
  const [transferPassed, setTransferPassed] = useState(false);
  // A fix that creates a new, smaller problem: the player chooses to handle it now or log a ticket.
  const [cascadePendingId, setCascadePendingId] = useState<string | null>(null);
  const [survivedCascades, setSurvivedCascades] = useState<string[]>([]);
  // Band-aids that "held", then paged the player with the real problem.
  const [billsPaid, setBillsPaid] = useState<string[]>([]);
  // Replays only: about half the time a second, different incident pages you right after your fix.
  const [curveballId] = useState<string | null>(() => pickCurveball(pattern?.id, initialIncidentId, skinSeed));
  const [curveballFired, setCurveballFired] = useState(false);
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
  const skin = useMemo(() => (skinSeed ? pickSkin(skinSeed, baseIncident) : null), [skinSeed, baseIncident]);
  const incident = useMemo(
    () => (baseIncident && skin ? applySkin(baseIncident, skin) : baseIncident),
    [baseIncident, skin]
  );
  const format = incident ? formatOf(incident) : "pick";

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
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
  const inspectedNode =
    (activeGraph ?? incident?.graphBefore)?.nodes.find((n) => n.id === inspectedNodeId) ??
    incident?.graphBefore.nodes.find((n) => n.id === inspectedNodeId);

  // Formats: find the culprit, two-step mitigation, tune the knob.
  const [stage, setStage] = useState<Stage>(() => initialStage(incident));
  const [wrongFlags, setWrongFlags] = useState<string[]>([]);
  const [mitigationId, setMitigationId] = useState<string | null>(null);
  const [mitigationDone, setMitigationDone] = useState(false);
  const [knobValue, setKnobValue] = useState<number>(incident?.knob?.start ?? 0);
  const [knobMiss, setKnobMiss] = useState<{ title: string; body: string } | null>(null);

  // Stakes: error budget + credit wallet for the whole run, and a combo carried across levels.
  const [economy, setEconomy] = useState<RunEconomy>(() => startEconomy(incident ? creditBudgetFor(incident) : 200));
  const [combo, setCombo] = useState<number>(() => readCombo());
  const [comboEvent, setComboEvent] = useState<{ kind: "up" | "break"; n: number } | null>(null);
  // True until the current incident sees a wrong deploy, a wrong flag, or a hint.
  const [incidentClean, setIncidentClean] = useState(true);
  const [lastWrong, setLastWrong] = useState<Pick<IncidentChoice, "label" | "resultBody"> | null>(null);

  // SRE Architectural Defense Gate state (Pillars 2 & 3)
  const [defenseModalOpen, setDefenseModalOpen] = useState(false);
  const [defenseVerified, setDefenseVerified] = useState(false);
  const [pendingSuccessChoice, setPendingSuccessChoice] = useState<IncidentChoice | null>(null);
  // Bumped on every defense opening so its options move between attempts.
  const [defenseAttempt, setDefenseAttempt] = useState(0);
  const tradeoffSet = pattern ? getTradeoffsForPattern(pattern.id) : undefined;
  // The defense is about what the player deployed, not the set's recommended option.
  const activeDefenseOption =
    tradeoffSet && pendingSuccessChoice ? pickDefenseOption(tradeoffSet, pendingSuccessChoice.label) : undefined;

  // Per-incident state resets when a cascade, bill or curveball swaps the incident in.
  const resetIncidentState = (next: IncidentV2 | undefined) => {
    if (next) {
      setActiveGraph(next.graphBefore);
      setActiveMetrics(next.metricsBefore);
    }
    setSelectedChoiceId(null);
    setIsSubmitted(false);
    setHintsRevealed(0);
    setCascadePendingId(null);
    setStage(initialStage(next));
    setWrongFlags([]);
    setMitigationId(null);
    setMitigationDone(false);
    setKnobValue(next?.knob?.start ?? 0);
    setKnobMiss(null);
    setIncidentClean(true);
    setDefenseVerified(false);
    setDefenseModalOpen(false);
    setPendingSuccessChoice(null);
    setInspectedNodeId(null);
  };

  const [prevIncidentId, setPrevIncidentId] = useState(incidentId);
  if (prevIncidentId !== incidentId) {
    setPrevIncidentId(incidentId);
    resetIncidentState(incident);
  }

  // Play alarm sound on mount or when incidentId changes
  useEffect(() => {
    playAlarmSound();
  }, [incidentId]);

  const orderedChoices = incident ? deterministicShuffle(incident.choices, `${shuffleSeed}|${incident.id}`) : [];
  const orderedMitigations = incident?.mitigation
    ? deterministicShuffle(incident.mitigation.choices, `${shuffleSeed}|${incident.id}|mitigate`)
    : [];
  const selectedChoice: IncidentChoice | undefined = incident?.choices.find((c) => c.id === selectedChoiceId);
  const mitigationChoice = incident?.mitigation?.choices.find((c) => c.id === mitigationId);
  const isSolved = isSubmitted && selectedChoice?.correct === true;
  // A band-aid that "holds": it looks fine now and pages the player later.
  const isHolding = isSubmitted && selectedChoice?.correct === false && !!selectedChoice.consequenceIncidentId;
  const isWrong = isSubmitted && selectedChoice?.correct === false && !isHolding;
  const mitigationWrong = !!mitigationChoice && !mitigationChoice.correct;

  // The outage burns the error budget while the player reads (~1% per 5 s).
  const isLive =
    !!incident &&
    !isDebrief &&
    !isAftershock &&
    !isDefendingCall &&
    !economy.breached &&
    !isSolved &&
    !isHolding &&
    !defenseModalOpen;
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setEconomy((e) => tickReading(e, 1)), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // Toggle sound
  const toggleSound = () => {
    const current = getUserStats();
    saveUserStats({ ...current, soundEnabled: !current.soundEnabled });
  };

  /** Any slip (wrong deploy, wrong flag, hint) ends the incident's clean streak and breaks the combo. */
  const breakCombo = () => {
    setIncidentClean(false);
    if (combo > 0) {
      setCombo(0);
      saveCombo(0);
      setComboEvent((ev) => ({ kind: "break", n: (ev?.n ?? 0) + 1 }));
      playComboBreakSound();
    }
  };

  const applyWrongGraph = (choice: IncidentChoice) => {
    if (!incident) return;
    if (choice.graphAfter) {
      setActiveGraph(choice.graphAfter);
    } else if (choice.graphPatch) {
      setActiveGraph(applyGraphPatch(incident.graphBefore, choice.graphPatch));
    } else {
      // Fallback: make overloaded nodes pulse hotter
      setActiveGraph({
        ...incident.graphBefore,
        nodes: incident.graphBefore.nodes.map((n) =>
          n.tone === "bad" ? { ...n, tone: "bad", cpu: Math.min(100, (n.cpu || 90) + 5) } : n
        ),
      });
    }
    if (choice.metricsAfter) setActiveMetrics(applyMetricUpdates(incident.metricsBefore, choice.metricsAfter));
  };

  const executeDeploySuccess = (choice: IncidentChoice, metricsOverride?: IncidentMetric[]) => {
    // SUCCESS PHYSICS: Mutate topology & metrics to stabilized architecture
    if (choice.graphAfter) {
      setActiveGraph(choice.graphAfter);
    }
    if (metricsOverride) {
      setActiveMetrics(metricsOverride);
    } else if (choice.metricsAfter && incident) {
      setActiveMetrics(applyMetricUpdates(activeMetrics, choice.metricsAfter));
    }
    setEconomy((e) => spend(e, choiceCost(choice)));
    playDeploySound();
    setTimeout(() => playSuccessSound(), 200);

    // A fix that creates a new, smaller problem (or a replay's curveball) asks: handle now or log a ticket?
    if (choice.cascadeIncidentId) {
      setCascadePendingId(choice.cascadeIncidentId);
    } else if (curveballId && !curveballFired && incident?.id !== curveballId) {
      setCurveballFired(true);
      setCascadePendingId(curveballId);
    }

    // Clean fixes build the combo; its multiplier scales this incident's XP.
    let multiplier = 1;
    if (incidentClean) {
      const next = combo + 1;
      setCombo(next);
      saveCombo(next);
      setComboEvent((ev) => ({ kind: "up", n: (ev?.n ?? 0) + 1 }));
      setTimeout(() => playComboSound(next), 350);
      multiplier = comboMultiplier(next);
    }

    if (incident && !(incident.id in solvedIncidents)) {
      const outcome = recordMissionComplete(incident.id, incident.xp, multiplier);
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
    if (isSubmitted && (selectedChoice?.correct || isHolding)) return; // already solved or holding

    setSelectedChoiceId(choice.id);
    setIsSubmitted(true);

    if (choice.correct) {
      // If an architectural tradeoff scenario exists and defense not yet verified, open defense modal
      if (tradeoffSet && !defenseVerified) {
        setPendingSuccessChoice(choice);
        setDefenseAttempt((n) => n + 1);
        setDefenseModalOpen(true);
        return;
      }
      executeDeploySuccess(choice);
      return;
    }

    setWrongDeploys((n) => n + 1);
    setLastWrong(choice);
    breakCombo();
    applyWrongGraph(choice);
    if (choice.consequenceIncidentId) {
      // The band-aid "works": it costs less budget now, and the real problem pages you next.
      setEconomy((e) => applyBandAid(e, choiceCost(choice)));
      playDeploySound();
      return;
    }
    setEconomy((e) => applyWrongDeploy(e, choiceCost(choice)));
    playErrorSound();
  };

  // Roll back failed deployment and retry: costs a little budget, never a hard fail.
  const handleRollback = () => {
    if (!incident) return;
    playBlipSound();
    setEconomy((e) => applyRollback(e));
    // Two-step: rolling back the root-cause fix keeps the mitigation that already landed.
    const kept = mitigationDone ? mitigationChoice : undefined;
    setActiveGraph(kept?.graphAfter ?? incident.graphBefore);
    setActiveMetrics(applyMetricUpdates(incident.metricsBefore, kept?.metricsAfter));
    setSelectedChoiceId(null);
    setIsSubmitted(false);
    setDefenseVerified(false);
    setDefenseModalOpen(false);
    setPendingSuccessChoice(null);
  };

  /** SEV-0 restart, or replaying the level without a new run: a fresh incident and a full budget. */
  const restartIncident = () => {
    if (!incident) return;
    playBlipSound();
    resetIncidentState(incident);
    setEconomy(startEconomy(creditBudgetFor(incident)));
    setIsDebrief(false);
    setCurrentStep(0);
    setLastWrong(null);
  };

  // ---------------- Format steps ----------------

  const handleFlag = (nodeId: string) => {
    if (!incident?.culprit) return;
    if (nodeId === incident.culprit.nodeId) {
      playSuccessSound();
      setStage(incident.mitigation ? "mitigate" : "fix");
      return;
    }
    setWrongFlags((f) => [...f, nodeId]);
    setWrongDeploys((n) => n + 1);
    setEconomy((e) => applyWrongFlag(e));
    breakCombo();
    playErrorSound();
  };

  const handleMitigation = (choice: IncidentChoice) => {
    if (!incident || mitigationDone || mitigationId) return;
    setMitigationId(choice.id);
    if (choice.correct) {
      if (choice.metricsAfter) setActiveMetrics(applyMetricUpdates(incident.metricsBefore, choice.metricsAfter));
      if (choice.graphAfter) setActiveGraph(choice.graphAfter);
      setEconomy((e) => spend(e, choiceCost(choice)));
      setMitigationDone(true);
      playDeploySound();
      setTimeout(() => playSuccessSound(), 200);
      return;
    }
    setWrongDeploys((n) => n + 1);
    setLastWrong(choice);
    breakCombo();
    applyWrongGraph(choice);
    setEconomy((e) => applyWrongDeploy(e, choiceCost(choice)));
    playErrorSound();
  };

  const retryMitigation = () => {
    if (!incident) return;
    playBlipSound();
    setEconomy((e) => applyRollback(e));
    setActiveGraph(incident.graphBefore);
    setActiveMetrics(incident.metricsBefore);
    setMitigationId(null);
  };

  const handleKnobChange = (value: number) => {
    if (!incident?.knob || isSolved) return;
    setKnobValue(value);
    setActiveMetrics(knobMetrics(incident.knob, incident.metricsBefore, value));
  };

  const handleKnobApply = () => {
    const knob = incident?.knob;
    if (!incident || !knob || isSolved) return;
    const zone = knobZone(knob, knobValue);
    if (zone === "good") {
      const correct = incident.choices.find((c) => c.correct);
      if (!correct) return;
      setKnobMiss(null);
      setSelectedChoiceId(correct.id);
      setIsSubmitted(true);
      executeDeploySuccess(correct, knobMetrics(knob, incident.metricsBefore, knobValue));
      return;
    }
    const miss = knob[zone];
    setKnobMiss(miss);
    setWrongDeploys((n) => n + 1);
    setLastWrong({ label: `${knob.label} = ${knobValue}${knob.unit ? ` ${knob.unit}` : ""}`, resultBody: miss.body });
    breakCombo();
    setEconomy((e) => applyWrongDeploy(e));
    playErrorSound();
  };

  // ---------------- Cascades, bills and run flow ----------------

  const enterIncident = (targetId: string) => {
    const target = getIncidentById(targetId);
    if (target) setEconomy((e) => addCreditBudget(e, creditBudgetFor(target)));
    setIncidentId(targetId);
    playAlarmSound();
  };

  const handleCascadeNow = () => {
    if (!cascadePendingId || !incident) return;
    setSurvivedCascades((prev) => [...prev, incident.id]);
    enterIncident(cascadePendingId);
  };

  const handleLogTicket = () => {
    playBlipSound();
    setEconomy((e) => logTicket(e));
    setCascadePendingId(null);
    advanceAfterSolve();
  };

  const handlePayBill = () => {
    const target = selectedChoice?.consequenceIncidentId;
    if (!target) return;
    setBillsPaid((b) => [...b, target]);
    enterIncident(target);
  };

  // Alternates "why this" and "10x" prompts across runs.
  const reasoningPrompt = pattern ? getPatternReasoningPrompt(pattern.id, hashSeed(shuffleSeed)) : undefined;

  // Aftershock answered: record the run with what actually happened, then debrief.
  const finishCampaignRun = (transferFirstTry: boolean) => {
    if (!pattern) return;
    const firstTryFix = wrongDeploys === 0;
    setTransferPassed(transferFirstTry);
    const outcome = completePatternRun(pattern, {
      patternId: pattern.id,
      diagnosisFirstTry: firstTryFix,
      interventionFirstTry: firstTryFix,
      transferFirstTry,
      hintsUsed: hintsUsedTotal,
      failureReasons: [...(firstTryFix ? [] : ["intervention"]), ...(transferFirstTry ? [] : ["transfer"])],
    });
    setRunXp(outcome.xpAwarded);
    setIsAftershock(false);
    if (reasoningPrompt) {
      setIsDefendingCall(true);
      playBlipSound();
      return;
    }
    openDebrief();
  };

  const celebrate = () => {
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

  const openDebrief = () => {
    setIsDefendingCall(false);
    setIsDebrief(true);
    setCurrentStep(2);
    celebrate();
  };

  /** After a solve with nothing pending: the aftershock (campaign) or the next onboarding incident. */
  const advanceAfterSolve = () => {
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
      setIsDebrief(true);
      setCurrentStep(stepsList.length - 1);
      celebrate();
    }
  };

  const handleNextIncident = () => {
    playBlipSound();
    advanceAfterSolve();
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
  const showDeltas = isSubmitted || !!mitigationId || (format === "knob" && knobValue !== incident.knob?.start);
  const statStripData: Stat[] = activeMetrics.map((m) => {
    const beforeMetric = incident.metricsBefore.find((b) => b.key === m.key);
    let sub: string | undefined;

    if (showDeltas && beforeMetric && beforeMetric.value !== m.value) {
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
  // Only offer the ELI5 drawer when there is intel to show; it must never silently do nothing.
  const intelId = resolveConceptIntelId(incident.conceptIntelId, incident.patternId, pattern?.id);
  const culpritNode = incident.culprit ? incident.graphBefore.nodes.find((n) => n.id === incident.culprit?.nodeId) : undefined;
  const result =
    format === "knob" && isSolved && incident.knob
      ? incident.knob.good
      : selectedChoice
      ? { title: selectedChoice.resultTitle, body: selectedChoice.resultBody }
      : null;
  const pendingIsCascade = !!cascadePendingId && cascadePendingId !== curveballId;
  const question =
    stage === "culprit"
      ? "Which node is actually causing this?"
      : stage === "mitigate"
      ? incident.mitigation?.question ?? incident.question
      : format === "knob" && incident.knob
      ? incident.knob.question
      : incident.question;

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
          ) : economy.breached ? (
            <span className="chip chip-bad animate-pulse">
              <AlertTriangle className="w-3 h-3" aria-hidden /> SEV-0
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
          ) : isHolding ? (
            <span className="chip chip-warn">
              <Timer className="w-3 h-3" aria-hidden /> Holding
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
          <span className="num text-[11px] text-slate-400 truncate hidden sm:inline">
            {incident.incidentCode} · Level {incident.level}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isDebrief && <RunHud economy={economy} combo={combo} comboEvent={comboEvent} />}
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

        {economy.breached && !isDebrief ? (
          <BreachScreen postMortem={breachPostMortem(incident, lastWrong)} onRestart={restartIncident} />
        ) : isDefendingCall && reasoningPrompt ? (
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
                    {billsPaid.includes(incident.id)
                      ? "🧾 The bill arrives"
                      : incident.isCascade
                      ? "⚡ Cascade Outage"
                      : "Live Incident"}
                  </span>
                  <span className="chip !text-[11px] !py-0 !px-1.5">{incident.constraint}</span>
                  {skin && (
                    <span className="chip chip-accent !text-[11px] !py-0 !px-1.5">
                      {skin.region} · {skin.occasion}
                    </span>
                  )}
                  {incident.isCascade && !billsPaid.includes(incident.id) && (
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
              {isSubmitted && !isHolding && format !== "knob" && selectedChoice?.tradeoffs && (
                <TradeoffLedger choice={selectedChoice} />
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
                      ) : isHolding ? (
                        <span className="chip chip-warn !py-0 !text-[11px]">
                          <span className="dot" aria-hidden /> Recovering…
                        </span>
                      ) : isWrong || mitigationWrong ? (
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
              {stage !== "culprit" && incident.graphBefore.nodes.length > 0 && (
                <div className="shrink-0 flex flex-wrap items-center gap-1.5 pt-1 pb-1">
                  <span className="text-[11px] text-slate-400 font-mono">Inspect Logs:</span>
                  {incident.graphBefore.nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setInspectedNodeId(node.id)}
                      className="btn btn-ghost !py-0.5 !px-2 !text-[11px] border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3 text-cyan-400" />
                      {node.label}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Right: Tactical Command (The Choice) */}
            <section
              className="lg:border-l lg:border-[var(--line)] lg:pl-4 flex flex-col justify-between min-h-0 space-y-2 overflow-y-auto pr-1 pb-2"
              aria-label="Tactical Command"
            >
              <div className="space-y-0.5 shrink-0">
                <span className="eyebrow text-cyan-300/90 !text-[11px]">
                  {stage === "culprit"
                    ? "Find the culprit"
                    : stage === "mitigate"
                    ? "Step 1 · Stop the bleeding"
                    : format === "two-step"
                    ? "Step 2 · Fix the root cause"
                    : format === "knob"
                    ? "Tune the knob"
                    : "Your Move"}
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">{question}</h3>
              </div>

              {stage !== "culprit" && culpritNode && incident.culprit && (
                <CulpritFound label={culpritNode.label} explanation={incident.culprit.explanation} />
              )}
              {stage === "fix" && mitigationDone && mitigationChoice && (
                <p className="shrink-0 text-[11px] text-emerald-200/90 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-300" aria-hidden />
                  Bleeding stopped: {mitigationChoice.resultTitle}
                </p>
              )}

              {stage === "culprit" && incident.culprit ? (
                <CulpritPanel
                  nodes={incident.graphBefore.nodes}
                  logs={incident.logs ?? {}}
                  culprit={incident.culprit}
                  wrongFlags={wrongFlags}
                  onFlag={handleFlag}
                />
              ) : stage === "mitigate" ? (
                <ChoiceCards
                  choices={orderedMitigations}
                  selectedId={mitigationId}
                  submitted={!!mitigationId}
                  locked={!!mitigationId}
                  onDeploy={handleMitigation}
                />
              ) : format === "knob" && incident.knob ? (
                <KnobPanel
                  knob={incident.knob}
                  value={knobValue}
                  onChange={handleKnobChange}
                  onApply={handleKnobApply}
                  disabled={isSolved}
                  lastResult={knobMiss}
                />
              ) : (
                <ChoiceCards
                  choices={orderedChoices}
                  selectedId={selectedChoiceId}
                  submitted={isSubmitted}
                  locked={isSolved || isHolding}
                  holding={isHolding}
                  onDeploy={handleDeployChoice}
                />
              )}

              {/* Hints & Concept Intel toggle */}
              <div className="shrink-0 pt-0.5 flex flex-wrap items-center gap-2.5">
                {incident.hints && incident.hints.length > 0 && !isSolved && !isHolding && (
                  hintsRevealed < incident.hints.length ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHintsRevealed((n) => n + 1);
                        setHintsUsedTotal((n) => n + 1);
                        breakCombo();
                      }}
                      className="text-xs text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      title={combo > 0 ? "A hint breaks your combo" : undefined}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Hint ({hintsRevealed + 1}/{incident.hints.length}){combo > 0 ? " · breaks combo" : ""}
                    </button>
                  ) : null
                )}

                {intelId && (
                  <button
                    type="button"
                    onClick={() => setSelectedIntelId(intelId)}
                    className="text-xs text-amber-300/90 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    30s ELI5 Concept Intel
                  </button>
                )}
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

              {/* Mitigation result */}
              {stage === "mitigate" && mitigationChoice && (
                <ResultPanel
                  tone={mitigationChoice.correct ? "ok" : "bad"}
                  title={mitigationChoice.resultTitle}
                  body={mitigationChoice.resultBody}
                >
                  {mitigationChoice.correct ? (
                    <button
                      type="button"
                      onClick={() => {
                        playBlipSound();
                        setStage("fix");
                      }}
                      className="btn btn-primary btn-sm w-full justify-center text-xs !py-1.5"
                    >
                      Now fix the root cause <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  ) : (
                    <RollbackButton onClick={retryMitigation} />
                  )}
                </ResultPanel>
              )}

              {/* Post-Mortem HUD (Consequences of Action) */}
              {stage === "fix" && isSubmitted && selectedChoice && result && (
                <ResultPanel
                  tone={isSolved ? "ok" : isHolding ? "warn" : "bad"}
                  title={result.title}
                  body={result.body}
                  xp={isSolved ? solvedIncidents[incident.id] ?? 0 : undefined}
                  rating={!isHolding && !selectedChoice.tradeoffs && format !== "knob" ? selectedChoice : undefined}
                >
                  {isHolding ? (
                    <button
                      type="button"
                      onClick={handlePayBill}
                      className="btn btn-primary btn-sm w-full justify-center text-xs !py-1.5"
                    >
                      Ship it and move on <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  ) : cascadePendingId && isSolved ? (
                    <div className="space-y-1.5">
                      <p className="p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-100 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden />
                        {pendingIsCascade
                          ? "Your fix just created a new, smaller problem. Deal with it?"
                          : "Another page is coming in from a different system."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={handleCascadeNow}
                          className="btn btn-primary btn-sm flex-1 justify-center text-xs"
                        >
                          Handle it now (+XP, keep combo)
                        </button>
                        <button
                          type="button"
                          onClick={handleLogTicket}
                          className="btn btn-secondary btn-sm flex-1 justify-center text-xs"
                        >
                          Log a ticket (safe, −1 star)
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
                  ) : format !== "knob" ? (
                    <RollbackButton onClick={handleRollback} />
                  ) : null}
                </ResultPanel>
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
                summary={buildDebriefSummary({
                  incidentXp: Object.values(solvedIncidents),
                  runXp,
                  transferFirstTry: transferPassed,
                })}
                economy={economy}
                billsPaid={billsPaid}
                survivedCascades={survivedCascades}
                onReplay={onNewRun ?? restartIncident}
                replayLabel={onNewRun ? "Next incident" : "Replay Incident"}
              />
            ) : (
              <DebriefScreen totalXp={totalXp} />
            )}
          </div>
        )}
      </div>

      <ConceptIntelDrawer intelId={selectedIntelId} onClose={() => setSelectedIntelId(null)} />

      {inspectedNode && (
        <TelemetryInspector
          telemetry={telemetryForIncident(inspectedNode, activeMetrics, incident?.logs)}
          onClose={() => setInspectedNodeId(null)}
        />
      )}

      {defenseModalOpen && activeDefenseOption && (
        <ArchitecturalDefenseModal
          isOpen={defenseModalOpen}
          option={activeDefenseOption}
          deployedLabel={pendingSuccessChoice?.label ?? activeDefenseOption.title}
          shuffleSeed={`${shuffleSeed}|${incident.id}|defense#${defenseAttempt}`}
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

function RollbackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-secondary btn-sm w-full justify-center text-rose-200 border-rose-400/30 hover:bg-rose-400/10 cursor-pointer text-xs !py-1.5"
    >
      <RotateCcw className="w-3.5 h-3.5 mr-1" />
      Roll back deployment & retry (−5% budget)
    </button>
  );
}

/** What happened after a deploy: title, the full "why", and the next action. */
function ResultPanel({
  tone,
  title,
  body,
  xp,
  rating,
  children,
}: {
  tone: "ok" | "warn" | "bad";
  title: string;
  body: string;
  xp?: number;
  rating?: IncidentChoice;
  children: React.ReactNode;
}) {
  const frame =
    tone === "ok"
      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
      : tone === "warn"
      ? "border-amber-400/30 bg-amber-400/[0.05]"
      : "border-rose-400/30 bg-rose-400/[0.06]";
  const text = tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-200" : "text-rose-300";
  return (
    <div className={`shrink-0 p-2.5 sm:p-3 rounded-xl border space-y-2 animate-fadeIn ${frame}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${text}`}>
          {tone === "ok" ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : tone === "warn" ? (
            <Timer className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          )}
          {title}
        </span>
        {xp !== undefined && (
          <span className="num text-xs text-amber-300 font-semibold flex items-center gap-1">
            <Zap className="w-3 h-3" /> +{xp} XP
          </span>
        )}
      </div>
      {rating && <SeniorRating choice={rating} />}
      <details open className="text-xs">
        <summary className="cursor-pointer text-[11px] font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 select-none">
          Read why
        </summary>
        <p className="mt-1 text-slate-300 leading-relaxed">{body}</p>
      </details>
      {children}
    </div>
  );
}

function TradeoffLedger({ choice }: { choice: IncidentChoice }) {
  const t = choice.tradeoffs ?? {};
  return (
    <div className="surface p-4 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.03] space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-cyan-300 flex items-center gap-1.5 !text-[11px]">
          <Scale className="w-3.5 h-3.5" /> Architectural Tradeoff Ledger
        </span>
        <SeniorRating choice={choice} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
          <span className="text-slate-400 block text-[11px] uppercase font-mono">Monthly Cost</span>
          <span className={`num font-semibold text-sm ${(t.costMonthlyDelta ?? 0) > 0 ? "text-amber-300" : "text-emerald-400"}`}>
            {(t.costMonthlyDelta ?? 0) > 0 ? `+$${t.costMonthlyDelta}/mo` : "$0/mo"}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
          <span className="text-slate-400 block text-[11px] uppercase font-mono">p99 Latency</span>
          <span className="num font-semibold text-sm text-cyan-300">
            {t.latencyP99DeltaMs ? `${t.latencyP99DeltaMs}ms` : "Neutral"}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
          <span className="text-slate-400 block text-[11px] uppercase font-mono">Consistency</span>
          <span className="num font-semibold text-sm capitalize text-slate-200">{t.consistencyGuarantee ?? "Eventual"}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
          <span className="text-slate-400 block text-[11px] uppercase font-mono">Complexity</span>
          <span className="num font-semibold text-sm text-slate-200">Tier {t.complexityScore ?? 2} / 5</span>
        </div>
      </div>

      {t.tradeoffSummary && (
        <p className="text-xs text-slate-300 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/[0.03]">
          <span className="font-semibold text-cyan-300/90 font-mono">Tradeoff Analysis: </span>
          {t.tradeoffSummary}
        </p>
      )}
    </div>
  );
}

/** The approach badge, shown only after a deploy, as the senior engineer's verdict. */
function SeniorRating({ choice }: { choice: IncidentChoice }) {
  const rating = approachRating(choice.approach);
  if (!rating) return null;
  const tone = rating.tone === "ok" ? "chip-ok" : rating.tone === "warn" ? "chip-warn" : "chip-bad";
  return (
    <span className={`chip !py-0 !text-[11px] ${tone}`}>
      Senior engineer&apos;s rating: {rating.label}
    </span>
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
  const transferIdx = useMemo(() => {
    const parts = shuffleSeed.split("#");
    const num = Number(parts[parts.length - 1]);
    return Number.isFinite(num) ? num : 0;
  }, [shuffleSeed]);
  const transferQuestion = useMemo(
    () => getRotatingTransferQuestion(pattern, transferIdx),
    [pattern, transferIdx]
  );

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
          question={transferQuestion}
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
function telemetryForIncident(
  node: IncidentNode,
  metrics: IncidentMetric[],
  incidentLogs?: Record<string, string[]>
) {
  const metric = (key: string) => metrics.find((m) => m.key === key)?.value;
  const overloaded = node.tone === "bad" || (node.cpu ?? 0) > 85;
  const p95 = metric("p95");
  const errors = metric("errors");
  const authoredLines = incidentLogs?.[node.id];

  const authoredLogEntries: TelemetryLogEntry[] | undefined = authoredLines
    ? authoredLines.map((line, idx) => {
        const lower = line.toLowerCase();
        const isFatal = lower.includes("fatal") || lower.includes("panic") || lower.includes("crash");
        const isError =
          isFatal ||
          lower.includes("error") ||
          lower.includes("fail") ||
          lower.includes("timeout") ||
          lower.includes("overflow") ||
          lower.includes("drop");
        const isWarn =
          !isError &&
          (lower.includes("warn") ||
            lower.includes("slow") ||
            lower.includes("high") ||
            lower.includes("lag") ||
            lower.includes("exceed"));
        return {
          timestamp: `00:0${idx + 1}.000`,
          level: isFatal ? "FATAL" : isError ? "ERROR" : isWarn ? "WARN" : "INFO",
          source: node.id,
          message: line,
          highlight: isError || isWarn,
        };
      })
    : undefined;

  return getMockTelemetryForNode(node.id, node.kind, overloaded, {
    nodeName: node.label,
    ...(typeof node.cpu === "number" ? { cpuUsage: node.cpu } : {}),
    ...(p95 !== undefined ? { p99LatencyMs: p95 } : {}),
    ...(errors !== undefined ? { errorRate: errors } : {}),
    ...(authoredLogEntries ? { logs: authoredLogEntries } : {}),
    knobs: [],
  });
}

/** A curveball for a replay: another startable incident of the same level, chosen from the seed. */
function pickCurveball(patternId: string | undefined, currentId: string, skinSeed: string | undefined): string | null {
  if (!patternId || !skinSeed) return null;
  const h = Math.abs(hashSeed(`${skinSeed}|curveball`));
  if (h % 2 === 1) return null;
  const pack = getScenarioPackByPatternId(patternId);
  if (!pack) return null;
  const options = getPlayableIncidents(pack).filter((i) => !i.isCascade && i.id !== currentId);
  return options.length > 0 ? options[h % options.length].id : null;
}

function CampaignDebriefScreen({
  pattern,
  incident,
  selectedChoice,
  summary,
  economy,
  billsPaid,
  survivedCascades,
  onReplay,
  replayLabel,
}: {
  pattern: SystemDesignPattern;
  chapter?: CampaignChapter;
  incident: IncidentV2;
  selectedChoice?: IncidentChoice;
  summary: DebriefSummary;
  economy: RunEconomy;
  billsPaid: string[];
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
        <RunScorecard economy={economy} billsPaid={billsPaid.length} />
        <p className="text-[15px] text-slate-300 leading-relaxed">
          {selectedChoice?.resultBody || `You resolved the bottleneck for ${pattern.title} under live outage conditions.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Architecture accomplishments */}
        <section className="surface !rounded-xl overflow-hidden" aria-label="Architecture Upgrades">
          <header className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2">
            <span className="eyebrow">Stabilized Component</span>
            <span className="num text-xs text-amber-200/90">
              {summary.xpLabel}
              {summary.xpNote && <span className="text-slate-400"> ({summary.xpNote})</span>}
            </span>
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
            <h3 className={`text-[15px] font-semibold ${summary.masteryVerified ? "text-emerald-300" : "text-white"}`}>
              {summary.masteryTitle}
            </h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">{summary.masteryBody}</p>
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

      {/* Real architectural takeaway: 3 one-line lesson cards */}
      {pattern.tradeoff && (
        <section className="space-y-2.5 animate-fadeIn" aria-label="Architectural Lessons">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-cyan-300">Staff Takeaways · {pattern.title}</span>
            <span className="text-[11px] text-slate-500 font-mono">3 core lessons from this incident</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] space-y-1">
              <span className="flex items-center gap-1.5 font-semibold text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> What failed?
              </span>
              <p className="text-slate-200 leading-snug">{pattern.tradeoff.whatFailed}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-1">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Why did the fix work?
              </span>
              <p className="text-slate-200 leading-snug">{pattern.tradeoff.whyFixWorked}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] space-y-1">
              <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> When is it not enough?
              </span>
              <p className="text-slate-200 leading-snug">{pattern.tradeoff.insufficientWhen}</p>
            </div>
          </div>
        </section>
      )}

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
        <Link href={`/campaign/${pattern.chapterId}?mode=study`} className="btn btn-ghost">
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

/** Stars and the run's stakes: SLA budget left, credit spent, tickets and bills. */
function RunScorecard({ economy, billsPaid }: { economy: RunEconomy; billsPaid: number }) {
  const stars = runStars(economy);
  const over = overBudget(economy);
  const reasons = [
    economy.wrongDeploys > 0 && `${economy.wrongDeploys} wrong deploy${economy.wrongDeploys === 1 ? "" : "s"}`,
    over && "over the credit budget",
    economy.ticketsLogged > 0 && `${economy.ticketsLogged} cascade${economy.ticketsLogged === 1 ? "" : "s"} logged as a ticket`,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1" aria-label={`${stars} of 3 stars`}>
      <span className="text-xl text-amber-300 tracking-wider" aria-hidden>
        {"★".repeat(stars)}
        <span className="text-slate-600">{"★".repeat(3 - stars)}</span>
      </span>
      <span className="chip num !text-[11px]">SLA budget left {Math.round(economy.budget)}%</span>
      <span className={`chip num !text-[11px] ${over ? "chip-bad" : ""}`}>
        Credits ${economy.spent}/${economy.creditBudget}
      </span>
      {billsPaid > 0 && <span className="chip chip-warn !text-[11px]">A band-aid came back to bite</span>}
      {reasons.length > 0 && <span className="text-[11px] text-slate-400">Lost stars: {reasons.join(", ")}.</span>}
    </div>
  );
}
