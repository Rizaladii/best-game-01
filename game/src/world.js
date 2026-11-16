// world.js — the arena, the lighthouse, and the wave director.
// LUMEN is played in one fixed arena: the last lighthouse stands at the
// centre, shades spawn at the edges, and waves escalate to a boss on wave 10.
export const ARENA = { w: 1280, h: 720 };
export const LIGHTHOUSE = { x: ARENA.w / 2, y: ARENA.h / 2, r: 34, maxHp: 200 };
export const TOTAL_WAVES = 10;

export const WAVE_CLEAR_HEAL = 15;

// How many shades a wave throws at the player, and the mix by wave.
// count grows; faster and tougher kinds join as the waves go on.
export function wavePlan(n) {
  const count = 6 + n * 3;
  const mix = { drifter: 1.0, skitter: 0, bulwark: 0, splitter: 0 };
  if (n >= 2) { mix.skitter = 0.22; mix.drifter -= 0.22; }
  if (n >= 3) { mix.bulwark = 0.14; mix.drifter -= 0.14; }
  if (n >= 4) { mix.splitter = 0.16; mix.drifter -= 0.16; }
  if (n >= 7) { mix.skitter = 0.3; mix.bulwark = 0.2; mix.splitter = 0.2; mix.drifter = 0.3; }
  return { count, mix, boss: n === TOTAL_WAVES };
}

// Pick a shade kind for one spawn of wave n, using the wave's mix.
export function pickKind(rng, n) {
  const { mix } = wavePlan(n);
  const roll = rng.next();
  let acc = 0;
  for (const kind of ['drifter', 'skitter', 'bulwark', 'splitter']) {
    acc += mix[kind];
    if (roll < acc) return kind;
  }
  return 'drifter';
}

// A spawn point just outside one edge of the arena, away from the player.
export function spawnPoint(rng, player) {
  const m = 40;
  const edge = rng.int(0, 3);
  let x, y;
  if (edge === 0) { x = rng.range(0, ARENA.w); y = -m; }
  else if (edge === 1) { x = ARENA.w + m; y = rng.range(0, ARENA.h); }
  else if (edge === 2) { x = rng.range(0, ARENA.w); y = ARENA.h + m; }
  else { x = -m; y = rng.range(0, ARENA.h); }
  // If it landed too close to the player, mirror it to the far side.
  const dx = x - player.x, dy = y - player.y;
  if (dx * dx + dy * dy < 260 * 260) { x = ARENA.w - x; y = ARENA.h - y; }
  return { x, y };
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// XP needed to go from level L to L+1.
export function xpForLevel(level) {
  return 4 + Math.floor(level * 2.2 + (level * level) / 3);
}
