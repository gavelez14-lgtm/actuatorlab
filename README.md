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
| Actuator Explorer | Technology library by mechanism and power source, detail pages, valve library. Every listed type is interactive except the rising-stem entry, which opens the multi-turn simulator. Old product-code URLs redirect. |
| 3D Simulator | Pneumatic Scotch yoke, twin-piston pneumatic rack and pinion, single-vane pneumatic rotary, electric part-turn with worm-wheel segment (on a ball valve), electric multi-turn on a rising-stem wedge gate valve, compact electromechanical part-turn, direct high-pressure gas Scotch yoke with line-break detection and hydraulic hand-pump override, gas-over-oil with flow-controlled stroke speed and a low-pressure trip, a self-contained electro-hydraulic actuator with an integral controller (positioner, ESD, partial-stroke test), and hydraulic Scotch yoke and rack and pinion on a power unit (choose in the header, or `?type=rack-pinion` / `electric-part-turn` / `electric-multi-turn` / `electric-compact-part-turn` / `gas-scotch-yoke` / `gas-over-oil` / `electro-hydraulic` / `hydraulic-scotch-yoke` / `hydraulic-rack-pinion` / `pneumatic-vane`). Scotch yokes offer a symmetric or canted yoke. 5 modes, 3 configurations, supply loss, component inspection, and an exploded anatomy view (numbered parts matching the parts list, isolate a part, works while operating; `?explode=1`) |
| Compare | Scotch yoke vs rack and pinion (torque shape, typical characteristics), and six power sources side by side |
| Academy | 19-lesson curriculum, all written, with embedded live 3D demos, torque figures and knowledge checks. |
| Assessments | Hands-on fault-finding (7 jobs on live simulators with hidden faults and the status line hidden) and three scored quizzes with explanations |

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
    engine.ts         time-based core: clock, snapshots, notices, generic commands
    families/         one behaviour module per family: chambers, forces, step,
                      open/close, family-only commands, status text
                      (fluid.ts: pneumatic + hydraulic, gas.ts, electric.ts,
                      electroHydraulic.ts; shared.ts holds the contract)
    __tests__/        Vitest: kinematics, supply loss, fail actions, frame-rate independence
  components/three/   React Three Fiber renderer (reads engine state in useFrame)
  components/sim/     simulator UI (provider, panels, playback, torque chart)
    familyUi.ts       presentation registry: titles, menu, URL type, labels,
                      which controls and readouts each family shows
  components/learn/   lessons, figures, embedded sims, questions
  data/               actuators, components, lessons, assessments, faults, valves, compare
  lib/progress.ts     localStorage progress behind a ProgressRepository interface
supabase/schema.sql   database-ready entities + RLS for a future backend
```

**Render loop.** The engine advances on `requestAnimationFrame` using real elapsed time multiplied by the speed setting. Velocity is smoothed toward a force-derived target, so pausing, reversing and resuming never jump. The canvas uses `frameloop="demand"` and only re-renders when the engine ticks or the camera moves. React UI subscribes to a snapshot throttled to about 15 Hz, so React does not re-render every frame.

**Mechanics.** The pin is constrained to the guide line `z = −d` and to the yoke slot (a radial line from the shaft), which gives `x = d·tanφ`. The slider group (block, pin, rod, piston, spring plate) translates by `x`, and the shaft group (yoke, shaft, coupling, indicator) rotates by `−φ`. The ball is rigidly offset from the shaft by the coupling orientation. `checkGeometry()` verifies through the full stroke that the piston stays inside the cylinder, the pin stays inside the slot and the spring never goes solid.

**Fail action is physical, not scripted.** In spring return, removing air leaves the spring as the only active force, so the engine drives to the spring end. Fail open and fail closed differ only in the 90° coupling orientation. Double acting has no stored energy, so on supply loss the active force is zero and the actuator stops in place.

**Torque model.** `T = F·d / cos²φ` (symmetric yoke), with an illustrative linear spring, an illustrative ball valve demand that peaks at the seat, and valve demand treated as friction. Below the illustrative minimum pressure, the actuator stalls part-way.

## Reference sources for mechanism architecture

- Exterior details follow public brochure and manual descriptions (no CAD, dimensions or marks): Scotch yoke units show a bolted fabricated centre body with bottom relief valve, tie-rod cylinder with lifting plates and a cap-nutted stop bolt, and a welded spring canister (Rotork GP/GH brochure pub011-001, manual pub011-004); rack and pinion units show a silver anodised extrusion with black RAL 9005 die-cast end caps (blue RAL 5015 via the Blue finish), stainless screws and stop nuts (GT brochure pub110-019). Nameplates are deliberately blank.
- Further exterior details from public brochure text: vane units in green RAL 6018 powder-coated split cases with stainless fixings, two stop bolts, NAMUR manifold and a flat-on-shaft vane indicator (K-TORK pub097-001); the large hydraulic rack and pinion as a cast centre housing with tie-rod hydraulic cylinders and cap-nutted stop bolts (RH pub019-004); gas-over-oil with two hand pumps (one per direction) instead of an override cylinder, and lever-operated poppet valves and a particulate filter on both gas types (GO pub017-001, HPG pub016-001); the electro-hydraulic module with a round display window, indication beacon and separate terminal enclosure (Skilmatic SI pub021-057/064). Proportions remain original estimates.
- Visual cues checked against the product photographs in those brochures: painted cylinder tubes and large-diameter spring cans on Scotch yoke units, tall domed gas/oil tanks and stainless control cabinets on gas units, the yellow dome indicator on the twin-piston unit, cast ribs and a red dome cap on the vane unit, and a light grey standard finish for the self-contained electro-hydraulic unit (offered as each family's standard finish; graphite remains the site default elsewhere). Geometry is original; no images, logos or dimensions are copied.
- Twin-piston rack and pinion: layout follows publicly documented features of compact twin-piston actuators, e.g. the Rotork GT range brochure (pub110-019) and distributor listings (twin opposed pistons and racks, convertible single/double acting, anti-blowout pinion, ±5° end stops, NAMUR top / ISO 5211 bottom). Proportions in `rackPinionGeometry.ts` are original, not manufacturer dimensions. The UI stays vendor-neutral.

- Electric part-turn: layout and behaviour follow publicly documented intelligent part-turn actuators, e.g. Rotork IQ3/IQT3 catalogue (PUB002-038), IQT Pro brochure (PUB002-010) and IQT data sheet: motor-driven worm and wheel, torque sensed from worm-shaft end thrust with motor switch-off at a set limit, contactless absolute encoder that holds position without power, geared handwheel selected by a lockable hand/auto lever, magnetically coupled Local/Stop/Remote and Open/Close selectors, battery-backed display, double-sealed terminal compartment. A partial worm-wheel segment is inferred from the brochures offering a full wheel as an option. Proportions are original.

- Electric multi-turn: follows public IQ literature (IQ installation and safe-use manuals PUB002-024 / PUB002-039, IQ3 Pro couplings PUB002-197): hollow output with drive dogs turning a drive bush (stem nut) in a separate thrust base on a thrust bearing, rising stem through the centre column with a cover tube above the top handwheel, hand drive that disengages automatically when the motor runs, ISO 5210 flange. Electric physics runs in fixed 1/120 s sub-steps so seating and jams are never skipped on slow devices.

- Compact electromechanical part-turn: follows the public Noah NA brochure (two-stage self-locking gearing, cam limit switches, mechanical open/close torque switch, thermal protector, domed position indicator, handwheel with lockable manual/auto lever, stop bolts). The spur-then-worm arrangement of the two stages is illustrative.
- Direct high-pressure gas Scotch yoke: follows public descriptions of direct-gas pipeline actuators (e.g. Rotork HPG brochure): pipeline gas as power, rate-of-drop line-break detection, a tandem hydraulic override cylinder with hand pump, symmetric or canted yoke. Pipeline pressures, set points, delays, tank behaviour and the cant angle are illustrative. The canted yoke is real kinematics: the swing is offset by 6°, the piston and spring shift to centre the longer pin travel, and the coupling is keyed so the valve still turns 0–90°.
- Gas over oil: follows public descriptions of gas-over-oil pipeline actuators (e.g. Rotork GO brochure): gas pressurising oil in two tanks, oil driving the cylinder, flow controls setting speed, line-break and low-pressure trips, hand pumps. Speeds, set points and tank levels are illustrative.
- Electro-hydraulic with integral controller: follows public descriptions of self-contained electro-hydraulic actuators (e.g. Rotork Skilmatic SI brochure): motor-driven pump stroking a cylinder against a spring, dump solenoid for the spring stroke and fail-safe, integral positioning control, ESD input and partial-stroke testing. Pressures, speeds, deadband and PST travel are illustrative.
- Hydraulic Scotch yoke and rack and pinion reuse the pneumatic mechanisms on oil from a separate power unit (the large twin-piston rack and pinion follows public descriptions of hydraulic ranges such as Rotork RH). Pressure range and speeds are illustrative; oil is metered, so stroke time follows the flow controls.
- 3D labels use an in-house `SceneLabel` instead of drei `<Html>`, which threw on route changes and unmounted its root synchronously.

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

- Vane actuators are modelled double acting only.
- Quarter-turn actuators can drive a ball, butterfly or plug valve (`?valve=butterfly|plug`), each with an illustrative demand shape. Electric part-turn types use the ball valve.
- The air flow view is illustrative, not CFD.
- Progress lives in one browser; clearing site data resets it.
- In headless or software-rendered browsers the 3D view is slow; the simulation clock clamps long frames to 0.25 s.
- If WebGL is unavailable, a live 2D schematic replaces the 3D view and every control still works.
