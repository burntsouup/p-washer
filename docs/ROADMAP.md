# Roadmap

Planning lives here instead of GitHub Issues: one list, versioned with the code.
Check items off in the same PR that completes them.

## v0.1 — "The spray feels satisfying"

Goal: one backyard, one dirty driveway, one pressure washer. After a few minutes of play,
washing the driveway should feel good. See the success checklist at the bottom.

### 1. Project scaffold ✅

- [x] Vite + Babylon.js + Vitest, `npm run dev` shows a lit scene with shadows
- [x] FPS readout, Babylon Inspector on the `` ` `` key (dev builds only)
- [x] `src/config.js` for tunable numbers
- [x] ESLint, Prettier, EditorConfig, VS Code settings
- [x] CI (lint, format, test, build) on every PR; deploy to GitHub Pages on merge to `main`
- [x] README, decisions log, credits, PR template, Dependabot

### 2. Greybox backyard ✅

- [x] House block, driveway, lawn, fence, a few obstacles (placeholder geometry only)
- [x] Driveway is its own ground mesh with clean, unique UVs (it becomes the cleanable surface)
- [x] Lighting and shadows look pleasant enough to spend time in (sky gradient, fog, soft shadows)

### 3. Input + third-person camera ✅

- [x] Click to lock the pointer, `Esc` to release
- [x] Mouse look with clamped pitch, over-the-shoulder offset, crosshair
- [x] Camera pulls in when something is between it and the player; player fades out when
      the camera is squeezed in close
- [x] Capsule player with a visor showing its facing (standing still for now)
- [x] Tests: camera orbit math

### 4. Player movement ✅

- [x] WASD relative to the camera, `Shift` to run, smooth acceleration/deceleration
- [x] Turns toward movement direction; collides with walls and props; invisible walls at the
      edge of the lot
- [x] Feet stay on the ground (the yard is flat, so no gravity or jumping needed yet)
- [x] Tests: camera-relative direction, no diagonal speed boost, acceleration curve

### 5. Dirt mask core (pure JS, test-first) ✅

- [x] Grid of dirt values (0 clean → 1 extreme) per surface
- [x] Circular brush with soft falloff; strength is passed in as rate × `dt`
- [x] Stroke interpolation so fast sweeps leave no gaps
- [x] Incremental progress tracking; procedural starting dirt (seeded, four dirt levels:
      light film, tire tracks and blotches, edge/corner grime, oil stains)
- [x] Tests: brush shape, linearity, gap-free strokes, progress, pattern determinism and levels

### 6. Dirt rendering on the driveway ✅

- [x] Connect a dirt mask to the driveway mesh and a texture (`CleanableSurface`)
- [x] Material plugin blends clean → dusty film → brown grime → black oil, keeping lighting
      and shadows
- [x] Debug brush: hold the left mouse button to clean under the crosshair (replaced by the
      washer in Milestone 7)
- [x] Tests: UV → texel and meters → texels conversion

### 7. Pressure washer: pick up, equip, spray

- [ ] Washer prop with an "E to pick up" prompt in range
- [ ] Hold left mouse to spray; camera ray finds the target, nozzle ray does the cleaning
- [ ] Max range, strength falls off with distance, basic water beam

### 8. Spray feedback

- [ ] Better beam, impact splash + mist, dirt-colored splatter
- [ ] Wet surfaces darken and dry over time
- [ ] Audio: spray loop, impact layer, dirt-stripping layer (synthesized placeholder is fine)

### 9. Job progress and completion

- [ ] Progress bar; completes at ~98% and auto-clears leftover specks
- [ ] "Show remaining dirt" key
- [ ] Completion moment (sound, sparkle, "Job complete", time taken); `R` to reset

### 10. Tuning panel + playtest pass

- [ ] lil-gui sliders for movement, camera, brush, clean rate, range
- [ ] 10-minute playtest against the checklist below; add findings to this file

### v0.1 success checklist

- [ ] Movement feels responsive
- [ ] Camera feels natural
- [ ] Aiming the washer is intuitive
- [ ] The water looks convincing enough
- [ ] Dirt removal is immediately understandable
- [ ] The clean/dirty transformation is visually obvious
- [ ] Spraying has satisfying audio and visual feedback

## Deliberately not in v0.1

Money, progression, shops, upgrades · more than one job · nozzle types, pressure levels,
water consumption · multiple dirt types or surface materials · cleaning anything besides the
driveway · physics engine, hose, puddles, fluid simulation · character art or animation ·
menus, settings, save/load · gamepad, touch · NPCs, story, multiplayer · TypeScript, ECS,
WebGPU.

## Later (ideas, not commitments)

- v0.2: clean walls/fence/car (requires authored UVs), second surface material
- Earn money per job, simple upgrade (wider nozzle / more pressure)
- Trim the Babylon.js bundle before a public itch.io release
