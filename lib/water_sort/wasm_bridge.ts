import type { Move, PuzzleState, SolveResult } from "./model.js";
import {
    readWasmWaterSortFlatState,
    wasmWaterSortGenerateLevel,
    wasmWaterSortSolve,
    writeWasmWaterSortFlatState,
    type WasmWaterSortFlatState,
    type WasmWaterSortGenerateInput,
} from "../tsl/wasm/ts/wasm_api_water_sort.js";

export function puzzleStateToFlat(state: PuzzleState): WasmWaterSortFlatState {
    return {
        capacity: state.capacity,
        bottles: state.bottles.map((bottle) => ({ layers: [...bottle.layers] })),
    };
}

export function flatToPuzzleState(flat: WasmWaterSortFlatState): PuzzleState {
    return {
        capacity: flat.capacity,
        bottles: flat.bottles.map((bottle) => ({ layers: [...bottle.layers] })),
    };
}

export function wasmSolve(
    state: PuzzleState,
    options: { maxStates?: number; analyzeUniqueOptimal?: boolean } = {},
): SolveResult {
    const maxStates = options.maxStates ?? Number.POSITIVE_INFINITY;
    if (!Number.isFinite(maxStates)) {
        const result = wasmWaterSortSolve(puzzleStateToFlat(state), 2_000_000_000);
        return wasmResultToSolveResult(result, options.analyzeUniqueOptimal === true);
    }
    const result = wasmWaterSortSolve(puzzleStateToFlat(state), maxStates);
    return wasmResultToSolveResult(result, options.analyzeUniqueOptimal === true);
}

function wasmResultToSolveResult(
    result: ReturnType<typeof wasmWaterSortSolve>,
    analyzeUniqueOptimal: boolean,
): SolveResult {
    if (result.status === 0) {
        return { solvable: false, statesVisited: result.statesVisited, complete: false };
    }
    if (result.status === 1) {
        return { solvable: false, statesVisited: result.statesVisited, complete: true };
    }
    return {
        solvable: true,
        moves: result.moves as Move[],
        moveCount: result.moveCount,
        statesVisited: result.statesVisited,
        complete: true,
        ...(analyzeUniqueOptimal ? {} : {}),
    };
}

export function wasmGenerateLevel(input: WasmWaterSortGenerateInput): {
    state: PuzzleState;
    solution: Move[];
    optimalMoves: number;
    statesVisited: number;
    legalMovesAtStart: number;
    uniqueOptimal: boolean | null;
} | null {
    const generated = wasmWaterSortGenerateLevel(input);
    if (generated === null) return null;
    return {
        state: flatToPuzzleState(generated.state),
        solution: generated.solution as Move[],
        optimalMoves: generated.optimalMoves,
        statesVisited: generated.statesVisited,
        legalMovesAtStart: generated.legalMovesAtStart,
        uniqueOptimal: generated.uniqueOptimal,
    };
}

/** Test helper: round-trip a puzzle through the WASM flat encoding. */
export function roundTripFlatState(state: PuzzleState): PuzzleState {
    return flatToPuzzleState(readWasmWaterSortFlatState(writeWasmWaterSortFlatState(puzzleStateToFlat(state))));
}
