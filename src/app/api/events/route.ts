import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createRateLimiter } from "@/lib/grading/grade";
import { prisma } from "@/lib/prisma";

// Collector for the anonymous events sent by src/lib/events.ts (sendBeacon posts text/plain).
// Each accepted event goes to the AnalyticsEvent table when DATABASE_URL is set, and always to
// stdout plus .data/events.jsonl. Every sink is best-effort: a failing one never fails the beacon.
const allow = createRateLimiter(120, 60_000);
const EVENTS_FILE = path.join(process.cwd(), ".data", "events.jsonl");
const MAX_BODY = 4_000;

export async function POST(request: Request) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(client)) return new Response(null, { status: 429 });

  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });

  let body: { anonId?: unknown; name?: unknown; ts?: unknown; props?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body.anonId !== "string" || typeof body.name !== "string" || typeof body.ts !== "string") {
    return new Response(null, { status: 400 });
  }

  const ts = new Date(body.ts);
  if (Number.isNaN(ts.getTime())) return new Response(null, { status: 400 });

  const line = JSON.stringify({ anonId: body.anonId, name: body.name, ts: body.ts, props: body.props ?? null });
  console.log(`[event] ${line}`);
  if (process.env.DATABASE_URL) {
    try {
      await prisma.analyticsEvent.create({
        data: { anonId: body.anonId, name: body.name, ts, props: (body.props as object | null) ?? undefined },
      });
    } catch (error) {
      console.error("[event] database write failed", error);
    }
  }
  try {
    await mkdir(path.dirname(EVENTS_FILE), { recursive: true });
    await appendFile(EVENTS_FILE, `${line}\n`);
  } catch {
    // Read-only filesystem: the log line above is the record.
  }
  return new Response(null, { status: 204 });
}
