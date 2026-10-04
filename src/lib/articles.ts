// Blog articles live as markdown files in /content/articles. Server-only (reads the filesystem).
import fs from "node:fs";
import path from "node:path";

export interface ArticleMeta {
  slug: string;
  title: string;
  summary: string;
  topic: string;
  tags: string[];
  date: string;
  /** Matching Instagram post folder under insta/posts, if any. */
  post?: string;
}

export interface Article extends ArticleMeta {
  body: string;
}

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

/** Splits `--- key: value ---` frontmatter from the markdown body. No YAML dependency needed. */
export function parseArticle(slug: string, raw: string): Article {
  const text = raw.replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fields: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return {
    slug,
    title: fields.title || slug,
    summary: fields.summary || "",
    topic: fields.topic || "General",
    tags: (fields.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    date: fields.date || "",
    post: fields.post || undefined,
    body: (m ? m[2] : text).trim(),
  };
}

export function getAllArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseArticle(f.replace(/\.md$/, ""), fs.readFileSync(path.join(ARTICLES_DIR, f), "utf8")))
    .sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

export function getArticle(slug: string): Article | undefined {
  return getAllArticles().find((a) => a.slug === slug);
}

export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).length / 200));
}
