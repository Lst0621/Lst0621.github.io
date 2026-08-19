# Water Sort

This is the DOM-free TypeScript reference implementation behind the Canvas
game. It deliberately stays out of WebAssembly: the bounded presets are fast
enough in the browser, and the search can be moved behind a coarse `solve` or
`generate` boundary later only if profiling shows that it is useful.

## Files

- `model.ts` — immutable puzzle state and legal-pour rules.
- `solver.ts` — exact breadth-first solver and replay helper.
- `generator.ts` — seeded, solver-verified level generator and level codes.
- `../page/water_sort.ts` — Canvas renderer, pointer input, animation, undo,
  hints, and controls.
- `../../article/water_sort.html` — standalone responsive game page.
- `../tsl/ts/test/water_sort.test.ts` — focused automated regression tests.
- `../page/pages.ts` — site-index entry.

## State and moves

`PuzzleState.bottles[n].layers` is an array of integer color IDs ordered from
bottom to top. `capacity` applies to every bottle. Rendering maps those IDs to
the page's presentation palette, so color artwork never affects equality or
search.

`Move` is `{ from, to }`. The pure model exports `isLegalMove`, `applyMove`,
`getLegalMoves`, `isSolved`, `cloneState`, and `stateToText`.

A pour is legal only when its source is non-empty, its distinct destination is
not full, and the destination is empty or has the same top color. `applyMove`
then transfers the largest contiguous top-color run that fits; it never mutates
the supplied state. A game is won once every non-empty bottle is full and
monochrome—empty spare bottles stay empty.

## Solver and canonicalization

`solve` uses breadth-first search, so an exhaustive result is optimal. Its
visited key sorts the serialized bottle contents, which safely merges arbitrary
bottle permutations, including interchangeable empty bottles. It keeps the
concrete indexed state and parent move at each BFS node, so the returned move
sequence is directly replayable from the exact on-screen board.

Colors intentionally retain their integer identities in the key. That avoids
an expensive color-isomorphism pass while still removing the dominant bottle
symmetry. The solver does not make unsafe heuristic move omissions; duplicate
canonical states are the pruning mechanism. A caller may supply a state budget;
in that case `complete: false` means "not finished", never "unsolvable".
Optional unique-optimal analysis counts shortest paths in this bottle-permutation
quotient.

## Procedural levels and difficulty

Generation starts with full monochrome bottles plus the requested spare
bottles. It walks backwards through only reverse operations whose corresponding
forward maximal pour is replay-checked with the model. Every candidate is then
solved exactly and rejected unless it is mixed, keeps exactly the requested
empty-bottle count, fits the requested optimal-length range, and fits the
search budget. It therefore does not rely on random boards that merely happen
to look plausible.

`DIFFICULTY_PRESETS` supplies Easy, Medium, and Hard presets. They differ in
color count and solver-derived solution-length ranges; each generated level
also records its optimal moves, BFS states visited, and legal opening moves.
The game displays the first two metrics rather than presenting color count as
the only difficulty signal.

To add a preset, add an entry to `DIFFICULTY_PRESETS` with a capacity, color
count, spare count, solution-length interval, and practical solver/attempt
budgets. Run the focused tests across a seed range before exposing it in the UI.

## Seeds and share codes

`generateLevel(options)` is deterministic, including for the full unsigned
32-bit seed range. A code such as
`ws1&seed=845192&colors=4&capacity=4&empty=2&min=8&max=24&unique=0&attempts=220&states=200000`
contains the seed and all generation limits that influence candidate selection,
but never the solution. `decodeLevelCode` followed by `generateLevel` recreates
the same initial board. Shared codes are capped at the reference UI's safe
limits (8 colors, capacity 4, 3 empties, 40 moves, 500 attempts, and 800,000
solver states); larger offline experiments can call `generateLevel` directly.

## Running and testing

From the repository root:

```sh
cd lib
npm run -s jest -- water_sort.test.ts --runInBand
npm run build
cd ..
./build_assets_local.sh
```

Open `article/water_sort.html` through the project's normal static-site server
or deployed site. The focused tests cover all legal/illegal pour cases,
capacity and contiguous-run behavior, solved detection, undo snapshots,
canonical equivalence, known optimal and unsolvable puzzles, deterministic
reproduction, requested solution ranges, requested spare-bottle counts, and
all built-in difficulty presets.
