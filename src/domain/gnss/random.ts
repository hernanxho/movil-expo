export type Rng = () => number;

/** Generador pseudoaleatorio con semilla (mulberry32): misma semilla, mismos resultados. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número con distribución normal (Box-Muller). */
export function gaussian(rng: Rng, sigma = 1): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
