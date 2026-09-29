import type { Metadata } from "next";
import ScaleJourney from "@/components/journey/ScaleJourney";

export const metadata: Metadata = {
  title: "Scale Journey | BoaringSD",
  description: "The weekly boss: grow one system from a front-page spike to ten million users, with a new twist every week.",
};

export default function JourneyPage() {
  return <ScaleJourney />;
}
