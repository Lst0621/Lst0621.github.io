# Bubble Chain

Standalone TypeScript puzzle behind the Canvas game. Simulation stays in
TypeScript; rendering and pointer input live in `lib/page/bubble_chain.ts`.

## Files

- `types.ts` — shared puzzle types.
- `model.ts` — deterministic movement, collision, chain activation, reset, win/loss.
- `levels.ts` — hand-authored level data.
- `generator.ts` — seeded procedural levels with solver verification.
- `solver.ts` — exhaustive starter-bubble analysis.
- `../page/bubble_chain.ts` — Canvas renderer, pop effects, pointer input, UI.
- `../../article/bubble_chain.html` — responsive demo page.
- `../tsl/ts/test/bubble_chain.test.ts` — focused regression tests.
- `../page/pages.ts` — site-index entry.

## Puzzle state

`PuzzleState` stores board size, movement speed, and an array of `BubbleState`
records. Each bubble keeps its id, position, radius, direction, `active`, and
`removed` flags. The puzzle phase is one of `idle`, `simulating`, `won`, or
`lost`.

Static layouts come from `LevelDefinition` / `BubbleDefinition` in `levels.ts`.
The model never reads Canvas APIs.

## Collision and chain reaction

Each simulation sub-step (`SIMULATION_DT = 1/600`):

1. Move every active, non-removed bubble along its direction by `speed * dt`.
2. Remove active bubbles whose circle lies fully outside the board.
3. For each active bubble, find the first eligible target whose circles overlap
   (`distance <= r1 + r2`). A mover generates at most one collision per sub-step.
   Layout validation prevents off-center near misses: a lane either passes through
   a target center or stays outside its collision radius.
4. On collision: remove the mover, activate the target (which keeps its own
   predefined direction).
5. When no active bubbles remain, set `won` if nothing is left, otherwise `lost`.

Large frame deltas are sliced into fixed sub-steps so browser animation and the
solver share the same deterministic path.

## Layout safety

Use a shared affine grid with pitch greater than a bubble diameter—not merely
coordinates that are multiples of the radius. The default pitch is `2r + 10`.
For Möbius and Klein levels, the reflected axis is centered so the reflection
maps grid centers to grid centers. Layout validation rejects both seam overlap
and any off-center lane that could enter another bubble's collision radius.

## Define another level

Add a `LevelDefinition` to `levels.ts`:

```ts
export const levelExample: LevelDefinition = {
    width: 800,
    height: 560,
    bubbles: [
        { id: 0, x: 80, y: 280, radius: 26, direction: "right" },
        // ...
    ],
};
```

Register it in `CATALOG` and point the page at it if needed. After editing,
re-run the solver test to confirm the intended unique starter.

## Random levels

```ts
import { generateLevel, randomSeed } from "./generator.js";

const seed = randomSeed(); // or a fixed unsigned 32-bit integer
const generated = generateLevel({ seed });
// generated.level, generated.winningBubbleId, generated.name
```

The generator walks an orthogonal path, assigns relay directions, and rejects
candidates unless the solver finds exactly one winning starter. The same seed
always reproduces the same board.

## Verify with the solver

```ts
import { solveLevel, formatSolverReport } from "./solver.js";
import { levelSpiralRelay } from "./levels.js";

console.log(formatSolverReport(solveLevel(levelSpiralRelay)));
// Bubble 0: WIN
// Bubble 1: fail
// ...
```

`solveLevel` simulates every starting bubble to idle and reports winners.

## Run and test

From the repository root:

```sh
cd lib
npm run -s jest -- bubble_chain.test.ts --runInBand
npm run build
cd ..
./build_assets_local.sh
```

Open `article/bubble_chain.html` through the project's normal static-site flow.
