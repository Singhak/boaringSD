"use client";

import React from "react";
import { useRouter } from "next/navigation";
import SystemFlightSim from "@/components/simulation/SystemFlightSim";

interface PushpaMissionWarRoomProps {
  onClose?: () => void;
  isStandalonePage?: boolean;
}

export default function PushpaMissionWarRoom({
  onClose,
}: PushpaMissionWarRoomProps) {
  const router = useRouter();

  const handleAllCompleted = () => {
    onClose?.();
    router.push("/campaign");
  };

  return (
    <SystemFlightSim
      initialIncidentId="hs-01"
      onClose={onClose}
      onAllCompleted={handleAllCompleted}
    />
  );
}
