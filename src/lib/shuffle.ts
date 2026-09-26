/** Stable 32-bit string hash, used to seed deterministic shuffles. */
export function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Fisher–Yates shuffle driven by a seeded LCG. The same seed always yields the
 * same order, so options stay put during an attempt but move between attempts.
 */
export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  let hash = hashSeed(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 9301 + 49297) % 233280;
    const j = Math.floor((Math.abs(hash) / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
