import type { IncidentMetric, KnobSpec } from "@/types";

export function inTarget(knob: KnobSpec, value: number): boolean {
  return value >= knob.target[0] && value <= knob.target[1];
}

/** Which side of the target a value is on. */
export function knobZone(knob: KnobSpec, value: number): "low" | "good" | "high" {
  if (value < knob.target[0]) return "low";
  if (value > knob.target[1]) return "high";
  return "good";
}

/** Linear interpolation of one metric along the knob's anchor curve. */
function interpolate(knob: KnobSpec, key: string, value: number): number | undefined {
  const points = knob.curve
    .map((p) => ({ at: p.at, v: p.metrics.find((m) => m.key === key)?.value }))
    .filter((p): p is { at: number; v: number } => p.v !== undefined);
  if (points.length === 0) return undefined;
  if (value <= points[0].at) return points[0].v;
  const last = points[points.length - 1];
  if (value >= last.at) return last.v;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (value <= b.at) {
      const t = (value - a.at) / (b.at - a.at || 1);
      return a.v + (b.v - a.v) * t;
    }
  }
  return last.v;
}

/** Live metrics for a knob position: interpolated values, green inside the target, red outside. */
export function knobMetrics(knob: KnobSpec, baseline: IncidentMetric[], value: number): IncidentMetric[] {
  const good = inTarget(knob, value);
  return baseline.map((m) => {
    const v = interpolate(knob, m.key, value);
    if (v === undefined) return m;
    const rounded = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
    return { ...m, value: rounded, tone: good ? "good" : m.key === "rps" ? m.tone : "bad" };
  });
}

/** Authoring checks for a knob spec; empty when valid. */
export function knobSpecProblems(knob: KnobSpec, metricKeys: string[]): string[] {
  const problems: string[] = [];
  const [lo, hi] = knob.target;
  if (!(knob.min < lo && lo <= hi && hi < knob.max)) problems.push("target must sit strictly inside min..max");
  if (knob.step <= 0) problems.push("step must be positive");
  if (inTarget(knob, knob.start)) problems.push("start must be outside the target");
  if (knob.start < knob.min || knob.start > knob.max) problems.push("start must be within min..max");
  if (knob.curve.length < 3) problems.push("curve needs at least 3 anchors");
  const ats = knob.curve.map((p) => p.at);
  if (ats.some((a, i) => i > 0 && a <= ats[i - 1])) problems.push("curve anchors must be sorted and distinct");
  if (ats[0] !== knob.min || ats[ats.length - 1] !== knob.max) problems.push("curve must span min..max");
  const unknown = knob.curve.flatMap((p) => p.metrics.map((m) => m.key)).filter((k) => !metricKeys.includes(k));
  if (unknown.length > 0) problems.push(`curve uses metrics not in metricsBefore: ${[...new Set(unknown)].join(", ")}`);
  // Stepping from min must be able to land inside the target.
  const reachable = Math.floor((hi - knob.min) / knob.step) * knob.step + knob.min >= lo;
  if (!reachable) problems.push("no slider step lands inside the target");
  return problems;
}
