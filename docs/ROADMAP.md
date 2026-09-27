# Roadmap

Planning lives here instead of GitHub Issues: one list, versioned with the code.
Check items off in the same PR that completes them.

## v0.1 — "The spray feels satisfying" ✅ (released as 0.1.0)

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

### 10. Tuning panel + playtest pass ✅

- [x] Tuning panel (`T`): live sliders for movement, camera, spray, cleaning, water effects,
      and sound; "Copy changes" puts just the edited values on the clipboard for config.js
- [x] Pacing simulation of a full job (see decision #12) → faster cleaning and a wider spray
- [x] Automated playtest findings recorded below
- [x] **Human playtest:** a full job against the checklist below

### v0.1 success checklist ✅ (confirmed in playtest)

- [x] Movement feels responsive
- [x] Camera feels natural
- [x] Aiming the washer is intuitive
- [x] The water looks convincing enough
- [x] Dirt removal is immediately understandable
- [x] The clean/dirty transformation is visually obvious
- [x] Spraying has satisfying audio and visual feedback

### Playtest findings (Milestones 2–10)

Fixed along the way: skewed roof, washed-out lighting, lawn showing through seams, player
filling the screen near walls, invisible wetness, invisible splash, snow-globe sparkles,
unhandled pointer-lock errors, and a job that took ~7.5 minutes of _perfect_ play.

Still open, roughly in priority order:

1. ~~**Oil stains can be skipped.**~~ Fixed in Milestone 11: progress is now weighted by
   starting dirt, so the stains must mostly be cleaned before the job completes.
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

## v0.2 — "Every surface is a new way to clean"

Goal: make the core interaction itself more varied before adding progression. Tough dirt,
a rotating fan, a vertical fence and a paved patio should each change _how_ you clean, and a
second job should tie them together. Same rules as v0.1: small milestones, each playable, pure
logic tested, feel checked by playing.

### 11. Dirt-weighted progress ✅

- [x] A spot counts for as much as the dirt it started with, so an oil stain (1.0) counts 4×
      a light film (0.25). Spots still have to become fully clean to count
- [x] Tests: weighting, clean-threshold still required, 100% only when everything is clean
- Result (simulation): oil is 1.1% of the area but 3.3% of progress, so ~¾ of it must be
  cleaned before 98% (none before). Perfect play: ~3.2 min (was ~2.4); one pass: ~79%.

### 12. Tough dirt: moss ✅

- [x] A per-texel dirt _type_; moss only comes off above a minimum spray strength (so you have
      to get close) and resists a little even then
- [x] Moss draws green; texture grows to 4 channels (dirt, wetness, moss, spare)
- [x] On the driveway: clumps growing out of the middle joint and along the shady lawn edges
      (~5% of the area)
- [x] Feedback: "Moss is tough: get closer" when the spray can't lift it; green splatter when
      it does
- [x] Tests: weak spray leaves moss, strong spray removes it, soft edge too weak, other dirt
      unaffected, where moss grows

### 13. Fan-shaped spray you can rotate ✅

- [x] Elliptical brush that matches the flat fan, laid onto each surface using its texture
      directions; low angles stretch the footprint and spread the water thinner
- [x] `Q` turns the fan between upright and flat; the beam and a bar through the crosshair
      turn too
- [x] Retuned: `cleanRate` 3 → 4.5 so angled spraying cleans about as fast as v0.1
- [x] Tests: ellipse walker, elliptical stamps and gap-free strokes, fan axes, footprint
      projection (head-on, turned, 45°, glancing), surface axes from UVs

### 14. Performance headroom for more surfaces ✅

- [x] Track the wet area so drying only loops over it, and a changed rectangle per grid so
      only that part is packed and uploaded (`texSubImage2D` via `updateTextureData`)
- [x] Measured (cleaning system, per frame): spraying 0.8 → **0.2 ms**; idle surfaces **0 ms**;
      worst case, a whole surface wet and drying, ~1.2 ms. Surfaces are too far apart to be
      wet at once, so more surfaces cost nothing until you spray them
- [x] Tests: changed/wet areas grow on scrub/soak, stay empty when nothing changes, and clear
      once dry

### 15. The fence: a vertical surface ✅

- [x] The yard side of the back fence is a cleanable panel (24 × 1.6 m, 2.5 cm texels) in
      front of the solid fence, with boards and gaps drawn in code
- [x] Weathered grey wood that cleans back to warm brown; water stains running down some
      boards, grime in the gaps, mud splash and moss along the bottom
- [x] Juice: on upright surfaces, water trickles down in streaks
- [x] Surfaces belong to a job; progress, the finishing fade, the highlight, and resets are per
      job, so the fence doesn't count toward the driveway (it becomes the backyard job in M17)
- [x] Tests: trickles, fence pattern (weathering, mud, gaps, moss), per-job bookkeeping

### 16. The patio: pavers and grout

- [ ] Paver pattern with grout lines; grime and moss collect in the joints and need close,
      precise spraying
- [ ] Dirt drawn over a textured clean surface (not just a flat color)

### 17. Second job: the backyard

- [ ] Jobs become data: "Driveway", then "Backyard" (fence + patio) unlocks after it
- [ ] HUD shows the current job; the completion card offers the next one
- [ ] Tests: job order, unlocking, per-job progress

### 18. Tuning + playtest pass

- [ ] Tuning panel entries for the new settings; pacing simulation for the backyard job
- [ ] Playtest against the checklist below; record findings

### v0.2 success checklist

- [ ] Tough dirt makes "get closer" a meaningful, satisfying choice
- [ ] Rotating the fan feels useful, not like a gimmick
- [ ] Cleaning the vertical fence feels as good as the driveway
- [ ] Working the grout lines feels precise and rewarding
- [ ] Heavy stains feel worth cleaning (and progress reflects them)
- [ ] Moving from the first job to the second feels natural
- [ ] Still 60 fps with every surface dirty

### v0.2 risks

- **Fan orientation on a surface** needs each surface's UV directions in world space. Keep
  cleanables as flat panels with known axes; revisit for curved objects (cars) later.
- **Texel budget**: the fence and patio roughly triple today's ~131k texels. Milestone 14
  exists so drying and uploads scale with the _wet area_, not the total.
- **Wet streaks** (15) could become a time sink; timebox them and cut if needed.

## Deliberately not in v0.2

Money, shop, upgrades · more than two jobs · house walls, cars, or anything needing authored
UVs · pressure settings, water consumption · character art, hose, real audio (see Later) ·
menus beyond a simple job flow · save/load.

## Later (ideas, not commitments)

- v0.3 progression: money per job, a shop with one or two upgrades (turbo nozzle, surface
  cleaner attachment), more jobs
- Polish & sharing: CC0 audio recordings, a hose from the machine to the gun, a simple arm
  pose, wet marks on every surface, title screen, itch.io page
- Clean house walls, cars (requires authored UVs, e.g. from Blender)
- Trim the Babylon.js bundle before a public itch.io release
