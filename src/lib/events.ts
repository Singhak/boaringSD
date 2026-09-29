// Privacy-safe product events: what was played and how it went, never who played it.
// Events live in a local ring buffer under an anonymous random id. They are sent to a
// collector only when NEXT_PUBLIC_EVENTS_URL is set (fire-and-forget via sendBeacon).

export type EventName =
  | "session_start"
  | "daily_start"
  | "reminder_added"
  | "daily_complete"
  | "run_start"
  | "run_complete"
  | "review_complete"
  | "builder_submit"
  | "estimate_submit"
  | "interview_complete"
  | "guided_complete"
  | "journey_complete"
  | "reasoning_submit";

export type EventProps = Record<string, string | number | boolean | null>;

export interface TrackedEvent {
  name: EventName;
  ts: string;
  props?: EventProps;
}

const EVENTS_KEY = "sd_quest_events_v1";
const ANON_KEY = "sd_quest_anon_id_v1";
const SESSION_KEY = "sd_quest_session_v1";
const MAX_EVENTS = 1000;
const DAY_MS = 86_400_000;

/** The practice modes, for "how many kinds of challenge did they play this week". */
const MODE_OF: Partial<Record<EventName, string>> = {
  daily_complete: "daily",
  run_complete: "campaign",
  review_complete: "review",
  builder_submit: "builder",
  estimate_submit: "estimation",
  interview_complete: "interview",
  guided_complete: "case-study",
  journey_complete: "journey",
};

export const ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

/** Keep the id from either store when it looks valid, else mint one. Pure so it can be tested. */
export function resolveAnonId(fromStorage: string | null, fromCookie: string | null, mint: () => string): string {
  if (fromStorage && ID_PATTERN.test(fromStorage)) return fromStorage;
  if (fromCookie && ID_PATTERN.test(fromCookie)) return fromCookie;
  return mint();
}

function readCookieId(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ANON_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function mintId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-anon0000`;
}

/**
 * One anonymous id per browser, shared by every tab. It lives in localStorage and in a
 * first-party cookie, so clearing either one alone does not create a new "user". It is not
 * fingerprinting and cannot link devices; that needs an account.
 */
export function anonId(): string {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(ANON_KEY);
  } catch {}
  let cookie: string | null = null;
  try {
    cookie = readCookieId();
  } catch {}
  const id = resolveAnonId(stored, cookie, mintId);
  try {
    if (stored !== id) localStorage.setItem(ANON_KEY, id);
  } catch {}
  try {
    if (cookie !== id) document.cookie = `${ANON_KEY}=${id}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {}
  return id;
}

export function readEvents(): TrackedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as TrackedEvent[]) : [];
  } catch {
    return [];
  }
}

export function track(name: EventName, props?: EventProps, now: Date = new Date()): void {
  if (typeof window === "undefined") return;
  try {
    const event: TrackedEvent = { name, ts: now.toISOString(), ...(props ? { props } : {}) };
    const events = [...readEvents(), event].slice(-MAX_EVENTS);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    const url = process.env.NEXT_PUBLIC_EVENTS_URL;
    if (url && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify({ anonId: anonId(), ...event }));
    }
  } catch {
    // Storage full or blocked: events are best-effort and never break play.
  }
}

/** Once per browser tab session. */
export function trackSessionStart(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    return;
  }
  track("session_start");
}

export interface EventSummary {
  activeDays7: number;
  activeDays28: number;
  sessions7: number;
  /** Distinct practice modes finished in the last 7 days. */
  modes7: string[];
  /** First seen at least 14 days ago and active in the last 7. */
  returnedAfterWeek2: boolean;
  dailyCompletions28: number;
  /** Share of campaign runs in the last 28 days that were replays of a cleared level. */
  replayShare28: number | null;
}

/** The retention plan's success metrics, computed from a list of events. */
export function summarizeEvents(events: TrackedEvent[], now: Date = new Date()): EventSummary {
  const t = now.getTime();
  const within = (e: TrackedEvent, days: number) => t - Date.parse(e.ts) < days * DAY_MS && Date.parse(e.ts) <= t;
  const last7 = events.filter((e) => within(e, 7));
  const last28 = events.filter((e) => within(e, 28));
  const days = (list: TrackedEvent[]) => new Set(list.map((e) => e.ts.slice(0, 10))).size;
  const first = events.length ? Math.min(...events.map((e) => Date.parse(e.ts))) : t;
  const runs28 = last28.filter((e) => e.name === "run_start");

  return {
    activeDays7: days(last7),
    activeDays28: days(last28),
    sessions7: last7.filter((e) => e.name === "session_start").length,
    modes7: [...new Set(last7.map((e) => MODE_OF[e.name]).filter((m): m is string => Boolean(m)))].sort(),
    returnedAfterWeek2: t - first >= 14 * DAY_MS && last7.length > 0,
    dailyCompletions28: last28.filter((e) => e.name === "daily_complete").length,
    replayShare28: runs28.length ? runs28.filter((e) => e.props?.replay === true).length / runs28.length : null,
  };
}
