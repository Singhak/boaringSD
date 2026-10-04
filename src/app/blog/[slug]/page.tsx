import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Markdown from "@/components/articles/Markdown";
import { getAllArticles, getArticle, readingMinutes } from "@/lib/articles";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return { title: `${article.title} | BoaringSD`, description: article.summary };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 font-semibold text-cyan-300">{article.topic}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{readingMinutes(article.body)} min read</span>
          <span>{article.date}</span>
        </div>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-white">{article.title}</h1>
        <p className="mt-3 text-lg text-slate-400">{article.summary}</p>

        <div className="mt-6 border-t border-[var(--line)] pt-2">
          <Markdown source={article.body} />
        </div>

        {article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--line)] pt-6">
            {article.tags.map((t) => (
              <span key={t} className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs text-slate-400">#{t}</span>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
