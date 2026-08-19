import {
    cloneState,
    getLegalMoves,
    type Move,
    type PuzzleState,
} from "./model.js";
import { wasmGenerateLevel } from "./wasm_bridge.js";

export interface GeneratorOptions {
    /** A 32-bit deterministic seed. */
    seed: number;
    colorCount?: number;
    capacity?: number;
    emptyBottleCount?: number;
    minSolutionLength?: number;
    maxSolutionLength?: number;
    /** Reject a level unless the canonical shortest-path analysis is unique. */
    requireUniqueOptimalSolution?: boolean;
    /** Bounded deterministic retries before generation reports failure. */
    maxAttempts?: number;
    /** Per-attempt exact-solver budget; incomplete searches are rejected. */
    maxSolverStates?: number;
}

/**
 * The supported game-board range. These limits match the board-setup menus
 * (3–6 colored bottles, 3–8 layers per bottle, one empty spare).
 */
export const MIN_WATER_SORT_CAPACITY = 3;
export const MAX_WATER_SORT_CAPACITY = 8;
export const MIN_WATER_SORT_COLOR_COUNT = 3;
export const MAX_WATER_SORT_COLOR_COUNT = 6;
export const WATER_SORT_EMPTY_BOTTLE_COUNT = 1;
export const MAX_WATER_SORT_SOLUTION_LENGTH = 48;

export interface ResolvedGeneratorOptions {
    seed: number;
    colorCount: number;
    capacity: number;
    emptyBottleCount: number;
    minSolutionLength: number;
    maxSolutionLength: number;
    requireUniqueOptimalSolution: boolean;
    maxAttempts: number;
    maxSolverStates: number;
}

export interface DifficultyMetrics {
    optimalMoves: number;
    statesVisited: number;
    legalMovesAtStart: number;
}

export interface GeneratedLevel {
    /** The mixed, initial puzzle state. */
    state: PuzzleState;
    /** Independent copy for convenient restart handling by UI consumers. */
    initialState: PuzzleState;
    seed: number;
    options: ResolvedGeneratorOptions;
    solution: Move[];
    optimalMoves: number;
    statesVisited: number;
    legalMovesAtStart: number;
    metrics: DifficultyMetrics;
    uniqueOptimal?: boolean;
    levelCode: string;
}

export type DifficultyName = "easy" | "medium" | "hard";

export type DifficultyPreset = Omit<GeneratorOptions, "seed">;

export interface WaterSortBoardSetup {
    colorCount: number;
    capacity: number;
}

function integerOption(value: number | undefined, fallback: number, name: string, minimum: number): number {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || resolved < minimum) {
        throw new Error(`${name} must be an integer >= ${minimum}`);
    }
    return resolved;
}

function boundedIntegerOption(
    value: number | undefined,
    fallback: number,
    name: string,
    minimum: number,
    maximum: number,
): number {
    const resolved = integerOption(value, fallback, name, minimum);
    if (resolved > maximum) {
        throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
    }
    return resolved;
}

type DifficultyTierStarts = readonly [easy: number, medium: number, hard: number];

const DIFFICULTY_TIER_STARTS: Readonly<Record<string, DifficultyTierStarts>> = {
    "3x3": [3, 5, 7],
    "3x4": [3, 6, 9],
    "3x5": [4, 9, 12],
    "3x6": [5, 10, 14],
    "3x7": [7, 12, 16],
    "3x8": [10, 14, 18],
    "4x3": [3, 6, 8],
    "4x4": [6, 10, 13],
    "4x5": [7, 13, 16],
    "4x6": [11, 16, 20],
    "4x7": [13, 18, 22],
    "4x8": [15, 20, 24],
    "5x3": [6, 9, 11],
    "5x4": [9, 13, 16],
    "5x5": [10, 15, 19],
    "5x6": [12, 18, 22],
    "5x7": [14, 20, 26],
    "5x8": [16, 22, 28],
    "6x3": [5, 10, 13],
    "6x4": [13, 16, 19],
    "6x5": [14, 19, 23],
    "6x6": [16, 22, 28],
    "6x7": [18, 24, 32],
    "6x8": [20, 28, 36],
};

function generationBudgets(coloredLayers: number): Pick<DifficultyPreset, "maxAttempts" | "maxSolverStates"> {
    if (coloredLayers <= 18) return { maxAttempts: 750, maxSolverStates: 100_000 };
    if (coloredLayers <= 24) return { maxAttempts: 1_200, maxSolverStates: 400_000 };
    if (coloredLayers <= 36) return { maxAttempts: 1_500, maxSolverStates: 600_000 };
    return { maxAttempts: 1_500, maxSolverStates: 800_000 };
}

function normalizeOptions(options: GeneratorOptions): ResolvedGeneratorOptions {
    if (!Number.isSafeInteger(options.seed)
        || options.seed < -0x8000_0000
        || options.seed > 0xffff_ffff) {
        throw new Error("seed must be a signed or unsigned 32-bit integer");
    }
    const seed = options.seed >>> 0;
    const colorCount = boundedIntegerOption(
        options.colorCount,
        4,
        "colorCount",
        MIN_WATER_SORT_COLOR_COUNT,
        MAX_WATER_SORT_COLOR_COUNT,
    );
    const capacity = boundedIntegerOption(
        options.capacity,
        6,
        "capacity",
        MIN_WATER_SORT_CAPACITY,
        MAX_WATER_SORT_CAPACITY,
    );
    const emptyBottleCount = options.emptyBottleCount ?? WATER_SORT_EMPTY_BOTTLE_COUNT;
    if (emptyBottleCount !== WATER_SORT_EMPTY_BOTTLE_COUNT) {
        throw new Error(`emptyBottleCount must be ${WATER_SORT_EMPTY_BOTTLE_COUNT}`);
    }
    const minSolutionLength = boundedIntegerOption(
        options.minSolutionLength,
        15,
        "minSolutionLength",
        1,
        MAX_WATER_SORT_SOLUTION_LENGTH,
    );
    const maxSolutionLength = boundedIntegerOption(
        options.maxSolutionLength,
        27,
        "maxSolutionLength",
        minSolutionLength,
        MAX_WATER_SORT_SOLUTION_LENGTH,
    );
    const maxAttempts = boundedIntegerOption(options.maxAttempts, 1_200, "maxAttempts", 1, 1_500);
    const maxSolverStates = boundedIntegerOption(options.maxSolverStates, 400_000, "maxSolverStates", 1, 800_000);
    return {
        seed,
        colorCount,
        capacity,
        emptyBottleCount,
        minSolutionLength,
        maxSolutionLength,
        requireUniqueOptimalSolution: options.requireUniqueOptimalSolution === true,
        maxAttempts,
        maxSolverStates,
    };
}

export function difficultyOptionsForBoard(
    difficulty: DifficultyName,
    board: WaterSortBoardSetup,
): DifficultyPreset {
    const colorCount = boundedIntegerOption(
        board.colorCount,
        0,
        "colorCount",
        MIN_WATER_SORT_COLOR_COUNT,
        MAX_WATER_SORT_COLOR_COUNT,
    );
    const capacity = boundedIntegerOption(
        board.capacity,
        0,
        "capacity",
        MIN_WATER_SORT_CAPACITY,
        MAX_WATER_SORT_CAPACITY,
    );

    const coloredLayers = colorCount * capacity;
    const starts = DIFFICULTY_TIER_STARTS[`${colorCount}x${capacity}`];
    if (starts === undefined) throw new Error("Unsupported Water Sort board dimensions");
    const tierIndex = difficulty === "easy" ? 0 : difficulty === "medium" ? 1 : 2;
    const minSolutionLength = starts[tierIndex];
    const nextTierStart = starts[tierIndex + 1];
    const maxSolutionLength = nextTierStart === undefined
        ? MAX_WATER_SORT_SOLUTION_LENGTH
        : nextTierStart - 1;
    const budgets = generationBudgets(coloredLayers);
    return {
        colorCount,
        capacity,
        emptyBottleCount: WATER_SORT_EMPTY_BOTTLE_COUNT,
        minSolutionLength,
        maxSolutionLength,
        ...budgets,
    };
}

export const DIFFICULTY_PRESETS: Readonly<Record<DifficultyName, DifficultyPreset>> = {
    easy: difficultyOptionsForBoard("easy", { colorCount: 3, capacity: 6 }),
    medium: difficultyOptionsForBoard("medium", { colorCount: 4, capacity: 6 }),
    hard: difficultyOptionsForBoard("hard", { colorCount: 4, capacity: 6 }),
};

/** Generate a deterministic, WASM-verified puzzle in the requested range. */
export function generateLevel(input: GeneratorOptions): GeneratedLevel {
    const options = normalizeOptions(input);
    const generated = wasmGenerateLevel({
        seed: options.seed,
        colorCount: options.colorCount,
        capacity: options.capacity,
        emptyBottleCount: options.emptyBottleCount,
        minSolutionLength: options.minSolutionLength,
        maxSolutionLength: options.maxSolutionLength,
        requireUniqueOptimalSolution: options.requireUniqueOptimalSolution,
        maxAttempts: options.maxAttempts,
        maxSolverStates: options.maxSolverStates,
    });
    if (generated === null) {
        throw new Error(
            `Unable to generate a Water Sort level for seed ${options.seed} after ${options.maxAttempts} attempts`,
        );
    }

    const state = cloneState(generated.state);
    const metrics: DifficultyMetrics = {
        optimalMoves: generated.optimalMoves,
        statesVisited: generated.statesVisited,
        legalMovesAtStart: generated.legalMovesAtStart || getLegalMoves(state).length,
    };
    return {
        state,
        initialState: cloneState(state),
        seed: options.seed,
        options,
        solution: [...generated.solution],
        optimalMoves: metrics.optimalMoves,
        statesVisited: metrics.statesVisited,
        legalMovesAtStart: metrics.legalMovesAtStart,
        metrics,
        ...(generated.uniqueOptimal === null ? {} : { uniqueOptimal: generated.uniqueOptimal }),
        levelCode: encodeLevelCode(options),
    };
}

export function generatePresetLevel(difficulty: DifficultyName, seed: number): GeneratedLevel {
    return generateLevel({ ...DIFFICULTY_PRESETS[difficulty], seed });
}

export type LevelCodeInput = Pick<
    ResolvedGeneratorOptions,
    "seed" | "colorCount" | "capacity" | "emptyBottleCount"
    | "minSolutionLength" | "maxSolutionLength" | "requireUniqueOptimalSolution"
    | "maxAttempts" | "maxSolverStates"
>;

const MAX_LEVEL_CODE_COLORS = MAX_WATER_SORT_COLOR_COUNT;
const MAX_LEVEL_CODE_CAPACITY = MAX_WATER_SORT_CAPACITY;
const MAX_LEVEL_CODE_EMPTY_BOTTLES = WATER_SORT_EMPTY_BOTTLE_COUNT;
const MAX_LEVEL_CODE_SOLUTION_LENGTH = MAX_WATER_SORT_SOLUTION_LENGTH;
const MAX_LEVEL_CODE_ATTEMPTS = 1_500;
const MAX_LEVEL_CODE_SOLVER_STATES = 800_000;

function assertLevelCodeBounds(input: LevelCodeInput): void {
    if (input.colorCount > MAX_LEVEL_CODE_COLORS
        || input.capacity > MAX_LEVEL_CODE_CAPACITY
        || input.emptyBottleCount !== MAX_LEVEL_CODE_EMPTY_BOTTLES
        || input.maxSolutionLength > MAX_LEVEL_CODE_SOLUTION_LENGTH
        || input.maxAttempts > MAX_LEVEL_CODE_ATTEMPTS
        || input.maxSolverStates > MAX_LEVEL_CODE_SOLVER_STATES) {
        throw new Error("Water Sort level code exceeds the browser-safe generation limits");
    }
}

export function encodeLevelCode(input: LevelCodeInput): string {
    const normalized = normalizeOptions(input);
    assertLevelCodeBounds(normalized);
    return [
        "ws1",
        `seed=${normalized.seed}`,
        `colors=${normalized.colorCount}`,
        `capacity=${normalized.capacity}`,
        `empty=${normalized.emptyBottleCount}`,
        `min=${normalized.minSolutionLength}`,
        `max=${normalized.maxSolutionLength}`,
        `unique=${normalized.requireUniqueOptimalSolution ? 1 : 0}`,
        `attempts=${normalized.maxAttempts}`,
        `states=${normalized.maxSolverStates}`,
    ].join("&");
}

function parseInteger(raw: string | undefined, name: string): number {
    if (raw === undefined || !/^-?\d+$/.test(raw)) {
        throw new Error(`Invalid Water Sort level code: missing or invalid ${name}`);
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) {
        throw new Error(`Invalid Water Sort level code: invalid ${name}`);
    }
    return value;
}

export function decodeLevelCode(code: string): GeneratorOptions {
    const pieces = code.split("&");
    if (pieces.shift() !== "ws1") {
        throw new Error("Invalid Water Sort level code version");
    }
    const values = new Map<string, string>();
    for (const piece of pieces) {
        const separator = piece.indexOf("=");
        if (separator <= 0) throw new Error("Invalid Water Sort level code field");
        values.set(piece.slice(0, separator), piece.slice(separator + 1));
    }
    const unique = parseInteger(values.get("unique"), "unique");
    if (unique !== 0 && unique !== 1) throw new Error("Invalid Water Sort level code: invalid unique");
    const decoded: GeneratorOptions = {
        seed: parseInteger(values.get("seed"), "seed"),
        colorCount: parseInteger(values.get("colors"), "colors"),
        capacity: parseInteger(values.get("capacity"), "capacity"),
        emptyBottleCount: parseInteger(values.get("empty"), "empty"),
        minSolutionLength: parseInteger(values.get("min"), "min"),
        maxSolutionLength: parseInteger(values.get("max"), "max"),
        requireUniqueOptimalSolution: unique === 1,
        maxAttempts: parseInteger(values.get("attempts"), "attempts"),
        maxSolverStates: parseInteger(values.get("states"), "states"),
    };
    const normalized = normalizeOptions(decoded);
    assertLevelCodeBounds(normalized);
    return decoded;
}
