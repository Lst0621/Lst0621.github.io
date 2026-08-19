/**
 * Pure rules and data types for Water Sort puzzles.
 *
 * A bottle's layers are always ordered from bottom to top.  None of the
 * functions in this module mutate their arguments.
 */

export type ColorId = number;

export interface BottleState {
    /** Liquid layers ordered bottom-to-top. */
    layers: ColorId[];
}

export interface PuzzleState {
    bottles: BottleState[];
    capacity: number;
}

export interface Move {
    from: number;
    to: number;
    /**
     * Layers to pour from the source's top color run.  Omit or use the full
     * transferable run for a maximal pour.
     */
    count?: number;
}

/** Result returned by the exact solver. */
export interface SolveResult {
    solvable: boolean;
    /** Present only when a solution was found. */
    moves?: Move[];
    /** Present only when a solution was found. */
    moveCount?: number;
    /** Number of concrete BFS states removed from the queue. */
    statesVisited: number;
    /** False only when a caller-supplied search budget was reached. */
    complete: boolean;
    /** Optional quotient-graph analysis of shortest solutions. */
    uniqueOptimal?: boolean;
}

/** Return a deep, independent copy of a puzzle state. */
export function cloneState(state: PuzzleState): PuzzleState {
    return {
        capacity: state.capacity,
        bottles: state.bottles.map((bottle) => ({ layers: [...bottle.layers] })),
    };
}

/** Number of consecutive top layers that have the bottle's top color. */
export function topColorRunLength(bottle: BottleState): number {
    const { layers } = bottle;
    if (layers.length === 0) return 0;

    const top = layers[layers.length - 1];
    let count = 1;
    for (let index = layers.length - 2; index >= 0 && layers[index] === top; index--) {
        count++;
    }
    return count;
}

/** How many top layers may be poured along this pair right now. */
export function maxTransferCount(state: PuzzleState, move: Pick<Move, "from" | "to">): number {
    const source = state.bottles[move.from];
    const destination = state.bottles[move.to];
    if (source === undefined || destination === undefined) return 0;
    if (source.layers.length === 0) return 0;
    if (destination.layers.length >= state.capacity) return 0;

    return Math.min(topColorRunLength(source), state.capacity - destination.layers.length);
}

/** Resolved pour size; omitted `count` means a maximal pour. */
export function transferCount(state: PuzzleState, move: Move): number {
    const maximum = maxTransferCount(state, move);
    if (move.count === undefined) return maximum;
    return move.count;
}

/**
 * Whether a move obeys the Water Sort rules.  Malformed states and invalid
 * bottle indices are treated as illegal rather than throwing here.
 */
export function isLegalMove(state: PuzzleState, move: Move): boolean {
    if (!Number.isInteger(state.capacity) || state.capacity <= 0) return false;
    if (!Number.isInteger(move.from) || !Number.isInteger(move.to) || move.from === move.to) {
        return false;
    }
    if (move.count !== undefined && (!Number.isInteger(move.count) || move.count <= 0)) {
        return false;
    }

    const source = state.bottles[move.from];
    const destination = state.bottles[move.to];
    if (source === undefined || destination === undefined) return false;
    if (source.layers.length === 0 || source.layers.length > state.capacity) return false;
    if (destination.layers.length >= state.capacity) return false;

    const count = transferCount(state, move);
    const maximum = maxTransferCount(state, move);
    return count >= 1 && count <= maximum;
}

/**
 * Apply one legal pour and return a new state.
 *
 * By default a pour transfers the whole matching top run that fits.  Pass
 * `move.count` to move only part of that run.
 */
export function applyMove(state: PuzzleState, move: Move): PuzzleState {
    if (!isLegalMove(state, move)) {
        throw new Error(`Illegal Water Sort move: ${move.from} -> ${move.to}`);
    }

    const next = cloneState(state);
    const source = next.bottles[move.from];
    const destination = next.bottles[move.to];
    const pouredCount = transferCount(state, move);
    const poured = source.layers.splice(source.layers.length - pouredCount, pouredCount);
    destination.layers.push(...poured);
    return next;
}

/** Return all legal maximal pours; partial amounts remain legal when explicitly requested. */
export function getLegalMoves(state: PuzzleState): Move[] {
    const moves: Move[] = [];
    for (let from = 0; from < state.bottles.length; from++) {
        for (let to = 0; to < state.bottles.length; to++) {
            if (from === to) continue;
            const pair = { from, to };
            if (maxTransferCount(state, pair) <= 0) continue;
            moves.push(pair);
        }
    }
    return moves;
}

/**
 * A solved puzzle has only full, single-color non-empty bottles.  Empty spare
 * bottles are intentionally allowed.
 */
export function isSolved(state: PuzzleState): boolean {
    if (!Number.isInteger(state.capacity) || state.capacity <= 0) return false;
    return state.bottles.every((bottle) => {
        if (bottle.layers.length === 0) return true;
        if (bottle.layers.length !== state.capacity) return false;
        return bottle.layers.every((color) => color === bottle.layers[0]);
    });
}

/**
 * Canonical key for the solver.  Bottle positions do not matter to the rules,
 * so their layer strings are sorted.  This merges every permutation of a
 * board, including interchangeable empty bottles, while retaining concrete
 * color identities (which avoids expensive color-graph isomorphism work).
 */
export function canonicalizeState(state: PuzzleState): string {
    const bottles = state.bottles
        .map((bottle) => bottle.layers.join(","))
        .sort();
    return `${state.capacity};${bottles.join("|")}`;
}

/** Compact, human-readable debug representation, one bottle per line. */
export function stateToText(state: PuzzleState): string {
    return state.bottles
        .map((bottle, index) => `${index}: ${bottle.layers.length === 0 ? "." : bottle.layers.join(" ")}`)
        .join("\n");
}

/** True only for structurally valid states that the solver may search. */
export function isWellFormedState(state: PuzzleState): boolean {
    return Number.isInteger(state.capacity)
        && state.capacity > 0
        && state.bottles.every((bottle) => bottle.layers.length <= state.capacity
            && bottle.layers.every((color) => Number.isInteger(color)));
}
