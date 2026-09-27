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

### 7. Pressure washer: pick up, equip, spray ✅

- [x] Washer machine on the lawn that glows and shows "Press E to pick up" when you're close
- [x] Hold left mouse to spray; camera ray finds the target, nozzle ray does the cleaning
      (walls between the gun and the target block the water)
- [x] Max range (6 m); the spot widens and weakens with distance, so ~2 m is the sweet spot
- [x] Basic water beam; the body faces the aim and moves slower while spraying
- [x] Tests: spray falloff, aim direction and fallbacks

### 8. Spray feedback ✅

- [x] Better beam: flat fan with rushing streaks, a bright core jet, slight wobble
- [x] Particles: water splash, soft mist, and brown dirt splatter that follows dirt removed
- [x] Wet surfaces darken, pick up a sky sheen and sun glints, and dry over ~8 s
- [x] Audio (synthesized, no files): engine hum, nozzle hiss, water impact, dirt-stripping
      crackle, pickup clunk; `M` mutes
- [x] Tests: wetness grid (soak, strokes, drying), audio mix rules

### 9. Job progress and completion ✅

- [x] Objective + progress bar; completes at 98% and the leftover specks fade away (~1 s)
- [x] Hold `F` to highlight the dirt that's left (bright magenta, pulsing)
- [x] Completion moment: chime, sparkles rising off the driveway, "Job complete!" with the
      time taken (timed from the first spray); `R` starts over (only after completion)
- [x] Tests: job rules (waiting, timing, completing once, display %, reset), `fadeAll`

### 10. Tuning panel + playtest pass ✅ (your playtest still to come)

- [x] Tuning panel (`T`): live sliders for movement, camera, spray, cleaning, water effects,
      and sound; "Copy changes" puts just the edited values on the clipboard for config.js
- [x] Pacing simulation of a full job (see decision #12) → faster cleaning and a wider spray
- [x] Automated playtest findings recorded below
- [ ] **Human playtest:** play a full job (~5 min) against the checklist below

### v0.1 success checklist

- [ ] Movement feels responsive
- [ ] Camera feels natural
- [ ] Aiming the washer is intuitive
- [ ] The water looks convincing enough
- [ ] Dirt removal is immediately understandable
- [ ] The clean/dirty transformation is visually obvious
- [ ] Spraying has satisfying audio and visual feedback

### Playtest findings (Milestones 2–10)

Fixed along the way: skewed roof, washed-out lighting, lawn showing through seams, player
filling the screen near walls, invisible wetness, invisible splash, snow-globe sparkles,
unhandled pointer-lock errors, and a job that took ~7.5 minutes of _perfect_ play.

Still open, roughly in priority order:

1. **Oil stains can be skipped.** Progress counts texels, and the stains are only ~2% of
   the area, so you can finish at 98% without touching the most satisfying dirt. Consider
   weighting progress by the _amount_ of dirt, so heavy grime counts for more.
2. **Placeholder audio.** Synthesized layers work, but real CC0 recordings would sound much
   richer. The four layers (engine, hiss, impact, stripping) stay the same.
3. **The fan beam is flat, but the cleaning spot is round.** Fine at normal angles; an
   elliptical brush that follows the fan would feel more authentic.
4. **Only the driveway gets wet.** Spraying the house, fence or lawn splashes but leaves no
   mark. A simple wet effect on everything would make the world feel more reactive.
5. **The gun floats beside a capsule.** A simple arm/pose, and a hose to the machine, would
   sell "holding a pressure washer" much better.
6. **Bundle size** (~6.8 MB, ~1.5 MB gzipped): trim Babylon imports before a public release.

## Deliberately not in v0.1

Money, progression, shops, upgrades · more than one job · nozzle types, pressure levels,
water consumption · multiple dirt types or surface materials · cleaning anything besides the
driveway · physics engine, hose, puddles, fluid simulation · character art or animation ·
menus, settings, save/load · gamepad, touch · NPCs, story, multiplayer · TypeScript, ECS,
WebGPU.

## Later (ideas, not commitments)

- v0.2: clean walls/fence/car (requires authored UVs), second surface material
- A hose from the machine to the gun (visual first; maybe a length limit later)
- Earn money per job, simple upgrade (wider nozzle / more pressure)
- Trim the Babylon.js bundle before a public itch.io release
