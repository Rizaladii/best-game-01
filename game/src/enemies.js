// enemies.js — the Shades and the Umbral King.
// Shades drift in from the dark and hunt the nearer of the wisp or the
// lighthouse. Each kind has its own body, speed, damage and score value;
// the boss is a wave-10 event that spawns its own drifters.
import { ARENA, dist2 } from './world.js';

export const KINDS = {
  drifter: { hp: 30, speed: 58, dmg: 8, r: 14, score: 10, shards: 1, color: '#8b7ff0', glow: '#b7aefc' },
  skitter: { hp: 18, speed: 118, dmg: 6, r: 11, score: 15, shards: 1, color: '#e07ff0', glow: '#f2aefc' },
  bulwark: { hp: 130, speed: 32, dmg: 16, r: 23, score: 30, shards: 3, color: '#5f6fd8', glow: '#93a5f5' },
  splitter: { hp: 44, speed: 62, dmg: 10, r: 16, score: 25, shards: 2, color: '#7fe0c3', glow: '#b2f2df' },
  boss: { hp: 1250, speed: 30, dmg: 25, r: 48, score: 500, shards: 20, color: '#d84a6f', glow: '#ff8fae' },
};

let nextId = 1;

export function makeShade(kind, x, y, wave) {
  const base = KINDS[kind];
  const hpScale = 1 + (wave - 1) * 0.16;
  return {
    id: nextId++, kind,
    x, y, r: base.r,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    speed: base.speed * (0.92 + Math.random() * 0.16),
    dmg: base.dmg,
    score: base.score,
    shards: base.shards,
    color: base.color, glow: base.glow,
    attackCd: 0,
    flash: 0,           // hit flash timer
    wobble: Math.random() * Math.PI * 2,
    spawnT: 0,          // spawn-in animation timer
    spawnTimer: 0,      // boss: time until next minion spawn
    touchCd: 0,
  };
}

// Steer toward the nearer of the player and the lighthouse, with a wobble
// so the horde does not march in a single straight line.
export function updateShade(e, dt, player, lighthouse) {
  e.flash = Math.max(0, e.flash - dt);
  e.attackCd = Math.max(0, e.attackCd - dt);
  e.touchCd = Math.max(0, e.touchCd - dt);
  e.spawnT += dt;
  e.wobble += dt * 2.2;
  const dPlayer = dist2(e.x, e.y, player.x, player.y);
  const dLight = dist2(e.x, e.y, lighthouse.x, lighthouse.y);
  const tx = dPlayer < dLight ? player.x : lighthouse.x;
  const ty = dPlayer < dLight ? player.y : lighthouse.y;
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const wob = Math.sin(e.wobble) * 0.35;
  const nx = dx / d, ny = dy / d;
  // Perpendicular wobble.
  const vx = (nx - ny * wob) * e.speed;
  const vy = (ny + nx * wob) * e.speed;
  e.x += vx * dt;
  e.y += vy * dt;
  // Keep shades inside a generous margin so they can reach the edges.
  e.x = Math.max(-60, Math.min(ARENA.w + 60, e.x));
  e.y = Math.max(-60, Math.min(ARENA.h + 60, e.y));
  return { targetPlayer: dPlayer < dLight };
}

export function shadeTakesHit(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.12;
  return e.hp <= 0;
}

// The boss calls for help: every few seconds it summons two drifters.
export function bossMinions(e, dt, wave) {
  e.spawnTimer -= dt;
  if (e.spawnTimer <= 0) {
    e.spawnTimer = 6;
    return true;
  }
  return false;
}
