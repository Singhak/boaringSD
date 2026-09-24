"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Volume2, VolumeX, X, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import QuestionCard from "@/components/run/QuestionCard";
import { StatStrip, Stepper, T, Topology } from "@/components/run/RunVisuals";
import type { Stat, Tier } from "@/components/run/RunVisuals";
import { playAlarmSound, playBlipSound, playDeploySound, playLevelUpSound } from "@/lib/sound";
import { getUserStats, loginUser, recordMissionComplete, saveUserStats } from "@/lib/storage";
import { useUserStats } from "@/lib/useUserStats";
import type { PatternQuestion } from "@/types";

interface PushpaMissionWarRoomProps {
  onClose?: () => void;
  /** Kept for callers; layout is the same either way. */
  isStandalonePage?: boolean;
}

// ---------------------------------------------------------------------------
// The two onboarding incidents, as data
// ---------------------------------------------------------------------------

interface Mission {
  id: string;
  incidentId: string;
  step: string;
  xp: number;
  title: string;
  context: string;
  hint: string;
  question: PatternQuestion;
  before: { stats: Stat[]; tiers: Tier[] };
  after: { stats: Stat[]; tiers: Tier[] };
  fixSummary: string;
  pattern: string;
}

const MISSIONS: Mission[] = [
  {
    id: "mission-1",
    incidentId: "INC-001",
    step: "Overload",
    xp: 50,
    title: "One server is taking all the traffic",
    context:
      "A spike sent 100,000 requests a second at a single app server. Its CPU is pinned and feed requests are timing out. The database is still fine.",
    hint: "Look at which box is red. The database is healthy, so the problem is how much work lands on one server.",
    question: {
      question: "Traffic is 10× normal and one server is at 96% CPU. What do you add?",
      options: [
        {
          id: "cache",
          label: "A cache in front of the database",
          isCorrect: false,
          explanation:
            "A cache saves database reads, but the database isn't the problem. The single server is out of CPU just handling the connections.",
        },
        {
          id: "lb",
          label: "A load balancer and a second app server",
          isCorrect: true,
          explanation:
            "The load balancer splits the 100k req/s across two servers, so each one does half the work. CPU drops to 38% and the feed loads again.",
        },
        {
          id: "cdn",
          label: "A CDN at the edge",
          isCorrect: false,
          explanation:
            "A CDN serves static files like images and scripts. Feed requests are personalised, so they still have to reach an app server.",
        },
      ],
    },
    before: {
      stats: [
        { label: "Traffic", value: "100,000", unit: "req/s", sub: "10× normal" },
        { label: "Server CPU", value: 96, unit: "%", tone: "bad", sub: "one server" },
        { label: "p95 latency", value: "4,200", unit: "ms", tone: "bad", sub: "feeds time out" },
      ],
      tiers: [[T("Users", "ok", "100k req/s")], [T("App Server 1", "hot", "96% CPU")], [T("Database")]],
    },
    after: {
      stats: [
        { label: "Traffic", value: "100,000", unit: "req/s", sub: "same spike" },
        { label: "Server CPU", value: 38, unit: "%", tone: "ok", sub: "was 96%" },
        { label: "p95 latency", value: "195", unit: "ms", tone: "ok", sub: "was 4,200 ms" },
      ],
      tiers: [
        [T("Users", "ok", "100k req/s")],
        [T("Load Balancer", "new", "round robin")],
        [T("App Server 1", "ok", "38%"), T("App Server 2", "new", "37%")],
        [T("Database")],
      ],
    },
    fixSummary: "Load balancer + a second server: CPU 96% → 38%, latency 4,200 → 195 ms",
    pattern: "Load balancing",
  },
  {
    id: "mission-2",
    incidentId: "INC-002",
    step: "DB meltdown",
    xp: 100,
    title: "Now the database is drowning in reads",
    context:
      "With two servers the app tier is healthy, so twice as many requests reach the database. Every feed refresh runs the same queries, and it has used all 1,000 connections.",
    hint: "Most of these requests read the same feed rows again and again. What can answer a repeated read without touching disk?",
    question: {
      question: "The database is at 99% CPU with every connection in use. What do you add?",
      options: [
        {
          id: "cache",
          label: "An in-memory cache (Redis) in front of the database",
          isCorrect: true,
          explanation:
            "Repeated feed reads now come from memory. 96% of requests never reach the database, so its CPU falls to 18%.",
        },
        {
          id: "cdn",
          label: "A CDN at the edge",
          isCorrect: false,
          explanation:
            "A CDN caches static files near users. Each user's feed is different, so those queries still hit the database.",
        },
        {
          id: "dns",
          label: "A faster DNS provider",
          isCorrect: false,
          explanation: "DNS only turns a domain name into an IP address. It runs before a request arrives and does nothing for database load.",
        },
      ],
    },
    before: {
      stats: [
        { label: "App tier", value: "2", unit: "servers", tone: "ok", sub: "load balanced" },
        { label: "Database CPU", value: 99, unit: "%", tone: "bad", sub: "1,000/1,000 conns" },
        { label: "p95 latency", value: "7,000", unit: "ms", tone: "bad", sub: "queries queue up" },
        { label: "Cache hits", value: "0", unit: "%", sub: "no cache" },
      ],
      tiers: [
        [T("Users", "ok", "100k req/s")],
        [T("Load Balancer")],
        [T("App Servers ×2", "ok", "40%")],
        [T("Database", "hot", "99% · conns full")],
      ],
    },
    after: {
      stats: [
        { label: "App tier", value: "2", unit: "servers", tone: "ok", sub: "load balanced" },
        { label: "Database CPU", value: 18, unit: "%", tone: "ok", sub: "was 99%" },
        { label: "p95 latency", value: "42", unit: "ms", tone: "ok", sub: "was 7,000 ms" },
        { label: "Cache hits", value: "96", unit: "%", tone: "ok", sub: "reads from memory" },
      ],
      tiers: [
        [T("Users", "ok", "100k req/s")],
        [T("Load Balancer")],
        [T("App Servers ×2", "ok", "18%")],
        [T("Redis Cache", "new", "96% hits"), T("Database", "ok", "misses + writes")],
      ],
    },
    fixSummary: "Redis cache: database CPU 99% → 18%, latency 7,000 → 42 ms",
    pattern: "Caching",
  },
];

const STEPS = [...MISSIONS.map((m) => ({ id: m.id, label: m.step })), { id: "debrief", label: "Debrief" }];

function celebrate() {
  try {
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors: ["#38d6e8", "#34d399", "#fbbf24"] });
  } catch {
    // Canvas unavailable
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PushpaMissionWarRoom({ onClose }: PushpaMissionWarRoomProps) {
  const stats = useUserStats();
  const soundOn = stats?.soundEnabled ?? true;

  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState<Record<string, number>>({}); // mission id → XP actually awarded
  const [savedAs, setSavedAs] = useState<"guest" | string | null>(null);

  const mission = MISSIONS[step] as Mission | undefined;
  const done = step >= MISSIONS.length;
  const isSolved = mission ? mission.id in solved : true;
  const view = mission ? (isSolved ? mission.after : mission.before) : null;
  const totalXp = Object.values(solved).reduce((a, b) => a + b, 0);

  useEffect(() => {
    playAlarmSound();
  }, []);

  useEffect(() => {
    if (!done) return;
    playLevelUpSound();
    celebrate();
  }, [done]);

  const toggleSound = () => {
    const current = getUserStats();
    saveUserStats({ ...current, soundEnabled: !current.soundEnabled });
  };

  const handleAnswer = (m: Mission, correct: boolean) => {
    if (!correct || m.id in solved) return;
    const outcome = recordMissionComplete(m.id, m.xp);
    setSolved((s) => ({ ...s, [m.id]: outcome.xpAwarded }));
    setTimeout(() => playDeploySound(), 250);
  };

  const next = () => {
    playBlipSound();
    setStep((s) => s + 1);
  };

  const incidentOpen = !done && !isSolved;

  return (
    <article
      className={`surface overflow-hidden w-full text-left transition-[border-color,box-shadow] duration-700 ${
        incidentOpen
          ? "!border-rose-400/25 shadow-[0_30px_80px_-30px_rgba(251,113,133,0.35)]"
          : "!border-emerald-400/20 shadow-[0_30px_80px_-30px_rgba(52,211,153,0.25)]"
      }`}
      aria-label="Onboarding incident"
    >
      {/* Pager header */}
      <header
        className={`flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] transition-colors duration-700 ${
          incidentOpen ? "bg-rose-400/[0.04]" : "bg-emerald-400/[0.03]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {done ? (
            <span className="chip chip-ok">
              <Check className="w-3 h-3" aria-hidden /> All clear
            </span>
          ) : incidentOpen ? (
            <span className="chip chip-bad">
              <span className="dot animate-pulse-glow" aria-hidden /> P0 · Live outage
            </span>
          ) : (
            <span className="chip chip-ok">
              <span className="dot" aria-hidden /> Mitigated
            </span>
          )}
          <span className="num text-[11px] text-slate-500 truncate">
            {mission ? `${mission.incidentId} · feed service` : "2 incidents resolved"}
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
        <Stepper steps={STEPS} current={step} label="Incident progress" />

        {mission && view && (
          <div key={mission.id} className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 animate-fadeIn">
            {/* Left: what the system is doing */}
            <section className="space-y-4 min-w-0" aria-label="System state">
              <div className="space-y-1.5">
                <span className="eyebrow">
                  Incident {step + 1} of {MISSIONS.length}
                </span>
                <h2 className="text-2xl display">{mission.title}</h2>
                <p className="text-[14px] text-slate-400 leading-relaxed">{mission.context}</p>
              </div>
              <StatStrip stats={view.stats} />
              <Topology
                tiers={view.tiers}
                caption={
                  <>
                    <span className="eyebrow">Live topology</span>
                    {isSolved ? (
                      <span className="chip chip-ok !py-0">
                        <span className="dot" aria-hidden /> Healthy
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

            {/* Right: the decision */}
            <section className="lg:border-l lg:border-[var(--line)] lg:pl-6" aria-label="Your move">
              <QuestionCard
                eyebrow="Your move"
                question={mission.question}
                hints={[mission.hint]}
                submitLabel="Deploy"
                continueLabel={step + 1 < MISSIONS.length ? "Next incident" : "Close the incident"}
                onAnswer={(opt) => handleAnswer(mission, opt.isCorrect)}
                onContinue={next}
                afterCorrect={<XpLine xp={solved[mission.id]} />}
              />
            </section>
          </div>
        )}

        {done && <Debrief totalXp={totalXp} savedAs={savedAs} onSave={setSavedAs} />}
      </div>
    </article>
  );
}

function XpLine({ xp }: { xp: number | undefined }) {
  if (xp === undefined) return null;
  return xp > 0 ? (
    <p className="flex items-center gap-1.5 text-amber-200/90">
      <Zap className="w-3.5 h-3.5" aria-hidden />
      <span className="num">+{xp} XP</span>
    </p>
  ) : (
    <p className="text-slate-500">You&apos;ve already cleared this today, so no extra XP.</p>
  );
}

// ---------------------------------------------------------------------------
// Debrief
// ---------------------------------------------------------------------------

function Debrief({
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
    <div className="space-y-6 animate-fadeIn">
      <div className="space-y-2 max-w-2xl">
        <span className="eyebrow text-emerald-300/80">Debrief</span>
        <h2 className="text-3xl display">The feed is back up.</h2>
        <p className="text-[15px] text-slate-400 leading-relaxed">
          You fixed two bottlenecks in a row, and the second only appeared because you fixed the first. That&apos;s how real
          systems grow, and it&apos;s how the levels work.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <section className="surface !rounded-xl overflow-hidden" aria-label="What you changed">
          <header className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2">
            <span className="eyebrow">What you changed</span>
            <span className="num text-xs text-amber-200/90">+{totalXp} XP</span>
          </header>
          <ol className="divide-y divide-[var(--line)]">
            {MISSIONS.map((m, i) => (
              <li key={m.id} className="px-5 py-3.5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                  <Check className="w-3.5 h-3.5" aria-hidden />
                  <span className="sr-only">Incident {i + 1} resolved</span>
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="text-[13px] text-slate-200 leading-snug">{m.fixSummary}</p>
                  <span className="chip !text-[10px] !py-0">{m.pattern}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface !rounded-xl p-5 space-y-4" aria-label="Save progress">
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold text-white">Keep your progress</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              Progress is saved in this browser. Sign-in is a demo for now.
            </p>
          </div>
          {savedAs ? (
            <p role="status" className="flex items-start gap-2 text-[13px] text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
              {savedAs === "guest" ? "Saved in this browser." : `Signed in as ${savedAs} (saved in this browser).`}
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2">
              <button type="button" onClick={signIn} className="btn btn-secondary flex-1">
                <GoogleMark />
                Google (demo)
              </button>
              <button type="button" onClick={() => onSave("guest")} className="btn btn-ghost flex-1 border border-[var(--line)]">
                Continue as guest
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Link href="/campaign" className="btn btn-primary btn-lg">
          Go to the level map
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/dashboard" className="btn btn-ghost">
          Open your progress
        </Link>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}
