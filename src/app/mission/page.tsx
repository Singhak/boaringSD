"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";

export default function MissionPage() {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex items-center">
        <PushpaMissionWarRoom isStandalonePage />
      </main>
    </div>
  );
}
