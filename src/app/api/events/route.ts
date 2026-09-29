import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createRateLimiter } from "@/lib/grading/grade";
import { prisma } from "@/lib/prisma";
import { logLine, sanitizeEvent } from "@/lib/eventSanitize";
import { redactSecrets } from "@/lib/redact";

// Collector for the anonymous events sent by src/lib/events.ts (sendBeacon posts text/plain).
// Every event is sanitised first (allowlisted name, valid id and time, primitive props only, no
// free text or secrets). Accepted events go to the AnalyticsEvent table when DATABASE_URL is set
// and to .data/events.jsonl; stdout only gets the event name and a shortened id, never props.
// Every sink is best-effort: a failing one never fails the beacon.
const allow = createRateLimiter(120, 60_000);
const EVENTS_FILE = path.join(process.cwd(), ".data", "events.jsonl");
const MAX_BODY = 4_000;

/** A database error reduced to something safe to log: Prisma errors can embed query parameters. */
function describeDbError(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  const name = error instanceof Error ? error.name : "Error";
  const firstLine = error instanceof Error ? error.message.trim().split("\n").pop() ?? "" : "";
  return redactSecrets(`${name}${typeof code === "string" ? ` ${code}` : ""}: ${firstLine}`).slice(0, 200);
}

export async function POST(request: Request) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(client)) return new Response(null, { status: 429 });

  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const result = sanitizeEvent(raw);
  if (!result.ok) return new Response(null, { status: 400 });
  const { event } = result;

  console.log(logLine(event));
  if (process.env.DATABASE_URL) {
    try {
      await prisma.analyticsEvent.create({
        data: { anonId: event.anonId, name: event.name, ts: event.ts, props: event.props ?? undefined },
      });
    } catch (error) {
      console.error("[event] database write failed:", describeDbError(error));
    }
  }
  try {
    await mkdir(path.dirname(EVENTS_FILE), { recursive: true });
    const line = JSON.stringify({ anonId: event.anonId, name: event.name, ts: event.ts.toISOString(), props: event.props });
    await appendFile(EVENTS_FILE, `${line}\n`);
  } catch {
    // Read-only filesystem: the log line above is the record.
  }
  return new Response(null, { status: 204 });
}
