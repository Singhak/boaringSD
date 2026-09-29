import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

interface Row {
  anonId: string;
  name: string;
  ts: Date;
}

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_KEY;
  if (!secret || key !== secret) {
    return (
      <main className="mx-auto max-w-xl p-8 text-slate-300">
        <h1 className="text-xl font-bold text-white">Not available</h1>
        <p className="mt-2 text-sm">Set ADMIN_KEY on the server and open this page with ?key=&lt;ADMIN_KEY&gt;.</p>
      </main>
    );
  }

  const since = new Date(Date.now() - 28 * DAY);
  const rows: Row[] = await prisma.analyticsEvent.findMany({
    where: { ts: { gte: since } },
    select: { anonId: true, name: true, ts: true },
  });

  const learners = new Map<string, { days: Set<string>; first: number; last: number; events: number }>();
  const byName = new Map<string, number>();
  for (const r of rows) {
    const l = learners.get(r.anonId) ?? { days: new Set<string>(), first: Infinity, last: 0, events: 0 };
    l.days.add(r.ts.toISOString().slice(0, 10));
    l.first = Math.min(l.first, r.ts.getTime());
    l.last = Math.max(l.last, r.ts.getTime());
    l.events++;
    learners.set(r.anonId, l);
    byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
  }

  const now = Date.now();
  const all = [...learners.values()];
  const active7 = all.filter((l) => now - l.last < 7 * DAY).length;
  const returned = all.filter((l) => l.days.size >= 2).length;
  const oneAndDone = all.filter((l) => l.days.size === 1).length;
  const pct = (n: number) => (all.length ? `${Math.round((n / all.length) * 100)}%` : "-");

  const stats: [string, string][] = [
    ["Learners (28d)", String(all.length)],
    ["Active in last 7d", String(active7)],
    ["Came back on a 2nd day", `${returned} (${pct(returned)})`],
    ["One day only", `${oneAndDone} (${pct(oneAndDone)})`],
  ];

  return (
    <main className="mx-auto max-w-3xl p-8 text-slate-200">
      <h1 className="text-2xl font-bold text-white">Learner events, last 28 days</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 p-3">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="mt-1 text-lg font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-sm font-semibold text-slate-400">Events by type</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {[...byName].sort((a, b) => b[1] - a[1]).map(([name, n]) => (
            <tr key={name} className="border-t border-white/10">
              <td className="py-1.5">{name}</td>
              <td className="py-1.5 text-right tabular-nums">{n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
