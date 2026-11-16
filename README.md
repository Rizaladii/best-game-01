# LUMEN — Guard the Last Lighthouse

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Rizaladii/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Rizaladii/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original 2D canvas arena survival game built for make.fun's "Make the best game" bounty, $1,000 in USDC.

You are a wisp guarding the last lighthouse. Shades approach from all sides — move with WASD or the arrow keys, aim with the mouse, shoot with click or Space, dash with Shift. Slain shades drop light shards; collect them to level up and pick 1 of 3 blessings between waves (fire rate, damage, multishot, dash, shield, magnet, repairs, piercing). Survive all 10 waves and defeat the Umbral King to win. Lose if your light goes out — or the lighthouse falls.

## How it plays

- **10 waves** of escalating shades: drifters, fast skitters, armoured bulwarks, splitters that break in two — and the Umbral King on wave 10, who summons his own minions.
- **Level-up choices** after every level: 8 blessings, each stackable, so no two runs build the same wisp.
- **Feel**: dash with brief invulnerability, hit flashes, death bursts, floating score text, a rotating lighthouse beam, and synthesized WebAudio sound (no audio files).
- **Screens**: title, playing with HUD (wave, HP, lighthouse HP, score, XP bar, dash), level-up, victory and defeat — each with a restart.
- **Deterministic screenshots**: `?shot=start|play|levelup|win|lose&seed=N` renders one fixed scene (see `shots.json`).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — every file the game loads lives under `game/`.

## Files

- `game/index.html` — the page and its canvas.
- `game/src/main.js` — loop, state machine, wave director, collisions, shot mode.
- `game/src/world.js` — the arena, the lighthouse, wave plans.
- `game/src/enemies.js` — the shades and the Umbral King.
- `game/src/player.js` — the wisp, its bolts, and the 8 upgrades.
- `game/src/render.js` — all drawing: arena, lighthouse, HUD, menus.
- `game/src/audio.js` — synthesized WebAudio sound effects.
- `game/src/input.js` — keyboard and mouse state.
- `game/src/random.js` — seeded RNG for reproducible scenes.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=f4mz6c1w&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.</sub>
