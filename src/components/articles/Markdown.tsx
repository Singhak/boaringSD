import React from "react";

// Small markdown renderer for our own articles: headings, paragraphs, lists, code blocks,
// blockquotes, **bold**, `code`. No raw HTML is ever emitted, so content cannot inject markup.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2)
      return (
        <code key={key} className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-200">
          {p.slice(1, -1)}
        </code>
      );
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
      return (
        <strong key={key} className="font-semibold text-white">
          {p.slice(2, -2)}
        </strong>
      );
    return <React.Fragment key={key}>{p}</React.Fragment>;
  });
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(
        <pre key={key} className="my-5 overflow-x-auto rounded-xl border border-[var(--line-strong)] bg-black/40 p-4 font-mono text-sm leading-relaxed text-sky-200">
          {buf.join("\n")}
        </pre>,
      );
    } else if (/^###\s/.test(line)) {
      out.push(<h3 key={key} className="mt-8 mb-2 text-lg font-semibold text-white">{inline(line.slice(4), key)}</h3>);
      i++;
    } else if (/^##\s/.test(line)) {
      out.push(<h2 key={key} className="mt-10 mb-3 text-2xl font-bold tracking-tight text-white">{inline(line.slice(3), key)}</h2>);
      i++;
    } else if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(
        <blockquote key={key} className="my-6 rounded-r-xl border-l-4 border-cyan-400 bg-cyan-400/[0.07] px-5 py-4 text-lg text-slate-100">
          {inline(buf.join(" "), key)}
        </blockquote>,
      );
    } else if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s/, ""));
      out.push(
        <ul key={key} className="my-4 list-disc space-y-2 pl-6 marker:text-cyan-400">
          {items.map((t, n) => <li key={n}>{inline(t, `${key}-${n}`)}</li>)}
        </ul>,
      );
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s/, ""));
      out.push(
        <ol key={key} className="my-4 list-decimal space-y-2 pl-6 marker:text-cyan-400">
          {items.map((t, n) => <li key={n}>{inline(t, `${key}-${n}`)}</li>)}
        </ol>,
      );
    } else if (line.trim() === "") {
      i++;
    } else {
      const buf: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(```|#{2,3}\s|>\s?|\s*[-*]\s|\d+\.\s)/.test(lines[i])
      )
        buf.push(lines[i++]);
      out.push(<p key={key} className="my-4">{inline(buf.join(" "), key)}</p>);
    }
  }

  return <div className="text-[17px] leading-8 text-slate-300">{out}</div>;
}
