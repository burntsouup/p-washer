# Decisions

Short records of the choices that shape the project, so future-you (or Copilot) knows _why_.
Add an entry when a decision would be surprising to someone reading the code.

## 1. Babylon.js as the engine

**Why:** Free (Apache-2.0), JavaScript-first, and batteries-included: picking that returns
UV coordinates (essential for cleaning), shadows, particles, material plugins, and a built-in
Inspector. **Revisit if:** we hit a hard limitation, which is unlikely at this scale.

## 2. Plain JavaScript, not TypeScript

**Why:** No build step to learn, and Babylon ships type definitions so VS Code autocompletes
in plain JS anyway. Pure logic files use `// @ts-check` + JSDoc comments to catch type mistakes.
**Revisit if:** the codebase grows large enough that refactors keep breaking things.

## 3. No physics engine in v0.1

**Why:** Walking on a flat yard and bumping into walls works with Babylon's built-in collisions
(`moveWithCollisions`). The feet are simply pinned to the ground each frame instead of
simulating gravity, since v0.1 has no slopes, stairs, or jumping. The spray is a raycast, not
physics. **Revisit when:** we need dynamic objects or uneven ground. Then prefer Babylon's Havok
plugin (`@babylonjs/havok`, MIT) over Rapier because it integrates directly and includes a
character controller.

## 4. Dirt is a CPU-side grid in UV space

**Why:** Each cleanable surface stores one dirt value per texel in a plain array. Spray hits
give a UV coordinate; we subtract a soft brush there and upload the changed grid as a texture.
It's sharp enough, progress is exact and cheap, and the core is pure JS we can unit-test.
Alternatives considered: vertex colors (blurry, needs dense meshes) and GPU render-target
painting (faster at scale, but progress needs GPU readback and it's harder to debug).
**Revisit if:** we need many large, high-resolution surfaces at once.

## 5. Import Babylon.js from the package root

**Why:** Deep imports (`@babylonjs/core/Meshes/...`) shrink the bundle but can silently drop
features unless you add the right side-effect imports, which is a confusing trap early on.
Cost: the build is ~6.7 MB minified (~1.5 MB gzipped). **Revisit:** before a public release.

## 6. Babylon Inspector as a dev-only dependency

**Why:** The Inspector (click a mesh, tweak a light, view a texture) is one of the best ways to
learn and debug Babylon scenes; we'll use it to look at the dirt texture in Milestone 6. It's
loaded with a dynamic `import()` only when `import.meta.env.DEV` is true, so production builds
don't include it. The CDN version doesn't work with npm-installed Babylon.
**Cost:** ~600 MB in `node_modules` (mostly an icon package), on dev machines and CI only.
**Revisit if:** installs or CI get noticeably slow.

## 7. Roadmap file instead of GitHub Issues

**Why:** Solo project. A checklist in `docs/ROADMAP.md` is simpler, versioned with the code,
and readable by Copilot. **Revisit if:** collaborators or public bug reports show up.

## 8. GitHub Pages for playtest builds, relative base path

**Why:** Free, and every merge to `main` deploys a playable URL automatically. `base: './'`
in `vite.config.js` makes the same build work on Pages and on itch.io (for a later release).
Load files from `public/` with `import.meta.env.BASE_URL` + path, never a leading `/`.

## 9. HTML/CSS for the HUD

**Why:** Simpler than in-engine GUI, familiar, and inspectable with browser devtools.

## 10. Level built in code from simple shapes

**Why:** A small "greybox kit" (`src/environment/greybox.js`) builds boxes, pyramids and blobs
from a few lines each, so moving the house or resizing the driveway is a one-number change
with instant live reload. No 3D modeling tool or asset pipeline needed yet.
**Revisit when:** we want real art. Then model in Blender and load `.glb` files, keeping
the driveway (and anything cleanable) as separate meshes with clean UVs.
