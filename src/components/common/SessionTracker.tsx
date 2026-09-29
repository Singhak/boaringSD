"use client";

import { useEffect } from "react";
import { trackSessionStart } from "@/lib/events";

/** Records one anonymous session_start per browser tab session. Renders nothing. */
export default function SessionTracker() {
  useEffect(() => {
    trackSessionStart();
  }, []);
  return null;
}
