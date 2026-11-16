// render.js — every pixel LUMEN draws: the night arena, the lighthouse and
// its rotating beam, the wisp, the shades, the shards, the particles, the
// HUD, and the title / level-up / victory / defeat screens.
import { ARENA, LIGHTHOUSE, TOTAL_WAVES } from './world.js';
import { mulberry32 } from './random.js';

const GOLD = '#ffd166';
const WISP = '#aef3ff';
const INK = '#0b0e1e';

// Fixed starfield, seeded once so every frame (and every screenshot) agrees.
const STARS = (() => {
  const rnd = mulberry32(20261117);
  const arr = [];
  for (let i = 0; i < 110; i++) {
    arr.push({ x: rnd() * ARENA.w, y: rnd() * ARENA.h, r: 0.6 + rnd() * 1.5, p: rnd() * Math.PI * 2, s: 0.5 + rnd() * 1.5 });
  }
  return arr;
})();

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, h / 2); ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawBackground(g) {
    const grad = ctx.createLinearGradient(0, 0, 0, ARENA.h);
    grad.addColorStop(0, '#0d1126');
    grad.addColorStop(0.55, '#0b0e1e');
    grad.addColorStop(1, '#120e24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
    // Stars, gently twinkling with time.
    for (const s of STARS) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(g.time * s.s + s.p));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cdd7ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Soft gold glow around the lighthouse.
    const glow = ctx.createRadialGradient(LIGHTHOUSE.x, LIGHTHOUSE.y, 20, LIGHTHOUSE.x, LIGHTHOUSE.y, 260);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.20)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(LIGHTHOUSE.x - 260, LIGHTHOUSE.y - 260, 520, 520);
    // Faint ground rings.
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (const r of [120, 210, 300]) {
      ctx.beginPath(); ctx.arc(LIGHTHOUSE.x, LIGHTHOUSE.y, r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawLighthouse(g) {
    const { x, y, r } = LIGHTHOUSE;
    const hpFrac = Math.max(0, g.lighthouseHp / LIGHTHOUSE.maxHp);
    // Rotating beam.
    const ang = g.time * 0.55;
    ctx.save();
    ctx.translate(x, y - 18);
    ctx.rotate(ang);
    const beam = ctx.createLinearGradient(0, 0, 330, 0);
    beam.addColorStop(0, 'rgba(255, 225, 140, 0.30)');
    beam.addColorStop(1, 'rgba(255, 225, 140, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(330, -26); ctx.lineTo(330, 26); ctx.closePath(); ctx.fill();
    ctx.rotate(Math.PI);
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(330, -26); ctx.lineTo(330, 26); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Tower.
    ctx.fillStyle = '#2a2f4a';
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 30); ctx.lineTo(x - 13, y - 34);
    ctx.lineTo(x + 13, y - 34); ctx.lineTo(x + 22, y + 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x - 13, y - 20, 26, 6);
    ctx.fillRect(x - 16, y - 2, 32, 6);
    // Lamp room.
    const flick = 0.85 + 0.15 * Math.sin(g.time * 6);
    ctx.fillStyle = `rgba(255, 209, 102, ${flick})`;
    ctx.beginPath(); ctx.arc(x, y - 42, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1f33';
    ctx.beginPath(); ctx.moveTo(x - 14, y - 50); ctx.lineTo(x + 14, y - 50); ctx.lineTo(x + 8, y - 62); ctx.lineTo(x - 8, y - 62); ctx.closePath(); ctx.fill();
    // Base + HP bar.
    ctx.fillStyle = '#1b1f33';
    ctx.beginPath(); ctx.ellipse(x, y + 32, r + 4, 10, 0, 0, Math.PI * 2); ctx.fill();
    bar(ctx, x - 34, y + 48, 68, 7, hpFrac, hpFrac > 0.35 ? GOLD : '#ff5a5a');
    ctx.fillStyle = '#e8ecff';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIGHTHOUSE', x, y + 66);
  }

  function drawShards(g) {
    for (const s of g.shards) {
      const bob = Math.sin(g.time * 4 + s.bob) * 2;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffe9a3';
      ctx.shadowColor = GOLD; ctx.shadowBlur = 10;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  function drawEnemies(g) {
    for (const e of g.enemies) {
      const scale = Math.min(1, e.spawnT * 4 + 0.2);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(scale, scale);
      // Body: dark blob with a coloured rim.
      ctx.fillStyle = 'rgba(10, 8, 24, 0.92)';
      ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, e.r - 1, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowColor = e.glow; ctx.shadowBlur = 14;
      // Eyes: two glowing dots that face the target.
      const tx = e.tx ?? 0, ty = e.ty ?? 1;
      const d = Math.hypot(tx, ty) || 1;
      const ex = tx / d, ey = ty / d;
      const px = -ey, py = ex;
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.glow;
      ctx.beginPath(); ctx.arc(ex * 5 + px * 5, ey * 5 + py * 5, e.kind === 'boss' ? 5 : 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex * 5 - px * 5, ey * 5 - py * 5, e.kind === 'boss' ? 5 : 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Boss crown + HP bar.
      if (e.kind === 'boss') {
        ctx.fillStyle = e.color;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(e.x + i * 16 - 7, e.y - e.r - 2);
          ctx.lineTo(e.x + i * 16, e.y - e.r - 16);
          ctx.lineTo(e.x + i * 16 + 7, e.y - e.r - 2);
          ctx.closePath(); ctx.fill();
        }
        bar(ctx, ARENA.w / 2 - 190, 56, 380, 12, e.hp / e.maxHp, '#d84a6f');
        ctx.fillStyle = '#ffd7e2';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UMBRAL KING', ARENA.w / 2, 48);
      } else if (e.hp < e.maxHp) {
        bar(ctx, e.x - 14, e.y - e.r - 10, 28, 4, e.hp / e.maxHp, e.color);
      }
    }
  }

  function drawBullets(g) {
    for (const b of g.bullets) {
      const d = Math.hypot(b.vx, b.vy) || 1;
      const nx = b.vx / d, ny = b.vy / d;
      ctx.strokeStyle = 'rgba(174, 243, 255, 0.9)';
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.shadowColor = '#7fe3ff'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(b.x - nx * 14, b.y - ny * 14);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawPlayer(g) {
    const p = g.player;
    if (p.invuln > 0 && Math.floor(g.time * 14) % 2 === 0 && g.phase === 'playing') {
      // Blink while invulnerable — skip the body this frame.
    } else {
      // Aim line.
      const ax = p.aimX - p.x, ay = p.aimY - p.y;
      const ad = Math.hypot(ax, ay) || 1;
      ctx.strokeStyle = 'rgba(174, 243, 255, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x + ax / ad * 20, p.y + ay / ad * 20);
      ctx.lineTo(p.x + ax / ad * 34, p.y + ay / ad * 34); ctx.stroke();
      // Flame tail.
      const flick = 6 + Math.sin(g.time * 9) * 2;
      ctx.fillStyle = 'rgba(255, 190, 90, 0.75)';
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(Math.atan2(ay, ax)) * 10, p.y - Math.sin(Math.atan2(ay, ax)) * 10);
      ctx.arc(p.x, p.y, p.r + flick * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Body.
      const bodyGrad = ctx.createRadialGradient(p.x - 4, p.y - 5, 2, p.x, p.y, p.r + 6);
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.55, WISP);
      bodyGrad.addColorStop(1, 'rgba(80, 180, 255, 0.15)');
      ctx.fillStyle = bodyGrad;
      ctx.shadowColor = '#7fe3ff'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Eyes.
      ctx.fillStyle = '#123';
      ctx.beginPath(); ctx.arc(p.x + ax / ad * 4 - 3.5, p.y + ay / ad * 4 - 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + ax / ad * 4 + 3.5, p.y + ay / ad * 4 - 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // Dash cooldown ring.
    if (p.dashCd > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / p.dashCdMax));
      ctx.stroke();
    }
  }

  function drawParticles(g) {
    for (const pt of g.particles) {
      const f = Math.max(0, pt.life / pt.maxLife);
      ctx.globalAlpha = f;
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * f + 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(g) {
    ctx.textAlign = 'center';
    for (const t of g.texts) {
      const f = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = f;
      ctx.fillStyle = t.color;
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(g) {
    const p = g.player;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8ecff';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.min(g.wave, TOTAL_WAVES)} / ${TOTAL_WAVES}`, 24, 36);
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillStyle = '#b9c2e8';
    ctx.fillText(`SCORE ${g.score}`, 24, 60);
    ctx.fillText(`SHADES FELLED ${g.kills}`, 24, 82);
    // XP bar, bottom.
    const need = g.xpNeed;
    ctx.fillStyle = '#e8ecff';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${p.level}`, ARENA.w / 2, ARENA.h - 34);
    bar(ctx, ARENA.w / 2 - 220, ARENA.h - 26, 440, 10, p.xp / need, '#8b7ff0');
    // HP bar, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8ecff';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`HP ${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`, ARENA.w - 24, 36);
    bar(ctx, ARENA.w - 224, 46, 200, 10, Math.max(0, p.hp / p.maxHp), p.hp / p.maxHp > 0.35 ? '#5ee6a8' : '#ff5a5a');
    // Dash indicator.
    ctx.fillStyle = p.dashCd <= 0 ? '#aef3ff' : '#5a628a';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(p.dashCd <= 0 ? 'DASH READY  [Shift]' : `DASH ${p.dashCd.toFixed(1)}s`, ARENA.w - 24, 82);
    ctx.fillStyle = '#8a93b8';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('M mute · P pause', ARENA.w - 24, 104);
    // Wave banner.
    if (g.banner && g.bannerT > 0) {
      const f = Math.min(1, g.bannerT * 2);
      ctx.globalAlpha = Math.min(1, f);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.font = '800 44px system-ui, sans-serif';
      ctx.shadowColor = GOLD; ctx.shadowBlur = 24;
      ctx.fillText(g.banner, ARENA.w / 2, 170);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(8, 10, 26, 0.82)';
    rr(ctx, x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 16); ctx.stroke();
  }

  function drawTitle(g) {
    ctx.fillStyle = 'rgba(5, 7, 18, 0.45)';
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = '800 92px system-ui, sans-serif';
    ctx.shadowColor = GOLD; ctx.shadowBlur = 34;
    ctx.fillText('LUMEN', ARENA.w / 2, 250);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8ecff';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('Guard the last lighthouse. The shades are coming.', ARENA.w / 2, 300);
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '500 17px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move      Mouse — aim      Click / Space — shoot      Shift — dash', ARENA.w / 2, 352);
    ctx.fillText('Collect light shards to level up. Survive all 10 waves — and the Umbral King.', ARENA.w / 2, 380);
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', ARENA.w / 2, 452);
    ctx.globalAlpha = 1;
    if (g.best > 0) {
      ctx.fillStyle = GOLD;
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE ${g.best}`, ARENA.w / 2, 500);
    }
  }

  function drawLevelUp(g) {
    ctx.fillStyle = 'rgba(5, 7, 18, 0.6)';
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText('LEVEL UP — CHOOSE A BLESSING', ARENA.w / 2, 150);
    const cw = 300, ch = 210, gap = 28;
    const total = cw * 3 + gap * 2;
    const x0 = (ARENA.w - total) / 2;
    g.levelCards = [];
    g.levelChoices.forEach((up, i) => {
      const x = x0 + i * (cw + gap), y = 210;
      const hover = g.mouseX >= x && g.mouseX <= x + cw && g.mouseY >= y && g.mouseY <= y + ch;
      ctx.fillStyle = hover ? 'rgba(40, 34, 80, 0.95)' : 'rgba(16, 18, 40, 0.95)';
      rr(ctx, x, y, cw, ch, 14); ctx.fill();
      ctx.strokeStyle = hover ? GOLD : 'rgba(139, 127, 240, 0.6)';
      ctx.lineWidth = hover ? 2.5 : 1.5;
      rr(ctx, x, y, cw, ch, 14); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px system-ui, sans-serif';
      ctx.fillText(up.name, x + cw / 2, y + 48);
      ctx.fillStyle = '#b9c2e8';
      ctx.font = '500 15px system-ui, sans-serif';
      const words = up.desc.split(' ');
      let line = '', ly = y + 88;
      for (const w of words) {
        if ((line + ' ' + w).trim().length > 26) { ctx.fillText(line.trim(), x + cw / 2, ly); ly += 22; line = w; }
        else line += ' ' + w;
      }
      if (line.trim()) ctx.fillText(line.trim(), x + cw / 2, ly);
      const stacks = g.player.taken[up.id] || 0;
      ctx.fillStyle = GOLD;
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText(`OWNED ${stacks} / ${up.max}    ·    press ${i + 1}`, x + cw / 2, y + ch - 22);
      g.levelCards.push({ x, y, w: cw, h: ch, index: i });
    });
    ctx.fillStyle = '#8a93b8';
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.fillText('Click a card or press 1, 2 or 3.', ARENA.w / 2, 470);
  }

  function drawEnd(g, won) {
    ctx.fillStyle = won ? 'rgba(10, 26, 14, 0.62)' : 'rgba(24, 8, 16, 0.66)';
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? GOLD : '#ff7d9c';
    ctx.font = '800 64px system-ui, sans-serif';
    ctx.shadowColor = won ? GOLD : '#ff5a7a'; ctx.shadowBlur = 28;
    ctx.fillText(won ? 'THE LIGHT HOLDS' : 'THE LIGHT FADES', ARENA.w / 2, 240);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8ecff';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText(won ? 'You survived all 10 waves. Dawn returns to the lighthouse.' : 'The shades overran the lighthouse. The night keeps its prize.', ARENA.w / 2, 292);
    const s = g.stats;
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText(`SCORE ${s.score}    ·    WAVES CLEARED ${s.waves} / ${TOTAL_WAVES}    ·    SHADES FELLED ${s.kills}`, ARENA.w / 2, 348);
    ctx.fillText(`TIME ${s.time}    ·    LEVEL ${s.level}`, ARENA.w / 2, 380);
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', ARENA.w / 2, 452);
    ctx.globalAlpha = 1;
  }

  function drawPaused(g) {
    ctx.fillStyle = 'rgba(5, 7, 18, 0.55)';
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecff';
    ctx.font = '800 52px system-ui, sans-serif';
    ctx.fillText('PAUSED', ARENA.w / 2, 340);
    ctx.fillStyle = '#b9c2e8';
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText('Press P to resume', ARENA.w / 2, 384);
  }

  function draw(g) {
    drawBackground(g);
    drawLighthouse(g);
    drawShards(g);
    drawEnemies(g);
    drawBullets(g);
    drawPlayer(g);
    drawParticles(g);
    drawTexts(g);
    if (g.phase === 'playing' || g.phase === 'levelup' || g.phase === 'paused') drawHud(g);
    if (g.phase === 'title') drawTitle(g);
    if (g.phase === 'levelup') drawLevelUp(g);
    if (g.phase === 'win') drawEnd(g, true);
    if (g.phase === 'lose') drawEnd(g, false);
    if (g.phase === 'paused') drawPaused(g);
  }

  return { draw };
}
