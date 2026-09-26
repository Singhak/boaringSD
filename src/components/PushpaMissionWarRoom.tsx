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
  isStandalonePage = false,
}: PushpaMissionWarRoomProps) {
  const router = useRouter();

  const handleAllCompleted = () => {
    if (isStandalonePage) {
      router.push("/campaign");
    } else if (onClose) {
      onClose();
    } else {
      router.push("/campaign");
    }
  };

  return (
    <SystemFlightSim
      initialIncidentId="hs-01"
      onClose={onClose}
      onAllCompleted={handleAllCompleted}
    />
  );
}
