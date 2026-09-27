/**
 * Outcomes for the onboarding flight sim's fix buttons. The buttons show no
 * rating; the game loop and the victory screen read the real outcome from here.
 */

export type FlightIncidentId = "hs-01" | "lb-01";
export type FlightFixKey = "scale_out" | "restart" | "deploy_lb" | "upgrade_core";

/** Monthly cloud credit the onboarding team may spend on a fix. */
export const FLIGHT_CREDIT_BUDGET = 300;

/** How long a band-aid holds before the load slams the node again. */
export const BAND_AID_HOLD_MS = 2000;

export interface FlightFixSpec {
  kind: "root_cause" | "band_aid" | "overkill";
  monthlyCost: number;
  /** True if the metrics recover and the stabilise countdown runs. */
  stabilizes: boolean;
}

const SPECS: Record<FlightFixKey, FlightFixSpec> = {
  scale_out: { kind: "root_cause", monthlyCost: 120, stabilizes: true },
  deploy_lb: { kind: "root_cause", monthlyCost: 40, stabilizes: true },
  // A reboot clears memory, pauses the burn for a moment, then the same load returns.
  restart: { kind: "band_aid", monthlyCost: 0, stabilizes: false },
  // A 64-core box absorbs the spike but blows the credit budget and stays a single point of failure.
  upgrade_core: { kind: "overkill", monthlyCost: 800, stabilizes: true },
};

export function flightFixSpec(fix: FlightFixKey): FlightFixSpec {
  return SPECS[fix];
}

export interface FlightVictory {
  stars: 1 | 2 | 3;
  title: string;
  body: string;
  overBudget: boolean;
}

/** Victory copy and stars for the fix the player actually deployed. */
export function flightVictory(incident: FlightIncidentId, fix: FlightFixKey, mistakes: number): FlightVictory {
  const spec = SPECS[fix];
  const overBudget = spec.monthlyCost > FLIGHT_CREDIT_BUDGET;

  if (fix === "upgrade_core") {
    return {
      stars: 1,
      title: "Stabilised, at a price",
      body: `The 64-core box absorbs all 100k req/s, but Server 2 still sits idle and Server 1 is still a single point of failure. +$${spec.monthlyCost}/mo is over the $${FLIGHT_CREDIT_BUDGET}/mo credit budget.`,
      overBudget,
    };
  }

  const stars = mistakes === 0 ? 3 : 2;
  if (incident === "hs-01") {
    return {
      stars,
      title: "Incident resolved",
      body: "A second stateless app server splits the 100k req/s load. CPU drops from 98% to 45% on each node.",
      overBudget,
    };
  }
  return {
    stars,
    title: "Incident resolved",
    body: "The Nginx reverse proxy balances traffic 50/50, so Server 1 is no longer taking every request.",
    overBudget,
  };
}
