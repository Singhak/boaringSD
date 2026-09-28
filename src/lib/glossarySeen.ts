const STORAGE_KEY = "boaring_seen_glossary_terms";

function safeGetStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function safeSetStorage(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage quota errors
  }
}

/** Returns true if the term has already been seen / tapped by the player. */
export function isGlossaryTermSeen(term: string): boolean {
  const seen = safeGetStorage();
  return seen.has(term.toLowerCase());
}

/** Mark a term as seen in local storage so it drops its initial attention highlight. */
export function markGlossaryTermSeen(term: string): void {
  const seen = safeGetStorage();
  seen.add(term.toLowerCase());
  safeSetStorage(seen);
}
