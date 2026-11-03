# ActuatorLab

**Understand the mechanism. Visualize the movement. Master the application.**

ActuatorLab is an interactive training platform for industrial valve actuators. Its centrepiece is a real-time 3D pneumatic Scotch yoke actuator on a quarter-turn ball valve. Every part of the mechanism moves: piston, rod, guide block, pin, yoke, shaft, spring and ball.

> Independent educational project. Not affiliated with, endorsed by or sponsored by any actuator or valve manufacturer. The 3D model is original procedural geometry, not manufacturer CAD. Numerical values in the simulator are illustrative and must not be used for sizing.

## Quick start

Requires Node.js 20.9 or later.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. No environment variables or accounts are needed (see `.env.example`).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Simulation engine unit tests (Vitest) |

## Deploying to Vercel

Import the repository in Vercel. The framework preset (Next.js) and default build settings work as-is. No environment variables are needed.

## What's in it

| Section | Status |
| --- | --- |
| Dashboard | Scroll-driven stroke story (scroll scrubs the real simulation; camera moves through exterior, air, mechanism views), continue learning, progress, families, recent topics, recommendations |
| Actuator Explorer | Technology library (9 actuator types by mechanism and power source), detail pages, valve library. The pneumatic Scotch yoke is interactive; others are marked *coming soon* until their simulation is built. Old product-code URLs redirect. |
| 3D Simulator | Pneumatic Scotch yoke, twin-piston pneumatic rack and pinion, and electric part-turn with worm-wheel segment (switch in the header, or `?type=rack-pinion` / `?type=electric-part-turn`), on a ball valve. 5 modes, 3 configurations, supply loss, component inspection |
| Compare | Scotch yoke vs rack and pinion: torque shape and typical characteristics |
| Academy | 16-lesson curriculum. Lessons 1–8 are written, with embedded live 3D demos and knowledge checks; the rest are marked *coming soon*. |
| Assessments | Two scored quizzes with explanations |

### Simulator

- **Modes:** Normal, Cutaway (solid, transparent or half section), Mechanism (slowed, labelled, pin travel line and yoke swing arc), Air flow (illustrative supply and exhaust paths with chamber fill), Engineering (readouts plus a live torque chart).
- **Configurations:** Double acting (fails in place), spring return fail closed, spring return fail open.
- **Controls:** Play/pause, Open, Close, Reset, auto-cycle, speeds of 0.25× to 2×, position scrubber, supply toggle, supply pressure, camera reset, fit and focus, movement labels.
- **Keyboard:** Space, O, C, R, S (supply), F (fit), Esc.
- **Deep links:** `/simulator?action=double-acting|spring-return&fail=open|closed&mode=normal|cutaway|mechanical|energy|engineering`.

## Architecture

```
src/
  lib/sim/            framework-free simulation (no React, no Three.js)
    types.ts          state, configuration, commands
    geometry.ts       reference geometry + Scotch yoke kinematics, checkGeometry()
    model.ts          illustrative force/torque model, torque curves
    engine.ts         time-based SimulationEngine (rAF loop, commands, throttled snapshots)
    __tests__/        Vitest: kinematics, supply loss, fail actions, frame-rate independence
  components/three/   React Three Fiber renderer (reads engine state in useFrame)
  components/sim/     simulator UI (provider, panels, playback, torque chart)
  components/learn/   lessons, figures, embedded sims, questions
  data/               actuators, components, lessons, assessments, valves, compare
  lib/progress.ts     localStorage progress behind a ProgressRepository interface
supabase/schema.sql   database-ready entities + RLS for a future backend
```

**Render loop.** The engine advances on `requestAnimationFrame` using real elapsed time multiplied by the speed setting. Velocity is smoothed toward a force-derived target, so pausing, reversing and resuming never jump. The canvas uses `frameloop="demand"` and only re-renders when the engine ticks or the camera moves. React UI subscribes to a snapshot throttled to about 15 Hz, so React does not re-render every frame.

**Mechanics.** The pin is constrained to the guide line `z = −d` and to the yoke slot (a radial line from the shaft), which gives `x = d·tanφ`. The slider group (block, pin, rod, piston, spring plate) translates by `x`, and the shaft group (yoke, shaft, coupling, indicator) rotates by `−φ`. The ball is rigidly offset from the shaft by the coupling orientation. `checkGeometry()` verifies through the full stroke that the piston stays inside the cylinder, the pin stays inside the slot and the spring never goes solid.

**Fail action is physical, not scripted.** In spring return, removing air leaves the spring as the only active force, so the engine drives to the spring end. Fail open and fail closed differ only in the 90° coupling orientation. Double acting has no stored energy, so on supply loss the active force is zero and the actuator stops in place.

**Torque model.** `T = F·d / cos²φ` (symmetric yoke), with an illustrative linear spring, an illustrative ball valve demand that peaks at the seat, and valve demand treated as friction. Below the illustrative minimum pressure, the actuator stalls part-way.

## Reference sources for mechanism architecture

- Twin-piston rack and pinion: layout follows publicly documented features of compact twin-piston actuators, e.g. the Rotork GT range brochure (pub110-019) and distributor listings (twin opposed pistons and racks, convertible single/double acting, anti-blowout pinion, ±5° end stops, NAMUR top / ISO 5211 bottom). Proportions in `rackPinionGeometry.ts` are original, not manufacturer dimensions. The UI stays vendor-neutral.

- Electric part-turn: layout and behaviour follow publicly documented intelligent part-turn actuators, e.g. Rotork IQ3/IQT3 catalogue (PUB002-038), IQT Pro brochure (PUB002-010) and IQT data sheet: motor-driven worm and wheel, torque sensed from worm-shaft end thrust with motor switch-off at a set limit, contactless absolute encoder that holds position without power, geared handwheel selected by a lockable hand/auto lever, magnetically coupled Local/Stop/Remote and Open/Close selectors, battery-backed display, double-sealed terminal compartment. A partial worm-wheel segment is inferred from the brochures offering a full wheel as an option. Proportions are original.

## Assumptions and decisions

- Content is organised by technology, not manufacturer product ranges. No manufacturer dimensions, ratings or internal geometry are claimed.
- **Fail open** is represented by turning the actuator-to-valve coupling 90°, a common way to change the fail action with the same mechanism.
- **Play/Pause** controls the simulation clock. **Auto-cycle** issues open and close commands automatically.
- After supply returns, the actuator follows whichever control signal is still active. This is noted in the UI because real behaviour depends on the control circuit.
- Family pages show only technology class and general principles. Manufacturer data is marked *not verified in this build*.
- `eslint.config.mjs` relaxes two React Compiler rules (`immutability`, `refs`) for `src/components/three/**` only, because React Three Fiber mutates Three.js objects in frame callbacks by design.

## Performance and security

- The 3D engine (~1 MB uncompressed) is loaded only when a 3D view scrolls into view (`LazyMount`); the dashboard's first screen ships without it.
- `next.config.ts` sets baseline security headers (frame-ancestors/X-Frame-Options, nosniff, referrer and permissions policies). A full nonce-based CSP is still to do.

## Known limitations

- Vane, electric multi-turn (rising stem) and hydraulic types are not yet simulated; nor are butterfly and plug valves.
- Lessons 9–16 are outlines only.
- The air flow view is illustrative, not CFD.
- Progress lives in one browser; clearing site data resets it.
- In headless or software-rendered browsers the 3D view is slow; the simulation clock clamps long frames to 0.25 s.
- If WebGL is unavailable, a live 2D schematic replaces the 3D view and every control still works.
