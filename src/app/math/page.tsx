import React from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MentalMathTrainer from "@/components/math/MentalMathTrainer";

export const metadata: Metadata = {
  title: "Back-of-the-Envelope Math Gym | BoaringSD",
  description:
    "Master high-speed capacity estimation, QPS, cache sizing, and cloud cost calculations for Staff/Principal System Design interviews.",
};

export default function MathPage() {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col bg-[var(--background)]">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
        <MentalMathTrainer />
      </main>
    </div>
  );
}
