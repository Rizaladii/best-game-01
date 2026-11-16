// random.js — a tiny seeded RNG (mulberry32) plus the helpers the game uses.
// Every random choice in LUMEN goes through one of these so a seed fully
// determines a run, which is what makes the ?shot= screenshots reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // float in [min, max)
    range(min, max) { return min + next() * (max - min); },
    // integer in [min, max]
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    // one element of an array
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    // true with probability p
    chance(p) { return next() < p; },
    // angle in radians, uniform over the circle
    angle() { return next() * Math.PI * 2; },
  };
}

// A fast non-seeded RNG for cosmetic sparkle (particles, flicker) that must
// never change gameplay. Gameplay always uses a seeded rng.
export const cosmetic = {
  range(min, max) { return min + Math.random() * (max - min); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
};
