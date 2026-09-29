import test from "node:test";
import assert from "node:assert/strict";

import { logLine, sanitizeEvent, sanitizeProps } from "./eventSanitize";
import { redactSecrets } from "./redact";

const NOW = Date.parse("2026-09-29T12:00:00Z");
const ID = "d1b08c48-04f7-445c-83b6-fa255dc28555";
const good = { anonId: ID, name: "run_complete", ts: "2026-09-29T11:59:00Z", props: { patternId: "caching", firstTry: true, hintsUsed: 0 } };

test("a well-formed event passes unchanged", () => {
  const r = sanitizeEvent(good, NOW);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.event.name, "run_complete");
    assert.deepEqual(r.event.props, { patternId: "caching", firstTry: true, hintsUsed: 0 });
  }
});

test("unknown events, bad ids and bad times are rejected", () => {
  assert.equal(sanitizeEvent({ ...good, name: "drop_table" }, NOW).ok, false);
  assert.equal(sanitizeEvent({ ...good, name: "__proto__" }, NOW).ok, false);
  assert.equal(sanitizeEvent({ ...good, anonId: "short" }, NOW).ok, false);
  assert.equal(sanitizeEvent({ ...good, anonId: "x".repeat(200) }, NOW).ok, false);
  assert.equal(sanitizeEvent({ ...good, ts: "yesterday-ish" }, NOW).ok, false);
  assert.equal(sanitizeEvent({ ...good, ts: "2026-10-30T00:00:00Z" }, NOW).ok, false, "future");
  assert.equal(sanitizeEvent({ ...good, ts: "2025-01-01T00:00:00Z" }, NOW).ok, false, "too old");
  assert.equal(sanitizeEvent(null, NOW).ok, false);
});

test("props keep only short primitive values under safe key names", () => {
  const props = sanitizeProps({
    ok: "fine",
    weekKey: "2026-W40",
    nested: { a: 1 },
    list: [1, 2],
    answer: "my free text reply",
    email: "a@b.com",
    "bad key": 1,
    apiKey: "AIzaSyA1234567890123456789012345678901",
    big: "x".repeat(500),
    inf: Infinity,
    n: 4,
  });
  assert.equal(props?.ok, "fine");
  assert.equal(props?.weekKey, "2026-W40");
  assert.equal(props?.n, 4);
  for (const dropped of ["nested", "list", "answer", "email", "bad key", "apiKey", "inf"]) {
    assert.ok(!(dropped in (props ?? {})), dropped);
  }
  assert.ok(props?.big === "[redacted]" || String(props?.big).length <= 64);
});

test("secrets and personal data inside allowed values are redacted", () => {
  const props = sanitizeProps({
    ref: "mail me at jo@example.com",
    who: "Bearer abcdefgh12345678",
    jwt: "eyJhbGciOi.eyJzdWIiOiIx.SflKxwRJSMeKKF2QT4",
  });
  assert.equal(props?.ref, "mail me at [email]");
  assert.match(String(props?.who), /Bearer \[redacted\]/);
  assert.equal(props?.jwt, "[redacted-jwt]");
  assert.equal(sanitizeProps({ blob: "a".repeat(40) })?.blob, "[redacted]");
  assert.equal(sanitizeProps({ sessionToken: "short" }), null, "credential-looking names are dropped");
  assert.equal(sanitizeProps({ a: {} }), null);
});

test("the stdout log line carries only the event name and a short id", () => {
  const r = sanitizeEvent(good, NOW);
  assert.ok(r.ok);
  if (r.ok) {
    const line = logLine(r.event);
    assert.equal(line, "[event] run_complete d1b08c48");
    assert.ok(!line.includes("caching"));
  }
});

test("redactSecrets strips keys, credentials in URLs and connection strings", () => {
  assert.equal(redactSecrets("key AIzaSyA1234567890123456789012345678901 bad"), "key [redacted-key] bad");
  assert.match(redactSecrets("https://x/y?key=abc123&z=1"), /key=\[redacted\]&z=1/);
  assert.equal(redactSecrets("connect postgresql://u:p@host:5432/db failed"), "connect postgresql://[redacted] failed");
  assert.equal(redactSecrets("plain message"), "plain message");
});
