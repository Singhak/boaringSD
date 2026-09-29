/**
 * Opt-in daily reminder as a calendar file. It needs no account, server or push
 * permission: the learner's own calendar app fires the alert, on any device.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Escapes text per RFC 5545. */
function icsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * A repeating daily event at a local wall-clock time (a "floating" time, so it
 * follows the learner across time zones), with an alert at the start.
 */
export function buildDailyReminderIcs(options: { hour: number; url: string; now?: Date; uid?: string }): string {
  const hour = Math.min(23, Math.max(0, Math.floor(options.hour)));
  const now = options.now ?? new Date();
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BoaringSD//Daily Outage//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${options.uid ?? "boaringsd-daily-outage"}@boaringsd`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${day}T${pad(hour)}0000`,
    "DURATION:PT10M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:${icsText("Today's outage is waiting")}`,
    `DESCRIPTION:${icsText(`Five minutes, one production incident. Keep your streak alive: ${options.url}`)}`,
    `URL:${options.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText("Today's outage is waiting")}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
