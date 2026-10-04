---
name: insta-post
description: Turn a Redis or database system-design question and its answer into an Instagram carousel post (1080x1350 PNG slides + caption), saved in its own folder under insta/posts. Use for /insta-post, "make a post", "turn this into a post", or when the user asks a system-design learning question and wants it as a post.
---

# insta-post

Answer the user's question, then package the answer as an Instagram carousel.

## Steps
1. Always show the FULL answer in chat first (detailed, accurate, interview-oriented, with the why and trade-offs), so the user can read it properly and ask cross questions. End with 2 or 3 likely cross questions.
   - Cross questions are welcome. Each follow-up gets its own full answer in chat and can become its own post (`parent` noted in INDEX.md) when the user asks. Do not render a post until the user says to, unless they asked for a post in the same message.
2. Pick the next number: list `insta/posts/`, take the highest `NNN` + 1. Slug = short kebab-case of the topic.
3. Save the full answer as a blog article: `content/articles/NNN-slug.md` with frontmatter (`title`, `summary`, `topic`, `tags` comma-separated, `date` YYYY-MM-DD, `post` = the post folder name). Body uses `##` headings, bullets, fenced code, `>` quote for the interview one-liner, and a closing 'Cross questions to expect' list. It shows in the app at `/blog/NNN-slug`. Cross-question articles get their own file.
4. Create `insta/posts/NNN-slug/` with:
   - `content.json` (slides, see schema)
   - `caption.md` (hook line, short numbered recap, CTA "Save this", "Full article: link in bio", 8-10 hashtags)
5. Render: `node insta/render.mjs insta/posts/NNN-slug` (needs Chrome or Edge, no npm deps). Output goes to `slides/01.png...`.
6. Read 2 or 3 PNGs to check for overflow or clipping. Shorten text and re-render if needed.
7. Add a row to `insta/posts/INDEX.md` (number, title, status `draft`).
8. Tell the user the folder path. Never mark `posted` unless they say so.

## Slide structure (6-9 slides)
Hook question or bold claim, problem, concept (one idea per slide), diagram or code, trade-offs or pitfalls, one-line interview answer, CTA or "next post" teaser.

## content.json schema
```json
{ "handle": "@singhak06", "slides": [ { "type": "hook", "kicker": "...", "title": "...", "text": "...", "bullets": ["..."], "flow": ["box", "*highlighted box"], "cols": [{"title":"","text":""}], "code": "...", "big": "..." } ] }
```
All fields optional per slide. `**bold**` and `` `code` `` work in text. Keep to about 4 bullets of 12 words or fewer, and one idea per slide. Large text is intentional because it is read on a phone.

## Rules
- Facts must be correct. State version caveats (e.g. Redis 6+ I/O threads).
- Plain, simple English unless the user says otherwise. No filler.
- Keep the visual style from `render.mjs` for consistency across posts.
- Topic list lives in `docs/system-design-topics.md`.
