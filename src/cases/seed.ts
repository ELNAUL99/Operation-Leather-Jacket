/**
 * Deterministic PRNG & Shareable Case Seed Encoder/Decoder
 * Format: PT-88-<WORD>-<XXXX> (e.g. PT-88-VELVET-4092)
 */

const CODEWORDS = [
  'JACKET',
  'VELVET',
  'SILICON',
  'KRAFT',
  'FEDORA',
  'SHADOW',
  'WAFER',
  'CIPHER',
  'NIGHT',
  'PILLOW',
  'GARNET',
  'QUARTZ',
] as const;

export function hashSeedString(seedStr: string): number {
  const normalized = seedStr.trim().toUpperCase();
  let h = 2166136261 >>> 0;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seedInt: number): () => number {
  let a = seedInt >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateShareableSeed(entropy?: number): string {
  const base =
    entropy !== undefined
      ? Math.abs(Math.floor(entropy))
      : Math.floor(Date.now() % 1000000) ^ Math.floor(Math.random() * 999999);
  const rng = mulberry32(base);
  const word = CODEWORDS[Math.floor(rng() * CODEWORDS.length)];
  const num = String(Math.floor(1000 + rng() * 9000));
  return `PT-88-${word}-${num}`;
}

export function normalizeSeed(input?: string): string {
  if (!input || !input.trim()) {
    return generateShareableSeed();
  }
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 28);
  return cleaned.length >= 3 ? cleaned : generateShareableSeed(hashSeedString(cleaned));
}

export function shouldOrbitBeCompromised(seed: string): boolean {
  // Creative Bible rule: in 1 of 3 rounds ORBIT is compromised
  const hash = hashSeedString(seed);
  return hash % 3 === 0;
}
