// main.js — LUMEN's loop, state machine, wave director and collisions.
// Phases: title → playing ⇄ levelup → win / lose, with pause and restart.
// ?shot=start|play|levelup|win|lose&seed=N renders one fixed scene for
// screenshots instead of running the loop.
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { makeRng } from './random.js';
import { ARENA, LIGHTHOUSE, TOTAL_WAVES, WAVE_CLEAR_HEAL, wavePlan, pickKind, spawnPoint, dist2, xpForLevel } from './world.js';
import { makeShade, updateShade, shadeTakesHit, bossMinions } from './enemies.js';
import { makePlayer, gainXp, rollUpgrades, applyUpgrade, updatePlayer, hurtPlayer } from './player.js';
import { createRenderer } from './render.js';

const canvas = document.getElementById('game');
canvas.width = ARENA.w;
canvas.height = ARENA.h;
const renderer = createRenderer(canvas);
const input = new Input(canvas);
const sound = new SoundBank();
const statusEl = document.getElementById('status');

function loadBest() {
  try { return Number(localStorage.getItem('lumen-best') || 0) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('lumen-best', String(v)); } catch { /* offline play: ignore */ }
}

function freshState(seed) {
  const rng = makeRng(seed);
  const player = makePlayer();
  return {
    seed, rng,
    phase: 'title',
    time: 0, playTime: 0,
    player,
    enemies: [], bullets: [], shards: [], particles: [], texts: [],
    wave: 0, score: 0, kills: 0,
    lighthouseHp: LIGHTHOUSE.maxHp,
    banner: '', bannerT: 0,
    spawnQueue: [], spawnTimer: 0, breather: 0,
    pendingLevels: 0, levelChoices: [], levelCards: [],
    mouseX: ARENA.w / 2, mouseY: ARENA.h / 2,
    stats: null,
    best: loadBest(),
    xpNeed: xpForLevel(1),
    boss: null,
  };
}

let g = freshState(1);

function burst(x, y, color, n, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    g.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
      color, size: 2 + Math.random() * 3,
    });
  }
}

// Seeded burst for the ?shot= scenes, so a screenshot renders identically
// on every load. Live play uses burst() above (cosmetic randomness only).
function burstSeeded(rng, x, y, color, n, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = rng.angle();
    const v = speed * (0.3 + rng.next() * 0.7);
    g.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.6, maxLife: 0.9,
      color, size: 2 + rng.next() * 3,
    });
  }
}

function floatText(x, y, text, color) {
  g.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

function setBanner(text, dur = 2.2) {
  g.banner = text;
  g.bannerT = dur;
}

function startWave(n) {
  g.wave = n;
  const plan = wavePlan(n);
  g.spawnQueue = [];
  for (let i = 0; i < plan.count; i++) g.spawnQueue.push(pickKind(g.rng, n));
  g.spawnTimer = 0.5;
  g.boss = null;
  setBanner(n === TOTAL_WAVES ? 'FINAL WAVE — THE UMBRAL KING' : `WAVE ${n}`);
  sound.waveHorn();
  if (plan.boss) {
    const p = spawnPoint(g.rng, g.player);
    const boss = makeShade('boss', p.x, p.y, n);
    g.enemies.push(boss);
    g.boss = boss;
    sound.bossRoar();
  }
  statusEl.textContent = `Wave ${n} of ${TOTAL_WAVES}.`;
}

function spawnOne() {
  const kind = g.spawnQueue.shift();
  if (!kind) return;
  const p = spawnPoint(g.rng, g.player);
  g.enemies.push(makeShade(kind, p.x, p.y, g.wave));
}

function dropShards(e) {
  for (let i = 0; i < e.shards; i++) {
    const a = Math.random() * Math.PI * 2;
    g.shards.push({
      x: e.x + Math.cos(a) * 10, y: e.y + Math.sin(a) * 10,
      vx: Math.cos(a) * 40, vy: Math.sin(a) * 40,
      bob: Math.random() * Math.PI * 2,
    });
  }
}

function killShade(e, idx) {
  g.enemies.splice(idx, 1);
  g.kills += 1;
  g.score += e.score;
  burst(e.x, e.y, e.glow, e.kind === 'boss' ? 40 : 12, e.kind === 'boss' ? 260 : 160);
  floatText(e.x, e.y - e.r - 6, `+${e.score}`, '#ffe9a3');
  sound.shadeDie();
  dropShards(e);
  if (e.kind === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const m = makeShade('drifter', e.x + (i === 0 ? -14 : 14), e.y, g.wave);
      m.spawnT = 0.4;
      g.enemies.push(m);
    }
  }
  if (e.kind === 'boss') {
    burst(e.x, e.y, '#ffd166', 50, 320);
    g.score += 100;
  }
}

function openLevelUp() {
  g.levelChoices = rollUpgrades(g.rng, g.player);
  if (g.levelChoices.length === 0) { g.pendingLevels = 0; g.phase = 'playing'; return; }
  g.phase = 'levelup';
  sound.levelUp();
  statusEl.textContent = `Level ${g.player.level}. Choose an upgrade.`;
}

function chooseUpgrade(i) {
  const up = g.levelChoices[i];
  if (!up) return;
  applyUpgrade(g.player, up);
  if (up.id === 'mend' && g.player.lightHeal > 0) {
    g.lighthouseHp = Math.min(LIGHTHOUSE.maxHp, g.lighthouseHp + g.player.lightHeal);
    g.player.lightHeal = 0;
    floatText(LIGHTHOUSE.x, LIGHTHOUSE.y - 70, '+LIGHTHOUSE', '#ffd166');
  }
  sound.click();
  g.pendingLevels -= 1;
  if (g.pendingLevels > 0) {
    g.levelChoices = rollUpgrades(g.rng, g.player);
    if (g.levelChoices.length === 0) { g.pendingLevels = 0; g.phase = 'playing'; }
  } else {
    g.phase = 'playing';
  }
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function endGame(won) {
  g.phase = won ? 'win' : 'lose';
  g.stats = {
    score: g.score, waves: won ? TOTAL_WAVES : Math.max(0, g.wave - 1),
    kills: g.kills, time: fmtTime(g.playTime), level: g.player.level,
  };
  if (g.score > g.best) { g.best = g.score; saveBest(g.best); }
  if (won) sound.win(); else sound.lose();
  statusEl.textContent = won ? 'Victory! The light holds.' : 'Defeat. The light fades.';
}

function restart() {
  const seed = (g.seed + 1) >>> 0;
  const best = g.best;
  g = freshState(seed);
  g.best = best;
  g.phase = 'playing';
  startWave(1);
  sound.click();
}

function startGame() {
  g = freshState((g.seed + 1) >>> 0);
  g.best = loadBest();
  g.phase = 'playing';
  sound.unlock();
  startWave(1);
}

// ---- per-frame update -------------------------------------------------------
function update(dt) {
  g.time += dt;
  g.bannerT = Math.max(0, g.bannerT - dt);
  const p = g.player;

  if (g.phase === 'playing') {
    g.playTime += dt;
    g.xpNeed = xpForLevel(p.level);

    // Player movement, dash and firing.
    const fireHeld = input.mouseDown || input.down(' ');
    const newBullets = updatePlayer(p, dt, input, fireHeld);
    if (newBullets.length > 0) {
      g.bullets.push(...newBullets);
      sound.shoot();
    }

    // Wave director: trickle the queue in, then wait for the clear.
    if (g.spawnQueue.length > 0) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        spawnOne();
        if (g.wave >= 5 && g.spawnQueue.length > 0) spawnOne();
        g.spawnTimer = Math.max(0.35, 1.15 - g.wave * 0.06);
      }
    } else if (g.enemies.length === 0) {
      if (g.breather <= 0) {
        // Wave cleared.
        g.score += 50 * g.wave;
        p.hp = Math.min(p.maxHp, p.hp + WAVE_CLEAR_HEAL);
        if (g.wave >= TOTAL_WAVES) { endGame(true); return; }
        setBanner(`WAVE ${g.wave} CLEARED  +${50 * g.wave}`);
        g.breather = 3.2;
      } else {
        g.breather -= dt;
        if (g.breather <= 0) startWave(g.wave + 1);
      }
    }

    // Bullets fly and hit.
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA.w + 20 || b.y < -20 || b.y > ARENA.h + 20) {
        g.bullets.splice(i, 1); continue;
      }
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (b.hitIds.has(e.id)) continue;
        const rr = e.r + b.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          b.hitIds.add(e.id);
          b.pierce -= 1;
          const dead = shadeTakesHit(e, b.dmg);
          burst(b.x, b.y, e.glow, 4, 90);
          sound.hit();
          if (dead) killShade(e, j);
          if (b.pierce < 0) { g.bullets.splice(i, 1); }
          break;
        }
      }
    }

    // Shades hunt, attack, and the boss summons help.
    for (let j = g.enemies.length - 1; j >= 0; j--) {
      const e = g.enemies[j];
      const { targetPlayer } = updateShade(e, dt, p, LIGHTHOUSE);
      e.tx = targetPlayer ? p.x - e.x : LIGHTHOUSE.x - e.x;
      e.ty = targetPlayer ? p.y - e.y : LIGHTHOUSE.y - e.y;
      if (e.kind === 'boss' && bossMinions(e, dt, g.wave)) {
        for (let k = 0; k < 2; k++) {
          const m = makeShade('drifter', e.x + (k === 0 ? -50 : 50), e.y + 20, g.wave);
          m.spawnT = 0.4;
          g.enemies.push(m);
        }
        burst(e.x, e.y, '#d84a6f', 16, 120);
      }
      const tr = targetPlayer ? p.r : LIGHTHOUSE.r;
      const rr = e.r + tr - 3;
      if (dist2(e.x, e.y, targetPlayer ? p.x : LIGHTHOUSE.x, targetPlayer ? p.y : LIGHTHOUSE.y) < rr * rr) {
        if (e.attackCd <= 0) {
          e.attackCd = 0.9;
          if (targetPlayer) {
            if (hurtPlayer(p, e.dmg)) { endGame(false); return; }
            sound.hurt();
            burst(p.x, p.y, '#ff5a5a', 10, 140);
          } else {
            g.lighthouseHp -= e.dmg;
            burst(LIGHTHOUSE.x, LIGHTHOUSE.y - 20, '#ffb14a', 8, 120);
            if (g.lighthouseHp <= 0) { g.lighthouseHp = 0; endGame(false); return; }
          }
        }
      }
    }

    // Shards drift, magnetise, and feed XP.
    for (let i = g.shards.length - 1; i >= 0; i--) {
      const s = g.shards[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= 0.92; s.vy *= 0.92;
      const d2 = dist2(s.x, s.y, p.x, p.y);
      if (d2 < p.magnetR * p.magnetR) {
        const d = Math.sqrt(d2) || 1;
        const pull = 520 * (1 - d / (p.magnetR + 60));
        s.x += ((p.x - s.x) / d) * pull * dt;
        s.y += ((p.y - s.y) / d) * pull * dt;
      }
      if (d2 < (p.r + 12) * (p.r + 12)) {
        g.shards.splice(i, 1);
        sound.shard();
        const leveled = gainXp(p, 1);
        if (leveled > 0) {
          g.pendingLevels += leveled;
          burst(p.x, p.y, '#8b7ff0', 14, 180);
          openLevelUp();
          return;
        }
      }
    }
  }

  // Particles and floating text always age.
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const pt = g.particles[i];
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.96; pt.vy *= 0.96;
    pt.life -= dt;
    if (pt.life <= 0) g.particles.splice(i, 1);
  }
  for (let i = g.texts.length - 1; i >= 0; i--) {
    const t = g.texts[i];
    t.y -= 34 * dt; t.life -= dt;
    if (t.life <= 0) g.texts.splice(i, 1);
  }
}

// ---- phase input ------------------------------------------------------------
function handlePhaseInput() {
  g.mouseX = input.mouseX; g.mouseY = input.mouseY;
  if (input.pressed('m', 'M')) sound.toggleMute();

  if (g.phase === 'title') {
    if (input.pressed('Enter') || input.clicked()) { sound.unlock(); startGame(); }
  } else if (g.phase === 'playing') {
    if (input.pressed('p', 'P')) g.phase = 'paused';
  } else if (g.phase === 'levelup') {
    if (input.pressed('1')) chooseUpgrade(0);
    else if (input.pressed('2')) chooseUpgrade(1);
    else if (input.pressed('3')) chooseUpgrade(2);
    else if (input.clicked()) {
      for (const c of g.levelCards || []) {
        if (g.mouseX >= c.x && g.mouseX <= c.x + c.w && g.mouseY >= c.y && g.mouseY <= c.y + c.h) {
          chooseUpgrade(c.index); break;
        }
      }
    }
  } else if (g.phase === 'win' || g.phase === 'lose') {
    if (input.pressed('r', 'R') || input.pressed('Enter') || input.clicked()) restart();
  } else if (g.phase === 'paused') {
    if (input.pressed('p', 'P') || input.pressed('Enter') || input.clicked()) g.phase = 'playing';
  }
}

// ---- deterministic screenshot scenes ---------------------------------------
function buildShot(shot, seed) {
  const rng = makeRng(seed * 7919 + 13);
  const s = freshState(seed);
  s.time = 12.4;
  s.best = 2450;
  const kinds = ['drifter', 'skitter', 'bulwark', 'splitter'];
  const placeFoes = (n) => {
    for (let i = 0; i < n; i++) {
      const kind = kinds[Math.floor(rng.next() * kinds.length)];
      const a = rng.angle();
      const r = 130 + rng.range(0, 300);
      const x = Math.max(40, Math.min(ARENA.w - 40, LIGHTHOUSE.x + Math.cos(a) * r));
      const y = Math.max(40, Math.min(ARENA.h - 40, LIGHTHOUSE.y + Math.sin(a) * r * 0.7));
      const e = makeShade(kind, x, y, 3);
      e.spawnT = 1;
      e.tx = s.player.x - x; e.ty = s.player.y - y;
      s.enemies.push(e);
    }
  };
  if (shot === 'start') {
    s.phase = 'title';
    placeFoes(5);
  } else if (shot === 'play' || shot === 'levelup') {
    s.phase = shot === 'levelup' ? 'levelup' : 'playing';
    s.wave = 3;
    s.score = 340; s.kills = 28;
    s.player.x = 548; s.player.y = 478;
    s.player.hp = 78; s.player.level = 3; s.player.xp = 7;
    s.xpNeed = xpForLevel(3);
    s.player.aimX = 720; s.player.aimY = 300;
    s.player.dashCd = 0;
    placeFoes(9);
    for (let i = 0; i < 5; i++) {
      const a = Math.atan2(300 - 478, 720 - 548) + (i - 2) * 0.12;
      s.bullets.push({ x: 566 + Math.cos(a) * i * 26, y: 458 + Math.sin(a) * i * 26, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: 20, pierce: 0, hitIds: new Set(), life: 1, r: 5 });
    }
    for (let i = 0; i < 6; i++) {
      s.shards.push({ x: 480 + rng.range(-140, 240), y: 300 + rng.range(-80, 160), vx: 0, vy: 0, bob: rng.range(0, 6) });
    }
    burstSeeded(rng, 700, 330, '#b7aefc', 10, 120);
    s.particles.forEach((pt) => { pt.life = 0.6; pt.maxLife = 0.9; });
    if (shot === 'levelup') {
      s.pendingLevels = 1;
      s.levelChoices = [
        { id: 'rapid', name: 'Rapid Wick', max: 4, desc: '+25% fire rate. Your light burns faster.', apply() {} },
        { id: 'twin', name: 'Twin Flame', max: 3, desc: '+1 bolt per shot. The light fans out.', apply() {} },
        { id: 'aegis', name: 'Aegis Glow', max: 4, desc: '+25 max HP and heal 25 now.', apply() {} },
      ];
    }
  } else if (shot === 'win') {
    s.phase = 'win';
    s.wave = 10; s.score = 2450; s.kills = 187;
    s.stats = { score: 2450, waves: 10, kills: 187, time: '9:42', level: 9 };
    s.player.level = 9;
    burstSeeded(rng, 640, 360, '#ffd166', 26, 240);
    burstSeeded(rng, 420, 260, '#aef3ff', 16, 180);
    burstSeeded(rng, 860, 300, '#8b7ff0', 16, 180);
    s.particles.forEach((pt) => { pt.life = 0.7; pt.maxLife = 0.9; });
  } else if (shot === 'lose') {
    s.phase = 'lose';
    s.wave = 5; s.score = 890; s.kills = 63;
    s.lighthouseHp = 0;
    s.stats = { score: 890, waves: 4, kills: 63, time: '4:15', level: 5 };
    s.player.level = 5; s.player.hp = 0;
    placeFoes(7);
  } else {
    s.phase = 'title';
  }
  return s;
}

// ---- boot -------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;

if (shot) {
  g = buildShot(shot, seed);
  g.mouseX = input.mouseX; g.mouseY = input.mouseY;
  renderer.draw(g);
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handlePhaseInput();
    if (g.phase === 'playing' || g.phase === 'levelup') update(dt);
    else g.time += dt;
    renderer.draw(g);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// A small read-only handle for automated play-testing (not part of the UI).
window.__lumen = {
  get state() { return g.phase; },
  get snapshot() {
    return {
      phase: g.phase, wave: g.wave, score: g.score, kills: g.kills,
      hp: g.player.hp, lighthouseHp: g.lighthouseHp,
      level: g.player.level, xp: g.player.xp,
      enemies: g.enemies.length, shards: g.shards.length, bullets: g.bullets.length,
      pendingLevels: g.pendingLevels,
    };
  },
  start: () => { if (g.phase === 'title') { sound.unlock(); startGame(); } },
  giveXp: (n) => { const l = gainXp(g.player, n); if (l > 0) { g.pendingLevels += l; if (g.phase === 'playing') openLevelUp(); } return l; },
  setWave: (n) => { g.spawnQueue = []; g.enemies = []; startWave(n); },
  hurtPlayer: (n) => { g.player.invuln = 0; if (hurtPlayer(g.player, n)) endGame(false); },
  hurtLighthouse: (n) => { g.lighthouseHp = Math.max(0, g.lighthouseHp - n); if (g.lighthouseHp <= 0) endGame(false); },
  // Test-only helpers: clear the field (as if every shade were slain) and a
  // read-only list of live enemies, so automated play-tests can aim.
  clearField: () => { g.enemies = []; g.spawnQueue = []; g.boss = null; },
  get enemies() { return g.enemies.map((e) => ({ kind: e.kind, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp })); },
  restart: () => restart(),
};
