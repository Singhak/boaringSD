"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getPracticeLabs, type LabId } from "@/lib/labs";
import { useUserStats } from "@/lib/useUserStats";

/** Renders a practice lab only once it is unlocked; otherwise shows how to unlock it. */
export default function FeatureGate({ lab, children }: { lab: LabId; children: React.ReactNode }) {
  const stats = useUserStats();
  const info = stats ? getPracticeLabs(stats).find((l) => l.id === lab) : undefined;

  if (stats === null) {
    return (
      <div className="min-h-screen text-slate-100 flex flex-col">
        <Navbar />
        <p role="status" className="text-sm text-slate-400 py-16 text-center">
          Loading your saved progress…
        </p>
      </div>
    );
  }

  if (!info || info.unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <section className="surface p-8 max-w-md text-center space-y-4">
          <span className="w-10 h-10 mx-auto rounded-full surface-2 grid place-items-center">
            <Lock className="w-4 h-4 text-slate-400" aria-hidden />
          </span>
          <h1 className="text-xl display">{info.name} is locked</h1>
          <p className="text-sm text-slate-400">
            {info.unlockHint}. Clear levels in the campaign to open it. Each one teaches a pattern you&apos;ll use here.
          </p>
          <Link href="/campaign" className="btn btn-primary inline-flex">
            Go to the levels <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
