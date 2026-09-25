"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
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
import { completePatternRun, getUserStats, loginUser, recordMissionComplete, saveUserStats } from "@/lib/storage";
import { useUserStats } from "@/lib/useUserStats";
import type { CampaignChapter, IncidentChoice, IncidentGraph, IncidentMetric, IncidentV2, SystemDesignPattern } from "@/types";

interface IncidentWarRoomProps {
  initialIncidentId?: string;
  pattern?: SystemDesignPattern;
  chapter?: CampaignChapter;
  onClose?: () => void;
  onAllClear?: () => void;
  standalone?: boolean;
}

const ONBOARDING_FLOW_IDS = ["hs-01", "lb-01"];

export default function IncidentWarRoom({
  initialIncidentId = "hs-01",
  pattern,
  chapter,
  onClose,
  onAllClear,
}: IncidentWarRoomProps) {
  const stats = useUserStats();
  const soundOn = stats?.soundEnabled ?? true;

  // Track the sequence of incidents (defaults to canonical onboarding: hs-01 -> lb-01)
  const [incidentId, setIncidentId] = useState<string>(initialIncidentId);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [solvedIncidents, setSolvedIncidents] = useState<Record<string, number>>({});
  const [isDebrief, setIsDebrief] = useState(false);
  const [savedAs, setSavedAs] = useState<"guest" | string | null>(null);

  // Synchronize when initialIncidentId prop changes across levels
  const [prevInitialIncidentId, setPrevInitialIncidentId] = useState(initialIncidentId);
  if (prevInitialIncidentId !== initialIncidentId) {
    setPrevInitialIncidentId(initialIncidentId);
    setIncidentId(initialIncidentId);
    setCurrentStep(0);
    setIsDebrief(false);
  }

  // Active incident state
  const incident: IncidentV2 | undefined =
    getIncidentById(incidentId) || getCanonicalIncident(pattern?.levelNumber || 1);

  const [activeGraph, setActiveGraph] = useState<IncidentGraph | null>(
    incident ? incident.graphBefore : null
  );
  const [activeMetrics, setActiveMetrics] = useState<IncidentMetric[]>(
    incident ? incident.metricsBefore : []
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [hintsRevealed, setHintsRevealed] = useState<number>(0);

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
  }

  // Play alarm sound on mount or when incidentId changes
  useEffect(() => {
    playAlarmSound();
  }, [incidentId]);

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

  // Choice selection & simulation physics
  const handleDeployChoice = (choice: IncidentChoice) => {
    if (isSubmitted && selectedChoice?.correct) return; // already solved

    setSelectedChoiceId(choice.id);
    setIsSubmitted(true);

    if (choice.correct) {
      // SUCCESS PHYSICS: Mutate topology & metrics to stabilized architecture
      if (choice.graphAfter) {
        setActiveGraph(choice.graphAfter);
      }
      if (choice.metricsAfter && incident) {
        setActiveMetrics(applyMetricUpdates(incident.metricsBefore, choice.metricsAfter));
      }
      playDeploySound();
      setTimeout(() => playSuccessSound(), 200);

      // Record XP reward for this incident
      if (incident && !(incident.id in solvedIncidents)) {
        const outcome = recordMissionComplete(incident.id, incident.xp);
        setSolvedIncidents((prev) => ({ ...prev, [incident.id]: outcome.xpAwarded }));
      }

      // If playing in campaign mode, mark pattern run completed so progress unlocks next level
      if (pattern) {
        completePatternRun(pattern, {
          patternId: pattern.id,
          diagnosisFirstTry: true,
          interventionFirstTry: !isWrong,
          transferFirstTry: true,
          hintsUsed: hintsRevealed,
          failureReasons: isWrong ? ["intervention"] : [],
        });
      }
    } else {
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
    setCurrentStep(0);
  };

  // Advance to next incident or debrief
  const handleNextIncident = () => {
    playBlipSound();

    if (pattern) {
      // In campaign mode, resolving the level incident completes the level and goes to debrief
      setIsDebrief(true);
      setCurrentStep(1);
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
      if (m.key === "cpu" || m.key === "errors" || m.key === "p95") {
        sub = delta < 0 ? `was ${beforeMetric.value}${m.unit || ""}` : `${sign}${delta}${m.unit || ""}`;
      } else {
        sub = `was ${beforeMetric.value.toLocaleString()}`;
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
        { id: "debrief", label: "Level Cleared" },
      ]
    : ONBOARDING_FLOW_IDS.map((id, idx) => ({
        id,
        label: `Incident 0${idx + 1}`,
      })).concat([{ id: "debrief", label: "Debrief" }]);

  const totalXp = Object.values(solvedIncidents).reduce((a, b) => a + b, 0);

  return (
    <article
      className={`surface overflow-hidden w-full text-left transition-[border-color,box-shadow] duration-700 ${
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
        className={`flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] transition-colors duration-500 ${
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

      <div className="p-4 sm:p-6 space-y-6">
        {/* Step tracker */}
        <Stepper steps={stepsList} current={isDebrief ? stepsList.length - 1 : currentStep} label="Progress" />

        {!isDebrief ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 animate-fadeIn">
            {/* Left: What the system is physically doing */}
            <section className="space-y-4 min-w-0" aria-label="Live System State">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-cyan-300">Live Incident</span>
                  <span className="chip !text-[10px] !py-0">{incident.constraint}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl display">{incident.title}</h2>
                <p className="text-[14px] text-slate-300 leading-relaxed">{incident.brief}</p>
              </div>

              {/* Dynamic metrics strip */}
              <StatStrip stats={statStripData} />

              {/* Live topology simulation */}
              <Topology
                tiers={tiers}
                caption={
                  <>
                    <span className="eyebrow">Topology Simulation</span>
                    {isSolved ? (
                      <span className="chip chip-ok !py-0">
                        <span className="dot" aria-hidden /> Balanced & Stable
                      </span>
                    ) : isWrong ? (
                      <span className="chip chip-bad !py-0">
                        <span className="dot animate-pulse-glow" aria-hidden /> Degradation
                      </span>
                    ) : (
                      <span className="chip chip-bad !py-0">
                        <span className="dot animate-pulse-glow" aria-hidden /> Bottleneck
                      </span>
                    )}
                  </>
                }
              />
            </section>

            {/* Right: Tactical Command (The Choice) */}
            <section
              className="lg:border-l lg:border-[var(--line)] lg:pl-6 space-y-5"
              aria-label="Tactical Command"
            >
              <div className="space-y-1">
                <span className="eyebrow text-cyan-300/90">Your Move</span>
                <h3 className="text-lg font-semibold text-white leading-snug">{incident.question}</h3>
              </div>

              {/* 3 Short Choice Cards */}
              <div className="space-y-2.5">
                {incident.choices.map((choice) => {
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
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-300 flex items-center justify-between group cursor-pointer ${stateClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-full border grid place-items-center text-[10px] font-mono shrink-0 ${
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
                        <span className="text-[15px] font-medium leading-snug">{choice.label}</span>
                      </div>

                      <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                        Deploy
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Hints toggle */}
              {incident.hints && incident.hints.length > 0 && !isSolved && (
                <div className="pt-2">
                  {hintsRevealed < incident.hints.length ? (
                    <button
                      type="button"
                      onClick={() => setHintsRevealed((n) => n + 1)}
                      className="text-xs text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Need intel? Hint ({hintsRevealed + 1}/{incident.hints.length})
                    </button>
                  ) : null}

                  {hintsRevealed > 0 && (
                    <div className="mt-2 p-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] space-y-1 animate-fadeIn">
                      {incident.hints.slice(0, hintsRevealed).map((h, i) => (
                        <p key={i} className="text-xs text-cyan-200/90 leading-relaxed">
                          • {h}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Post-Mortem HUD (Consequences of Action) */}
              {isSubmitted && selectedChoice && (
                <div
                  className={`p-4 rounded-xl border space-y-3 animate-fadeIn ${
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

                  <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                    {selectedChoice.resultBody}
                  </p>

                  {/* Actions */}
                  {isSolved ? (
                    <button
                      type="button"
                      onClick={handleNextIncident}
                      className="btn btn-primary btn-md w-full justify-center group"
                    >
                      {pattern ? "View debrief & complete level" : "Deploy next fix"}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRollback}
                      className="btn btn-secondary btn-md w-full justify-center text-rose-200 border-rose-400/30 hover:bg-rose-400/10 cursor-pointer"
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
          pattern ? (
            <CampaignDebriefScreen
              pattern={pattern}
              chapter={chapter}
              incident={incident}
              selectedChoice={selectedChoice}
              totalXp={totalXp || incident.xp}
              onReplay={handleRollback}
            />
          ) : (
            <DebriefScreen
              totalXp={totalXp}
              savedAs={savedAs}
              onSave={setSavedAs}
            />
          )
        )}
      </div>
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

function CampaignDebriefScreen({
  pattern,
  incident,
  selectedChoice,
  totalXp,
  onReplay,
}: {
  pattern: SystemDesignPattern;
  chapter?: CampaignChapter;
  incident: IncidentV2;
  selectedChoice?: IncidentChoice;
  totalXp: number;
  onReplay: () => void;
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
              <RotateCcw className="w-3.5 h-3.5" /> Replay Incident
            </button>
            <Link
              href={`/builder?scenario=${pattern.id}`}
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

function DebriefScreen({
  totalXp,
  savedAs,
  onSave,
}: {
  totalXp: number;
  savedAs: "guest" | string | null;
  onSave: (who: "guest" | string) => void;
}) {
  const signIn = () => {
    const user = loginUser("alex.chen@systemdesignquest.io", "Alex Chen");
    onSave(user.userName || "Alex Chen");
  };

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
            <h3 className="text-[15px] font-semibold text-white">Save your badge & streak</h3>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Your XP and unlocked levels are preserved in local storage.
            </p>
          </div>
          {savedAs ? (
            <p role="status" className="flex items-start gap-2 text-[13px] text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
              {savedAs === "guest" ? "Progress saved in browser." : `Signed in as ${savedAs}.`}
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2">
              <button type="button" onClick={signIn} className="btn btn-secondary flex-1 cursor-pointer">
                Sign in (demo)
              </button>
              <button type="button" onClick={() => onSave("guest")} className="btn btn-ghost flex-1 border border-[var(--line)] cursor-pointer">
                Continue as guest
              </button>
            </div>
          )}
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
