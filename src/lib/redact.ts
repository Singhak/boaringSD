/**
 * Keeps secrets and personal data out of logs and stored events.
 * Applied to anything derived from an upstream error body or from client input.
 */

const PATTERNS: [RegExp, string][] = [
  // Google API keys, OpenAI-style keys, bearer tokens, JWTs.
  [/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]"],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, "[redacted-key]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, "[redacted-jwt]"],
  // key=..., token=..., password=... pairs, in URLs or text.
  [/\b(api[_-]?key|key|token|secret|password|passwd|authorization)\s*[=:]\s*[^\s&"',;]+/gi, "$1=[redacted]"],
  // Database connection strings carry credentials.
  [/\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"']+/gi, "$1://[redacted]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement);
  return out;
}
