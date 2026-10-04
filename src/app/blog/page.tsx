import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getAllArticles, readingMinutes } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Blog | BoaringSD",
  description: "Short, practical system-design articles on Redis, databases and caching, written as interview answers.",
};

export default function BlogIndexPage() {
  const articles = getAllArticles();

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Blog</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">System design, explained</h1>
        <p className="mt-3 text-lg text-slate-400">Redis and database concepts as clear interview answers, with the trade-offs.</p>

        <div className="mt-10 flex flex-col gap-4">
          {articles.length === 0 && <p className="text-slate-500">No articles yet.</p>}
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 transition hover:border-cyan-400/50 hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 font-semibold text-cyan-300">{a.topic}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{readingMinutes(a.body)} min read</span>
                <span>{a.date}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{a.title}</h2>
              <p className="mt-2 text-slate-400">{a.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan-300">
                Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
