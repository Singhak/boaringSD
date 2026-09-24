"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";

export default function MissionPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PushpaMissionWarRoom isStandalonePage={true} />
      </main>
    </div>
  );
}
