/**
 * Allowlist sanitiser for events posted to /api/events, run before anything is
 * stored or logged. The client is untrusted: it must not be able to plant free
 * text, secrets or oversized blobs in the database or the logs.
 */

import { ID_PATTERN, type EventName } from "@/lib/events";
import { redactSecrets } from "@/lib/redact";

/** Every event the app sends. Typed as a record so a new EventName cannot be forgotten here. */
const KNOWN_EVENTS: Record<EventName, true> = {
  session_start: true,
  daily_start: true,
  reminder_added: true,
  daily_complete: true,
  run_start: true,
  run_complete: true,
  review_complete: true,
  builder_submit: true,
  estimate_submit: true,
  interview_complete: true,
  guided_complete: true,
  journey_complete: true,
  reasoning_submit: true,
};

const DAY_MS = 86_400_000;
export const MAX_EVENT_AGE_MS = 35 * DAY_MS;
const MAX_FUTURE_SKEW_MS = 5 * 60_000;
const MAX_PROPS = 16;
const MAX_STRING = 64;
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
/** Prop names that suggest free text or credentials are being sent; these never get stored. */
const FORBIDDEN_KEYS =
  /(answer|text|message|reply|comment|email|password|secret|token|cookie|authorization|api_?key)|^(name|note|ip|key)$/i;
/** Long unbroken tokens (session ids, hashes, keys) are not analytics values. */
const TOKEN_LIKE = /^[A-Za-z0-9_+/=.-]{32,}$/;

export interface CleanEvent {
  anonId: string;
  name: EventName;
  ts: Date;
  props: Record<string, string | number | boolean | null> | null;
}

export type SanitizeResult = { ok: true; event: CleanEvent } | { ok: false; reason: string };

function cleanString(value: string): string | null {
  const stripped = redactSecrets(value.replace(/[\u0000-\u001f\u007f]/g, " ")).trim().slice(0, MAX_STRING);
  if (!stripped) return null;
  return TOKEN_LIKE.test(stripped) ? "[redacted]" : stripped;
}

export function sanitizeProps(props: unknown): CleanEvent["props"] {
  if (!props || typeof props !== "object" || Array.isArray(props)) return null;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_PROPS) break;
    if (!KEY_PATTERN.test(key) || FORBIDDEN_KEYS.test(key)) continue;
    if (value === null || typeof value === "boolean") out[key] = value;
    else if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === "string") {
      const cleaned = cleanString(value);
      if (cleaned !== null) out[key] = cleaned;
    }
    // Objects, arrays and everything else are dropped.
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function sanitizeEvent(input: unknown, nowMs: number = Date.now()): SanitizeResult {
  const body = (input ?? {}) as { anonId?: unknown; name?: unknown; ts?: unknown; props?: unknown };
  if (typeof body.anonId !== "string" || !ID_PATTERN.test(body.anonId)) return { ok: false, reason: "bad anonId" };
  if (typeof body.name !== "string" || !Object.prototype.hasOwnProperty.call(KNOWN_EVENTS, body.name)) {
    return { ok: false, reason: "unknown event" };
  }
  if (typeof body.ts !== "string") return { ok: false, reason: "bad ts" };
  const ts = new Date(body.ts);
  if (Number.isNaN(ts.getTime())) return { ok: false, reason: "bad ts" };
  if (ts.getTime() > nowMs + MAX_FUTURE_SKEW_MS) return { ok: false, reason: "ts in the future" };
  if (ts.getTime() < nowMs - MAX_EVENT_AGE_MS) return { ok: false, reason: "ts too old" };

  return { ok: true, event: { anonId: body.anonId, name: body.name as EventName, ts, props: sanitizeProps(body.props) } };
}

/** The only form of an event that goes to stdout: no props, and a shortened id. */
export function logLine(event: CleanEvent): string {
  return `[event] ${event.name} ${event.anonId.slice(0, 8)}`;
}
