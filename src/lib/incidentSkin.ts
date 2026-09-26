import type { IncidentChoice, IncidentMetric, IncidentV2 } from "@/types";
import { hashSeed } from "@/lib/shuffle";

/**
 * Procedural "skins" make a replayed incident feel like a new outage without
 * touching the engineering: traffic numbers scale together (the fleet is
 * sized to match, so CPU and latency stay as authored), and the page gets a
 * different region and occasion. Correct answers never change.
 */
export interface IncidentSkin {
  scale: number;
  region: string;
  occasion: string;
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

export function pickSkin(seed: string): IncidentSkin {
  const h = Math.abs(hashSeed(seed));
  return {
    scale: SCALES[h % SCALES.length],
    region: REGIONS[Math.floor(h / 7) % REGIONS.length],
    occasion: OCCASIONS[Math.floor(h / 53) % OCCASIONS.length],
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
  const choices: IncidentChoice[] = incident.choices.map((c) => ({
    ...c,
    resultBody: scaleTrafficText(c.resultBody, skin.scale),
    metricsAfter: scaleMetrics(c.metricsAfter, skin.scale),
  }));
  return {
    ...incident,
    brief: scaleTrafficText(incident.brief, skin.scale),
    constraint: scaleTrafficText(incident.constraint, skin.scale),
    metricsBefore: scaleMetrics(incident.metricsBefore, skin.scale) ?? incident.metricsBefore,
    choices,
  };
}
