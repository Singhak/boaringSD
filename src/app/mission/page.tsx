"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";

export default function MissionPage() {
  return (
    <div className="h-screen max-h-screen text-slate-100 flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-center min-h-0 overflow-hidden">
        <PushpaMissionWarRoom isStandalonePage />
      </main>
    </div>
  );
}
