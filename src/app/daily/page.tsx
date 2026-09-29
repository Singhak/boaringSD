import type { Metadata } from "next";
import DailyOutage from "@/components/daily/DailyOutage";

export const metadata: Metadata = {
  title: "Daily Outage | BoaringSD",
  description: "One production outage a day, the same for every player. Fix it, keep your streak, share your score.",
};

export default function DailyPage() {
  return <DailyOutage />;
}
