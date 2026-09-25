"use client";

import React from "react";
import IncidentWarRoom from "@/components/incident/IncidentWarRoom";

interface PushpaMissionWarRoomProps {
  onClose?: () => void;
  isStandalonePage?: boolean;
}

export default function PushpaMissionWarRoom({ onClose }: PushpaMissionWarRoomProps) {
  return <IncidentWarRoom initialIncidentId="hs-01" onClose={onClose} />;
}
