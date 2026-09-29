import type { InterviewEstimationTarget } from "@/types";
import { VARIANTS as variantsA } from "./interviewVariantsA";
import { VARIANTS as variantsB } from "./interviewVariantsB";

/**
 * A re-parameterised version of an interview estimation target. The canonical
 * answer is never authored: it is `compute(inputs)`, so the number the learner
 * is graded against always follows the formula (checked by test).
 */
export interface EstimationVariant {
  parameterContext: string;
  inputs: Record<string, number>;
  compute: (inputs: Record<string, number>) => number;
  stepByStepDerivation: string[];
  /** Optional replacement for the target's prompt when the ask itself changes. */
  prompt?: string;
}

/** Keyed by estimation target id (for example `est-url-qps`). The base target is always in the rotation too. */
export type EstimationVariantMap = Record<string, EstimationVariant[]>;

export const ESTIMATION_VARIANTS: EstimationVariantMap = { ...variantsA, ...variantsB };

/** Rounds to 2 significant figures, so answers read like interview numbers. */
export function roundSig(value: number, sig = 2): number {
  if (!Number.isFinite(value) || value === 0) return value;
  return Number(value.toPrecision(sig));
}

export function applyEstimationVariant(
  target: InterviewEstimationTarget,
  variant: EstimationVariant
): InterviewEstimationTarget {
  return {
    ...target,
    prompt: variant.prompt ?? target.prompt,
    parameterContext: variant.parameterContext,
    canonicalAnswer: roundSig(variant.compute(variant.inputs)),
    stepByStepDerivation: variant.stepByStepDerivation,
  };
}
