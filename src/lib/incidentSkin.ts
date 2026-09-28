import type { IncidentChoice, IncidentConstraintVariant, IncidentMetric, IncidentV2 } from "@/types";
import { hashSeed } from "@/lib/shuffle";

/**
 * Procedural "skins" make a replayed incident feel like a new outage:
 * - Traffic numbers scale together and regions/occasions rotate.
 * - Constraint skins (where authored) can change the underlying business constraint
 *   and flip which architectural option is correct.
 */
export interface IncidentSkin {
  scale: number;
  region: string;
  occasion: string;
  variant?: IncidentConstraintVariant;
}

const SCALES = [0.5, 0.75, 1.5, 2, 3];
const REGIONS = ["us-east-1", "eu-west-1", "ap-south-1", "ap-northeast-1", "sa-east-1", "eu-central-1", "us-west-2"];
const OCCASIONS = [
  "Black Friday peak",
  "Monday 9am login rush",
  "Viral post on social media",
  "Cricket final livestream",
  "Payday checkout surge",
  "New-feature launch day",
  "Holiday flash sale",
  "Marketing email just went out",
];

export function pickSkin(seed: string, incident?: IncidentV2): IncidentSkin {
  const h = Math.abs(hashSeed(seed));
  let variant: IncidentConstraintVariant | undefined;
  if (incident?.variants && incident.variants.length > 0) {
    variant = incident.variants[h % incident.variants.length];
  }
  return {
    scale: SCALES[h % SCALES.length],
    region: REGIONS[Math.floor(h / 7) % REGIONS.length],
    occasion: OCCASIONS[Math.floor(h / 53) % OCCASIONS.length],
    ...(variant ? { variant } : {}),
  };
}

/** Rounds to two significant figures so scaled numbers read like real dashboards. */
function niceNumber(n: number): number {
  if (n < 100) return Math.round(n);
  const magnitude = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / magnitude) * magnitude;
}

// "20,000 req/s", "180k reads/s", "9k req/s per region", "300 order.paid events/s"
const TRAFFIC_RE =
  /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s?k)?(\s+(?:[\w.-]+\s+)?)(req\/s|requests\/s|reads\/s|writes\/s|events\/s|rps|QPS)/gi;

export function scaleTrafficText(text: string, scale: number): string {
  return text.replace(TRAFFIC_RE, (_m, num: string, k: string | undefined, gap: string, unit: string) => {
    const value = Number(num.replace(/,/g, "")) * (k ? 1000 : 1);
    const scaled = niceNumber(value * scale);
    const formatted = k && scaled >= 1000 ? `${niceNumber(scaled / 1000)}k` : scaled.toLocaleString("en-US");
    return `${formatted}${gap}${unit}`;
  });
}

function scaleMetrics(metrics: IncidentMetric[] | undefined, scale: number): IncidentMetric[] | undefined {
  return metrics?.map((m) => (m.key === "rps" ? { ...m, value: niceNumber(m.value * scale) } : m));
}

export function applySkin(incident: IncidentV2, skin: IncidentSkin): IncidentV2 {
  const variant = skin.variant;
  const metricsPatch = variant?.metricsPatch;

  let scaledMetrics = incident.metricsBefore ? scaleMetrics(incident.metricsBefore, skin.scale) : undefined;
  if (scaledMetrics && metricsPatch) {
    scaledMetrics = scaledMetrics.map((m) =>
      m.key in metricsPatch ? { ...m, value: metricsPatch[m.key]! } : m
    );
  }

  const choices: IncidentChoice[] = incident.choices.map((c) => {
    const isCorrect = variant ? c.id === variant.correctChoiceId : c.correct;
    const override = variant?.resultOverrides?.[c.id];
    const approach =
      override?.approach ??
      (variant ? (isCorrect ? "optimal" : c.approach === "optimal" ? "viable_with_tradeoffs" : c.approach) : c.approach);
    const resultTitle = override?.resultTitle ?? c.resultTitle;
    const resultBody = override?.resultBody
      ? scaleTrafficText(override.resultBody, skin.scale)
      : scaleTrafficText(c.resultBody, skin.scale);

    return {
      ...c,
      correct: isCorrect,
      approach,
      resultTitle,
      resultBody,
      metricsAfter: scaleMetrics(c.metricsAfter, skin.scale),
    };
  });

  const constraintText = variant?.constraint ?? incident.constraint;

  return {
    ...incident,
    brief: scaleTrafficText(incident.brief, skin.scale),
    constraint: scaleTrafficText(constraintText, skin.scale),
    metricsBefore: scaledMetrics ?? incident.metricsBefore,
    choices,
  };
}
