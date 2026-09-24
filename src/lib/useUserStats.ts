"use client";

import { useSyncExternalStore } from "react";
import type { UserStats } from "@/types";
import { STATS_EVENT, getUserStats, readRawStats } from "@/lib/storage";

let cachedRaw: string | null | undefined;
let cachedStats: UserStats | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener(STATS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STATS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Snapshots must be referentially stable, so re-parse only when the stored string changes.
function getSnapshot(): UserStats | null {
  const raw = readRawStats();
  if (raw !== cachedRaw || cachedStats === null) {
    cachedStats = getUserStats();
    cachedRaw = readRawStats(); // getUserStats may have migrated and rewritten the value
  }
  return cachedStats;
}

const getServerSnapshot = () => null;

/** Player stats from localStorage. Null during server render, so hydration matches. */
export function useUserStats(): UserStats | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
