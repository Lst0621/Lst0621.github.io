import { applyMove, type Move, type PuzzleState } from "./model.js";
import { wasmSolve } from "./wasm_bridge.js";

export interface SolverOptions {
    /**
     * Optional safety budget.  Omit it for an exhaustive, exact answer.  A
     * budgeted search reports `complete: false` instead of claiming a puzzle
     * is unsolvable.
     */
    maxStates?: number;
    /** Reserved for parity with the reference solver; WASM BFS omits this today. */
    analyzeUniqueOptimal?: boolean;
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

/** Exact breadth-first Water Sort solver (C++/WASM). */
export function solve(state: PuzzleState, options: SolverOptions = {}): SolveResult {
    return wasmSolve(state, options);
}

/** Replay a sequence defensively; useful to consumers and unit tests. */
export function replayMoves(state: PuzzleState, moves: readonly Move[]): PuzzleState {
    return moves.reduce((current, move) => applyMove(current, move), state);
}
