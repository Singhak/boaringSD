import test from "node:test";
import assert from "node:assert/strict";

import { buildDailyReminderIcs } from "./reminder";

test("the reminder is a valid daily-repeating floating-time event with an alert", () => {
  const ics = buildDailyReminderIcs({ hour: 9, url: "https://example.com/daily", now: new Date(2026, 8, 29, 15, 0, 0) });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART:20260929T090000\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY\r\n/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.match(ics, /URL:https:\/\/example.com\/daily/);
});

test("the reminder hour is clamped and text is escaped", () => {
  const ics = buildDailyReminderIcs({ hour: 99, url: "https://example.com/daily", now: new Date(2026, 0, 5) });
  assert.match(ics, /DTSTART:20260105T230000/);
  assert.match(ics, /SUMMARY:Today's outage is waiting/);
  assert.match(ics, /DESCRIPTION:Five minutes\\, one production incident\./);
});
