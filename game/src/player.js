// player.js — the wisp, its light bolts, and the upgrade choices.
// The wisp guards the lighthouse: it moves, aims with the mouse, fires
// bolts, dashes, and grows stronger by spending the light shards shades drop.
import { ARENA, clamp, xpForLevel } from './world.js';

// Every upgrade the level-up screen can offer. Each has a name, a short
// line the card shows, a stack cap, and an apply() that mutates the player.
export const UPGRADES = [
  {
    id: 'rapid', name: 'Rapid Wick', max: 4,
    desc: '+25% fire rate. Your light burns faster.',
    apply(p) { p.fireRate *= 1.25; },
  },
  {
    id: 'bright', name: 'Bright Bolt', max: 4,
    desc: '+30% bolt damage. Every hit lands harder.',
    apply(p) { p.damage *= 1.3; },
  },
  {
    id: 'twin', name: 'Twin Flame', max: 3,
    desc: '+1 bolt per shot. The light fans out.',
    apply(p) { p.multishot += 1; },
  },
  {
    id: 'dash', name: 'Swift Dash', max: 3,
    desc: 'Dash recharges 25% faster.',
    apply(p) { p.dashCdMax *= 0.75; },
  },
  {
    id: 'aegis', name: 'Aegis Glow', max: 4,
    desc: '+25 max HP and heal 25 now.',
    apply(p) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'magnet', name: 'Shard Magnet', max: 3,
    desc: '+60% shard pickup radius.',
    apply(p) { p.magnetR *= 1.6; },
  },
  {
    id: 'mend', name: 'Lighthouse Mend', max: 3,
    desc: 'Repair the lighthouse for 50 HP.',
    apply(p) { p.lightHeal = (p.lightHeal || 0) + 50; },
  },
  {
    id: 'pierce', name: 'Piercing Light', max: 2,
    desc: 'Bolts pierce through +1 shade.',
    apply(p) { p.pierce += 1; },
  },
];

export function makePlayer() {
  return {
    x: ARENA.w / 2, y: ARENA.h / 2 + 150,
    r: 13,
    hp: 100, maxHp: 100,
    speed: 265,
    fireRate: 3.2, damage: 20, multishot: 1, pierce: 0,
    bulletSpeed: 560,
    dashCdMax: 2.6, dashCd: 0,
    dashTime: 0, dashDirX: 0, dashDirY: 0,
    invuln: 0,
    magnetR: 90,
    lightHeal: 0,
    level: 1, xp: 0,
    taken: {},           // upgrade id -> stacks
    aimX: ARENA.w / 2, aimY: 0,
    fireCd: 0,
    moving: false,
  };
}

export function xpNeeded(p) { return xpForLevel(p.level); }

export function gainXp(p, n) {
  p.xp += n;
  let leveled = 0;
  while (p.xp >= xpNeeded(p)) {
    p.xp -= xpNeeded(p);
    p.level += 1;
    leveled += 1;
  }
  return leveled;
}

// Three distinct upgrades the player has not maxed, chosen at random.
export function rollUpgrades(rng, p) {
  const pool = UPGRADES.filter((u) => (p.taken[u.id] || 0) < u.max);
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(p, up) {
  p.taken[up.id] = (p.taken[up.id] || 0) + 1;
  up.apply(p);
}

// Move, dash and fire. Returns newly spawned bullets (possibly empty).
export function updatePlayer(p, dt, input, fireHeld) {
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.aimX = input.mouseX; p.aimY = input.mouseY;

  const mv = input.moveVector();
  p.moving = mv.x !== 0 || mv.y !== 0;

  // Dash: a burst in the current move direction (or aim direction if still).
  if (input.pressed('Shift') && p.dashCd <= 0) {
    let dx = mv.x, dy = mv.y;
    if (dx === 0 && dy === 0) {
      const ax = p.aimX - p.x, ay = p.aimY - p.y;
      const d = Math.hypot(ax, ay) || 1;
      dx = ax / d; dy = ay / d;
    }
    p.dashDirX = dx; p.dashDirY = dy;
    p.dashTime = 0.16;
    p.dashCd = p.dashCdMax;
    p.invuln = Math.max(p.invuln, 0.3);
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashDirX * 780 * dt;
    p.y += p.dashDirY * 780 * dt;
  } else if (p.moving) {
    p.x += mv.x * p.speed * dt;
    p.y += mv.y * p.speed * dt;
  }
  p.x = clamp(p.x, 24, ARENA.w - 24);
  p.y = clamp(p.y, 24, ARENA.h - 24);

  // Fire while the mouse button or Space is held.
  const bullets = [];
  if (fireHeld && p.fireCd <= 0) {
    p.fireCd = 1 / p.fireRate;
    const ax = p.aimX - p.x, ay = p.aimY - p.y;
    const base = Math.atan2(ay, ax);
    const spread = 0.14;
    for (let i = 0; i < p.multishot; i++) {
      const off = (i - (p.multishot - 1) / 2) * spread;
      bullets.push({
        x: p.x + Math.cos(base) * 18, y: p.y + Math.sin(base) * 18,
        vx: Math.cos(base + off) * p.bulletSpeed,
        vy: Math.sin(base + off) * p.bulletSpeed,
        dmg: p.damage, pierce: p.pierce, hitIds: new Set(),
        life: 1.1, r: 5,
      });
    }
  }
  return bullets;
}

export function hurtPlayer(p, dmg) {
  if (p.invuln > 0) return false;
  p.hp -= dmg;
  p.invuln = 0.55;
  return p.hp <= 0;
}
