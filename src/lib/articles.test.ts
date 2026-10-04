import assert from "node:assert/strict";
import test from "node:test";
import { parseArticle, readingMinutes } from "./articles";

test("parseArticle reads frontmatter and body", () => {
  const a = parseArticle("x", "---\ntitle: Hello\ntopic: Redis\ntags: a, b\ndate: 2026-01-02\n---\n\n## Hi\ntext\n");
  assert.equal(a.title, "Hello");
  assert.equal(a.topic, "Redis");
  assert.deepEqual(a.tags, ["a", "b"]);
  assert.equal(a.body, "## Hi\ntext");
});

test("parseArticle copes with CRLF and missing frontmatter", () => {
  const a = parseArticle("slug", "just text\r\nmore");
  assert.equal(a.title, "slug");
  assert.equal(a.body, "just text\nmore");
});

test("readingMinutes is at least 1", () => {
  assert.equal(readingMinutes("short"), 1);
  assert.equal(readingMinutes("word ".repeat(600)), 3);
});
