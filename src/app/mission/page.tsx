"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import PushpaMissionWarRoom from "@/components/PushpaMissionWarRoom";

export default function MissionPage() {
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#080c14] text-slate-100 flex flex-col justify-between">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-1 sm:py-2 flex items-center justify-center my-auto">
        <PushpaMissionWarRoom isStandalonePage={true} />
      </main>
    </div>
  );
}
