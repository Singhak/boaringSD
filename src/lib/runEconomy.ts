/**
 * Stakes for a War Room run: an SLA error budget that burns while the outage
 * is live and on every bad deploy, and a cloud-credit wallet fed by each
 * deploy's monthly cost. Pure functions, so the War Room and the onboarding
 * flight sim share the same rules and tests can pin them down.
 */
import type { IncidentChoice, IncidentV2 } from "@/types";

export const BUDGET_START = 100;
/** Reading costs ~1% of the error budget every 5 seconds while the incident is live. */
export const READ_BURN_PER_SECOND = 0.2;
/** Kept gentle on purpose (fix-plan difficulty warning): about 6 wrong deploys before a breach. */
export const WRONG_DEPLOY_BURN = 15;
/** A rollback costs a little, so a retry is not free but never a hard fail. */
export const ROLLBACK_BURN = 5;
/** Flagging a healthy node as the culprit. */
export const WRONG_FLAG_BURN = 10;
/** A band-aid that "holds" still costs some budget while it degrades. */
export const BAND_AID_BURN = 5;

/** Onboarding flight sim: 1.2% per 500 ms tick. */
export const FLIGHT_BURN_PER_TICK = 1.2;

export interface RunEconomy {
  budget: number;
  /** USD/month committed by every deploy this run (rolled-back deploys were still paid for). */
  spent: number;
  creditBudget: number;
  wrongDeploys: number;
  /** Cascades the player chose to log as a ticket instead of handling now. */
  ticketsLogged: number;
  breached: boolean;
}

export function startEconomy(creditBudget: number): RunEconomy {
  return { budget: BUDGET_START, spent: 0, creditBudget, wrongDeploys: 0, ticketsLogged: 0, breached: false };
}

/** Lowers the error budget, never below 0; reaching 0 is an SLA breach. */
export function burnBudget(budget: number, amount: number): number {
  return Math.max(0, budget - amount);
}

function burn(e: RunEconomy, amount: number): RunEconomy {
  if (e.breached) return e;
  const budget = burnBudget(e.budget, amount);
  return { ...e, budget, breached: budget <= 0 };
}

export function tickReading(e: RunEconomy, seconds: number): RunEconomy {
  return burn(e, seconds * READ_BURN_PER_SECOND);
}

export function applyWrongDeploy(e: RunEconomy, cost = 0): RunEconomy {
  return burn({ ...spend(e, cost), wrongDeploys: e.wrongDeploys + 1 }, WRONG_DEPLOY_BURN);
}

/** A band-aid counts as a wrong deploy (it breaks the combo) but burns less: the bill comes later. */
export function applyBandAid(e: RunEconomy, cost = 0): RunEconomy {
  return burn({ ...spend(e, cost), wrongDeploys: e.wrongDeploys + 1 }, BAND_AID_BURN);
}

export function applyRollback(e: RunEconomy): RunEconomy {
  return burn(e, ROLLBACK_BURN);
}

export function applyWrongFlag(e: RunEconomy): RunEconomy {
  return burn({ ...e, wrongDeploys: e.wrongDeploys + 1 }, WRONG_FLAG_BURN);
}

export function spend(e: RunEconomy, cost: number): RunEconomy {
  return { ...e, spent: e.spent + Math.max(0, cost) };
}

export function logTicket(e: RunEconomy): RunEconomy {
  return { ...e, ticketsLogged: e.ticketsLogged + 1 };
}

/** A later incident in the same run (cascade, consequence, curveball) adds its own credit allowance. */
export function addCreditBudget(e: RunEconomy, amount: number): RunEconomy {
  return { ...e, creditBudget: e.creditBudget + amount };
}

export function overBudget(e: RunEconomy): boolean {
  return e.spent > e.creditBudget;
}

export function choiceCost(choice: Pick<IncidentChoice, "tradeoffs">): number {
  return Math.max(0, choice.tradeoffs?.costMonthlyDelta ?? 0);
}

/**
 * Credit an incident may spend: authored, or 1.5x its costliest correct fix,
 * rounded up to $50 and never below $200.
 */
export function creditBudgetFor(incident: Pick<IncidentV2, "creditBudget" | "choices">): number {
  if (incident.creditBudget !== undefined) return incident.creditBudget;
  const correctCost = Math.max(0, ...incident.choices.filter((c) => c.correct).map(choiceCost));
  return Math.max(200, Math.ceil((correctCost * 1.5) / 50) * 50);
}

/**
 * Stars for a cleared run: 3, minus one each for a wrong deploy, overspending
 * the wallet, and logging a cascade as a ticket. A breach earns none.
 */
export function runStars(e: RunEconomy): 0 | 1 | 2 | 3 {
  if (e.breached) return 0;
  const penalties = (e.wrongDeploys > 0 ? 1 : 0) + (overBudget(e) ? 1 : 0) + (e.ticketsLogged > 0 ? 1 : 0);
  return Math.max(1, 3 - penalties) as 1 | 2 | 3;
}

export interface BreachPostMortem {
  deployed: string;
  worse: string;
  missed: string;
}

/** Three lines for the SEV-0 screen: what you deployed, why it made things worse, the signal you missed. */
export function breachPostMortem(
  incident: IncidentV2,
  lastWrong: Pick<IncidentChoice, "label" | "resultBody"> | null
): BreachPostMortem {
  const firstSentence = (text: string) => (text.match(/^[^.!?]*[.!?]/)?.[0] ?? text).trim();
  return {
    deployed: lastWrong ? `You deployed “${lastWrong.label}”.` : "Nothing was deployed before the budget ran out.",
    worse: lastWrong
      ? firstSentence(lastWrong.resultBody)
      : `The outage kept burning: ${firstSentence(incident.brief)}`,
    missed: incident.culprit?.explanation
      ? firstSentence(incident.culprit.explanation)
      : incident.hints.length > 0
      ? incident.hints[incident.hints.length - 1]
      : incident.constraint,
  };
}

// ---------------------------------------------------------------------------
// Combo streak
// ---------------------------------------------------------------------------

export const MAX_COMBO_MULTIPLIER = 3;

/** First-try, hint-free fixes in a row build the combo: x1, x2, x3 (cap). */
export function comboMultiplier(combo: number): number {
  return Math.min(MAX_COMBO_MULTIPLIER, Math.max(1, combo));
}
