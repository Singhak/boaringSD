"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Cpu,
  Clock,
  Layers,
  Flame,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import MetricCard from "@/components/MetricCard";
import InteractiveStage from "@/components/simulation/InteractiveStage";
import LevelUpModal from "@/components/LevelUpModal";
import { getLessonById, LESSONS } from "@/lib/lessons";
import { completeLesson } from "@/lib/storage";
import { playLevelUpSound, playBlipSound } from "@/lib/sound";
import { SimulationState } from "@/types";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.lessonId as string;
  const lesson = getLessonById(lessonId) || LESSONS[0];

  // Simulation State
  const [simState, setSimState] = useState<SimulationState>({
    hasLoadBalancer: false,
    hasCache: false,
    hasReadReplica: false,
    serverCount: 1,
    userCount: lesson.initialMetrics.requestsPerSec,
    isSimulating: true,
    metrics: { ...lesson.initialMetrics },
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Reset simulation when lesson changes
  useEffect(() => {
    setSimState({
      hasLoadBalancer: false,
      hasCache: false,
      hasReadReplica: false,
      serverCount: 1,
      userCount: lesson.initialMetrics.requestsPerSec,
      isSimulating: true,
      metrics: { ...lesson.initialMetrics },
    });
    setCurrentStepIndex(0);
    setIsCompleted(false);
  }, [lessonId]);

  const handleDeployComponent = (type: string) => {
    playBlipSound();

    if (type === "load-balancer") {
      setSimState((prev) => ({
        ...prev,
        hasLoadBalancer: true,
        serverCount: 2,
        metrics: {
          ...prev.metrics,
          cpuUsage: 40,
          latencyMs: 300,
          errorRate: 0,
        },
      }));
      setCurrentStepIndex(2);
      checkCompletion();
    } else if (type === "server") {
      setSimState((prev) => ({
        ...prev,
        serverCount: Math.min(3, prev.serverCount + 1),
        metrics: {
          ...prev.metrics,
          cpuUsage: 25,
          latencyMs: 180,
          errorRate: 0,
        },
      }));
      checkCompletion();
    } else if (type === "cache") {
      setSimState((prev) => ({
        ...prev,
        hasCache: true,
        metrics: {
          ...prev.metrics,
          cpuUsage: 22,
          latencyMs: 15,
          databaseHits: 100,
          cacheHitRate: 99,
          errorRate: 0,
        },
      }));
      setCurrentStepIndex(1);
      checkCompletion();
    } else if (type === "replica") {
      setSimState((prev) => ({
        ...prev,
        hasReadReplica: true,
        metrics: {
          ...prev.metrics,
          cpuUsage: 35,
          latencyMs: 120,
          databaseHits: 5000,
          cacheHitRate: 80,
          errorRate: 0,
        },
      }));
      setCurrentStepIndex(1);
      checkCompletion();
    }
  };

  const checkCompletion = () => {
    setTimeout(() => {
      setIsCompleted(true);
      setShowCelebration(true);
      completeLesson(lesson.id, lesson.xpReward);
      playLevelUpSound();
    }, 600);
  };

  const handleReset = () => {
    setSimState({
      hasLoadBalancer: false,
      hasCache: false,
      hasReadReplica: false,
      serverCount: 1,
      userCount: lesson.initialMetrics.requestsPerSec,
      isSimulating: true,
      metrics: { ...lesson.initialMetrics },
    });
    setCurrentStepIndex(0);
    setIsCompleted(false);
  };

  const nextLessonIndex = LESSONS.findIndex((l) => l.id === lesson.id) + 1;
  const nextLesson = LESSONS[nextLessonIndex];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Simulation
            </button>
            <Link
              href={`/challenge/${lesson.challenge.id}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-cyan-400" />
              Take Lesson Quiz
            </Link>
          </div>
        </div>

        {/* Lesson Header Banner */}
        <div className="p-6 rounded-2xl glass-panel border border-white/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-500/30">
                  Level {lesson.level}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {lesson.estimatedMinutes} min quest
                </span>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-amber-400" /> +{lesson.xpReward} XP
                </span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">{lesson.title}</h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">{lesson.description}</p>
            </div>

            {/* Status progress pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Mission Status:</span>
              {isCompleted ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 fill-emerald-500/20" /> Completed
                </span>
              ) : (
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <Play className="w-3.5 h-3.5 fill-cyan-400" /> In Progress
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="CPU Load"
            value={`${simState.metrics.cpuUsage}%`}
            unit="Peak"
            icon={Cpu}
            status={
              simState.metrics.cpuUsage > 80
                ? "danger"
                : simState.metrics.cpuUsage > 50
                ? "warning"
                : "healthy"
            }
            subtext="Target: < 50%"
            delta={
              simState.metrics.cpuUsage < lesson.initialMetrics.cpuUsage
                ? `-${lesson.initialMetrics.cpuUsage - simState.metrics.cpuUsage}%`
                : undefined
            }
          />

          <MetricCard
            label="Response Latency"
            value={simState.metrics.latencyMs}
            unit="ms"
            icon={Clock}
            status={
              simState.metrics.latencyMs > 1000
                ? "danger"
                : simState.metrics.latencyMs > 400
                ? "warning"
                : "healthy"
            }
            subtext="Target: < 400ms"
            delta={
              simState.metrics.latencyMs < lesson.initialMetrics.latencyMs
                ? `-${lesson.initialMetrics.latencyMs - simState.metrics.latencyMs}ms`
                : undefined
            }
          />

          <MetricCard
            label="Database Hits"
            value={simState.metrics.databaseHits.toLocaleString()}
            unit="queries"
            icon={Layers}
            status={simState.metrics.databaseHits > 5000 ? "warning" : "healthy"}
            subtext="Disk I/O rate"
          />

          <MetricCard
            label="Error / Failure Rate"
            value={`${simState.metrics.errorRate}%`}
            icon={Flame}
            status={simState.metrics.errorRate > 0 ? "danger" : "healthy"}
            subtext="Connection Drops"
          />
        </div>

        {/* Two-Column Interactive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Step Guide & Theory */}
          <div className="lg:col-span-4 space-y-4">
            {/* Mission Objective Card */}
            <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Learning Objectives
              </h2>
              <ul className="space-y-2 text-xs text-slate-300">
                {lesson.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step-by-Step Interactive Quest Steps */}
            <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Quest Workflow
              </h2>

              <div className="space-y-3">
                {lesson.steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex || isCompleted;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? "bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                          : isDone
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : "bg-slate-900/40 border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">
                          Step {idx + 1}: {step.title}
                        </span>
                        {isDone && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        {step.description}
                      </p>

                      {isActive && !isCompleted && (
                        <button
                          onClick={() => {
                            if (lesson.id === "load-balancer") {
                              handleDeployComponent(
                                !simState.hasLoadBalancer ? "load-balancer" : "server"
                              );
                            } else if (lesson.id === "cache") {
                              handleDeployComponent("cache");
                            } else if (lesson.id === "database-scaling") {
                              handleDeployComponent("replica");
                            }
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20"
                        >
                          <Zap className="w-3.5 h-3.5 fill-slate-950" />
                          {step.actionLabel}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Challenge Button once lesson done */}
              {isCompleted && (
                <Link
                  href={`/challenge/${lesson.challenge.id}`}
                  className="block w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs text-center shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider"
                >
                  🚀 Challenge Ready: Earn +{lesson.challenge.rewardXp} XP
                </Link>
              )}
            </div>
          </div>

          {/* Right: Live Interactive Simulation Stage */}
          <div className="lg:col-span-8">
            <InteractiveStage
              lessonId={lesson.id}
              state={simState}
              onDeployComponent={handleDeployComponent}
            />
          </div>
        </div>
      </main>

      {/* Level-Up Celebration Modal */}
      <LevelUpModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Architecture Target Reached!"
        subtitle={`You successfully solved the ${lesson.title} bottleneck and restored low latency!`}
        xpEarned={lesson.xpReward}
        badgeEarned={
          lesson.id === "load-balancer"
            ? "Traffic Controller"
            : lesson.id === "cache"
            ? "Speed Demon"
            : "Cluster Engineer"
        }
        nextLabel="Solve Challenge Quiz"
        onNext={() => router.push(`/challenge/${lesson.challenge.id}`)}
      />
    </div>
  );
}
